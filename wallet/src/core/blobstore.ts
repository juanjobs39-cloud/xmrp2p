// Datos grandes (caché de wallet2, puede pesar decenas de MB) en IndexedDB como bytes crudos,
// SIEMPRE cifrados con XChaCha20-Poly1305 antes de guardarse. chrome.storage no sirve para esto:
// pide JSON (base64 = +33 %) y tiene cuota pequeña.
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes, VAULT_VERSION } from "./vault";

const DB = "monerop2p-wallet";
const STORE = "blobs";

interface Rec {
  v: number;
  purpose: string;
  nonce: Uint8Array;
  ct: Uint8Array;
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    d.close();
  }
}

const enc = new TextEncoder();
const aad = (purpose: string) => enc.encode(`monerop2p-wallet/v${VAULT_VERSION}/${purpose}`);

export async function putSealed(key: Uint8Array, purpose: string, data: Uint8Array): Promise<void> {
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key, nonce, aad(purpose)).encrypt(data);
  const rec: Rec = { v: VAULT_VERSION, purpose, nonce, ct };
  await tx("readwrite", (s) => s.put(rec, purpose));
}

/** null si no existe; lanza un error si la llave no corresponde o el dato fue alterado. */
export async function getSealed(key: Uint8Array, purpose: string): Promise<Uint8Array | null> {
  const rec = await tx<Rec | undefined>("readonly", (s) => s.get(purpose) as IDBRequest<Rec | undefined>);
  if (!rec) return null;
  if (rec.v !== VAULT_VERSION || rec.purpose !== purpose) throw new Error("Blob de otro tipo o versión");
  return xchacha20poly1305(key, rec.nonce, aad(purpose)).decrypt(rec.ct);
}

export async function deleteBlob(purpose: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(purpose));
}

export async function clearBlobs(): Promise<void> {
  await tx("readwrite", (s) => s.clear());
}

/** Empaqueta varias partes binarias con su longitud (u32) delante: [n][len][bytes]… */
export function pack(parts: Uint8Array[]): Uint8Array {
  const total = 4 + parts.reduce((a, p) => a + 4 + p.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint32(0, parts.length);
  let o = 4;
  for (const p of parts) {
    v.setUint32(o, p.length);
    out.set(p, o + 4);
    o += 4 + p.length;
  }
  return out;
}

export function unpack(b: Uint8Array): Uint8Array[] {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const n = v.getUint32(0);
  if (n > 16) throw new Error("paquete inválido");
  const out: Uint8Array[] = [];
  let o = 4;
  for (let i = 0; i < n; i++) {
    const len = v.getUint32(o);
    if (o + 4 + len > b.length) throw new Error("paquete inválido");
    out.push(b.subarray(o + 4, o + 4 + len));
    o += 4 + len;
  }
  return out;
}
