import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signedMessage } from "../src/api/auth";
import { blockedRegion, type Env } from "../src/api/env";
import { BASE, connectInbox, newMaker, publishOffer, signed, TAKER_MESSAGE } from "./helpers";

const get = (path: string, init?: RequestInit) => SELF.fetch(BASE + path, init);

describe("API pública", () => {
  it("health y redes", async () => {
    const r = await get("/v1/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, networks: ["arbitrum_sepolia"], testnet_only: true });
    expect(await (await get("/v1/networks")).json()).toEqual({ networks: ["arbitrum_sepolia"] });
  });

  it("OpenAPI publicado", async () => {
    const j = (await (await get("/openapi.json")).json()) as { openapi: string; paths: Record<string, unknown> };
    expect(j.openapi).toBe("3.1.0");
    expect(Object.keys(j.paths)).toContain("/v1/quote");
  });

  it("red inactiva → 404", async () => {
    expect((await get("/v1/offers?network=tron_nile")).status).toBe(404);
  });

  it("CORS en preflight y respuestas", async () => {
    const r = await get("/v1/offers", { method: "OPTIONS", headers: { origin: "https://x.example" } });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("bloqueo por región", async () => {
    const env = { BLOCKED_REGIONS: "us, kp" } as Env;
    const req = (country?: string) => ({ cf: country ? { country } : undefined }) as unknown as Request;
    expect(blockedRegion(req("KP"), env)).toBe("KP");
    expect(blockedRegion(req("US"), env)).toBe("US");
    expect(blockedRegion(req("CO"), env)).toBeNull();
    expect(blockedRegion(req(), env)).toBeNull();
    // Con la configuración por defecto (vacía) no se bloquea nada.
    expect((await get("/v1/networks", { cf: { country: "KP" } } as RequestInit)).status).toBe(200);
  });
});

describe("libro de órdenes", () => {
  it("publicar, listar, cotizar y retirar con firma", async () => {
    const m = newMaker();
    const { r, body } = await publishOffer(m);
    expect(r.status).toBe(200);
    expect(body.maker).toBe(m.address.toLowerCase());

    const list = (await (await get("/v1/offers?network=arbitrum_sepolia")).json()) as { offers: { id: string; price: string }[] };
    expect(list.offers.some((o) => o.id === body.id)).toBe(true);

    // Renovar la oferta no crea otra: una por maker y red.
    const again = await publishOffer(m, { price: "250" });
    expect(again.body.id).toBe(body.id);

    const q = (await (await get("/v1/quote?network=arbitrum_sepolia&usdt=100")).json()) as Record<string, string>;
    expect(q.price).toBe("250");
    expect(q.xmr).toBe("0.400000000000");
    expect((await get("/v1/quote?network=arbitrum_sepolia&usdt=999999")).status).toBe(404);

    const del = await signed(m, "DELETE", "/v1/offers", { network: "arbitrum_sepolia" });
    expect(del.status).toBe(200);
    const after = (await (await get("/v1/offers?network=arbitrum_sepolia")).json()) as { offers: { id: string }[] };
    expect(after.offers.some((o) => o.id === body.id)).toBe(false);
  });

  it("rechaza firmas inválidas, de otro maker o caducadas", async () => {
    const m = newMaker();
    const unsigned = await get("/v1/offers", { method: "PUT", body: "{}" });
    expect(unsigned.status).toBe(401);
    expect((await signed(m, "PUT", "/v1/offers", { network: "arbitrum_sepolia", price: "1", min_usdt: "1", max_usdt: "2", max_xmr: "1" }, -600)).status).toBe(401);

    // Firma válida de M sobre un cuerpo, enviada con otro cuerpo → 401.
    const bodyA = JSON.stringify({ network: "arbitrum_sepolia", price: "1", min_usdt: "1", max_usdt: "2", max_xmr: "1" });
    const bodyB = bodyA.replace('"price":"1"', '"price":"0.0001"');
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await m.signMessage({ message: await signedMessage("PUT", "/v1/offers", m.address, ts, bodyA) });
    const h = { "x-maker-address": m.address, "x-timestamp": ts, "x-signature": sig };
    expect((await get("/v1/offers", { method: "PUT", headers: h, body: bodyB })).status).toBe(401);
    expect((await get("/v1/offers", { method: "PUT", headers: h, body: bodyA })).status).toBe(200);

    // Firma de M presentada como si fuera de otro maker → 401.
    const other = newMaker();
    expect((await get("/v1/offers", { method: "PUT", headers: { ...h, "x-maker-address": other.address }, body: bodyA })).status).toBe(401);
  });

  it("valida los campos", async () => {
    const m = newMaker();
    expect((await publishOffer(m, { price: "-1" })).r.status).toBe(400);
    expect((await publishOffer(m, { min_usdt: "100", max_usdt: "10" })).r.status).toBe(400);
    expect((await publishOffer(m, { network: "tron_nile" })).r.status).toBe(404);
    expect((await publishOffer(m, { price: "1e9" })).r.status).toBe(400);
  });
});

describe("MCP de solo lectura", () => {
  const rpc = (body: unknown) =>
    get("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("initialize, tools/list y get_quote", async () => {
    const init = (await (await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).json()) as { result: { protocolVersion: string } };
    expect(init.result.protocolVersion).toBe("2025-06-18");
    expect((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);

    const tools = (await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json()) as { result: { tools: { name: string; annotations: { readOnlyHint: boolean } }[] } };
    expect(tools.result.tools.map((t) => t.name).sort()).toEqual(["get_quote", "list_networks", "list_offers"]);
    expect(tools.result.tools.every((t) => t.annotations.readOnlyHint)).toBe(true);

    await publishOffer(newMaker(), { price: "200" });
    const q = (await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_quote", arguments: { network: "arbitrum_sepolia", usdt: "100" } } })).json()) as { result: { structuredContent: { xmr: string } } };
    expect(Number(q.result.structuredContent.xmr)).toBeGreaterThan(0);
  });

  it("no hay herramientas de escritura", async () => {
    const r = (await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "create_swap", arguments: {} } })).json()) as { error: { code: number } };
    expect(r.error.code).toBe(-32602);
    expect((await get("/mcp")).status).toBe(405);
  });
});

