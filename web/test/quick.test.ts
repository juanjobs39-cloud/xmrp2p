import assert from "node:assert/strict";
import { test } from "node:test";
import { availableRange, quotesFor } from "../src/app/quick.ts";

const offer = (id: string, price: string, min: string, max: string, maxXmr = "1") =>
  ({ id, maker: "0x" + id.padStart(40, "0"), network: "arbitrum_one", price, min_usdt: min, max_usdt: max, max_xmr: maxXmr, expires_at: 0 });

test("ordena por XMR recibido (el precio más bajo primero) y filtra por rango", () => {
  const offers = [offer("a", "620", "5", "100"), offer("b", "600", "5", "30"), offer("c", "610", "40", "100")];
  const rows = quotesFor(offers, 25);
  assert.deepEqual(rows.map((r) => r.offer.id), ["b", "a"]);
  assert.ok(rows[0]!.xmr > rows[1]!.xmr);
  assert.equal(rows[0]!.xmr, Math.floor((25 / 600) * 1e12) / 1e12);
});

test("respeta el XMR disponible del maker y montos inválidos", () => {
  const offers = [offer("a", "600", "5", "100", "0.01")];
  assert.equal(quotesFor(offers, 50).length, 0); // 50/600 = 0.083 > 0.01
  assert.equal(quotesFor(offers, 0).length, 0);
  assert.equal(quotesFor(offers, Number.NaN).length, 0);
});

test("rango disponible", () => {
  assert.equal(availableRange([]), null);
  assert.deepEqual(availableRange([offer("a", "600", "5", "30"), offer("b", "600", "10", "100")]), { min: 5, max: 100 });
});
