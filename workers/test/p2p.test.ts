import { env as baseEnv } from "cloudflare:workers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedMessage } from "../src/api/auth";
import worker from "../src/api/index";
import { sweepOrders } from "../src/api/p2p/orders";
import { sendAdAlerts } from "../src/api/p2p/alerts";
import { setupWebhook } from "../src/api/p2p/telegram";

// Llaves generadas en cada corrida: ninguna llave privada vive en el repositorio.
const newKey = () => privateKeyToAccount(generatePrivateKey());
type Key = ReturnType<typeof newKey>;
const admin = newKey();
const ARBITER = "arb-" + crypto.randomUUID();
const env = {
  ...(baseEnv as object),
  P2P_ENABLED: "on",
  P2P_XMR_NETWORK: "stagenet",
  P2P_ADMIN_ADDRESS: admin.address,
  P2P_ARBITER_TOKEN: ARBITER,
  WRITE_LIMITER: undefined,
  READ_LIMITER: undefined,
} as never;
const DB = (baseEnv as unknown as { DB: D1Database }).DB;

const STAGENET = (c: string) => "5" + c.repeat(94);
const MAINNET = "4" + "A".repeat(94);
const TXID = (c: string) => c.repeat(64);

let ip = 0;
async function call(path: string, init: RequestInit = {}, e = env) {
  const headers = new Headers(init.headers);
  headers.set("cf-connecting-ip", `10.1.0.${++ip % 250}`);
  const r = await worker.fetch(new Request("https://api.test" + path, { ...init, headers }) as never, e);
  const body = (await r.json().catch(() => null)) as Record<string, any>;
  return { status: r.status, body };
}

async function signed(key: Key, method: string, path: string, body?: unknown, e = env) {
  // Como hará la app: un nonce al azar para que dos peticiones iguales no tengan la misma firma.
  const withNonce = body && typeof body === "object" ? { ...body, nonce: crypto.randomUUID() } : body;
  const raw = withNonce === undefined ? "" : JSON.stringify(withNonce);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = await key.signMessage({ message: await signedMessage(method, path.split("?")[0]!, key.address, ts, raw) });
  return call(path, { method, body: raw || undefined, headers: { "content-type": "application/json", "x-maker-address": key.address, "x-timestamp": ts, "x-signature": signature } }, e);
}

const arbiter = (path: string, body?: unknown) =>
  call(path, { method: body === undefined ? "GET" : "POST", body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: `Bearer ${ARBITER}` } });

let n = 0;
async function newUser(e = env): Promise<Key> {
  const k = newKey();
  const r = await signed(k, "PUT", "/v1/p2p/me", { nickname: `user_${++n}_${k.address.slice(2, 8)}`, enc_pubkey: "02" + "ab".repeat(32) }, e);
  expect(r.status).toBe(201);
  return k;
}

/** Precio de XMR: 200 USD. Tipo de cambio: 1 USD = 20 MXN → 4000 MXN por XMR. */
function mockPrices() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const u = String(input instanceof Request ? input.url : input);
    if (u.includes("kraken")) return Response.json({ error: [], result: { XMRUSDT: { c: ["200"] } } });
    if (u.includes("kucoin")) return Response.json({ data: { price: "200" } });
    if (u.includes("mexc")) return Response.json({ price: "200" });
    if (u.includes("huobi")) return Response.json({ tick: { close: 200 } });
    if (u.includes("coingecko")) return Response.json({ monero: { usd: 200 } });
    if (u.includes("open.er-api")) return Response.json({ result: "success", rates: { USD: 1, MXN: 20, EUR: 0.9 } });
    return new Response("no", { status: 404 });
  });
}

const sellAd = (over: Record<string, unknown> = {}) => ({
  side: "sell",
  fiat: "MXN",
  country: "MX",
  price_type: "fixed",
  price: "4000",
  min_fiat: "100",
  max_fiat: "10000",
  amount_xmr: "2",
  methods: [{ kind: "bank", name: "SPEI", country: "MX" }, { kind: "wallet", name: "PayPal" }],
  pay_window_min: 15,
  terms: "Solo cuentas a mi nombre",
  min_orders_reversible: 3,
  xmr_address: STAGENET("S"),
  ...over,
});

/** Lleva una orden hasta «esperando pago» como lo haría el árbitro. */
async function fund(orderId: string) {
  expect((await arbiter(`/v1/p2p/arbiter/orders/${orderId}/escrow`, { multisig_address: STAGENET("M") })).body.status).toBe("awaiting_deposit");
  expect((await arbiter(`/v1/p2p/arbiter/orders/${orderId}/deposit`, { txid: TXID("a") })).body.status).toBe("confirming");
  const o = (await signed(admin, "GET", `/v1/p2p/admin/orders/${orderId}`)).body.order;
  expect((await arbiter(`/v1/p2p/arbiter/orders/${orderId}/confirmed`, { amount_xmr: o.deposit_required_xmr })).body.status).toBe("awaiting_payment");
}

beforeEach(mockPrices);
afterEach(() => vi.restoreAllMocks());

