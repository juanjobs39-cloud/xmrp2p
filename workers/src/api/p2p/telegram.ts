/**
 * Avisos de P2P Fiat por Telegram (opcionales).
 *
 * Cada usuario puede ligar su cuenta P2P a un chat privado con el bot: solo se guarda el chat_id y el
 * idioma. Los mensajes a usuarios llevan el evento y un enlace a la orden, nunca montos, apodos ni datos
 * de pago. El administrador recibe además avisos con detalle (apelaciones, anuncios, usuarios nuevos y
 * órdenes completadas), que son datos que ya ve en su panel.
 *
 * Desde el chat solo se puede aceptar o rechazar una solicitud. Los botones «Abrir orden» abren la app
 * como Mini App dentro de Telegram: es la misma web, así que el escrow lo firma el celular del usuario y
 * ninguna llave pasa por el bot ni por el servidor.
 */
import { HttpError, json, randomId, readJson, sha256Hex } from "../env";
import { activeUser, getUser, now, signer, type P2PEnv } from "./common";
import { alertsCallback, alertsCommand, dropAlerts } from "./alerts";
import { acceptRequest, declineRequest, FINAL, getOrder } from "./orders";

export type Lang = "es" | "en";

export type EventKind =
  | "request"
  | "order_new"
  | "request_soon"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled"
  | "escrow_ready"
  | "deposit_seen"
  | "funded"
  | "paid"
  | "releasing"
  | "dispute"
  | "resolved"
  | "released"
  | "refunded"
  | "timeout";

export interface NotifyEvent {
  kind: EventKind;
  orderId: string;
  /** Horas para responder (solo en «request»). */
  hours?: number;
}

/** Código para ligar: vence a los 10 minutos. */
const CODE_TTL = 600;

const TEXT: Record<EventKind, Record<Lang, (e: NotifyEvent) => string>> = {
  request: {
    es: (e) => `📨 Nueva solicitud en tu anuncio. Tienes ${e.hours ?? 1} h para responder. Al aceptar hay 60 min para armar el escrow en la web.`,
    en: (e) => `📨 New request on your ad. You have ${e.hours ?? 1} h to reply. Once you accept there are 60 min to set up the escrow on the web.`,
  },
  order_new: {
    es: () => "🔔 Abrieron una orden en tu anuncio. Ábrela para armar el escrow.",
    en: () => "🔔 Someone opened an order on your ad. Open it to set up the escrow.",
  },
  request_soon: {
    es: () => "⏰ Falta 1 h para que venza una solicitud en tu anuncio.",
    en: () => "⏰ A request on your ad expires in 1 h.",
  },
  accepted: {
    es: () => "✅ Aceptaron tu solicitud. Abre la orden ahora: tu navegador también firma el escrow.",
    en: () => "✅ Your request was accepted. Open the order now: your browser also signs the escrow.",
  },
  declined: { es: () => "✖ Rechazaron tu solicitud. No pagaste nada.", en: () => "✖ Your request was declined. You paid nothing." },
  expired: { es: () => "⌛ Tu solicitud venció sin respuesta. No pagaste nada.", en: () => "⌛ Your request expired without a reply. You paid nothing." },
  cancelled: { es: () => "La orden se canceló.", en: () => "The order was cancelled." },
  escrow_ready: { es: () => "🔐 Escrow listo: deposita el XMR.", en: () => "🔐 Escrow ready: deposit the XMR." },
  deposit_seen: {
    es: () => "👀 Depósito visto en el escrow: faltan 10 confirmaciones (~20 min). Comprador: todavía no pagues.",
    en: () => "👀 Deposit seen in the escrow: 10 confirmations to go (~20 min). Buyer: do not pay yet.",
  },
  funded: { es: () => "🔒 El XMR está en el escrow con 10 confirmaciones: ya puedes pagar.", en: () => "🔒 The XMR is in escrow with 10 confirmations: you can pay now." },
  paid: {
    es: () => "💸 El comprador marcó «Ya pagué». Revisa TU cuenta y libera solo si recibiste el dinero.",
    en: () => "💸 The buyer marked “I have paid”. Check YOUR account and release only if you received the money.",
  },
  releasing: { es: () => "🚀 El vendedor liberó: el XMR va en camino.", en: () => "🚀 The seller released: the XMR is on its way." },
  dispute: { es: () => "⚖️ Abrieron una apelación en tu orden. Soporte revisará el chat.", en: () => "⚖️ An appeal was opened on your order. Support will review the chat." },
  resolved: { es: () => "⚖️ Soporte resolvió la apelación de tu orden.", en: () => "⚖️ Support resolved the appeal on your order." },
  released: { es: () => "✅ Orden completada: el XMR salió del escrow a la wallet del comprador.", en: () => "✅ Order completed: the XMR left the escrow to the buyer's wallet." },
  refunded: { es: () => "↩️ Orden reembolsada al vendedor.", en: () => "↩️ Order refunded to the seller." },
  timeout: { es: () => "⌛ Se acabó el tiempo de un paso de la orden.", en: () => "⌛ Time ran out on an order step." },
};

