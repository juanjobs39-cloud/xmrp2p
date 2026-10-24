/** Cliente del backend de Cloudflare (Fase 4). */
import { API_URL } from "./config";

export interface Offer {
  id: string;
  maker: string;
  network: string;
  price: string;
  min_usdt: string;
  max_usdt: string;
  max_xmr: string;
  expires_at: number;
}

export interface MakerReply {
  swap_id: string;
  maker_message: Record<string, string>;
  claimer: `0x${string}`;
  claim_commitment: `0x${string}`;
  refund_commitment: `0x${string}`;
  usdt_atomic: number;
  xmr_atomic: number;
  shared_address: string;
  deposit_deadline: number;
  min_duration0: number;
  min_duration1: number;
}

export interface RoomMessage {
  seq: number;
  at: number;
  from: "maker" | "taker";
  event: string;
  data: Record<string, unknown>;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("La app no tiene configurado el backend (PUBLIC_API_URL).");
  const r = await fetch(API_URL + path, init);
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `error ${r.status}`);
  return body;
}

export const api = {
  offers: (network: string) => call<{ offers: Offer[] }>(`/v1/offers?network=${encodeURIComponent(network)}`).then((r) => r.offers),
  createSwap: (offer_id: string, usdt: string, taker_message: unknown) =>
    call<{ room_id: string; room_token: string; maker_reply: MakerReply }>("/v1/swaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id, usdt, taker_message }),
    }),
  events: (room: string, token: string, after = 0) =>
    call<{ messages: RoomMessage[] }>(`/v1/swaps/${room}/events?after=${after}`, { headers: { "x-room-token": token } }).then((r) => r.messages),
  message: (room: string, token: string, event: string, data: unknown) =>
    call<RoomMessage>(`/v1/swaps/${room}/messages`, {
      method: "POST",
      headers: { "x-room-token": token, "content-type": "application/json" },
      body: JSON.stringify({ event, data }),
    }),
};
