// Reglas del árbitro: qué verifica antes de poner su firma. Si algo no cuadra, NO firma.
// Funciones puras (sin red ni wallet) para poder probarlas a fondo.
import { getAddress, isAddress, verifyMessage } from "viem";

/** Antigüedad máxima de una autorización firmada (el vendedor o el admin pueden reintentar). */
export const MAX_AUTH_AGE_S = 7 * 24 * 3600;

const sha256Hex = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Mismo mensaje que firma el navegador (ver workers/src/api/auth.ts). */
export async function signedMessage(method, path, address, ts, body) {
  return `xmrp2p|${method.toUpperCase()}|${path}|${address.toLowerCase()}|${ts}|${await sha256Hex(body)}`;
}

/**
 * Verifica por su cuenta la firma que autoriza un pago:
 *  - release: POST /v1/p2p/orders/<id>/release firmado por el vendedor;
 *  - resolve: POST /v1/p2p/admin/orders/<id>/resolve firmado por el administrador, con el ganador indicado.
 * No confía en lo que diga el servidor: recalcula el mensaje y comprueba la firma.
 */
export async function verifyAuthorization(auth, { kind, orderId, signer, winner, nowS = Math.floor(Date.now() / 1000) }) {
  if (!auth || typeof auth !== "object") throw new Error("falta la autorización firmada");
  const path = kind === "release" ? `/v1/p2p/orders/${orderId}/release` : `/v1/p2p/admin/orders/${orderId}/resolve`;
  if (auth.method !== "POST" || auth.path !== path) throw new Error("la autorización no es para esta orden y acción");
  if (!isAddress(signer) || String(auth.address).toLowerCase() !== signer.toLowerCase()) throw new Error("la autorización no la firmó quien debe");
  const ts = Number(auth.ts);
  if (!Number.isInteger(ts) || ts > nowS + 300 || nowS - ts > MAX_AUTH_AGE_S) throw new Error("autorización vencida o con fecha inválida");
  if (typeof auth.body !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(String(auth.signature))) throw new Error("autorización incompleta");
  if (kind === "resolve") {
    let body;
    try {
      body = JSON.parse(auth.body);
    } catch {
      throw new Error("decisión ilegible");
    }
    if (body.winner !== winner) throw new Error("la decisión firmada no coincide con el ganador");
  }
  const message = await signedMessage(auth.method, auth.path, signer, auth.ts, auth.body);
  const ok = await verifyMessage({ address: getAddress(signer), message, signature: auth.signature });
  if (!ok) throw new Error("firma inválida");
}

/**
 * Comprueba que la transacción paga exactamente lo que dice la orden.
 *  - release / resolve a favor del comprador: al comprador justo el monto, a la plataforma justo la
 *    comisión y, si sobra, solo al reembolso del vendedor.
 *  - refund / resolve a favor del vendedor: todo al reembolso del vendedor.
 * La comisión de red no puede pasar la reserva que depositó el vendedor.
 */
export function checkSpend(described, task, { feeAddress, networkFeeReserve }) {
  const outs = described.outputs;
  if (described.txCount !== 1) throw new Error("debe ser una sola transacción");
  if (!outs.length) throw new Error("la transacción no paga a nadie");
  if (described.fee > BigInt(networkFeeReserve)) throw new Error("comisión de red demasiado alta");
  const toBuyer = task.task === "release" || (task.task === "resolve" && task.winner === "buyer");
  const toSeller = task.task === "refund" || (task.task === "resolve" && task.winner === "seller");
  if (toBuyer === toSeller) throw new Error("tarea desconocida");
  if (toSeller) {
    for (const o of outs) if (o.address !== task.to) throw new Error("el reembolso solo puede ir a la dirección del vendedor");
    return;
  }
  const xmr = BigInt(task.xmr_pico);
  const fee = BigInt(task.fee_pico);
  let buyer = 0n;
  let platform = 0n;
  for (const o of outs) {
    if (o.address === task.to) buyer += o.amount;
    else if (o.address === feeAddress) platform += o.amount;
    else if (task.refund_to && o.address === task.refund_to) continue; // sobrante para el vendedor
    else throw new Error(`salida a una dirección no autorizada: ${o.address.slice(0, 12)}…`);
  }
  if (buyer !== xmr) throw new Error("el comprador no recibe exactamente el monto de la orden");
  if (fee > 0n && platform !== fee) throw new Error("la comisión de la plataforma no coincide");
  if (fee === 0n && platform !== 0n) throw new Error("pago inesperado a la plataforma");
}

/** Tareas que el árbitro solo atiende con una autorización firmada. */
export function authorizationFor(task, adminAddress) {
  if (task.task === "release") return { kind: "release", signer: task.seller };
  if (task.task === "resolve") return { kind: "resolve", signer: adminAddress, winner: task.winner };
  return null; // refund: lo decide el estado de la orden (canceló el comprador o se agotó el tiempo)
}

/** Quién crea la transacción de salida y la manda a firmar al árbitro. */
export function spenderRole(task) {
  if (task.task === "release" || task.task === "refund") return "seller";
  if (task.task === "resolve") return task.winner;
  return null;
}
