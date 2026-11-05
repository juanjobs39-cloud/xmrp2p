// Motor Monero: monero-ts (wallet2 compilado a WASM) dentro de un Web Worker de la propia
// extensión. La semilla solo existe en la memoria de esta página mientras está desbloqueada.
import moneroTs from "monero-ts";

export type Net = "mainnet" | "stagenet";
const NET = { mainnet: moneroTs.MoneroNetworkType.MAINNET, stagenet: moneroTs.MoneroNetworkType.STAGENET };

export const DEFAULT_NODES: Record<Net, string> = {
  mainnet: "https://nodo-xmr.monerop2p.app",
  stagenet: "https://nodo.monerop2p.app",
};

/** Lo que va dentro de la bóveda cifrada. */
export interface Secret {
  network: Net;
  seed: string;
  restoreHeight: number;
  /** Contraseña interna de wallet2 para sus propios datos (aleatoria; el usuario no la ve). */
  walletPassword: string;
  createdAt: number;
}

export interface Tx {
  txid: string;
  incoming: boolean;
  amount: string; // piconero
  fee: string;
  confirmations: number;
  height: number;
  timestamp: number;
  pending: boolean;
  address?: string;
}

export interface Sub {
  index: number;
  address: string;
  label: string;
  used: boolean;
  balance: string;
}

export interface Prepared {
  txid: string;
  fee: string;
  amount: string;
  address: string;
  metadata: string;
}

let initDone = false;
function init(): void {
  if (initDone) return;
  const url = (globalThis as { chrome?: typeof chrome }).chrome?.runtime?.getURL?.("vendor/monero.worker.js") ?? "vendor/monero.worker.js";
  moneroTs.LibraryUtils.setWorkerDistPath(url);
  initDone = true;
}

let wallet: moneroTs.MoneroWalletFull | null = null;
let listener: moneroTs.MoneroWalletListener | null = null;

export async function daemonHeight(node: string): Promise<number> {
  const d = await moneroTs.connectToDaemonRpc({ uri: node, proxyToWorker: false });
  return Number(await d.getHeight());
}

/** Semilla nueva de 25 palabras, generada sin conexión. */
export async function generateSeed(network: Net): Promise<string> {
  init();
  const w = await moneroTs.createWalletKeys({ networkType: NET[network], language: "English" });
  const seed = await w.getSeed();
  await w.close();
  return seed;
}

export async function validateSeed(seed: string, network: Net): Promise<string> {
  init();
  const words = seed.trim().toLowerCase().split(/\s+/);
  if (words.length !== 25) throw new Error("seed_words");
  const w = await moneroTs.createWalletKeys({ networkType: NET[network], seed: words.join(" ") });
  const addr = await w.getPrimaryAddress();
  await w.close();
  return addr;
}

/** Abre la wallet desde el caché cifrado (rápido) o desde la semilla (escanea desde restoreHeight). */
export async function openWallet(secret: Secret, node: string, cache?: { keysData: Uint8Array; cacheData: Uint8Array }): Promise<void> {
  init();
  await closeWallet(false);
  const base = { networkType: NET[secret.network], server: { uri: node }, password: secret.walletPassword, proxyToWorker: true };
  if (cache) {
    try {
      wallet = await moneroTs.openWalletFull({ ...base, keysData: cache.keysData, cacheData: cache.cacheData });
      return;
    } catch {
      // Caché dañado o de otra versión: se reconstruye desde la semilla.
    }
  }
  wallet = await moneroTs.createWalletFull({ ...base, seed: secret.seed, restoreHeight: secret.restoreHeight });
}

function w(): moneroTs.MoneroWalletFull {
  if (!wallet) throw new Error("wallet cerrada");
  return wallet;
}

export function isOpen(): boolean {
  return !!wallet;
}

export async function setNode(node: string): Promise<void> {
  await w().setDaemonConnection({ uri: node });
}

