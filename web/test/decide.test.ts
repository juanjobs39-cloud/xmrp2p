import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, type ChainView, type Policy } from "../src/app/decide.ts";

const P: Policy = { expectedXmr: 1_000_000_000_000n, minConfirmations: 10, refundMarginS: 600 };
const base: ChainView = { now: 1000, t0: 1000 + 3600, t1: 1000 + 3600 + 7200, stage: "PENDING" };
const good = { received: 1_000_000_000_000n, confirmations: 10 };

test("XMR verificado antes de t0 → setReady", () => {
  assert.deepEqual(decide(base, good, P), { kind: "set_ready" });
});

test("sin XMR y lejos de t0 → esperar", () => {
  const a = decide(base, undefined, P);
  assert.equal(a.kind, "wait_xmr");
  if (a.kind === "wait_xmr") assert.equal(a.deadline, base.t0 - 600);
});

test("RIESGO 1: sin XMR verificado cerca de t0 → reembolso urgente", () => {
  const a = decide({ ...base, now: base.t0 - 600 }, undefined, P);
  assert.deepEqual(a, { kind: "refund_now", reason: "el XMR no está verificado y se acerca t0", urgent: true });
});

test("monto insuficiente nunca habilita setReady", () => {
  const a = decide(base, { received: P.expectedXmr - 1n, confirmations: 50 }, P);
  assert.equal(a.kind, "wait_xmr");
  assert.equal(decide({ ...base, now: base.t0 - 1 }, { received: 1n, confirmations: 50 }, P).kind, "refund_now");
});

test("confirmaciones insuficientes → esperar, y reembolsar si se acerca t0", () => {
  assert.equal(decide(base, { ...good, confirmations: 3 }, P).kind, "wait_xmr");
  assert.equal(decide({ ...base, now: base.t0 - 100 }, { ...good, confirmations: 3 }, P).kind, "refund_now");
});

test("entre t0 y t1 sin READY: no se puede reembolsar", () => {
  assert.equal(decide({ ...base, now: base.t0 }, good, P).kind, "wait_claim");
  assert.equal(decide({ ...base, now: base.t0 + 1 }, undefined, P).kind, "wait_t1");
});

test("READY → esperar el claim del maker; desde t1 → reembolsar", () => {
  assert.equal(decide({ ...base, stage: "READY" }, good, P).kind, "wait_claim");
  assert.equal(decide({ ...base, stage: "READY", now: base.t1 }, good, P).kind, "refund_now");
  assert.equal(decide({ ...base, now: base.t1 + 5 }, undefined, P).kind, "refund_now");
});

test("el maker cobró → barrer el XMR con su secreto", () => {
  const a = decide({ ...base, stage: "COMPLETED", revealed: { kind: "Claimed", secret: "0xab" } }, good, P);
  assert.deepEqual(a, { kind: "sweep", makerSecret: "0xab" });
});

test("ya reembolsado → terminado", () => {
  assert.equal(decide({ ...base, stage: "COMPLETED", revealed: { kind: "Refunded", secret: "0x1" } }, good, P).kind, "done_refunded");
});

test("en todo momento hay una acción definida (barrido de tiempos y estados)", () => {
  for (const stage of ["PENDING", "READY"] as const) {
    for (let now = 0; now < base.t1 + 4000; now += 97) {
      for (const check of [undefined, good, { received: 1n, confirmations: 0 }]) {
        const a = decide({ ...base, now, stage }, check, P);
        assert.notEqual(a.kind, "error");
        // Nunca proponer setReady sin XMR verificado ni después de t0.
        if (a.kind === "set_ready") assert.ok(check === good && now < base.t0);
        // Nunca proponer reembolso en la ventana donde el contrato lo prohíbe.
        if (a.kind === "refund_now") assert.ok((now < base.t0 && stage === "PENDING") || now >= base.t1);
      }
    }
  }
});