const OPEN: Record<Lang, string> = { es: "Abrir orden", en: "Open order" };

const site = (env: P2PEnv) => (env.API_URL || "https://fiat.monerop2p.app").replace(/\/$/, "");
/** Enlace a la app abierta como Mini App: la ruta va en ?r= porque Telegram usa el # para sus datos. */
export const miniUrl = (env: P2PEnv, lang: Lang, route = "") => `${site(env)}/${lang}/app/?tg=1${route ? `&r=${encodeURIComponent(route)}` : ""}`;
const openBtn = (env: P2PEnv, lang: Lang, id: string, text = OPEN[lang]) => ({ text, web_app: { url: miniUrl(env, lang, `orden/${id}`) } });
export const enabled = (env: P2PEnv) => !!env.P2P_TELEGRAM_TOKEN && !!env.P2P_TELEGRAM_WEBHOOK_SECRET;

type TgResult = { ok: boolean; status: number; result?: Record<string, unknown> };

/** Llamada a la API de bots. Nunca lanza: devuelve ok=false. */
export async function tg(env: P2PEnv, method: string, body: Record<string, unknown>): Promise<TgResult> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.P2P_TELEGRAM_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; result?: Record<string, unknown> };
    return { ok: r.ok && !!j.ok, status: r.status, result: j.result };
  } catch (e) {
    console.log("telegram falló:", method, String(e));
    return { ok: false, status: 0 };
  }
}

