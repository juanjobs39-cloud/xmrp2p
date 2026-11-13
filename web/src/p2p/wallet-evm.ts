/**
 * Cuenta tipo Ethereum de la wallet (Arbitrum): saldos y envíos de ETH y del token (USDT).
 * Cada envío se prepara primero (con su comisión de red estimada) y solo se firma y transmite
 * cuando el usuario confirma. La llave privada nunca sale de este módulo hacia la red: viem firma
 * localmente y manda al nodo la transacción ya firmada.
 */
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, http, parseAbi, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { EvmNetwork } from "../app/config";

export const TOKEN_DECIMALS = 6;
const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)"]);

export type Asset = "eth" | "token";

export interface PreparedEvm {
  asset: Asset;
  to: `0x${string}`;
  /** Lo que recibe el destino, en la unidad mínima del activo. */
  amount: bigint;
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  /** Comisión de red máxima estimada, en wei. */
  fee: bigint;
}

/** Errores con código, para que la vista los traduzca. */
export class WalletError extends Error {
  constructor(public code: "insufficient" | "need_gas" | "bad_address" | "bad_amount") {
    super(code);
  }
}

export const isEvmAddress = (a: string): a is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(a);

const chainOf = (net: EvmNetwork) =>
  defineChain({ id: net.chainId, name: net.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [net.rpc] } } });

export const publicClient = (net: EvmNetwork): PublicClient => createPublicClient({ chain: chainOf(net), transport: http(net.rpc) }) as PublicClient;

export async function balances(pub: PublicClient, net: EvmNetwork, address: `0x${string}`): Promise<{ eth: bigint; token: bigint }> {
  const [eth, token] = await Promise.all([pub.getBalance({ address }), pub.readContract({ address: net.token, abi: ERC20, functionName: "balanceOf", args: [address] })]);
  return { eth, token };
}

/** Margen sobre el gas estimado: en Arbitrum la parte de datos de L1 puede subir entre estimar y enviar. */
const withMargin = (n: bigint) => (n * 12n) / 10n;

export async function prepareEvm(pub: PublicClient, net: EvmNetwork, from: `0x${string}`, asset: Asset, to: string, amount: bigint | "all"): Promise<PreparedEvm> {
  if (!isEvmAddress(to)) throw new WalletError("bad_address");
  if (amount !== "all" && amount <= 0n) throw new WalletError("bad_amount");
  const [bal, fees] = await Promise.all([balances(pub, net, from), pub.estimateFeesPerGas()]);
  const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;

  if (asset === "eth") {
    const probe = amount === "all" ? (bal.eth > 1n ? 1n : 0n) : amount;
    if (bal.eth === 0n || (amount !== "all" && amount > bal.eth)) throw new WalletError("insufficient");
    const gas = withMargin(await pub.estimateGas({ account: from, to, value: probe }));
    const fee = gas * maxFeePerGas;
    const value = amount === "all" ? bal.eth - fee : amount;
    if (value <= 0n || value + fee > bal.eth) throw new WalletError("insufficient");
    return { asset, to, amount: value, gas, maxFeePerGas, maxPriorityFeePerGas, fee };
  }

  const value = amount === "all" ? bal.token : amount;
  if (value <= 0n || value > bal.token) throw new WalletError("insufficient");
  // Sin ETH no se puede ni estimar: el aviso útil es que falta para la comisión.
  if (bal.eth === 0n) throw new WalletError("need_gas");
  const data = encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, value] });
  const gas = withMargin(await pub.estimateGas({ account: from, to: net.token, data }));
  const fee = gas * maxFeePerGas;
  if (fee > bal.eth) throw new WalletError("need_gas");
  return { asset, to, amount: value, gas, maxFeePerGas, maxPriorityFeePerGas, fee };
}

/** Firma y transmite un envío preparado. Devuelve el hash de la transacción. */
export async function sendEvm(net: EvmNetwork, key: `0x${string}`, p: PreparedEvm): Promise<`0x${string}`> {
  const wallet = createWalletClient({ account: privateKeyToAccount(key), chain: chainOf(net), transport: http(net.rpc) });
  const common = { gas: p.gas, maxFeePerGas: p.maxFeePerGas, maxPriorityFeePerGas: p.maxPriorityFeePerGas };
  if (p.asset === "eth") return wallet.sendTransaction({ ...common, to: p.to, value: p.amount });
  return wallet.sendTransaction({ ...common, to: net.token, data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [p.to, p.amount] }) });
}
