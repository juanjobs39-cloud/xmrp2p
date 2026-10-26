/**
 * Motor del maker en el navegador: decisiones puras (sin red ni wallet), con las mismas reglas
 * de seguridad que el daemon de Python (`maker/xmrp2p_maker/engine.py`):
 *
 * 1. Nunca enviar XMR sin un depósito válido en la cadena (monto, commitments, plazos).
 * 2. Nunca reclamar si no bloqueamos XMR: reclamar sin bloquear sería robar al taker.
 * 3. Sin READY, reclamar solo tras t0 y con el XMR ya confirmado.
 * 4. Nunca enviar `claim` cerca de t1: si la tx fallara, el secreto quedaría público.
 * 5. Idempotencia: antes de enviar XMR, comprobar si ya se envió (reaperturas de la pestaña).
 *
 * Quien ejecuta las acciones es `maker-app.ts`.
 */

export const PICONERO = 10n ** 12n;
export const USDT_UNIT = 10n ** 6n;

export type MState =
  | "NEGOTIATED"
  | "LOCKING_XMR"
  | "XMR_LOCKED"
  | "CLAIMING"
  | "CLAIMED"
  | "RECOVERING_XMR"
  | "RECOVERED"
  | "ABORTED"
  | "EXPIRED";

export const ACTIVE: ReadonlySet<MState> = new Set(["NEGOTIATED", "LOCKING_XMR", "XMR_LOCKED", "CLAIMING", "RECOVERING_XMR"]);

export interface Safety {
  /** Tiempo mínimo hasta t0 al ver el depósito (el taker necesita ~20 min de confirmaciones). */
  minTimeToT0: number;
  /** Ventana mínima entre t0 y t1 para cobrar. */
  minClaimWindow: number;
  /** No se envía `claim` si falta menos que esto para t1. */
  claimCutoffBeforeT1: number;
  /** Tiempo que tiene el taker para depositar. */
  depositTimeout: number;
  /** Confirmaciones de nuestro XMR para cobrar sin READY tras t0. */
  xmrConfirmations: number;
}

export interface MakerConfig {
  marginBps: number;
  minUsdt: number;
  maxUsdt: number;
  /** XMR comprometido en swaps abiertos, como máximo (piconero). */
  maxExposure: bigint;
  maxConcurrent: number;
  safety: Safety;
}

export const DEFAULT_SAFETY: Safety = {
  minTimeToT0: 45 * 60,
  minClaimWindow: 60 * 60,
  claimCutoffBeforeT1: 15 * 60,
  depositTimeout: 30 * 60,
  xmrConfirmations: 10,
};

export const DEFAULT_CONFIG: MakerConfig = {
  marginBps: 150,
  minUsdt: 5,
  maxUsdt: 100,
  maxExposure: 2n * PICONERO,
  // Un swap a la vez: tras cada envío, el cambio de la wallet queda bloqueado 10 bloques (~20 min).
  maxConcurrent: 1,
  safety: DEFAULT_SAFETY,
};

export interface PublicMessage {
  spend_public_ed25519: string;
  public_secp256k1: string;
  contract_commitment: string;
  view_private: string;
  dleq_proof: string;
}

/** Estado de un swap del maker. Se guarda cifrado en el navegador y en el archivo de respaldo. */
export interface MakerSwap {
  id: string;
  state: MState;
  note?: string;
  created_at: number;
  room_id?: string;
  /** Id de la solicitud del backend (para descartarla si vence antes de responder). */
  request_id?: string;
  usdt_atomic: string;
  xmr_atomic: string;
  price: string;
  taker_message: PublicMessage;
  taker_commitment: string;
  maker_spend: string;
  maker_secret: `0x${string}`;
  maker_commitment: string;
  maker_message: PublicMessage;
  shared_address: string;
  shared_view_key: string;
  from_block: number;
  deposit_deadline: number;
  xmr_restore_height: number;
  escrow?: `0x${string}`;
  t0?: number;
  t1?: number;
  xmr_txid?: string;
  xmr_tx_key?: string;
  /** Tx de XMR preparada y aún no confirmada como transmitida (para retransmitir la misma). */
  xmr_meta?: string;
  /** false si el aviso `xmr_locked` no pudo enviarse al taker (se reintenta). */
  lock_sent?: boolean;
  taker_secret?: `0x${string}`;
  claim_tx?: string;
  sweep_tx?: string;
  past_cutoff?: boolean;
}

