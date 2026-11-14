/**
 * Cambiar con cuenta (etapa C): reglas puras del intercambio entre las wallets de la cuenta, sin DOM
 * ni red para poder probarlas. El cambio lo ejecuta un exchange externo vía Trocador; aquí se decide
 * qué par se pide, dónde se recibe y si el depósito se puede firmar solo desde la wallet interna.
 */
import { parseAmount } from "./wallets.ts";

/** Monedas con wallet interna. */
export type Internal = "xmr" | "usdt" | "eth";
/** Un lado del cambio: una wallet interna u otra moneda de la lista de Trocador. */
export type Leg = { kind: "internal"; coin: Internal } | { kind: "other"; ticker: string; network: string; memo?: boolean };

/** Cómo llama Trocador a las monedas internas que no son Monero (todas en Arbitrum). */
export const TROCADOR: Record<Exclude<Internal, "xmr">, { ticker: string; network: string }> = {
  usdt: { ticker: "usdt", network: "Arbitrum" },
  eth: { ticker: "eth", network: "Arbitrum" },
};
export const DECIMALS: Record<Internal, number> = { xmr: 12, usdt: 6, eth: 18 };

const isXmr = (l: Leg) => l.kind === "internal" && l.coin === "xmr";

export interface SwapPlan {
  /** buy: se envía la moneda y se recibe XMR. sell: se envía XMR y se recibe la moneda. */
  side: "buy" | "sell";
  /** La moneda que no es Monero, con el nombre que usa Trocador. */
  ticker: string;
  network: string;
  /** Wallet interna desde la que se paga, o null si el usuario deposita desde fuera. */
  payFrom: Internal | null;
  /** Wallet interna en la que se recibe (xmr | evm), o null si la moneda no tiene wallet en la plataforma. */
  receiveIn: "xmr" | "evm" | null;
  /** La moneda que se recibe necesita memo o tag. */
  memo: boolean;
}

/** Wallet interna en la que se recibe una moneda. Igual que internalAsset() de workers/src/api/trocador.ts. */
export function internalAsset(side: "buy" | "sell", coin: { ticker: string; network: string }): "xmr" | "evm" | null {
  if (side === "buy") return "xmr";
  return coin.network === "Arbitrum" && (coin.ticker === "usdt" || coin.ticker === "eth") ? "evm" : null;
}

export type PlanError = "same" | "need_xmr";

/**
 * Traduce «envío X, recibo Y» al par que entiende el servidor. Por ahora uno de los dos lados debe
 * ser Monero (el servidor solo cotiza contra XMR).
 */
export function planSwap(from: Leg, to: Leg): SwapPlan | PlanError {
  if (isXmr(from) && isXmr(to)) return "same";
  if (!isXmr(from) && !isXmr(to)) return "need_xmr";
  const side = isXmr(to) ? "buy" : "sell";
  const other = side === "buy" ? from : to;
  const coin = other.kind === "internal" ? TROCADOR[other.coin as Exclude<Internal, "xmr">] : { ticker: other.ticker, network: other.network };
  return {
    side,
    ...coin,
    payFrom: from.kind === "internal" ? from.coin : null,
    receiveIn: internalAsset(side, coin),
    memo: side === "sell" && other.kind === "other" && !!other.memo,
  };
}

/** Lo mínimo del intercambio que devuelve el servidor para decidir el depósito. */
export interface TradeLike {
  ticker_from: string;
  network_from: string;
  amount_from: string;
  address_provider: string;
  address_provider_memo?: string;
}

export type DepositError = "wrong_coin" | "wrong_amount" | "needs_memo" | "bad_address";

/**
 * Depósito que la wallet interna puede firmar sola: solo si el intercambio creado pide exactamente la
 * moneda y el monto que el usuario revisó. Si algo no cuadra no se firma nada y el usuario decide.
 */
export function autoDeposit(coin: Internal | null | undefined, amount: string, trade: TradeLike): { coin: Internal; to: string; amount: bigint } | DepositError {
  if (!coin) return "wrong_coin";
  const want = coin === "xmr" ? { ticker: "xmr", network: "Mainnet" } : TROCADOR[coin];
  if (trade.ticker_from.toLowerCase() !== want.ticker || trade.network_from.toLowerCase() !== want.network.toLowerCase()) return "wrong_coin";
  let asked: bigint, got: bigint;
  try {
    asked = parseAmount(amount, DECIMALS[coin]);
    got = parseAmount(String(trade.amount_from), DECIMALS[coin]);
  } catch {
    return "wrong_amount";
  }
  if (asked !== got) return "wrong_amount";
  const memo = (trade.address_provider_memo ?? "").trim();
  if (memo && memo !== "0") return "needs_memo";
  const to = trade.address_provider.trim();
  if (coin === "xmr" ? !/^[1-9A-HJ-NP-Za-km-z]{95,106}$/.test(to) : !/^0x[0-9a-fA-F]{40}$/.test(to)) return "bad_address";
  return { coin, to, amount: got };
}

/** Un cambio guardado en la bóveda de la cuenta (para retomarlo y para el historial). */
export interface SwapRecord {
  id: string;
  at: number;
  from: string;
  to: string;
  amount_from: string;
  amount_to: string;
  provider: string;
  /** Wallet interna desde la que se paga (si no, el usuario deposita desde fuera). */
  pay?: Internal;
  /** Hash del depósito que firmó la wallet interna (si lo hizo). */
  deposit_tx?: string;
  status?: string;
}

const FINAL = new Set(["finished", "failed", "refunded", "expired", "halted"]);
export const isFinal = (status: string | undefined) => FINAL.has(status ?? "");

/** Agrega o actualiza un cambio; quedan los 30 más recientes, el más nuevo primero. */
export function upsertSwap(list: SwapRecord[] | undefined, rec: SwapRecord): SwapRecord[] {
  const rest = (list ?? []).filter((x) => x.id !== rec.id);
  return [rec, ...rest].sort((a, b) => b.at - a.at).slice(0, 30);
}
