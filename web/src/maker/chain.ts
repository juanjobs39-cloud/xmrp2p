/**
 * Cadena EVM para el maker en el navegador. Usa una llave propia del maker (generada y guardada
 * cifrada en su navegador) para firmar ofertas y enviar `claim` sin pedir clics en MetaMask.
 * El USDT cobrado va directo a la dirección de cobro del maker (`to` en `claim`).
 */
import { createPublicClient, createWalletClient, http, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { ESCROW_ABI, FACTORY_ABI } from "../app/abi";
import type { EvmNetwork } from "../app/config";
import type { EscrowInfo } from "./engine";

const STAGES = ["UNINITIALIZED", "PENDING", "READY", "COMPLETED"] as const;

export class MakerChain {
  readonly pub: PublicClient;
  readonly account: PrivateKeyAccount;
  private wallet;

  constructor(readonly net: EvmNetwork, key: Hex) {
    const chain = {
      id: net.chainId,
      name: net.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [net.rpc] } },
    };
    this.pub = createPublicClient({ chain, transport: http(net.rpc) }) as PublicClient;
    this.account = privateKeyToAccount(key);
    this.wallet = createWalletClient({ chain, account: this.account, transport: http(net.rpc) });
  }

  get address(): Address {
    return this.account.address;
  }

  async now(): Promise<{ time: number; block: number }> {
    const b = await this.pub.getBlock();
    return { time: Number(b.timestamp), block: Number(b.number) };
  }

  gas(): Promise<bigint> {
    return this.pub.getBalance({ address: this.address });
  }

  /** Busca el `SwapCreated` con nuestros commitments y nosotros como claimer. */
  async findDeposit(claimCommitment: string, refundCommitment: string, fromBlock: number): Promise<Address | null> {
    const logs = await this.pub.getContractEvents({
      address: this.net.factory,
      abi: FACTORY_ABI,
      eventName: "SwapCreated",
      args: { claimer: this.address },
      fromBlock: BigInt(fromBlock),
    });
    for (const l of logs) {
      const a = l.args as { escrow: Address; claimCommitment: Hex; refundCommitment: Hex };
      if (a.claimCommitment.toLowerCase() === claimCommitment.toLowerCase() && a.refundCommitment.toLowerCase() === refundCommitment.toLowerCase()) {
        return a.escrow;
      }
    }
    return null;
  }

  async escrowInfo(escrow: Address): Promise<EscrowInfo> {
    const read = <T>(functionName: string) => this.pub.readContract({ address: escrow, abi: ESCROW_ABI, functionName: functionName as never }) as Promise<T>;
    const [stage, claimer, amount, cc, rc, t0, t1] = await Promise.all([
      read<number>("stage"), read<Address>("claimer"), read<bigint>("amount"),
      read<Hex>("claimCommitment"), read<Hex>("refundCommitment"), read<bigint>("t0"), read<bigint>("t1"),
    ]);
    return { stage: STAGES[stage] ?? "UNINITIALIZED", claimer, amount, claimCommitment: cc, refundCommitment: rc, t0: Number(t0), t1: Number(t1) };
  }

  /** Secreto revelado por `Claimed` o `Refunded`, si lo hubo. */
  async revealed(escrow: Address, fromBlock: number): Promise<{ kind: "Claimed" | "Refunded"; secret: Hex; tx?: string } | null> {
    const logs = await this.pub.getContractEvents({ address: escrow, abi: ESCROW_ABI, fromBlock: BigInt(fromBlock) });
    for (const kind of ["Refunded", "Claimed"] as const) {
      const l = logs.find((x) => x.eventName === kind);
      if (l) return { kind, secret: (l.args as { secret: Hex }).secret, tx: l.transactionHash ?? undefined };
    }
    return null;
  }

  /** Simula `claim` y solo entonces lo envía: una tx fallida revelaría el secreto en la cadena. */
  async claim(escrow: Address, secret: Hex, to: Address): Promise<Hex> {
    await this.pub.simulateContract({ account: this.account, address: escrow, abi: ESCROW_ABI, functionName: "claim", args: [secret, to] });
    const block = await this.pub.getBlock();
    const base = block.baseFeePerGas ?? (await this.pub.getGasPrice());
    const fees = { maxFeePerGas: base * 3n + 1_000_000n, maxPriorityFeePerGas: 0n };
    const gas = ((await this.pub.estimateContractGas({ account: this.account, address: escrow, abi: ESCROW_ABI, functionName: "claim", args: [secret, to], ...fees })) * 13n) / 10n;
    const hash = await this.wallet.writeContract({ address: escrow, abi: ESCROW_ABI, functionName: "claim", args: [secret, to], gas, ...fees, chain: null });
    const r = await this.pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`claim revirtió: ${hash}`);
    return hash;
  }

  /** Devuelve el ETH de gas sobrante a otra dirección (retiro del maker). */
  async withdrawGas(to: Address): Promise<Hex | null> {
    const bal = await this.gas();
    const block = await this.pub.getBlock();
    const maxFee = (block.baseFeePerGas ?? 0n) * 2n + 1_000_000n;
    const gas = await this.pub.estimateGas({ account: this.account, to, value: 1n });
    const cost = gas * 3n * maxFee; // margen por el componente L1 de Arbitrum
    if (bal <= cost) return null;
    return this.wallet.sendTransaction({ to, value: bal - cost, gas: gas * 3n, maxFeePerGas: maxFee, maxPriorityFeePerGas: 0n, chain: null });
  }
}