export interface Quote {
  usdtAtomic: bigint;
  xmrAtomic: bigint;
  /** Precio del maker en USDT por XMR (con margen). */
  price: number;
}

/** Precio del maker con margen y XMR a entregar (redondeado hacia abajo). */
export function quote(usdt: string, referencePrice: number, cfg: MakerConfig): Quote {
  if (!/^\d+(\.\d{1,6})?$/.test(usdt)) throw new Error("monto de USDT inválido");
  const [ent, dec = ""] = usdt.split(".");
  const usdtAtomic = BigInt(ent!) * USDT_UNIT + BigInt(dec.padEnd(6, "0"));
  const n = Number(usdt);
  if (n < cfg.minUsdt || n > cfg.maxUsdt) throw new Error(`monto fuera de límites (${cfg.minUsdt}–${cfg.maxUsdt} USDT)`);
  if (!(referencePrice > 0)) throw new Error("sin precio de referencia");
  const price = (referencePrice * (10_000 + cfg.marginBps)) / 10_000;
  const priceMicro = BigInt(Math.round(price * 1e6)); // micro-USDT por XMR
  const xmrAtomic = (usdtAtomic * PICONERO) / priceMicro;
  return { usdtAtomic, xmrAtomic, price };
}

const sum = (xs: MakerSwap[], states: MState[]) =>
  xs.filter((s) => states.includes(s.state)).reduce((a, s) => a + BigInt(s.xmr_atomic), 0n);

/** XMR comprometido en swaps abiertos (negociados o con XMR bloqueado). */
export function exposure(swaps: MakerSwap[]): bigint {
  return sum(swaps, ["NEGOTIATED", "LOCKING_XMR", "XMR_LOCKED", "CLAIMING", "RECOVERING_XMR"]);
}

/** XMR comprometido que todavía no salió de la wallet. */
export function pendingSend(swaps: MakerSwap[]): bigint {
  return sum(swaps, ["NEGOTIATED", "LOCKING_XMR"]);
}

/** ¿Se puede aceptar este swap? Devuelve el motivo del rechazo o null. */
export function rejectTake(swaps: MakerSwap[], q: Quote, unlocked: bigint, cfg: MakerConfig): string | null {
  const active = swaps.filter((s) => ACTIVE.has(s.state));
  if (active.length >= cfg.maxConcurrent) return "el maker está ocupado; intenta más tarde";
  if (exposure(swaps) + q.xmrAtomic > cfg.maxExposure) return "se superaría el límite de exposición del maker";
  // El saldo desbloqueado ya excluye el XMR enviado: solo se cubre lo comprometido que no salió más este swap.
  if (unlocked < pendingSend(swaps) + q.xmrAtomic) return "el maker no tiene XMR disponible suficiente";
  return null;
}

/** Cuánto XMR puede ofrecer el maker ahora (piconero). */
export function offerable(swaps: MakerSwap[], unlocked: bigint, cfg: MakerConfig): bigint {
  const free = unlocked - pendingSend(swaps);
  const room = cfg.maxExposure - exposure(swaps);
  const v = free < room ? free : room;
  const active = swaps.filter((s) => ACTIVE.has(s.state)).length;
  return active >= cfg.maxConcurrent || v < 0n ? 0n : v;
}

export interface EscrowInfo {
  stage: "UNINITIALIZED" | "PENDING" | "READY" | "COMPLETED";
  claimer: string;
  amount: bigint;
  claimCommitment: string;
  refundCommitment: string;
  t0: number;
  t1: number;
}

