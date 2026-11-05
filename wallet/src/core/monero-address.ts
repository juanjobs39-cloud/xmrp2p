// Validación de direcciones Monero sin depender de monero-ts: base58 de Monero (bloques de 8 bytes),
// prefijo de red y checksum Keccak-256. Sirve para avisar ANTES de preparar un envío.
import { keccak_256 } from "@noble/hashes/sha3";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const FULL_BLOCK = 8;
const FULL_ENCODED = 11;
// Longitud codificada de un bloque de n bytes (n = índice).
const ENCODED_SIZES = [0, 2, 3, 5, 6, 7, 9, 10, 11];

export type Network = "mainnet" | "stagenet" | "testnet";
export type AddressKind = "standard" | "integrated" | "subaddress";

const PREFIXES: Record<number, { network: Network; kind: AddressKind }> = {
  18: { network: "mainnet", kind: "standard" },
  19: { network: "mainnet", kind: "integrated" },
  42: { network: "mainnet", kind: "subaddress" },
  24: { network: "stagenet", kind: "standard" },
  25: { network: "stagenet", kind: "integrated" },
  36: { network: "stagenet", kind: "subaddress" },
  53: { network: "testnet", kind: "standard" },
  54: { network: "testnet", kind: "integrated" },
  63: { network: "testnet", kind: "subaddress" },
};

function decodeBlock(block: string): Uint8Array {
  const size = ENCODED_SIZES.indexOf(block.length);
  if (size <= 0) throw new Error("bloque base58 inválido");
  let num = 0n;
  for (const ch of block) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) throw new Error("carácter inválido");
    num = num * 58n + BigInt(d);
  }
  if (num >= 1n << BigInt(8 * size)) throw new Error("desbordamiento en bloque");
  const out = new Uint8Array(size);
  for (let i = size - 1; i >= 0; i--) {
    out[i] = Number(num & 0xffn);
    num >>= 8n;
  }
  return out;
}

export function decodeBase58(s: string): Uint8Array {
  const full = Math.floor(s.length / FULL_ENCODED);
  const rest = s.length % FULL_ENCODED;
  if (rest && ENCODED_SIZES.indexOf(rest) <= 0) throw new Error("longitud base58 inválida");
  const parts: Uint8Array[] = [];
  for (let i = 0; i < full; i++) parts.push(decodeBlock(s.slice(i * FULL_ENCODED, (i + 1) * FULL_ENCODED)));
  if (rest) parts.push(decodeBlock(s.slice(full * FULL_ENCODED)));
  const out = new Uint8Array(full * FULL_BLOCK + (rest ? ENCODED_SIZES.indexOf(rest) : 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function readVarint(b: Uint8Array): { value: number; len: number } {
  let value = 0;
  let shift = 0;
  for (let i = 0; i < Math.min(b.length, 9); i++) {
    value |= (b[i] & 0x7f) << shift;
    if (!(b[i] & 0x80)) return { value, len: i + 1 };
    shift += 7;
  }
  throw new Error("varint inválido");
}

export interface ParsedAddress {
  network: Network;
  kind: AddressKind;
}

/** Devuelve red y tipo, o lanza un error con el motivo. */
export function parseAddress(address: string): ParsedAddress {
  const a = address.trim();
  if (a.length !== 95 && a.length !== 106) throw new Error("longitud incorrecta");
  const raw = decodeBase58(a);
  const body = raw.slice(0, raw.length - 4);
  const check = raw.slice(raw.length - 4);
  const hash = keccak_256(body);
  for (let i = 0; i < 4; i++) if (hash[i] !== check[i]) throw new Error("checksum inválido");
  const { value, len } = readVarint(body);
  const info = PREFIXES[value];
  if (!info) throw new Error("prefijo desconocido");
  const keysLen = body.length - len;
  const expected = info.kind === "integrated" ? 72 : 64;
  if (keysLen !== expected) throw new Error("longitud de llaves incorrecta");
  return info;
}

export function isValidAddress(address: string, network: Network): boolean {
  try {
    return parseAddress(address).network === network;
  } catch {
    return false;
  }
}

/**
 * Detecta envenenamiento de direcciones: una dirección distinta que comparte el principio y el final
 * con una que ya usaste (los atacantes generan direcciones parecidas y esperan que copies la falsa).
 */
export function lookalikeOf(address: string, known: string[]): string | null {
  const a = address.trim();
  for (const k of known) {
    if (k === a) continue;
    if (k.slice(0, 6) === a.slice(0, 6) && k.slice(-6) === a.slice(-6)) return k;
  }
  return null;
}

/** Muestra una dirección larga partida en grupos, con inicio y final resaltables. */
export function shortAddress(a: string): string {
  return a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-8)}` : a;
}