describe("P2P Fiat", () => {
  it("está apagado si P2P_ENABLED no es «on»", async () => {
    const r = await call("/v1/p2p/config", {}, { ...(env as object), P2P_ENABLED: "" } as never);
    expect(r.status).toBe(404);
  });

  it("catálogo: config, monedas, métodos sugeridos y precio en fiat", async () => {
    const cfg = await call("/v1/p2p/config");
    expect(cfg.body).toMatchObject({ xmr_network: "stagenet", fee_bps: 50, cap_usd: 1000 });
    const f = await call("/v1/p2p/fiats");
    expect(f.body.popular.slice(0, 3)).toEqual(["MXN", "USD", "EUR"]);
    expect(f.body.all.length).toBeGreaterThan(140);
    const m = await call("/v1/p2p/methods?fiat=mxn");
    expect(m.body.suggested.map((x: { name: string }) => x.name)).toContain("SPEI");
    expect(m.body.suggested.find((x: { name: string }) => x.name === "Mercado Pago").reversible).toBe(true);
    const p = await call("/v1/p2p/price?fiat=MXN");
    expect(p.body.price).toBe(4000);
    expect(p.body.sources.length).toBeGreaterThanOrEqual(2);
    expect((await call("/v1/p2p/price?fiat=XXX")).status).toBe(400);
  });

  it("perfil: apodo único y firma que no se puede repetir", async () => {
    const k = newKey();
    const body = { nickname: "repetido_" + k.address.slice(2, 8), enc_pubkey: "03" + "cd".repeat(32) };
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = await k.signMessage({ message: await signedMessage("PUT", "/v1/p2p/me", k.address, ts, JSON.stringify(body)) });
    const send = () => call("/v1/p2p/me", { method: "PUT", body: JSON.stringify(body), headers: { "x-maker-address": k.address, "x-timestamp": ts, "x-signature": sig } });
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(409); // misma firma otra vez
    const other = newKey();
    expect((await signed(other, "PUT", "/v1/p2p/me", body)).status).toBe(409); // apodo ocupado
    expect((await signed(other, "PUT", "/v1/p2p/me", { ...body, nickname: "a<b" })).status).toBe(400);
  });

  it("anuncios: validación, métodos libres y lista ordenada por precio", async () => {
    const seller = await newUser();
    expect((await signed(seller, "POST", "/v1/p2p/ads", sellAd({ xmr_address: MAINNET }))).status).toBe(400); // red equivocada
    expect((await signed(seller, "POST", "/v1/p2p/ads", sellAd({ fiat: "ZZZ" }))).status).toBe(400);
    const cheap = await signed(seller, "POST", "/v1/p2p/ads", sellAd({ price: "3900", methods: [{ kind: "bank", name: "Banorte", country: "mx" }] }));
    expect(cheap.status).toBe(201);
    expect(cheap.body.methods[0]).toEqual({ kind: "bank", name: "Banorte", country: "MX", reversible: false });
    const float = await signed(seller, "POST", "/v1/p2p/ads", sellAd({ price_type: "float", price: undefined, margin_pct: 2 }));
    expect(float.body.price).toBe(4080);
    expect(float.body.methods[1].reversible).toBe(true); // PayPal siempre es reversible

    const list = await call("/v1/p2p/ads?side=sell&fiat=MXN&country=MX");
    const mine = list.body.ads.filter((a: { user_id: string }) => a.user_id === seller.address.toLowerCase());
    expect(mine.map((a: { price: number }) => a.price)).toEqual([3900, 4080]);
    expect(mine[0].user.nickname).toMatch(/^user_/);
    const filtered = await call("/v1/p2p/ads?side=sell&fiat=MXN&method=banorte");
    expect(filtered.body.ads.every((a: { methods: { name: string }[] }) => a.methods.some((m) => m.name === "Banorte"))).toBe(true);

    const paused = await signed(seller, "PATCH", `/v1/p2p/ads/${cheap.body.id}`, { status: "paused" });
    expect(paused.body.status).toBe("paused");
  });

  it("orden completa: escrow, depósito, «Ya pagué», liberar, pago y calificación", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;

    expect((await signed(seller, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "1000", xmr_address: STAGENET("B") })).status).toBe(400); // su propio anuncio
    const created = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "1000", method_index: 0, xmr_address: STAGENET("B") });
    expect(created.status).toBe(201);
    const o = created.body;
    expect(o).toMatchObject({ role: "buyer", status: "setup", xmr: "0.25", fee_xmr: "0.00125", price: "4000.00" });
    expect(o.deposit_required_xmr).toBe("0.25135"); // monto + 0.5 % + reserva para la comisión de red
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("1.75");

    // Nadie ajeno puede ver la orden.
    expect((await signed(newKey(), "GET", `/v1/p2p/orders/${o.id}`)).status).toBe(403);
    // El comprador no puede marcar pagado antes de que el escrow tenga fondos.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/paid`, {})).status).toBe(409);

    // Antes de que el XMR esté bloqueado no hay chat ni datos de pago (nadie puede pedir pagar sin escrow);
    // los mensajes del protocolo del escrow sí pasan.
    expect((await signed(seller, "POST", `/v1/p2p/orders/${o.id}/messages`, { ciphertext: "paga ya" })).status).toBe(409);
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/messages`, { ciphertext: "hola" })).status).toBe(409);
    expect((await signed(seller, "POST", `/v1/p2p/orders/${o.id}/payment-details`, { enc_payment: "cifrado:" + "z".repeat(20) })).status).toBe(409);
    expect((await signed(seller, "POST", `/v1/p2p/orders/${o.id}/messages`, { protocol: { step: "kex", round: 0, hex: "abc" } })).status).toBe(201);

    const t1 = (await arbiter("/v1/p2p/arbiter/tasks")).body.tasks.find((t: { order_id: string }) => t.order_id === o.id);
    expect(t1.task).toBe("setup_escrow");
    await fund(o.id);
    const funded = (await signed(buyer, "GET", `/v1/p2p/orders/${o.id}`)).body;
    expect(funded.status).toBe("awaiting_payment");
    expect(funded.deadline_at - funded.funded_at).toBe(15 * 60);

    // Con el XMR bloqueado: datos de pago cifrados (los manda el vendedor y solo los ve el comprador) y chat.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/payment-details`, { enc_payment: "x".repeat(20) })).status).toBe(403);
    await signed(seller, "POST", `/v1/p2p/orders/${o.id}/payment-details`, { enc_payment: "cifrado:" + "z".repeat(20) });
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${o.id}`)).body.enc_payment).toMatch(/^cifrado:/);
    expect((await signed(seller, "GET", `/v1/p2p/orders/${o.id}`)).body.enc_payment).toBeUndefined();
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/messages`, { ciphertext: "hola" })).status).toBe(201);

    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/paid`, {})).body.status).toBe("paid");
    // Después de «Ya pagué» el comprador ya no puede cancelar, ni el vendedor.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/cancel`, {})).status).toBe(409);
    expect((await signed(seller, "POST", `/v1/p2p/orders/${o.id}/cancel`, {})).status).toBe(409);
    // Queja antes de tiempo.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/dispute`, { reason: "no libera" })).status).toBe(409);
    // Solo el vendedor libera.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/release`, {})).status).toBe(403);
    expect((await signed(seller, "POST", `/v1/p2p/orders/${o.id}/release`, {})).body.status).toBe("releasing");

    const task = (await arbiter("/v1/p2p/arbiter/tasks")).body.tasks.find((t: { order_id: string }) => t.order_id === o.id);
    expect(task).toMatchObject({ task: "release", to: STAGENET("B"), xmr_pico: "250000000000", fee_pico: "1250000000" });
    expect(task.authorization.address).toBe(seller.address.toLowerCase());
    expect(task.authorization.signature).toMatch(/^0x/);

    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/payout`, { txid: TXID("b") })).body.status).toBe("released");
    const sellerProfile = (await call(`/v1/p2p/users/${seller.address}`)).body;
    expect(sellerProfile).toMatchObject({ orders_done: 1, completion_pct: 100 });
    expect(sellerProfile.avg_release_min).not.toBeNull();

    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/feedback`, { positive: true, comment: "rápido" })).status).toBe(200);
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/feedback`, { positive: true })).status).toBe(409);
    expect((await call(`/v1/p2p/users/${seller.address}`)).body.positive).toBe(1);

    // La línea de tiempo queda en el chat de la orden.
    const msgs = (await signed(buyer, "GET", `/v1/p2p/orders/${o.id}/messages`)).body.messages;
    expect(msgs.filter((m: { from: string }) => m.from === "system").map((m: { body: { status?: string } }) => m.body.status).filter(Boolean)).toEqual([
      "setup", "awaiting_deposit", "confirming", "awaiting_payment", "paid", "releasing", "released",
    ]);
  });

  it("cancelar antes del depósito devuelve el XMR al anuncio y cuenta en contra de quien cancela", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const o = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "2000", xmr_address: STAGENET("B") })).body;
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("1.5");
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/cancel`, {})).body.status).toBe("cancelled");
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("2");
    expect((await call(`/v1/p2p/users/${buyer.address}`)).body).toMatchObject({ orders_done: 0, completion_pct: 0 });
    // Un depósito que llega tarde se devuelve al vendedor.
    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/deposit`, { txid: TXID("c") })).body.status).toBe("refunding");
    const task = (await arbiter("/v1/p2p/arbiter/tasks")).body.tasks.find((t: { order_id: string }) => t.order_id === o.id);
    expect(task).toMatchObject({ task: "refund", to: STAGENET("S"), reason: "late_deposit" });
  });

  it("tiempos agotados: sin depósito se cancela; sin pago se devuelve al vendedor", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const a = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "500", xmr_address: STAGENET("B") })).body;
    const b = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "500", xmr_address: STAGENET("B") })).body;
    await fund(b.id);
    await DB.prepare("UPDATE p2p_orders SET deadline_at = 1 WHERE id IN (?, ?)").bind(a.id, b.id).run();
    expect(await sweepOrders(env)).toBeGreaterThanOrEqual(2);
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${a.id}`)).body).toMatchObject({ status: "cancelled", cancel_reason: "timeout_deposit" });
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${b.id}`)).body).toMatchObject({ status: "refunding", cancel_reason: "timeout_payment" });
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("2");
  });

  it("queja: el administrador decide y el árbitro paga al ganador", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const o = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "1000", xmr_address: STAGENET("B") })).body;
    await fund(o.id);
    await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/paid`, {});
    await DB.prepare("UPDATE p2p_orders SET paid_at = paid_at - 3600 WHERE id = ?").bind(o.id).run();
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/dispute`, { reason: "Pagué por SPEI y no libera" })).body.status).toBe("disputed");

    // Chat cifrado: las partes escriben, alguien ajeno no.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/messages`, { ciphertext: "hola-cifrado" })).status).toBe(201);
    expect((await signed(newKey(), "POST", `/v1/p2p/orders/${o.id}/messages`, { ciphertext: "x" })).status).toBe(403);

    // Solo el administrador ve y resuelve quejas.
    expect((await signed(buyer, "GET", "/v1/p2p/admin/disputes")).status).toBe(403);
    const list = (await signed(admin, "GET", "/v1/p2p/admin/disputes")).body.disputes;
    expect(list.some((d: { order_id: string; opened_by: string }) => d.order_id === o.id && d.opened_by === "buyer")).toBe(true);
    const open = (await signed(admin, "GET", "/v1/p2p/admin/orders?status=open")).body.orders;
    expect(open.some((x: { id: string; status: string }) => x.id === o.id && x.status === "disputed")).toBe(true);
    expect((await signed(admin, "GET", `/v1/p2p/admin/orders?q=${buyer.address.toLowerCase()}`)).body.orders.map((x: { id: string }) => x.id)).toContain(o.id);
    expect((await signed(buyer, "GET", "/v1/p2p/admin/orders")).status).toBe(403);
    const detail = (await signed(admin, "GET", `/v1/p2p/admin/orders/${o.id}`)).body;
    expect(detail.messages.some((m: { body: { ciphertext?: string } }) => m.body.ciphertext === "hola-cifrado")).toBe(true);

    expect((await signed(admin, "POST", `/v1/p2p/admin/orders/${o.id}/resolve`, { winner: "buyer", note: "comprobante válido" })).body.status).toBe("resolving");
    const task = (await arbiter("/v1/p2p/arbiter/tasks")).body.tasks.find((t: { order_id: string }) => t.order_id === o.id);
    expect(task).toMatchObject({ task: "resolve", winner: "buyer", to: STAGENET("B") });
    expect(task.authorization.address).toBe(admin.address.toLowerCase());
    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/payout`, { txid: TXID("d") })).body.status).toBe("resolved_buyer");
    expect((await call(`/v1/p2p/users/${seller.address}`)).body).toMatchObject({ orders_done: 0, completion_pct: 0 });
  });

  it("tope de 1,000 USD por orden y métodos reversibles con historial mínimo", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ max_fiat: "50000", amount_xmr: "10" }))).body;
    // 4000 MXN/XMR y 200 USD/XMR: 20,100 MXN ≈ 5.025 XMR ≈ 1,005 USD.
    const big = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "20100", xmr_address: STAGENET("B") });
    expect(big.status).toBe(400);
    expect(big.body.error).toMatch(/1000 USD/);
    const paypal = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "500", method_index: 1, xmr_address: STAGENET("B") });
    expect(paypal.status).toBe(403);
    expect((await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "500", method_index: 0, xmr_address: MAINNET })).status).toBe(400);
  });

  it("administrador: ajustes, métodos bloqueados y suspensión de usuarios", async () => {
    expect((await signed(newKey(), "GET", "/v1/p2p/admin/stats")).status).toBe(403);
    const s = await signed(admin, "PUT", "/v1/p2p/admin/settings", { blocked_methods: ["Western Union"] });
    expect(s.body.blocked_methods).toBe('["Western Union"]');
    expect((await signed(admin, "PUT", "/v1/p2p/admin/settings", { fee_bps: 5000 })).status).toBe(400);

    const seller = await newUser();
    const blocked = await signed(seller, "POST", "/v1/p2p/ads", sellAd({ methods: [{ kind: "cash", name: "western union" }] }));
    expect(blocked.status).toBe(400);
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    expect((await signed(admin, "POST", `/v1/p2p/admin/users/${seller.address.toLowerCase()}/ban`, { banned: true })).body.banned).toBe(true);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.status).toBe("paused");
    expect((await signed(seller, "POST", "/v1/p2p/ads", sellAd())).status).toBe(403);

    const stats = (await signed(admin, "GET", "/v1/p2p/admin/stats")).body;
    expect(stats.users).toBeGreaterThan(0);
    await signed(admin, "PUT", "/v1/p2p/admin/settings", { blocked_methods: [] });
  });

  it("árbitro: lee el protocolo de la orden y guarda su estado cifrado", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const o = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "300", xmr_address: STAGENET("B") })).body;
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/messages`, { protocol: { step: "kex", round: 0, hex: "abc" } })).status).toBe(201);
    const msgs = (await arbiter(`/v1/p2p/arbiter/orders/${o.id}/messages`)).body.messages;
    expect(msgs.find((m: { from: string; body: { type: string } }) => m.from === "buyer" && m.body.type === "protocol").body.data).toEqual({ step: "kex", round: 0, hex: "abc" });
    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/state`)).status).toBe(404);
    const put = await call(`/v1/p2p/arbiter/orders/${o.id}/state`, { method: "PUT", body: '{"v":1,"iv":"x","ct":"y"}', headers: { authorization: `Bearer ${ARBITER}` } });
    expect(put.status).toBe(200);
    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/state`)).body).toEqual({ v: 1, iv: "x", ct: "y" });
    expect((await call(`/v1/p2p/arbiter/orders/${o.id}/state`)).status).toBe(401);
    const tasks = (await arbiter("/v1/p2p/arbiter/tasks")).body;
    expect(tasks.admin_address).toBe(admin.address.toLowerCase());
  });

  it("en línea: latido, anunciantes desconectados al final y sin poder tomar su anuncio", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ fiat: "EUR", country: null, price: "180" }))).body;
    const list = async (q = "") => (await call(`/v1/p2p/ads?side=sell&fiat=EUR${q}`)).body.ads.find((a: { id: string }) => a.id === ad.id);
    expect((await list()).user.online).toBe(true);
    await DB.prepare("UPDATE p2p_users SET last_seen = ? WHERE id = ?").bind(Math.floor(Date.now() / 1000) - 3600, seller.address.toLowerCase()).run();
    expect((await list()).user.online).toBe(false);
    expect(await list("&online=1")).toBeUndefined();
    const r = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "100", xmr_address: STAGENET("B") });
    expect(r.status).toBe(409);
    expect((await signed(seller, "POST", "/v1/p2p/me/ping", {})).body).toEqual({ ok: true });
    expect((await list("&online=1")).user.online).toBe(true);
    expect((await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "100", xmr_address: STAGENET("B") })).status).toBe(201);
  });

  it("los anuncios de quien lleva más de 24 h desconectado no salen en el mercado y vuelven al reconectarse", async () => {
    const seller = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ fiat: "EUR", country: null, price: "181" }))).body;
    const list = async () => (await call("/v1/p2p/ads?side=sell&fiat=EUR")).body.ads.find((a: { id: string }) => a.id === ad.id);
    const ago = (h: number) => DB.prepare("UPDATE p2p_users SET last_seen = ? WHERE id = ?").bind(Math.floor(Date.now() / 1000) - h * 3600, seller.address.toLowerCase()).run();
    await ago(23);
    expect(await list()).toBeDefined();
    await ago(25);
    expect(await list()).toBeUndefined();
    await signed(seller, "POST", "/v1/p2p/me/ping", {});
    expect(await list()).toBeDefined();
  });

  it("2 depósitos vencidos en 24 h pausan los anuncios de venta; el tiempo de depósito cuenta en la reputación", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const open = async () => (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "200", xmr_address: STAGENET("B") })).body;
    const a = await open();
    const b = await open();
    const c = await open();
    await fund(c.id);
    expect((await call(`/v1/p2p/users/${seller.address}`)).body.avg_deposit_min).not.toBeNull();
    await DB.prepare("UPDATE p2p_orders SET deadline_at = 1 WHERE id = ?").bind(a.id).run();
    await sweepOrders(env);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.status).toBe("active");
    await DB.prepare("UPDATE p2p_orders SET deadline_at = 1 WHERE id = ?").bind(b.id).run();
    await sweepOrders(env);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body).toMatchObject({ status: "paused", paused_reason: "missed_deposits" });
    const re = await signed(seller, "PATCH", `/v1/p2p/ads/${ad.id}`, { status: "active" });
    expect(re.body).toMatchObject({ status: "active", paused_reason: null });
  });

  // ---------- Solicitudes con el anunciante fuera de línea ----------

  const away = (k: Key, secs: number) => DB.prepare("UPDATE p2p_users SET last_seen = ? WHERE id = ?").bind(Math.floor(Date.now() / 1000) - secs, k.address.toLowerCase()).run();

  it("solicitudes: con el anunciante fuera de línea la orden espera a que acepte", async () => {
    const seller = await newUser();
    const buyer = await newUser();
    const plain = (await signed(seller, "POST", "/v1/p2p/ads", sellAd())).body;
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 3 }))).body;
    expect(ad.request_window_h).toBe(3);
    expect((await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 2 }))).status).toBe(400);
    await away(seller, 3600);
    // Sin solicitudes: igual que antes.
    expect((await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: plain.id, fiat_amount: "400", xmr_address: STAGENET("B") })).status).toBe(409);
    const t0 = Math.floor(Date.now() / 1000);
    const o = (await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "400", xmr_address: STAGENET("B") })).body;
    expect(o).toMatchObject({ status: "requested", is_maker: false, accepted_at: null });
    expect(o.deadline_at).toBeGreaterThanOrEqual(t0 + 3 * 3600);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("1.9");
    // El árbitro no ve las solicitudes: no hay escrow que armar.
    expect((await arbiter(`/v1/p2p/arbiter/orders/${o.id}/escrow`, { multisig_address: STAGENET("M") })).status).toBe(409);
    // Solo el anunciante acepta.
    expect((await signed(buyer, "POST", `/v1/p2p/orders/${o.id}/accept`, {})).status).toBe(403);
    const mine = (await signed(seller, "GET", "/v1/p2p/my/orders?open=1")).body.orders.find((x: { id: string }) => x.id === o.id);
    expect(mine).toMatchObject({ status: "requested", is_maker: true });
    const acc = (await signed(seller, "POST", `/v1/p2p/orders/${o.id}/accept`, {})).body;
    expect(acc).toMatchObject({ status: "setup", is_maker: true });
    expect(acc.accepted_at).toBeGreaterThanOrEqual(t0);
    expect(acc.deadline_at).toBeGreaterThanOrEqual(acc.accepted_at + 60 * 60);
    expect((await call(`/v1/p2p/users/${seller.address}`)).body.avg_accept_min).not.toBeNull();
    // Después todo sigue igual que una orden normal.
    await fund(o.id);
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${o.id}`)).body.status).toBe("awaiting_payment");
  });

  it("solicitudes: rechazar o cancelar devuelven el XMR sin afectar la reputación; tope de 5 por anuncio", async () => {
    const seller = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 1 }))).body;
    await away(seller, 3600);
    const buyers = await Promise.all([1, 2, 3, 4, 5, 6].map(() => newUser()));
    const req = (k: Key) => signed(k, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "200", xmr_address: STAGENET("B") });
    const os: any[] = [];
    for (const b of buyers.slice(0, 5)) os.push((await req(b)).body);
    expect((await req(buyers[5]!)).status).toBe(429);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("1.75");
    expect((await signed(seller, "POST", `/v1/p2p/orders/${os[0].id}/decline`, {})).body).toMatchObject({ status: "cancelled", cancel_reason: "declined" });
    expect((await signed(buyers[1]!, "POST", `/v1/p2p/orders/${os[1].id}/cancel`, {})).body).toMatchObject({ status: "cancelled", cancel_reason: "cancelled_by_buyer" });
    expect((await signed(buyers[1]!, "POST", `/v1/p2p/orders/${os[1].id}/decline`, {})).status).toBe(403);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.available_xmr).toBe("1.85");
    expect((await call(`/v1/p2p/users/${seller.address}`)).body).toMatchObject({ orders_done: 0, completion_pct: null });
    expect((await call(`/v1/p2p/users/${buyers[1]!.address}`)).body.completion_pct).toBeNull();
    // Ya hay lugar para otra solicitud (rechazar lo marcó en línea; vuelve a irse).
    await away(seller, 3600);
    expect((await req(buyers[5]!)).body.status).toBe("requested");
  });

  it("solicitudes: vencidas se cancelan, 3 en 7 días pausan los anuncios; escrow sin armar tras aceptar no culpa a nadie", async () => {
    const seller = await newUser();
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 6 }))).body;
    await away(seller, 3600);
    const buyers = await Promise.all([1, 2, 3, 4].map(() => newUser()));
    const os: any[] = [];
    for (const b of buyers) os.push((await signed(b, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "200", xmr_address: STAGENET("B") })).body);
    // Una se acepta y el escrow no se arma a tiempo.
    await signed(seller, "POST", `/v1/p2p/orders/${os[3].id}/accept`, {});
    await DB.prepare("UPDATE p2p_orders SET deadline_at = 1 WHERE id IN (?, ?)").bind(os[0].id, os[3].id).run();
    await sweepOrders(env);
    expect((await signed(buyers[0]!, "GET", `/v1/p2p/orders/${os[0].id}`)).body).toMatchObject({ status: "cancelled", cancel_reason: "timeout_request" });
    expect((await signed(buyers[3]!, "GET", `/v1/p2p/orders/${os[3].id}`)).body).toMatchObject({ status: "cancelled", cancel_reason: "timeout_setup" });
    expect((await call(`/v1/p2p/users/${seller.address}`)).body.completion_pct).toBeNull();
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body.status).toBe("active");
    await DB.prepare("UPDATE p2p_orders SET deadline_at = 1 WHERE id IN (?, ?)").bind(os[1].id, os[2].id).run();
    await sweepOrders(env);
    expect((await call(`/v1/p2p/ads/${ad.id}`)).body).toMatchObject({ status: "paused", paused_reason: "missed_requests", available_xmr: "2" });
  });

  it("mercado: los anuncios con solicitudes siguen visibles hasta 7 días y van antes que los que no aceptan", async () => {
    const a = await newUser();
    const b = await newUser();
    const req = (await signed(a, "POST", "/v1/p2p/ads", sellAd({ fiat: "USD", country: null, price: "210", request_window_h: 12 }))).body;
    const plain = (await signed(b, "POST", "/v1/p2p/ads", sellAd({ fiat: "USD", country: null, price: "190" }))).body;
    const ids = async () => (await call("/v1/p2p/ads?side=sell&fiat=USD")).body.ads.map((x: { id: string }) => x.id).filter((id: string) => id === req.id || id === plain.id);
    await away(a, 3600);
    await away(b, 3600);
    // Aunque es más caro, va primero: se le puede mandar solicitud.
    expect(await ids()).toEqual([req.id, plain.id]);
    await away(a, 25 * 3600);
    await away(b, 25 * 3600);
    expect(await ids()).toEqual([req.id]);
    await away(a, 6 * 86400);
    expect(await ids()).toEqual([req.id]);
    await away(a, 8 * 86400);
    expect(await ids()).toEqual([]);
  });

  it("avisos push: suscripción solo a servicios conocidos, firma VAPID y borra las suscripciones muertas", async () => {
    // Llaves VAPID generadas en la prueba: ninguna llave vive en el repositorio.
    const kp = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = (await crypto.subtle.exportKey("jwk", kp.privateKey)) as JsonWebKey;
    const raw = new Uint8Array((await crypto.subtle.exportKey("raw", kp.publicKey)) as ArrayBuffer);
    const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const penv = { ...(env as object), P2P_VAPID_PUBLIC: b64u(raw), P2P_VAPID_PRIVATE: jwk.d } as never;
    expect((await call("/v1/p2p/config", {}, penv)).body.vapid_public).toBe(b64u(raw));

    const seller = await newUser();
    const buyer = await newUser();
    const ok = "https://fcm.googleapis.com/fcm/send/abc";
    const dead = "https://updates.push.services.mozilla.com/wpush/v2/dead";
    expect((await signed(seller, "PUT", "/v1/p2p/push", { endpoint: "https://evil.example/push" }, penv)).status).toBe(400);
    expect((await signed(seller, "PUT", "/v1/p2p/push", { endpoint: "http://fcm.googleapis.com/x" }, penv)).status).toBe(400);
    expect((await signed(seller, "PUT", "/v1/p2p/push", { endpoint: ok }, penv)).body).toEqual({ ok: true });
    expect((await signed(seller, "PUT", "/v1/p2p/push", { endpoint: dead }, penv)).body).toEqual({ ok: true });

    const sent: { url: string; auth: string; body: unknown }[] = [];
    const prices = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const u = String(input instanceof Request ? input.url : input);
      if (u === ok || u === dead) {
        sent.push({ url: u, auth: new Headers(init?.headers).get("authorization") ?? "", body: init?.body });
        return new Response(null, { status: u === ok ? 201 : 410 });
      }
      return prices(input, init);
    });
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 1 }), penv)).body;
    await away(seller, 3600);
    expect((await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "200", xmr_address: STAGENET("B") }, penv)).body.status).toBe("requested");
    expect(sent.map((s) => s.url).sort()).toEqual([ok, dead].sort());
    expect(sent.every((s) => !s.body)).toBe(true);
    // La firma VAPID es válida para el origen del servicio de push.
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(sent.find((s) => s.url === ok)!.auth)!;
    expect(m[4]).toBe(b64u(raw));
    const dec = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(dec(m[2]!))).aud).toBe("https://fcm.googleapis.com");
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, dec(m[3]!), new TextEncoder().encode(`${m[1]}.${m[2]}`));
    expect(valid).toBe(true);
    // La suscripción muerta (410) se borró; la buena sigue.
    const left = await DB.prepare("SELECT endpoint FROM p2p_push WHERE user_id = ?").bind(seller.address.toLowerCase()).all<{ endpoint: string }>();
    expect(left.results.map((r) => r.endpoint)).toEqual([ok]);
    expect((await signed(seller, "DELETE", "/v1/p2p/push", { endpoint: ok }, penv)).body).toEqual({ ok: true });
    expect((await DB.prepare("SELECT COUNT(*) AS n FROM p2p_push WHERE user_id = ?").bind(seller.address.toLowerCase()).first<{ n: number }>())!.n).toBe(0);
  });

  // ---------- Telegram ----------

  const TG_SECRET = "s".repeat(40);
  const tenv = { ...(env as object), API_URL: "https://fiat.monerop2p.app", P2P_TELEGRAM_TOKEN: "123:abc", P2P_TELEGRAM_WEBHOOK_SECRET: TG_SECRET } as never;
  type TgCall = { method: string; body: Record<string, any> };

  /** Simula la API de Telegram; los mensajes enviados quedan en la lista. */
  function mockTelegram(status: (c: TgCall) => number = () => 200): TgCall[] {
    const calls: TgCall[] = [];
    const prices = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const u = String(input instanceof Request ? input.url : input);
      const m = /^https:\/\/api\.telegram\.org\/bot123:abc\/(\w+)$/.exec(u);
      if (!m) return prices(input, init);
      const c = { method: m[1]!, body: JSON.parse(String(init?.body ?? "{}")) };
      calls.push(c);
      const st = status(c);
      if (st !== 200) return Response.json({ ok: false }, { status: st });
      return Response.json({ ok: true, result: c.method === "getMe" ? { username: "TestFiatBot" } : true });
    });
    return calls;
  }

  const hook = (update: unknown, secret = TG_SECRET) =>
    call("/v1/p2p/telegram/webhook", { method: "POST", body: JSON.stringify(update), headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret } }, tenv);
  const msg = (chat: number, text: string) => ({ message: { text, chat: { id: chat, type: "private" }, from: { language_code: "es" } } });
  let chatN = 1000;

  /** Liga una cuenta a un chat nuevo como lo haría el usuario: código desde la app y /start en el bot. */
  async function linkTelegram(k: Key): Promise<number> {
    const r = await signed(k, "POST", "/v1/p2p/telegram/link", { lang: "es" }, tenv);
    expect(r.status).toBe(200);
    const code = /\?start=([0-9a-f]{32})$/.exec(r.body.url)![1]!;
    const chat = ++chatN + Math.floor(Math.random() * 1e6);
    await hook(msg(chat, `/start ${code}`));
    return chat;
  }

  it("telegram: el webhook se registra solo y una vez; config expone el bot", async () => {
    await DB.prepare("DELETE FROM p2p_settings WHERE key IN ('telegram_bot', 'telegram_hook')").run();
    expect((await call("/v1/p2p/config", {}, tenv)).body.telegram_bot).toBeNull();
    const calls = mockTelegram();
    await setupWebhook(tenv);
    const set = calls.find((c) => c.method === "setWebhook")!;
    expect(set.body).toMatchObject({ url: "https://fiat.monerop2p.app/v1/p2p/telegram/webhook", secret_token: TG_SECRET, allowed_updates: ["message", "callback_query"] });
    expect(calls.find((c) => c.method === "setChatMenuButton")!.body.menu_button).toMatchObject({ type: "web_app", web_app: { url: "https://fiat.monerop2p.app/es/app/?tg=1" } });
    expect((await call("/v1/p2p/config", {}, tenv)).body.telegram_bot).toBe("TestFiatBot");
    const before = calls.length;
    await setupWebhook(tenv);
    expect(calls.length).toBe(before);
    // Sin token no hay Telegram.
    expect((await call("/v1/p2p/config")).body.telegram_bot).toBeNull();
  });

  it("telegram: ligar con código de un solo uso, /stop y el webhook exige su secreto", async () => {
    await DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_bot', 'TestFiatBot')").run();
    const calls = mockTelegram();
    const u = await newUser();
    expect((await signed(u, "POST", "/v1/p2p/telegram/link", {})).status).toBe(503);
    expect((await hook(msg(5, "/help"), "otro")).status).toBe(401);
    expect((await hook(msg(5, "/help"), "")).status).toBe(401);
    expect((await signed(u, "GET", "/v1/p2p/me", undefined, tenv)).body.telegram).toBe(false);

    const r = await signed(u, "POST", "/v1/p2p/telegram/link", { lang: "es" }, tenv);
    expect(r.body.url).toMatch(/^https:\/\/t\.me\/TestFiatBot\?start=[0-9a-f]{32}$/);
    const code = r.body.url.split("=")[1];
    const chat = 777000 + Math.floor(Math.random() * 1000);
    expect((await hook(msg(chat, `/start ${code}`))).status).toBe(200);
    expect(calls.at(-1)!.body).toMatchObject({ chat_id: String(chat) });
    expect(calls.at(-1)!.body.text).toContain("Conectado como user_");
    expect((await signed(u, "GET", "/v1/p2p/me", undefined, tenv)).body.telegram).toBe(true);
    // El código ya se usó: otro chat no puede robar el vínculo.
    await hook(msg(chat + 1, `/start ${code}`));
    expect(calls.at(-1)!.body.text).toContain("no es válido");
    // Un código vencido tampoco sirve.
    const r2 = await signed(u, "POST", "/v1/p2p/telegram/link", { lang: "es" }, tenv);
    await DB.prepare("UPDATE p2p_telegram_codes SET expires_at = 1").run();
    await hook(msg(chat + 2, `/start ${r2.body.url.split("=")[1]}`));
    expect(calls.at(-1)!.body.text).toContain("no es válido");
    // Los grupos se ignoran.
    const n = calls.length;
    await hook({ message: { text: "/stop", chat: { id: chat, type: "group" } } });
    expect(calls.length).toBe(n);
    await hook(msg(chat, "/stop"));
    expect(calls.at(-1)!.body.text).toContain("Desconectado");
    expect((await signed(u, "GET", "/v1/p2p/me", undefined, tenv)).body.telegram).toBe(false);
    // Desligar desde la app.
    await linkTelegram(u);
    expect((await signed(u, "DELETE", "/v1/p2p/telegram", {}, tenv)).body).toEqual({ ok: true });
    expect((await signed(u, "GET", "/v1/p2p/me", undefined, tenv)).body.telegram).toBe(false);
  });

  it("telegram: solicitud con Aceptar/Rechazar solo desde el chat del anunciante; avisos sin montos", async () => {
    await DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_bot', 'TestFiatBot')").run();
    const calls = mockTelegram();
    const seller = await newUser();
    const buyer = await newUser();
    const sChat = await linkTelegram(seller);
    const bChat = await linkTelegram(buyer);
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 3 }), tenv)).body;
    await away(seller, 3600);
    // En el mercado el anuncio aparece como «recibe avisos».
    const listed = (await call("/v1/p2p/ads?side=sell&fiat=MXN", {}, tenv)).body.ads.find((a: { id: string }) => a.id === ad.id);
    expect(listed.user.notifiable).toBe(true);

    const req = () => signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "400", xmr_address: STAGENET("B") }, tenv);
    const o1 = (await req()).body;
    const toSeller = calls.filter((c) => c.method === "sendMessage" && c.body.chat_id === String(sChat)).at(-1)!;
    expect(toSeller.body.text).toContain("Nueva solicitud");
    expect(toSeller.body.text).toContain("3 h");
    expect(toSeller.body.text).not.toMatch(/400|MXN|SPEI|user_/);
    const kb = toSeller.body.reply_markup.inline_keyboard;
    expect(kb[0].map((b: any) => b.callback_data)).toEqual([`a:${o1.id}`, `d:${o1.id}`]);
    // «Abrir orden» abre la app como Mini App de Telegram, con la ruta en ?r=.
    expect(kb[1][0].web_app.url).toBe(`https://fiat.monerop2p.app/es/app/?tg=1&r=orden%2F${o1.id}`);

    const press = (chat: number, data: string) => hook({ callback_query: { id: "q1", data, message: { message_id: 9, chat: { id: chat } } } });
    // El comprador no puede aceptar su propia solicitud desde su chat.
    await press(bChat, `a:${o1.id}`);
    expect(calls.at(-1)).toMatchObject({ method: "answerCallbackQuery" });
    expect(calls.at(-1)!.body.text).toContain("Solo el anunciante");
    await press(99, `a:${o1.id}`);
    expect(calls.at(-1)!.body.text).toContain("no está conectado");
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${o1.id}`, undefined, tenv)).body.status).toBe("requested");
    // Rechazar desde Telegram.
    await press(sChat, `d:${o1.id}`);
    expect((await signed(buyer, "GET", `/v1/p2p/orders/${o1.id}`, undefined, tenv)).body).toMatchObject({ status: "cancelled", cancel_reason: "declined" });
    expect(calls.find((c) => c.method === "editMessageText")!.body.text).toContain("Rechazaste");
    expect(calls.filter((c) => c.body.chat_id === String(bChat)).at(-1)!.body.text).toContain("Rechazaron tu solicitud");
    // Ya no está pendiente.
    await press(sChat, `a:${o1.id}`);
    expect(calls.at(-1)!.body.text).toContain("ya no está pendiente");
    // Aceptar desde Telegram arranca el plazo para armar el escrow.
    await away(seller, 3600);
    const o2 = (await req()).body;
    await press(sChat, `a:${o2.id}`);
    const acc = (await signed(buyer, "GET", `/v1/p2p/orders/${o2.id}`, undefined, tenv)).body;
    expect(acc.status).toBe("setup");
    expect(acc.accepted_at).not.toBeNull();
    expect(calls.filter((c) => c.body.chat_id === String(bChat)).at(-1)!.body.text).toContain("Aceptaron tu solicitud");
    // Seguimiento del depósito: los dos se enteran de que el XMR llegó al escrow.
    const arb = (path: string, body: unknown) => call(path, { method: "POST", body: JSON.stringify(body), headers: { authorization: `Bearer ${ARBITER}` } }, tenv);
    await arb(`/v1/p2p/arbiter/orders/${o2.id}/escrow`, { multisig_address: STAGENET("M") });
    expect((await arb(`/v1/p2p/arbiter/orders/${o2.id}/deposit`, { txid: TXID("c") })).body.status).toBe("confirming");
    for (const chat of [sChat, bChat]) expect(calls.filter((c) => c.body.chat_id === String(chat)).at(-1)!.body.text).toContain("Depósito visto");
    // /ordenes: estado y lado, con botón a cada orden, sin montos.
    await hook(msg(sChat, "/ordenes"));
    const list = calls.at(-1)!.body;
    expect(list.text).toContain(`${o2.id.slice(0, 8)} · Vendes · depósito confirmándose`);
    expect(list.text).not.toContain(o1.id.slice(0, 8));
    expect(list.reply_markup.inline_keyboard[0][0].web_app.url).toContain(`r=orden%2F${o2.id}`);
    await hook(msg(bChat, "/ordenes"));
    expect(calls.at(-1)!.body.text).toContain(`${o2.id.slice(0, 8)} · Compras`);
    // Sin cuenta ligada: ayuda con el botón para abrir el mercado.
    await hook(msg(424242, "/ordenes"));
    expect(calls.at(-1)!.body.reply_markup.inline_keyboard[0][0].web_app.url).toBe("https://fiat.monerop2p.app/es/app/?tg=1");
    // Ningún mensaje a usuarios lleva montos ni apodos.
    for (const c of calls.filter((c) => c.method === "sendMessage" && c.body.chat_id !== undefined && !String(c.body.text).startsWith("Conectado")))
      expect(c.body.text).not.toMatch(/400|MXN|SPEI|PayPal|user_/);
  });

  it("telegram: el admin recibe usuarios, anuncios, apelaciones y órdenes completadas con detalle; 403 borra el vínculo", async () => {
    await DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_bot', 'TestFiatBot')").run();
    let blocked = 0;
    const calls = mockTelegram((c) => (c.method === "sendMessage" && Number(c.body.chat_id) === blocked ? 403 : 200));
    await signed(admin, "PUT", "/v1/p2p/me", { nickname: "soporte_" + admin.address.slice(2, 8), enc_pubkey: "02" + "cd".repeat(32) });
    const aChat = await linkTelegram(admin);
    const toAdmin = () => calls.filter((c) => c.method === "sendMessage" && c.body.chat_id === String(aChat)).map((c) => String(c.body.text));
    const seller = await newUser(tenv);
    expect(toAdmin().some((t) => t.startsWith("🛡 Usuario nuevo: user_"))).toBe(true);
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ terms: "Solo SPEI a mi nombre" }), tenv)).body;
    const adMsg = toAdmin().find((t) => t.includes("Anuncio nuevo"))!;
    expect(adMsg).toContain("vende XMR por MXN");
    expect(adMsg).toContain("SPEI, PayPal");
    expect(adMsg).toContain("Solo SPEI a mi nombre");
    // Pausar no avisa; editar las condiciones sí.
    const before = toAdmin().length;
    await signed(seller, "PATCH", `/v1/p2p/ads/${ad.id}`, { status: "paused" }, tenv);
    expect(toAdmin().length).toBe(before);
    await signed(seller, "PATCH", `/v1/p2p/ads/${ad.id}`, { terms: "Escríbeme por WhatsApp" }, tenv);
    expect(toAdmin().at(-1)).toContain("Anuncio editado");
    expect(toAdmin().at(-1)).toContain("WhatsApp");
    // Si alguien bloquea el bot, se borra su vínculo.
    const u = await newUser();
    const buyer = await newUser();
    const uAd = (await signed(u, "POST", "/v1/p2p/ads", sellAd({ request_window_h: 1 }), tenv)).body;
    blocked = await linkTelegram(u);
    await away(u, 3600);
    expect((await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: uAd.id, fiat_amount: "200", xmr_address: STAGENET("B") }, tenv)).body.status).toBe("requested");
    expect((await DB.prepare("SELECT COUNT(*) AS n FROM p2p_telegram WHERE chat_id = ?").bind(String(blocked)).first<{ n: number }>())!.n).toBe(0);
  });

  it("telegram: alertas de anuncios nuevos con filtros, 15 min de espera, 1 cada 6 h y nunca anuncios con contacto externo", async () => {
    await DB.prepare("INSERT OR REPLACE INTO p2p_settings (key, value) VALUES ('telegram_bot', 'TestFiatBot')").run();
    await DB.prepare("DELETE FROM p2p_settings WHERE key = 'tg_alerts_cursor'").run();
    const calls = mockTelegram();
    // La primera corrida solo fija el cursor: nunca avisa anuncios viejos.
    expect(await sendAdAlerts(tenv)).toBe(0);
    await DB.prepare("UPDATE p2p_settings SET value = '{\"t\":1,\"id\":\"\"}' WHERE key = 'tg_alerts_cursor'").run();
    const drain = async () => {
      for (let i = 0; i < 20; i++) await sendAdAlerts(tenv);
    };
    const age = (id: string, s = 1000) => DB.prepare("UPDATE p2p_ads SET created_at = created_at - ? WHERE id = ?").bind(s, id).run();
    const tap = (chat: number, data: string) => hook({ callback_query: { id: "q", data, message: { message_id: 9, chat: { id: chat } }, from: { language_code: "es" } } });
    const base = 5_000_000 + Math.floor(Math.random() * 1e6);
    const [cBuy, cEur, cSell, cOff] = [base, base + 1, base + 2, base + 3];

    // Suscribirse sin cuenta: menú, «Comprar XMR», monedas por comando y apagar.
    await hook(msg(cBuy, "/alertas"));
    expect(calls.at(-1)!.body.text).toContain("apagadas");
    await tap(cBuy, "al:w:buy");
    const edit = calls.filter((c) => c.method === "editMessageText").at(-1)!;
    expect(edit.body.text).toContain("comprar XMR con cualquier moneda");
    await tap(cBuy, "al:f:MXN");
    await hook(msg(cEur, "/alertas eur"));
    expect(calls.at(-1)!.body.text).toContain("con EUR");
    await hook(msg(cSell, "/start alertas"));
    await tap(cSell, "al:w:sell");
    await tap(cOff, "al:w:both");
    await hook(msg(cOff, "/stop"));
    expect(calls.at(-1)!.body.text).toContain("Desconectado");

    // El anunciante también tiene alertas: su propio anuncio no le llega.
    const seller = await newUser(tenv);
    const sChat = await linkTelegram(seller);
    await tap(sChat, "al:w:buy");
    const ad = (await signed(seller, "POST", "/v1/p2p/ads", sellAd(), tenv)).body;
    const nick = (await signed(seller, "GET", "/v1/p2p/me", undefined, tenv)).body.nickname as string;
    const got = () => calls.filter((c) => c.method === "sendMessage" && String(c.body.text).includes(nick) && String(c.body.text).startsWith("🆕"));

    await drain();
    expect(got()).toHaveLength(0); // menos de 15 min
    await age(ad.id);
    await drain();
    expect(got().map((c) => Number(c.body.chat_id))).toEqual([cBuy]);
    const alert = got()[0]!;
    expect(alert.body.text).toContain("vende XMR por MXN");
    expect(alert.body.text).toContain("SPEI, PayPal");
    expect(alert.body.text).not.toContain("Solo cuentas a mi nombre"); // las condiciones nunca van
    expect(alert.body.reply_markup.inline_keyboard[0][0].web_app.url).toBe("https://fiat.monerop2p.app/es/app/?tg=1&r=%3Flado%3Dcomprar%26fiat%3DMXN%26todos%3D1");

    // Otro anuncio del mismo anunciante antes de 6 h: no se avisa. Uno de otro con WhatsApp: tampoco.
    const ad2 = (await signed(seller, "POST", "/v1/p2p/ads", sellAd({ fiat: "EUR", country: null, methods: [{ kind: "bank", name: "SEPA" }] }), tenv)).body;
    const other = await newUser(tenv);
    const ad3 = (await signed(other, "POST", "/v1/p2p/ads", sellAd({ terms: "Escríbeme por WhatsApp +1 (207) 977-8730" }), tenv)).body;
    const nick3 = (await signed(other, "GET", "/v1/p2p/me", undefined, tenv)).body.nickname as string;
    await age(ad2.id);
    await age(ad3.id);
    await drain();
    expect(got()).toHaveLength(1);
    expect(calls.some((c) => String(c.body.text ?? "").startsWith("🆕") && String(c.body.text).includes(nick3))).toBe(false);

    // Anuncio de compra en EUR: le llega a quien quiere vender y a quien filtró EUR.
    const buyer = await newUser(tenv);
    const ad4 = (await signed(buyer, "POST", "/v1/p2p/ads", sellAd({ side: "buy", fiat: "EUR", country: null, methods: [{ kind: "bank", name: "SEPA" }], xmr_address: STAGENET("B") }), tenv)).body;
    expect(ad4.id).toBeTruthy();
    const nick4 = (await signed(buyer, "GET", "/v1/p2p/me", undefined, tenv)).body.nickname as string;
    await age(ad4.id, 950); // después del cursor (los anteriores se envejecieron 1000 s)
    await drain();
    const to4 = calls.filter((c) => c.method === "sendMessage" && String(c.body.text).startsWith("🆕") && String(c.body.text).includes(nick4)).map((c) => Number(c.body.chat_id));
    expect(to4.sort()).toEqual([cEur, cSell].sort());

    // Quien bloquea el bot (403) pierde sus alertas.
    expect((await DB.prepare("SELECT count(*) AS n FROM p2p_tg_alerts WHERE chat_id = ?").bind(String(cOff)).first<{ n: number }>())!.n).toBe(0);
  });

  it("telegram: /swap abre el exchange con un código y los avisos del intercambio llegan solo con ese código", async () => {
    const calls = mockTelegram();
    const chat = 8_000_000 + Math.floor(Math.random() * 1e6);
    const xenv = { ...(tenv as object), EXCHANGE_URL: "https://monerop2p.app" } as never;
    const post = (body: unknown) => call("/v1/p2p/telegram/swap", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }, xenv);
    await call("/v1/p2p/telegram/webhook", { method: "POST", body: JSON.stringify(msg(chat, "/swap")), headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": TG_SECRET } }, xenv);
    const url = calls.at(-1)!.body.reply_markup.inline_keyboard[0][0].web_app.url as string;
    expect(url).toMatch(/^https:\/\/monerop2p\.app\/es\/app\/\?tg=1&n=[0-9a-f]{32}$/);
    const token = url.split("&n=")[1]!;

    // Sin código válido no se manda nada.
    const before = calls.length;
    expect((await post({ token: "cd".repeat(16), trade_id: "tr1", status: "finished" })).status).toBe(404);
    expect((await post({ token: "x", trade_id: "tr1", status: "finished" })).status).toBe(400);
    expect((await post({ token, trade_id: "tr 1", status: "finished" })).status).toBe(400);
    expect((await post({ token, trade_id: "tr1", status: "waiting" })).body).toMatchObject({ ignored: true });
    expect(calls.length).toBe(before);

    expect((await post({ token, trade_id: "tr1", status: "finished" })).status).toBe(200);
    const m = calls.at(-1)!;
    expect(Number(m.body.chat_id)).toBe(chat);
    expect(m.body.text).toContain("Intercambio completado");
    expect(m.body.reply_markup.inline_keyboard[0][0].web_app.url).toBe("https://monerop2p.app/es/app/?tg=1&trade=tr1");

    // Tope de 10 avisos por código, y los vencidos no sirven.
    for (let i = 0; i < 9; i++) expect((await post({ token, trade_id: "tr1", status: "sending" })).status).toBe(200);
    expect((await post({ token, trade_id: "tr1", status: "sending" })).status).toBe(404);
    await DB.prepare("UPDATE p2p_tg_swap_tokens SET sent = 0, expires_at = 1 WHERE token = ?").bind(token).run();
    expect((await post({ token, trade_id: "tr1", status: "finished" })).status).toBe(404);
  });

  it("el árbitro necesita su token", async () => {
    expect((await call("/v1/p2p/arbiter/tasks")).status).toBe(401);
    expect((await call("/v1/p2p/arbiter/tasks", { headers: { authorization: "Bearer otro" } })).status).toBe(401);
  });
});
