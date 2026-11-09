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
