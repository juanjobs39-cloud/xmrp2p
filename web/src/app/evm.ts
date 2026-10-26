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
import { findProvider, withTimeout, type Eip1193 } from "./wallet-provider";
import { ESCROW_ABI, FACTORY_ABI } from "./abi";
import type { ChainView, Stage } from "./decide";

export { ESCROW_ABI, FACTORY_ABI };
import type { EvmNetwork } from "./config";

const TOKEN_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function nonces(address) view returns (uint256)",
  "function name() view returns (string)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);

const STAGES: Stage[] = ["UNINITIALIZED", "PENDING", "READY", "COMPLETED"];



/** Lo que la wallet le está pidiendo al usuario, para mostrarlo en la página. */
export type WalletStep = {
  kind: "connect" | "network" | "sign" | "send" | "mining";
  n: number;
  total: number;
  what: "connect" | "permit" | "approve" | "deposit" | "ready" | "refund";
};

/** Tiempo máximo esperando a la wallet para conectar o cambiar de red. */
const WALLET_TIMEOUT_MS = 180_000;

export class Evm {
  readonly pub: PublicClient;
  private wallet?: WalletClient;
  account?: Address;
  /** La app lo usa para mostrar "Paso n de total" mientras MetaMask pide firmas. */
  onStep?: (s: WalletStep | null) => void;

  constructor(readonly net: EvmNetwork) {
    this.pub = createPublicClient({ transport: http(net.rpc) }) as PublicClient;
  }

