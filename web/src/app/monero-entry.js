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
