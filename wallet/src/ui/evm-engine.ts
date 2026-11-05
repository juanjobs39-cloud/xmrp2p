// Cuenta de Arbitrum en las páginas de la extensión (popup y ventana de aprobación), con viem.
// La llave privada solo vive en memoria de la página mientras la wallet está desbloqueada.
import { createPublicClient, createWalletClient, decodeFunctionData, encodeFunctionData, http, parseAbi, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { CHAINS, type EvmChain, type Net } from "../core/evm";
import type { EvmTxParams, TypedData } from "../core/provider";

export const TOKEN_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const FACTORY_ABI = parseAbi([
  "function newSwap(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt) returns (address)",
  "function newSwapWithPermit(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns (address)",
]);
const ESCROW_ABI = parseAbi(["function setReady()", "function refund(bytes32 secret, address to)", "function claim(bytes32 secret, address to)"]);

let account: PrivateKeyAccount | null = null;
let net: Net = "mainnet";
let pub: PublicClient | null = null;

function viemChain(c: EvmChain) {
  return { id: c.id, name: c.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [c.rpc] } }, testnet: c.testnet };
}

export function load(key: Hex, network: Net): string {
  account = privateKeyToAccount(key);
  net = network;
  pub = createPublicClient({ chain: viemChain(CHAINS[net]), transport: http(CHAINS[net].rpc) }) as PublicClient;
  return account.address;
}

export function unload(): void {
  account = null;
  pub = null;
}

export function chain(): EvmChain {
  return CHAINS[net];
}
export function address(): `0x${string}` | null {
  return account?.address ?? null;
}

function need() {
  if (!account || !pub) throw new Error("cuenta de Arbitrum bloqueada");
  return { account, pub, wallet: createWalletClient({ account, chain: viemChain(CHAINS[net]), transport: http(CHAINS[net].rpc) }) };
}

export async function balances(): Promise<{ eth: bigint; token: bigint }> {
  const { account, pub } = need();
  const [eth, token] = await Promise.all([
    pub.getBalance({ address: account.address }),
    pub.readContract({ address: CHAINS[net].token, abi: TOKEN_ABI, functionName: "balanceOf", args: [account.address] }) as Promise<bigint>,
  ]);
  return { eth, token };
}

/** Comisiones con margen (en Arbitrum solo se cobra la comisión base real). */
async function fees(): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  const { pub } = need();
  const block = await pub.getBlock();
  const base = block.baseFeePerGas ?? (await pub.getGasPrice());
  return { maxFeePerGas: base * 3n + 1_000_000n, maxPriorityFeePerGas: 0n };
}

export interface PreparedEvm {
  to: `0x${string}`;
  data?: Hex;
  value: bigint;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  /** Comisión máxima de red en wei (gas × maxFeePerGas); la real suele ser mucho menor. */
  maxNetworkFee: bigint;
  /** Comisión estimada (gas × comisión base actual). */
  estNetworkFee: bigint;
}

export async function prepare(tx: { to: `0x${string}`; data?: Hex; value?: bigint; gas?: bigint }): Promise<PreparedEvm> {
  const { account, pub } = need();
  const f = await fees();
  const gas = tx.gas ?? ((await pub.estimateGas({ account, to: tx.to, data: tx.data, value: tx.value ?? 0n, ...f })) * 13n) / 10n;
  const base = (f.maxFeePerGas - 1_000_000n) / 3n;
  return { to: tx.to, data: tx.data, value: tx.value ?? 0n, gas, ...f, maxNetworkFee: gas * f.maxFeePerGas, estNetworkFee: gas * base };
}

export function prepareSend(asset: "eth" | "token", to: `0x${string}`, amount: bigint): Promise<PreparedEvm> {
  if (asset === "eth") return prepare({ to, value: amount });
  return prepare({ to: CHAINS[net].token, data: encodeFunctionData({ abi: TOKEN_ABI, functionName: "transfer", args: [to, amount] }) });
}

export async function send(p: PreparedEvm): Promise<Hex> {
  const { wallet } = need();
  return wallet.sendTransaction({ to: p.to, data: p.data, value: p.value, gas: p.gas, maxFeePerGas: p.maxFeePerGas, maxPriorityFeePerGas: p.maxPriorityFeePerGas, chain: viemChain(CHAINS[net]) });
}

/** Solicitud de un sitio: respeta su gas/comisiones si los trae, si no los calcula. */
export function prepareFromSite(t: EvmTxParams): Promise<PreparedEvm> {
  const big = (v?: string) => (v ? BigInt(v) : undefined);
  return prepare({ to: t.to, data: t.data, value: big(t.value), gas: big(t.gas) }).then((p) => {
    const mf = big(t.maxFeePerGas);
    // Si el sitio ofrece una comisión mayor que la nuestra se respeta; nunca una menor (podría no entrar).
    if (mf && mf > p.maxFeePerGas) return { ...p, maxFeePerGas: mf, maxNetworkFee: p.gas * mf };
    return p;
  });
}

export async function signTyped(d: TypedData): Promise<Hex> {
  const { account } = need();
  const types = { ...d.types };
  delete (types as Record<string, unknown>).EIP712Domain;
  const sign = account.signTypedData as (p: unknown) => Promise<Hex>;
  return sign({ domain: d.domain, types, primaryType: d.primaryType, message: d.message });
}

/** Qué hace una transacción, en palabras, para la ventana de aprobación. */
export type Decoded =
  | { kind: "eth"; value: bigint }
  | { kind: "token_transfer"; to: string; amount: bigint }
  | { kind: "token_approve"; spender: string; amount: bigint; spenderIsFactory: boolean }
  | { kind: "swap_deposit"; amount: bigint; claimer: string }
  | { kind: "escrow"; fn: "setReady" | "refund" | "claim"; to?: string }
  | { kind: "unknown" };

export function decode(to: string, data: Hex | undefined, value: bigint): Decoded {
  const c = CHAINS[net];
  if (!data || data === "0x") return { kind: "eth", value };
  const lc = to.toLowerCase();
  try {
    if (lc === c.token.toLowerCase()) {
      const d = decodeFunctionData({ abi: TOKEN_ABI, data });
      if (d.functionName === "transfer") return { kind: "token_transfer", to: d.args[0], amount: d.args[1] };
      if (d.functionName === "approve") return { kind: "token_approve", spender: d.args[0], amount: d.args[1], spenderIsFactory: d.args[0].toLowerCase() === c.factory.toLowerCase() };
    }
    if (lc === c.factory.toLowerCase()) {
      const d = decodeFunctionData({ abi: FACTORY_ABI, data });
      return { kind: "swap_deposit", amount: d.args[5], claimer: d.args[0] };
    }
  } catch {
    return { kind: "unknown" };
  }
  try {
    const d = decodeFunctionData({ abi: ESCROW_ABI, data });
    return { kind: "escrow", fn: d.functionName, to: d.functionName === "setReady" ? undefined : (d.args as readonly [Hex, string])[1] };
  } catch {
    return { kind: "unknown" };
  }
}

export function explorerTx(hash: string): string {
  return `${CHAINS[net].explorer}/tx/${hash}`;
}