  async connect(): Promise<Address> {
    const provider: Eip1193 | null = await findProvider();
    if (!provider) throw new Error("No se encontró una wallet de navegador (MetaMask o compatible).");
    const chain = {
      id: this.net.chainId,
      name: this.net.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [this.net.rpc] } },
    };
    const late = `MetaMask no respondió en 3 minutos. Da clic en el ícono de MetaMask por si tiene una solicitud pendiente y vuelve a intentar.`;
    this.wallet = createWalletClient({ chain, transport: custom(provider) });
    try {
      this.onStep?.({ kind: "connect", n: 1, total: 1, what: "connect" });
      const [account] = await withTimeout(this.wallet.requestAddresses(), WALLET_TIMEOUT_MS, late);
      if (!account) throw new Error("La wallet no compartió ninguna cuenta.");
      this.account = getAddress(account);
      const current = Number(await provider.request({ method: "eth_chainId" }));
      if (current !== this.net.chainId) {
        this.onStep?.({ kind: "network", n: 1, total: 1, what: "connect" });
        try {
          await withTimeout(this.wallet.switchChain({ id: this.net.chainId }), WALLET_TIMEOUT_MS, late);
        } catch (e) {
          // 4902: la wallet no conoce la red; cualquier otro error (rechazo, tiempo) se informa tal cual.
          if ((e as { code?: number; cause?: { code?: number } }).code !== 4902 && (e as { cause?: { code?: number } }).cause?.code !== 4902) throw e;
          await withTimeout(this.wallet.addChain({ chain }), WALLET_TIMEOUT_MS, late);
        }
      }
    } finally {
      this.onStep?.(null);
    }
    return this.account;
  }

  /**
   * Comisiones con margen amplio. MetaMask a veces fija maxFeePerGas justo en la comisión base y,
   * si esta sube un poco antes de incluirse, la red rechaza la tx (hallazgo de la prueba manual).
   * En Arbitrum solo se cobra la comisión base real: el margen no encarece la transacción.
   */
  private async fees(): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
    const block = await this.pub.getBlock();
    const base = block.baseFeePerGas ?? (await this.pub.getGasPrice());
    return { maxFeePerGas: base * 3n + 1_000_000n, maxPriorityFeePerGas: 0n };
  }

  /**
   * Envía una tx con comisiones y límite de gas ya calculados (+30 % de margen), para que MetaMask
   * no tenga que estimarlos y muestre la ventana antes. El límite es un tope: solo se paga el gas
   * usado. Si la estimación falla, MetaMask la hace como siempre.
   */
  private async send(step: Omit<WalletStep, "kind">, req: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }): Promise<Hex> {
    const { wallet, account } = this.need();
    const fees = await this.fees();
    let gas: bigint | undefined;
    try {
      gas = ((await this.pub.estimateContractGas({ account, ...fees, ...req } as never)) * 13n) / 10n;
    } catch {
      gas = undefined;
    }
    this.onStep?.({ kind: "send", ...step });
    const hash = await wallet.writeContract({ account, chain: null, ...fees, ...(gas ? { gas } : {}), ...req } as never);
    this.onStep?.({ kind: "mining", ...step });
    return hash;
  }

  /** Espera la confirmación y limpia el aviso de pasos. */
  private async mined(hash: Hex) {
    try {
      return await this.pub.waitForTransactionReceipt({ hash });
    } finally {
      this.onStep?.(null);
    }
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
      this.onStep?.({ kind: "sign", n: 1, total: 2, what: "permit" });
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
      this.onStep?.(null);
      if ((e as { code?: number }).code === 4001) throw e; // el usuario rechazó la firma
      return null;
    }
  }

  /** Deposita el USDT en un escrow nuevo. Devuelve la dirección del escrow y el hash de la tx. */
  async deposit(p: { claimer: Address; claimCommitment: Hex; refundCommitment: Hex; duration0: number; duration1: number; amount: bigint; salt: Hex }) {
    const { account } = this.need();
    const escrow = await this.pub.readContract({ address: this.net.factory, abi: FACTORY_ABI, functionName: "predictEscrow", args: [account, p.salt] });
    // Reanudación: si ya depositamos con este salt (p. ej. se cerró la pestaña), no depositar de nuevo.
    const code = await this.pub.getCode({ address: escrow });
    if (code && code !== "0x") return { escrow, hash: "0x" as Hex, block: 0 };
    const args = [p.claimer, p.claimCommitment, p.refundCommitment, BigInt(p.duration0), BigInt(p.duration1), p.amount, p.salt] as const;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const sig = await this.permit(p.amount, deadline);
    let hash: Hex;
    try {
      if (sig) {
        hash = await this.send({ n: 2, total: 2, what: "deposit" }, {
          address: this.net.factory, abi: FACTORY_ABI, functionName: "newSwapWithPermit", args: [...args, deadline, sig.v, sig.r, sig.s],
        });
      } else {
        const allowance = await this.pub.readContract({ address: this.net.token, abi: TOKEN_ABI, functionName: "allowance", args: [account, this.net.factory] });
        if (allowance < p.amount) {
          const a = await this.send({ n: 1, total: 2, what: "approve" }, { address: this.net.token, abi: TOKEN_ABI, functionName: "approve", args: [this.net.factory, p.amount] });
          await this.pub.waitForTransactionReceipt({ hash: a });
        }
        hash = await this.send({ n: allowance < p.amount ? 2 : 1, total: allowance < p.amount ? 2 : 1, what: "deposit" }, {
          address: this.net.factory, abi: FACTORY_ABI, functionName: "newSwap", args,
        });
      }
    } catch (e) {
      this.onStep?.(null);
      throw e;
    }
    const receipt = await this.mined(hash);
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
    const h = await this.send({ n: 1, total: 1, what: "ready" }, { address: escrow, abi: ESCROW_ABI, functionName: "setReady" }).catch((e) => {
      this.onStep?.(null);
      throw e;
    });
    await this.mined(h);
    return h;
  }

  async refund(escrow: Address, secret: Hex, to?: Address): Promise<Hex> {
    const { account } = this.need();
    // Simular antes: una tx fallida revelaría el secreto del taker.
    await this.pub.simulateContract({ account, address: escrow, abi: ESCROW_ABI, functionName: "refund", args: [secret, to ?? account] });
    const h = await this.send({ n: 1, total: 1, what: "refund" }, { address: escrow, abi: ESCROW_ABI, functionName: "refund", args: [secret, to ?? account] }).catch((e) => {
      this.onStep?.(null);
      throw e;
    });
    await this.mined(h);
    return h;
  }
}