export function validateDeposit(s: MakerSwap, info: EscrowInfo, now: number, me: string, safety: Safety): string | null {
  if (info.claimer.toLowerCase() !== me.toLowerCase()) return "el escrow no nos tiene como claimer";
  if (info.stage !== "PENDING") return `escrow en estado ${info.stage}`;
  if (info.amount !== BigInt(s.usdt_atomic)) return `monto depositado ${info.amount} ≠ acordado ${s.usdt_atomic}`;
  if (info.claimCommitment.toLowerCase() !== s.maker_commitment.toLowerCase()) return "claimCommitment no es el nuestro";
  if (info.refundCommitment.toLowerCase() !== s.taker_commitment.toLowerCase()) return "refundCommitment no es el del taker verificado";
  if (info.t0 - now < safety.minTimeToT0) return `t0 demasiado cerca (${info.t0 - now} s)`;
  if (info.t1 - info.t0 < safety.minClaimWindow) return `ventana de reclamo demasiado corta (${info.t1 - info.t0} s)`;
  return null;
}

/** Lo que el ejecutor sabe de la cadena en este ciclo. */
export interface Observed {
  now: number;
  /** NEGOTIATED: escrow encontrado con nuestros commitments (o null). */
  escrow?: `0x${string}` | null;
  info?: EscrowInfo;
  revealed?: { kind: "Claimed" | "Refunded"; secret: `0x${string}`; tx?: string } | null;
  /** Confirmaciones de nuestro envío de XMR. */
  confirmations?: number;
}

export type Step =
  | { kind: "wait"; reason: string }
  | { kind: "expire"; reason: string }
  | { kind: "abort"; reason: string; notify: string; escrow?: `0x${string}` }
  | { kind: "lock"; escrow?: `0x${string}`; t0?: number; t1?: number }
  | { kind: "claim" }
  | { kind: "claimed"; tx?: string }
  | { kind: "recover"; secret?: `0x${string}` }
  | { kind: "past_cutoff" };

/** Siguiente paso de un swap según su estado y lo observado en la cadena. */
export function nextStep(s: MakerSwap, o: Observed, me: string, safety: Safety): Step {
  switch (s.state) {
    case "NEGOTIATED": {
      if (!o.escrow) {
        return o.now > s.deposit_deadline ? { kind: "expire", reason: "el taker no depositó a tiempo" } : { kind: "wait", reason: "esperando el depósito" };
      }
      if (!o.info) return { kind: "wait", reason: "leyendo el escrow" };
      const problem = validateDeposit(s, o.info, o.now, me, safety);
      if (problem) return { kind: "abort", reason: problem, notify: problem, escrow: o.escrow };
      return { kind: "lock", escrow: o.escrow, t0: o.info.t0, t1: o.info.t1 };
    }
    case "LOCKING_XMR": {
      if (!s.xmr_txid && (s.t0 ?? 0) - o.now < safety.minTimeToT0 / 2) {
        // Demasiado tarde para que el taker verifique antes de t0. No enviamos y NUNCA reclamamos.
        return { kind: "abort", reason: "se acercó t0 antes de poder bloquear XMR", notify: "el maker no bloqueó XMR a tiempo; reembolsa tu USDT" };
      }
      return { kind: "lock" };
    }
    case "XMR_LOCKED":
    case "CLAIMING": {
      if (!s.xmr_txid) return { kind: "wait", reason: "sin registro del envío de XMR" }; // regla 2
      if (o.revealed?.kind === "Refunded") return { kind: "recover", secret: o.revealed.secret };
      if (o.revealed?.kind === "Claimed") return { kind: "claimed", tx: o.revealed.tx };
      if (!o.info) return { kind: "wait", reason: "leyendo el escrow" };
      if (o.now >= o.info.t1 - safety.claimCutoffBeforeT1) return { kind: "past_cutoff" };
      if (o.info.stage === "READY") return { kind: "claim" };
      if (o.now >= o.info.t0) {
        return (o.confirmations ?? 0) >= safety.xmrConfirmations ? { kind: "claim" } : { kind: "wait", reason: "esperando confirmaciones de nuestro XMR" };
      }
      return { kind: "wait", reason: "esperando que el taker confirme (o t0)" };
    }
    case "RECOVERING_XMR":
      return { kind: "recover" };
    default:
      return { kind: "wait", reason: "terminado" };
  }
}
