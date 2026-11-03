/** Cliente de /v1/p2p: lecturas públicas y peticiones firmadas con la llave del usuario. */
import type { PrivateKeyAccount } from "viem";
import { API_URL } from "../app/config";

// En fiat.monerop2p.app la API está en el mismo origen que las páginas.
export const P2P_API =
  (import.meta.env.PUBLIC_P2P_API_URL as string | undefined) || (import.meta.env.PUBLIC_SITE === "fiat" ? location.origin : API_URL);

const sha256Hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Mismo mensaje que verifica el backend (workers/src/api/auth.ts). */
async function signedMessage(method: string, path: string, address: string, ts: string, body: string) {
  return `xmrp2p|${method.toUpperCase()}|${path}|${address.toLowerCase()}|${ts}|${await sha256Hex(body)}`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function parse<T>(r: Response): Promise<T> {
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new ApiError(r.status, j.error ?? `error ${r.status}`);
  return j as T;
}

export const get = <T>(path: string) => fetch(P2P_API + path).then((r) => parse<T>(r));

/** Petición firmada. En escrituras agrega un nonce al azar (dos peticiones iguales no comparten firma). */
export async function signed<T>(acct: PrivateKeyAccount, method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  const raw = body === undefined ? "" : JSON.stringify({ ...body, nonce: crypto.randomUUID() });
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = await acct.signMessage({ message: await signedMessage(method, path.split("?")[0]!, acct.address, ts, raw) });
  const r = await fetch(P2P_API + path, {
    method,
    body: raw || undefined,
    headers: { "content-type": "application/json", "x-maker-address": acct.address, "x-timestamp": ts, "x-signature": signature },
  });
  return parse<T>(r);
}

// ---------- Tipos de las respuestas ----------

export interface Method {
  kind: string;
  name: string;
  country?: string | null;
  reversible: boolean;
}
export interface PublicUser {
  id: string;
  nickname: string;
  enc_pubkey: string;
  orders_done: number;
  completion_pct: number | null;
  avg_release_min: number | null;
  /** Minutos promedio que tarda en depositar al escrow (como vendedor). */
  avg_deposit_min?: number | null;
  /** Actividad en los últimos 10 minutos (la app manda un latido mientras está abierta). */
  online?: boolean;
  positive: number;
  negative: number;
  last_seen: number;
  banned: boolean;
}
export interface Ad {
  id: string;
  user_id: string;
  side: "sell" | "buy";
  fiat: string;
  country: string | null;
  price_type: "fixed" | "float";
  margin_pct: number | null;
  price: number | null;
  min_fiat: string;
  max_fiat: string;
  available_xmr: string;
  methods: Method[];
  pay_window_min: number;
  terms: string;
  min_orders_reversible: number;
  status: string;
  /** missed_deposits: la plataforma lo pausó por depósitos vencidos. */
  paused_reason?: string | null;
  user?: PublicUser;
}
export interface P2PConfig {
  xmr_network: "stagenet" | "mainnet";
  fee_bps: number;
  cap_usd: number;
  deposit_window_min: number;
  dispute_after_min: number;
  admin_address: string | null;
  fee_address: string | null;
}
export interface OrderView {
  id: string;
  ad_id: string;
  role: "buyer" | "seller";
  status: string;
  fiat: string;
  method: Method;
  price: string;
  fiat_amount: string;
  xmr: string;
  fee_xmr: string;
  deposit_required_xmr: string;
  buyer: PublicUser;
  seller: PublicUser;
  counterpart: PublicUser;
  buyer_address: string;
  seller_refund_address?: string;
  multisig_address: string | null;
  deposit_txid: string | null;
  payout_txid: string | null;
  enc_payment?: string | null;
  pay_window_min: number;
  deadline_at: number | null;
  dispute_available_at: number | null;
  cancel_reason: string | null;
  created_at: number;
  paid_at: number | null;
  funded_at: number | null;
  closed_at: number | null;
  dispute: { opened_by: string; reason: string; status: string; winner: string | null; note: string | null } | null;
}
export interface RoomMessage {
  seq: number;
  at: number;
  from: "system" | "buyer" | "seller" | "admin" | "arbiter";
  body: { type: string; status?: string; reason?: string; ciphertext?: string; data?: Record<string, unknown>; winner?: string; note?: string };
}
