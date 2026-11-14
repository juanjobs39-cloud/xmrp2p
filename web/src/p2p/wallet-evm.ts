/**
 * Cuenta tipo Ethereum de la wallet (Arbitrum): saldos y envíos de ETH y del token (USDT).
 * Cada envío se prepara primero (con su comisión de red estimada) y solo se firma y transmite
 * cuando el usuario confirma. La llave privada nunca sale de este módulo hacia la red: viem firma
 * localmente y manda al nodo la transacción ya firmada.
 */
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, http, parseAbi, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { EvmNetwork } from "../app/config";
import { feeFor, splitAll, type FeeRule } from "./fee";

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
  /** Comisión de red máxima estimada, en wei (incluye la transferencia de la comisión de retiro, si hay). */
  fee: bigint;
  /** Comisión de retiro de MoneroP2P, en la unidad mínima del activo; 0 si no aplica. Va en una segunda transferencia. */
  platformFee: bigint;
  feeTo?: `0x${string}`;
  feeGas?: bigint;
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

export async function prepareEvm(pub: PublicClient, net: EvmNetwork, from: `0x${string}`, asset: Asset, to: string, amount: bigint | "all", rule: FeeRule | null = null): Promise<PreparedEvm> {
  if (!isEvmAddress(to)) throw new WalletError("bad_address");
  if (rule && !isEvmAddress(rule.address)) rule = null;
  const feeTo = rule?.address as `0x${string}` | undefined;
  if (amount !== "all" && amount <= 0n) throw new WalletError("bad_amount");
  const [bal, fees] = await Promise.all([balances(pub, net, from), pub.estimateFeesPerGas()]);
  const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;

  if (asset === "eth") {
    const probe = amount === "all" ? (bal.eth > 1n ? 1n : 0n) : amount;
    if (bal.eth === 0n || (amount !== "all" && amount > bal.eth)) throw new WalletError("insufficient");
    const gas = withMargin(await pub.estimateGas({ account: from, to, value: probe }));
    const feeGas = feeTo ? withMargin(await pub.estimateGas({ account: from, to: feeTo, value: probe })) : 0n;
    // Con comisión de retiro son dos transferencias: se aparta el gas de las dos.
    const withFee = (() => {
      const net2 = (gas + feeGas) * maxFeePerGas;
      if (amount === "all") {
        const s = splitAll(bal.eth - net2, rule);
        return { value: s.dest, platformFee: s.fee, fee: net2 };
      }
      return { value: amount, platformFee: feeFor(amount, rule), fee: net2 };
    })();
    if (withFee.platformFee > 0n) {
      if (withFee.value <= 0n || withFee.value + withFee.platformFee + withFee.fee > bal.eth) throw new WalletError("insufficient");
      return { asset, to, amount: withFee.value, gas, maxFeePerGas, maxPriorityFeePerGas, fee: withFee.fee, platformFee: withFee.platformFee, feeTo, feeGas };
    }
    const fee = gas * maxFeePerGas;
    const value = amount === "all" ? bal.eth - fee : amount;
    if (value <= 0n || value + fee > bal.eth) throw new WalletError("insufficient");
    return { asset, to, amount: value, gas, maxFeePerGas, maxPriorityFeePerGas, fee, platformFee: 0n };
  }

  const split = amount === "all" ? splitAll(bal.token, rule) : { dest: amount, fee: feeFor(amount, rule) };
  const value = split.dest;
  const platformFee = split.fee;
  if (value <= 0n || value + platformFee > bal.token) throw new WalletError("insufficient");
  // Sin ETH no se puede ni estimar: el aviso útil es que falta para la comisión.
  if (bal.eth === 0n) throw new WalletError("need_gas");
  const data = encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, value] });
  const gas = withMargin(await pub.estimateGas({ account: from, to: net.token, data }));
  const feeGas =
    platformFee > 0n && feeTo
      ? withMargin(await pub.estimateGas({ account: from, to: net.token, data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [feeTo, platformFee] }) }))
      : 0n;
  const fee = (gas + feeGas) * maxFeePerGas;
  if (fee > bal.eth) throw new WalletError("need_gas");
  return { asset, to, amount: value, gas, maxFeePerGas, maxPriorityFeePerGas, fee, platformFee, ...(feeGas ? { feeTo, feeGas } : {}) };
}

/**
 * Firma y transmite un envío preparado. Devuelve el hash de la transacción del envío.
 * Si lleva comisión de retiro, va en una segunda transferencia con el nonce siguiente, después del
 * envío del usuario: si esa segunda falla, el envío del usuario ya salió y no se le reporta error.
 */
export async function sendEvm(net: EvmNetwork, key: `0x${string}`, p: PreparedEvm): Promise<`0x${string}`> {
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: chainOf(net), transport: http(net.rpc) });
  const fees = { maxFeePerGas: p.maxFeePerGas, maxPriorityFeePerGas: p.maxPriorityFeePerGas };
  const transfer = (to: `0x${string}`, amount: bigint, gas: bigint, nonce?: number) =>
    p.asset === "eth"
      ? wallet.sendTransaction({ ...fees, gas, nonce, to, value: amount })
      : wallet.sendTransaction({ ...fees, gas, nonce, to: net.token, data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, amount] }) });
  if (!(p.platformFee > 0n && p.feeTo && p.feeGas)) return transfer(p.to, p.amount, p.gas);
  const nonce = await publicClient(net).getTransactionCount({ address: account.address, blockTag: "pending" });
  const hash = await transfer(p.to, p.amount, p.gas, nonce);
  await transfer(p.feeTo, p.platformFee, p.feeGas, nonce + 1).catch(() => {});
  return hash;
}
