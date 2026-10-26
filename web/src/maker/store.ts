/**
 * Almacenamiento del maker en el navegador (IndexedDB). Todo lo sensible va cifrado:
 * - "vault": semilla de Monero, llave EVM del maker, ajustes y swaps, cifrados con la contraseña
 *   (mismo formato que el archivo de recuperación: PBKDF2 + AES-GCM). Es también el respaldo.
 * - "wallet": datos de la wallet de monero-ts (cifrados por monero-ts con la misma contraseña).
 */
import { decryptRecovery, encryptRecovery, type RecoveryFile } from "../app/recovery";
import type { MakerConfig, MakerSwap } from "./engine";

export interface Vault {
  v: 1;
  kind: "maker";
  created_at: number;
  network: string;
  evm_key: `0x${string}`;
  seed: string;
  restore_height: number;
  payout: `0x${string}`;
  node: string;
  config: Omit<MakerConfig, "maxExposure"> & { maxExposure: string };
  swaps: MakerSwap[];
}

const DB = "monerop2p-maker";
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

export const kv = {
  get: <T>(k: string) => op<T | undefined>("readonly", (s) => s.get(k)),
  put: (k: string, v: unknown) => op<void>("readwrite", (s) => s.put(v, k)),
  del: (k: string) => op<void>("readwrite", (s) => s.delete(k)),
};

/**
 * Claves por red: la de práctica conserva los nombres originales ("vault", "wallet") y la de
 * dinero real usa otros, para que nunca se mezclen.
 */
export const keys = (net: string) =>
  net === "arbitrum_sepolia" ? { vault: "vault", wallet: "wallet" } : { vault: `vault:${net}`, wallet: `wallet:${net}` };

export async function hasVault(net: string): Promise<boolean> {
  return !!(await kv.get(keys(net).vault));
}

export async function saveVault(v: Vault, pass: string): Promise<RecoveryFile> {
  const file = await encryptRecovery(v, pass, { network: v.network });
  await kv.put(keys(v.network).vault, file);
  return file;
}

export async function openVault(net: string, pass: string, file?: RecoveryFile): Promise<Vault> {
  const f = file ?? (await kv.get<RecoveryFile>(keys(net).vault));
  if (!f) throw new Error("no hay un maker guardado en este navegador; sube tu respaldo");
  const v = await decryptRecovery<Vault>(f, pass);
  if (v.kind !== "maker") throw new Error("ese archivo no es un respaldo de maker");
  if (v.network !== net) throw new Error(`ese respaldo es de otra red (${v.network}); cambia de red arriba`);
  return v;
}

export async function wipe(net: string): Promise<void> {
  await kv.del(keys(net).vault);
  await kv.del(keys(net).wallet);
}
