import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSpend } from "../../arbiter/src/rules.mjs";
import { NETWORK_FEE_RESERVE, releaseDestinations } from "../src/p2p/payout.ts";

const BUYER = "8" + "B".repeat(94);
const REFUND = "8" + "S".repeat(94);
const FEE = "8" + "F".repeat(94);
const xmr = 25_549_244_892n;
const fee = 127_746_225n;
const OPTS = { feeAddress: FEE, networkFeeReserve: NETWORK_FEE_RESERVE };
const task = { task: "release", to: BUYER, refund_to: REFUND, xmr_pico: String(xmr), fee_pico: String(fee) };
/** Lo que el árbitro ve de la transacción (comisión de red típica de 3 salidas). */
const described = (d: { address: string; amount: string }[]) => ({ txCount: 1, fee: 44_380_000n, outputs: d.map((x) => ({ address: x.address, amount: BigInt(x.amount) })) });

test("el sobrante del escrow vuelve al vendedor y el árbitro lo acepta", () => {
  const extra = 2_000_000_000n; // el vendedor depositó 0.002 XMR de más
  const d = releaseDestinations({ balance: xmr + fee + NETWORK_FEE_RESERVE + extra, buyer: BUYER, xmr, platform: FEE, fee, refund: REFUND });
  assert.deepEqual(d.map((x) => x.address), [BUYER, FEE, REFUND]);
  assert.equal(d[2]!.amount, String(extra));
  checkSpend(described(d), task, OPTS);
});

test("sin sobrante no se agrega salida", () => {
  const d = releaseDestinations({ balance: xmr + fee + NETWORK_FEE_RESERVE, buyer: BUYER, xmr, platform: FEE, fee, refund: REFUND });
  assert.equal(d.length, 2);
  checkSpend(described(d), task, OPTS);
});

test("si el reembolso es la misma dirección del comprador o de la comisión, no se envía (el árbitro lo rechazaría)", () => {
  for (const refund of [BUYER, FEE]) {
    const d = releaseDestinations({ balance: xmr + fee + NETWORK_FEE_RESERVE + 5n, buyer: BUYER, xmr, platform: FEE, fee, refund });
    assert.equal(d.length, 2);
    checkSpend(described(d), { ...task, refund_to: refund }, OPTS);
  }
});
