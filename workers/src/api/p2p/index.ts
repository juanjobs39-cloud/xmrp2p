import { HttpError, json, readJson } from "../env";
import { createAd, getAd, getMe, getProfile, listAds, myAds, publicAd, putMe, updateAd } from "./ads";
import { FIATS, POPULAR_FIATS, requireFiat, suggestedMethods, xmrPrice } from "./catalog";
import { activeUser, settings, signer, text, xmrNetwork, type P2PEnv } from "./common";
import { handleAdmin, handleArbiter } from "./admin";
import { createOrder, FINAL, getOrder, getOrderView, myOrders, orderAction, roleOf, roomEvent, sweepOrders } from "./orders";

export { sweepOrders };

export const p2pEnabled = (env: P2PEnv) => env.P2P_ENABLED === "on";

/** Rutas /v1/p2p/* (P2P Fiat, solo en la beta). */
export async function handleP2P(req: Request, env: P2PEnv, url: URL): Promise<Response> {
  if (!p2pEnabled(env)) throw new HttpError(404, "ruta no encontrada");
  const p = url.pathname;
  const get = req.method === "GET";

  if (p.startsWith("/v1/p2p/arbiter/")) return handleArbiter(req, env, url);
  if (p.startsWith("/v1/p2p/admin/")) return handleAdmin(req, env, url);

  // ---- Públicas ----
  if (p === "/v1/p2p/config" && get) {
    const s = await settings(env);
    return json({
      xmr_network: xmrNetwork(env),
      fee_bps: Number(s.fee_bps),
      cap_usd: Number(s.cap_usd),
      deposit_window_min: Number(s.deposit_window_min),
      dispute_after_min: Number(s.dispute_after_min),
      admin_address: env.P2P_ADMIN_ADDRESS?.toLowerCase() || null,
      fee_address: env.P2P_FEE_ADDRESS || null,
    });
  }
  if (p === "/v1/p2p/fiats" && get) return json({ popular: POPULAR_FIATS, all: FIATS }, 200, { "cache-control": "public, max-age=86400" });
  if (p === "/v1/p2p/methods" && get) {
    const fiat = requireFiat(url.searchParams.get("fiat"));
    const blocked = (JSON.parse((await settings(env)).blocked_methods ?? "[]") as string[]).map((b) => b.toLowerCase());
    return json({ fiat, suggested: suggestedMethods(fiat).filter((m) => !blocked.includes(m.name.toLowerCase())) });
  }
  if (p === "/v1/p2p/price" && get) return json(await xmrPrice(requireFiat(url.searchParams.get("fiat"))));
  if (p === "/v1/p2p/ads" && get) return listAds(env, url);
  const adGet = /^\/v1\/p2p\/ads\/([0-9a-f]{32})$/.exec(p);
  if (adGet && get) return json(publicAd(await getAd(env, adGet[1]!), (await xmrPrice((await getAd(env, adGet[1]!)).fiat).catch(() => null))?.price ?? null));
  const prof = /^\/v1\/p2p\/users\/(0x[0-9a-fA-F]{40})$/.exec(p);
  if (prof && get) return getProfile(env, prof[1]!);

  // ---- Firmadas por el usuario ----
  if (p === "/v1/p2p/me/ping" && req.method === "POST") {
    // Latido de la app abierta: marca al usuario «en línea».
    const { raw } = await readJson<Record<string, unknown>>(req);
    await activeUser(env, await signer(req, env, p, raw));
    return json({ ok: true });
  }
  if (p === "/v1/p2p/me") {
    if (req.method === "PUT") return putMe(req, env, p);
    if (get) return getMe(req, env, p);
  }
  if (p === "/v1/p2p/ads" && req.method === "POST") return createAd(req, env, p);
  if (adGet && req.method === "PATCH") return updateAd(req, env, p, adGet[1]!);
  if (p === "/v1/p2p/my/ads" && get) return myAds(req, env, p);
  if (p === "/v1/p2p/my/orders" && get) return myOrders(req, env, p, url);
  if (p === "/v1/p2p/orders" && req.method === "POST") return createOrder(req, env, p);

  const ord = /^\/v1\/p2p\/orders\/([0-9a-f]{32})(?:\/([a-z-]+))?$/.exec(p);
  if (ord) {
    const [, id, action] = ord as unknown as [string, string, string | undefined];
    if (!action && get) return getOrderView(req, env, p, id);
    if (action === "messages") return messages(req, env, p, id, url);
    if (action && req.method === "POST") return orderAction(req, env, p, id, action);
  }
  throw new HttpError(404, "ruta no encontrada");
}

/**
 * GET  /v1/p2p/orders/:id/messages?after=N — chat y línea de tiempo.
 * POST /v1/p2p/orders/:id/messages {ciphertext} o {protocol} — mensaje cifrado o del protocolo multisig.
 */
async function messages(req: Request, env: P2PEnv, path: string, id: string, url: URL): Promise<Response> {
  const room = env.P2P_ORDER_ROOM.get(env.P2P_ORDER_ROOM.idFromName(id));
  if (req.method === "GET") {
    const user = await signer(req, env, path, "");
    roleOf(env, await getOrder(env, id), user);
    const after = Number(url.searchParams.get("after") ?? "0");
    return room.fetch(`https://room/messages?after=${Number.isFinite(after) ? after : 0}`);
  }
  if (req.method !== "POST") throw new HttpError(405, "usa GET o POST");
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  await activeUser(env, user);
  const o = await getOrder(env, id);
  const role = roleOf(env, o, user);
  if (role === "admin") throw new HttpError(403, "el administrador escribe por /v1/p2p/admin/orders/:id/message");
  if (FINAL.includes(o.status) && o.closed_at && Date.now() / 1000 - o.closed_at > 7 * 86400) throw new HttpError(409, "el chat de esta orden ya se cerró");
  if (data.protocol !== undefined) {
    await roomEvent(env, id, role, { type: "protocol", data: data.protocol });
  } else {
    await roomEvent(env, id, role, { type: "message", ciphertext: text(data.ciphertext, "ciphertext", 8000, 1) });
  }
  return json({ ok: true }, 201);
}
