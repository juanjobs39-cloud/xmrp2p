/** Utilidades de DOM y piezas visuales comunes de P2P Fiat (sin dependencias). */

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k in el && typeof v !== "string") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const ICONS = {
  market: "M7 4v14M3.500 14.500L7 18l3.500-3.500M17 20V6M13.500 9.500L17 6l3.500 3.500",
  plus: "M12 5v14M5 12h14",
  orders: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  ads: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  user: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8M4.500 20.500c1-3.600 4-5.500 7.500-5.500s6.500 1.900 7.500 5.500",
  shield: "M12 3l7.500 3v5.500c0 4.600-3.100 8.200-7.500 9.500c-4.400-1.300-7.500-4.900-7.500-9.500V6zM8.800 12.200l2.300 2.300l4.200-4.600",
  lock: "M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3",
  swap: "M4 8h14M14.500 4.500L18 8l-3.500 3.500M20 16H6M9.500 12.500L6 16l3.500 3.500",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.500 2h-15zM10 20.500a2 2 0 0 0 4 0",
  chat: "M5 5h14v10h-8.500L6 19v-4H5z",
  x: "M6 6l12 12M18 6L6 18",
  send: "M21 3L3 10.500l7 2.500l2.500 7zM10 13l5-5",
  up: "M7 11v9H4v-9zM7 11l4-8a2.500 2.500 0 0 1 2.500 3L13 9.500h5.500a2 2 0 0 1 2 2.400l-1.300 6.500A2 2 0 0 1 17.200 20H7",
  down: "M7 13V4H4v9zM7 13l4 8a2.500 2.500 0 0 0 2.500-3L13 14.500h5.500a2 2 0 0 0 2-2.400l-1.300-6.500A2 2 0 0 0 17.200 4H7",
} as const;

/** Ícono de línea en SVG (decorativo). Se arma con el DOM: la CSP de la app no admite HTML en línea. */
export function icon(name: keyof typeof ICONS): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "ico");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", ICONS[name]);
  svg.append(path);
  return svg;
}

export const fmtXmr = (x: string | number) => String(Number(x).toFixed(6)).replace(/\.?0+$/, "");
export const nowS = () => Math.floor(Date.now() / 1000);

/** Monto en fiat con separadores del idioma (2 decimales como máximo). */
export const fmtFiat = (n: number | string, lang: string, max = 2) =>
  Number(n).toLocaleString(lang === "es" ? "es-MX" : lang, { minimumFractionDigits: Number(n) % 1 ? Math.min(2, max) : 0, maximumFractionDigits: max });

/** mm:ss o h:mm:ss. */
export function clock(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(hh ? 2 : 1, "0");
  return `${hh ? `${hh}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
}

/** Avatar con la inicial del apodo y un color estable derivado del apodo. */
export function avatar(nick: string, online?: boolean): HTMLElement {
  let x = 0;
  for (const c of nick) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const el = h("span", { class: "p2p-avatar", "aria-hidden": "true" }, (nick[0] ?? "?").toUpperCase(), online === undefined ? null : h("i", { class: online ? "on" : "off" }));
  // Por CSSOM (la CSP no permite atributos style en línea).
  el.style.setProperty("--hue", String(x % 360));
  return el;
}

/** Tono de la insignia según el estado de una orden. */
export function statusTone(s: string): "ok" | "warn" | "danger" | "info" | "muted" {
  if (["released", "resolved_buyer", "resolved_seller", "refunded"].includes(s)) return "ok";
  if (["disputed"].includes(s)) return "danger";
  if (["cancelled"].includes(s)) return "muted";
  if (["awaiting_payment", "paid", "awaiting_deposit"].includes(s)) return "warn";
  return "info";
}

/** Renglones grises mientras carga. */
export const skeleton = (rows = 3) => h("div", { class: "p2p-skel-list", "aria-busy": "true" }, Array.from({ length: rows }, () => h("div", { class: "p2p-skel" })));

/** Hijos sin vacíos, para replaceChildren(...kids(a, b && c)). */
export const kids = (...xs: (Child | Child[])[]): (Node | string)[] => xs.flat().filter((x): x is Node | string => x !== null && x !== undefined && x !== false);

/** Diferencia en %, con signo (+1.25%, −0.50%, 0.00%). */
export function pct(d: number): string {
  const r = Math.round(d * 100) / 100;
  return r === 0 ? "0.00%" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}%`;
}

const OFF_PLATFORM: Record<string, string> = {
  es: "⚠️ Nunca operes por fuera de MoneroP2P Fiat. Si alguien te pide escribirle por WhatsApp, Telegram u otro medio, o pagar o enviar XMR fuera de una orden, es una estafa: podrías perder tu dinero o tu XMR y no podremos ayudarte a recuperarlo. Solo el escrow de la orden te protege.",
  en: "⚠️ Never trade outside MoneroP2P Fiat. If someone asks you to contact them on WhatsApp, Telegram or anywhere else, or to pay or send XMR outside an order, it is a scam: you could lose your money or your XMR and we won't be able to help you get it back. Only the order's escrow protects you.",
  pt: "⚠️ Nunca negocie fora do MoneroP2P Fiat. Se alguém pedir para você chamar no WhatsApp, Telegram ou outro meio, ou pagar ou enviar XMR fora de uma ordem, é golpe: você pode perder seu dinheiro ou seu XMR e não poderemos ajudar a recuperá-lo. Só o escrow da ordem protege você.",
  ru: "⚠️ Никогда не проводите сделки вне MoneroP2P Fiat. Если вас просят написать в WhatsApp, Telegram или куда-то ещё либо заплатить или отправить XMR вне ордера — это мошенничество: вы можете потерять деньги или XMR, и мы не сможем помочь их вернуть. Защищает только эскроу ордера.",
};

/** Advertencia contra operar por fuera de la plataforma (comprador y vendedor). */
export const offPlatformWarning = (lang: string) =>
  h("p", { class: "notice danger p2p-offplatform", role: "note" }, OFF_PLATFORM[lang] ?? OFF_PLATFORM.en);

/** Minutos → «25 min» o «3 h». */
export function fmtWait(min: number): string {
  return min < 60 ? `${Math.max(1, Math.round(min))} min` : `${Math.round(min / 60)} h`;
}
