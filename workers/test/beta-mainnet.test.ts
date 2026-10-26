import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import api from "../src/api/index";
import { signedMessage } from "../src/api/auth";
import type { Env } from "../src/api/env";
import { BASE, newMaker, type Maker, TAKER_MESSAGE } from "./helpers";

// La configuración desplegada solo tiene arbitrum_sepolia. Aquí se llama al Worker con la beta activada,
// como quedaría con ACTIVE_NETWORKS = "arbitrum_sepolia,arbitrum_one".
const envOne = { ...(env as unknown as Env), ACTIVE_NETWORKS: "arbitrum_sepolia,arbitrum_one" } as Env;
// IP propia para no compartir el límite de 30 escrituras por minuto con las demás pruebas.
const IP = { "cf-connecting-ip": "203.0.113.42" };

const call = (path: string, init: RequestInit = {}, e: Env = envOne) =>
  api.fetch(new Request(BASE + path, { ...init, headers: { ...IP, ...(init.headers as Record<string, string>) } }), e);

async function signedCall(maker: Maker, method: string, path: string, body: unknown, e: Env = envOne) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await maker.signMessage({ message: await signedMessage(method, path, maker.address, ts, raw) });
  return call(path, {
    method,
    headers: { "content-type": "application/json", "x-maker-address": maker.address, "x-timestamp": ts, "x-signature": sig },
    body: raw,
  }, e);
}

const offer = (overrides: Record<string, unknown> = {}) => ({
  network: "arbitrum_one",
  price: "300",
  min_usdt: "10",
  max_usdt: "100",
  max_xmr: "1",
  ...overrides,
});

const swap = (offerId: string, usdt: string) =>
  call("/v1/swaps", { method: "POST", body: JSON.stringify({ offer_id: offerId, usdt, taker_message: TAKER_MESSAGE }) });

describe("beta en dinero real: Arbitrum One", () => {
  it("sin activarla en ACTIVE_NETWORKS, arbitrum_one no existe (404)", async () => {
    const off = env as unknown as Env;
    expect((await call("/v1/offers?network=arbitrum_one", {}, off)).status).toBe(404);
    expect((await signedCall(newMaker(), "PUT", "/v1/offers", offer(), off)).status).toBe(404);
  });

  it("activada: aparece en health/networks y deja de ser solo testnet", async () => {
    const h = (await (await call("/v1/health")).json()) as { networks: string[]; testnet_only: boolean };
    expect(h.networks).toEqual(["arbitrum_sepolia", "arbitrum_one"]);
    expect(h.testnet_only).toBe(false);
    expect((await call("/v1/offers?network=arbitrum_one")).status).toBe(200);
  });

  it("acepta ofertas hasta 100 USDT y rechaza max_usdt > 100 con un mensaje claro", async () => {
    const m = newMaker();
    const ok = await signedCall(m, "PUT", "/v1/offers", offer({ max_usdt: "100" }));
    expect(ok.status).toBe(200);
    const id = ((await ok.json()) as { id: string }).id;

    const big = await signedCall(m, "PUT", "/v1/offers", offer({ max_usdt: "100.01" }));
    expect(big.status).toBe(400);
    expect(((await big.json()) as { error: string }).error).toMatch(/max_usdt supera el tope de 100 USDT por swap en arbitrum_one/);

    // La oferta rechazada no modificó la anterior.
    const list = (await (await call("/v1/offers?network=arbitrum_one")).json()) as { offers: { id: string; max_usdt: string }[] };
    expect(list.offers.find((o) => o.id === id)?.max_usdt).toBe("100");
  });

  it("el tope no aplica a la red de pruebas", async () => {
    expect((await signedCall(newMaker(), "PUT", "/v1/offers", offer({ network: "arbitrum_sepolia", max_usdt: "1000" }))).status).toBe(200);
  });

  it("rechaza swaps de más de 100 USDT aunque la oferta en la base diga más", async () => {
    // Una oferta anterior al tope (o escrita a mano) con max_usdt = 1000.
    const id = "beta" + crypto.randomUUID().replaceAll("-", "").slice(0, 20);
    const t = Math.floor(Date.now() / 1000);
    await envOne.DB.prepare(
      "INSERT INTO offers (id, maker, network, price, min_usdt, max_usdt, max_xmr, expires_at, created_at, updated_at)" +
        " VALUES (?, ?, 'arbitrum_one', '300', '10', '1000', '5', ?, ?, ?)",
    )
      .bind(id, newMaker().address.toLowerCase(), t + 600, t, t)
      .run();

    const r = await swap(id, "150");
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toMatch(/el monto supera el tope de 100 USDT por swap en arbitrum_one/);

    // 100 USDT pasa el tope: llega al buzón del maker (desconectado → 409), no a un 400.
    expect((await swap(id, "100")).status).toBe(409);
  });
});
