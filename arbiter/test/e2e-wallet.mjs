// Wallet de stagenet para la prueba con fondos. La semilla se guarda en el archivo indicado (fuera del
// repositorio) y nunca se imprime. Uso:
//   node test/e2e-wallet.mjs <archivo> [nodo]   → crea la wallet si no existe y muestra dirección y saldo
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import moneroTs from "monero-ts";

const [file, node = "https://xmrp2p-node-proxy.xmrp2p.workers.dev"] = process.argv.slice(2);
if (!file) throw new Error("uso: node test/e2e-wallet.mjs <archivo> [nodo]");
const net = moneroTs.MoneroNetworkType.STAGENET;
let w;
if (existsSync(file)) {
  const s = JSON.parse(readFileSync(file, "utf8"));
  w = await moneroTs.createWalletFull({ networkType: net, password: "x", seed: s.seed, restoreHeight: s.restoreHeight, server: { uri: node } });
} else {
  w = await moneroTs.createWalletFull({ networkType: net, password: "x", server: { uri: node } });
  writeFileSync(file, JSON.stringify({ seed: await w.getSeed(), restoreHeight: await w.getRestoreHeight() }), { mode: 0o600 });
  console.log("wallet nueva creada");
}
await w.sync();
console.log("dirección:", await w.getPrimaryAddress());
console.log("saldo:", Number(await w.getBalance()) / 1e12, "XMR · desbloqueado:", Number(await w.getUnlockedBalance()) / 1e12, "XMR");
await w.close();
process.exit(0);
