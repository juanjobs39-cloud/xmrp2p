// Compara las llaves y direcciones de xmrp2p-crypto con las que calcula monero-ts
// (código C++ oficial de Monero compilado a WASM). Uso: node monero-ts.mjs ../vectors/vectors.json
import fs from "node:fs";
import moneroTs from "monero-ts";

const v = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const N = moneroTs.MoneroNetworkType;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.error("✘", msg); } };

for (const [i, s] of v.standard.entries()) {
  for (const [net, field] of [[N.MAINNET, "address_mainnet"], [N.STAGENET, "address_stagenet"]]) {
    const w = await moneroTs.createWalletKeys({ networkType: net, privateSpendKey: s.spend_private, proxyToWorker: false });
    check((await w.getPrimaryAddress()) === s[field], `standard[${i}] ${field}`);
    check((await w.getPrivateViewKey()) === s.view_private, `standard[${i}] view key`);
    check((await w.getPublicSpendKey()) === s.spend_public, `standard[${i}] spend public`);
  }
}
console.log(`✔ ${v.standard.length} vectores estándar comparados (dirección mainnet/stagenet, vista, gasto)`);

for (const [i, s] of v.swaps.entries()) {
  // Wallet compartida con las llaves reconstruidas: monero-ts debe derivar la misma dirección.
  const w = await moneroTs.createWalletFull({
    networkType: N.STAGENET, password: "x", proxyToWorker: false,
    primaryAddress: s.shared_address_stagenet, privateViewKey: s.shared_view_private, privateSpendKey: s.shared_spend_private,
  });
  check((await w.getPrimaryAddress()) === s.shared_address_stagenet, `swap[${i}] dirección compartida`);
  await w.close();
  // Control negativo: con una llave de gasto equivocada monero-ts debe rechazarlo.
  let rejected = false;
  try {
    await moneroTs.createWalletFull({
      networkType: N.STAGENET, password: "x", proxyToWorker: false,
      primaryAddress: s.shared_address_stagenet, privateViewKey: s.shared_view_private, privateSpendKey: s.taker_spend,
    });
  } catch { rejected = true; }
  check(rejected, `swap[${i}] monero-ts aceptó una llave equivocada (el control no sirve)`);
}
console.log(`✔ ${v.swaps.length} swaps: dirección compartida reconstruida = monero-ts, y control negativo rechazado`);
if (fails) { console.error(`${fails} fallos`); process.exit(1); }
process.exit(0);
