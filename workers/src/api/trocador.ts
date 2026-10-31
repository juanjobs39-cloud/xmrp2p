/**
 * Intercambios instantáneos vía la API de Trocador (USDT en Arbitrum → XMR), como alternativa
 * cuando ningún maker de MoneroP2P cubre el monto.
 *
 * Acuerdo con Trocador:
 *  - Pocas peticiones: cotizar solo cuando el usuario lo pide, con caché de 2 minutos por monto,
 *    sin refresco automático; el estado llega por webhook, no por consultas repetidas.
 *  - Conservación de datos: como las peticiones salen de nuestro servidor, guardamos la IP, el idioma
 *    y el navegador del usuario ligados al ID del intercambio (solo en intercambios por Trocador),
 *    para responder solicitudes de autoridades que Trocador nos reenvíe. Lo dice la política de privacidad.
 */
import { clientIp, decimal, Env, HttpError, json, readJson, sha256Hex } from "./env";

const API = "https://api.trocador.app";
/** Siempre se recibe XMR. */
const TO = { ticker_to: "xmr", network_to: "Mainnet" } as const;

/** Moneda que acepta Trocador (de su método coins). */
export interface CoinInfo {
  ticker: string;
  network: string;
  name: string;
  memo: boolean;
  min: number;
  max: number;
  /** URL del ícono (se sirve a través de /v1/trocador/img para no exponer al usuario a terceros). */
  img: string;
}

const COINS_KEY = "https://cache.monerop2p.internal/trocador/coins-v2";
const COINS_CACHE_S = 86_400;

/** Lista completa de monedas de Trocador, pedida como mucho una vez al día (caché de Cloudflare). */
export async function coinList(env: Env): Promise<CoinInfo[]> {
  const cache = caches.default;
  const hit = await cache.match(COINS_KEY);
  if (hit) return (await hit.json()) as CoinInfo[];
  const raw = (await trocador(env, "coins", {})) as unknown;
  if (!Array.isArray(raw)) throw new HttpError(502, "Trocador no devolvió la lista de monedas");
  const list: CoinInfo[] = [];
  for (const c of raw as Record<string, unknown>[]) {
    if (typeof c.ticker !== "string" || typeof c.network !== "string" || c.ticker === "xmr") continue;
    list.push({
      ticker: c.ticker.slice(0, 20),
      network: c.network.slice(0, 40),
      name: String(c.name ?? c.ticker).slice(0, 80),
      memo: c.memo === true,
      min: Number(c.minimum) || 0,
      max: Number(c.maximum) || 0,
      img: typeof c.image === "string" && imgAllowed(c.image) ? c.image : "",
    });
  }
  await cache.put(COINS_KEY, json(list, 200, { "cache-control": `public, max-age=${COINS_CACHE_S}` }));
  return list;
}

/** Moneda pedida; sin moneda, USDT en Arbitrum (lo de siempre, sin consultar la lista). */
async function coinFrom(env: Env, ticker: unknown, network: unknown): Promise<{ ticker: string; network: string }> {
  const t = typeof ticker === "string" && ticker ? ticker : "usdt";
  const n = typeof network === "string" && network ? network : "Arbitrum";
  if (t === "usdt" && n === "Arbitrum") return { ticker: t, network: n };
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(t) || !/^[A-Za-z0-9 ._()-]{1,40}$/.test(n)) throw new HttpError(400, "moneda no disponible");
  const c = (await coinList(env)).find((x) => x.ticker === t && x.network === n);
  if (!c) throw new HttpError(400, "moneda no disponible");
  return { ticker: c.ticker, network: c.network };
}

const RATE_CACHE_S = 120;
/** Cada cuánto, como mucho, se pregunta el estado a Trocador si el webhook no ha llegado. */
const STATUS_FALLBACK_MS = 10 * 60_000;
const FINAL = new Set(["finished", "failed", "refunded", "expired", "halted", "paid partially"]);

export interface TrocadorQuote {
  provider: string;
  /** URL del logo del exchange (se muestra a través de /v1/trocador/img). */
  logo?: string;
  amount_to: string;
  kycrating: string;
  fixed: boolean;
  spread?: string;
  eta?: number;
}

export interface TrocadorRates {
  rate_id: string;
  /** Monto enviado (se llama usdt por compatibilidad; puede ser de cualquier moneda). */
  usdt: string;
  ticker: string;
  network: string;
  quotes: TrocadorQuote[];
  created_at: number;
}

const truthy = (v: unknown): boolean => v === true || String(v).toLowerCase() === "true";

