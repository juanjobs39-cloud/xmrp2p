import { HttpError } from "../env";
import { referencePrice } from "../price";

/** Monedas que se muestran primero en el selector. */
export const POPULAR_FIATS = ["MXN", "USD", "EUR", "COP", "ARS", "BRL", "CLP", "PEN", "GBP", "CAD"];

/** Monedas fiat vigentes (ISO 4217, sin fondos ni metales). El nombre lo pone el navegador en cada idioma. */
export const FIATS = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF",
  "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC",
  "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS",
  "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD",
  "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
  "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD",
  "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD",
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SYP", "SZL",
  "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND",
  "VUV", "WST", "XAF", "XCD", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWG",
];
const FIAT_SET = new Set(FIATS);

export function requireFiat(v: unknown): string {
  const f = typeof v === "string" ? v.toUpperCase() : "";
  if (!FIAT_SET.has(f)) throw new HttpError(400, "moneda fiat inválida");
  return f;
}

export function requireCountry(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^[A-Za-z]{2}$/.test(v)) throw new HttpError(400, "país inválido (código ISO de 2 letras)");
  return v.toUpperCase();
}

export type MethodKind = "bank" | "wallet" | "cash" | "card" | "giftcard" | "other";
export const METHOD_KINDS: MethodKind[] = ["bank", "wallet", "cash", "card", "giftcard", "other"];

export interface Method {
  kind: MethodKind;
  name: string;
  country?: string | null;
  /** El pago se puede revertir después de liberar (contracargo): se muestra con etiqueta de riesgo. */
  reversible: boolean;
}

const m = (kind: MethodKind, name: string, reversible = false, country?: string): Method => ({ kind, name, reversible, ...(country ? { country } : {}) });

/** Métodos sugeridos por moneda. Cualquier usuario puede además crear uno libre. */
export const SUGGESTED: Record<string, Method[]> = {
  MXN: [m("bank", "SPEI", false, "MX"), m("cash", "OXXO deposit", false, "MX"), m("cash", "Cash in person"), m("wallet", "Mercado Pago", true, "MX")],
  USD: [m("bank", "Bank transfer"), m("wallet", "Zelle", false, "US"), m("cash", "Cash in person"), m("wallet", "PayPal", true), m("wallet", "Cash App", true, "US"), m("wallet", "Wise")],
  EUR: [m("bank", "SEPA"), m("bank", "SEPA Instant"), m("wallet", "Revolut", true), m("wallet", "Wise"), m("cash", "Cash in person"), m("wallet", "PayPal", true)],
  GBP: [m("bank", "Faster Payments", false, "GB"), m("wallet", "Revolut", true), m("wallet", "Wise"), m("cash", "Cash in person")],
  BRL: [m("bank", "Pix", false, "BR"), m("bank", "TED", false, "BR"), m("cash", "Cash in person")],
  COP: [m("wallet", "Nequi", false, "CO"), m("wallet", "Daviplata", false, "CO"), m("bank", "Bancolombia", false, "CO"), m("cash", "Cash in person")],
  ARS: [m("bank", "Bank transfer (CBU/CVU)", false, "AR"), m("wallet", "Mercado Pago", true, "AR"), m("cash", "Cash in person")],
  CLP: [m("bank", "Bank transfer", false, "CL"), m("cash", "Cash in person")],
  PEN: [m("wallet", "Yape", false, "PE"), m("wallet", "Plin", false, "PE"), m("bank", "Bank transfer", false, "PE"), m("cash", "Cash in person")],
  VES: [m("bank", "Pago Móvil", false, "VE"), m("bank", "Bank transfer", false, "VE"), m("cash", "Cash in person")],
  CAD: [m("bank", "Interac e-Transfer", false, "CA"), m("cash", "Cash in person")],
  RUB: [m("bank", "Bank transfer", false, "RU"), m("cash", "Cash in person")],
  UAH: [m("bank", "Bank transfer", false, "UA"), m("cash", "Cash in person")],
  INR: [m("bank", "UPI", false, "IN"), m("bank", "IMPS", false, "IN"), m("cash", "Cash in person")],
};
const DEFAULT_SUGGESTED = [m("bank", "Bank transfer"), m("cash", "Cash in person")];

export function suggestedMethods(fiat: string): Method[] {
  return SUGGESTED[fiat] ?? DEFAULT_SUGGESTED;
}

/** Nombres que siempre se consideran reversibles, aunque el usuario no lo marque. */
const ALWAYS_REVERSIBLE = /paypal|venmo|cash\s*app|revolut|mercado\s*pago|skrill|neteller|apple\s*pay|google\s*pay|tarjeta|card/i;

/** Valida un método (sugerido o libre) y fija si es reversible. */
export function normalizeMethod(v: unknown, blocked: string[]): Method {
  const o = (v ?? {}) as Record<string, unknown>;
  const kind = o.kind as MethodKind;
  if (!METHOD_KINDS.includes(kind)) throw new HttpError(400, "tipo de método de pago inválido");
  const name = typeof o.name === "string" ? o.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 40 || /[<>]/.test(name)) throw new HttpError(400, "nombre de método de pago inválido (2–40 caracteres)");
  if (blocked.some((b) => b.toLowerCase() === name.toLowerCase())) throw new HttpError(400, `el método «${name}» no está permitido`);
  const country = requireCountry(o.country);
  const reversible = o.reversible === true || kind === "card" || ALWAYS_REVERSIBLE.test(name);
  return { kind, name, reversible, ...(country ? { country } : {}) };
}

// ---------- Precio de XMR en cada moneda ----------

/** USD → moneda (tipo de cambio diario de fuente abierta, sin llave). */
const FX_SOURCES: (() => Promise<Record<string, number>>)[] = [
  async () => {
    const r = (await (await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(5000) })).json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (r.result !== "success" || !r.rates) throw new Error("open.er-api sin datos");
    return r.rates;
  },
  async () => {
    const r = (await (await fetch("https://api.frankfurter.app/latest?from=USD", { signal: AbortSignal.timeout(5000) })).json()) as {
      rates?: Record<string, number>;
    };
    if (!r.rates) throw new Error("frankfurter sin datos");
    return { USD: 1, ...r.rates };
  },
];

let fxCache: { at: number; rates: Record<string, number> } | null = null;
const FX_TTL_MS = 3600_000;

export async function usdRates(): Promise<Record<string, number>> {
  if (fxCache && Date.now() - fxCache.at < FX_TTL_MS) return fxCache.rates;
  for (const src of FX_SOURCES) {
    try {
      const rates = await src();
      fxCache = { at: Date.now(), rates };
      return rates;
    } catch {
      /* siguiente fuente */
    }
  }
  if (fxCache) return fxCache.rates; // mejor un tipo de cambio de hace unas horas que nada
  throw new HttpError(503, "no hay tipo de cambio disponible");
}

/** Precio de mercado de 1 XMR en la moneda indicada (y el de USD, para el tope). */
export async function xmrPrice(fiat: string): Promise<{ fiat: string; price: number; usd: number; rate: number; sources: string[]; at: number }> {
  const [{ price: usd, sources, at }, rates] = await Promise.all([referencePrice(), usdRates()]);
  const rate = fiat === "USD" ? 1 : rates[fiat];
  if (!rate || !Number.isFinite(rate)) throw new HttpError(503, `no hay tipo de cambio para ${fiat}`);
  return { fiat, price: usd * rate, usd, rate, sources: Object.keys(sources), at };
}
