/**
 * Avisos Web Push de P2P Fiat.
 *
 * El aviso va vacío: el service worker del sitio muestra siempre el mismo texto («Tienes novedades en
 * P2P Fiat»). Así no hace falta cifrar el contenido y el servicio de push del navegador (Google, Mozilla,
 * Apple o Microsoft) no ve nada de la orden. Se firma con VAPID (ES256) usando WebCrypto.
 */
import { HttpError, json, readJson } from "../env";
import { activeUser, now, signer, type P2PEnv } from "./common";

/** Suscripciones como máximo por usuario (navegadores o equipos). */
const MAX_PER_USER = 5;

/** Solo servicios de push conocidos: el worker no manda peticiones a cualquier URL. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];

export function validEndpoint(v: unknown): string {
  if (typeof v !== "string" || v.length > 1000) throw new HttpError(400, "endpoint inválido");
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new HttpError(400, "endpoint inválido");
  }
  if (u.protocol !== "https:" || u.port || u.username || !PUSH_HOSTS.some((h) => h.test(u.hostname))) throw new HttpError(400, "servicio de push no permitido");
  return u.href;
}

/** PUT /v1/p2p/push {endpoint} — guarda la suscripción del navegador. */
export async function subscribe(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  await activeUser(env, user);
  const endpoint = validEndpoint(data.endpoint);
  await env.DB.batch([
    // Si el navegador ya estaba suscrito con otra cuenta, pasa a esta.
    env.DB.prepare("INSERT OR REPLACE INTO p2p_push (endpoint, user_id, created_at) VALUES (?, ?, ?)").bind(endpoint, user, now()),
    env.DB.prepare(
      "DELETE FROM p2p_push WHERE user_id = ? AND endpoint NOT IN (SELECT endpoint FROM p2p_push WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)",
    ).bind(user, user, MAX_PER_USER),
  ]);
  return json({ ok: true });
}

/** DELETE /v1/p2p/push {endpoint} — borra la suscripción. */
export async function unsubscribe(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  await env.DB.prepare("DELETE FROM p2p_push WHERE endpoint = ? AND user_id = ?").bind(String(data.endpoint ?? ""), user).run();
  return json({ ok: true });
}

const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

let keyCache: { pub: string; key: CryptoKey } | null = null;

async function vapidKey(env: P2PEnv): Promise<CryptoKey | null> {
  const pub = env.P2P_VAPID_PUBLIC;
  const priv = env.P2P_VAPID_PRIVATE;
  if (!pub || !priv) return null;
  if (keyCache?.pub === pub) return keyCache.key;
  const p = unb64u(pub); // 0x04 || x || y
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: priv, ext: false },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  keyCache = { pub, key };
  return key;
}

/** Encabezado Authorization de VAPID para el origen del servicio de push. */
export async function vapidAuth(env: P2PEnv, endpoint: string): Promise<string | null> {
  const key = await vapidKey(env);
  if (!key) return null;
  const enc = (o: object) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud: new URL(endpoint).origin, exp: now() + 12 * 3600, sub: "https://fiat.monerop2p.app" })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${env.P2P_VAPID_PUBLIC}`;
}

/**
 * Avisa a los usuarios (a todos sus navegadores suscritos). Nunca falla: un aviso que no llega no
 * debe romper la orden. Las suscripciones que el servicio da por muertas (404/410) se borran.
 */
export async function notify(env: P2PEnv, ...users: string[]): Promise<void> {
  try {
    const ids = [...new Set(users.filter(Boolean).map((u) => u.toLowerCase()))];
    if (!ids.length || !env.P2P_VAPID_PUBLIC || !env.P2P_VAPID_PRIVATE) return;
    const subs = await env.DB.prepare(`SELECT endpoint FROM p2p_push WHERE user_id IN (${ids.map(() => "?").join(", ")})`)
      .bind(...ids)
      .all<{ endpoint: string }>();
    await Promise.all(
      subs.results.map(async ({ endpoint }) => {
        try {
          const auth = await vapidAuth(env, endpoint);
          if (!auth) return;
          const r = await fetch(endpoint, { method: "POST", headers: { authorization: auth, ttl: "86400", urgency: "high", "content-length": "0" } });
          if (r.status === 404 || r.status === 410) await env.DB.prepare("DELETE FROM p2p_push WHERE endpoint = ?").bind(endpoint).run();
          else if (!r.ok) console.log("push", new URL(endpoint).hostname, r.status);
        } catch (e) {
          console.log("push falló:", String(e));
        }
      }),
    );
  } catch (e) {
    console.log("notify falló:", String(e));
  }
}