describe("canal del swap (buzón del maker + sala)", () => {
  it("flujo completo: solicitud, respuesta del maker, eventos y mensajes del taker", async () => {
    const m = newMaker();
    const { body: offer } = await publishOffer(m);
    const inbox = await connectInbox(m);

    const takerReq = get("/v1/swaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id: offer.id, usdt: "100", taker_message: TAKER_MESSAGE }),
    });
    const take = await inbox.next();
    expect(take).toMatchObject({ type: "take", usdt: "100", network: "arbitrum_sepolia" });
    inbox.ws.send(
      JSON.stringify({ type: "reply", request_id: take.request_id, ok: true, result: { swap_id: "s1", xmr_atomic: 333, claimer: m.address } }),
    );
    const r = await takerReq;
    expect(r.status).toBe(201);
    const swap = (await r.json()) as { room_id: string; room_token: string; maker_reply: { swap_id: string } };
    expect(swap.maker_reply.swap_id).toBe("s1");

    // El maker avisa que bloqueó el XMR.
    inbox.ws.send(JSON.stringify({ type: "event", room_id: swap.room_id, event: "xmr_locked", data: { txid: "ab".repeat(32) } }));
    await new Promise((res) => setTimeout(res, 100));
    const ev = (await (await get(`/v1/swaps/${swap.room_id}/events?after=0`, { headers: { "x-room-token": swap.room_token } })).json()) as { messages: { event: string }[] };
    expect(ev.messages.map((x) => x.event)).toEqual(["accepted", "xmr_locked"]);

    // Sin token, o con otro token, no se leen los mensajes.
    expect((await get(`/v1/swaps/${swap.room_id}/events`)).status).toBe(403);

    // El taker escribe al maker.
    const post = await get(`/v1/swaps/${swap.room_id}/messages`, {
      method: "POST",
      headers: { "x-room-token": swap.room_token, "content-type": "application/json" },
      body: JSON.stringify({ event: "ready_sent", data: { tx: "0x01" } }),
    });
    expect(post.status).toBe(200);
    expect(await inbox.next()).toMatchObject({ type: "taker_message", room_id: swap.room_id, event: "ready_sent" });
    inbox.ws.close();
  });

  it("rechaza llaves privadas completas en cualquier mensaje", async () => {
    const m = newMaker();
    const { body: offer } = await publishOffer(m);
    const r = await get("/v1/swaps", {
      method: "POST",
      body: JSON.stringify({ offer_id: offer.id, usdt: "100", taker_message: { ...TAKER_MESSAGE, spend_private: "00".repeat(32) } }),
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toMatch(/llaves privadas/);
  });

  it("maker desconectado → 503; maker que no responde → 504; rechazo → 409", async () => {
    const m = newMaker();
    const { body: offer } = await publishOffer(m);
    const req = () =>
      get("/v1/swaps", { method: "POST", body: JSON.stringify({ offer_id: offer.id, usdt: "50", taker_message: TAKER_MESSAGE }) });
    expect((await req()).status).toBe(409); // sin buzón conectado el DO responde "no está en línea"

    const inbox = await connectInbox(m);
    expect((await req()).status).toBe(504); // nadie contesta en TAKE_TIMEOUT_MS

    const p = req();
    const take = await inbox.next(); // la solicitud que expiró
    void take;
    const take2 = await inbox.next();
    inbox.ws.send(JSON.stringify({ type: "reply", request_id: take2.request_id, ok: false, error: "sin liquidez" }));
    const r = await p;
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe("sin liquidez");
    inbox.ws.close();
  });

  it("monto fuera de la oferta → 400; oferta inexistente → 404", async () => {
    const m = newMaker();
    const { body: offer } = await publishOffer(m);
    expect((await get("/v1/swaps", { method: "POST", body: JSON.stringify({ offer_id: offer.id, usdt: "5", taker_message: TAKER_MESSAGE }) })).status).toBe(400);
    expect((await get("/v1/swaps", { method: "POST", body: JSON.stringify({ offer_id: "nope", usdt: "50", taker_message: TAKER_MESSAGE }) })).status).toBe(404);
  });
});

describe("compatibilidad de firma Python → Worker", () => {
  it("una firma hecha con eth_account (daemon del maker) verifica con viem", async () => {
    const v = (await import("./vectors-python-signature.json")).default as Record<string, string>;
    const req = new Request(BASE + v.path, {
      method: v.method,
      headers: { "x-maker-address": v["x-maker-address"]!, "x-timestamp": v["x-timestamp"]!, "x-signature": v["x-signature"]! },
      body: v.body,
    });
    const { verifyMaker } = await import("../src/api/auth");
    expect(await verifyMaker(req, v.path!, v.body!, 1_800_000_000)).toBe(v["x-maker-address"]!.toLowerCase());
    await expect(verifyMaker(req, v.path!, v.body! + " ", 1_800_000_000)).rejects.toThrow(/firma inválida/);
  });
});
