// Cuenta EVM (Arbitrum) derivada de la misma semilla de Monero, sin interfaz ni red.
//
// Derivación (no estándar, documentada en el README):
//   llave = HKDF-SHA256(ikm = llave privada de gasto de Monero (32 bytes),
//                       salt = "MoneroP2P Wallet EVM", info = "arbitrum/v1[/n]")
// Si el resultado no es una llave secp256k1 válida (0 o ≥ n, probabilidad ~2^-128) se repite con /1, /2…
// Restaurar la semilla de 25 palabras en esta wallet devuelve siempre la misma cuenta. En otras wallets
// la cuenta se usa exportando su llave privada desde Ajustes.
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export function deriveEvmKey(spendKeyHex: string): `0x${string}` {
  if (!/^[0-9a-f]{64}$/i.test(spendKeyHex)) throw new Error("llave de gasto inválida");
  const ikm = hexToBytes(spendKeyHex.toLowerCase());
  for (let i = 0; i < 16; i++) {
    const out = hkdf(sha256, ikm, utf8ToBytes("MoneroP2P Wallet EVM"), utf8ToBytes(i ? `arbitrum/v1/${i}` : "arbitrum/v1"), 32);
    const k = BigInt("0x" + bytesToHex(out));
    if (k > 0n && k < N) return `0x${bytesToHex(out)}`;
  }
  throw new Error("no se pudo derivar la llave");
}

export type Net = "mainnet" | "stagenet";

export interface EvmChain {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
  token: `0x${string}`;
  tokenSymbol: string;
  /** Fábrica de escrows del atomic swap (para reconocer sus llamadas al aprobar). */
  factory: `0x${string}`;
  testnet: boolean;
}

/** La wallet de Monero en stagenet usa Arbitrum Sepolia (todo de prueba); la principal, Arbitrum One. */
export const CHAINS: Record<Net, EvmChain> = {
  mainnet: {
    id: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    token: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USD₮0
    tokenSymbol: "USDT",
    factory: "0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535",
    testnet: false,
  },
  stagenet: {
    id: 421614,
    name: "Arbitrum Sepolia",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    token: "0x7c08fD8C4E1774f685EA03e6c50Ee9a6B20C8064",
    tokenSymbol: "tUSDT",
    factory: "0x89b330882Ea2a18aF6FE507e5832bB15ccA5542e",
    testnet: true,
  },
};

export const TOKEN_DECIMALS = 6;

export function isEvmAddress(a: string): a is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(a);
}

/** "1.5" → unidades enteras con `decimals`; rechaza más decimales de los permitidos. */
export function parseUnitsStrict(v: string, decimals: number): bigint {
  const s = v.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("monto inválido");
  const [i, f = ""] = s.split(".");
  if (f.length > decimals) throw new Error("demasiados decimales");
  const n = BigInt(i) * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0") || "0");
  if (n <= 0n) throw new Error("monto inválido");
  return n;
}

export function formatUnitsShort(v: bigint, decimals: number, max = 6): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const i = a / base;
  const f = (a % base).toString().padStart(decimals, "0").slice(0, max).replace(/0+$/, "");
  return `${neg ? "-" : ""}${i}${f ? "." + f : ""}`;
}
