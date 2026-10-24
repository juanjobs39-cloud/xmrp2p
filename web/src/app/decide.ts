/**
 * Decide la siguiente acción del taker. Es la lógica más importante de la app:
 * aquí se aplica la mitigación del riesgo 1 (docs/ARQUITECTURA.md): si el XMR no está
 * verificado cuando se acerca t0, el taker DEBE reembolsar, porque desde t0 el maker puede
 * cobrar el USDT aunque no haya bloqueado XMR.
 *
 * Función pura: sin red, sin DOM. Se prueba en test/decide.test.ts.
 */

export type Stage = "UNINITIALIZED" | "PENDING" | "READY" | "COMPLETED";

export interface ChainView {
  now: number; // block.timestamp (s)
  t0: number;
  t1: number;
  stage: Stage;
  revealed?: { kind: "Claimed" | "Refunded"; secret: string };
}

export interface XmrCheck {
  /** monto recibido en la dirección compartida (piconero) según check_tx_key */
  received: bigint;
  confirmations: number;
}

export interface Policy {
  expectedXmr: bigint;
  minConfirmations: number;
  /** reembolsar si a t0 le falta menos que esto y el XMR no está verificado */
  refundMarginS: number;
}

export type Action =
  | { kind: "wait_xmr"; reason: string; deadline: number }
  | { kind: "set_ready" }
  | { kind: "refund_now"; reason: string; urgent: boolean }
  | { kind: "wait_claim"; until: number }
  | { kind: "wait_t1"; until: number; reason: string }
  | { kind: "sweep"; makerSecret: string }
  | { kind: "done_refunded" }
  | { kind: "error"; reason: string };

export function xmrOk(check: XmrCheck | undefined, p: Policy): boolean {
  return !!check && check.received >= p.expectedXmr && check.confirmations >= p.minConfirmations;
}

export function decide(c: ChainView, check: XmrCheck | undefined, p: Policy): Action {
  if (c.stage === "UNINITIALIZED") return { kind: "error", reason: "el escrow no existe" };

  if (c.stage === "COMPLETED") {
    if (c.revealed?.kind === "Claimed") return { kind: "sweep", makerSecret: c.revealed.secret };
    if (c.revealed?.kind === "Refunded") return { kind: "done_refunded" };
    return { kind: "error", reason: "el escrow está cerrado pero no se encontró el evento" };
  }

  // Desde t1 el reembolso vuelve a estar permitido y el maker ya no puede cobrar.
  if (c.now >= c.t1) return { kind: "refund_now", reason: "pasó t1 sin que el maker cobrara", urgent: false };

  if (c.stage === "READY") return { kind: "wait_claim", until: c.t1 };

  // PENDING
  if (c.now >= c.t0) {
    // Ya no se puede reembolsar hasta t1; el maker puede cobrar. Si cobra, revela s_b y barremos.
    return xmrOk(check, p)
      ? { kind: "wait_claim", until: c.t1 }
      : { kind: "wait_t1", until: c.t1, reason: "t0 pasó sin verificar el XMR; si el maker no cobra, reembolsa en t1" };
  }
  if (xmrOk(check, p)) return { kind: "set_ready" };
  if (c.t0 - c.now <= p.refundMarginS) {
    return { kind: "refund_now", reason: "el XMR no está verificado y se acerca t0", urgent: true };
  }
  const reason = !check
    ? "esperando que el maker bloquee el XMR"
    : check.received < p.expectedXmr
      ? `el maker envió menos XMR del acordado`
      : `esperando confirmaciones (${check.confirmations}/${p.minConfirmations})`;
  return { kind: "wait_xmr", reason, deadline: c.t0 - p.refundMarginS };
}
