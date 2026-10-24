/**
 * Interacción con el contrato (fábrica y escrow) desde la wallet del navegador (EIP-1193:
 * MetaMask y compatibles). TronLink queda para cuando Tron se active (Fase 1: pendiente Nile).
 */
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  parseAbi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { ChainView, Stage } from "./decide";
import type { EvmNetwork } from "./config";

export const FACTORY_ABI = parseAbi([
  "function newSwap(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt) returns (address)",
  "function newSwapWithPermit(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns (address)",
  "function predictEscrow(address owner, bytes32 salt) view returns (address)",
  "function TOKEN() view returns (address)",
  "function FEE_BPS() view returns (uint16)",
]);

export const ESCROW_ABI = parseAbi([
  "function stage() view returns (uint8)",
  "function t0() view returns (uint64)",
  "function t1() view returns (uint64)",
  "function amount() view returns (uint256)",
  "function owner() view returns (address)",
  "function claimer() view returns (address)",
  "function claimCommitment() view returns (bytes32)",
  "function refundCommitment() view returns (bytes32)",
  "function setReady()",
  "function refund(bytes32 secret, address to)",
  "event Claimed(bytes32 secret, address indexed to, uint256 amountToClaimer, uint256 fee)",
  "event Refunded(bytes32 secret, address indexed to, uint256 amount)",
]);

const TOKEN_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function nonces(address) view returns (uint256)",
  "function name() view returns (string)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);

const STAGES: Stage[] = ["UNINITIALIZED", "PENDING", "READY", "COMPLETED"];

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export function injected(): Eip1193 | null {
  return ((globalThis as unknown as { ethereum?: Eip1193 }).ethereum ?? null) as Eip1193 | null;
}

export class Evm {
  readonly pub: PublicClient;
  private wallet?: WalletClient;
  account?: Address;

  constructor(readonly net: EvmNetwork) {
    this.pub = createPublicClient({ transport: http(net.rpc) }) as PublicClient;
  }

