// Almacenamiento de la extensión.
// - local: bóveda y caché, SIEMPRE cifrados; ajustes sin datos sensibles.
// - session: la llave de sesión mientras la wallet está desbloqueada. Vive solo en memoria del
//   navegador, no la ven los content scripts y se borra al bloquear o al cerrar el navegador.
// Fuera de la extensión (vista previa de desarrollo) usa un sustituto en memoria/localStorage.
import type { VaultFile } from "./vault";

export interface Settings {
  lang?: "es" | "en";
  autolockMin: number;
  nodes: { mainnet?: string; stagenet?: string };
}

export interface LocalData {
  vaultFile?: VaultFile;
  settings?: Settings;
  /** Red de la wallet guardada, visible sin desbloquear (no es secreto). */
  network?: "mainnet" | "stagenet";
  /** Sitios aprobados para ver la cuenta y pedir firmas (solo orígenes de MoneroP2P). */
  sites?: Record<string, { connectedAt: number }>;
  /** Siguiente índice de subdirección libre (la comparten la wallet y las aprobaciones de sitios). */
  subNext?: number;
}

export interface SessionData {
  sessionKey?: string;
  lastActive?: number;
  /** Cuenta de Arbitrum (pública) mientras la wallet está desbloqueada. */
  evmAddress?: string;
}

export const DEFAULT_SETTINGS: Settings = { autolockMin: 15, nodes: {} };

type Area = {
  get(keys: string[] | null): Promise<Record<string, unknown>>;
  set(v: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
};

function fallback(kind: "local" | "session"): Area {
  const mem = new Map<string, unknown>();
  const ls = kind === "local" && typeof localStorage !== "undefined" ? localStorage : null;
  const prefix = "mp2pw:";
  return {
    async get(keys) {
      const out: Record<string, unknown> = {};
      const list = keys ?? (ls ? Object.keys(ls).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)) : [...mem.keys()]);
      for (const k of list) {
        const v = ls ? ls.getItem(prefix + k) : (mem.get(k) as string | undefined);
        if (v != null) out[k] = ls ? JSON.parse(v) : v;
      }
      return out;
    },
    async set(v) {
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined) ls ? ls.removeItem(prefix + k) : mem.delete(k);
        else ls ? ls.setItem(prefix + k, JSON.stringify(val)) : mem.set(k, val);
      }
    },
    async remove(keys) {
      for (const k of keys) ls ? ls.removeItem(prefix + k) : mem.delete(k);
    },
    async clear() {
      if (ls) for (const k of Object.keys(ls)) if (k.startsWith(prefix)) ls.removeItem(k);
      mem.clear();
    },
  };
}

const ext = (globalThis as { chrome?: typeof chrome }).chrome;
const hasExt = !!ext?.storage?.local;
export const inExtension = hasExt;

const localArea: Area = hasExt ? (ext!.storage.local as unknown as Area) : fallback("local");
const sessionArea: Area = hasExt && ext!.storage.session ? (ext!.storage.session as unknown as Area) : fallback("session");

export async function getLocal<K extends keyof LocalData>(k: K): Promise<LocalData[K]> {
  return (await localArea.get([k]))[k] as LocalData[K];
}
export async function setLocal(v: Partial<LocalData>): Promise<void> {
  await localArea.set(v as Record<string, unknown>);
}
export async function removeLocal(keys: (keyof LocalData)[]): Promise<void> {
  await localArea.remove(keys);
}
export async function clearLocal(): Promise<void> {
  await localArea.clear();
}
export async function getSession<K extends keyof SessionData>(k: K): Promise<SessionData[K]> {
  return (await sessionArea.get([k]))[k] as SessionData[K];
}
export async function setSession(v: Partial<SessionData>): Promise<void> {
  await sessionArea.set(v as Record<string, unknown>);
}
export async function clearSession(): Promise<void> {
  await sessionArea.clear();
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await getLocal("settings")) ?? {}) };
}
export async function saveSettings(s: Settings): Promise<void> {
  await setLocal({ settings: s });
}

/** Avisa a otras vistas abiertas (popup y pestaña) cuando se bloquea la wallet. */
export function onLocked(cb: () => void): void {
  if (!hasExt) return;
  ext!.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && "sessionKey" in changes && !changes.sessionKey.newValue) cb();
  });
}
