/**
 * App del swap (lado del taker). Corre solo en /es/app/ y /en/app/.
 * Orden obligatorio: llaves → respuesta del maker verificada → ARCHIVO DE RECUPERACIÓN →
 * depósito → seguimiento automático (verificar XMR, setReady o reembolso, barrido).
 */
import type { Address, Hex } from "viem";
import { api, type MakerReply, type Offer } from "./api";
import { isDeployed, NETWORKS, POLICY, selectedNetwork, validXmrAddress, type EvmNetwork } from "./config";
import { decide, type Action, type XmrCheck } from "./decide";
import { Evm, type WalletStep } from "./evm";
import { t, type Key, type Lang } from "./i18n";
import { decryptRecovery, encryptRecovery, recoveryFilename, type RecoveryFile } from "./recovery";
import { cryptoLib, xmrLib } from "./libs";
import { attention, setStage, startLoading, type Stage } from "./ui";

interface PublicMessage {
  spend_public_ed25519: string;
  public_secp256k1: string;
  contract_commitment: string;
  view_private: string;
  dleq_proof: string;
}

interface SwapState {
  v: 1;
  network: string;
  created_at: number;
  usdt: string;
  offer: Offer;
  destination: string; // dirección Monero del usuario
  node: string;
  keys: { spend_private: string; contract_secret: Hex; message: PublicMessage };
  room?: { id: string; token: string };
  reply?: MakerReply;
  shared?: { address: string; private_view_key: string };
  recovery_saved: boolean;
  salt?: Hex;
  escrow?: Address;
  deposit_tx?: Hex;
  deposit_block?: number;
  xmr_lock?: { txid: string; tx_key: string; xmr_atomic: number };
  xmr_check?: { received: string; confirmations: number };
  ready_tx?: Hex;
  refund_tx?: Hex;
  sweep_txids?: string[];
  restore_height?: number;
  last_seq: number;
}