/** Manda un mensaje; si el usuario bloqueó el bot (403) o el chat ya no existe, borra el vínculo y las alertas. */
export async function send(env: P2PEnv, chatId: string, text: string, keyboard?: unknown[][]) {
  const r = await tg(env, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
  if (r.status === 403)
    await env.DB.batch([env.DB.prepare("DELETE FROM p2p_telegram WHERE chat_id = ?").bind(chatId), env.DB.prepare("DELETE FROM p2p_tg_alerts WHERE chat_id = ?").bind(chatId)]);
}

/** Avisa a los usuarios ligados. Solo el evento y el enlace; en «request», botones Aceptar y Rechazar. */
export async function telegramNotify(env: P2PEnv, ev: NotifyEvent, users: string[]): Promise<void> {
  if (!enabled(env) || !users.length) return;
  const rows = await env.DB.prepare(`SELECT user_id, chat_id, lang FROM p2p_telegram WHERE user_id IN (${users.map(() => "?").join(", ")})`)
    .bind(...users)
    .all<{ user_id: string; chat_id: string; lang: Lang }>();
  await Promise.all(
    rows.results.map((r) => {
      const lang: Lang = r.lang === "en" ? "en" : "es";
      const kb: unknown[][] = [[openBtn(env, lang, ev.orderId)]];
      if (ev.kind === "request")
        kb.unshift([
          { text: lang === "es" ? "✅ Aceptar" : "✅ Accept", callback_data: `a:${ev.orderId}` },
          { text: lang === "es" ? "✖ Rechazar" : "✖ Decline", callback_data: `d:${ev.orderId}` },
        ]);
      return send(env, r.chat_id, TEXT[ev.kind][lang](ev), kb);
    }),
  );
}

/** Aviso al administrador (con detalle), si ligó su Telegram. */
export async function telegramAdmin(env: P2PEnv, text: string, orderId?: string): Promise<void> {
  try {
    if (!enabled(env) || !env.P2P_ADMIN_ADDRESS) return;
    const row = await env.DB.prepare("SELECT chat_id, lang FROM p2p_telegram WHERE user_id = ?")
      .bind(env.P2P_ADMIN_ADDRESS.toLowerCase())
      .first<{ chat_id: string; lang: Lang }>();
    if (!row) return;
    const lang: Lang = row.lang === "en" ? "en" : "es";
    await send(env, row.chat_id, `🛡 ${text}`.slice(0, 4000), orderId ? [[{ text: "Admin", web_app: { url: miniUrl(env, lang, `admin/${orderId}`) } }]] : undefined);
  } catch (e) {
    console.log("aviso admin falló:", String(e));
  }
}

// ---------------------------------------------------------------- ligar y desligar

/** POST /v1/p2p/telegram/link {lang} — código de un solo uso y enlace al bot. */
export async function link(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  await activeUser(env, user);
  const bot = await botName(env);
  if (!enabled(env) || !bot) throw new HttpError(503, "los avisos por Telegram no están disponibles ahora");
  const lang: Lang = data.lang === "en" ? "en" : "es";
  const code = randomId(16);
  const t = now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM p2p_telegram_codes WHERE expires_at < ? OR user_id = ?").bind(t, user),
    env.DB.prepare("INSERT INTO p2p_telegram_codes (code, user_id, lang, expires_at) VALUES (?, ?, ?, ?)").bind(code, user, lang, t + CODE_TTL),
  ]);
  return json({ url: `https://t.me/${bot}?start=${code}`, bot, expires_at: t + CODE_TTL });
}

/** DELETE /v1/p2p/telegram — desliga el chat de la cuenta. */
export async function unlink(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  const row = await env.DB.prepare("SELECT chat_id, lang FROM p2p_telegram WHERE user_id = ?").bind(user).first<{ chat_id: string; lang: Lang }>();
  if (row) {
    await env.DB.prepare("DELETE FROM p2p_telegram WHERE user_id = ?").bind(user).run();
    await send(env, row.chat_id, row.lang === "en" ? "Disconnected. You will no longer get notifications here." : "Desconectado. Ya no recibirás avisos aquí.");
  }
  return json({ ok: true });
}

export async function isLinked(env: P2PEnv, user: string): Promise<boolean> {
  return !!(await env.DB.prepare("SELECT 1 AS x FROM p2p_telegram WHERE user_id = ?").bind(user).first());
}

// ---------------------------------------------------------------- webhook

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const HELP: Record<Lang, string> = {
  es: "Este bot manda avisos de tus órdenes de MoneroP2P Fiat y te deja aceptar o rechazar solicitudes. El botón «P2P» abre el mercado dentro de Telegram: tu cuenta y el escrow se firman en tu celular, el bot nunca ve llaves ni datos de pago y nunca te pedirá pagos ni contraseñas. Para recibir avisos de tus órdenes: Cuenta → Conectar Telegram. /alertas te avisa de anuncios nuevos (no necesitas cuenta); /ordenes lista tus órdenes abiertas; /stop apaga todo.",
  en: "This bot sends notifications about your MoneroP2P Fiat orders and lets you accept or decline requests. The “P2P” button opens the market inside Telegram: your account and the escrow are signed on your phone, the bot never sees keys or payment details and will never ask you for payments or passwords. To get notifications about your orders: Account → Connect Telegram. /alerts tells you about new ads (no account needed); /orders lists your open orders; /stop turns everything off.",
};
const MARKET: Record<Lang, string> = { es: "🛒 Abrir P2P", en: "🛒 Open P2P" };

