/**
 * Alertas de anuncios nuevos por Telegram (opcionales).
 *
 * Cualquiera que abra el bot puede suscribirse con /alertas, sin cuenta P2P: solo se guarda el chat_id,
 * el idioma y los filtros (comprar o vender XMR, y monedas). Los anuncios son públicos en el mercado, así
 * que el aviso lleva el resumen del anuncio, pero nunca sus condiciones (texto libre del anunciante).
 *
 * Para no amplificar estafas ni spam: el aviso sale 15 min después de publicar (si el anuncio sigue
 * activo), como mucho 1 por anunciante cada 6 h, y nunca de anuncios cuyas condiciones piden contacto
 * fuera de la plataforma (WhatsApp, Telegram, teléfonos…).
 */
import type { Method } from "./catalog";
import { FIATS, POPULAR_FIATS } from "./catalog";
import { now, type P2PEnv } from "./common";
import { enabled, miniUrl, send, tg, type Lang } from "./telegram";

/** Segundos que espera un anuncio nuevo antes de avisarlo. */
export const ALERT_DELAY = 900;
const THROTTLE = 6 * 3600;
const BATCH = 100;
const MAX_FIATS = 20;

type Want = "buy" | "sell" | "both";
type Sub = { chat_id: string; lang: Lang; want: Want; fiats: string };

/** Condiciones que mandan a hablar o pagar fuera de la plataforma. */
const OFF_PLATFORM = /whats\s*app|wa\.me|telegram|t\.me\/|signal|wechat|viber|discord|@[a-z0-9_]{4,}|\+\d[\d\s().-]{7,}\d|\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/i;
export const asksOffPlatform = (terms: string) => OFF_PLATFORM.test(terms);

const L = (lang: Lang) => (es: string, en: string) => (lang === "es" ? es : en);

async function getSub(env: P2PEnv, chat: string) {
  return env.DB.prepare("SELECT chat_id, lang, want, fiats FROM p2p_tg_alerts WHERE chat_id = ?").bind(chat).first<Sub>();
}

export async function dropAlerts(env: P2PEnv, chat: string): Promise<number> {
  return (await env.DB.prepare("DELETE FROM p2p_tg_alerts WHERE chat_id = ?").bind(chat).run()).meta.changes ?? 0;
}

const fiatList = (s: string) => (s ? s.split(",").filter(Boolean) : []);

function menu(env: P2PEnv, lang: Lang, sub: Sub | null): { text: string; kb: unknown[][] } {
  const t = L(lang);
  const fiats = fiatList(sub?.fiats ?? "");
  const what = { buy: t("comprar", "buy"), sell: t("vender", "sell"), both: t("comprar o vender", "buy or sell") }[sub?.want ?? "both"];
  const text = sub
    ? t(
        `🔔 Alertas de anuncios nuevos: encendidas.\nTe aviso cuando alguien publique un anuncio para ${what} XMR con ${fiats.length ? fiats.join(", ") : "cualquier moneda"}.\n\nToca para cambiar. Otra moneda: escribe /alertas y su código, por ejemplo /alertas VES COP.`,
        `🔔 New ad alerts: on.\nI'll tell you when someone posts an ad to ${what} XMR with ${fiats.length ? fiats.join(", ") : "any currency"}.\n\nTap to change. Another currency: type /alerts and its code, for example /alerts VES COP.`,
      )
    : t(
        "🔕 Alertas de anuncios nuevos: apagadas.\nElige qué quieres hacer y en qué moneda, y te aviso cuando alguien publique un anuncio. No necesitas cuenta.",
        "🔕 New ad alerts: off.\nChoose what you want to do and in which currency, and I'll tell you when someone posts an ad. No account needed.",
      );
  const on = (cond: boolean, label: string) => (cond ? `✓ ${label}` : label);
  const kb: unknown[][] = [
    [
      { text: on(sub?.want === "buy", t("Comprar XMR", "Buy XMR")), callback_data: "al:w:buy" },
      { text: on(sub?.want === "sell", t("Vender XMR", "Sell XMR")), callback_data: "al:w:sell" },
      { text: on(sub?.want === "both", t("Ambos", "Both")), callback_data: "al:w:both" },
    ],
  ];
  const shown = [...POPULAR_FIATS, ...fiats.filter((f) => !POPULAR_FIATS.includes(f))];
  for (let i = 0; i < shown.length; i += 5) kb.push(shown.slice(i, i + 5).map((f) => ({ text: on(fiats.includes(f), f), callback_data: `al:f:${f}` })));
  kb.push([{ text: on(!!sub && !fiats.length, t("Todas las monedas", "All currencies")), callback_data: "al:f:*" }]);
  if (sub) kb.push([{ text: t("🔕 Apagar alertas", "🔕 Turn alerts off"), callback_data: "al:off" }]);
  return { text, kb };
}