/** Normaliza la lista de cotizaciones de new_rate (puede venir como arreglo o como {quotes: [...]}). */
export function parseQuotes(raw: unknown): TrocadorQuote[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { quotes?: unknown }).quotes) ? (raw as { quotes: unknown[] }).quotes : [];
  const out: TrocadorQuote[] = [];
  for (const q of list) {
    if (!q || typeof q !== "object") continue;
    const o = q as Record<string, unknown>;
    const amount = Number(o.amount_to);
    if (typeof o.provider !== "string" || !(amount > 0)) continue;
    out.push({
      provider: o.provider,
      amount_to: String(o.amount_to),
      kycrating: typeof o.kycrating === "string" ? o.kycrating : "?",
      fixed: truthy(o.fixed),
      ...(o.waste !== undefined ? { spread: String(o.waste) } : {}),
      ...(typeof o.eta === "number" ? { eta: o.eta } : {}),
      ...(typeof o.provider_logo === "string" && imgAllowed(o.provider_logo) ? { logo: o.provider_logo } : {}),
    });
  }
  return out.sort((a, b) => Number(b.amount_to) - Number(a.amount_to));
}

function apiKey(env: Env): string {
  if (!env.TROCADOR_API_KEY) throw new HttpError(503, "los intercambios por Trocador no están activos");
  return env.TROCADOR_API_KEY;
}

async function trocador(env: Env, method: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`${API}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let r: Response;
  try {
    r = await fetch(url, { headers: { "API-Key": apiKey(env) }, signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new HttpError(502, "Trocador no respondió; intenta de nuevo");
  }
  const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || typeof body.error === "string") {
    console.warn("trocador", method, r.status, JSON.stringify(body).slice(0, 300));
    throw new HttpError(502, typeof body.error === "string" ? `Trocador: ${body.error}` : `Trocador respondió ${r.status}`);
  }
  return body;
}

async function limitTrocador(env: Env, req: Request): Promise<void> {
  if (!env.TROCADOR_LIMITER) return;
  const { success } = await env.TROCADOR_LIMITER.limit({ key: clientIp(req) });
  if (!success) throw new HttpError(429, "demasiadas consultas a Trocador; espera un minuto");
}

/** GET /v1/trocador/rates?usdt=50 — una consulta a Trocador por monto cada 2 minutos como mucho. */
async function rates(req: Request, env: Env, url: URL): Promise<Response> {
  const sp = url.searchParams;
  const usdt = decimal(sp.get("amount") ?? sp.get("usdt"), "amount");
  if (Number(usdt) > 100_000_000) throw new HttpError(400, "amount inválido");
  const coin = await coinFrom(env, sp.get("ticker"), sp.get("network"));
  apiKey(env);
  const cache = caches.default;
  // Caché por usuario y monto: el ID de cotización no se comparte entre personas.
  const who = (await sha256Hex(clientIp(req))).slice(0, 16);
  const key = new Request(`https://cache.monerop2p.internal/trocador/rates?c=${coin.ticker}.${coin.network}&a=${Number(usdt)}&u=${who}`);
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, hit);
  await limitTrocador(env, req);
  const body = await trocador(env, "new_rate", {
    ticker_from: coin.ticker,
    network_from: coin.network,
    ...TO,
    amount_from: usdt,
    min_kycrating: env.TROCADOR_MIN_KYC || "B",
    markup: env.TROCADOR_MARKUP || "0",
  });
  const out: TrocadorRates = {
    rate_id: String(body.trade_id ?? ""),
    usdt,
    ticker: coin.ticker,
    network: coin.network,
    quotes: parseQuotes(body.quotes),
    created_at: Date.now(),
  };
  if (!out.rate_id) throw new HttpError(502, "Trocador no devolvió cotizaciones");
  const res = json(out, 200, { "cache-control": `public, max-age=${RATE_CACHE_S}` });
  await cache.put(key, res.clone());
  return res;
}

interface TradeBody {
  rate_id?: unknown;
  provider?: unknown;
  fixed?: unknown;
  usdt?: unknown;
  amount?: unknown;
  ticker?: unknown;
  network?: unknown;
  address?: unknown;
  refund?: unknown;
}

const XMR_MAIN = /^[48][1-9A-HJ-NP-Za-km-z]{94}([1-9A-HJ-NP-Za-km-z]{11})?$/;
const EVM = /^0x[0-9a-fA-F]{40}$/;
const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");