type Update = {
  message?: { text?: string; chat?: { id?: number; type?: string }; from?: { language_code?: string } };
  callback_query?: { id?: string; data?: string; message?: { message_id?: number; chat?: { id?: number } }; from?: { language_code?: string } };
};

/** POST /v1/p2p/telegram/webhook — solo Telegram (cabecera con el secreto). */
export async function webhook(req: Request, env: P2PEnv): Promise<Response> {
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!enabled(env) || !sameSecret(secret, env.P2P_TELEGRAM_WEBHOOK_SECRET!)) throw new HttpError(401, "no autorizado");
  const u = (await req.json().catch(() => ({}))) as Update;
  try {
    if (u.message) await onMessage(env, u.message);
    else if (u.callback_query) await onCallback(env, u.callback_query);
  } catch (e) {
    console.log("webhook telegram:", String(e));
  }
  // Siempre 200: si no, Telegram reintenta el mismo mensaje.
  return json({ ok: true });
}

async function onMessage(env: P2PEnv, m: NonNullable<Update["message"]>) {
  if (m.chat?.type !== "private" || typeof m.chat.id !== "number") return;
  const chat = String(m.chat.id);
  const guess: Lang = (m.from?.language_code ?? "").startsWith("es") ? "es" : "en";
  const text = (m.text ?? "").trim();
  const alerts = /^\/(?:alertas|alerts)(?:@\w+)?(?:\s+(.*))?$/.exec(text) ?? /^\/start\s+(?:alertas|alerts)$/.exec(text);
  if (alerts) return alertsCommand(env, chat, guess, alerts[1] ?? "");
  const start = /^\/start(?:\s+([0-9a-f]{32}))?$/.exec(text);
  if (start?.[1]) {
    const t = now();
    const c = await env.DB.prepare("SELECT user_id, lang FROM p2p_telegram_codes WHERE code = ? AND expires_at >= ?").bind(start[1], t).first<{ user_id: string; lang: Lang }>();
    await env.DB.prepare("DELETE FROM p2p_telegram_codes WHERE code = ?").bind(start[1]).run();
    const user = c ? await getUser(env, c.user_id) : null;
    if (!c || !user || user.banned)
      return send(env, chat, guess === "es" ? "El código no es válido o ya venció. Genera otro en la app (Cuenta → Conectar Telegram)." : "The code is invalid or expired. Create a new one in the app (Account → Connect Telegram).");
    // Un chat liga una sola cuenta y una cuenta un solo chat.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM p2p_telegram WHERE chat_id = ? OR user_id = ?").bind(chat, user.id),
      env.DB.prepare("INSERT INTO p2p_telegram (user_id, chat_id, lang, created_at) VALUES (?, ?, ?, ?)").bind(user.id, chat, c.lang, t),
    ]);
    return send(
      env,
      chat,
      c.lang === "en"
        ? `Connected as ${user.nickname}. Here you'll get notifications about your orders and requests. /stop disconnects.`
        : `Conectado como ${user.nickname}. Aquí te avisaremos de tus órdenes y solicitudes. /stop lo desconecta.`,
    );
  }
  if (/^\/(ordenes|orders)\b/.test(text)) return openOrders(env, chat, guess);
  if (/^\/stop\b/.test(text)) {
    const r = await env.DB.prepare("DELETE FROM p2p_telegram WHERE chat_id = ?").bind(chat).run();
    const a = await dropAlerts(env, chat);
    return send(env, chat, r.meta.changes || a ? (guess === "es" ? "Desconectado. Ya no recibirás avisos aquí." : "Disconnected. You will no longer get notifications here.") : HELP[guess]);
  }
  return send(env, chat, HELP[guess], [[{ text: MARKET[guess], web_app: { url: miniUrl(env, guess) } }]]);
}

