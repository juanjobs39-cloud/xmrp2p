// Punto de entrada de monero-ts para el navegador. Se empaqueta aparte con esbuild
// (scripts/build-monero.mjs → public/vendor/xmr/xmr.js) porque monero-ts está pensado para
// webpack y necesita polyfills de Node. La app lo carga SOLO cuando hace falta (ruta /app).
import moneroTs from "monero-ts";

const NET = { stagenet: moneroTs.MoneroNetworkType.STAGENET, mainnet: moneroTs.MoneroNetworkType.MAINNET };

export function init(workerUrl) {
  moneroTs.LibraryUtils.setWorkerDistPath(workerUrl);
}

/**
 * Verifica en segundos que el maker pagó a la dirección compartida, con la llave de la
 * transacción (check_tx_key). No necesita sincronizar la wallet.
 * → { received: string (piconero), confirmations: number, inPool: boolean }
 */
export async function verifyLock({ node, network, txid, txKey, address }) {
  const wallet = await moneroTs.createWalletFull({
    networkType: NET[network],
    server: { uri: node },
    password: crypto.randomUUID(),
    proxyToWorker: true,
  });
  try {
    const check = await wallet.checkTxKey(txid, txKey, address);
    return {
      received: String(check.getReceivedAmount() ?? 0n),
      confirmations: Number(check.getNumConfirmations() ?? 0),
      inPool: !!check.getInTxPool(),
    };
  } finally {
    await wallet.close();
  }
}

/**
 * Barre el XMR de la dirección compartida a la dirección del usuario, con la llave completa
 * reconstruida (s_taker + s_maker). Sincroniza desde `restoreHeight`.
 * → { txids: string[] }
 */
export async function sweep({ node, network, address, viewKey, spendKey, restoreHeight, destination, onProgress }) {
  const wallet = await moneroTs.createWalletFull({
    networkType: NET[network],
    server: { uri: node },
    password: crypto.randomUUID(),
    primaryAddress: address,
    privateViewKey: viewKey,
    privateSpendKey: spendKey,
    restoreHeight,
    proxyToWorker: true,
  });
  try {
    await wallet.sync(
      onProgress
        ? new (class extends moneroTs.MoneroWalletListener {
            async onSyncProgress(h, start, end, pct) {
              onProgress(pct);
            }
          })()
        : undefined,
    );
    // Si un intento anterior ya envió el barrido (y falló después), la dirección queda vacía con una
    // salida: tratarlo como hecho en vez de reintentar para siempre (hallazgo de la Fase 7).
    if (BigInt(await wallet.getBalance()) === 0n) {
      const out = (await wallet.getTxs()).filter((t) => BigInt(t.getOutgoingAmount() ?? 0n) > 0n);
      if (out.length) return { txids: out.map((t) => t.getHash()), alreadySwept: true };
    }
    const txs = await wallet.sweepUnlocked({ address: destination, relay: true });
    return { txids: txs.map((t) => t.getHash()) };
  } finally {
    await wallet.close();
  }
}

export async function daemonHeight(node) {
  const d = await moneroTs.connectToDaemonRpc({ uri: node, proxyToWorker: false });
  return d.getHeight();
}

// ------------------------------------------------------------------ wallet del maker
// Una wallet completa por pestaña. La semilla y los datos de la wallet nunca salen del navegador:
// la página los guarda cifrados con la contraseña del maker.

let maker = null;

async function makerInfo() {
  return {
    address: await maker.getPrimaryAddress(),
    height: Number(await maker.getHeight()),
    balance: String(await maker.getBalance()),
    unlocked: String(await maker.getUnlockedBalance()),
  };
}

/** Crea (sin semilla), restaura (con semilla) o reabre (con keysData/cacheData) la wallet del maker. */
export async function makerOpen({ node, network, password, seed, restoreHeight, keysData, cacheData }) {
  if (maker) await makerClose();
  const base = { networkType: NET[network], server: { uri: node }, password, proxyToWorker: true };
  if (keysData) {
    maker = await moneroTs.openWalletFull({ ...base, keysData, cacheData });
  } else if (seed) {
    maker = await moneroTs.createWalletFull({ ...base, seed, restoreHeight: restoreHeight ?? 0 });
  } else {
    // Wallet nueva: la semilla se genera sin conexión (crearla conectada se queda colgada a través del
    // proxy) y luego se abre desde la altura actual, para no escanear la cadena entera.
    const offline = await moneroTs.createWalletFull({ networkType: NET[network], password, proxyToWorker: true });
    const newSeed = await offline.getSeed();
    await offline.close(false);
    const d = await moneroTs.connectToDaemonRpc({ uri: node, proxyToWorker: false });
    const height = Math.max(0, Number(await d.getHeight()) - 5);
    maker = await moneroTs.createWalletFull({ ...base, seed: newSeed, restoreHeight: height });
  }
  return { ...(await makerInfo()), seed: await maker.getSeed(), restoreHeight: Number(await maker.getRestoreHeight()) };
}

export async function makerSync(onProgress) {
  await maker.sync(
    onProgress
      ? new (class extends moneroTs.MoneroWalletListener {
          async onSyncProgress(h, start, end, pct) {
            onProgress(pct);
          }
        })()
      : undefined,
  );
  return makerInfo();
}