const STORAGE_KEY = "xmrp2p:swap";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const hex32 = () => `0x${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;

export class SwapApp {
  private state: SwapState | null = null;
  private passphrase = "";
  private evm: Evm | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  /** Red elegida en la página (?red=real). Un swap reanudado usa la suya. */
  private net: EvmNetwork = selectedNetwork();

  constructor(private lang: Lang) {}

  // ------------------------------------------------------------------ arranque

  async mount(): Promise<void> {
    const net = this.net;
    document.body.dataset.net = net.testnet ? "test" : "real";
    if (!isDeployed(net)) this.banner(t(this.lang, "not_deployed"), "warn");
    $<HTMLInputElement>("node").value = net.monero.defaultNode;
    if (net.maxUsdt) $<HTMLInputElement>("usdt").placeholder = `5–${net.maxUsdt}`;
    // Cada acción desactiva su botón y muestra un spinner mientras corre: un segundo clic no hace nada.
    const submitter = (e: Event) => (e as SubmitEvent).submitter;
    $("form-start").addEventListener("submit", (e) => (e.preventDefault(), this.guard(() => this.start(), submitter(e), "loading_request")));
    $("btn-recovery").addEventListener("click", (e) => this.guard(() => this.downloadRecovery(), e.currentTarget as Element));
    $("btn-deposit").addEventListener("click", (e) => this.guard(() => this.deposit(), e.currentTarget as Element, "loading_wallet"));
    $("btn-action").addEventListener("click", (e) => this.guard(() => this.runAction(), e.currentTarget as Element, "loading_wallet"));
    $("form-restore").addEventListener("submit", (e) => (e.preventDefault(), this.guard(() => this.restore(), submitter(e))));
    $("btn-offers").addEventListener("click", (e) => this.guard(() => this.loadOffers(), e.currentTarget as Element, "loading_offers"));
    setStage("step-start");
    window.addEventListener("beforeunload", (e) => {
      if (this.state && !this.finished()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    // Un swap guardado no debe bloquear uno nuevo: se muestra el aviso de reanudar junto al formulario.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      let deposited = false;
      try {
        deposited = !!(JSON.parse(saved) as RecoveryFile).hint?.escrow;
      } catch {
        /* archivo ilegible: se puede descartar */
      }
      $("step-restore").hidden = false;
      $("saved-note").textContent = t(this.lang, deposited ? "saved_with_deposit" : "saved_without_deposit");
      $("btn-discard").addEventListener("click", () => {
        if (window.confirm(t(this.lang, deposited ? "discard_confirm_deposit" : "discard_confirm"))) {
          localStorage.removeItem(STORAGE_KEY);
          $("step-restore").hidden = true;
        }
      });
    }
    await this.loadOffers();
  }

  private async loadOffers(): Promise<Offer[]> {
    const sel = $<HTMLSelectElement>("offer");
    const keep = sel.value;
    sel.disabled = true;
    sel.classList.add("skeleton");
    if (!sel.options.length) sel.append(new Option(t(this.lang, "loading_offers")));
    try {
      const offers = await api.offers(this.net.id);
      sel.innerHTML = "";
      for (const o of offers) {
        const opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = `${o.price} USDT/XMR · ${o.min_usdt}–${o.max_usdt} USDT · ${o.maker.slice(0, 10)}…`;
        opt.dataset.offer = JSON.stringify(o);
        sel.append(opt);
      }
      if (offers.some((o) => o.id === keep)) sel.value = keep;
      if (!offers.length) {
        sel.append(new Option(t(this.lang, "no_offers"), ""));
        this.banner(t(this.lang, "no_offers"), "warn");
      }
      return offers;
    } catch (e) {
      this.banner(`${t(this.lang, "backend_error")}: ${(e as Error).message}`, "warn");
      return [];
    } finally {
      sel.disabled = false;
      sel.classList.remove("skeleton");
    }
  }

  // ------------------------------------------------------------------ 1. negociar

  private async start(): Promise<void> {
    const usdt = $<HTMLInputElement>("usdt").value.trim();
    const destination = $<HTMLInputElement>("destination").value.trim();
    const pass = $<HTMLInputElement>("passphrase").value;
    const node = $<HTMLInputElement>("node").value.trim();
    const opt = $<HTMLSelectElement>("offer").selectedOptions[0];
    if (!opt?.dataset.offer) throw new Error(t(this.lang, "pick_offer"));
    const chosen = JSON.parse(opt.dataset.offer) as Offer;
    if (!/^\d+(\.\d{1,6})?$/.test(usdt)) throw new Error(t(this.lang, "bad_amount"));
    const net = this.net;
    if (!validXmrAddress(destination, net.monero)) throw new Error(t(this.lang, net.testnet ? "bad_address" : "bad_address_main"));
    if (net.maxUsdt && Number(usdt) > net.maxUsdt) throw new Error(t(this.lang, "over_cap", { max: net.maxUsdt }));
    if (pass.length < 10) throw new Error(t(this.lang, "short_pass"));
    if (!node) throw new Error(t(this.lang, "need_node"));
    // Recargar las ofertas justo antes de pedir el swap: la elegida pudo vencer mientras se llenaba el formulario.
    this.status(t(this.lang, "loading_offers"));
    const offer = (await this.loadOffers()).find((o) => o.id === chosen.id);
    if (!offer) throw new Error(t(this.lang, "offer_gone"));
    if (Number(usdt) < Number(offer.min_usdt) || Number(usdt) > Number(offer.max_usdt)) {
      throw new Error(t(this.lang, "amount_range", { min: offer.min_usdt, max: offer.max_usdt }));
    }
    this.passphrase = pass;

    const c = await cryptoLib();
    const keys = JSON.parse(c.generateKeys()) as SwapState["keys"];
    this.state = { v: 1, network: net.id, created_at: Date.now(), usdt, offer, destination, node, keys, recovery_saved: false, last_seq: 0 };

    this.status(t(this.lang, "asking_maker"));
    const r = await api.createSwap(offer.id, usdt, keys.message);
    const reply = r.maker_reply;
    // Verificar TODO lo que afirma el maker antes de mostrar el depósito.
    const makerMsg = JSON.stringify(reply.maker_message);
    const makerCommitment = c.verifyCounterparty(makerMsg); // DLEQ + commitment
    if (makerCommitment.toLowerCase() !== reply.claim_commitment.toLowerCase()) throw new Error("claim_commitment del maker no coincide con su DLEQ");
    if (reply.refund_commitment.toLowerCase() !== keys.message.contract_commitment.toLowerCase()) throw new Error("el maker no usó nuestro commitment");
    const shared = JSON.parse(c.sharedAddress(keys.spend_private, makerMsg, net.monero.network)) as SwapState["shared"];
    if (shared!.address !== reply.shared_address) throw new Error("la dirección compartida del maker no coincide con la nuestra");
    if (reply.usdt_atomic !== Math.round(Number(usdt) * 1e6)) throw new Error("el monto de USDT del maker no coincide");
    const expectedXmr = Number(usdt) / Number(offer.price);
    if (reply.xmr_atomic / 1e12 < expectedXmr * 0.98) throw new Error("el maker ofrece menos XMR que su oferta publicada");

    // El salt se fija ANTES del archivo de recuperación: con él y la cuenta del taker,
    // `predictEscrow(cuenta, salt)` ubica el escrow aunque se pierda el navegador.
    this.state.salt = hex32();
    this.state.room = { id: r.room_id, token: r.room_token };
    this.state.reply = reply;
    this.state.shared = shared;
    try {
      this.state.restore_height = Math.max(0, (await (await xmrLib()).daemonHeight(node)) - 10);
    } catch {
      /* se pedirá al barrer */
    }
    await this.persist();
    $("quote").textContent = t(this.lang, "quote", { usdt, xmr: (reply.xmr_atomic / 1e12).toFixed(12) });
    this.show("step-recovery");
  }

  // ------------------------------------------------------------------ 2. archivo de recuperación

  private async downloadRecovery(): Promise<void> {
    const s = this.need();
    const file = await encryptRecovery(s, this.passphrase, { network: s.network, escrow: s.escrow, shared_address: s.shared?.address });
    const blob = new Blob([JSON.stringify(file, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = recoveryFilename(s.network);
    a.click();
    URL.revokeObjectURL(a.href);
    s.recovery_saved = true;
    await this.persist();
    this.show("step-deposit");
  }

  // ------------------------------------------------------------------ 3. depósito

  private async deposit(): Promise<void> {
    const s = this.need();
    if (!s.recovery_saved) throw new Error(t(this.lang, "save_first"));
    if (Date.now() / 1000 > s.reply!.deposit_deadline) throw new Error(t(this.lang, "deposit_expired"));
    const net = NETWORKS[s.network]!;
    if (!isDeployed(net)) throw new Error(t(this.lang, "not_deployed"));
    if (!net.testnet && !window.confirm(t(this.lang, "confirm_real", { usdt: s.usdt }))) return;
    this.evm ??= this.makeEvm(net);
    const account = await this.evm.connect();
    const amount = BigInt(s.reply!.usdt_atomic);
    if ((await this.evm.tokenBalance(account)) < amount) throw new Error(t(this.lang, "no_balance"));
    if (!s.salt) throw new Error("falta el salt del escrow; reinicia el swap");
    this.status(t(this.lang, "depositing"));
    const r = await this.evm.deposit({
      claimer: s.reply!.claimer,
      claimCommitment: s.reply!.claim_commitment,
      refundCommitment: s.keys.message.contract_commitment as Hex,
      duration0: Math.max(POLICY.duration0, s.reply!.min_duration0 + 10 * 60),
      duration1: Math.max(POLICY.duration1, s.reply!.min_duration1),
      amount,
      salt: s.salt,
    });
    Object.assign(s, { escrow: r.escrow, deposit_tx: r.hash, deposit_block: r.block });
    await this.persist();
    // Nuevo archivo con la dirección del escrow (el anterior también sirve, pero este es más cómodo).
    await api.message(s.room!.id, s.room!.token, "deposited", { escrow: r.escrow, tx: r.hash });
    this.show("step-progress");
    this.loop();
  }

  // ------------------------------------------------------------------ 4. seguimiento

  private loop(): void {
    if (this.timer) clearTimeout(this.timer);
    const tick = async () => {
      try {
        await this.tick();
      } catch (e) {
        this.status(`${t(this.lang, "retrying")}: ${(e as Error).message}`);
      }
      if (!this.finished()) this.timer = setTimeout(tick, POLICY.pollMs);
    };
    void tick();
  }

  private pending: Action | null = null;

  private async tick(): Promise<void> {
    const s = this.need();
    const net = NETWORKS[s.network]!;
    this.evm ??= this.makeEvm(net);
    // Mensajes del maker (XMR bloqueado con su llave de transacción).
    if (s.room) {
      for (const m of await api.events(s.room.id, s.room.token, s.last_seq)) {
        s.last_seq = Math.max(s.last_seq, m.seq);
        if (m.from === "maker" && m.event === "xmr_locked") {
          const d = m.data as SwapState["xmr_lock"];
          // Validar ANTES de pasarlo a monero-ts: un tx_key malformado aborta su módulo WASM.
          const keyOk = /^[0-9a-f]{64}$/.test(d?.tx_key ?? "") && parseInt(d!.tx_key.slice(62, 64), 16) <= 0x10;
          if (/^[0-9a-f]{64}$/.test(d?.txid ?? "") && keyOk) s.xmr_lock = d;
          else this.banner("El maker envió datos de bloqueo inválidos; no se confirmará el swap.", "warn");
        }
      }
    }
    const view = await this.evm.view(s.escrow!, s.deposit_block ?? 0);
    if (view.claimCommitment.toLowerCase() !== s.reply!.claim_commitment.toLowerCase() || view.refundCommitment.toLowerCase() !== s.keys.message.contract_commitment.toLowerCase()) {
      throw new Error("el escrow no tiene los commitments acordados");
    }
    // Verificación rápida del XMR con check_tx_key (sin sincronizar la wallet).
    let check: XmrCheck | undefined;
    if (s.xmr_lock && view.stage === "PENDING" && view.now < view.t0) {
      const r = await (await xmrLib()).verifyLock({ node: s.node, network: NETWORKS[s.network]!.monero.network, txid: s.xmr_lock.txid, txKey: s.xmr_lock.tx_key, address: s.shared!.address });
      s.xmr_check = { received: r.received, confirmations: r.confirmations };
    }
    if (s.xmr_check) check = { received: BigInt(s.xmr_check.received), confirmations: s.xmr_check.confirmations };
    await this.persist();

    const action = decide(view, check, { expectedXmr: BigInt(s.reply!.xmr_atomic), minConfirmations: NETWORKS[s.network]!.monero.minConfirmations, refundMarginS: POLICY.refundMarginS });
    this.pending = action;
    this.renderAction(action, view.t0, view.t1, view.now);
    // Acciones que no requieren firma se ejecutan solas; las demás piden un clic.
    if (action.kind === "sweep" && !s.sweep_txids) await this.runAction();
  }

  private async runAction(): Promise<void> {
    const s = this.need();
    const a = this.pending;
    if (!a || !this.evm) return;
    if (a.kind === "set_ready") {
      await this.evm.connect();
      s.ready_tx = await this.evm.setReady(s.escrow!);
      await api.message(s.room!.id, s.room!.token, "ready", { tx: s.ready_tx });
    } else if (a.kind === "refund_now") {
      await this.evm.connect();
      s.refund_tx = await this.evm.refund(s.escrow!, s.keys.contract_secret);
    } else if (a.kind === "sweep") {
      const c = await cryptoLib();
      const w = JSON.parse(c.recoverWallet(s.keys.spend_private, JSON.stringify(s.reply!.maker_message), a.makerSecret, NETWORKS[s.network]!.monero.network)) as {
        address: string; private_view_key: string; private_spend_key: string;
      };
      this.status(t(this.lang, "sweeping"));
      const r = await (await xmrLib()).sweep({
        node: s.node, network: NETWORKS[s.network]!.monero.network, address: w.address, viewKey: w.private_view_key, spendKey: w.private_spend_key,
        restoreHeight: s.restore_height ?? 0, destination: s.destination,
        onProgress: (pct: number) => this.status(`${t(this.lang, "sweeping")} ${Math.round(pct * 100)} %`),
      });
      s.sweep_txids = r.txids;
    }
    await this.persist();
    await this.tick();
  }

  private renderAction(a: Action, t0: number, t1: number, now: number): void {
    const btn = $<HTMLButtonElement>("btn-action");
    const msg = $("action-text");
    const loading = btn.classList.contains("loading");
    if (!loading) btn.hidden = true;
    const label = (k: Key) => {
      if (!loading) btn.textContent = t(this.lang, k);
      btn.hidden = false;
    };
    this.needsUser(a.kind === "set_ready" || a.kind === "refund_now");
    if ((a.kind === "sweep" && this.state?.sweep_txids) || a.kind === "done_refunded") setStage("done");
    const mins = (x: number) => Math.max(0, Math.round((x - now) / 60));
    $("timeline").textContent = t(this.lang, "timeline", { t0: mins(t0), t1: mins(t1) });
    switch (a.kind) {
      case "wait_xmr":
        msg.textContent = `${t(this.lang, "wait_xmr")} (${a.reason}). ${t(this.lang, "refund_deadline", { m: mins(a.deadline) })}`;
        break;
      case "set_ready":
        msg.textContent = t(this.lang, "xmr_ok");
        label("btn_ready");
        break;
      case "refund_now":
        msg.textContent = `${a.urgent ? "⚠️ " : ""}${t(this.lang, "refund")} (${a.reason})`;
        label("btn_refund");
        if (a.urgent) this.banner(t(this.lang, "refund_urgent"), "danger");
        break;
      case "wait_claim":
        msg.textContent = t(this.lang, "wait_claim");
        break;
      case "wait_t1":
        msg.textContent = `${t(this.lang, "wait_t1")} (${a.reason})`;
        break;
      case "sweep":
        msg.textContent = this.state?.sweep_txids ? t(this.lang, "done_xmr", { tx: this.state.sweep_txids.join(", ") }) : t(this.lang, "sweeping");
        break;
      case "done_refunded":
        msg.textContent = t(this.lang, "done_refund");
        break;
      case "error":
        msg.textContent = a.reason;
    }
  }

  // ------------------------------------------------------------------ recuperación

  private async restore(): Promise<void> {
    const pass = $<HTMLInputElement>("restore-pass").value;
    const fileInput = $<HTMLInputElement>("restore-file");
    let file: RecoveryFile;
    if (fileInput.files?.[0]) file = JSON.parse(await fileInput.files[0].text()) as RecoveryFile;
    else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) throw new Error(t(this.lang, "no_saved"));
      file = JSON.parse(saved) as RecoveryFile;
    }
    this.state = await decryptRecovery<SwapState>(file, pass);
    this.net = NETWORKS[this.state.network] ?? this.net;
    document.body.dataset.net = this.net.testnet ? "test" : "real";
    this.passphrase = pass;
    if (this.state.escrow) {
      this.show("step-progress");
      this.loop();
    } else if (this.state.recovery_saved) this.show("step-deposit");
    else this.show("step-recovery");
  }

  // ------------------------------------------------------------------ utilidades

  /** Copia cifrada en el navegador (misma contraseña que el archivo). Nunca en claro. */
  private async persist(): Promise<void> {
    if (!this.state || !this.passphrase) return;
    const f = await encryptRecovery(this.state, this.passphrase, { network: this.state.network, escrow: this.state.escrow });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  }

  private finished(): boolean {
    return !!this.state && (!!this.state.sweep_txids || this.pending?.kind === "done_refunded");
  }

  private need(): SwapState {
    if (!this.state) throw new Error("no hay un swap en curso");
    return this.state;
  }

  /** Ejecuta una acción del usuario: una a la vez, con su botón en estado de carga. */
  private async guard(fn: () => Promise<unknown>, el?: Element | null, label: Key = "loading"): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    $("banner").hidden = true;
    document.body.classList.add("busy");
    const stop = startLoading(el, t(this.lang, label));
    try {
      await fn();
    } catch (e) {
      this.banner((e as Error).message, "danger");
    } finally {
      stop();
      this.busy = false;
      document.body.classList.remove("busy");
    }
  }

  private show(id: string): void {
    for (const el of document.querySelectorAll<HTMLElement>("[data-step]")) el.hidden = el.id !== id;
    if (id !== "step-restore") setStage(id as Stage);
    $(id).scrollIntoView({ block: "start", behavior: "smooth" });
  }

  private stopAttention: (() => void) | null = null;

  /** Resalta la acción y avisa (título + pitido) cuando el swap espera un clic del usuario. */
  private needsUser(on: boolean): void {
    $("step-progress").classList.toggle("attention", on);
    if (on && !this.stopAttention) this.stopAttention = attention(t(this.lang, "action_needed"));
    if (!on && this.stopAttention) {
      this.stopAttention();
      this.stopAttention = null;
    }
  }

  private makeEvm(net: ConstructorParameters<typeof Evm>[0]): Evm {
    const evm = new Evm(net);
    evm.onStep = (st) => this.walletStep(st);
    return evm;
  }

  private stepTimer: ReturnType<typeof setInterval> | null = null;

  /** Aviso "Paso n de total" con contador mientras MetaMask pide una firma o confirma una tx. */
  private walletStep(st: WalletStep | null): void {
    const el = $("wallet-step");
    if (this.stepTimer) clearInterval(this.stepTimer);
    this.stepTimer = null;
    if (!st) {
      el.hidden = true;
      return;
    }
    const start = Date.now();
    const what = t(this.lang, `step_${st.what}` as Key);
    const render = () => {
      const sec = Math.floor((Date.now() - start) / 1000);
      const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      const head = t(this.lang, "step_of", { n: st.n, total: st.total, what });
      const body = st.kind === "mining" ? t(this.lang, "step_mining") : t(this.lang, st.kind === "sign" ? "step_sign" : "step_send");
      const more = st.n < st.total && st.kind !== "mining" ? ` ${t(this.lang, "step_more")}` : "";
      el.textContent = `${head} — ${body}${more} (${clock})`;
    };
    render();
    el.hidden = false;
    this.stepTimer = setInterval(render, 1000);
  }

  private status(text: string): void {
    $("status").textContent = text;
  }

  private banner(text: string, kind: "warn" | "danger"): void {
    const b = $("banner");
    b.textContent = text;
    b.dataset.kind = kind;
    b.hidden = false;
  }
}
