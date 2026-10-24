export interface Env {
  DB: D1Database;
  MAKER_INBOX: DurableObjectNamespace;
  SWAP_ROOM: DurableObjectNamespace;
  WRITE_LIMITER?: RateLimit;
  READ_LIMITER?: RateLimit;
  ACTIVE_NETWORKS: string;
  BLOCKED_REGIONS: string;
  ALLOWED_ORIGINS: string;
  MAX_OFFER_TTL: string;
  TAKE_TIMEOUT_MS: string;
}

/** Límite de tamaño de cualquier cuerpo JSON (el mensaje con la DLEQ pesa ~114 KB). */
export const MAX_BODY = 256 * 1024;

/** Nombres de campo que delatan una llave privada completa. El canal los rechaza siempre. */
const FORBIDDEN_KEY = /(spend_private|private_spend|spend_key|spendkey|mnemonic|seed|private_key)/i;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function activeNetworks(env: Env): Set<string> {
  return new Set(env.ACTIVE_NETWORKS.split(",").map((s) => s.trim()).filter(Boolean));
}

export function requireNetwork(env: Env, network: string | null): string {
  if (!network) throw new HttpError(400, "falta el parámetro network");
  if (!activeNetworks(env).has(network)) throw new HttpError(404, `la red ${network} no está activa`);
  return network;
}

export function blockedRegion(req: Request, env: Env): string | null {
  const country = (req as Request & { cf?: { country?: string } }).cf?.country;
  if (!country) return null;
  const blocked = env.BLOCKED_REGIONS.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  return blocked.includes(country.toUpperCase()) ? country : null;
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? "local";
}

export async function readJson<T = unknown>(req: Request): Promise<{ raw: string; data: T }> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) throw new HttpError(413, "cuerpo demasiado grande");
  const raw = await req.text();
  if (raw.length > MAX_BODY) throw new HttpError(413, "cuerpo demasiado grande");
  try {
    return { raw, data: JSON.parse(raw) as T };
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}

/** Lanza si algún campo (a cualquier profundidad) parece una llave privada completa. */
export function assertNoPrivateKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoPrivateKeys(v, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(k)) {
        throw new HttpError(400, `el canal no transporta llaves privadas completas (${path}.${k})`);
      }
      assertNoPrivateKeys(v, `${path}.${k}`);
    }
  }
}

export function decimal(v: unknown, field: string): string {
  if (typeof v !== "string" && typeof v !== "number") throw new HttpError(400, `${field} inválido`);
  const s = String(v);
  if (!/^\d{1,12}(\.\d{1,12})?$/.test(s) || Number(s) <= 0) throw new HttpError(400, `${field} inválido`);
  return s;
}

export function randomId(bytes = 16): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
