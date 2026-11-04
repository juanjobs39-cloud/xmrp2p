/** Salidas de la transacción que libera el escrow al comprador (release o apelación a su favor). */

/** Reserva para la comisión de red (0.0001 XMR), igual que el backend y el árbitro. */
export const NETWORK_FEE_RESERVE = 100_000_000n;

export interface PayoutInput {
  balance: bigint;
  buyer: string;
  xmr: bigint;
  platform: string;
  fee: bigint;
  refund: string | null | undefined;
}

/**
 * Al comprador el monto exacto, a la plataforma la comisión y lo que sobre (reserva de red no usada o un
 * depósito de más) al reembolso del vendedor, para que no se quede en el escrow. El sobrante solo se envía
 * si la dirección de reembolso es distinta de las otras dos: el árbitro cuenta por dirección y, si
 * coincidieran, el monto del comprador o la comisión dejarían de ser exactos y rechazaría la firma.
 */
export function releaseDestinations(p: PayoutInput): { address: string; amount: string }[] {
  const dests = [{ address: p.buyer, amount: p.xmr.toString() }];
  if (p.fee > 0n) dests.push({ address: p.platform, amount: p.fee.toString() });
  const leftover = p.balance - p.xmr - p.fee - NETWORK_FEE_RESERVE;
  if (leftover > 0n && p.refund && p.refund !== p.buyer && p.refund !== p.platform) dests.push({ address: p.refund, amount: leftover.toString() });
  return dests;
}
