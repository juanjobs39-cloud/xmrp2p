import { verifyMaker } from "../auth";
import { Env, HttpError, sha256Hex } from "../env";

export interface P2PEnv extends Env {
  /** "on" para activar P2P Fiat (solo en la beta). Vacío: todas las rutas /v1/p2p responden 404. */
  P2P_ENABLED?: string;
  /** Red de Monero del escrow: "stagenet" (pruebas) o "mainnet". */
  P2P_XMR_NETWORK?: string;
  /** Dirección (0x…) de la llave del administrador. Vacío: el panel está desactivado. */
  P2P_ADMIN_ADDRESS?: string;
  /** Token del árbitro (secreto de Cloudflare). Vacío: las rutas del árbitro están desactivadas. */
  P2P_ARBITER_TOKEN?: string;
  /** Dirección de Monero donde cobra la plataforma (la comisión de cada orden). */
  P2P_FEE_ADDRESS?: string;
  P2P_ORDER_ROOM: DurableObjectNamespace;
}

export const now = () => Math.floor(Date.now() / 1000);

export const PICO = 1_000_000_000_000n;

/** XMR decimal ("1.5") → piconeros. */
export function toPico(xmr: string): bigint {
  const [i, f = ""] = xmr.split(".");
  return BigInt(i!) * PICO + BigInt((f + "000000000000").slice(0, 12));
}

/** Piconeros → XMR decimal sin ceros de más. */
export function fromPico(p: bigint | string): string {
  const v = BigInt(p);
  const i = v / PICO;
  const f = (v % PICO).toString().padStart(12, "0").replace(/0+$/, "");
  return f ? `${i}.${f}` : `${i}`;
}

/** Monto fiat positivo con hasta 2 decimales. */
export function fiatAmount(v: unknown, field: string): string {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s) || Number(s) <= 0) throw new HttpError(400, `${field} inválido`);
  return s;
}

const B58 = "[1-9A-HJ-NP-Za-km-z]";
const ADDR: Record<string, RegExp> = {
  mainnet: new RegExp(`^(?:[48]${B58}{94}|4${B58}{105})$`),
  stagenet: new RegExp(`^(?:[57]${B58}{94}|5${B58}{105})$`),
};

export function xmrNetwork(env: P2PEnv): "mainnet" | "stagenet" {
  return env.P2P_XMR_NETWORK === "mainnet" ? "mainnet" : "stagenet";
}

export function requireXmrAddress(env: P2PEnv, v: unknown, field: string): string {
  const net = xmrNetwork(env);
  if (typeof v !== "string" || !ADDR[net]!.test(v)) throw new HttpError(400, `${field}: dirección de Monero (${net}) inválida`);
  return v;
}

export function text(v: unknown, field: string, max: number, min = 0): string {
  const s = typeof v === "string" ? v.trim() : v === undefined || v === null ? "" : null;
  if (s === null || s.length < min || s.length > max) throw new HttpError(400, `${field} inválido (${min}–${max} caracteres)`);
  return s;
}

/**
 * Las escrituras deben incluir en el cuerpo un `nonce` al azar: la firma es determinista, así que dos
 * peticiones idénticas en el mismo segundo tendrían la misma firma y la segunda se rechazaría.
 *
 * Verifica la firma del usuario (mismo formato que los makers: método, ruta, dirección, hora y hash del
 * cuerpo) y, en escrituras, que esa firma no se haya usado antes.
 */
export async function signer(req: Request, env: P2PEnv, path: string, body: string): Promise<string> {
  const user = await verifyMaker(req, path, body);
  if (req.method !== "GET") {
    const h = await sha256Hex(req.headers.get("x-signature") ?? "");
    const r = await env.DB.prepare("INSERT OR IGNORE INTO p2p_nonces (sig_hash, at) VALUES (?, ?)").bind(h, now()).run();
    if (!r.meta.changes) throw new HttpError(409, "petición repetida");
  }
  return user;
}

export async function settings(env: P2PEnv): Promise<Record<string, string>> {
  const r = await env.DB.prepare("SELECT key, value FROM p2p_settings").all<{ key: string; value: string }>();
  return Object.fromEntries(r.results.map((x) => [x.key, x.value]));
}

export interface User {
  id: string;
  nickname: string;
  enc_pubkey: string;
  created_at: number;
  last_seen: number;
  banned: number;
  orders_done: number;
  orders_total: number;
  release_secs: number;
  releases: number;
  deposit_secs?: number;
  deposits?: number;
  positive: number;
  negative: number;
}

/** Se cuenta «en línea» a quien tuvo actividad (o latido de la app) en los últimos 10 minutos. */
export const ONLINE_SECS = 600;
/** Tras 24 h sin conectarse, sus anuncios dejan de verse en el mercado; vuelven solos al reconectarse. */
export const STALE_SECS = 24 * 3600;
export const isOnline = (lastSeen: number, t = now()) => t - lastSeen < ONLINE_SECS;

export async function getUser(env: P2PEnv, id: string): Promise<User | null> {
  return env.DB.prepare("SELECT * FROM p2p_users WHERE id = ?").bind(id).first<User>();
}

/** Usuario registrado y no bloqueado (para cualquier escritura que no sea registrarse). */
export async function activeUser(env: P2PEnv, id: string): Promise<User> {
  const u = await getUser(env, id);
  if (!u) throw new HttpError(403, "primero crea tu perfil (PUT /v1/p2p/me)");
  if (u.banned) throw new HttpError(403, "tu cuenta está suspendida");
  await env.DB.prepare("UPDATE p2p_users SET last_seen = ? WHERE id = ?").bind(now(), id).run();
  return u;
}

/** Perfil público: reputación como en Binance (órdenes, % completadas, tiempo de liberación, calificaciones). */
export function publicUser(u: User) {
  return {
    id: u.id,
    nickname: u.nickname,
    enc_pubkey: u.enc_pubkey,
    since: u.created_at,
    last_seen: u.last_seen,
    online: isOnline(u.last_seen),
    banned: !!u.banned,
    orders_done: u.orders_done,
    completion_pct: u.orders_total ? Math.round((u.orders_done / u.orders_total) * 1000) / 10 : null,
    avg_release_min: u.releases ? Math.round(u.release_secs / u.releases / 6) / 10 : null,
    avg_deposit_min: u.deposits ? Math.round((u.deposit_secs ?? 0) / u.deposits / 6) / 10 : null,
    positive: u.positive,
    negative: u.negative,
  };
}
