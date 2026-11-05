// Bóveda: la contraseña se convierte en llave con Argon2id (WASM de hash-wasm) y los datos se
// cifran con XChaCha20-Poly1305 (@noble/ciphers, auditada). Cada blob lleva un "propósito" como
// dato autenticado (AAD), así no se puede cambiar el caché por la bóveda ni al revés.
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { argon2id } from "hash-wasm";

export const VAULT_VERSION = 1;
export const MIN_PASSWORD = 10;

/** Parámetros de Argon2id. 64 MiB y 3 pasadas: lo que recomienda OWASP para llaves de alto valor. */
export interface KdfParams {
  name: "argon2id";
  m: number; // KiB
  t: number;
  p: number;
  salt: string; // base64
}

export interface Sealed {
  v: number;
  purpose: string;
  nonce: string; // base64, 24 bytes
  ct: string; // base64
}

export interface VaultFile {
  v: number;
  kdf: KdfParams;
  /** Datos de la wallet (semilla, etc.) cifrados con la llave derivada. */
  vault: Sealed;
}

export const DEFAULT_KDF = { name: "argon2id" as const, m: 65536, t: 3, p: 1 };

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

export function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function newKdf(params: Omit<KdfParams, "salt"> = DEFAULT_KDF): KdfParams {
  return { ...params, salt: toB64(randomBytes(16)) };
}

export async function deriveKey(password: string, kdf: KdfParams): Promise<Uint8Array> {
  if (kdf.name !== "argon2id") throw new Error("KDF no soportado");
  // Límites para que un archivo manipulado no congele el navegador ni baje la seguridad.
  if (kdf.m < 19456 || kdf.m > 1048576 || kdf.t < 2 || kdf.t > 20 || kdf.p < 1 || kdf.p > 4) throw new Error("Parámetros de KDF fuera de rango");
  return argon2id({
    password: password.normalize("NFKC"),
    salt: fromB64(kdf.salt),
    parallelism: kdf.p,
    iterations: kdf.t,
    memorySize: kdf.m,
    hashLength: 32,
    outputType: "binary",
  });
}

function aad(purpose: string): Uint8Array {
  return enc.encode(`monerop2p-wallet/v${VAULT_VERSION}/${purpose}`);
}

export function seal(key: Uint8Array, purpose: string, data: Uint8Array): Sealed {
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key, nonce, aad(purpose)).encrypt(data);
  return { v: VAULT_VERSION, purpose, nonce: toB64(nonce), ct: toB64(ct) };
}

/** Lanza un error si la llave es incorrecta o si el blob fue modificado. */
export function open(key: Uint8Array, purpose: string, s: Sealed): Uint8Array {
  if (s.v !== VAULT_VERSION || s.purpose !== purpose) throw new Error("Blob de otro tipo o versión");
  return xchacha20poly1305(key, fromB64(s.nonce), aad(purpose)).decrypt(fromB64(s.ct));
}

export function sealJson(key: Uint8Array, purpose: string, value: unknown): Sealed {
  return seal(key, purpose, enc.encode(JSON.stringify(value)));
}

export function openJson<T>(key: Uint8Array, purpose: string, s: Sealed): T {
  return JSON.parse(dec.decode(open(key, purpose, s))) as T;
}

export async function createVault(password: string, secret: unknown, kdfParams: Omit<KdfParams, "salt"> = DEFAULT_KDF) {
  if (password.length < MIN_PASSWORD) throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
  const kdf = newKdf(kdfParams);
  const key = await deriveKey(password, kdf);
  const file: VaultFile = { v: VAULT_VERSION, kdf, vault: sealJson(key, "vault", secret) };
  return { file, key };
}

/** Desbloquea la bóveda. Devuelve la llave (para la sesión) y el secreto. */
export async function unlockVault<T>(password: string, file: VaultFile): Promise<{ key: Uint8Array; secret: T }> {
  const key = await deriveKey(password, file.kdf);
  try {
    return { key, secret: openJson<T>(key, "vault", file.vault) };
  } catch {
    key.fill(0);
    throw new Error("Contraseña incorrecta");
  }
}

/** Puntaje simple de contraseña (0–4) para avisar al usuario; no reemplaza la longitud mínima. */
export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= MIN_PASSWORD) s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (/^(.)\1+$/.test(pw) || /^(1234|password|contraseña|qwerty)/i.test(pw)) s = 0;
  return s;
}
