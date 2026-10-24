// Fase 0 — investigación. ¿monero-ts funciona en el navegador contra stagenet?
// 1) Conexión directa al nodo (se espera bloqueo por CORS).
// 2) Conexión vía proxy Worker (agrega CORS).
// 3) Wallet de solo vista (lo que necesita el taker para verificar el bloqueo de XMR) sincronizando vía proxy.
import moneroTs from "monero-ts";

const out = document.getElementById("out");
const log = (s) => { out.textContent += s + "\n"; console.log(s); };
const params = new URLSearchParams(location.search);
const PROXY = params.get("proxy") || "http://127.0.0.1:8787/fetch/xmr-tw";
const DIRECT = "http://stagenet.xmr-tw.org:38081";
const results = {};

async function step(name, fn) {
  const t = performance.now();
  try {
    const v = await fn();
    results[name] = { ok: true, ms: Math.round(performance.now() - t), v };
    log(`✔ ${name}: ${JSON.stringify(v)} (${results[name].ms} ms)`);
  } catch (e) {
    results[name] = { ok: false, ms: Math.round(performance.now() - t), error: String(e?.message || e) };
    log(`✘ ${name}: ${results[name].error} (${results[name].ms} ms)`);
  }
}

moneroTs.LibraryUtils.setWorkerDistPath(new URL("./monero.worker.js", location.href).href);

await step("directo_getHeight", async () => {
  const d = await moneroTs.connectToDaemonRpc({ uri: DIRECT, proxyToWorker: false });
  return await d.getHeight();
});

let height = 0;
await step("proxy_getHeight", async () => {
  const d = await moneroTs.connectToDaemonRpc({ uri: PROXY, proxyToWorker: false });
  height = await d.getHeight();
  return height;
});

let keys;
await step("generar_llaves_stagenet", async () => {
  const w = await moneroTs.createWalletKeys({ networkType: moneroTs.MoneroNetworkType.STAGENET, proxyToWorker: false });
  keys = { address: await w.getPrimaryAddress(), view: await w.getPrivateViewKey() };
  return keys.address.slice(0, 12) + "…";
});

await step("wallet_solo_vista_sync_200_bloques", async () => {
  const w = await moneroTs.createWalletFull({
    networkType: moneroTs.MoneroNetworkType.STAGENET,
    primaryAddress: keys.address,
    privateViewKey: keys.view,
    restoreHeight: Math.max(0, height - 200),
    server: { uri: PROXY },
    password: "solo-prueba",
    proxyToWorker: true,
  });
  await w.sync();
  const r = { syncHeight: await w.getHeight(), balance: (await w.getBalance()).toString() };
  await w.close();
  return r;
});

window.__done = results;
log("FIN");
