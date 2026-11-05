// Comisión de MoneroP2P por envío de XMR. Siempre visible: se muestra en la pantalla de confirmación
// como una línea aparte, antes de firmar, y está documentada en la página de la wallet.
// Va como una salida más de la misma transacción a la dirección de comisiones del proyecto.

/** 0.25 % en puntos básicos. */
export const FEE_BPS = 25n;
/** Por debajo de esto no se cobra (no vale la pena una salida extra por montos diminutos). */
export const FEE_MIN = 10_000_000n; // 0.00001 XMR

/** Dirección de comisiones por red. Sin dirección, no hay comisión (stagenet). */
export const FEE_ADDRESS: Record<"mainnet" | "stagenet", string | null> = {
  mainnet: "8AfP2xg6N4WW67y3C6KvHrWBh4vUStzyHdNAMaQb5oK8FjNd2obui1FAD7kei25CRnQYjBLq8dSxhGpieM4ACJ3EQhL7eyr",
  stagenet: null,
};

export function feePercentLabel(): string {
  return `${Number(FEE_BPS) / 100}%`;
}

/** Comisión para enviar `amount` piconero al destino (se suma encima del monto). */
export function feeFor(amount: bigint): bigint {
  const f = (amount * FEE_BPS) / 10_000n;
  return f >= FEE_MIN ? f : 0n;
}

/**
 * "Enviar todo": reparte el saldo disponible entre destino y comisión, de modo que la comisión sea
 * FEE_BPS del monto del destino. La comisión de la red se descuenta luego del destino.
 */
export function splitAll(unlocked: bigint): { dest: bigint; fee: bigint } {
  let fee = (unlocked * FEE_BPS) / (10_000n + FEE_BPS);
  if (fee < FEE_MIN) fee = 0n;
  return { dest: unlocked - fee, fee };
}
