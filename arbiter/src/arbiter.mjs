// Lógica del árbitro: atiende las tareas que le da el backend.
//   setup_escrow  → participa en las rondas del multisig 2 de 3 y publica la dirección del escrow
//   watch_deposit → sincroniza la wallet del escrow y avisa del depósito y de las 10 confirmaciones
//   release / refund / resolve → revisa la autorización y la transacción, y pone la segunda firma
import moneroTs from "monero-ts";
import { advance, describeSpend, exportInfo, importInfo, MAX_ROUNDS, prepare, signAndSubmit } from "./multisig.mjs";
import { authorizationFor, checkSpend, spenderRole, verifyAuthorization } from "./rules.mjs";
import { b64, open, seal, stateKey, unb64, walletPassword } from "./store.mjs";

export const MIN_CONFIRMATIONS = 10;
export const NETWORK_FEE_RESERVE = 100_000_000n; // igual que en el backend (0.0001 XMR)

const NET = { stagenet: moneroTs.MoneroNetworkType.STAGENET, mainnet: moneroTs.MoneroNetworkType.MAINNET };
const sha = async (s) => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).toString("hex").slice(0, 16);

/** Cliente de las rutas /v1/p2p/arbiter del backend. */
export function apiClient(apiUrl, token, fetchImpl = fetch) {
  const call = async (method, path, body) => {
    const r = await fetchImpl(apiUrl + path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    if (r.status === 404 && path.endsWith("/state")) return null;
    if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
    return r.headers.get("content-type")?.includes("json") ? r.json() : r.text();
  };
  return {
    tasks: () => call("GET", "/v1/p2p/arbiter/tasks"),
    messages: (id, after = 0) => call("GET", `/v1/p2p/arbiter/orders/${id}/messages?after=${after}`),
    post: (id, action, body) => call("POST", `/v1/p2p/arbiter/orders/${id}/${action}`, body),
    getState: (id) => call("GET", `/v1/p2p/arbiter/orders/${id}/state`),
    putState: (id, s) => call("PUT", `/v1/p2p/arbiter/orders/${id}/state`, s),
  };
}

export class Arbiter {
  /**
   * cfg: { api, network, node, stateSecret, feeAddress, log? }
   *  - node: nodo de Monero (solo hace falta para vigilar depósitos y enviar pagos)
   *  - feeAddress: dirección de Monero donde cobra la plataforma
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.log = cfg.log ?? ((...a) => console.log(new Date().toISOString(), ...a));
  }

  async init() {
    this.key = await stateKey(this.cfg.stateSecret);
    return this;
  }

  /** Una pasada por todas las tareas. Devuelve cuántas tareas siguen pendientes. */
  async tick() {
    const { tasks, admin_address, fee_address } = await this.cfg.api.tasks();
    this.adminAddress = admin_address;
    // La dirección de cobro la fija el árbitro; si el backend dice otra, algo anda mal: no se firma nada.
    this.feeMismatch = !!fee_address && fee_address !== this.cfg.feeAddress;
    if (this.feeMismatch) this.log("ALERTA: la dirección de cobro del backend no coincide con la del árbitro; no se firmarán pagos");
    for (const t of tasks) {
      try {
        await this.handle(t);
      } catch (e) {
        this.log(`orden ${t.order_id} (${t.task}):`, e?.message ?? e);
      }
    }
    return tasks.length;
  }

  async handle(t) {
    switch (t.task) {
      case "setup_escrow":
        return this.setup(t);
      case "watch_deposit":
        return this.watch(t);
      case "release":
      case "refund":
      case "resolve":
        return this.spend(t);
    }
  }

  // ---------- Estado y wallet de cada orden ----------

  async loadState(id) {
    const sealed = await this.cfg.api.getState(id);
    return sealed ? open(this.key, id, typeof sealed === "string" ? sealed : JSON.stringify(sealed)) : null;
  }

  async saveState(id, state, wallet) {
    if (wallet) {
      const [keys, cache] = await wallet.getData();
      state.keys = b64(keys);
      state.cache = cache ? b64(cache) : null;
    }
    await this.cfg.api.putState(id, await seal(this.key, id, state));
  }

  async openWallet(id, state, withNode) {
    const password = await walletPassword(this.cfg.stateSecret, id);
    const base = { networkType: NET[this.cfg.network], password, ...(withNode && this.cfg.node ? { server: { uri: this.cfg.node } } : {}) };
    if (!state?.keys) {
      // Wallet nueva al azar: con nodo, monero-ts fija sola la altura actual como inicio del escaneo.
      const w = await moneroTs.createWalletFull({ ...base, ...(this.cfg.node ? { server: { uri: this.cfg.node } } : {}) });
      return { wallet: w, restoreHeight: await w.getRestoreHeight() };
    }
    const w = await moneroTs.openWalletFull({ ...base, keysData: unb64(state.keys), cacheData: state.cache ? unb64(state.cache) : undefined });
    return { wallet: w, restoreHeight: state.restoreHeight };
  }

  /** Mensajes del protocolo multisig de la orden, agrupados por quién los mandó. */
  async protocol(id) {
    const { messages } = await this.cfg.api.messages(id);
    return messages.filter((m) => m.body?.type === "protocol" && m.body.data && typeof m.body.data === "object");
  }

  // ---------- Armado del escrow ----------

  async setup(t) {
    const id = t.order_id;
    let state = (await this.loadState(id)) ?? null;
    const msgs = await this.protocol(id);
    const kex = (role, round) => msgs.findLast((m) => m.from === role && m.body.data.step === "kex" && m.body.data.round === round)?.body.data.hex;

    if (!state) {
      const { wallet, restoreHeight } = await this.openWallet(id, null, false);
      try {
        const hex = await prepare(wallet);
        state = { round: 0, done: false, restoreHeight };
        await this.cfg.api.post(id, "message", { data: { step: "kex", round: 0, hex } });
        await this.saveState(id, state, wallet);
        this.log(`orden ${id}: ronda 0 publicada`);
      } finally {
        await wallet.close();
      }
      return;
    }

    if (!state.done) {
      const buyer = kex("buyer", state.round);
      const seller = kex("seller", state.round);
      if (!buyer || !seller) return; // esperando a las partes
      if (state.round + 1 > MAX_ROUNDS) throw new Error("demasiadas rondas");
      const { wallet } = await this.openWallet(id, state, false);
      try {
        const r = await advance(wallet, state.round + 1, [buyer, seller], await walletPassword(this.cfg.stateSecret, id));
        state.round += 1;
        if (r.hex) await this.cfg.api.post(id, "message", { data: { step: "kex", round: state.round, hex: r.hex } });
        if (r.done) {
          state.done = true;
          state.address = r.address;
          await this.cfg.api.post(id, "message", { data: { step: "address", address: r.address } });
        }
        await this.saveState(id, state, wallet);
        this.log(`orden ${id}: ronda ${state.round}${r.done ? " — escrow listo" : ""}`);
      } finally {
        await wallet.close();
      }
    }

    if (state.done) {
      // Solo se anuncia el escrow cuando las tres partes calcularon la misma dirección.
      const addr = (role) => msgs.findLast((m) => m.from === role && m.body.data.step === "address")?.body.data.address;
      const b = addr("buyer");
      const s = addr("seller");
      if (!b || !s) return;
      if (b !== state.address || s !== state.address) throw new Error("las partes calcularon otra dirección de escrow");
      await this.cfg.api.post(id, "escrow", { multisig_address: state.address });
      this.log(`orden ${id}: escrow publicado ${state.address.slice(0, 12)}…`);
    }
  }

  // ---------- Depósito ----------

  async watch(t) {
    const id = t.order_id;
    const state = await this.loadState(id);
    if (!state?.done) throw new Error("no hay wallet de escrow para esta orden");
    const { wallet } = await this.openWallet(id, state, true);
    try {
      await wallet.sync();
      const txs = await wallet.getTxs({ isIncoming: true });
      if (!txs.length) return;
      if (t.status === "awaiting_deposit") {
        await this.cfg.api.post(id, "deposit", { txid: txs[0].getHash() });
        this.log(`orden ${id}: depósito visto ${txs[0].getHash().slice(0, 10)}…`);
      }
      const confirmed = txs.every((tx) => (tx.getNumConfirmations() ?? 0) >= MIN_CONFIRMATIONS);
      if (confirmed) {
        const total = txs.reduce((a, tx) => a + BigInt(tx.getIncomingAmount() ?? 0n), 0n);
        await this.cfg.api.post(id, "confirmed", { amount_xmr: fromPico(total) });
        // La otra parte necesita esta información para poder armar la transacción de salida.
        await this.cfg.api.post(id, "message", { data: { step: "export", hex: await exportInfo(wallet) } });
        this.log(`orden ${id}: ${fromPico(total)} XMR confirmados`);
      }
      await this.saveState(id, state, wallet);
    } finally {
      await wallet.close();
    }
  }

  // ---------- Pagos de salida (segunda firma) ----------

  async spend(t) {
    const id = t.order_id;
    const state = await this.loadState(id);
    if (!state?.done) throw new Error("no hay wallet de escrow para esta orden");
    if (this.feeMismatch) throw new Error("dirección de cobro distinta a la del backend");
    const need = authorizationFor(t, this.adminAddress);
    if (need) await verifyAuthorization(t.authorization, { ...need, orderId: id });

    const role = spenderRole(t);
    const msgs = await this.protocol(id);
    const theirExport = msgs.findLast((m) => m.from === role && m.body.data.step === "export")?.body.data.hex;
    const spendMsg = msgs.findLast((m) => m.from === role && m.body.data.step === "spend");
    const { wallet } = await this.openWallet(id, state, true);
    try {
      await wallet.sync();
      if (!state.exportedAt || !msgs.some((m) => m.from === "arbiter" && m.body.data.step === "export")) {
        await this.cfg.api.post(id, "message", { data: { step: "export", hex: await exportInfo(wallet) } });
        state.exportedAt = Date.now();
      }
      if (!theirExport || !spendMsg) {
        await this.saveState(id, state, wallet);
        return; // esperando la transacción de quien cobra
      }
      const hex = spendMsg.body.data.hex;
      const tag = await sha(hex);
      if (state.rejected?.includes(tag)) return;
      await importInfo(wallet, [theirExport]);
      const described = await describeSpend(wallet, hex);
      try {
        checkSpend(described, t, { feeAddress: this.cfg.feeAddress, networkFeeReserve: NETWORK_FEE_RESERVE });
      } catch (e) {
        state.rejected = [...(state.rejected ?? []), tag];
        await this.cfg.api.post(id, "message", { data: { step: "rejected", reason: e.message } });
        await this.saveState(id, state, wallet);
        throw e;
      }
      const txids = await signAndSubmit(wallet, hex);
      await this.cfg.api.post(id, "payout", { txid: txids[0] });
      this.log(`orden ${id}: ${t.task} enviado ${txids[0].slice(0, 10)}…`);
      await this.saveState(id, state, wallet);
    } finally {
      await wallet.close();
    }
  }
}

export function fromPico(v) {
  const p = BigInt(v);
  const i = p / 1_000_000_000_000n;
  const f = (p % 1_000_000_000_000n).toString().padStart(12, "0").replace(/0+$/, "");
  return f ? `${i}.${f}` : `${i}`;
}
