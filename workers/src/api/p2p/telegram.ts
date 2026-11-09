/**
 * Avisos de P2P Fiat por Telegram (opcionales).
 *
 * Cada usuario puede ligar su cuenta P2P a un chat privado con el bot: solo se guarda el chat_id y el
 * idioma. Los mensajes a usuarios llevan el evento y un enlace a la orden, nunca montos, apodos ni datos
 * de pago. El administrador recibe además avisos con detalle (apelaciones, anuncios, usuarios nuevos y
 * órdenes completadas), que son datos que ya ve en su panel.
 *
 * Desde Telegram solo se puede aceptar o rechazar una solicitud: el escrow siempre se arma en la web.
 */
import { HttpError, json, randomId, readJson, sha256Hex } from "../env";
import { activeUser, getUser, now, signer, type P2PEnv } from "./common";
import { acceptRequest, declineRequest, getOrder } from "./orders";

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
  funded: { es: () => "🔒 El XMR está en el escrow: ya puedes pagar.", en: () => "🔒 The XMR is in escrow: you can pay now." },
  paid: {
    es: () => "💸 El comprador marcó «Ya pagué». Revisa TU cuenta y libera solo si recibiste el dinero.",
    en: () => "💸 The buyer marked “I have paid”. Check YOUR account and release only if you received the money.",
  },
  releasing: { es: () => "🚀 El vendedor liberó: el XMR va en camino.", en: () => "🚀 The seller released: the XMR is on its way." },
  dispute: { es: () => "⚖️ Abrieron una apelación en tu orden. Soporte revisará el chat.", en: () => "⚖️ An appeal was opened on your order. Support will review the chat." },
  resolved: { es: () => "⚖️ Soporte resolvió la apelación de tu orden.", en: () => "⚖️ Support resolved the appeal on your order." },
  released: { es: () => "✅ Orden completada.", en: () => "✅ Order completed." },
  refunded: { es: () => "↩️ Orden reembolsada al vendedor.", en: () => "↩️ Order refunded to the seller." },
  timeout: { es: () => "⌛ Se acabó el tiempo de un paso de la orden.", en: () => "⌛ Time ran out on an order step." },
};

const OPEN: Record<Lang, string> = { es: "Abrir orden", en: "Open order" };

const site = (env: P2PEnv) => (env.API_URL || "https://fiat.monerop2p.app").replace(/\/$/, "");
const orderUrl = (env: P2PEnv, lang: Lang, id: string) => `${site(env)}/${lang}/app/#/orden/${id}`;
const enabled = (env: P2PEnv) => !!env.P2P_TELEGRAM_TOKEN && !!env.P2P_TELEGRAM_WEBHOOK_SECRET;

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

/** Manda un mensaje; si el usuario bloqueó el bot (403) o el chat ya no existe, borra el vínculo. */
async function send(env: P2PEnv, chatId: string, text: string, keyboard?: unknown[][]) {
  const r = await tg(env, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
  if (r.status === 403) await env.DB.prepare("DELETE FROM p2p_telegram WHERE chat_id = ?").bind(chatId).run();
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
      const kb: unknown[][] = [[{ text: OPEN[lang], url: orderUrl(env, lang, ev.orderId) }]];
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
    await send(env, row.chat_id, `🛡 ${text}`.slice(0, 4000), orderId ? [[{ text: "Admin", url: `${site(env)}/${lang}/app/#/admin/${orderId}` }]] : undefined);
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
  es: "Este bot solo manda avisos de tus órdenes de MoneroP2P Fiat y te deja aceptar o rechazar solicitudes. Nunca te pedirá pagos, contraseñas ni datos de pago. Para conectarlo, entra a fiat.monerop2p.app → Cuenta → Conectar Telegram. /stop lo desconecta.",
  en: "This bot only sends notifications about your MoneroP2P Fiat orders and lets you accept or decline requests. It will never ask you for payments, passwords or payment details. To connect it, go to fiat.monerop2p.app → Account → Connect Telegram. /stop disconnects it.",
};

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
  if (/^\/stop\b/.test(text)) {
    const r = await env.DB.prepare("DELETE FROM p2p_telegram WHERE chat_id = ?").bind(chat).run();
    return send(env, chat, r.meta.changes ? (guess === "es" ? "Desconectado. Ya no recibirás avisos aquí." : "Disconnected. You will no longer get notifications here.") : HELP[guess]);
  }
  return send(env, chat, HELP[guess]);
}

async function onCallback(env: P2PEnv, q: NonNullable<Update["callback_query"]>) {
  const chat = typeof q.message?.chat?.id === "number" ? String(q.message.chat.id) : "";
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
        ? t("✅ Aceptaste la solicitud. Abre la orden en los próximos 60 min para armar el escrow.", "✅ You accepted the request. Open the order within 60 min to set up the escrow.")
        : t("✖ Rechazaste la solicitud.", "✖ You declined the request."),
      reply_markup: { inline_keyboard: [[{ text: OPEN[lang], url: orderUrl(env, lang, o.id) }]] },
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
  const sig = (await sha256Hex(`${env.P2P_TELEGRAM_TOKEN}|${env.P2P_TELEGRAM_WEBHOOK_SECRET}|${url}`)).slice(0, 32);
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
      { command: "help", description: "Qué hace este bot / What this bot does" },
      { command: "stop", description: "Desconectar avisos / Disconnect notifications" },
    ],
  });
  console.log("telegram: webhook registrado para @" + name);
}