const STATUS: Record<string, [string, string]> = {
  requested: ["solicitud pendiente", "pending request"],
  setup: ["armando el escrow", "setting up the escrow"],
  awaiting_deposit: ["esperando el depósito", "waiting for the deposit"],
  confirming: ["depósito confirmándose", "deposit confirming"],
  awaiting_payment: ["esperando el pago", "waiting for the payment"],
  paid: ["pago marcado: revisar y liberar", "marked as paid: check and release"],
  releasing: ["liberando el XMR", "releasing the XMR"],
  refunding: ["reembolsando", "refunding"],
  disputed: ["en apelación", "under appeal"],
  resolving: ["soporte resolviendo", "support resolving"],
};

/** /ordenes: tus órdenes abiertas (solo estado y si compras o vendes, sin montos). */
async function openOrders(env: P2PEnv, chat: string, guess: Lang) {
  const link = await env.DB.prepare("SELECT user_id, lang FROM p2p_telegram WHERE chat_id = ?").bind(chat).first<{ user_id: string; lang: Lang }>();
  if (!link) return send(env, chat, HELP[guess], [[{ text: MARKET[guess], web_app: { url: miniUrl(env, guess) } }]]);
  const lang: Lang = link.lang === "en" ? "en" : "es";
  const rows = await env.DB.prepare(
    `SELECT id, status, buyer FROM p2p_orders WHERE (buyer = ? OR seller = ?) AND status NOT IN (${FINAL.map(() => "?").join(", ")}) ORDER BY created_at DESC LIMIT 8`,
  )
    .bind(link.user_id, link.user_id, ...FINAL)
    .all<{ id: string; status: string; buyer: string }>();
  if (!rows.results.length) return send(env, chat, lang === "es" ? "No tienes órdenes abiertas." : "You have no open orders.", [[{ text: MARKET[lang], web_app: { url: miniUrl(env, lang) } }]]);
  const lines = rows.results.map((o) => {
    const side = o.buyer === link.user_id ? (lang === "es" ? "Compras" : "Buying") : lang === "es" ? "Vendes" : "Selling";
    const st = STATUS[o.status]?.[lang === "es" ? 0 : 1] ?? o.status;
    return `• ${o.id.slice(0, 8)} · ${side} · ${st}`;
  });
  return send(
    env,
    chat,
    (lang === "es" ? "Tus órdenes abiertas:\n" : "Your open orders:\n") + lines.join("\n"),
    rows.results.map((o) => [openBtn(env, lang, o.id, `${OPEN[lang]} ${o.id.slice(0, 8)}`)]),
  );
}

