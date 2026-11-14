import assert from "node:assert/strict";
import { test } from "node:test";
import { chargeable, FEE_MIN, feeFor, feePercentLabel, splitAll, withdrawRule, WITHDRAW_BPS } from "../src/p2p/fee.ts";

const xmr = { bps: WITHDRAW_BPS, min: FEE_MIN.xmr };
const usdt = { bps: WITHDRAW_BPS, min: FEE_MIN.token };

test("0.5 % encima del monto, sin redondear hacia arriba", () => {
  assert.equal(feeFor(1_000_000_000_000n, xmr), 5_000_000_000n); // 1 XMR → 0.005
  assert.equal(feeFor(100_000_000n, usdt), 500_000n); // 100 USDT → 0.5
  assert.equal(feeFor(10_000_199n, usdt), 50_000n); // 10.000199 USDT → 0.05 (trunca)
});

test("debajo del mínimo no se cobra", () => {
  assert.equal(feeFor(9_999_999n, usdt), 0n); // 9.99 USDT → comisión < 0.05
  assert.equal(feeFor(1_000_000_000n, xmr), 0n); // 0.001 XMR → 0.000005 < mínimo
  assert.equal(feeFor(2_000_000_000n, xmr), 10_000_000n); // justo el mínimo
  assert.equal(feeFor(0n, xmr), 0n);
  assert.equal(feeFor(5n, null), 0n);
});

test("enviar todo: destino + comisión = total y la comisión es 0.5 % del destino", () => {
  const total = 1_005_000_000_000n;
  const s = splitAll(total, xmr);
  assert.equal(s.dest + s.fee, total);
  assert.equal(s.dest, 1_000_000_000_000n);
  assert.equal(s.fee, 5_000_000_000n);
  const odd = splitAll(123_456_789n, usdt);
  assert.equal(odd.dest + odd.fee, 123_456_789n);
  assert.ok(odd.fee <= feeFor(odd.dest, usdt) + 1n && odd.fee >= feeFor(odd.dest, usdt) - 1n);
});

test("enviar todo con poco saldo o sin regla: todo va al destino", () => {
  assert.deepEqual(splitAll(5_000_000n, usdt), { dest: 5_000_000n, fee: 0n });
  assert.deepEqual(splitAll(700n, null), { dest: 700n, fee: 0n });
  assert.deepEqual(splitAll(0n, xmr), { dest: 0n, fee: 0n });
});

test("solo hay comisión en redes con dinero real", () => {
  assert.equal(withdrawRule("xmr", "stagenet"), null);
  assert.equal(withdrawRule("token", 421614), null);
  const x = withdrawRule("xmr", "mainnet")!;
  assert.match(x.address, /^4[0-9A-Za-z]{94}$/);
  assert.equal(x.bps, 50n);
  const e = withdrawRule("eth", 42161)!;
  assert.match(e.address, /^0x[0-9a-fA-F]{40}$/);
  assert.equal(e.min, FEE_MIN.eth);
  assert.equal(withdrawRule("token", 42161)!.address, e.address);
  assert.equal(feePercentLabel(x), "0.5 %");
});

test("no se cobra entre usuarios, a direcciones propias ni a la de comisiones", () => {
  const rule = withdrawRule("token", 42161)!;
  const mine = "0xAbCd000000000000000000000000000000000001";
  const other = "0x1111111111111111111111111111111111111111";
  assert.equal(chargeable(rule, { address: other }, [mine]), rule);
  assert.equal(chargeable(rule, { address: other, nick: "ana" }, [mine]), null);
  assert.equal(chargeable(rule, { address: mine.toLowerCase() }, [mine]), null);
  assert.equal(chargeable(rule, { address: ` ${rule.address.toUpperCase().replace("0X", "0x")} ` }, [mine]), null);
  assert.equal(chargeable(null, { address: other }, [mine]), null);
});
