import { env as baseEnv } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/api/index";
import { parseQuotes, statusGap, unixTime } from "../src/api/trocador";

const XMR = "4" + "A".repeat(94);
const env = { ...(baseEnv as object), TROCADOR_API_KEY: "k-test", TROCADOR_WEBHOOK_KEY: "wh-test", TROCADOR_LIMITER: undefined } as never;
let ip = 0;
const call = (path: string, init: RequestInit = {}, e = env) => {
  const headers = new Headers(init.headers);
  if (!headers.has("cf-connecting-ip")) headers.set("cf-connecting-ip", `10.0.0.${++ip}`);
  return worker.fetch(new Request("https://api.test" + path, { ...init, headers }) as never, e);
};

function mockTrocador() {
  const seen: URL[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const u = new URL(String(input instanceof Request ? input.url : input));
    seen.push(u);
    expect(new Headers(init?.headers).get("API-Key")).toBe("k-test");
    if (u.pathname === "/new_rate")
      return Response.json({
        trade_id: "rate123",
        quotes: { quotes: [
          { provider: "Slow", amount_to: "0.1", kycrating: "B", fixed: "False", waste: "2.1" },
          { provider: "Best", amount_to: "0.12", kycrating: "A", fixed: "True", waste: "0.9", eta: 15 },
        ] },
      });
    if (u.pathname === "/new_trade")
      return Response.json({ trade_id: "tr1", provider: "Best", status: "waiting", amount_from: 50, amount_to: 0.12, address_provider: "0xdeposit", fixed: "True" });
    if (u.pathname === "/trade") return Response.json([{ trade_id: "tr1", status: "finished", quotes: { expiresAt: "2026-11-03 12:30:00.287403+00:00" } }]);
    return new Response("{}", { status: 404 });
  });
  return { seen, spy };
}

