/**
 * App del swap (lado del taker). Corre solo en /es/app/ y /en/app/.
 * Orden obligatorio: llaves → respuesta del maker verificada → ARCHIVO DE RECUPERACIÓN →
 * depósito → seguimiento automático (verificar XMR, setReady o reembolso, barrido).
 */
import type { Address, Hex } from "viem";
import { api, type MakerReply, type Offer } from "./api";
import { DRAFT_UI, isDeployed, NETWORKS, POLICY, selectedNetwork, validXmrAddress, type EvmNetwork } from "./config";
import { availableRange, quotesFor } from "./quick";
import type { TrocadorQuote, TrocadorRates, TrocadorTrade } from "./api";
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
    // La vista simple se conecta antes de cargar ofertas: un clic temprano no debe recargar la página.
    if (DRAFT_UI) this.mountQuick();
    await this.loadOffers();
    this.applyDeepLink();
  }

  /** Ofertas vigentes (las usa la vista simple). */
  private offers: Offer[] = [];

  // ------------------------------------------------------------------ vista simple (borrador)

  private mountQuick(): void {
    const input = $<HTMLInputElement>("quick-usdt");
    const pre = new URLSearchParams(location.search).get("usdt");
    if (pre) input.value = pre;
    $("form-quick").addEventListener("submit", (e) => {
      e.preventDefault();
      void this.guard(() => this.quickSearch(), (e as SubmitEvent).submitter, "loading_offers");
    });
    $("form-troc").addEventListener("submit", (e) => {
      e.preventDefault();
      void this.guard(() => this.trocCreate(), (e as SubmitEvent).submitter);
    });
    $("troc-copy").addEventListener("click", () => void navigator.clipboard?.writeText($("troc-addr").textContent ?? ""));
  }

  // ------------------------------------------------------------------ Trocador (API)

  private trocRates: TrocadorRates | null = null;
  private trocPick: TrocadorQuote | null = null;
  private trocTimer: ReturnType<typeof setInterval> | null = null;

  /** Muestra las cotizaciones de Trocador en la lista. Devuelve false si no hay (se usa el widget). */
  private async trocadorList(raw: string, why: string): Promise<boolean> {
    let rates: TrocadorRates;
    try {
      rates = await api.trocadorRates(raw);
    } catch {
      return false; // API apagada o caída: queda el widget
    }
    if (!rates.quotes.length) return false;
    this.trocRates = rates;
    $("quick-why").textContent = why;
    $("quick-why").hidden = false;
    $("quick-troc-note").hidden = false;
    $("quick-title").textContent = t(this.lang, "troc_title", { n: rates.quotes.length, usdt: raw });
    $("quick-list").replaceChildren(
      ...rates.quotes.map((q, i) => {
        const li = document.createElement("li");
        li.className = i === 0 ? "quick-item best" : "quick-item";
        const left = document.createElement("div");
        const amount = document.createElement("p");
        amount.className = "quick-amount";
        amount.textContent = `${t(this.lang, "quick_you_get")} ${Number(q.amount_to).toFixed(6)} XMR`;
        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = t(this.lang, "troc_meta", { provider: q.provider, kyc: q.kycrating, kind: t(this.lang, q.fixed ? "troc_fixed" : "troc_float") });
        left.append(amount, meta);
        if (i === 0) {
          const tag = document.createElement("span");
          tag.className = "pill best-pill";
          tag.textContent = t(this.lang, "quick_best");
          left.prepend(tag);
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = i === 0 ? "btn" : "btn secondary";
        btn.textContent = t(this.lang, "quick_choose");
        btn.addEventListener("click", () => this.trocChoose(q));
        li.append(left, btn);
        return li;
      }),
    );
    $("quick-results").hidden = false;
    $("quick-results").scrollIntoView({ block: "start", behavior: "smooth" });
    return true;
  }

  private trocChoose(q: TrocadorQuote): void {
    const rates = this.trocRates;
    if (!rates || Date.now() - rates.created_at > 10 * 60_000) {
      this.banner(t(this.lang, "troc_expired"), "warn");
      return;
    }
    this.trocPick = q;
    $("troc-chosen").textContent = t(this.lang, "troc_chosen", {
      provider: q.provider,
      usdt: rates.usdt,
      xmr: Number(q.amount_to).toFixed(6),
      kind: t(this.lang, q.fixed ? "troc_fixed" : "troc_float"),
    });
    $("quick-results").hidden = true;
    $("form-troc").hidden = false;
    $("troc-deposit").hidden = true;
    $("quick-troc-pay").hidden = false;
    $("quick-troc-pay").scrollIntoView({ block: "start", behavior: "smooth" });
    $<HTMLInputElement>("troc-address").focus();
  }

  /** Crea el intercambio (una petición a Trocador) y muestra a dónde depositar. */
  private async trocCreate(): Promise<void> {
    const rates = this.trocRates;
    const q = this.trocPick;
    if (!rates || !q || Date.now() - rates.created_at > 10 * 60_000) throw new Error(t(this.lang, "troc_expired"));
    const address = $<HTMLInputElement>("troc-address").value.trim();
    const refund = $<HTMLInputElement>("troc-refund").value.trim();
    if (!validXmrAddress(address, this.net.monero)) throw new Error(t(this.lang, "bad_address_main"));
    if (refund && !/^0x[0-9a-fA-F]{40}$/.test(refund)) throw new Error(t(this.lang, "troc_bad_refund"));
    const trade = await api.trocadorCreate({ rate_id: rates.rate_id, provider: q.provider, fixed: q.fixed, usdt: rates.usdt, address, ...(refund ? { refund } : {}) });
    this.trocRates = null; // la cotización ya se usó
    $("form-troc").hidden = true;
    $("troc-amount").textContent = trade.amount_from || rates.usdt;
    $("troc-addr").textContent = trade.address_provider;
    $("troc-provider").textContent = trade.provider;
    $("troc-id").textContent = trade.trade_id;
    $("troc-deposit").hidden = false;
    this.trocStatus(trade);
    // Nuestro servidor guarda el estado que manda el webhook de Trocador: consultarlo no les cuesta peticiones.
    if (this.trocTimer) clearInterval(this.trocTimer);
    this.trocTimer = setInterval(() => {
      api.trocadorTrade(trade.trade_id).then((tr) => this.trocStatus(tr), () => {});
    }, 60_000);
  }

  private trocStatus(trade: TrocadorTrade): void {
    const s = (trade.status || "new").toLowerCase();
    const key = `troc_status_${s}`;
    const label = t(this.lang, key as Key);
    $("troc-status").textContent = label && label !== key ? label : trade.status;
    if (["finished", "failed", "refunded", "expired", "halted"].includes(s) && this.trocTimer) {
      clearInterval(this.trocTimer);
      this.trocTimer = null;
    }
  }

  /** «Intercambiar»: cotizaciones de todos los makers para el monto, o Trocador si no hay. */
  private async quickSearch(): Promise<void> {
    const raw = $<HTMLInputElement>("quick-usdt").value.trim().replace(",", ".");
    const usdt = Number(raw);
    if (!/^\d+(\.\d{1,6})?$/.test(raw) || !(usdt > 0)) throw new Error(t(this.lang, "quick_bad"));
    await this.loadOffers(); // ofertas frescas en cada búsqueda
    $("banner").hidden = true;
    const results = $("quick-results");
    const list = $("quick-list");
    const troc = $("quick-trocador");
    results.hidden = true;
    troc.hidden = true;
    $("quick-troc-pay").hidden = true;
    $("quick-why").hidden = true;
    $("quick-troc-note").hidden = true;
    const cap = this.net.maxUsdt;
    const rows = cap && usdt > cap ? [] : quotesFor(this.offers, usdt);
    if (!rows.length) {
      const range = availableRange(this.offers);
      // Modo práctica: sin Trocador (solo opera con dinero real).
      if (this.net.testnet) {
        this.banner(t(this.lang, "quick_none_test", { usdt: raw, range: range ? t(this.lang, "quick_range", { min: range.min, max: range.max }) : "" }), "warn");
        return;
      }
      const why =
        cap && usdt > cap
          ? t(this.lang, "quick_over", { usdt: raw })
          : t(this.lang, "quick_none", { usdt: raw, range: range ? t(this.lang, "quick_range", { min: range.min, max: range.max }) : "" });
      // Solo se consulta a Trocador cuando ningún maker cubre el monto (lo acordado con ellos).
      if (await this.trocadorList(raw, why)) return;
      $("quick-trocador-why").textContent = why;
      // El widget llega con USDT (Arbitrum) → XMR y el monto ya puestos.
      const frame = $<HTMLIFrameElement>("trocador-frame");
      const url = new URL(frame.dataset.src ?? "https://trocador.app/widget/");
      url.searchParams.set("amount_from", raw);
      if (frame.src !== url.href) frame.src = url.href;
      troc.hidden = false;
      troc.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    $("quick-title").textContent =
      rows.length === 1 ? t(this.lang, "quick_title_one", { usdt: raw }) : t(this.lang, "quick_title", { n: rows.length, usdt: raw });
    list.replaceChildren(
      ...rows.map((r, i) => {
        const li = document.createElement("li");
        li.className = i === 0 ? "quick-item best" : "quick-item";
        const left = document.createElement("div");
        const amount = document.createElement("p");
        amount.className = "quick-amount";
        amount.textContent = `${t(this.lang, "quick_you_get")} ${r.xmr.toFixed(6)} XMR`;
        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = t(this.lang, "quick_maker", {
          who: `${r.offer.maker.slice(0, 6)}…${r.offer.maker.slice(-4)}`,
          price: Number(r.offer.price).toFixed(2),
          min: r.offer.min_usdt,
          max: r.offer.max_usdt,
        });
        left.append(amount, meta);
        if (i === 0) {
          const tag = document.createElement("span");
          tag.className = "pill best-pill";
          tag.textContent = t(this.lang, "quick_best");
          left.prepend(tag);
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = i === 0 ? "btn" : "btn secondary";
        btn.textContent = t(this.lang, "quick_choose");
        btn.addEventListener("click", () => this.quickChoose(r.offer.id, raw));
        li.append(left, btn);
        return li;
      }),
    );
    results.hidden = false;
    results.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /** Elegir una cotización: pasa al formulario de siempre con la oferta y el monto puestos. */
  private quickChoose(offerId: string, usdt: string): void {
    $<HTMLSelectElement>("offer").value = offerId;
    $<HTMLInputElement>("usdt").value = usdt;
    $("step-quick").hidden = true;
    document.body.classList.add("chosen");
    this.show("step-start");
    $<HTMLInputElement>("destination").focus();
  }

  /** De dónde llegó el usuario (p. ej. un agregador): ?ref=… en el enlace. */
  private ref: string | undefined;

  /**
   * Enlace profundo para agregadores: /app/?usdt=50&to=<dirección XMR>&offer=<id>&ref=<origen>.
   * Solo llena el formulario: el usuario sigue revisando, descargando su respaldo y firmando.
   */
  private applyDeepLink(): void {
    const sp = new URLSearchParams(location.search);
    const usdt = sp.get("usdt");
    const to = sp.get("to");
    const offer = sp.get("offer");
    const ref = sp.get("ref");
    if (usdt && /^\d+(\.\d{1,6})?$/.test(usdt)) $<HTMLInputElement>("usdt").value = usdt;
    if (to && validXmrAddress(to, this.net.monero)) $<HTMLInputElement>("destination").value = to;
    const sel = $<HTMLSelectElement>("offer");
    if (offer && [...sel.options].some((o) => o.value === offer)) sel.value = offer;
    if (ref && /^[a-zA-Z0-9_-]{1,32}$/.test(ref)) this.ref = ref;
    if (usdt || to) $<HTMLInputElement>("passphrase").focus();
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
      this.offers = offers;
      if (offers.some((o) => o.id === keep)) sel.value = keep;
      if (!offers.length) {
        sel.append(new Option(t(this.lang, "no_offers"), ""));
        // En la vista simple no se avisa al cargar: al buscar, si no hay makers, se muestran otras opciones.
        if (!DRAFT_UI || document.body.classList.contains("chosen")) this.banner(t(this.lang, "no_offers"), "warn");
        $("trocador-alt").hidden = false;
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
    if (net.maxUsdt && Number(usdt) > net.maxUsdt) {
      $("trocador-alt").hidden = false;
      throw new Error(t(this.lang, "over_cap", { max: net.maxUsdt }));
    }
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
    const r = await api.createSwap(offer.id, usdt, keys.message, this.ref);
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
    const progress = $<HTMLProgressElement>("xmr-progress");
    progress.hidden = true;
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
      case "wait_xmr": {
        // Que quede claro: el XMR está BLOQUEADO (no en la wallet) y hay que confirmar al llegar a 10/10.
        const chk = this.state?.xmr_check;
        const expected = BigInt(this.state?.reply?.xmr_atomic ?? 0);
        const n = Math.min(10, chk?.confirmations ?? 0);
        const text = !this.state?.xmr_lock
          ? t(this.lang, "lock_waiting")
          : chk && BigInt(chk.received) < expected
            ? t(this.lang, "lock_short")
            : t(this.lang, "lock_confirming", { n, min: (10 - n) * 2 });
        msg.textContent = `${text} ${t(this.lang, "refund_deadline", { m: mins(a.deadline) })}`;
        progress.hidden = !this.state?.xmr_lock;
        progress.value = n;
        break;
      }
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
    document.body.classList.add("chosen");
    if (DRAFT_UI) $("step-quick").hidden = true;
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
      const body =
        st.kind === "mining" ? t(this.lang, "step_mining")
        : st.kind === "connect" ? t(this.lang, "step_connect_body")
        : st.kind === "network" ? t(this.lang, "step_network_body", { net: this.net.name })
        : t(this.lang, st.kind === "sign" ? "step_sign" : "step_send");
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
