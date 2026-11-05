// Motor Monero: monero-ts (wallet2 compilado a WASM) dentro de un Web Worker de la propia
// extensión. La semilla solo existe en la memoria de esta página mientras está desbloqueada.
import moneroTs from "monero-ts";
import { feeFor, splitAll } from "../core/fee";

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
  /** Comisión de la red de Monero. */
  fee: string;
  /** Lo que recibe el destino. */
  amount: string;
  address: string;
  /** Comisión de MoneroP2P (0 si no aplica). */
  platformFee: string;
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

/** Llave privada de gasto (hex), calculada sin conexión. Solo se usa para derivar la cuenta de Arbitrum. */
export async function spendKey(seed: string, network: Net): Promise<string> {
  init();
  const w = await moneroTs.createWalletKeys({ networkType: NET[network], seed });
  const k = await w.getPrivateSpendKey();
  await w.close();
  return k;
}

/** Subdirección (0, index) calculada sin conexión, para dársela a un sitio sin abrir wallet2. */
export async function subaddressAt(seed: string, network: Net, index: number): Promise<string> {
  init();
  const w = await moneroTs.createWalletKeys({ networkType: NET[network], seed });
  const a = await w.getAddress(0, index);
  await w.close();
  return a;
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
    // Las que tienen etiqueta ya se entregaron a un sitio o al swap: no se repiten aquí.
    const unused = (await subaddresses()).filter((s) => s.index > 0 && !s.used && !s.label);
    if (unused.length) return unused[unused.length - 1];
  }
  const s = await w().createSubaddress(0, label);
  return { index: Number(s.getIndex()), address: s.getAddress(), label, used: false, balance: "0" };
}

/** Cuántas subdirecciones conoce wallet2 en la cuenta 0. */
export async function subaddressCount(): Promise<number> {
  return (await w().getSubaddresses(0)).length;
}

/**
 * Hace que wallet2 conozca las subdirecciones hasta `next - 1` (las que se dieron a sitios desde la
 * ventana de aprobación sin abrir wallet2), para que detecte lo que llegue a ellas.
 */
export async function ensureSubaddresses(next: number): Promise<number> {
  let n = await subaddressCount();
  while (n < next) {
    await w().createSubaddress(0, "site");
    n++;
  }
  return n;
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

/**
 * Prepara el envío SIN transmitirlo, para mostrar las comisiones exactas y pedir confirmación.
 * `feeTo`: dirección de comisiones de MoneroP2P, o null si no aplica (stagenet, envíos a uno mismo).
 */
export async function prepare(address: string, amount: bigint | "all", feeTo: string | null): Promise<Prepared> {
  const wl = w();
  const dests: { address: string; amount: bigint }[] = [];
  let subtractFeeFrom: number[] | undefined;
  let platformFee = 0n;
  if (amount === "all") {
    const unlocked = BigInt(await wl.getUnlockedBalance(0));
    if (unlocked <= 0n) throw new Error("not enough unlocked");
    const split = feeTo ? splitAll(unlocked) : { dest: unlocked, fee: 0n };
    platformFee = split.fee;
    dests.push({ address, amount: split.dest });
    subtractFeeFrom = [0];
  } else {
    platformFee = feeTo ? feeFor(amount) : 0n;
    dests.push({ address, amount });
  }
  if (platformFee > 0n && feeTo) dests.push({ address: feeTo, amount: platformFee });
  const tx = await wl.createTx({ accountIndex: 0, destinations: dests, subtractFeeFrom, relay: false });
  // Lo que de verdad recibe el destino (con "todo", ya sin la comisión de la red).
  const sent = tx.getOutgoingTransfer()?.getDestinations()?.find((d) => d.getAddress() === address)?.getAmount();
  return {
    txid: tx.getHash(),
    fee: String(tx.getFee()),
    amount: String(sent ?? dests[0].amount),
    address,
    platformFee: String(platformFee),
    metadata: tx.getMetadata(),
  };
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