describe("Trocador", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normaliza y ordena las cotizaciones", () => {
    const q = parseQuotes([{ provider: "a", amount_to: "1", kycrating: "A", fixed: "True" }, { provider: "b", amount_to: "2" }, { amount_to: "3" }]);
    expect(q.map((x) => x.provider)).toEqual(["b", "a"]);
    expect(q[1]!.fixed).toBe(true);
    expect(parseQuotes(null)).toEqual([]);
  });

  it("entiende las fechas de vencimiento de Trocador", () => {
    expect(unixTime("2026-11-03 12:30:00")).toBe(Date.UTC(2026, 10, 3, 12, 30) / 1000);
    expect(unixTime("2026-11-03T12:30:00+00:00")).toBe(Date.UTC(2026, 10, 3, 12, 30) / 1000);
    expect(unixTime(1793700000)).toBe(1793700000);
    expect(unixTime("2026-11-03 03:56:04.287403+00:00")).toBe(1793678164); // formato real de Trocador
    expect(unixTime(1793700000123)).toBe(1793700000);
    expect(unixTime("1793700000")).toBe(1793700000);
    expect(unixTime("mañana")).toBe(0);
    expect(unixTime(undefined)).toBe(0);
  });

  it("sin llave las rutas responden 503", async () => {
    const r = await call("/v1/trocador/rates?usdt=50", {}, { ...(baseEnv as object) } as never);
    expect(r.status).toBe(503);
  });

  it("cotiza una vez y reutiliza la caché para el mismo usuario y monto", async () => {
    const { seen } = mockTrocador();
    const h = { "cf-connecting-ip": "1.2.3.4" };
    const a = (await (await call("/v1/trocador/rates?usdt=50", { headers: h })).json()) as { rate_id: string; quotes: { provider: string }[] };
    expect(a.rate_id).toBe("rate123");
    expect(a.quotes[0]!.provider).toBe("Best");
    const q = seen[0]!.searchParams;
    expect([q.get("ticker_from"), q.get("network_from"), q.get("ticker_to"), q.get("network_to"), q.get("amount_from"), q.get("markup")]).toEqual(["usdt", "Arbitrum", "xmr", "Mainnet", "50", "0"]);
    await call("/v1/trocador/rates?usdt=50", { headers: h });
    expect(seen.filter((u) => u.pathname === "/new_rate")).toHaveLength(1);
  });

  it("crea el intercambio, guarda los datos exigidos y no los expone", async () => {
    const { seen } = mockTrocador();
    const r = await call("/v1/trocador/trades", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "5.6.7.8", "accept-language": "es-MX", "user-agent": "Prueba/1.0" },
      body: JSON.stringify({ rate_id: "rate123", provider: "Best", fixed: true, usdt: "50", address: XMR }),
    });
    expect(r.status).toBe(200);
    const t = (await r.json()) as Record<string, unknown>;
    expect(t).toMatchObject({ trade_id: "tr1", address_provider: "0xdeposit", status: "waiting", amount_from: "50", amount_to: "0.12", expires_at: Date.UTC(2026, 10, 3, 12, 30) / 1000 });
    expect(JSON.stringify(t)).not.toContain("5.6.7.8");
    const p = seen.find((u) => u.pathname === "/new_trade")!.searchParams;
    expect([p.get("id"), p.get("provider"), p.get("fixed"), p.get("address"), p.get("webhook_key")]).toEqual(["rate123", "Best", "True", XMR, "wh-test"]);
    const row = await (baseEnv as { DB: D1Database }).DB.prepare("SELECT ip, lang, user_agent FROM trocador_trades WHERE trade_id='tr1'").first();
    expect(row).toEqual({ ip: "5.6.7.8", lang: "es-MX", user_agent: "Prueba/1.0" });

    const s = (await (await call("/v1/trocador/trades/tr1")).json()) as Record<string, unknown>;
    expect(s.status).toBe("waiting");
    expect(JSON.stringify(s)).not.toContain("5.6.7.8");
  });

  it("valida la dirección de Monero y la de reembolso", async () => {
    mockTrocador();
    const post = (body: object) => call("/v1/trocador/trades", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const base = { rate_id: "rate123", provider: "Best", fixed: false, usdt: "50", address: XMR };
    expect((await post({ ...base, address: "nope" })).status).toBe(400);
    expect((await post({ ...base, refund: "0x123" })).status).toBe(400);
  });

  it("el webhook exige la clave y actualiza el estado", async () => {
    mockTrocador();
    await call("/v1/trocador/trades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rate_id: "rate123", provider: "Best", fixed: true, usdt: "50", address: XMR }),
    });
    const hook = (key: string) => call("/v1/trocador/webhook", { method: "POST", headers: { "webhook-key": key, "content-type": "application/json" }, body: JSON.stringify({ trade_id: "tr1", status: "finished", details: { hashout: "ab12cd34ef56" } }) });
    expect((await hook("mala")).status).toBe(401);
    expect((await hook("wh-test")).status).toBe(200);
    const s = (await (await call("/v1/trocador/trades/tr1")).json()) as Record<string, unknown>;
    // El webhook no trae el vencimiento: se conserva el que ya teníamos, y llega el hash del pago.
    expect(s).toMatchObject({ status: "finished", address_provider: "0xdeposit", hashout: "ab12cd34ef56", expires_at: Date.UTC(2026, 10, 3, 12, 30) / 1000 });
  });

  it("consulta de respaldo: cada 90 s las primeras 3 horas, luego cada 10 min", () => {
    expect(statusGap(0, 60_000)).toBe(90_000);
    expect(statusGap(0, 3 * 3600_000 - 1)).toBe(90_000);
    expect(statusGap(0, 3 * 3600_000)).toBe(600_000);
  });

  it("sin webhook pregunta a Trocador una sola vez aunque haya varias pestañas", async () => {
    const { seen } = mockTrocador();
    await call("/v1/trocador/trades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rate_id: "rate123", provider: "Best", fixed: true, usdt: "50", address: XMR }),
    });
    const DB = (baseEnv as { DB: D1Database }).DB;
    // Hace 2 minutos que no hay noticias (ni webhook ni consulta).
    await DB.prepare("UPDATE trocador_trades SET status='waiting', updated_at = ?1 WHERE trade_id='tr1'").bind(Date.now() - 120_000).run();
    const before = seen.filter((u) => u.pathname === "/trade").length;
    const [a, b] = await Promise.all([call("/v1/trocador/trades/tr1"), call("/v1/trocador/trades/tr1")]);
    const statuses = [((await a.json()) as { status: string }).status, ((await b.json()) as { status: string }).status];
    expect(seen.filter((u) => u.pathname === "/trade").length - before).toBe(1);
    expect(statuses).toContain("finished");
    // Recién consultado: no vuelve a preguntar.
    await DB.prepare("UPDATE trocador_trades SET status='waiting' WHERE trade_id='tr1'").run();
    await call("/v1/trocador/trades/tr1");
    expect(seen.filter((u) => u.pathname === "/trade").length - before).toBe(1);
  });

  it("registra cada webhook", async () => {
    mockTrocador();
    await call("/v1/trocador/trades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rate_id: "rate123", provider: "Best", fixed: true, usdt: "50", address: XMR }),
    });
    await (baseEnv as { DB: D1Database }).DB.prepare("UPDATE trocador_trades SET hooks = NULL WHERE trade_id='tr1'").run();
    for (const status of ["confirming", "sending"])
      await call("/v1/trocador/webhook", { method: "POST", headers: { "webhook-key": "wh-test", "content-type": "application/json" }, body: JSON.stringify({ trade_id: "tr1", status }) });
    const row = await (baseEnv as { DB: D1Database }).DB.prepare("SELECT hooks FROM trocador_trades WHERE trade_id='tr1'").first<{ hooks: string }>();
    expect(row!.hooks).toMatch(/^confirming@\d+;sending@\d+;$/);
  });
});