/** Datos públicos de un intercambio (nunca la IP ni el navegador). */
function publicTrade(t: Record<string, unknown>) {
  return {
    trade_id: String(t.trade_id ?? ""),
    ticker_from: str(t.ticker_from),
    network_from: str(t.network_from),
    provider: str(t.provider),
    status: str(t.status) || "new",
    amount_from: str(t.amount_from),
    amount_to: str(t.amount_to),
    address_provider: str(t.address_provider),
    address_provider_memo: str(t.address_provider_memo),
    id_provider: str(t.id_provider),
    password: str(t.password),
    fixed: truthy(t.fixed),
  };
}

/** POST /v1/trocador/trades — crea el intercambio con la cotización elegida y guarda los datos del usuario. */
async function createTrade(req: Request, env: Env): Promise<Response> {
  const { data } = await readJson<TradeBody>(req);
  const rateId = str(data.rate_id, 100);
  const provider = str(data.provider, 100);
  const address = str(data.address, 120).trim();
  const refund = str(data.refund, 130).trim();
  const usdt = decimal(data.amount ?? data.usdt, "amount");
  const coin = await coinFrom(env, data.ticker, data.network);
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(rateId)) throw new HttpError(400, "rate_id inválido");
  if (!/^[\w .()-]{1,60}$/.test(provider)) throw new HttpError(400, "provider inválido");
  if (!XMR_MAIN.test(address)) throw new HttpError(400, "dirección de Monero inválida");
  if (refund && (refund.startsWith("0x") ? !EVM.test(refund) : !/^[A-Za-z0-9:_.-]{10,128}$/.test(refund))) throw new HttpError(400, "dirección de reembolso inválida");
  await limitTrocador(env, req);

  const site = env.API_URL || "https://api.monerop2p.app";
  const params: Record<string, string> = {
    id: rateId,
    ticker_from: coin.ticker,
    network_from: coin.network,
    ...TO,
    amount_from: usdt,
    address,
    address_memo: "0",
    provider,
    fixed: truthy(data.fixed) ? "True" : "False",
    min_kycrating: env.TROCADOR_MIN_KYC || "B",
    markup: env.TROCADOR_MARKUP || "0",
  };
  if (refund) Object.assign(params, { refund, refund_memo: "0" });
  if (env.TROCADOR_WEBHOOK_KEY) Object.assign(params, { webhook: `${site}/v1/trocador/webhook`, webhook_key: env.TROCADOR_WEBHOOK_KEY });
  const body = await trocador(env, "new_trade", params);
  const trade = publicTrade(body);
  if (!trade.trade_id || !trade.address_provider) throw new HttpError(502, "Trocador no devolvió la dirección de depósito");

  // Conservación exigida por los proveedores de Trocador (ver la política de privacidad).
  const cf = (req as Request & { cf?: { country?: string } }).cf;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO trocador_trades
       (trade_id, created_at, updated_at, ip, country, lang, user_agent, provider, amount_from, amount_to, status, data)
     VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
  )
    .bind(
      trade.trade_id,
      now,
      clientIp(req),
      cf?.country ?? null,
      (req.headers.get("accept-language") ?? "").slice(0, 200),
      (req.headers.get("user-agent") ?? "").slice(0, 500),
      trade.provider,
      trade.amount_from,
      trade.amount_to,
      trade.status,
      JSON.stringify(trade),
    )
    .run();
  return json(trade);
}

/** GET /v1/trocador/trades/:id — estado desde nuestra base (lo actualiza el webhook). */
async function getTrade(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT status, updated_at, data FROM trocador_trades WHERE trade_id = ?1")
    .bind(id)
    .first<{ status: string; updated_at: number; data: string }>();
  if (!row) throw new HttpError(404, "intercambio no encontrado");
  let trade = JSON.parse(row.data) as ReturnType<typeof publicTrade>;
  // Respaldo por si el webhook no llega: como mucho una consulta a Trocador cada 10 minutos.
  if (!FINAL.has(row.status) && Date.now() - row.updated_at > STATUS_FALLBACK_MS && env.TROCADOR_API_KEY) {
    await env.DB.prepare("UPDATE trocador_trades SET updated_at = ?2 WHERE trade_id = ?1").bind(id, Date.now()).run();
    try {
      const body = await trocador(env, "trade", { id });
      trade = await saveStatus(env, Array.isArray(body) ? (body[0] as Record<string, unknown>) : body, trade);
    } catch (e) {
      console.warn("trocador status", id, String(e));
    }
  }
  return json(trade);
}

