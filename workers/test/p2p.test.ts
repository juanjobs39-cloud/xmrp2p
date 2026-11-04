import { env as baseEnv } from "cloudflare:workers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedMessage } from "../src/api/auth";
import worker from "../src/api/index";
import { sweepOrders } from "../src/api/p2p/orders";

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
async function newUser(): Promise<Key> {
  const k = newKey();
  const r = await signed(k, "PUT", "/v1/p2p/me", { nickname: `user_${++n}_${k.address.slice(2, 8)}`, enc_pubkey: "02" + "ab".repeat(32) });
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

  it("el árbitro necesita su token", async () => {
    expect((await call("/v1/p2p/arbiter/tasks")).status).toBe(401);
    expect((await call("/v1/p2p/arbiter/tasks", { headers: { authorization: "Bearer otro" } })).status).toBe(401);
  });
});
