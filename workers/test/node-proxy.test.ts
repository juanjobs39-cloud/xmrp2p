import { describe, expect, it } from "vitest";
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
});
