import { HttpError, json, randomId, readJson } from "../env";
import { normalizeMethod, requireCountry, requireFiat, xmrPrice, type Method } from "./catalog";
import { activeUser, fiatAmount, fromPico, getUser, isOnline, now, publicUser, requireXmrAddress, settings, STALE_REQUEST_SECS, STALE_SECS, signer, text, toPico, type P2PEnv } from "./common";

const MAX_ACTIVE_ADS = 10;

/** Plazos permitidos para responder solicitudes (horas). */
export const REQUEST_WINDOWS = [1, 3, 6, 12];

export interface Ad {
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
  remaining_pico: string;
  methods: string;
  pay_window_min: number;
  terms: string;
  min_orders_reversible: number;
  xmr_address: string;
  status: "active" | "paused" | "closed" | "hidden";
  paused_reason?: string | null;
  /** Horas para responder una solicitud con el anunciante fuera de línea (null: no acepta). */
  request_window_h?: number | null;
  created_at: number;
  updated_at: number;
}

// ---------- Perfil ----------

/** PUT /v1/p2p/me — crea o actualiza el perfil (apodo y llave pública de cifrado). */
export async function putMe(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const id = await signer(req, env, path, raw);
  const nickname = text(data.nickname, "nickname", 20, 3);
  if (!/^[A-Za-z0-9_.-]+$/.test(nickname)) throw new HttpError(400, "nickname: solo letras, números, punto, guion y guion bajo");
  const enc = typeof data.enc_pubkey === "string" ? data.enc_pubkey.toLowerCase() : "";
  if (!/^0[23][0-9a-f]{64}$/.test(enc)) throw new HttpError(400, "enc_pubkey inválida (secp256k1 comprimida, hex)");
  const existing = await getUser(env, id);
  if (existing?.banned) throw new HttpError(403, "tu cuenta está suspendida");
  try {
    if (existing) {
      await env.DB.prepare("UPDATE p2p_users SET nickname = ?, enc_pubkey = ?, last_seen = ? WHERE id = ?").bind(nickname, enc, now(), id).run();
    } else {
      await env.DB.prepare("INSERT INTO p2p_users (id, nickname, enc_pubkey, created_at, last_seen) VALUES (?, ?, ?, ?, ?)")
        .bind(id, nickname, enc, now(), now())
        .run();
    }
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new HttpError(409, "ese apodo ya está en uso");
    throw e;
  }
  return json(publicUser((await getUser(env, id))!), existing ? 200 : 201);
}

export async function getMe(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const id = await signer(req, env, path, "");
  const u = await getUser(env, id);
  if (!u) throw new HttpError(404, "sin perfil");
  return json(publicUser(u));
}

export async function getProfile(env: P2PEnv, id: string): Promise<Response> {
  const u = await getUser(env, id.toLowerCase());
  if (!u) throw new HttpError(404, "usuario no encontrado");
  const fb = await env.DB.prepare("SELECT positive, comment, created_at FROM p2p_feedback WHERE to_user = ? ORDER BY created_at DESC LIMIT 20")
    .bind(u.id)
    .all();
  return json({ ...publicUser(u), feedback: fb.results });
}

// ---------- Anuncios ----------

