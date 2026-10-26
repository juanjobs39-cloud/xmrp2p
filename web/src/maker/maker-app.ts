/**
 * Maker en el navegador (/es/maker/ y /en/maker/). La pestaña hace de servidor mientras está abierta:
 * publica la oferta, responde swaps, bloquea el XMR, cobra el USDT y, si el taker reembolsa,
 * recupera el XMR. Sin custodia: la semilla y las llaves se generan y se quedan en este navegador.
 * Las decisiones las toma `engine.ts` (funciones puras con pruebas); aquí solo se ejecutan.
 */
import { formatEther, getAddress, isAddress, parseEther, toHex, type Address, type Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { API_URL, isDeployed, selectedNetwork, validXmrAddress, type EvmNetwork } from "../app/config";
import { cryptoLib, xmrLib, type MakerWalletInfo } from "../app/libs";
import type { RecoveryFile } from "../app/recovery";
import { startLoading } from "../app/ui";
import { MakerChannel, type TakeRequest } from "./channel";
import { ACTIVE, DEFAULT_CONFIG, nextStep, offerable, PICONERO, quote, rejectTake, type MakerConfig, type MakerSwap, type PublicMessage, type Step } from "./engine";
import { hasVault, keys, kv, openVault, saveVault, wipe, type Vault } from "./store";
import { T, type Lang, type MKey } from "./texts";

const TICK_MS = 20_000;
const OFFER_TTL = 150;
const GAS_TOPUP = "0.002";
const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;

type Eip1193 = { request(a: { method: string; params?: unknown[] }): Promise<unknown> };

export class MakerApp {
  private vault: Vault | null = null;
  private pass = "";
  private cfg: MakerConfig = DEFAULT_CONFIG;
  private chain: import("./chain").MakerChain | null = null;
  private channel: MakerChannel | null = null;
  private wallet: MakerWalletInfo | null = null;
  private price: number | null = null;
  private priceAt = 0;
  private chainNow: { time: number; block: number; at: number } | null = null;
  private gas: bigint | null = null;
  private offering = false;
  private offerAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private ticking = false;
  private releaseLock: (() => void) | null = null;
  private wakeLock: { release(): Promise<void> } | null = null;
  private backupDone = false;
  private takeQueue: Promise<unknown> = Promise.resolve();
  /** Depósitos de XMR que aún no tienen 10 confirmaciones. */
  private incoming: { txid: string; amount: string; confirmations: number; inPool: boolean }[] = [];
  private log: string[] = [];
  /** Red elegida en la página (?red=real para dinero real). Cada red tiene su propia bóveda. */
  private net: EvmNetwork = selectedNetwork();

  constructor(private lang: Lang) {}

  private t(k: MKey, vars: Record<string, string | number> = {}): string {
    return T[this.lang][k].replace(/\{(\w+)\}/g, (_, x: string) => String(vars[x] ?? ""));
  }

  // ------------------------------------------------------------------ arranque

  async mount(): Promise<void> {
    const net = this.net;
    document.body.dataset.net = net.testnet ? "test" : "real";
    if (!isDeployed(net) || !API_URL) this.banner(this.t("not_ready"), "warn");
    // Un solo maker por navegador: dos pestañas podrían enviar el mismo XMR dos veces.
    const got = await this.singleTab();
    if (!got) {
      this.banner(this.t("other_tab"), "danger");
      for (const el of document.querySelectorAll<HTMLElement>("[data-mk]")) el.hidden = true;
      return;
    }
    $<HTMLInputElement>("mk-node").value = net.monero.defaultNode;
    this.bind();
    window.addEventListener("beforeunload", (e) => {
      if (this.offering || this.vault?.swaps.some((s) => ACTIVE.has(s.state))) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.offering) void this.keepAwake();
    });
    this.show((await hasVault(net.id)) ? "mk-unlock" : "mk-setup");
  }

  private async singleTab(): Promise<boolean> {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (!locks) return true;
    return new Promise((res) => {
      void locks.request(`monerop2p-maker:${this.net.id}`, { ifAvailable: true }, (lock) => {
        if (!lock) {
          res(false);
          return;
        }
        res(true);
        return new Promise<void>((release) => (this.releaseLock = release));
      });
    });
  }

  private bind(): void {
    const on = (id: string, ev: string, fn: () => Promise<unknown>, label: MKey = "loading") =>
      $(id).addEventListener(ev, (e) => {
        e.preventDefault();
        const el = ev === "submit" ? (e as SubmitEvent).submitter : (e.currentTarget as Element);
        void this.guard(fn, el, label);
      });
    on("mk-form-setup", "submit", () => this.setup(), "creating");
    on("mk-form-unlock", "submit", () => this.unlock(), "opening");
    on("mk-btn-backup", "click", () => this.downloadBackup());
    on("mk-btn-continue", "click", async () => this.enterPanel());
    on("mk-btn-toggle", "click", () => this.toggleOffering());
    on("mk-btn-gas", "click", () => this.topUpGas(), "wallet_wait");
    on("mk-btn-payout-mm", "click", () => this.fillPayout(), "wallet_wait");
    on("mk-btn-backup2", "click", () => this.downloadBackup());
    on("mk-form-settings", "submit", () => this.saveSettings());
    on("mk-btn-withdraw-xmr", "click", () => this.withdrawXmr());
    on("mk-btn-withdraw-gas", "click", () => this.withdrawGas());
    on("mk-btn-wipe", "click", () => this.wipeMaker());
    on("mk-btn-copy-hot", "click", async () => {
      await navigator.clipboard.writeText(this.chain?.address ?? "");
      this.status(this.t("copied"));
    });
    on("mk-btn-copy", "click", async () => {
      await navigator.clipboard.writeText(this.wallet?.address ?? "");
      this.status(this.t("copied"));
    });
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="mk-mode"]')) {
      r.addEventListener("change", () => ($("mk-import").hidden = r.value !== "import" || !r.checked));
    }
  }

  private async guard(fn: () => Promise<unknown>, el?: Element | null, label: MKey = "loading"): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    $("mk-banner").hidden = true;
    const stop = startLoading(el, this.t(label));
    try {
      await fn();
    } catch (e) {
      this.banner((e as Error).message, "danger");
    } finally {
      stop();
      this.busy = false;
    }
  }

  // ------------------------------------------------------------------ crear / abrir

  private async setup(): Promise<void> {
    const pass = $<HTMLInputElement>("mk-pass").value;
    const pass2 = $<HTMLInputElement>("mk-pass2").value;
    const node = $<HTMLInputElement>("mk-node").value.trim();
    const payout = $<HTMLInputElement>("mk-payout").value.trim();
    const mode = document.querySelector<HTMLInputElement>('input[name="mk-mode"]:checked')?.value ?? "new";
    const seed = $<HTMLTextAreaElement>("mk-seed").value.trim().replace(/\s+/g, " ");
    const height = Number($<HTMLInputElement>("mk-height").value || "0");
    if (pass.length < 10) throw new Error(this.t("short_pass"));
    if (pass !== pass2) throw new Error(this.t("pass_mismatch"));
    if (!isAddress(payout)) throw new Error(this.t("bad_payout"));
    if (mode === "import" && seed.split(" ").length !== 25) throw new Error(this.t("bad_seed"));
    if (!node) throw new Error(this.t("need_node"));

    this.status(this.t("creating_wallet"));
    const xmr = await xmrLib();
    const info = await xmr.makerOpen({ node, network: this.net.monero.network, password: pass, seed: mode === "import" ? seed : undefined, restoreHeight: mode === "import" ? height : undefined });
    this.vault = {
      v: 1,
      kind: "maker",
      created_at: Date.now(),
      network: this.net.id,
      evm_key: generatePrivateKey(),
      seed: info.seed,
      restore_height: mode === "import" ? height : info.restoreHeight,
      payout: getAddress(payout),
      node,
      config: { ...this.capped(DEFAULT_CONFIG), maxExposure: DEFAULT_CONFIG.maxExposure.toString() },
      swaps: [],
    };
    this.pass = pass;
    this.wallet = info;
    await this.persist();
    await this.persistWallet();
    this.status("");
    this.show("mk-backup");
  }

  private async unlock(): Promise<void> {
    const pass = $<HTMLInputElement>("mk-unlock-pass").value;
    const fileInput = $<HTMLInputElement>("mk-unlock-file");
    const file = fileInput.files?.[0] ? (JSON.parse(await fileInput.files[0].text()) as RecoveryFile) : undefined;
    this.vault = await openVault(this.net.id, pass, file);
    this.pass = pass;
    if (file) await this.persist();
    this.status(this.t("opening_wallet"));
    this.walletSavedAt = 0;
    const xmr = await xmrLib();
    const v = this.vault;
    const fromSeed = () =>
      xmr.makerOpen({ node: v.node, network: this.net.monero.network, password: pass, seed: v.seed, restoreHeight: v.restore_height });
    // Datos guardados en este navegador (sincronización rápida). Se usan SOLO si son de la wallet del respaldo.
    const data = await kv.get<{ keysData: Uint8Array; cacheData: Uint8Array }>(keys(this.net.id).wallet);
    let info: Awaited<ReturnType<typeof fromSeed>> | null = null;
    if (data) {
      try {
        info = await xmr.makerOpen({ node: v.node, network: this.net.monero.network, password: pass, ...data });
      } catch {
        info = null; // ilegibles o de otra versión
      }
    }
    if (info && info.seed !== v.seed) {
      // Wallet creada por error al importar un respaldo: se guarda en el respaldo para no perder su XMR.
      const k = await xmr.makerKeys();
      v.orphans = [...(v.orphans ?? []).filter((o) => o.address !== k.address), { ...k, found_at: Date.now() }];
      await this.persist();
      this.banner(this.t("orphan_found", { addr: k.address }), "warn");
      info = null;
    }
    // Siempre la wallet de la semilla del respaldo (antes, subir el archivo creaba una wallet nueva).
    this.wallet = info ?? (await fromSeed());
    if (!info) await kv.del(keys(this.net.id).wallet); // se vuelven a guardar los datos de la wallet correcta
    this.backupDone = true;
    this.status("");
    await this.enterPanel();
  }

  private async downloadBackup(): Promise<void> {
    const file = await saveVault(this.need(), this.pass);
    const blob = new Blob([JSON.stringify(file, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `monerop2p-maker-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.backupDone = true;
    $<HTMLButtonElement>("mk-btn-continue").disabled = false;
    this.status(this.t("backup_saved"));
  }

  private async enterPanel(): Promise<void> {
    if (!this.backupDone) throw new Error(this.t("backup_first"));
    const v = this.need();
    this.cfg = this.capped({ ...v.config, maxExposure: BigInt(v.config.maxExposure) });
    const { MakerChain } = await import("./chain");
    this.chain = new MakerChain(this.net, v.evm_key);
    this.channel = new MakerChannel(API_URL, this.chain.account, this.net.id);
    // Las solicitudes se atienden de una en una: si llegan dos juntas, la segunda ve a la primera.
    this.channel.onTake = (m) => {
      const run = this.takeQueue.then(() => this.onTake(m));
      this.takeQueue = run.catch(() => undefined);
      return run;
    };
    this.channel.onExpired = (id) => void this.onExpired(id);
    this.channel.onState = (online, detail) => this.renderOnline(online, detail);
    $<HTMLInputElement>("mk-margin").value = String(this.cfg.marginBps / 100);
    $<HTMLInputElement>("mk-min").value = String(this.cfg.minUsdt);
    $<HTMLInputElement>("mk-max").value = String(this.cfg.maxUsdt);
    $("mk-payout-show").textContent = v.payout;
    $("mk-hot").textContent = this.chain.address;
    this.show("mk-panel");
    this.note(this.t("log_opened"));
    this.render();
    this.loop();
  }

  // ------------------------------------------------------------------ bucle

  private loop(): void {
    if (this.timer) clearTimeout(this.timer);
    const run = async () => {
      try {
        await this.tick();
      } catch (e) {
        this.status(`${this.t("retrying")}: ${(e as Error).message}`);
      }
      this.timer = setTimeout(run, TICK_MS);
    };
    void run();
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // Primero lo rápido (cadena, gas y precio) para que el panel se llene enseguida; luego la wallet.
      const c = this.chain!;
      const [now, gas] = await Promise.all([c.now(), c.gas(), Date.now() - this.priceAt > 60_000 ? this.refreshPrice() : null]);
      this.chainNow = { ...now, at: Date.now() };
      this.gas = gas;
      this.render();
      const xmr = await xmrLib();
      this.status(this.t("syncing"));
      this.wallet = await xmr.makerSync((pct) => this.status(`${this.t("syncing")} ${Math.round(pct * 100)} %`));
      this.status("");
      try {
        this.incoming = await xmr.makerIncoming();
      } catch {
        this.incoming = [];
      }
      for (const s of this.need().swaps.filter((x) => ACTIVE.has(x.state))) {
        try {
          await this.advance(s, now.time);
        } catch (e) {
          s.note = (e as Error).message;
          this.note(`${s.id.slice(0, 8)}: ${s.note}`);
        }
      }
      await this.retryNotifications();
      if (this.offering && Date.now() - this.offerAt > 60_000) await this.refreshOffer();
      await this.persistWallet();
      this.render();
    } finally {
      this.ticking = false;
    }
  }

  private async refreshPrice(): Promise<void> {
    try {
      const r = (await (await fetch(`${API_URL}/v1/price`)).json()) as { price?: number; error?: string };
      if (!r.price) throw new Error(r.error ?? "sin precio");
      this.price = r.price;
      this.priceAt = Date.now();
    } catch (e) {
      this.price = null;
      this.priceAt = Date.now() - 30_000; // reintentar en ~30 s
      this.note(`${this.t("no_price")}: ${(e as Error).message}`);
    }
  }

  /** Aplica un paso del motor a un swap. Guarda el estado ANTES de cada acción irreversible. */
  private async advance(s: MakerSwap, now: number): Promise<void> {
    const c = this.chain!;
    const obs: Parameters<typeof nextStep>[1] = { now };
    if (s.state === "NEGOTIATED") {
      obs.escrow = await c.findDeposit(s.maker_commitment, s.taker_commitment, s.from_block);
      if (obs.escrow) obs.info = await c.escrowInfo(obs.escrow);
    } else if ((s.state === "XMR_LOCKED" || s.state === "CLAIMING") && s.escrow) {
      obs.revealed = await c.revealed(s.escrow, s.from_block);
      if (!obs.revealed) obs.info = await c.escrowInfo(s.escrow);
      if (s.xmr_txid) obs.confirmations = (await (await xmrLib()).makerConfirmations(s.xmr_txid)) ?? 0;
    }
    const step = nextStep(s, obs, c.address, this.cfg.safety);
    await this.apply(s, step);
  }

  private async apply(s: MakerSwap, step: Step): Promise<void> {
    const xmr = await xmrLib();
    switch (step.kind) {
      case "wait":
        s.note = step.reason;
        return;
      case "past_cutoff":
        if (!s.past_cutoff) this.note(`${s.id.slice(0, 8)}: ${this.t("log_cutoff")}`);
        s.past_cutoff = true;
        s.note = this.t("log_cutoff");
        return this.persist();
      case "expire":
        return this.move(s, "EXPIRED", step.reason);
      case "abort":
        if (step.escrow) s.escrow = step.escrow;
        await this.move(s, "ABORTED", step.reason);
        this.notify(s, "aborted", { reason: step.notify });
        return;
      case "lock": {
        if (s.state === "NEGOTIATED") {
          Object.assign(s, { escrow: step.escrow, t0: step.t0, t1: step.t1 });
          await this.move(s, "LOCKING_XMR", this.t("log_deposit_ok"));
        }
        if (!s.xmr_txid) {
          const tx = await xmr.makerPrepare(s.shared_address, s.xmr_atomic);
          Object.assign(s, { xmr_txid: tx.txid, xmr_tx_key: tx.txKey, xmr_meta: tx.metadata });
          await this.persist(); // regla 5: registrar la tx antes de transmitirla
        }
        if (s.xmr_meta) await xmr.makerRelay(s.xmr_meta);
        delete s.xmr_meta;
        await this.move(s, "XMR_LOCKED", this.t("log_locked", { tx: s.xmr_txid!.slice(0, 12) }));
        this.notifyLock(s);
        return;
      }
      case "claim": {
        if (this.gas !== null && this.gas < parseEther("0.0001")) throw new Error(this.t("low_gas"));
        if (s.state === "XMR_LOCKED") await this.move(s, "CLAIMING", this.t("log_claiming"));
        const tx = await this.chain!.claim(s.escrow!, s.maker_secret, this.need().payout);
        s.claim_tx = tx;
        await this.move(s, "CLAIMED", this.t("log_claimed"));
        this.notify(s, "claimed", { tx });
        return;
      }
      case "claimed":
        s.claim_tx = step.tx;
        return this.move(s, "CLAIMED", this.t("log_claimed"));
      case "recover": {
        if (step.secret) {
          s.taker_secret = step.secret;
          await this.move(s, "RECOVERING_XMR", this.t("log_refunded"));
        }
        const c = await cryptoLib();
        const w = JSON.parse(c.recoverWallet(s.maker_spend, JSON.stringify(s.taker_message), s.taker_secret!, this.net.monero.network)) as {
          address: string; private_view_key: string; private_spend_key: string;
        };
        if (w.address !== s.shared_address) throw new Error("la llave reconstruida no corresponde a la dirección compartida");
        const r = await xmr.sweep({
          node: this.need().node, network: this.net.monero.network, address: w.address, viewKey: w.private_view_key, spendKey: w.private_spend_key,
          restoreHeight: s.xmr_restore_height, destination: this.wallet!.address,
        });
        s.sweep_tx = r.txids.join(",");
        return this.move(s, "RECOVERED", this.t("log_recovered"));
      }
    }
  }

  private async move(s: MakerSwap, to: MakerSwap["state"], note: string): Promise<void> {
    s.state = to;
    s.note = note;
    this.note(`${s.id.slice(0, 8)}: ${note}`);
    await this.persist();
    this.render();
  }

  private notify(s: MakerSwap, event: string, data: unknown): boolean {
    return !!s.room_id && !!this.channel?.sendEvent(s.room_id, event, data);
  }

  private notifyLock(s: MakerSwap): void {
    const ok = this.notify(s, "xmr_locked", { txid: s.xmr_txid, tx_key: s.xmr_tx_key, xmr_atomic: Number(s.xmr_atomic), shared_address: s.shared_address });
    s.lock_sent = ok;
  }

  /** Si el aviso de XMR bloqueado no salió (sin conexión), se reintenta en cada ciclo. */
  private async retryNotifications(): Promise<void> {
    for (const s of this.need().swaps) {
      if ((s.state === "XMR_LOCKED" || s.state === "CLAIMING") && s.lock_sent === false) {
        this.notifyLock(s);
        if (s.lock_sent) await this.persist();
      }
    }
  }

  // ------------------------------------------------------------------ ofertas y solicitudes

  private async toggleOffering(): Promise<void> {
    if (this.offering) {
      this.offering = false;
      await this.channel!.withdrawOffer();
      this.channel!.stop();
      await this.wakeLock?.release().catch(() => undefined);
      this.wakeLock = null;
      this.note(this.t("log_paused"));
    } else {
      if (!this.price) await this.refreshPrice();
      if (!this.price) throw new Error(this.t("no_price"));
      if (offerable(this.need().swaps, BigInt(this.wallet?.unlocked ?? "0"), this.cfg) === 0n) throw new Error(this.t("no_xmr"));
      if (this.gas !== null && this.gas < parseEther("0.0002")) throw new Error(this.t("low_gas"));
      this.offering = true;
      this.channel!.start();
      await this.refreshOffer();
      await this.keepAwake();
      this.note(this.t("log_offering"));
    }
    this.render();
  }

  private async refreshOffer(): Promise<void> {
    if (!this.offering || !this.channel) return;
    const max = offerable(this.need().swaps, BigInt(this.wallet?.unlocked ?? "0"), this.cfg);
    this.offerAt = Date.now();
    if (!this.price || max === 0n) {
      await this.channel.withdrawOffer();
      return;
    }
    const price = (this.price * (10_000 + this.cfg.marginBps)) / 10_000;
    const maxXmr = Number(max) / 1e12;
    const maxUsdt = Math.min(this.cfg.maxUsdt, Math.floor(maxXmr * price * 0.99));
    if (maxUsdt < this.cfg.minUsdt) {
      await this.channel.withdrawOffer();
      return;
    }
    await this.channel.publishOffer({ price: price.toFixed(6), min_usdt: String(this.cfg.minUsdt), max_usdt: String(maxUsdt), max_xmr: maxXmr.toFixed(6), ttl: OFFER_TTL });
  }

  /** El backend dejó de esperar: el taker no recibió nuestras llaves y no puede depositar. Se descarta. */
  private async onExpired(requestId: string): Promise<void> {
    const s = this.vault?.swaps.find((x) => x.request_id === requestId && x.state === "NEGOTIATED" && !x.escrow);
    if (!s) return;
    await this.move(s, "EXPIRED", this.t("log_take_expired"));
    void this.refreshOffer();
  }

  /** Un taker pide un swap: se valida, se guarda y se responde (todo antes de 45 s). */
  private async onTake(m: TakeRequest): Promise<unknown> {
    const started = Date.now();
    if (!this.offering) throw new Error("el maker está en pausa");
    if (m.network !== this.net.id) throw new Error("red no soportada por este maker");
    if (!this.price) throw new Error("el maker no tiene precio de referencia");
    const v = this.need();
    const q = quote(String(m.usdt), this.price, this.cfg);
    const reject = rejectTake(v.swaps, q, BigInt(this.wallet?.unlocked ?? "0"), this.cfg);
    if (reject) throw new Error(reject);
    const c = await cryptoLib();
    const takerJson = JSON.stringify(m.taker_message);
    let takerCommitment: string;
    try {
      takerCommitment = c.verifyCounterparty(takerJson);
    } catch (e) {
      throw new Error(`mensaje del taker inválido: ${(e as Error).message}`);
    }
    const keys = JSON.parse(c.generateKeys()) as { spend_private: string; contract_secret: Hex; message: PublicMessage };
    const shared = JSON.parse(c.sharedAddress(keys.spend_private, takerJson, this.net.monero.network)) as { address: string; private_view_key: string };
    const now = this.chainNow && Date.now() - this.chainNow.at < 60_000 ? this.chainNow : { ...(await this.chain!.now()), at: Date.now() };
    const elapsed = Math.floor((Date.now() - now.at) / 1000);
    const s: MakerSwap = {
      id: crypto.randomUUID().replace(/-/g, ""),
      state: "NEGOTIATED",
      created_at: Date.now(),
      room_id: m.room_id,
      request_id: m.request_id,
      usdt_atomic: q.usdtAtomic.toString(),
      xmr_atomic: q.xmrAtomic.toString(),
      price: q.price.toFixed(6),
      taker_message: m.taker_message as unknown as PublicMessage,
      taker_commitment: takerCommitment,
      maker_spend: keys.spend_private,
      maker_secret: keys.contract_secret,
      maker_commitment: keys.message.contract_commitment,
      maker_message: keys.message,
      shared_address: shared.address,
      shared_view_key: shared.private_view_key,
      from_block: Math.max(0, now.block - 5),
      deposit_deadline: now.time + elapsed + this.cfg.safety.depositTimeout,
      xmr_restore_height: this.wallet?.height ?? 0,
      note: this.t("log_waiting_deposit"),
    };
    v.swaps.push(s);
    await this.persist(); // guardar las llaves ANTES de responder
    this.note(this.t("log_take", { usdt: m.usdt, xmr: (Number(q.xmrAtomic) / 1e12).toFixed(6), s: ((Date.now() - started) / 1000).toFixed(1) }));
    this.render();
    void this.refreshOffer();
    return {
      swap_id: s.id,
      maker_message: keys.message,
      claimer: this.chain!.address,
      claim_commitment: keys.message.contract_commitment,
      refund_commitment: takerCommitment,
      usdt_atomic: Number(q.usdtAtomic),
      xmr_atomic: Number(q.xmrAtomic),
      shared_address: shared.address,
      deposit_deadline: s.deposit_deadline,
      min_duration0: this.cfg.safety.minTimeToT0,
      min_duration1: this.cfg.safety.minClaimWindow,
    };
  }

  // ------------------------------------------------------------------ gas, cobro y retiros

  /** Espera a MetaMask con un límite: si la ventana nunca aparece, la página no se queda trabada. */
  private async mm<T>(p: Promise<T>, step: MKey): Promise<T> {
    const box = $("mk-mm");
    const netName = this.net.name.replace(" (testnet)", "");
    box.textContent = this.t(step, { net: netName });
    box.hidden = false;
    console.info("[maker] esperando a MetaMask:", step);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        p,
        new Promise<never>((_, rej) => (timer = setTimeout(() => rej(new Error(this.t("mm_timeout", { addr: this.chain?.address ?? "", net: netName }))), 180_000))),
      ]);
    } finally {
      clearTimeout(timer);
      box.hidden = true;
    }
  }

  /**
   * Proveedor de MetaMask. Con varias extensiones de wallet instaladas, `window.ethereum` puede ser
   * otra; por eso se pide la lista (EIP-6963) y se prefiere MetaMask por su identificador.
   */
  private async provider(): Promise<Eip1193 | null> {
    const found: { info: { rdns: string; name: string }; provider: Eip1193 }[] = [];
    const on = (e: Event) => found.push((e as CustomEvent).detail);
    window.addEventListener("eip6963:announceProvider", on);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    await new Promise((r) => setTimeout(r, 300));
    window.removeEventListener("eip6963:announceProvider", on);
    const mm = found.find((p) => p.info?.rdns === "io.metamask") ?? found[0];
    if (mm) console.info("[maker] wallet:", mm.info?.name, "de", found.map((p) => p.info?.name).join(", "));
    return mm?.provider ?? (globalThis as { ethereum?: Eip1193 }).ethereum ?? null;
  }

  private async metamask(): Promise<{ eth: Eip1193; from: Address }> {
    const eth = await this.provider();
    if (!eth) throw new Error(this.t("no_metamask"));
    const [from] = (await this.mm(eth.request({ method: "eth_requestAccounts" }), "mm_connect")) as Address[];
    const net = this.net;
    const chainId = toHex(net.chainId);
    if ((await eth.request({ method: "eth_chainId" })) !== chainId) {
      try {
        await this.mm(eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] }), "mm_network");
      } catch (e) {
        if ((e as { code?: number }).code !== 4902) throw e;
        await this.mm(
          eth.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId, chainName: net.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [net.rpc], blockExplorerUrls: [net.explorer] }],
          }),
          "mm_network",
        );
      }
    }
    return { eth, from: getAddress(from!) };
  }

  private async fillPayout(): Promise<void> {
    const { from } = await this.metamask();
    $<HTMLInputElement>("mk-payout").value = from;
  }

  private async topUpGas(): Promise<void> {
    const { eth, from } = await this.metamask();
    const value = parseEther(GAS_TOPUP);
    const fees = await this.chain!.topUpParams(from, value);
    console.info("[maker] recarga de gas", { from, to: this.chain!.address, ...fees });
    const tx = (await this.mm(
      eth.request({ method: "eth_sendTransaction", params: [{ from, to: this.chain!.address, value: toHex(value), ...fees }] }),
      "mm_send",
    )) as Hex;
    this.note(this.t("log_gas_sent"));
    this.status(this.t("gas_waiting"));
    await this.chain!.pub.waitForTransactionReceipt({ hash: tx });
    this.gas = await this.chain!.gas();
    this.status("");
    this.render();
  }

  private async withdrawXmr(): Promise<void> {
    if (this.need().swaps.some((s) => ACTIVE.has(s.state))) throw new Error(this.t("busy_swaps"));
    if (this.offering) throw new Error(this.t("pause_first"));
    const to = $<HTMLInputElement>("mk-withdraw-to").value.trim();
    if (!validXmrAddress(to, this.net.monero)) throw new Error(this.t("bad_xmr_address"));
    if (!window.confirm(this.t("confirm_withdraw_xmr"))) return;
    const txids = await (await xmrLib()).makerSweepTo(to);
    this.note(this.t("log_withdrawn", { tx: txids.join(", ").slice(0, 40) }));
  }

  private async withdrawGas(): Promise<void> {
    if (this.need().swaps.some((s) => ACTIVE.has(s.state))) throw new Error(this.t("busy_swaps"));
    const tx = await this.chain!.withdrawGas(this.need().payout);
    this.note(tx ? this.t("log_gas_withdrawn") : this.t("no_gas_to_withdraw"));
  }

  private async saveSettings(): Promise<void> {
    const margin = Number($<HTMLInputElement>("mk-margin").value);
    const min = Number($<HTMLInputElement>("mk-min").value);
    const max = Number($<HTMLInputElement>("mk-max").value);
    if (!(margin >= 0 && margin <= 10) || !(min >= 1) || !(max >= min)) throw new Error(this.t("bad_settings"));
    if (this.net.maxUsdt && max > this.net.maxUsdt) throw new Error(this.t("over_cap", { max: this.net.maxUsdt }));
    this.cfg = { ...this.cfg, marginBps: Math.round(margin * 100), minUsdt: min, maxUsdt: max };
    this.need().config = { ...this.cfg, maxExposure: this.cfg.maxExposure.toString() };
    await this.persist();
    await this.refreshOffer();
    this.note(this.t("log_settings"));
    this.render();
  }

  private async wipeMaker(): Promise<void> {
    if (this.vault?.swaps.some((s) => ACTIVE.has(s.state))) throw new Error(this.t("busy_swaps"));
    if (!window.confirm(this.t("confirm_wipe"))) return;
    await wipe(this.net.id);
    location.reload();
  }

  private async keepAwake(): Promise<void> {
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
      if (wl && !this.wakeLock) this.wakeLock = await wl.request("screen");
    } catch {
      /* el navegador no lo permite: basta el aviso */
    }
  }

  // ------------------------------------------------------------------ guardado

  private need(): Vault {
    if (!this.vault) throw new Error("no hay un maker abierto");
    return this.vault;
  }

  private async persist(): Promise<void> {
    if (this.vault && this.pass) await saveVault(this.vault, this.pass);
  }

  /** En la red real, el máximo por swap nunca supera el tope (el contrato también lo impone). */
  private capped<C extends { maxUsdt: number }>(c: C): C {
    const cap = this.net.maxUsdt;
    return cap && c.maxUsdt > cap ? { ...c, maxUsdt: cap } : c;
  }

  private walletSavedAt = 0;
  private async persistWallet(): Promise<void> {
    if (Date.now() - this.walletSavedAt < 5 * 60_000) return;
    try {
      await kv.put(keys(this.net.id).wallet, await (await xmrLib()).makerData());
      this.walletSavedAt = Date.now();
    } catch {
      /* se reintenta; sin estos datos se resincroniza desde la semilla */
    }
  }

  // ------------------------------------------------------------------ interfaz

  private render(): void {
    const v = this.vault;
    if (!v || !this.wallet) return;
    const xmr = (a: string | bigint) => (Number(a) / 1e12).toFixed(6);
    $("mk-xmr-unlocked").textContent = `${xmr(this.wallet.unlocked)} XMR`;
    $("mk-xmr-total").textContent = this.t("total", { v: xmr(this.wallet.balance) });
    $("mk-incoming").textContent = this.incoming
      .map((d) => this.t(d.inPool ? "incoming_pool" : "incoming", { v: xmr(d.amount), n: d.confirmations, left: Math.max(0, 10 - d.confirmations) * 2 }))
      .join(" · ");
    $("mk-address").textContent = this.wallet.address;
    $("mk-gas").textContent = this.gas === null ? "…" : `${Number(formatEther(this.gas)).toFixed(5)} ETH`;
    $("mk-gas").classList.toggle("low", this.gas !== null && this.gas < parseEther("0.0002"));
    if (this.price) {
      const mine = (this.price * (10_000 + this.cfg.marginBps)) / 10_000;
      $("mk-price").textContent = `${mine.toFixed(2)} USDT/XMR`;
      $("mk-price-ref").textContent = this.t("price_ref", { ref: this.price.toFixed(2), m: (this.cfg.marginBps / 100).toFixed(2) });
    } else if (this.priceAt) {
      // Sin precio confiable no se muestra uno viejo (y la oferta se retira).
      $("mk-price").textContent = "—";
      $("mk-price-ref").textContent = this.t("no_price");
    }
    const can = offerable(v.swaps, BigInt(this.wallet.unlocked), this.cfg);
    $("mk-offerable").textContent = this.t("offerable", { v: xmr(can) });
    const btn = $<HTMLButtonElement>("mk-btn-toggle");
    if (!btn.classList.contains("loading")) btn.textContent = this.t(this.offering ? "btn_pause" : "btn_offer");
    btn.classList.toggle("secondary", this.offering);
    $("mk-state").textContent = this.t(this.offering ? (this.channel?.online ? "state_live" : "state_connecting") : "state_paused");
    $("mk-state").dataset.state = this.offering ? (this.channel?.online ? "live" : "connecting") : "paused";

    const rows = [...v.swaps].sort((a, b) => b.created_at - a.created_at).slice(0, 20);
    const tbody = $("mk-swaps");
    tbody.replaceChildren(
      ...rows.map((s) => {
        const tr = document.createElement("tr");
        const cells = [
          new Date(s.created_at).toLocaleString(this.lang),
          `${(Number(s.usdt_atomic) / 1e6).toFixed(2)} USDT`,
          `${xmr(s.xmr_atomic)} XMR`,
          this.t(`st_${s.state}` as MKey),
          s.note ?? "",
        ];
        for (const [i, c] of cells.entries()) {
          const td = document.createElement("td");
          td.textContent = c;
          if (i === 3) td.dataset.state = s.state;
          tr.append(td);
        }
        return tr;
      }),
    );
    $("mk-empty").hidden = rows.length > 0;
  }

  private renderOnline(online: boolean, detail?: string): void {
    if (!online && detail && this.offering) this.note(`${this.t("log_disconnected")}: ${detail}`);
    if (online) this.note(this.t("log_connected"));
    this.render();
  }

  private note(text: string): void {
    this.log.unshift(`${new Date().toLocaleTimeString(this.lang)} · ${text}`);
    this.log = this.log.slice(0, 40);
    const ul = $("mk-log");
    ul.replaceChildren(...this.log.map((l) => Object.assign(document.createElement("li"), { textContent: l })));
  }

  private show(id: string): void {
    for (const el of document.querySelectorAll<HTMLElement>("[data-mk]")) el.hidden = el.id !== id;
    $(id).scrollIntoView({ block: "start", behavior: "smooth" });
  }

  private status(text: string): void {
    $("mk-status").textContent = text;
  }

  private banner(text: string, kind: "warn" | "danger"): void {
    const b = $("mk-banner");
    b.textContent = text;
    b.dataset.kind = kind;
    b.hidden = false;
  }
}
