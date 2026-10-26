import { getOffer } from "./offers";
import { assertNoPrivateKeys, assertUsdtCap, decimal, Env, HttpError, json, randomId, readJson, requireNetwork, sha256Hex } from "./env";

/**
 * POST /v1/swaps  { offer_id, usdt, taker_message }
 * Reenvía la solicitud al buzón del maker (Durable Object) y espera su respuesta.
 * Crea una sala (SwapRoom) para los mensajes siguientes del protocolo.
 * Devuelve al taker el token de la sala: es su única credencial (no hay cuentas).
 */
export async function createSwap(req: Request, env: Env): Promise<Response> {
  const { data } = await readJson<Record<string, unknown>>(req);
  assertNoPrivateKeys(data);
  if (typeof data.offer_id !== "string") throw new HttpError(400, "falta offer_id");
  const usdt = decimal(data.usdt, "usdt");
  if (!data.taker_message || typeof data.taker_message !== "object") throw new HttpError(400, "falta taker_message");

  const offer = await getOffer(env, data.offer_id);
  if (!offer) throw new HttpError(404, "la oferta no existe o expiró");
  requireNetwork(env, offer.network);
  assertUsdtCap(offer.network, usdt, "el monto");
  if (Number(usdt) < Number(offer.min_usdt) || Number(usdt) > Number(offer.max_usdt)) {
    throw new HttpError(400, `el monto debe estar entre ${offer.min_usdt} y ${offer.max_usdt} USDT`);
  }

  const roomId = randomId(16);
  const takerToken = randomId(24);
  const room = env.SWAP_ROOM.get(env.SWAP_ROOM.idFromName(roomId));
  await room.fetch("https://room/init", {
    method: "POST",
    body: JSON.stringify({ room_id: roomId, maker: offer.maker, taker_token_hash: await sha256Hex(takerToken), network: offer.network }),
  });

  const inbox = env.MAKER_INBOX.get(env.MAKER_INBOX.idFromName(offer.maker));
  const r = await inbox.fetch("https://inbox/take", {
    method: "POST",
    body: JSON.stringify({ room_id: roomId, offer_id: offer.id, network: offer.network, usdt, taker_message: data.taker_message }),
  });
  const reply = (await r.json()) as { ok: boolean; result?: Record<string, unknown>; error?: string };
  if (!reply.ok || !reply.result) {
    throw new HttpError(r.status === 504 ? 504 : 409, reply.error ?? "el maker rechazó la solicitud");
  }
  assertNoPrivateKeys(reply.result);
  await room.fetch("https://room/append", {
    method: "POST",
    body: JSON.stringify({ from: "maker", event: "accepted", data: reply.result }),
  });
  return json({ room_id: roomId, room_token: takerToken, network: offer.network, maker: offer.maker, maker_reply: reply.result }, 201);
}

/** /v1/swaps/:room/(events|messages|ws) — acceso del taker con su token. */
export async function roomRequest(req: Request, env: Env, roomId: string, action: string): Promise<Response> {
  if (!/^[0-9a-f]{32}$/.test(roomId)) throw new HttpError(404, "sala inexistente");
  const room = env.SWAP_ROOM.get(env.SWAP_ROOM.idFromName(roomId));
  const url = new URL(req.url);
  const token = req.headers.get("x-room-token") ?? url.searchParams.get("token") ?? "";
  const headers = new Headers(req.headers);
  headers.set("x-token-hash", await sha256Hex(token));
  if (action === "messages" && req.method === "POST") {
    const { raw, data } = await readJson(req);
    assertNoPrivateKeys(data);
    return room.fetch(`https://room/taker-message`, { method: "POST", headers, body: raw });
  }
  if (action === "events" && req.method === "GET") {
    return room.fetch(`https://room/events?after=${encodeURIComponent(url.searchParams.get("after") ?? "0")}`, { headers });
  }
  if (action === "ws" && req.headers.get("upgrade") === "websocket") {
    return room.fetch("https://room/ws", { headers });
  }
  throw new HttpError(404, "ruta no encontrada");
}