/** Sincroniza una vez con progreso y luego deja la sincronización corriendo en segundo plano. */
export async function sync(onProgress: (pct: number, height: number, end: number) => void, onChange: () => void): Promise<void> {
  const wl = w();
  if (listener) await wl.removeListener(listener);
  listener = new (class extends moneroTs.MoneroWalletListener {
    async onSyncProgress(height: number, _start: number, end: number, pct: number) {
      onProgress(pct, height, end);
    }
    async onBalancesChanged() {
      onChange();
    }
    async onOutputReceived() {
      onChange();
    }
  })();
  await wl.addListener(listener);
  await wl.sync();
  await wl.startSyncing(20_000);
}

export async function info() {
  const wl = w();
  return {
    address: await wl.getPrimaryAddress(),
    balance: String(await wl.getBalance()),
    unlocked: String(await wl.getUnlockedBalance()),
    height: Number(await wl.getHeight()),
  };
}

export async function data(): Promise<{ keysData: Uint8Array; cacheData: Uint8Array }> {
  const [k, c] = await w().getData();
  const bytes = (d: ArrayBufferView) => new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
  return { keysData: bytes(k), cacheData: bytes(c) };
}

export async function subaddresses(): Promise<Sub[]> {
  const subs = await w().getSubaddresses(0);
  return subs.map((s) => ({
    index: Number(s.getIndex()),
    address: s.getAddress(),
    label: s.getLabel() ?? "",
    used: !!s.getIsUsed(),
    balance: String(s.getBalance() ?? 0n),
  }));
}

/** Subdirección sin usar más reciente; si no hay ninguna, crea una. Así cada cobro usa una distinta. */
export async function freshSubaddress(forceNew = false, label = ""): Promise<Sub> {
  if (!forceNew) {
    const unused = (await subaddresses()).filter((s) => s.index > 0 && !s.used);
    if (unused.length) return unused[unused.length - 1];
  }
  const s = await w().createSubaddress(0, label);
  return { index: Number(s.getIndex()), address: s.getAddress(), label, used: false, balance: "0" };
}

export async function txs(): Promise<Tx[]> {
  const list = await w().getTxs();
  const out: Tx[] = list.map((t) => {
    const incoming = !t.getIsOutgoing();
    const amount = incoming ? (t.getIncomingAmount() ?? 0n) : (t.getOutgoingAmount() ?? 0n);
    const dest = t.getOutgoingTransfer?.()?.getDestinations?.()?.[0]?.getAddress?.();
    return {
      txid: t.getHash(),
      incoming,
      amount: String(amount),
      fee: String(t.getFee() ?? 0n),
      confirmations: Number(t.getNumConfirmations() ?? 0),
      height: Number(t.getHeight() ?? 0),
      timestamp: Number(t.getBlock?.()?.getTimestamp?.() ?? 0),
      pending: !t.getIsConfirmed(),
      address: dest,
    };
  });
  return out.sort((a, b) => (a.pending === b.pending ? b.height - a.height : a.pending ? -1 : 1));
}

/** Prepara el envío SIN transmitirlo, para mostrar la comisión exacta y pedir confirmación. */
export async function prepare(address: string, amount: bigint | "all"): Promise<Prepared> {
  const wl = w();
  if (amount === "all") {
    const list = await wl.sweepUnlocked({ address, relay: false });
    if (list.length !== 1) throw new Error("sweep_many");
    const tx = list[0];
    return { txid: tx.getHash(), fee: String(tx.getFee()), amount: String(tx.getOutgoingAmount() ?? 0n), address, metadata: tx.getMetadata() };
  }
  const tx = await wl.createTx({ accountIndex: 0, address, amount, relay: false });
  return { txid: tx.getHash(), fee: String(tx.getFee()), amount: String(amount), address, metadata: tx.getMetadata() };
}

export async function relay(p: Prepared): Promise<string> {
  return await w().relayTx(p.metadata);
}

export async function closeWallet(save = false): Promise<void> {
  if (!wallet) return;
  const wl = wallet;
  wallet = null;
  listener = null;
  try {
    await wl.stopSyncing().catch(() => {});
    await wl.close(save);
  } catch {
    /* ya cerrada */
  }
}
