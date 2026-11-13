/**
 * Identidad de P2P Fiat en el navegador, sin cuenta ni KYC:
 *  - una llave secp256k1 que firma cada petición (como los makers) y es el «usuario»;
 *  - una llave de cifrado derivada de la anterior, para el chat y los datos de pago;
 *  - el estado de cada escrow multisig (wallet de monero-ts por orden);
 *  - métodos de pago guardados (con sus datos), que nunca salen del navegador sin cifrar.
 * Todo va en una bóveda cifrada con la contraseña del usuario (IndexedDB) que también es el respaldo.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decryptRecovery, encryptRecovery, type RecoveryFile } from "../app/recovery";

export interface SavedMethod {
  fiat: string;
  kind: string;
  name: string;
  country?: string;
  details: string; // titular, CLABE, correo… (solo se envía cifrado al comprador de cada orden)
}

export interface EscrowState {
  round: number;
  done: boolean;
  address?: string;
  /** Llaves de la wallet de monero-ts (base64, cifradas por monero-ts con `password`); incluyen el multisig. */
  keys?: string;
  password: string;
  restoreHeight?: number;
  /** Exportación del árbitro (`n`) con la que se armó el último pago enviado. */
  spentFor?: string;
}

export interface P2PVault {
  v: 1;
  kind: "p2p";
  network: "stagenet" | "mainnet";
  created_at: number;
  key: `0x${string}`;
  methods: SavedMethod[];
  escrows: Record<string, EscrowState>;
  /**
   * Semilla maestra (12 palabras) de la que salen las wallets de la cuenta (wallets.ts). Las cuentas
   * creadas antes de las wallets no la traen: se les agrega con `addSeed` sin tocar su `key`.
   */
  seed?: string;
  /** true si `key` se derivó de `seed` (cuentas nuevas): las 12 palabras bastan para recuperar la cuenta. */
  keyFromSeed?: boolean;
  /** Altura de la cadena de Monero cuando se creó la semilla: la wallet escanea desde ahí. */
  xmrHeight?: number;
  /** Contraseña interna (aleatoria) con la que monero-ts cifra el caché de la wallet de la cuenta. */
  xmrPass?: string;
  /** Usuarios a los que ya se les envió por apodo, con la llave de su cuenta (clave: apodo en minúsculas). */
  contacts?: Record<string, import("./pay").Contact>;
}

const DB = "monerop2p-p2p";
const STORE = "kv";

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function op<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, mode);
    const r = f(tx.objectStore(STORE));
    tx.oncomplete = () => (res(r.result as T), d.close());
    tx.onerror = () => (rej(tx.error), d.close());
  });
}
const kv = {
  get: <T>(k: string) => op<T | undefined>("readonly", (s) => s.get(k)),
  put: (k: string, v: unknown) => op<void>("readwrite", (s) => s.put(v, k)),
};
const vaultKey = (net: string) => `vault:${net}`;

/**
 * Caché de la wallet de Monero de la cuenta (ya cifrado por monero-ts): evita volver a escanear la
 * cadena al entrar. No contiene nada que no se pueda reconstruir desde la semilla.
 */
export interface XmrCache {
  address: string;
  keysData: Uint8Array;
  cacheData: Uint8Array;
}
const cacheKey = (net: string) => `xmr-wallet:${net}`;
export const loadXmrCache = (net: string) => kv.get<XmrCache>(cacheKey(net));
export const saveXmrCache = (net: string, c: XmrCache) => kv.put(cacheKey(net), c);

export const hasVault = async (net: string) => !!(await kv.get(vaultKey(net)));

export { addSeed, newVault, vaultFromSeed } from "./vault-seed";

export async function saveVault(v: P2PVault, pass: string): Promise<RecoveryFile> {
  const file = await encryptRecovery(v, pass, { network: `p2p-${v.network}` });
  await kv.put(vaultKey(v.network), file);
  return file;
}

export async function openVault(net: string, pass: string, file?: RecoveryFile): Promise<P2PVault> {
  const f = file ?? (await kv.get<RecoveryFile>(vaultKey(net)));
  if (!f) throw new Error("no hay una cuenta P2P guardada en este navegador");
  const v = await decryptRecovery<P2PVault>(f, pass);
  if (v.kind !== "p2p") throw new Error("ese archivo no es un respaldo de P2P Fiat");
  if (v.network !== net) throw new Error(`ese respaldo es de otra red (${v.network})`);
  return v;
}

export const account = (v: P2PVault) => privateKeyToAccount(v.key);

// ---------- Cifrado (ECIES con secp256k1 + AES-GCM) ----------

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) all.set(p, (o += p.length) - p.length);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", all));
}

/** Llave de cifrado: derivada de la llave de firma, distinta de ella. */
export async function encPrivate(v: P2PVault): Promise<Uint8Array> {
  return sha256(enc.encode("monerop2p-p2p-enc|"), hexToBytes(v.key));
}
export async function encPublic(v: P2PVault): Promise<string> {
  return bytesToHex(secp256k1.getPublicKey(await encPrivate(v), true)).slice(2);
}

async function wrapKey(shared: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", (await sha256(enc.encode("monerop2p-p2p-wrap|"), shared)) as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export interface Envelope {
  v: 1;
  eph: string; // llave pública efímera (hex)
  iv: string;
  ct: string;
  keys: { to: string; iv: string; k: string }[];
}

/** Cifra para varios destinatarios (llaves públicas comprimidas en hex). → texto JSON. */
export async function seal(plaintext: string, recipients: string[]): Promise<string> {
  const cek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, enc.encode(plaintext)));
  const eph = secp256k1.utils.randomPrivateKey();
  const keys = [];
  for (const to of [...new Set(recipients.filter(Boolean))]) {
    const shared = secp256k1.getSharedSecret(eph, to, true).slice(1);
    const wiv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: wiv }, await wrapKey(shared), cek));
    keys.push({ to, iv: b64(wiv), k: b64(wrapped) });
  }
  const env: Envelope = { v: 1, eph: bytesToHex(secp256k1.getPublicKey(eph, true)).slice(2), iv: b64(iv), ct: b64(ct), keys };
  return JSON.stringify(env);
}

/** Descifra un sobre dirigido a esta cuenta (o lanza si no es para ella). */
export async function open(sealed: string, v: P2PVault): Promise<string> {
  const env = JSON.parse(sealed) as Envelope;
  const me = await encPublic(v);
  const slot = env.keys.find((x) => x.to === me);
  if (!slot) throw new Error("mensaje no dirigido a ti");
  const shared = secp256k1.getSharedSecret(await encPrivate(v), env.eph, true).slice(1);
  const cek = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(slot.iv) }, await wrapKey(shared), unb64(slot.k));
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, k, unb64(env.ct)));
}

export { b64, unb64 };
