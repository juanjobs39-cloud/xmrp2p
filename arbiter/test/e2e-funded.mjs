// Prueba con fondos de stagenet (XMR de prueba, sin valor): orden completa de punta a punta.
//   backend local + árbitro + comprador y vendedor simulados, cada uno con su wallet de escrow.
//   1. arman el escrow 2 de 3;  2. el vendedor deposita desde la wallet de prueba;
//   3. 10 confirmaciones (~20 min);  4. «Ya pagué» y «Liberar»;  5. el vendedor arma el pago y el
//   árbitro pone la segunda firma;  6. el XMR llega a la wallet del comprador.
// Uso: node test/e2e-funded.mjs <archivo de la wallet de prueba> [nodo]
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import moneroTs from "monero-ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Arbiter, apiClient } from "../src/arbiter.mjs";
import { advance, createSpend, exportInfo, importInfo, prepare } from "../src/multisig.mjs";
import { signedMessage } from "../src/rules.mjs";

const [walletFile, NODE = "https://xmrp2p-node-proxy.xmrp2p.workers.dev"] = process.argv.slice(2);
if (!walletFile) throw new Error("uso: node test/e2e-funded.mjs <archivo de la wallet de prueba> [nodo]");
const NET = moneroTs.MoneroNetworkType.STAGENET;
const PORT = 8798;
const API = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s]`, ...a);

const admin = privateKeyToAccount(generatePrivateKey());
const TOKEN = crypto.randomUUID() + crypto.randomUUID();
const STATE_SECRET = crypto.randomUUID() + crypto.randomUUID();

// Wallets: la de prueba (paga el depósito), la de cobro de la plataforma y la del comprador.
const s = JSON.parse(readFileSync(walletFile, "utf8"));
const funding = await moneroTs.createWalletFull({ networkType: NET, password: "x", seed: s.seed, restoreHeight: s.restoreHeight, server: { uri: NODE } });
await funding.sync();
// Espera a que el XMR de prueba esté desbloqueado (10 confirmaciones desde que llegó).
for (let i = 0; Number(await funding.getUnlockedBalance()) < 0.012e12; i++) {
  if (i > 60) throw new Error("la wallet de prueba no tiene XMR desbloqueado suficiente");
  if (i % 5 === 0) log("esperando XMR desbloqueado… saldo:", Number(await funding.getBalance()) / 1e12, "desbloqueado:", Number(await funding.getUnlockedBalance()) / 1e12);
  await sleep(60_000);
  await funding.sync();
}
log("wallet de prueba:", Number(await funding.getUnlockedBalance()) / 1e12, "XMR disponibles");
const feeWallet = await moneroTs.createWalletFull({ networkType: NET, password: "x", server: { uri: NODE } });
const buyerReceive = await moneroTs.createWalletFull({ networkType: NET, password: "x", server: { uri: NODE } });
const FEE = await feeWallet.getPrimaryAddress();

// ---- Backend local ----
const persist = mkdtempSync(join(tmpdir(), "p2p-e2e-"));
const workers = new URL("../../workers/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const wr = (args) => spawn("npx", ["wrangler", ...args], { cwd: workers, shell: true, env: { ...process.env, NODE_USE_SYSTEM_CA: "" } });
await new Promise((res, rej) => wr(["d1", "migrations", "apply", "xmrp2p-orderbook", "--local", "--persist-to", persist]).on("exit", (c) => (c ? rej(new Error("migraciones")) : res())));
const vars = { P2P_ENABLED: "on", P2P_XMR_NETWORK: "stagenet", P2P_ADMIN_ADDRESS: admin.address, P2P_ARBITER_TOKEN: TOKEN, P2P_FEE_ADDRESS: FEE };
const dev = wr(["dev", "--local", "--port", String(PORT), "--persist-to", persist, ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])]);
const stop = () => (process.platform === "win32" ? spawnSync("taskkill", ["/pid", String(dev.pid), "/T", "/F"]) : dev.kill());

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(API + "/v1/p2p/config")).ok) break;
    } catch {}
    if (i > 90) throw new Error("el backend local no arrancó");
    await sleep(1000);
  }
  const signed = async (key, method, path, body) => {
    const raw = body === undefined ? "" : JSON.stringify({ ...body, nonce: crypto.randomUUID() });
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = await key.signMessage({ message: await signedMessage(method, path.split("?")[0], key.address, ts, raw) });
    const r = await fetch(API + path, { method, body: raw || undefined, headers: { "content-type": "application/json", "x-maker-address": key.address, "x-timestamp": ts, "x-signature": signature } });
    const j = await r.json();
    if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j)}`);
    return j;
  };

  const seller = privateKeyToAccount(generatePrivateKey());
  const buyer = privateKeyToAccount(generatePrivateKey());
  await signed(seller, "PUT", "/v1/p2p/me", { nickname: "vend_" + seller.address.slice(2, 10), enc_pubkey: "02" + "11".repeat(32) });
  await signed(buyer, "PUT", "/v1/p2p/me", { nickname: "comp_" + buyer.address.slice(2, 10), enc_pubkey: "02" + "22".repeat(32) });
  const escrowWallet = () => moneroTs.createWalletFull({ networkType: NET, password: "x", server: { uri: NODE } });
  const parties = { buyer: { key: buyer, wallet: await escrowWallet() }, seller: { key: seller, wallet: await escrowWallet() } };

  const ad = await signed(seller, "POST", "/v1/p2p/ads", {
    side: "sell", fiat: "MXN", price_type: "float", margin_pct: 0, min_fiat: "100", max_fiat: "1000", amount_xmr: "0.5",
    methods: [{ kind: "bank", name: "SPEI", country: "MX" }], pay_window_min: 60, xmr_address: await funding.getPrimaryAddress(),
  });
  const order = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "100", xmr_address: await buyerReceive.getPrimaryAddress() });
  log(`orden ${order.id}: ${order.xmr} XMR por ${order.fiat_amount} MXN`);

  const arbiter = await new Arbiter({ api: apiClient(API, TOKEN), network: "stagenet", node: NODE, stateSecret: STATE_SECRET, feeAddress: FEE, log: (...a) => log("  árbitro:", ...a) }).init();
  const send = (role, data) => signed(parties[role].key, "POST", `/v1/p2p/orders/${order.id}/messages`, { protocol: data });
  const proto = async () =>
    (await signed(buyer, "GET", `/v1/p2p/orders/${order.id}/messages`)).messages.filter((m) => m.body.type === "protocol");
  const getOrder = () => signed(buyer, "GET", `/v1/p2p/orders/${order.id}`);

  // 1. Escrow
  const prog = { buyer: { round: -1 }, seller: { round: -1 } };
  for (let step = 0; (await getOrder()).status === "setup"; step++) {
    if (step > 20) throw new Error("el escrow no quedó listo");
    await arbiter.tick();
    const msgs = await proto();
    const kex = (from, round) => msgs.findLast((m) => m.from === from && m.body.data.step === "kex" && m.body.data.round === round)?.body.data.hex;
    for (const role of ["buyer", "seller"]) {
      const me = prog[role];
      if (me.round === -1) {
        await send(role, { step: "kex", round: 0, hex: await prepare(parties[role].wallet) });
        me.round = 0;
      } else if (!me.done) {
        const hexes = [kex(role === "buyer" ? "seller" : "buyer", me.round), kex("arbiter", me.round)];
        if (hexes.some((h) => !h)) continue;
        const r = await advance(parties[role].wallet, me.round + 1, hexes, "x");
        me.round += 1;
        if (r.hex) await send(role, { step: "kex", round: me.round, hex: r.hex });
        if (r.done) {
          me.done = true;
          await send(role, { step: "address", address: r.address });
        }
      }
    }
  }
  const o1 = await getOrder();
  assert.equal(o1.status, "awaiting_deposit");
  log(`escrow listo: ${o1.multisig_address.slice(0, 16)}… — depositar ${o1.deposit_required_xmr} XMR`);

  // 2. Depósito del vendedor
  const dep = await funding.createTx({ accountIndex: 0, address: o1.multisig_address, amount: moneroTs.MoneroUtils.xmrToAtomicUnits(o1.deposit_required_xmr), relay: true });
  log("depósito enviado:", dep.getHash());

  // 3. Confirmaciones (el árbitro vigila)
  for (let i = 0; ; i++) {
    await arbiter.tick();
    const st = (await getOrder()).status;
    if (st === "awaiting_payment") break;
    if (i % 4 === 0) log("esperando confirmaciones… estado:", st);
    if (i > 120) throw new Error("no llegaron las confirmaciones");
    await sleep(30_000);
  }
  log("depósito confirmado: el comprador ya puede pagar");

  // 4. «Ya pagué» y «Liberar»
  assert.equal((await signed(buyer, "POST", `/v1/p2p/orders/${order.id}/paid`, {})).status, "paid");
  assert.equal((await signed(seller, "POST", `/v1/p2p/orders/${order.id}/release`, {})).status, "releasing");

  // 5. El vendedor arma el pago con su wallet de escrow; el árbitro revisa y pone la segunda firma.
  const sw = parties.seller.wallet;
  await sw.sync();
  for (let i = 0; ; i++) {
    await arbiter.tick(); // publica su información de salidas
    var exp = (await proto()).findLast((m) => m.from === "arbiter" && m.body.data.step === "export")?.body.data;
    if (exp) {
      await importInfo(sw, [exp.hex]);
      break;
    }
    if (i > 10) throw new Error("el árbitro no publicó su información");
    await sleep(5000);
  }
  await send("seller", { step: "export", hex: await exportInfo(sw) });
  const full = await signed(admin, "GET", `/v1/p2p/admin/orders/${order.id}`);
  const hex = await createSpend(sw, [
    { address: await buyerReceive.getPrimaryAddress(), amount: BigInt(full.order.xmr_pico) },
    { address: FEE, amount: BigInt(full.order.fee_pico) },
  ]);
  await send("seller", { step: "spend", hex, for: exp.n });
  for (let i = 0; (await getOrder()).status !== "released"; i++) {
    if (i > 10) throw new Error("el árbitro no firmó el pago");
    await arbiter.tick();
    await sleep(3000);
  }
  const done = await getOrder();
  log("✔ liberado, transacción:", done.payout_txid);

  // 6. El comprador ve el XMR (en espera de confirmación)
  for (let i = 0; ; i++) {
    await buyerReceive.sync();
    const got = (await buyerReceive.getTxs({ isIncoming: true })).reduce((a, t) => a + BigInt(t.getIncomingAmount() ?? 0n), 0n);
    if (got > 0n) {
      assert.equal(got.toString(), full.order.xmr_pico);
      log(`✔ el comprador recibió ${Number(got) / 1e12} XMR`);
      break;
    }
    if (i > 20) throw new Error("el comprador no ve el pago");
    await sleep(10_000);
  }
  log("✔ prueba con fondos completa");
} finally {
  stop();
}
process.exit(0);