/** /alertas [MON …]: muestra el menú; con monedas, las agrega a los filtros (y enciende las alertas). */
export async function alertsCommand(env: P2PEnv, chat: string, guess: Lang, args: string): Promise<void> {
  let sub = await getSub(env, chat);
  const lang: Lang = sub?.lang ?? guess;
  const codes = args.toUpperCase().split(/[\s,]+/).filter((c) => FIATS.includes(c));
  if (codes.length) {
    const fiats = [...new Set([...fiatList(sub?.fiats ?? ""), ...codes])].slice(0, MAX_FIATS).join(",");
    await save(env, chat, lang, sub?.want ?? "both", fiats);
    sub = await getSub(env, chat);
  }
  const m = menu(env, lang, sub);
  await send(env, chat, m.text, m.kb);
}

async function save(env: P2PEnv, chat: string, lang: Lang, want: Want, fiats: string) {
  await env.DB.prepare(
    `INSERT INTO p2p_tg_alerts (chat_id, lang, want, fiats, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET want = excluded.want, fiats = excluded.fiats`,
  )
    .bind(chat, lang, want, fiats, now())
    .run();
}

/** Botones del menú (callback «al:…»). */
export async function alertsCallback(env: P2PEnv, chat: string, guess: Lang, data: string, q: { id?: string; message?: { message_id?: number } }): Promise<void> {
  const sub = await getSub(env, chat);
  const lang: Lang = sub?.lang ?? guess;
  const t = L(lang);
  let note = "";
  const w = /^al:w:(buy|sell|both)$/.exec(data);
  const f = /^al:f:([A-Z]{3}|\*)$/.exec(data);
  if (w) {
    await save(env, chat, lang, w[1] as Want, sub?.fiats ?? "");
    note = t("Alertas encendidas.", "Alerts on.");
  } else if (f) {
    let fiats = fiatList(sub?.fiats ?? "");
    if (f[1] === "*") fiats = [];
    else if (FIATS.includes(f[1]!)) fiats = fiats.includes(f[1]!) ? fiats.filter((x) => x !== f[1]) : [...fiats, f[1]!].slice(0, MAX_FIATS);
    await save(env, chat, lang, sub?.want ?? "both", fiats.join(","));
    note = t("Listo.", "Done.");
  } else if (data === "al:off") {
    await dropAlerts(env, chat);
    note = t("Alertas apagadas.", "Alerts off.");
  } else if (data === "al:m") {
    await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
    return alertsCommand(env, chat, lang, "");
  }
  await tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: note });
  const m = menu(env, lang, await getSub(env, chat));
  if (q.message?.message_id) await tg(env, "editMessageText", { chat_id: chat, message_id: q.message.message_id, text: m.text, reply_markup: { inline_keyboard: m.kb } });
  else await send(env, chat, m.text, m.kb);
}

// ---------------------------------------------------------------- envío (desde la tarea programada)

type AdRow = {
  id: string;
  user_id: string;
  side: "sell" | "buy";
  fiat: string;
  country: string | null;
  price_type: "fixed" | "float";
  price: string | null;
  margin_pct: number | null;
  min_fiat: string;
  max_fiat: string;
  methods: string;
  terms: string;
  status: string;
  created_at: number;
  nickname: string;
  orders_done: number;
  banned: number;
};

type Cursor = { t: number; id: string; ad?: string; chat?: string };

function alertText(ad: AdRow, lang: Lang): string {
  const t = L(lang);
  const methods = (JSON.parse(ad.methods) as Method[]).map((m) => m.name).join(", ");
  const m = ad.margin_pct ?? 0;
  const price = ad.price_type === "fixed" ? `${ad.price} ${ad.fiat}/XMR` : t(`mercado ${m > 0 ? "+" : ""}${m} %`, `market ${m > 0 ? "+" : ""}${m}%`);
  return [
    `🆕 ${ad.nickname} ${ad.side === "sell" ? t(`vende XMR por ${ad.fiat}`, `sells XMR for ${ad.fiat}`) : t(`compra XMR con ${ad.fiat}`, `buys XMR with ${ad.fiat}`)}${ad.country ? ` (${ad.country})` : ""}`,
    `${t("Precio", "Price")}: ${price}`,
    `${t("Límite", "Limit")}: ${ad.min_fiat} – ${ad.max_fiat} ${ad.fiat}`,
    `${t("Métodos", "Methods")}: ${methods}`.slice(0, 300),
    ad.orders_done ? t(`${ad.orders_done} órdenes completadas`, `${ad.orders_done} completed orders`) : t("Anunciante nuevo, sin órdenes todavía", "New advertiser, no orders yet"),
    "",
    t("Paga y chatea solo dentro de la app, nunca por WhatsApp ni Telegram.", "Pay and chat only inside the app, never on WhatsApp or Telegram."),
  ].join("\n");
}

