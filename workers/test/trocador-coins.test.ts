import { env as baseEnv } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/api/index";

const XMR = "4" + "B".repeat(94);
const env = { ...(baseEnv as object), TROCADOR_API_KEY: "k-test", TROCADOR_WEBHOOK_KEY: "wh-test", TROCADOR_LIMITER: undefined } as never;
let ip = 100;
const call = (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("cf-connecting-ip", `10.1.0.${++ip}`);
  return worker.fetch(new Request("https://api.test" + path, { ...init, headers }) as never, env);
};

function mockTrocador() {
  const seen: URL[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const u = new URL(String(input instanceof Request ? input.url : input));
    seen.push(u);
    if (u.hostname === "static.coinpaprika.com") return new Response("<svg xmlns='http://www.w3.org/2000/svg'/>", { headers: { "content-type": "image/svg+xml" } });
    if (u.hostname === "exolix.com") return new Response("<html>no</html>", { headers: { "content-type": "text/html" } });
    if (u.pathname === "/coins")
      return Response.json([
        { name: "Bitcoin", ticker: "btc", network: "Mainnet", memo: false, minimum: 0.0001, maximum: 20 },
        { name: "Tether (TON)", ticker: "usdt", network: "TON", memo: true, minimum: 5, maximum: 100000 },
        { name: "Monero", ticker: "xmr", network: "Mainnet", memo: false, minimum: 0.01, maximum: 3000 },
      ]);
    if (u.pathname === "/new_rate") return Response.json({ trade_id: "rateBTC", quotes: { quotes: [{ provider: "P", amount_to: "1.5", kycrating: "A", fixed: "False" }] } });
    if (u.pathname === "/new_trade")
      return Response.json({ trade_id: "trBTC", ticker_from: "btc", network_from: "Mainnet", provider: "P", status: "waiting", amount_from: "0.01", amount_to: "1.5", address_provider: "bc1qdeposit", fixed: "False" });
    return new Response("{}", { status: 404 });
  });
  return seen;
}

describe("Trocador con otras monedas", () => {
  afterEach(() => vi.restoreAllMocks());

  it("cotiza BTC → XMR con el ticker y la red pedidos", async () => {
    const seen = mockTrocador();
    const r = (await (await call("/v1/trocador/rates?amount=0.01&ticker=btc&network=Mainnet")).json()) as Record<string, unknown>;
    expect(r).toMatchObject({ rate_id: "rateBTC", ticker: "btc", network: "Mainnet" });
    const q = seen.find((u) => u.pathname === "/new_rate")!.searchParams;
    expect([q.get("ticker_from"), q.get("network_from"), q.get("ticker_to"), q.get("network_to"), q.get("amount_from")]).toEqual(["btc", "Mainnet", "xmr", "Mainnet", "0.01"]);
  });

  it("sin moneda usa USDT en Arbitrum (compatibilidad)", async () => {
    const seen = mockTrocador();
    await call("/v1/trocador/rates?usdt=50");
    expect([seen[0]!.searchParams.get("ticker_from"), seen[0]!.searchParams.get("network_from")]).toEqual(["usdt", "Arbitrum"]);
  });

  it("publica la lista de monedas sin XMR y la pide a Trocador una sola vez", async () => {
    const seen = mockTrocador();
    const a = (await (await call("/v1/trocador/coins")).json()) as { ticker: string; memo: boolean }[];
    await call("/v1/trocador/coins");
    expect(a.map((c) => c.ticker)).toEqual(["btc", "usdt"]);
    expect(a[1]!.memo).toBe(true);
    expect(seen.filter((u) => u.pathname === "/coins").length).toBeLessThanOrEqual(1);
  });

  it("sirve íconos solo de sitios permitidos, con CSP que bloquea scripts", async () => {
    mockTrocador();
    const ok = await call("/v1/trocador/img?u=" + encodeURIComponent("https://static.coinpaprika.com/coin/ada-cardano/logo.svg"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/svg+xml");
    expect(ok.headers.get("content-security-policy")).toContain("sandbox");
    expect((await call("/v1/trocador/img?u=" + encodeURIComponent("https://evil.example/x.svg"))).status).toBe(400);
    expect((await call("/v1/trocador/img?u=" + encodeURIComponent("http://trocador.app/x.svg"))).status).toBe(400);
    expect((await call("/v1/trocador/img?u=" + encodeURIComponent("https://exolix.com/icons/x.png"))).status).toBe(502);
  });

  it("rechaza monedas fuera de la lista", async () => {
    mockTrocador();
    expect((await call("/v1/trocador/rates?amount=1&ticker=shib&network=ERC20")).status).toBe(400);
  });

  it("crea un intercambio BTC con reembolso no EVM y devuelve la moneda", async () => {
    const seen = mockTrocador();
    const post = (refund: string) =>
      call("/v1/trocador/trades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rate_id: "rateBTC", provider: "P", fixed: false, amount: "0.01", ticker: "btc", network: "Mainnet", address: XMR, refund }),
      });
    expect((await post("0x123")).status).toBe(400);
    const r = await post("bc1qrefundaddress0000000000");
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ trade_id: "trBTC", ticker_from: "btc", network_from: "Mainnet", address_provider: "bc1qdeposit" });
    const p = seen.find((u) => u.pathname === "/new_trade")!.searchParams;
    expect([p.get("ticker_from"), p.get("network_from"), p.get("refund")]).toEqual(["btc", "Mainnet", "bc1qrefundaddress0000000000"]);
  });
});