function validateAd(env: P2PEnv, d: Record<string, unknown>, blocked: string[]) {
  const side = d.side;
  if (side !== "sell" && side !== "buy") throw new HttpError(400, "side debe ser sell o buy");
  const fiat = requireFiat(d.fiat);
  const country = requireCountry(d.country);
  const price_type = d.price_type;
  let price: string | null = null;
  let margin_pct: number | null = null;
  if (price_type === "fixed") price = fiatAmount(d.price, "price");
  else if (price_type === "float") {
    margin_pct = Number(d.margin_pct);
    if (!Number.isFinite(margin_pct) || margin_pct < -20 || margin_pct > 20) throw new HttpError(400, "margin_pct debe estar entre -20 y 20");
    margin_pct = Math.round(margin_pct * 100) / 100;
  } else throw new HttpError(400, "price_type debe ser fixed o float");
  const min_fiat = fiatAmount(d.min_fiat, "min_fiat");
  const max_fiat = fiatAmount(d.max_fiat, "max_fiat");
  if (Number(min_fiat) > Number(max_fiat)) throw new HttpError(400, "min_fiat no puede ser mayor que max_fiat");
  if (typeof d.amount_xmr !== "string" || !/^\d{1,6}(\.\d{1,12})?$/.test(d.amount_xmr) || toPico(d.amount_xmr) <= 0n)
    throw new HttpError(400, "amount_xmr inválido");
  const remaining_pico = toPico(d.amount_xmr).toString();
  if (!Array.isArray(d.methods) || d.methods.length < 1 || d.methods.length > 5) throw new HttpError(400, "indica de 1 a 5 métodos de pago");
  const methods: Method[] = d.methods.map((x) => normalizeMethod(x, blocked));
  const pay_window_min = Number(d.pay_window_min ?? 30);
  if (!Number.isInteger(pay_window_min) || pay_window_min < 15 || pay_window_min > 120) throw new HttpError(400, "pay_window_min debe estar entre 15 y 120");
  const terms = text(d.terms, "terms", 1000);
  const min_orders_reversible = Number(d.min_orders_reversible ?? 0);
  if (!Number.isInteger(min_orders_reversible) || min_orders_reversible < 0 || min_orders_reversible > 1000)
    throw new HttpError(400, "min_orders_reversible inválido");
  const xmr_address = requireXmrAddress(env, d.xmr_address, "xmr_address");
  const rw = d.request_window_h;
  const request_window_h = rw === undefined || rw === null || rw === 0 ? null : Number(rw);
  if (request_window_h !== null && !REQUEST_WINDOWS.includes(request_window_h))
    throw new HttpError(400, `request_window_h debe ser ${REQUEST_WINDOWS.join(", ")} o null`);
  return { side, fiat, country, price_type, price, margin_pct, min_fiat, max_fiat, remaining_pico, methods, pay_window_min, terms, min_orders_reversible, xmr_address, request_window_h };
}

/** Precio efectivo (fiat por XMR) de un anuncio: el fijo, o el de mercado con el margen. */
export function adPrice(ad: Pick<Ad, "price_type" | "price" | "margin_pct">, market: number | null): number | null {
  if (ad.price_type === "fixed") return Number(ad.price);
  if (market === null) return null;
  return Math.round(market * (1 + (ad.margin_pct ?? 0) / 100) * 100) / 100;
}

export function publicAd(ad: Ad, market: number | null) {
  return {
    id: ad.id,
    user_id: ad.user_id,
    side: ad.side,
    fiat: ad.fiat,
    country: ad.country,
    price_type: ad.price_type,
    margin_pct: ad.margin_pct,
    price: adPrice(ad, market),
    min_fiat: ad.min_fiat,
    max_fiat: ad.max_fiat,
    available_xmr: fromPico(ad.remaining_pico),
    methods: JSON.parse(ad.methods) as Method[],
    pay_window_min: ad.pay_window_min,
    terms: ad.terms,
    min_orders_reversible: ad.min_orders_reversible,
    status: ad.status,
    paused_reason: ad.paused_reason ?? null,
    request_window_h: ad.request_window_h ?? null,
    updated_at: ad.updated_at,
  };
}

async function market(fiat: string): Promise<number | null> {
  try {
    return (await xmrPrice(fiat)).price;
  } catch {
    return null;
  }
}

export async function getAd(env: P2PEnv, id: string): Promise<Ad> {
  const ad = await env.DB.prepare("SELECT * FROM p2p_ads WHERE id = ?").bind(id).first<Ad>();
  if (!ad) throw new HttpError(404, "anuncio no encontrado");
  return ad;
}

