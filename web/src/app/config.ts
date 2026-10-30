/**
 * Configuración de la app del swap. Los valores salen de variables PUBLIC_* en tiempo de build
 * (ver web/.env.example).
 *
 * Redes:
 * - arbitrum_sepolia + Monero stagenet: práctica, sin valor.
 * - arbitrum_one + Monero mainnet: DINERO REAL (tope de 100 USDT por swap,
 *   también en el contrato). Solo se activa con PUBLIC_MAINNET=on y la fábrica desplegada.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const ZERO = "0x0000000000000000000000000000000000000000";

export interface MoneroNet {
  network: "stagenet" | "mainnet";
  /** Primera letra de las direcciones estándar / subdirecciones. */
  addressPrefixes: string[];
  minConfirmations: number;
  /** Nodo por defecto (proxy de MoneroP2P). El usuario puede cambiarlo. */
  defaultNode: string;
}

export interface EvmNetwork {
  id: string;
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  factory: `0x${string}`;
  token: `0x${string}`;
  tokenSymbol: string;
  testnet: boolean;
  monero: MoneroNet;
  /** Tope de USDT por swap (el contrato también lo impone). */
  maxUsdt?: number;
}

export const STAGENET: MoneroNet = {
  network: "stagenet",
  addressPrefixes: ["5", "7"],
  minConfirmations: 10,
  defaultNode: env.PUBLIC_MONERO_NODE ?? "",
};

export const XMR_MAINNET: MoneroNet = {
  network: "mainnet",
  addressPrefixes: ["4", "8"],
  minConfirmations: 10,
  defaultNode: env.PUBLIC_MONERO_NODE_MAINNET ?? "https://nodo-xmr.monerop2p.app",
};

export const NETWORKS: Record<string, EvmNetwork> = {
  arbitrum_sepolia: {
    id: "arbitrum_sepolia",
    chainId: 421614,
    name: "Arbitrum Sepolia (testnet)",
    rpc: env.PUBLIC_ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    factory: (env.PUBLIC_ARBITRUM_SEPOLIA_FACTORY ?? ZERO) as `0x${string}`,
    token: (env.PUBLIC_ARBITRUM_SEPOLIA_TOKEN ?? ZERO) as `0x${string}`,
    tokenSymbol: "tUSDT",
    testnet: true,
    monero: STAGENET,
  },
  arbitrum_one: {
    id: "arbitrum_one",
    chainId: 42161,
    name: "Arbitrum One",
    rpc: env.PUBLIC_ARBITRUM_ONE_RPC ?? "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    factory: (env.PUBLIC_ARBITRUM_ONE_FACTORY ?? ZERO) as `0x${string}`,
    token: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USD₮0
    tokenSymbol: "USDT",
    testnet: false,
    monero: XMR_MAINNET,
    maxUsdt: 100,
  },
};

export const API_URL = env.PUBLIC_API_URL ?? "";

/** Compatibilidad: Monero de la red de práctica. Usar `net.monero` en código nuevo. */
export const MONERO = STAGENET;

export const POLICY = {
  /** Duraciones que propone el taker (el maker exige ≥ 45 min hasta t0 y ≥ 1 h entre t0 y t1). */
  duration0: 60 * 60,
  duration1: 2 * 60 * 60,
  /** Si a t0 le falta menos que esto y el XMR no está verificado, la app pide reembolsar. */
  refundMarginS: 10 * 60,
  pollMs: 15_000,
};

export function isDeployed(n: EvmNetwork): boolean {
  return n.factory !== ZERO && n.token !== ZERO;
}

/** Vista simple tipo agregador: la predeterminada. PUBLIC_DRAFT_UI=off vuelve al formulario clásico. */
export const DRAFT_UI = env.PUBLIC_DRAFT_UI !== "off";

/** ¿Está activo el modo con dinero real en este build? */
export const MAINNET_ON = env.PUBLIC_MAINNET === "on" && isDeployed(NETWORKS.arbitrum_one!);

/**
 * Red elegida en la página: dinero real por defecto (si está activo); `?red=prueba` para la red de
 * práctica. Un swap guardado siempre usa la red con la que se creó.
 */
export function selectedNetwork(search = typeof location === "undefined" ? "" : location.search): EvmNetwork {
  const practica = new URLSearchParams(search).get("red") === "prueba";
  return MAINNET_ON && !practica ? NETWORKS.arbitrum_one! : NETWORKS.arbitrum_sepolia!;
}

/** Valida una dirección de Monero estándar o subdirección para la red dada. */
export function validXmrAddress(addr: string, m: MoneroNet): boolean {
  return m.addressPrefixes.includes(addr[0] ?? "") && /^[1-9A-HJ-NP-Za-km-z]{95}$/.test(addr);
}
