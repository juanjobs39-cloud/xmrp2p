import assert from "node:assert/strict";
import { test } from "node:test";
import { autoDeposit, internalAsset, isFinal, planSwap, upsertSwap, type Leg, type SwapPlan, type SwapRecord } from "../src/p2p/swap.ts";

const xmr: Leg = { kind: "internal", coin: "xmr" };
const usdt: Leg = { kind: "internal", coin: "usdt" };
const eth: Leg = { kind: "internal", coin: "eth" };
const btc: Leg = { kind: "other", ticker: "btc", network: "Mainnet" };
const ton: Leg = { kind: "other", ticker: "usdt", network: "TON", memo: true };

test("USDT de la wallet → XMR en la wallet", () => {
  assert.deepEqual(planSwap(usdt, xmr), { side: "buy", ticker: "usdt", network: "Arbitrum", payFrom: "usdt", receiveIn: "xmr", memo: false });
});

test("XMR de la wallet → ETH en la wallet tipo Ethereum", () => {
  assert.deepEqual(planSwap(xmr, eth), { side: "sell", ticker: "eth", network: "Arbitrum", payFrom: "xmr", receiveIn: "evm", memo: false });
});

test("otra moneda → XMR: se deposita desde fuera y se recibe en la wallet", () => {
  assert.deepEqual(planSwap(btc, xmr), { side: "buy", ticker: "btc", network: "Mainnet", payFrom: null, receiveIn: "xmr", memo: false });
});

test("XMR → moneda sin wallet interna: destino libre, con memo si la moneda lo pide", () => {
  assert.deepEqual(planSwap(xmr, btc), { side: "sell", ticker: "btc", network: "Mainnet", payFrom: "xmr", receiveIn: null, memo: false });
  assert.equal((planSwap(xmr, ton) as SwapPlan).memo, true);
});

test("uno de los dos lados debe ser Monero", () => {
  assert.equal(planSwap(usdt, eth), "need_xmr");
  assert.equal(planSwap(btc, usdt), "need_xmr");
  assert.equal(planSwap(xmr, xmr), "same");
});

test("internalAsset coincide con la regla del servidor", () => {
  assert.equal(internalAsset("buy", { ticker: "btc", network: "Mainnet" }), "xmr");
  assert.equal(internalAsset("sell", { ticker: "usdt", network: "Arbitrum" }), "evm");
  assert.equal(internalAsset("sell", { ticker: "usdt", network: "TRC20" }), null);
});

const plan = planSwap(usdt, xmr) as SwapPlan;
const dep = "0x" + "ab".repeat(20);
const trade = { ticker_from: "usdt", network_from: "Arbitrum", amount_from: "50", address_provider: dep, address_provider_memo: "" };

test("depósito automático: mismo monto y moneda que se revisó", () => {
  assert.deepEqual(autoDeposit(plan.payFrom, "50", trade), { coin: "usdt", to: dep, amount: 50_000_000n });
  assert.deepEqual(autoDeposit(plan.payFrom, "50.00", { ...trade, amount_from: "50.0" }), { coin: "usdt", to: dep, amount: 50_000_000n });
});

test("no firma si el intercambio pide otro monto, otra moneda u otra red", () => {
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, amount_from: "50.01" }), "wrong_amount");
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, amount_from: "x" }), "wrong_amount");
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, ticker_from: "usdc" }), "wrong_coin");
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, network_from: "ERC20" }), "wrong_coin");
});

test("no firma si la dirección de depósito no es de la red, o si pide memo", () => {
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, address_provider: "4" + "B".repeat(94) }), "bad_address");
  assert.equal(autoDeposit(plan.payFrom, "50", { ...trade, address_provider_memo: "12345" }), "needs_memo");
  assert.notEqual(typeof autoDeposit(plan.payFrom, "50", { ...trade, address_provider_memo: "0" }), "string");
});

test("depósito de XMR: dirección de Monero y 12 decimales", () => {
  const p = planSwap(xmr, btc) as SwapPlan;
  const addr = "4" + "B".repeat(94);
  const t = { ticker_from: "xmr", network_from: "Mainnet", amount_from: "0.5", address_provider: addr };
  assert.deepEqual(autoDeposit(p.payFrom, "0.5", t), { coin: "xmr", to: addr, amount: 500_000_000_000n });
  assert.equal(autoDeposit(p.payFrom, "0.5", { ...t, address_provider: dep }), "bad_address");
});

test("si se paga desde fuera no hay depósito automático", () => {
  assert.equal(autoDeposit((planSwap(btc, xmr) as SwapPlan).payFrom, "0.01", { ticker_from: "btc", network_from: "Mainnet", amount_from: "0.01", address_provider: "bc1qdeposit" }), "wrong_coin");
});

test("historial: actualiza sin duplicar, el más nuevo primero y máximo 30", () => {
  const rec = (id: string, at: number): SwapRecord => ({ id, at, from: "USDT", to: "XMR", amount_from: "1", amount_to: "1", provider: "P" });
  let list = upsertSwap(undefined, rec("a", 1));
  list = upsertSwap(list, rec("b", 2));
  list = upsertSwap(list, { ...rec("a", 1), status: "finished" });
  assert.deepEqual(list.map((x) => x.id), ["b", "a"]);
  assert.equal(list[1]!.status, "finished");
  for (let i = 0; i < 40; i++) list = upsertSwap(list, rec("n" + i, 10 + i));
  assert.equal(list.length, 30);
  assert.equal(list[0]!.id, "n39");
  assert.equal(isFinal("finished"), true);
  assert.equal(isFinal("confirming"), false);
  assert.equal(isFinal(undefined), false);
});
