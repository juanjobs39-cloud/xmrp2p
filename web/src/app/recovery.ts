/**
 * Archivo de recuperación cifrado. Contiene la mitad de llave de gasto del taker, sin la cual
 * NO se puede reclamar el XMR ni reembolsar el USDT. Se descarga ANTES de depositar.
 *
 * Cifrado: PBKDF2-SHA-256 (600 000 iteraciones) → AES-256-GCM, con WebCrypto (navegador y Node).
 */

export const RECOVERY_VERSION = 1;
const ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 10;

export interface RecoveryFile {
  format: "xmrp2p-recovery";
  v: number;
  created_at: string;
  kdf: { alg: "PBKDF2-SHA256"; iterations: number; salt: string };
  cipher: { alg: "AES-256-GCM"; iv: string; data: string };
  /** Datos públicos para que el usuario identifique el archivo sin descifrarlo. */
  hint: { network: string; escrow?: string; shared_address?: string };
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptRecovery(state: unknown, passphrase: string, hint: RecoveryFile["hint"]): Promise<RecoveryFile> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error(`la contraseña debe tener al menos ${MIN_PASSPHRASE} caracteres`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const plain = new TextEncoder().encode(JSON.stringify(state));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain));
  return {
    format: "xmrp2p-recovery",
    v: RECOVERY_VERSION,
    created_at: new Date().toISOString(),
    kdf: { alg: "PBKDF2-SHA256", iterations: ITERATIONS, salt: b64(salt) },
    cipher: { alg: "AES-256-GCM", iv: b64(iv), data: b64(ct) },
    hint,
  };
}

export async function decryptRecovery<T = unknown>(file: RecoveryFile, passphrase: string): Promise<T> {
  if (file.format !== "xmrp2p-recovery" || file.v !== RECOVERY_VERSION) throw new Error("archivo de recuperación no reconocido");
  const key = await deriveKey(passphrase, unb64(file.kdf.salt), file.kdf.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(file.cipher.iv) as BufferSource }, key, unb64(file.cipher.data) as BufferSource);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new Error("contraseña incorrecta o archivo dañado");
  }
}

export function recoveryFilename(network: string): string {
  const d = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `xmrp2p-${network}-${d}.xmrp2p-recovery.json`;
}
