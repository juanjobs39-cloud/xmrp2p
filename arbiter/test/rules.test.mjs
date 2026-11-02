import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { authorizationFor, checkSpend, signedMessage, spenderRole, verifyAuthorization } from "../src/rules.mjs";

// Llaves de prueba generadas en cada corrida (ninguna llave privada vive en el repositorio).
const seller = privateKeyToAccount(generatePrivateKey());
const admin = privateKeyToAccount(generatePrivateKey());
const ORDER = "ab".repeat(16);
const BUYER = "5" + "B".repeat(94);
const REFUND = "5" + "S".repeat(94);
const FEE = "5" + "F".repeat(94);
const OPTS = { feeAddress: FEE, networkFeeReserve: 100_000_000n };

async function auth(key, path, body) {
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = await key.signMessage({ message: await signedMessage("POST", path, key.address, ts, body) });
  return { method: "POST", path, address: key.address.toLowerCase(), ts, signature, body };
}

test("autorización del vendedor para liberar", async () => {
  const a = await auth(seller, `/v1/p2p/orders/${ORDER}/release`, '{"nonce":"1"}');
  await verifyAuthorization(a, { kind: "release", orderId: ORDER, signer: seller.address });
  // Otra orden, otro firmante, cuerpo alterado o firma de otra llave: se rechaza.
  await assert.rejects(verifyAuthorization(a, { kind: "release", orderId: "cd".repeat(16), signer: seller.address }));
  await assert.rejects(verifyAuthorization(a, { kind: "release", orderId: ORDER, signer: admin.address }));
  await assert.rejects(verifyAuthorization({ ...a, body: '{"nonce":"2"}' }, { kind: "release", orderId: ORDER, signer: seller.address }), /firma inválida/);
  const forged = await auth(admin, `/v1/p2p/orders/${ORDER}/release`, "{}");
  await assert.rejects(verifyAuthorization({ ...forged, address: seller.address.toLowerCase() }, { kind: "release", orderId: ORDER, signer: seller.address }));
  await assert.rejects(verifyAuthorization({ ...a, ts: "1" }, { kind: "release", orderId: ORDER, signer: seller.address }), /vencida/);
});

test("decisión del administrador: el ganador firmado debe coincidir", async () => {
  const a = await auth(admin, `/v1/p2p/admin/orders/${ORDER}/resolve`, JSON.stringify({ winner: "buyer", note: "ok" }));
  await verifyAuthorization(a, { kind: "resolve", orderId: ORDER, signer: admin.address, winner: "buyer" });
  await assert.rejects(verifyAuthorization(a, { kind: "resolve", orderId: ORDER, signer: admin.address, winner: "seller" }), /ganador/);
  const bySeller = await auth(seller, `/v1/p2p/admin/orders/${ORDER}/resolve`, JSON.stringify({ winner: "seller" }));
  await assert.rejects(verifyAuthorization(bySeller, { kind: "resolve", orderId: ORDER, signer: admin.address, winner: "seller" }));
});

const release = { task: "release", to: BUYER, refund_to: REFUND, xmr_pico: "250000000000", fee_pico: "1250000000" };

test("liberar: monto exacto al comprador y comisión exacta a la plataforma", () => {
  const ok = { txCount: 1, fee: 30_000_000n, outputs: [{ address: BUYER, amount: 250_000_000_000n }, { address: FEE, amount: 1_250_000_000n }] };
  checkSpend(ok, release, OPTS);
  checkSpend({ ...ok, outputs: [...ok.outputs, { address: REFUND, amount: 70_000_000n }] }, release, OPTS); // sobrante al vendedor
  assert.throws(() => checkSpend({ ...ok, outputs: [{ address: BUYER, amount: 249_000_000_000n }, ok.outputs[1]] }, release, OPTS), /exactamente/);
  assert.throws(() => checkSpend({ ...ok, outputs: [...ok.outputs, { address: "5" + "X".repeat(94), amount: 1n }] }, release, OPTS), /no autorizada/);
  assert.throws(() => checkSpend({ ...ok, outputs: [ok.outputs[0], { address: FEE, amount: 2_000_000_000n }] }, release, OPTS), /comisión/);
  assert.throws(() => checkSpend({ ...ok, fee: 200_000_000n }, release, OPTS), /red demasiado alta/);
  assert.throws(() => checkSpend({ ...ok, txCount: 2 }, release, OPTS), /una sola/);
});

test("reembolso y quejas: solo a la dirección del ganador", () => {
  const refund = { task: "refund", to: REFUND, xmr_pico: "1", fee_pico: "1" };
  checkSpend({ txCount: 1, fee: 1n, outputs: [{ address: REFUND, amount: 5n }] }, refund, OPTS);
  assert.throws(() => checkSpend({ txCount: 1, fee: 1n, outputs: [{ address: BUYER, amount: 5n }] }, refund, OPTS));
  const sellerWins = { task: "resolve", winner: "seller", to: REFUND, xmr_pico: "1", fee_pico: "1" };
  checkSpend({ txCount: 1, fee: 1n, outputs: [{ address: REFUND, amount: 5n }] }, sellerWins, OPTS);
  const buyerWins = { ...release, task: "resolve", winner: "buyer" };
  checkSpend({ txCount: 1, fee: 1n, outputs: [{ address: BUYER, amount: 250_000_000_000n }, { address: FEE, amount: 1_250_000_000n }] }, buyerWins, OPTS);
});

test("quién autoriza y quién arma cada pago", () => {
  assert.deepEqual(authorizationFor({ task: "release", seller: "0xs" }, "0xa"), { kind: "release", signer: "0xs" });
  assert.deepEqual(authorizationFor({ task: "resolve", winner: "buyer" }, "0xa"), { kind: "resolve", signer: "0xa", winner: "buyer" });
  assert.equal(authorizationFor({ task: "refund" }, "0xa"), null);
  assert.equal(spenderRole({ task: "release" }), "seller");
  assert.equal(spenderRole({ task: "refund" }), "seller");
  assert.equal(spenderRole({ task: "resolve", winner: "buyer" }), "buyer");
});