async function onCallback(env: P2PEnv, q: NonNullable<Update["callback_query"]>) {
  const chat = typeof q.message?.chat?.id === "number" ? String(q.message.chat.id) : "";
  if (chat && q.data?.startsWith("al:")) return alertsCallback(env, chat, (q.from?.language_code ?? "").startsWith("es") ? "es" : "en", q.data, q);
  const m = /^([ad]):([0-9a-f]{32})$/.exec(q.data ?? "");
  const answer = (text: string) => tg(env, "answerCallbackQuery", { callback_query_id: q.id, text, show_alert: true });
  const link = chat ? await env.DB.prepare("SELECT user_id, lang FROM p2p_telegram WHERE chat_id = ?").bind(chat).first<{ user_id: string; lang: Lang }>() : null;
  const lang: Lang = link?.lang === "en" ? "en" : "es";
  const t = (es: string, en: string) => (lang === "es" ? es : en);
  if (!m || !link) return answer(t("Este chat no está conectado a una cuenta.", "This chat is not connected to an account."));
  const user = await getUser(env, link.user_id);
  if (!user || user.banned) return answer(t("Tu cuenta está suspendida.", "Your account is suspended."));
  let o;
  try {
    o = await getOrder(env, m[2]!);
  } catch {
    return answer(t("La orden no existe.", "The order does not exist."));
  }
  if (o.maker !== user.id) return answer(t("Solo el anunciante responde la solicitud.", "Only the advertiser can reply to the request."));
  if (o.status !== "requested") return answer(t("Esta solicitud ya no está pendiente.", "This request is no longer pending."));
  const accept = m[1] === "a";
  try {
    if (accept) await acceptRequest(env, o, now());
    else await declineRequest(env, o, now());
  } catch (e) {
    return answer(e instanceof HttpError ? e.message : t("No se pudo, inténtalo en la web.", "It failed, try on the web."));
  }
  await answer(accept ? t("Aceptada.", "Accepted.") : t("Rechazada.", "Declined."));
  if (q.message?.message_id)
    await tg(env, "editMessageText", {
      chat_id: chat,
      message_id: q.message.message_id,
      text: accept
        ? t("✅ Aceptaste la solicitud. Abre la orden (aquí mismo en Telegram) en los próximos 60 min para armar el escrow.", "✅ You accepted the request. Open the order (right here in Telegram) within 60 min to set up the escrow.")
        : t("✖ Rechazaste la solicitud.", "✖ You declined the request."),
      reply_markup: { inline_keyboard: [[openBtn(env, lang, o.id)]] },
    });
}

// ---------------------------------------------------------------- registro del webhook

async function botName(env: P2PEnv): Promise<string | null> {
  const r = await env.DB.prepare("SELECT value FROM p2p_settings WHERE key = 'telegram_bot'").first<{ value: string }>();
  return r?.value || null;
}

export const telegramBot = (env: P2PEnv) => (enabled(env) ? botName(env).catch(() => null) : Promise.resolve(null));

/**
 * Registra el webhook en Telegram (desde la tarea programada). Solo llama a la API si cambió el token,
 * el secreto o la URL; guarda el usuario del bot para armar los enlaces t.me.
 */
export async function setupWebhook(env: P2PEnv): Promise<void> {
  if (!enabled(env)) return;
  const url = `${site(env)}/v1/p2p/telegram/webhook`;
  // «v3» cambia cuando cambia lo que se registra (comandos, botón de menú): así se vuelve a registrar.
  const sig = (await sha256Hex(`v3|${env.P2P_TELEGRAM_TOKEN}|${env.P2P_TELEGRAM_WEBHOOK_SECRET}|${url}`)).slice(0, 32);
  const cur = await env.DB.prepare("SELECT value FROM p2p_settings WHERE key = 'telegram_hook'").first<{ value: string }>();
  if (cur?.value === sig) return;
  const me = await tg(env, "getMe", {});
  const hook = await tg(env, "setWebhook", {
    url,
    secret_token: env.P2P_TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const name = typeof me.result?.username === "string" ? me.result.username : "";
  if (!me.ok || !hook.ok || !name) return console.log("telegram: no se pudo registrar el webhook", me.status, hook.status);
  await env.DB.batch([
    env.DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_bot', ?)").bind(name),
    env.DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_hook', ?)").bind(sig),
  ]);
  await tg(env, "setMyCommands", {
    commands: [
      { command: "alertas", description: "Alertas de anuncios nuevos / New ad alerts" },
      { command: "ordenes", description: "Mis órdenes abiertas / My open orders" },
      { command: "help", description: "Qué hace este bot / What this bot does" },
      { command: "stop", description: "Apagar avisos y alertas / Turn notifications and alerts off" },
    ],
  });
  // Botón de menú junto al campo de texto: abre el mercado como Mini App.
  await tg(env, "setChatMenuButton", { menu_button: { type: "web_app", text: "P2P", web_app: { url: miniUrl(env, "es") } } });
  console.log("telegram: webhook registrado para @" + name);
}