  async connect(): Promise<Address> {
    const provider = injected();
    if (!provider) throw new Error("No se encontró una wallet de navegador (MetaMask o compatible).");
    const chain = {
      id: this.net.chainId,
      name: this.net.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [this.net.rpc] } },
    };
    this.wallet = createWalletClient({ chain, transport: custom(provider) });
    const [account] = await this.wallet.requestAddresses();
    if (!account) throw new Error("La wallet no compartió ninguna cuenta.");
    this.account = getAddress(account);
    const current = Number(await provider.request({ method: "eth_chainId" }));
    if (current !== this.net.chainId) {
      try {
        await this.wallet.switchChain({ id: this.net.chainId });
      } catch {
        await this.wallet.addChain({ chain });
      }
    }
    return this.account;
  }

  private need(): { wallet: WalletClient; account: Address } {
    if (!this.wallet || !this.account) throw new Error("Conecta tu wallet primero.");
    return { wallet: this.wallet, account: this.account };
  }

  async tokenBalance(who: Address): Promise<bigint> {
    return this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "balanceOf", args: [who] });
  }

  /** Firma EIP-2612 si el token la soporta; si no, devuelve null y se usa approve + newSwap. */
  private async permit(amount: bigint, deadline: bigint): Promise<{ v: number; r: Hex; s: Hex } | null> {
    const { wallet, account } = this.need();
    try {
      let name: string;
      let version = "1";
      try {
        const d = await this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "eip712Domain" });
        name = d[1];
        version = d[2];
      } catch {
        name = await this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "name" });
      }
      const nonce = await this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "nonces", args: [account] });
      const sig = await wallet.signTypedData({
        account,
        domain: { name, version, chainId: this.net.chainId, verifyingContract: this.net.token },
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "Permit",
        message: { owner: account, spender: this.net.factory, value: amount, nonce, deadline },
      });
      return { r: `0x${sig.slice(2, 66)}` as Hex, s: `0x${sig.slice(66, 130)}` as Hex, v: parseInt(sig.slice(130, 132), 16) };
    } catch (e) {
      if ((e as { code?: number }).code === 4001) throw e; // el usuario rechazó la firma
      return null;
    }
  }

  /** Deposita el USDT en un escrow nuevo. Devuelve la dirección del escrow y el hash de la tx. */
  async deposit(p: { claimer: Address; claimCommitment: Hex; refundCommitment: Hex; duration0: number; duration1: number; amount: bigint; salt: Hex }) {
    const { wallet, account } = this.need();
    const escrow = await this.pub.readContract({ address: this.net.factory, abi: FACTORY_ABI, functionName: "predictEscrow", args: [account, p.salt] });
    // Reanudación: si ya depositamos con este salt (p. ej. se cerró la pestaña), no depositar de nuevo.
    const code = await this.pub.getCode({ address: escrow });
    if (code && code !== "0x") return { escrow, hash: "0x" as Hex, block: 0 };
    const args = [p.claimer, p.claimCommitment, p.refundCommitment, BigInt(p.duration0), BigInt(p.duration1), p.amount, p.salt] as const;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const sig = await this.permit(p.amount, deadline);
    let hash: Hex;
    if (sig) {
      hash = await wallet.writeContract({
        account, chain: null, address: this.net.factory, abi: FACTORY_ABI, functionName: "newSwapWithPermit",
        args: [...args, deadline, sig.v, sig.r, sig.s],
      });
    } else {
      const allowance = await this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "allowance", args: [account, this.net.factory] });
      if (allowance < p.amount) {
        const a = await wallet.writeContract({ account, chain: null, address: this.net.token, abi: TOKEN_ABI, functionName: "approve", args: [this.net.factory, p.amount] });
        await this.pub.waitForTransactionReceipt({ hash: a });
      }
      hash = await wallet.writeContract({ account, chain: null, address: this.net.factory, abi: FACTORY_ABI, functionName: "newSwap", args });
    }
    const receipt = await this.pub.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("El depósito revirtió.");
    return { escrow, hash, block: Number(receipt.blockNumber) };
  }

  async view(escrow: Address, fromBlock: number): Promise<ChainView & { amount: bigint; claimer: Address; claimCommitment: Hex; refundCommitment: Hex }> {
    const read = <T>(functionName: string) =>
      this.pub.readContract({ address: escrow, abi: ESCROW_ABI, functionName: functionName as never }) as Promise<T>;
    const [stage, t0, t1, amount, claimer, cc, rc, block] = await Promise.all([
      read<number>("stage"), read<bigint>("t0"), read<bigint>("t1"), read<bigint>("amount"), read<Address>("claimer"),
      read<Hex>("claimCommitment"), read<Hex>("refundCommitment"), this.pub.getBlock(),
    ]);
    const v = {
      now: Number(block.timestamp), t0: Number(t0), t1: Number(t1), stage: STAGES[stage] ?? "UNINITIALIZED",
      amount, claimer, claimCommitment: cc, refundCommitment: rc,
    } as ChainView & { amount: bigint; claimer: Address; claimCommitment: Hex; refundCommitment: Hex };
    if (v.stage === "COMPLETED") {
      const logs = await this.pub.getContractEvents({ address: escrow, abi: ESCROW_ABI, fromBlock: BigInt(fromBlock) });
      for (const l of logs) {
        if (l.eventName === "Claimed" || l.eventName === "Refunded") {
          v.revealed = { kind: l.eventName, secret: (l.args as { secret: Hex }).secret };
        }
      }
    }
    return v;
  }

  async setReady(escrow: Address): Promise<Hex> {
    const { wallet, account } = this.need();
    const h = await wallet.writeContract({ account, chain: null, address: escrow, abi: ESCROW_ABI, functionName: "setReady" });
    await this.pub.waitForTransactionReceipt({ hash: h });
    return h;
  }

  async refund(escrow: Address, secret: Hex, to?: Address): Promise<Hex> {
    const { wallet, account } = this.need();
    // Simular antes: una tx fallida revelaría el secreto del taker.
    await this.pub.simulateContract({ account, address: escrow, abi: ESCROW_ABI, functionName: "refund", args: [secret, to ?? account] });
    const h = await wallet.writeContract({ account, chain: null, address: escrow, abi: ESCROW_ABI, functionName: "refund", args: [secret, to ?? account] });
    await this.pub.waitForTransactionReceipt({ hash: h });
    return h;
  }
}
