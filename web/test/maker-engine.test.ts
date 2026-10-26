import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CONFIG,
  DEFAULT_SAFETY,
  nextStep,
  offerable,
  PICONERO,
  quote,
  rejectTake,
  type EscrowInfo,
  type MakerSwap,
  type MState,
} from "../src/maker/engine.ts";

const ME = "0x133b11BE0770dD1D0a8925fC42eDbc092F1aCe36";
const S = DEFAULT_SAFETY;
const NOW = 1_000_000;

function swap(state: MState, extra: Partial<MakerSwap> = {}): MakerSwap {
  return {
    id: "s1",
    state,
    created_at: 0,
    usdt_atomic: "10000000",
    xmr_atomic: String(PICONERO / 60n),
    price: "600",
    taker_message: {} as MakerSwap["taker_message"],
    taker_commitment: "0x" + "aa".repeat(32),
    maker_spend: "x",
    maker_secret: ("0x" + "bb".repeat(32)) as `0x${string}`,
    maker_commitment: "0x" + "cc".repeat(32),
    maker_message: {} as MakerSwap["maker_message"],
    shared_address: "5shared",
    shared_view_key: "v",
    from_block: 1,
    deposit_deadline: NOW + 1800,
    xmr_restore_height: 1,
    ...extra,
  };
}

const info = (extra: Partial<EscrowInfo> = {}): EscrowInfo => ({
  stage: "PENDING",
  claimer: ME,
  amount: 10_000_000n,
  claimCommitment: "0x" + "CC".repeat(32),
  refundCommitment: "0x" + "aa".repeat(32),
  t0: NOW + 3600,
  t1: NOW + 3600 + 7200,
  ...extra,
});

test("cotización: margen aplicado y XMR redondeado hacia abajo", () => {
  const q = quote("10", 600, DEFAULT_CONFIG);
  assert.equal(q.usdtAtomic, 10_000_000n);
  assert.equal(q.price, 609);
  assert.equal(q.xmrAtomic, (10_000_000n * PICONERO) / 609_000_000n);
  assert.throws(() => quote("1", 600, DEFAULT_CONFIG), /límites/);
  assert.throws(() => quote("10", 0, DEFAULT_CONFIG), /precio/);
  assert.throws(() => quote("1e3", 600, DEFAULT_CONFIG), /inválido/);
});

test("aceptar: ocupado, exposición y saldo", () => {
  const q = quote("10", 600, DEFAULT_CONFIG);
  assert.equal(rejectTake([], q, q.xmrAtomic, DEFAULT_CONFIG), null);
  assert.match(rejectTake([], q, q.xmrAtomic - 1n, DEFAULT_CONFIG)!, /XMR disponible/);
  assert.match(rejectTake([swap("XMR_LOCKED")], q, PICONERO, DEFAULT_CONFIG)!, /ocupado/);
  // Los swaps terminados no cuentan.
  assert.equal(rejectTake([swap("CLAIMED"), swap("ABORTED")], q, q.xmrAtomic, DEFAULT_CONFIG), null);
  const cfg = { ...DEFAULT_CONFIG, maxConcurrent: 3, maxExposure: q.xmrAtomic };
  assert.match(rejectTake([swap("XMR_LOCKED")], q, PICONERO, cfg)!, /exposición/);
});

test("el XMR ya enviado no se cuenta dos veces (hallazgo de la Fase 7)", () => {
  const q = quote("10", 600, DEFAULT_CONFIG);
  const cfg = { ...DEFAULT_CONFIG, maxConcurrent: 3 };
  // Swap con XMR bloqueado: ese XMR ya no está en el saldo desbloqueado; solo hay que cubrir el nuevo.
  assert.equal(rejectTake([swap("XMR_LOCKED")], q, q.xmrAtomic, cfg), null);
  // Swap negociado: su XMR aún no salió y sí se debe cubrir.
  assert.match(rejectTake([swap("NEGOTIATED")], q, q.xmrAtomic, cfg)!, /XMR disponible/);
});

test("lo ofrecible es 0 si está ocupado", () => {
  assert.equal(offerable([], PICONERO, DEFAULT_CONFIG), PICONERO);
  assert.equal(offerable([swap("NEGOTIATED")], PICONERO, DEFAULT_CONFIG), 0n);
  assert.equal(offerable([], 10n * PICONERO, DEFAULT_CONFIG), DEFAULT_CONFIG.maxExposure);
});

