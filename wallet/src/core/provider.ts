// Reglas del proveedor que la wallet inyecta en los sitios (EIP-1193 + window.moneroP2P).
// Sin interfaz: lo usan el fondo (background) y las pruebas.

/** Únicos sitios donde se inyecta el proveedor (también fijados en content_scripts del manifiesto). */
export const SITE_ORIGINS = ["https://monerop2p.app", "https://fiat.monerop2p.app"] as const;

declare const __DEV_ORIGINS__: string[] | undefined;
/** Orígenes extra solo en compilaciones de desarrollo (DEV=1), para probar el sitio en localhost. */
export const DEV_ORIGINS: string[] = typeof __DEV_ORIGINS__ !== "undefined" ? __DEV_ORIGINS__ : [];

export function allowedOrigin(origin: string): boolean {
  return (SITE_ORIGINS as readonly string[]).includes(origin) || DEV_ORIGINS.includes(origin);
}

/** Lecturas que el fondo reenvía tal cual al RPC público de Arbitrum (no exponen nada de la wallet). */
export const READ_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
]);

/** Lo que necesita una ventana de aprobación del usuario. */
export type ApprovalKind = "connect" | "evm_tx" | "typed_data" | "xmr_address" | "xmr_transfer";

export interface PendingRequest {
  id: string;
  kind: ApprovalKind;
  origin: string;
  /** Parámetros ya validados por el fondo. */
  params: unknown;
  createdAt: number;
}

export interface EvmTxParams {
  from: `0x${string}`;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: `0x${string}`;
  gas?: `0x${string}`;
  maxFeePerGas?: `0x${string}`;
  maxPriorityFeePerGas?: `0x${string}`;
}

export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

export const ERR = {
  rejected: () => new RpcError(4001, "El usuario rechazó la solicitud."),
  unauthorized: () => new RpcError(4100, "Conecta la wallet primero."),
  unsupported: (m: string) => new RpcError(4200, `Método no soportado: ${m}`),
  chain: () => new RpcError(4902, "MoneroP2P Wallet solo usa la red de Arbitrum que corresponde a tu wallet."),
  invalid: (m: string) => new RpcError(-32602, m),
};

const HEX = /^0x[0-9a-fA-F]*$/;
const ADDR = /^0x[0-9a-fA-F]{40}$/;
const QTY = /^0x[0-9a-fA-F]{1,64}$/;

/** Valida eth_sendTransaction: solo campos conocidos, `from` debe ser nuestra cuenta y `to` obligatorio. */
export function checkTx(raw: unknown, account: string): EvmTxParams {
  if (!raw || typeof raw !== "object") throw ERR.invalid("transacción inválida");
  const r = raw as Record<string, unknown>;
  const s = (k: string, re: RegExp) => {
    const v = r[k];
    if (v == null) return undefined;
    if (typeof v !== "string" || !re.test(v)) throw ERR.invalid(`campo ${k} inválido`);
    return v as `0x${string}`;
  };
  const from = s("from", ADDR);
  const to = s("to", ADDR);
  if (!from || from.toLowerCase() !== account.toLowerCase()) throw ERR.invalid("from no es la cuenta conectada");
  if (!to) throw ERR.invalid("no se permite crear contratos desde la wallet");
  const data = s("data", HEX) ?? s("input", HEX);
  if (data && data.length % 2) throw ERR.invalid("data inválida");
  return { from, to, data, value: s("value", QTY), gas: s("gas", QTY), maxFeePerGas: s("maxFeePerGas", QTY), maxPriorityFeePerGas: s("maxPriorityFeePerGas", QTY) };
}

/** Valida eth_signTypedData_v4: [cuenta, JSON]; el dominio debe ser de nuestra red. */
export function checkTypedData(params: unknown, account: string, chainId: number): { account: `0x${string}`; data: TypedData } {
  if (!Array.isArray(params) || params.length < 2) throw ERR.invalid("parámetros inválidos");
  const [who, json] = params;
  if (typeof who !== "string" || who.toLowerCase() !== account.toLowerCase()) throw ERR.invalid("cuenta distinta a la conectada");
  let data: TypedData;
  try {
    data = (typeof json === "string" ? JSON.parse(json) : json) as TypedData;
  } catch {
    throw ERR.invalid("datos tipados inválidos");
  }
  if (!data || typeof data !== "object" || !data.types || !data.domain || typeof data.primaryType !== "string" || !data.message) throw ERR.invalid("datos tipados inválidos");
  if (Number(data.domain.chainId) !== chainId) throw ERR.chain();
  return { account: who as `0x${string}`, data };
}

export interface TypedData {
  types: Record<string, { name: string; type: string }[]>;
  domain: { name?: string; version?: string; chainId?: number | string; verifyingContract?: string; salt?: string };
  primaryType: string;
  message: Record<string, unknown>;
}

/** Monto de Monero en piconero (texto de dígitos), sin ceros ni negativos. */
export function checkPiconero(v: unknown): bigint {
  if (typeof v !== "string" || !/^[1-9]\d{0,19}$/.test(v)) throw ERR.invalid("monto inválido (piconero en texto)");
  return BigInt(v);
}
