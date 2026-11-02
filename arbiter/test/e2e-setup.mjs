// Prueba de punta a punta (sin fondos): backend local real + árbitro + comprador y vendedor simulados.
// Levanta `wrangler dev` con P2P encendido, crea un anuncio y una orden, y las tres partes arman el
// escrow 2 de 3 por la sala de la orden hasta que el backend la pasa a «esperando depósito».
// Uso: node test/e2e-setup.mjs   (todas las llaves y secretos se generan aquí y se descartan)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import moneroTs from "monero-ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Arbiter, apiClient } from "../src/arbiter.mjs";
import { advance, prepare } from "../src/multisig.mjs";
import { signedMessage } from "../src/rules.mjs";

const PORT = 8799;
const API = `http://127.0.0.1:${PORT}`;
const admin = privateKeyToAccount(generatePrivateKey());
const TOKEN = crypto.randomUUID() + crypto.randomUUID();
const STATE_SECRET = crypto.randomUUID() + crypto.randomUUID();
const FEE = "5" + "F".repeat(94);
const persist = mkdtempSync(join(tmpdir(), "p2p-e2e-"));

// ---- Backend local ----
const workers = new URL("../../workers/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const run = (args) =>
  new Promise((res, rej) => {
    const p = spawn("npx", ["wrangler", ...args], { cwd: workers, shell: true, env: { ...process.env, NODE_USE_SYSTEM_CA: "" } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("exit", (c) => (c === 0 ? res(out) : rej(new Error(out))));
  });
await run(["d1", "migrations", "apply", "xmrp2p-orderbook", "--local", "--persist-to", persist]);
const vars = { P2P_ENABLED: "on", P2P_XMR_NETWORK: "stagenet", P2P_ADMIN_ADDRESS: admin.address, P2P_ARBITER_TOKEN: TOKEN, P2P_FEE_ADDRESS: FEE };
const dev = spawn(
  "npx",
  ["wrangler", "dev", "--local", "--port", String(PORT), "--persist-to", persist, ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
  { cwd: workers, shell: true, env: { ...process.env, NODE_USE_SYSTEM_CA: "" } },
);
let devLog = "";
dev.stdout.on("data", (d) => (devLog += d));
dev.stderr.on("data", (d) => (devLog += d));
const stop = () => {
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(dev.pid), "/T", "/F"]);
    else dev.kill();
  } catch {}
};

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(API + "/v1/p2p/config")).ok) break;
    } catch {}
    if (i > 90) throw new Error("el backend local no arrancó:\n" + devLog.slice(-2000));
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ---- Usuarios (llaves generadas aquí) ----
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

  // Wallets de stagenet de cada parte (en memoria) para el escrow.
  const newWallet = () => moneroTs.createWalletFull({ networkType: moneroTs.MoneroNetworkType.STAGENET, password: "x" });
  const parties = { buyer: { key: buyer, wallet: await newWallet() }, seller: { key: seller, wallet: await newWallet() } };
  const refund = await parties.seller.wallet.getPrimaryAddress();
  const receive = await parties.buyer.wallet.getPrimaryAddress();

  const ad = await signed(seller, "POST", "/v1/p2p/ads", {
    side: "sell", fiat: "MXN", price_type: "float", margin_pct: 1, min_fiat: "100", max_fiat: "2000", amount_xmr: "1",
    methods: [{ kind: "bank", name: "SPEI", country: "MX" }], pay_window_min: 15, xmr_address: refund,
  });
  const order = await signed(buyer, "POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: "500", xmr_address: receive });
  console.log(`orden ${order.id}: ${order.xmr} XMR por ${order.fiat_amount} MXN (${order.price} MXN/XMR), estado ${order.status}`);

  // ---- Armado del escrow: las partes publican sus rondas; el árbitro hace lo suyo en cada pasada ----
  const arbiter = await new Arbiter({ api: apiClient(API, TOKEN), network: "stagenet", node: null, stateSecret: STATE_SECRET, feeAddress: FEE, log: (...a) => console.log("  árbitro:", ...a) }).init();
  const progress = { buyer: { round: -1, done: false }, seller: { round: -1, done: false } };
  const send = (role, data) => signed(parties[role].key, "POST", `/v1/p2p/orders/${order.id}/messages`, { protocol: data });

  for (let step = 0; step < 20; step++) {
    await arbiter.tick();
    const { messages } = await signed(buyer, "GET", `/v1/p2p/orders/${order.id}/messages`);
    const kex = (from, round) => messages.findLast((m) => m.from === from && m.body.type === "protocol" && m.body.data.step === "kex" && m.body.data.round === round)?.body.data.hex;
    for (const role of ["buyer", "seller"]) {
      const me = progress[role];
      if (me.round === -1) {
        await send(role, { step: "kex", round: 0, hex: await prepare(parties[role].wallet) });
        me.round = 0;
        continue;
      }
      if (me.done) continue;
      const other = role === "buyer" ? "seller" : "buyer";
      const hexes = [kex(other, me.round), kex("arbiter", me.round)];
      if (hexes.some((h) => !h)) continue;
      const r = await advance(parties[role].wallet, me.round + 1, hexes, "x");
      me.round += 1;
      if (r.hex) await send(role, { step: "kex", round: me.round, hex: r.hex });
      if (r.done) {
        me.done = true;
        me.address = r.address;
        await send(role, { step: "address", address: r.address });
      }
    }
    const o = await signed(buyer, "GET", `/v1/p2p/orders/${order.id}`);
    if (o.status === "awaiting_deposit") {
      assert.equal(o.multisig_address, progress.buyer.address);
      assert.equal(o.multisig_address, progress.seller.address);
      console.log(`\n✔ escrow 2 de 3 listo en ${progress.buyer.round} rondas: ${o.multisig_address}`);
      console.log(`  el vendedor debe depositar ${o.deposit_required_xmr} XMR (monto + 0.5 % + reserva de red)`);
      const tasks = await apiClient(API, TOKEN).tasks();
      assert.equal(tasks.tasks.find((t) => t.order_id === order.id).task, "watch_deposit");
      break;
    }
    if (step === 19) throw new Error("el escrow no quedó listo");
  }
  await Promise.all(Object.values(parties).map((p) => p.wallet.close()));
  console.log("✔ prueba completa");
} finally {
  stop();
}
process.exit(0);
