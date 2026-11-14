import { HttpError } from "./env";

/**
 * Precio de referencia XMR/USDT: mediana de Kraken, KuCoin, MEXC, HTX y CoinGecko (misma regla que
 * `maker/xmrp2p_maker/pricing.py`). Se exigen 2 fuentes y que ninguna se aleje más de 2 % de la
 * mediana; si al menos 3 coinciden y son mayoría, la que se sale se descarta. Lo usa el maker en el navegador, que no puede consultar todas las fuentes por CORS.
 * Solo informa un precio: no toca fondos.
 */
// Cada fuente tiene 5 s; CoinGecko suele bloquear las IP de Cloudflare, por eso hay varias más.
const get = async (url: string) => (await fetch(url, { signal: AbortSignal.timeout(5000) })).json();

const SOURCES: Record<string, () => Promise<number>> = {
  kraken: async () => {
    const r = (await get("https://api.kraken.com/0/public/Ticker?pair=XMRUSDT")) as {
      error?: string[];
      result: Record<string, { c: string[] }>;
    };
    if (r.error?.length) throw new Error(r.error.join(","));
    return Number(Object.values(r.result)[0]!.c[0]);
  },
  coingecko: async () => {
    const r = (await get("https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd")) as {
      monero: { usd: number };
    };
    return Number(r.monero.usd);
  },
  kucoin: async () => {
    const r = (await get("https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=XMR-USDT")) as {
      data: { price: string };
    };
    return Number(r.data.price);
  },
  mexc: async () => {
    const r = (await get("https://api.mexc.com/api/v3/ticker/price?symbol=XMRUSDT")) as { price: string };
    return Number(r.price);
  },
  htx: async () => {
    const r = (await get("https://api.huobi.pro/market/detail/merged?symbol=xmrusdt")) as { tick: { close: number } };
    return Number(r.tick.close);
  },
};

export const MIN_SOURCES = 2;
export const MAX_DIVERGENCE = 0.02;
const CACHE_MS = 60_000;

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Fuentes que deben coincidir para poder descartar a las que se salen. */
export const MIN_AGREEING = 3;

/**
 * Aplica las reglas de mínimo de fuentes y divergencia. Lanza si no se cumplen.
 * Si una fuente se sale (un mercado delgado, un dato viejo) pero al menos 3 coinciden y son mayoría,
 * se descarta la que se sale y el precio es la mediana de las que coinciden. Sin esa mayoría, falla.
 */
export function aggregate(prices: Record<string, number>): { price: number; sources: Record<string, number>; dropped?: string[] } {
  const ok = Object.fromEntries(Object.entries(prices).filter(([, v]) => Number.isFinite(v) && v > 0));
  const vals = Object.values(ok);
  if (vals.length < MIN_SOURCES) throw new HttpError(503, `solo ${vals.length} fuentes de precio respondieron`);
  const med = median(vals);
  const isFar = (v: number, m: number) => Math.abs(v - m) / m > MAX_DIVERGENCE;
  const far = Object.entries(ok).filter(([, v]) => isFar(v, med));
  if (!far.length) return { price: med, sources: ok };
  const diverge = new HttpError(503, `fuentes de precio divergentes: ${far.map(([k]) => k).join(", ")}`);
  const near = Object.fromEntries(Object.entries(ok).filter(([, v]) => !isFar(v, med)));
  const nearVals = Object.values(near);
  if (nearVals.length < MIN_AGREEING || nearVals.length <= far.length) throw diverge;
  const price = median(nearVals);
  if (nearVals.some((v) => isFar(v, price))) throw diverge;
  return { price, sources: near, dropped: far.map(([k]) => k) };
}

let cached: { at: number; value: { price: number; sources: Record<string, number>; at: number } } | null = null;

export async function referencePrice(): Promise<{ price: number; sources: Record<string, number>; at: number }> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const results = await Promise.allSettled(Object.entries(SOURCES).map(async ([k, f]) => [k, await f()] as const));
  const prices: Record<string, number> = {};
  for (const r of results) if (r.status === "fulfilled") prices[r.value[0]] = r.value[1];
  const value = { ...aggregate(prices), at: Math.floor(Date.now() / 1000) };
  cached = { at: Date.now(), value };
  return value;
}