/** POST /v1/p2p/ads */
export async function createAd(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const id = await signer(req, env, path, raw);
  await activeUser(env, id);
  const s = await settings(env);
  const v = validateAd(env, data, JSON.parse(s.blocked_methods ?? "[]"));
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM p2p_ads WHERE user_id = ? AND status IN ('active', 'paused')").bind(id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_ACTIVE_ADS) throw new HttpError(400, `máximo ${MAX_ACTIVE_ADS} anuncios activos o en pausa`);
  const ad: Ad = { id: randomId(), user_id: id, ...v, methods: JSON.stringify(v.methods), status: "active", created_at: now(), updated_at: now() } as Ad;
  await env.DB.prepare(
    "INSERT INTO p2p_ads (id, user_id, side, fiat, country, price_type, price, margin_pct, min_fiat, max_fiat, remaining_pico, methods, pay_window_min, terms, min_orders_reversible, xmr_address, request_window_h, status, created_at, updated_at)" +
      " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(ad.id, ad.user_id, ad.side, ad.fiat, ad.country, ad.price_type, ad.price, ad.margin_pct, ad.min_fiat, ad.max_fiat, ad.remaining_pico, ad.methods, ad.pay_window_min, ad.terms, ad.min_orders_reversible, ad.xmr_address, ad.request_window_h, ad.status, ad.created_at, ad.updated_at)
    .run();
  return json(publicAd(ad, await market(ad.fiat)), 201);
}

/** PATCH /v1/p2p/ads/:id — cambia campos o el estado (active, paused, closed). */
export async function updateAd(req: Request, env: P2PEnv, path: string, adId: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const id = await signer(req, env, path, raw);
  await activeUser(env, id);
  const ad = await getAd(env, adId);
  if (ad.user_id !== id) throw new HttpError(403, "no es tu anuncio");
  if (ad.status === "closed" || ad.status === "hidden") throw new HttpError(409, `el anuncio está ${ad.status === "closed" ? "cerrado" : "oculto por el administrador"}`);
  const status = data.status ?? ad.status;
  if (!["active", "paused", "closed"].includes(status as string)) throw new HttpError(400, "status debe ser active, paused o closed");
  const s = await settings(env);
  const merged = {
    side: ad.side,
    fiat: ad.fiat,
    country: ad.country,
    price_type: ad.price_type,
    price: ad.price,
    margin_pct: ad.margin_pct,
    min_fiat: ad.min_fiat,
    max_fiat: ad.max_fiat,
    amount_xmr: fromPico(ad.remaining_pico),
    methods: JSON.parse(ad.methods),
    pay_window_min: ad.pay_window_min,
    terms: ad.terms,
    min_orders_reversible: ad.min_orders_reversible,
    xmr_address: ad.xmr_address,
    request_window_h: ad.request_window_h ?? null,
    ...data,
  };
  delete (merged as Record<string, unknown>).status;
  delete (merged as Record<string, unknown>).nonce;
  if ("side" in data && data.side !== ad.side) throw new HttpError(400, "no se puede cambiar side");
  const v = validateAd(env, merged, JSON.parse(s.blocked_methods ?? "[]"));
  await env.DB.prepare(
    "UPDATE p2p_ads SET fiat = ?, country = ?, price_type = ?, price = ?, margin_pct = ?, min_fiat = ?, max_fiat = ?, remaining_pico = ?, methods = ?, pay_window_min = ?, terms = ?, min_orders_reversible = ?, xmr_address = ?, request_window_h = ?, status = ?, paused_reason = NULL, updated_at = ? WHERE id = ?",
  )
    .bind(v.fiat, v.country, v.price_type, v.price, v.margin_pct, v.min_fiat, v.max_fiat, v.remaining_pico, JSON.stringify(v.methods), v.pay_window_min, v.terms, v.min_orders_reversible, v.xmr_address, v.request_window_h, status, now(), ad.id)
    .run();
  const updated = await getAd(env, ad.id);
  return json(publicAd(updated, await market(updated.fiat)));
}

/**
 * GET /v1/p2p/ads?side=sell&fiat=MXN[&country=MX][&method=SPEI][&amount=500]
 * side=sell: anuncios de quien vende XMR (los ve quien quiere comprar), del más barato al más caro.
 * side=buy: anuncios de quien compra XMR, del que paga más al que paga menos.
 * Primero los anunciantes en línea (el escrow se arma con los dos navegadores abiertos), luego los que
 * aceptan solicitudes fuera de línea, y al final el resto. online=1: solo los que están en línea.
 * Los anuncios de quien lleva más de 24 h sin conectarse no aparecen (7 días si aceptan solicitudes);
 * vuelven al reconectarse.
 */
export async function listAds(env: P2PEnv, url: URL): Promise<Response> {
  const sp = url.searchParams;
  const side = sp.get("side");
  if (side !== "sell" && side !== "buy") throw new HttpError(400, "side debe ser sell o buy");
  const fiat = requireFiat(sp.get("fiat"));
  const country = requireCountry(sp.get("country"));
  const method = (sp.get("method") ?? "").trim().toLowerCase();
  const amount = sp.get("amount") ? Number(fiatAmount(sp.get("amount"), "amount")) : null;
  const onlyOnline = sp.get("online") === "1";
  const t = now();
  const rows = await env.DB.prepare(
    "SELECT a.*, u.nickname, u.orders_done, u.orders_total, u.release_secs, u.releases, u.deposit_secs, u.deposits, u.accept_secs, u.accepts, u.positive, u.negative, u.last_seen" +
      " FROM p2p_ads a JOIN p2p_users u ON u.id = a.user_id" +
      " WHERE a.status = 'active' AND a.side = ? AND a.fiat = ? AND u.banned = 0 AND u.last_seen >= (CASE WHEN a.request_window_h IS NULL THEN ? ELSE ? END) AND (? IS NULL OR a.country IS NULL OR a.country = ?)" +
      " LIMIT 300",
  )
    .bind(side, fiat, t - STALE_SECS, t - STALE_REQUEST_SECS, country, country)
    .all<Ad & { nickname: string; orders_done: number; orders_total: number; release_secs: number; releases: number; deposit_secs: number; deposits: number; accept_secs: number; accepts: number; positive: number; negative: number; last_seen: number }>();
  const mkt = await market(fiat);
  // 2: en línea (orden directa), 1: fuera de línea pero acepta solicitudes, 0: hay que esperar a que vuelva.
  const reach = (a: { user: { last_seen: number }; request_window_h: number | null }) => (isOnline(a.user.last_seen, t) ? 2 : a.request_window_h ? 1 : 0);
  const ads = rows.results
    .map((r) => {
      const ad = publicAd(r, mkt);
      const maxByStock = ad.price !== null ? Number(ad.available_xmr) * ad.price : 0;
      return {
        ...ad,
        // Lo que de verdad se puede pedir: el máximo del anuncio o lo que alcanza con el XMR que queda.
        max_fiat: String(Math.floor(Math.min(Number(ad.max_fiat), maxByStock) * 100) / 100),
        user: publicUser({ ...r, id: r.user_id, enc_pubkey: "", created_at: 0, banned: 0 }),
      };
    })
    .filter((a) => a.price !== null && Number(a.max_fiat) >= Number(a.min_fiat))
    .filter((a) => !method || a.methods.some((m) => m.name.toLowerCase().includes(method)))
    .filter((a) => amount === null || (amount >= Number(a.min_fiat) && amount <= Number(a.max_fiat)))
    .filter((a) => !onlyOnline || isOnline(a.user.last_seen, t))
    .sort((a, b) => reach(b) - reach(a) || (side === "sell" ? a.price! - b.price! : b.price! - a.price!))
    .slice(0, 100);
  return json({ side, fiat, market_price: mkt, ads });
}

/** GET /v1/p2p/my/ads */
export async function myAds(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const id = await signer(req, env, path, "");
  const rows = await env.DB.prepare("SELECT * FROM p2p_ads WHERE user_id = ? AND status != 'closed' ORDER BY created_at DESC").bind(id).all<Ad>();
  const fiats = [...new Set(rows.results.map((a) => a.fiat))];
  const prices = Object.fromEntries(await Promise.all(fiats.map(async (f) => [f, await market(f)] as const)));
  return json({ ads: rows.results.map((a) => publicAd(a, prices[a.fiat] ?? null)) });
}
