/**
 * Semilla maestra de la cuenta y derivación de sus wallets. Todo ocurre en el navegador: la semilla
 * vive dentro de la bóveda cifrada (identity.ts) y nunca se envía a ningún servidor.
 *
 *  - Semilla: BIP-39 de 12 palabras en inglés (128 bits).
 *  - Redes tipo Ethereum: BIP-44 estándar, m/44'/60'/0'/0/0 (la misma cuenta que MetaMask y similares).
 *  - Monero: llave privada de gasto = keccak256(llave BIP-32 en m/44'/128'/0'/0/0) reducida módulo ℓ.
 *    No todas las wallets de Monero derivan igual desde BIP-39; para restaurar en otra wallet se
 *    exporta la semilla de 25 palabras de Monero, que es estándar.
 *  - Identidad de la cuenta (la llave que firma las peticiones): m/44'/60'/100'/0/0, distinta de la
 *    wallet, para que firmar peticiones nunca use la llave que guarda fondos.
 *
 * Sin DOM ni red: se prueba con `npm test`.
 */
import { bytesToHex, hexToBytes, keccak256 } from "viem";
import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

export const PATHS = {
  identity: "m/44'/60'/100'/0/0",
  evm: "m/44'/60'/0'/0/0",
  monero: "m/44'/128'/0'/0/0",
} as const;

/** Orden del grupo de ed25519 (ℓ): las llaves privadas de Monero son escalares menores que ℓ. */
const L = 2n ** 252n + 27742317777372353535851937790883648493n;

const WORDS = new Set(english);

/** Semilla nueva de 12 palabras. */
export const newSeed = (): string => generateMnemonic(english, 128);

/** Normaliza espacios y mayúsculas; lanza si no son 12 palabras de la lista. */
export function cleanSeed(seed: string): string {
  const w = seed.trim().toLowerCase().split(/\s+/);
  if (w.length !== 12) throw new Error("la semilla debe tener 12 palabras");
  const bad = w.find((x) => !WORDS.has(x));
  if (bad) throw new Error(`palabra desconocida en la semilla: ${bad}`);
  return w.join(" ");
}

function child(seed: string, path: string): Uint8Array {
  // viem tipa la ruta como m/44'/60'/…; la derivación BIP-32 acepta cualquier ruta.
  const k = mnemonicToAccount(cleanSeed(seed), { path: path as `m/44'/60'/${string}` }).getHdKey().privateKey;
  if (!k) throw new Error("no se pudo derivar la llave");
  return k;
}

/** Llave de la cuenta (firma las peticiones a la API). */
export const identityKey = (seed: string): `0x${string}` => bytesToHex(child(seed, PATHS.identity));

/** Llave privada de la cuenta en redes tipo Ethereum (Arbitrum, Ethereum…). */
export const evmKey = (seed: string): `0x${string}` => bytesToHex(child(seed, PATHS.evm));

/** Dirección en redes tipo Ethereum. */
export const evmAddress = (seed: string): `0x${string}` => privateKeyToAccount(evmKey(seed)).address;

/** Reduce 32 bytes (little-endian) módulo ℓ, como sc_reduce32 de Monero. */
export function scReduce32(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 32) throw new Error("se esperaban 32 bytes");
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]!);
  n %= L;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

/** Llave privada de gasto de Monero (64 hex), de la que monero-ts saca dirección, llave de vista y semilla de 25 palabras. */
export function moneroSpendKey(seed: string): string {
  const k = scReduce32(hexToBytes(keccak256(child(seed, PATHS.monero))));
  if (k.every((b) => b === 0)) throw new Error("no se pudo derivar la llave de Monero");
  return bytesToHex(k).slice(2);
}