async function saveStatus(env: Env, body: Record<string, unknown>, prev?: ReturnType<typeof publicTrade>) {
  const next = publicTrade(body);
  const merged = { ...prev, ...Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "" && v !== false)) } as ReturnType<typeof publicTrade>;
  await env.DB.prepare("UPDATE trocador_trades SET status = ?2, updated_at = ?3, amount_to = ?4, data = ?5 WHERE trade_id = ?1")
    .bind(merged.trade_id, merged.status, Date.now(), merged.amount_to, JSON.stringify(merged))
    .run();
  return merged;
}

function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** POST /v1/trocador/webhook — Trocador avisa cada cambio de estado (cabecera Webhook-Key). */
async function webhook(req: Request, env: Env): Promise<Response> {
  const key = req.headers.get("webhook-key") ?? "";
  if (!env.TROCADOR_WEBHOOK_KEY || !sameKey(key, env.TROCADOR_WEBHOOK_KEY)) throw new HttpError(401, "webhook no autorizado");
  const { data } = await readJson<Record<string, unknown>>(req);
  const id = String(data.trade_id ?? "");
  const row = await env.DB.prepare("SELECT data FROM trocador_trades WHERE trade_id = ?1").bind(id).first<{ data: string }>();
  if (!row) return json({ ok: true, ignored: true });
  await saveStatus(env, data, JSON.parse(row.data));
  return json({ ok: true });
}

/** Sitios de los que Trocador toma íconos y logos. Solo estos se sirven a través de nuestra API. */
const IMG_HOSTS = new Set(["trocador.app", "static.coinpaprika.com", "content-api.changenow.io", "images.letsexchange.io", "exolix.com"]);
const IMG_MAX = 300 * 1024;

export function imgAllowed(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && IMG_HOSTS.has(url.hostname) && u.length <= 400 && /\.(svg|png|jpe?g|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * GET /v1/trocador/img?u=<url> — ícono o logo de un sitio permitido, guardado 30 días en la caché.
 * Así el navegador del usuario solo habla con nuestra API, nunca con esos sitios.
 */
async function img(url: URL): Promise<Response> {
  const u = url.searchParams.get("u") ?? "";
  if (!imgAllowed(u)) throw new HttpError(400, "imagen no permitida");
  const cache = caches.default;
  const key = new Request(`https://cache.monerop2p.internal/trocador/img?u=${encodeURIComponent(u)}`);
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, hit);
  let r: Response;
  try {
    r = await fetch(u, { signal: AbortSignal.timeout(10_000), redirect: "manual" });
  } catch {
    throw new HttpError(502, "no se pudo descargar la imagen");
  }
  const type = (r.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  // Workers no admite redirect: "error"; con "manual" una redirección llega como 3xx y se rechaza aquí.
  if (!r.ok || !/^image\/(svg\+xml|png|jpeg|webp)$/.test(type)) throw new HttpError(502, "la imagen no es válida");
  const body = await r.arrayBuffer();
  if (body.byteLength > IMG_MAX) throw new HttpError(502, "imagen demasiado grande");
  const res = new Response(body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=2592000, immutable",
      // Un SVG abierto directamente no puede ejecutar nada en nuestro dominio.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
  await cache.put(key, res.clone());
  return res;
}

/** Rutas de Trocador. El webhook va aparte porque no pasa por el límite por IP ni el bloqueo por región. */
export async function handleTrocador(req: Request, env: Env, url: URL): Promise<Response | null> {
  const p = url.pathname;
  if (p === "/v1/trocador/img" && req.method === "GET") return img(url);
  if (p === "/v1/trocador/coins" && req.method === "GET") {
    apiKey(env);
    return json(await coinList(env), 200, { "cache-control": "public, max-age=3600" });
  }
  if (p === "/v1/trocador/rates" && req.method === "GET") return rates(req, env, url);
  if (p === "/v1/trocador/trades" && req.method === "POST") return createTrade(req, env);
  const m = /^\/v1\/trocador\/trades\/([A-Za-z0-9_-]{2,100})$/.exec(p);
  if (m && req.method === "GET") return getTrade(env, m[1]!);
  return null;
}

export function isTrocadorWebhook(req: Request, url: URL): boolean {
  return url.pathname === "/v1/trocador/webhook" && req.method === "POST";
}
export { webhook as trocadorWebhook };

/** Borrado automático si se configura TROCADOR_RETENTION_DAYS (vacío = se conservan, como pide Trocador). */
export async function purgeTrocador(env: Env): Promise<number> {
  const days = Number(env.TROCADOR_RETENTION_DAYS || "0");
  if (!(days > 0)) return 0;
  const r = await env.DB.prepare("DELETE FROM trocador_trades WHERE created_at < ?1").bind(Date.now() - days * 86_400_000).run();
  return r.meta.changes ?? 0;
}
