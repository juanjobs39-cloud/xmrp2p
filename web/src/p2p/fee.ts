/**
 * Comisión de retiro de MoneroP2P (etapa D): 0.5 % al enviar desde la wallet de la cuenta a una
 * dirección externa. No aplica a envíos por @apodo (otro usuario), a tus propias direcciones, al
 * depósito de un cambio ni al depósito al escrow de una orden. Siempre se muestra en la pantalla de
 * revisión, en su propia línea, antes de firmar.
 *
 * Como la plataforma no custodia, la comisión viaja en lo que arma la app: en Monero es una salida
 * más de la misma transacción; en Arbitrum, una segunda transferencia.
 *
 * Módulo puro (sin DOM ni red) para poder probarlo.
 */

/** 0.5 % en puntos básicos. */
export const WITHDRAW_BPS = 50n;

export type FeeAsset = "xmr" | "token" | "eth";

/** Por debajo de esto no se cobra: no vale la salida o la transferencia extra. Unidad mínima de cada activo. */
export const FEE_MIN: Record<FeeAsset, bigint> = {
  xmr: 10_000_000n, // 0.00001 XMR
  token: 50_000n, // 0.05 USDT (6 decimales): retiros desde 10 USDT
  eth: 20_000_000_000_000n, // 0.00002 ETH
};

export interface FeeRule {
  /** Dirección pública de comisiones del proyecto en esa red. */
  address: string;
  bps: bigint;
  min: bigint;
}

const env = ((import.meta as { env?: Record<string, string | undefined> }).env ?? {}) as Record<string, string | undefined>;

/**
 * Direcciones públicas donde cae la comisión, solo en redes con dinero real. En redes de prueba no
 * hay comisión, salvo que el build de pruebas ponga una dirección con PUBLIC_P2P_FEE_XMR / _EVM.
 */
const FEE_TO = {
  xmr: {
    mainnet: "44jECpwiKjzZvihKCj8Je3BYRyHh71qaJ36sHjVchvVKCVqaKDuPaQR5wkWAgh962QRd1N6Y83at5DRxSkFU7qPbCzPrxbs",
    stagenet: env.PUBLIC_P2P_FEE_XMR || null,
  } as Record<string, string | null>,
  evm: {
    42161: "0xcef9678D45a4cD334af093AE2196001ce5bB0299",
    421614: env.PUBLIC_P2P_FEE_EVM || null,
  } as Record<number, string | null>,
};

/** Regla de comisión para un retiro, o null si en esa red no se cobra. */
export function withdrawRule(asset: FeeAsset, net: string | number): FeeRule | null {
  const address = asset === "xmr" ? FEE_TO.xmr[String(net)] : FEE_TO.evm[Number(net)];
  return address ? { address, bps: WITHDRAW_BPS, min: FEE_MIN[asset] } : null;
}

/** ¿Se cobra en este envío? No si el destino es otro usuario (por @apodo), una dirección propia o la de comisiones. */
export function chargeable(rule: FeeRule | null, dest: { address: string; nick?: string }, own: string[]): FeeRule | null {
  if (!rule || dest.nick) return null;
  const same = (a: string, b: string) => (a.startsWith("0x") ? a.toLowerCase() === b.toLowerCase() : a === b);
  if ([...own, rule.address].some((a) => same(a, dest.address.trim()))) return null;
  return rule;
}

/** Comisión para enviar `amount` al destino: se suma encima del monto. Cero si no alcanza el mínimo. */
export function feeFor(amount: bigint, rule: Pick<FeeRule, "bps" | "min"> | null): bigint {
  if (!rule || amount <= 0n) return 0n;
  const f = (amount * rule.bps) / 10_000n;
  return f >= rule.min ? f : 0n;
}

/** «Enviar todo»: reparte `total` entre destino y comisión, con la comisión igual a `bps` de lo que recibe el destino. */
export function splitAll(total: bigint, rule: Pick<FeeRule, "bps" | "min"> | null): { dest: bigint; fee: bigint } {
  if (!rule || total <= 0n) return { dest: total > 0n ? total : 0n, fee: 0n };
  let fee = (total * rule.bps) / (10_000n + rule.bps);
  if (fee < rule.min) fee = 0n;
  return { dest: total - fee, fee };
}

export const feePercentLabel = (rule: Pick<FeeRule, "bps">): string => `${Number(rule.bps) / 100} %`;