test("sin depósito: esperar y expirar tras el plazo", () => {
  assert.equal(nextStep(swap("NEGOTIATED"), { now: NOW, escrow: null }, ME, S).kind, "wait");
  assert.equal(nextStep(swap("NEGOTIATED"), { now: NOW + 1801, escrow: null }, ME, S).kind, "expire");
});

test("REGLA 1: un depósito inválido nunca lleva a enviar XMR", () => {
  const e = "0x" + "11".repeat(20);
  const bad: [Partial<EscrowInfo>, RegExp][] = [
    [{ claimer: "0x" + "22".repeat(20) }, /claimer/],
    [{ amount: 9_999_999n }, /monto/],
    [{ claimCommitment: "0x" + "dd".repeat(32) }, /claimCommitment/],
    [{ refundCommitment: "0x" + "dd".repeat(32) }, /refundCommitment/],
    [{ t0: NOW + 60 }, /t0 demasiado cerca/],
    [{ t1: NOW + 3600 + 600 }, /ventana/],
    [{ stage: "READY" }, /estado/],
  ];
  for (const [patch, re] of bad) {
    const st = nextStep(swap("NEGOTIATED"), { now: NOW, escrow: e as `0x${string}`, info: info(patch) }, ME, S);
    assert.equal(st.kind, "abort");
    if (st.kind === "abort") assert.match(st.reason, re);
  }
  const ok = nextStep(swap("NEGOTIATED"), { now: NOW, escrow: e as `0x${string}`, info: info() }, ME, S);
  assert.deepEqual(ok, { kind: "lock", escrow: e, t0: NOW + 3600, t1: NOW + 3600 + 7200 });
});

test("bloqueo tardío: si t0 se acercó sin enviar, se aborta", () => {
  assert.equal(nextStep(swap("LOCKING_XMR", { t0: NOW + 3600 }), { now: NOW }, ME, S).kind, "lock");
  assert.equal(nextStep(swap("LOCKING_XMR", { t0: NOW + 600 }), { now: NOW }, ME, S).kind, "abort");
  // Si ya se envió (reapertura de la pestaña), se reanuda en vez de abortar.
  assert.equal(nextStep(swap("LOCKING_XMR", { t0: NOW + 600, xmr_txid: "t" }), { now: NOW }, ME, S).kind, "lock");
});

test("REGLA 2: sin XMR enviado nunca se reclama", () => {
  assert.equal(nextStep(swap("XMR_LOCKED"), { now: NOW, info: info({ stage: "READY" }) }, ME, S).kind, "wait");
});

test("REGLA 3: sin READY se reclama solo tras t0 y con confirmaciones", () => {
  const s = swap("XMR_LOCKED", { xmr_txid: "t" });
  assert.equal(nextStep(s, { now: NOW, info: info() }, ME, S).kind, "wait");
  assert.equal(nextStep(s, { now: NOW + 3600, info: info(), confirmations: 9 }, ME, S).kind, "wait");
  assert.equal(nextStep(s, { now: NOW + 3600, info: info(), confirmations: 10 }, ME, S).kind, "claim");
  assert.equal(nextStep(s, { now: NOW, info: info({ stage: "READY" }) }, ME, S).kind, "claim");
});

test("REGLA 4: nunca reclamar cerca de t1", () => {
  const s = swap("XMR_LOCKED", { xmr_txid: "t" });
  const i = info({ stage: "READY" });
  assert.equal(nextStep(s, { now: i.t1 - S.claimCutoffBeforeT1, info: i }, ME, S).kind, "past_cutoff");
});

test("reembolso del taker → recuperar el XMR; cobro ya hecho → terminado", () => {
  const s = swap("XMR_LOCKED", { xmr_txid: "t" });
  const secret = ("0x" + "ee".repeat(32)) as `0x${string}`;
  assert.deepEqual(nextStep(s, { now: NOW, revealed: { kind: "Refunded", secret } }, ME, S), { kind: "recover", secret });
  assert.equal(nextStep(s, { now: NOW, revealed: { kind: "Claimed", secret } }, ME, S).kind, "claimed");
  assert.equal(nextStep(swap("RECOVERING_XMR"), { now: NOW }, ME, S).kind, "recover");
});