/** Datos de la wallet (cifrados por monero-ts con la contraseña) para guardarlos en el navegador. */
export async function makerData() {
  const [keysData, cacheData] = await maker.getData();
  return { keysData, cacheData };
}

/**
 * Prepara el envío SIN transmitirlo: la página guarda txid, tx_key y metadata antes de transmitir.
 * Así, si la pestaña se cierra a mitad, al reabrir se retransmite la MISMA tx (nunca dos envíos).
 */
export async function makerPrepare(address, amount) {
  const tx = await maker.createTx({ accountIndex: 0, address, amount: BigInt(amount), relay: false });
  return { txid: tx.getHash(), txKey: tx.getKey(), metadata: tx.getMetadata() };
}

/** Transmite una tx preparada. Si ya estaba en la red, no es un error. */
export async function makerRelay(metadata) {
  try {
    return await maker.relayTx(metadata);
  } catch (e) {
    if (/double spend|already|spent/i.test(String(e?.message ?? e))) return "";
    throw e;
  }
}

export async function makerConfirmations(txid) {
  try {
    const tx = await maker.getTx(txid);
    return tx ? Number(tx.getNumConfirmations() ?? 0) : null;
  } catch {
    return null;
  }
}

/** Envía todo el saldo desbloqueado a otra dirección (retiro del maker). */
export async function makerSweepTo(address) {
  const txs = await maker.sweepUnlocked({ address, relay: true });
  return txs.map((t) => t.getHash());
}

export async function makerClose() {
  if (!maker) return;
  try {
    await maker.close(false);
  } finally {
    maker = null;
  }
}

/** Llaves de la wallet abierta (para guardar en el respaldo una wallet creada por error). */
export async function makerKeys() {
  return {
    address: await maker.getPrimaryAddress(),
    seed: await maker.getSeed(),
    viewKey: await maker.getPrivateViewKey(),
    spendKey: await maker.getPrivateSpendKey(),
    restoreHeight: Number(await maker.getRestoreHeight()),
  };
}

/** Depósitos entrantes aún bloqueados: confirmaciones de cada uno (para el panel del maker). */
export async function makerIncoming() {
  const txs = await maker.getTxs({ isIncoming: true });
  return txs
    .filter((t) => !t.getIsLocked || t.getIsLocked())
    .map((t) => ({
      txid: t.getHash(),
      amount: String(t.getIncomingAmount() ?? 0n),
      confirmations: Number(t.getNumConfirmations() ?? 0),
      inPool: !!t.getInTxPool(),
    }))
    .filter((t) => t.confirmations < 10);
}

// ---------- P2P Fiat: wallet de escrow multisig 2 de 3 por orden ----------
// La lógica de rondas, exportar/importar y armar pagos es la misma que usa el árbitro (arbiter/src/multisig.mjs).
import * as ms from "../../../arbiter/src/multisig.mjs";

const escrows = new Map();
const escrow = (id) => {
  const w = escrows.get(id);
  if (!w) throw new Error("la wallet del escrow no está abierta");
  return w;
};

/** Wallet nueva para el escrow de una orden (sin conexión). → hex de la ronda 0 */
export async function escrowCreate({ id, network, password }) {
  if (escrows.has(id)) await escrowClose(id);
  const w = await moneroTs.createWalletFull({ networkType: NET[network], password, proxyToWorker: true });
  escrows.set(id, w);
  return ms.prepare(w);
}

/** Reabre la wallet del escrow; con `node`, conectada para ver depósitos y armar pagos. */
export async function escrowOpen({ id, network, password, keysData, cacheData, node, restoreHeight }) {
  if (escrows.has(id)) await escrowClose(id);
  const w = await moneroTs.openWalletFull({ networkType: NET[network], password, keysData, cacheData, proxyToWorker: true, ...(node ? { server: { uri: node } } : {}) });
  // Solo se guardan las llaves (la caché sincronizada pesa decenas de MB): hay que decirle desde dónde escanear.
  if (restoreHeight) await w.setRestoreHeight(restoreHeight);
  escrows.set(id, w);
}

export async function escrowAdvance(id, round, hexes, password) {
  return ms.advance(escrow(id), round, hexes, password);
}

/** Fija desde qué bloque escanear (la altura actual) para no recorrer toda la cadena. */
export async function escrowSetHeight(id, node) {
  const d = await moneroTs.connectToDaemonRpc({ uri: node, proxyToWorker: false });
  const h = Math.max(0, Number(await d.getHeight()) - 20);
  await escrow(id).setRestoreHeight(h);
  return h;
}

export async function escrowData(id) {
  const [keysData, cacheData] = await escrow(id).getData();
  return { keysData, cacheData };
}

export async function escrowSync(id) {
  const w = escrow(id);
  await w.sync();
  return { balance: String(await w.getBalance()), unlocked: String(await w.getUnlockedBalance()) };
}

export const escrowExport = (id) => ms.exportInfo(escrow(id));
export const escrowImport = (id, hexes) => ms.importInfo(escrow(id), hexes);
export const escrowSpend = (id, destinations) => ms.createSpend(escrow(id), destinations.map((d) => ({ address: d.address, amount: BigInt(d.amount) })));

export async function escrowClose(id) {
  const w = escrows.get(id);
  escrows.delete(id);
  if (w) await w.close(false);
}
