/**
 * Configuración de la app del swap. Los valores salen de variables PUBLIC_* en tiempo de build
 * (ver web/.env.example), que a su vez se llenan desde config/xmrp2p.example.toml.
 * Todo es testnet: la app se niega a operar con una red marcada como mainnet.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const ZERO = "0x0000000000000000000000000000000000000000";

export interface EvmNetwork {
  id: string;
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  factory: `0x${string}`;
  token: `0x${string}`;
  tokenSymbol: string;
  testnet: true;
}

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
  },
};

export const API_URL = env.PUBLIC_API_URL ?? "";

export const MONERO = {
  network: "stagenet" as const,
  /** Nodo por defecto: el proxy de la Fase 4 (sirve el nodo en la raíz del host). El usuario puede cambiarlo. */
  defaultNode: env.PUBLIC_MONERO_NODE ?? "",
  minConfirmations: 10,
  /** Primera letra de las direcciones stagenet estándar / subdirecciones. */
  addressPrefixes: ["5", "7"],
};

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
