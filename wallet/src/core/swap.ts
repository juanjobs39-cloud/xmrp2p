// Swaps vía Trocador desde la wallet. Usa la misma API que monerop2p.app (cotizaciones, crear el
// intercambio y su estado); la API habla con Trocador y aplica la comisión de afiliado.
// Aquí no hay llaves: solo direcciones públicas y montos.

export const SWAP_API = "https://api.monerop2p.app";

/** buy: moneda → XMR. sell: XMR → moneda. */
export type SwapSide = "buy" | "sell";

export interface SwapCoin {
  ticker: string;
  network: string;
  label: string;
  /** Si es de Arbitrum One y la wallet puede pagar o recibir con su propia cuenta. */
  arb?: "token" | "eth";
}

/** Monedas más usadas (ninguna necesita memo). Los nombres de red son los de Trocador. */
export const SWAP_COINS: SwapCoin[] = [
  { ticker: "usdt", network: "Arbitrum", label: "USDT · Arbitrum One", arb: "token" },
  { ticker: "eth", network: "Arbitrum", label: "ETH · Arbitrum One", arb: "eth" },
  { ticker: "btc", network: "Mainnet", label: "BTC · Bitcoin" },
  { ticker: "usdt", network: "TRC20", label: "USDT · Tron (TRC20)" },
  { ticker: "usdt", network: "ERC20", label: "USDT · Ethereum (ERC20)" },
  { ticker: "usdt", network: "BEP20", label: "USDT · BNB Chain (BEP20)" },
  { ticker: "usdt", network: "SOL", label: "USDT · Solana" },
  { ticker: "usdc", network: "Arbitrum", label: "USDC · Arbitrum One" },
  { ticker: "eth", network: "ERC20", label: "ETH · Ethereum" },
  { ticker: "sol", network: "Mainnet", label: "SOL · Solana" },
  { ticker: "ltc", network: "Mainnet", label: "LTC · Litecoin" },
];

export const coinKey = (c: { ticker: string; network: string }): string => `${c.ticker}.${c.network}`;
export const findCoin = (ticker: string, network: string): SwapCoin | undefined => SWAP_COINS.find((c) => c.ticker === ticker && c.network === network);

export interface Quote {
  provider: string;
  amount_to: string;
  kycrating: string;
  fixed: boolean;
  eta?: number;
}
export interface Rates {
  rate_id: string;
  usdt: string;
  ticker: string;
  network: string;
  side: SwapSide;
  quotes: Quote[];
  created_at: number;
}
export interface Trade {
  trade_id: string;
  ticker_from: string;
  network_from: string;
  ticker_to?: string;
  network_to?: string;
  provider: string;
  status: string;
  amount_from: string;
  amount_to: string;
  address_provider: string;
  address_provider_memo: string;
  fixed: boolean;
  expires_at?: number;
  hashout?: string;
}

/** Intercambio que la wallet sigue (se guarda cifrado junto al caché de la wallet). */
export interface SwapRef {
  id: string;
  side: SwapSide;
  ticker: string;
  network: string;
  amount: string;
  /** Cuándo se creó (ms). */
  at: number;
  /** Hash del pago hecho desde esta wallet, si se pagó desde aquí. */
  paid?: string;
  /** Último estado conocido, para la lista. */
  status?: string;
}

export const FINAL = new Set(["finished", "failed", "refunded", "expired", "halted"]);

/** Paso de la barra: 0 depósito, 1 confirmaciones, 2 envío, 4 terminado (todos llenos). */
export function stepOf(status: string): number {
  const s = status.toLowerCase();
  return s === "confirming" ? 1 : s === "sending" ? 2 : s === "finished" ? 4 : 0;
}

/** Se quita de la lista: terminado hace más de 24 h, o cualquiera de más de 7 días. */
export function prune(list: SwapRef[], now = Date.now()): SwapRef[] {
  return list.filter((s) => now - s.at < 7 * 86_400_000 && !(FINAL.has(s.status ?? "") && now - s.at > 86_400_000)).slice(0, 20);
}

/** Monto escrito por el usuario: número positivo con punto o coma. */
export function cleanAmount(v: string): string | null {
  const s = v.trim().replace(",", ".");
  return /^\d{1,12}(\.\d{1,12})?$/.test(s) && Number(s) > 0 ? s : null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(SWAP_API + path, { ...init, credentials: "omit", referrerPolicy: "no-referrer" });
  } catch {
    throw new Error("network");
  }
  const body = (await r.json().catch(() => ({}))) as { error?: unknown };
  if (!r.ok) throw new Error(typeof body.error === "string" ? body.error : `HTTP ${r.status}`);
  return body as T;
}

export function rates(amount: string, coin: SwapCoin, side: SwapSide): Promise<Rates> {
  const q = new URLSearchParams({ amount, ticker: coin.ticker, network: coin.network, side });
  return call<Rates>(`/v1/trocador/rates?${q}`);
}

export function create(body: {
  rate_id: string;
  provider: string;
  fixed: boolean;
  amount: string;
  ticker: string;
  network: string;
  side: SwapSide;
  address: string;
  refund?: string;
}): Promise<Trade> {
  return call<Trade>("/v1/trocador/trades", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function trade(id: string): Promise<Trade> {
  if (!/^[A-Za-z0-9_-]{2,100}$/.test(id)) return Promise.reject(new Error("id"));
  return call<Trade>(`/v1/trocador/trades/${id}`);
}