/**
 * Manda las alertas de anuncios con más de 15 min (hasta 3 anuncios y 100 chats por anuncio en cada
 * corrida; un cursor guarda por dónde va). La primera vez solo fija el cursor: no avisa anuncios viejos.
 */
export async function sendAdAlerts(env: P2PEnv): Promise<number> {
  if (!enabled(env)) return 0;
  const key = "tg_alerts_cursor";
  const t = now();
  const raw = await env.DB.prepare("SELECT value FROM p2p_settings WHERE key = ?").bind(key).first<{ value: string }>();
  let cur: Cursor = raw ? (JSON.parse(raw.value) as Cursor) : { t: t - ALERT_DELAY, id: "" };
  const saveCur = () => env.DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES (?, ?)").bind(key, JSON.stringify(cur)).run();
  if (!raw) {
    await saveCur();
    return 0;
  }
  let sent = 0;
  for (let n = 0; n < 3; n++) {
    const ad = await env.DB.prepare(
      `SELECT a.id, a.user_id, a.side, a.fiat, a.country, a.price_type, a.price, a.margin_pct, a.min_fiat, a.max_fiat, a.methods, a.terms,
              a.status, a.created_at, u.nickname, u.orders_done, u.banned
       FROM p2p_ads a JOIN p2p_users u ON u.id = a.user_id
       WHERE (a.created_at > ?1 OR (a.created_at = ?1 AND a.id > ?2)) AND a.created_at <= ?3
       ORDER BY a.created_at, a.id LIMIT 1`,
    )
      .bind(cur.t, cur.id, t - ALERT_DELAY)
      .first<AdRow>();
    if (!ad) break;
    const throttled =
      cur.ad !== ad.id &&
      !!(await env.DB.prepare("SELECT 1 AS x FROM p2p_tg_alert_log WHERE user_id = ? AND sent_at > ?").bind(ad.user_id, t - THROTTLE).first());
    let done = true;
    if (ad.status === "active" && !ad.banned && !asksOffPlatform(ad.terms) && !throttled) {
      if (cur.ad !== ad.id) await env.DB.prepare("INSERT OR IGNORE INTO p2p_tg_alert_log (ad_id, user_id, sent_at) VALUES (?, ?, ?)").bind(ad.id, ad.user_id, t).run();
      const subs = await env.DB.prepare(
        `SELECT s.chat_id, s.lang FROM p2p_tg_alerts s
         WHERE s.chat_id > ?1 AND (s.want = 'both' OR s.want = ?2) AND (s.fiats = '' OR instr(',' || s.fiats || ',', ?3) > 0)
           AND s.chat_id NOT IN (SELECT chat_id FROM p2p_telegram WHERE user_id = ?4)
         ORDER BY s.chat_id LIMIT ${BATCH}`,
      )
        .bind(cur.ad === ad.id ? (cur.chat ?? "") : "", ad.side === "sell" ? "buy" : "sell", `,${ad.fiat},`, ad.user_id)
        .all<{ chat_id: string; lang: Lang }>();
      const list = subs.results;
      // De a 25 por vez: Telegram acepta unos 30 mensajes por segundo.
      for (let i = 0; i < list.length; i += 25)
        await Promise.all(
          list.slice(i, i + 25).map((s) => {
            const lang: Lang = s.lang === "en" ? "en" : "es";
            const route = `?lado=${ad.side === "sell" ? "comprar" : "vender"}&fiat=${ad.fiat}&todos=1`;
            return send(env, s.chat_id, alertText(ad, lang), [
              [{ text: lang === "es" ? "Ver anuncio" : "See ad", web_app: { url: miniUrl(env, lang, route) } }],
              [{ text: lang === "es" ? "🔔 Ajustar alertas" : "🔔 Alert settings", callback_data: "al:m" }],
            ]);
          }),
        );
      sent += list.length;
      if (list.length === BATCH) {
        cur = { t: cur.t, id: cur.id, ad: ad.id, chat: list[list.length - 1]!.chat_id };
        done = false;
      }
    }
    if (done) cur = { t: ad.created_at, id: ad.id };
    await saveCur();
    if (!done) break;
  }
  return sent;
}
