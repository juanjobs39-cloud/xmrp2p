/**
 * Vista simple tipo agregador (predeterminada; PUBLIC_DRAFT_UI=off la apaga): el usuario escribe cuánto USDT envía,
 * pulsa «Intercambiar» y ve las cotizaciones de todos los makers. Si no hay ninguna (o el monto
 * supera el tope), se muestra el widget de Trocador dentro de la misma página.
 * Las cuentas son puras para poder probarlas.
 */
import type { Offer } from "./api";

export interface QuoteRow {
  offer: Offer;
  usdt: number;
  xmr: number;
}

/** Cotizaciones que cubren el monto, de mayor a menor XMR recibido. */
export function quotesFor(offers: Offer[], usdt: number): QuoteRow[] {
  if (!(usdt > 0)) return [];
  return offers
    .filter((o) => usdt >= Number(o.min_usdt) && usdt <= Number(o.max_usdt) && usdt / Number(o.price) <= Number(o.max_xmr))
    .map((o) => ({ offer: o, usdt, xmr: Math.floor((usdt / Number(o.price)) * 1e12) / 1e12 }))
    .sort((a, b) => b.xmr - a.xmr);
}

/** Rango de montos que cubren las ofertas vigentes (para orientar al usuario). */
export function availableRange(offers: Offer[]): { min: number; max: number } | null {
  if (!offers.length) return null;
  return { min: Math.min(...offers.map((o) => Number(o.min_usdt))), max: Math.max(...offers.map((o) => Number(o.max_usdt))) };
}
