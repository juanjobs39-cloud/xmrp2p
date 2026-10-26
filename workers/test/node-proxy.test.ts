import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "../src/node-proxy/index";

const env = { NODES: '{"*":"http://127.0.0.1:9"}', BLOCKED_REGIONS: "KP" };
const call = (path: string, init: RequestInit = {}) =>
  proxy.fetch(new Request("https://nodo.xmrp2p.test" + path, init) as never, env as never);

describe("proxy de nodos de Monero", () => {
  it("responde el preflight CORS", async () => {
    const r = await call("/json_rpc", { method: "OPTIONS" });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rechaza rutas y métodos RPC fuera de la lista", async () => {
    expect((await call("/stop_daemon", { method: "POST" })).status).toBe(403);
    const r = await call("/json_rpc", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "relay_tx" }) });
    expect(r.status).toBe(403);
    expect((await call("/json_rpc", { method: "POST", body: "no-json" })).status).toBe(400);
    expect((await call("/get_info", { method: "PUT" })).status).toBe(405);
  });

  it("acepta los nombres antiguos que usa wallet2 (sin llegar al nodo: 502 por nodo caído, no 403)", async () => {
    for (const p of ["/gettransactions", "/sendrawtransaction", "/getheight", "/is_key_image_spent"]) {
      expect((await call(p, { method: "POST", body: "{}" })).status).toBe(502);
    }
  }, 60_000);

  it("bloquea regiones configuradas", async () => {
    const r = await proxy.fetch(
      new Request("https://nodo.xmrp2p.test/get_info", { cf: { country: "KP" } } as RequestInit) as never,
      env as never,
    );
    expect(r.status).toBe(451);
  });

  it("nodo caído → 502 (con CORS)", async () => {
    const r = await call("/get_info", { method: "POST" });
    expect(r.status).toBe(502);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
  });

  describe("varios nodos por host (proxy de mainnet)", () => {
    afterEach(() => vi.restoreAllMocks());
    const multi = {
      NODES: '{"nodo-xmr.xmrp2p.test":["https://a.test","https://b.test","https://c.test"]}',
      BLOCKED_REGIONS: "",
    };
    const callMulti = (path: string, init: RequestInit = {}) =>
      proxy.fetch(new Request("https://nodo-xmr.xmrp2p.test" + path, init) as never, multi as never);

    it("si un nodo falla o da 5xx pasa al siguiente", async () => {
      const seen: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const u = String(input instanceof Request ? input.url : input);
        seen.push(u);
        if (u.startsWith("https://a.test")) throw new Error("conexión rechazada");
        if (u.startsWith("https://b.test")) return new Response("caído", { status: 503 });
        return new Response('{"height":1}', { status: 200, headers: { "content-type": "application/json" } });
      });
      const r = await callMulti("/get_height", { method: "POST", body: "{}" });
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ height: 1 });
      expect(seen).toEqual(["https://a.test/get_height", "https://b.test/get_height", "https://c.test/get_height"]);
    });

    it("un 4xx del nodo no provoca reintento; si todos fallan → 502", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 400 }));
      expect((await callMulti("/get_info", { method: "POST" })).status).toBe(400);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRejectedValue(new Error("sin red"));
      const r = await callMulti("/get_info", { method: "POST" });
      expect(r.status).toBe(502);
      expect(((await r.json()) as { error: string }).error).toMatch(/sin red/);
    });

    it("las rutas y métodos prohibidos se rechazan sin consultar ningún nodo", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      expect((await callMulti("/stop_daemon", { method: "POST" })).status).toBe(403);
      expect((await callMulti("/json_rpc", { method: "POST", body: JSON.stringify({ method: "relay_tx" }) })).status).toBe(403);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
