import { HttpError } from "./env";

/**
 * Precio de referencia XMR/USDT: mediana de Kraken, CoinGecko y KuCoin (misma regla que
 * `maker/xmrp2p_maker/pricing.py`). Se exigen 2 fuentes y que ninguna se aleje más de 2 % de la
 * mediana. Lo usa el maker en el navegador, que no puede consultar todas las fuentes por CORS.
 * Solo informa un precio: no toca fondos.
 */
const SOURCES: Record<string, () => Promise<number>> = {
  kraken: async () => {
    const r = (await (await fetch("https://api.kraken.com/0/public/Ticker?pair=XMRUSDT")).json()) as {
      error?: string[];
      result: Record<string, { c: string[] }>;
    };
    if (r.error?.length) throw new Error(r.error.join(","));
    return Number(Object.values(r.result)[0]!.c[0]);
  },
  coingecko: async () => {
    const r = (await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd")).json()) as {
      monero: { usd: number };
    };
    return Number(r.monero.usd);
  },
  kucoin: async () => {
    const r = (await (await fetch("https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=XMR-USDT")).json()) as {
      data: { price: string };
    };
    return Number(r.data.price);
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

/** Aplica las reglas de mínimo de fuentes y divergencia. Lanza si no se cumplen. */
export function aggregate(prices: Record<string, number>): { price: number; sources: Record<string, number> } {
  const ok = Object.fromEntries(Object.entries(prices).filter(([, v]) => Number.isFinite(v) && v > 0));
  const vals = Object.values(ok);
  if (vals.length < MIN_SOURCES) throw new HttpError(503, `solo ${vals.length} fuentes de precio respondieron`);
  const med = median(vals);
  const far = Object.entries(ok).filter(([, v]) => Math.abs(v - med) / med > MAX_DIVERGENCE);
  if (far.length) throw new HttpError(503, `fuentes de precio divergentes: ${far.map(([k]) => k).join(", ")}`);
  return { price: med, sources: ok };
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
