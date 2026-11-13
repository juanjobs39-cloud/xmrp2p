/**
 * P2P Fiat (beta): mercado tipo Binance para cambiar XMR por dinero fiat entre personas.
 * Vistas por hash: #/ (mercado), #/nuevo, #/ordenes, #/orden/<id>, #/anuncios, #/cuenta.
 * El XMR queda en un escrow 2 de 3 (comprador, vendedor, árbitro); el chat y los datos de pago van cifrados.
 */
import type { PrivateKeyAccount } from "viem";
import { MONERO, XMR_MAINNET } from "../app/config";
import type { RecoveryFile } from "../app/recovery";
import { moneroWallet, walletAddressButton } from "../app/wallet-provider";
import { closingConfirmation, initTelegram, inTelegram } from "./tg";
import { ApiError, get, signed, type Ad, type Method, type OrderView, type P2PConfig, type PublicUser, type RoomMessage } from "./api";
import { EscrowDriver, type EscrowNote } from "./escrow";
import { account, encPublic, hasVault, newVault, open, openVault, saveVault, seal, vaultFromSeed, type P2PVault, type SavedMethod } from "./identity";
import "./p2p.css";
import { avatar, h, fmtXmr, icon, nowS, type Child } from "./ui";
import { marketView } from "./market";
import { newAdView } from "./new-ad";
import { myAdsView, orderView, ordersView } from "./orders";
import { adminView } from "./admin";
import { WALLETS_ON, walletView, XMR_SINCE } from "./wallet-view";

export { h, fmtXmr, nowS, type Child };

export type Lang = "es" | "en";
export const KINDS = ["bank", "wallet", "cash", "card", "giftcard", "other"] as const;

export class P2PApp {
  cfg!: P2PConfig;
  fiats: { popular: string[]; all: string[] } = { popular: [], all: [] };
  vault: P2PVault | null = null;
  pass = "";
  acct: PrivateKeyAccount | null = null;
  me: PublicUser | null = null;
  root: HTMLElement;
  timer: ReturnType<typeof setTimeout> | null = null;
  drivers = new Map<string, EscrowDriver>();
  names: Intl.DisplayNames;
  node = MONERO.defaultNode;
  /** Órdenes que esperan algo de mí (punto rojo en «Mis órdenes»). */
  pending = 0;
  private seenOrders: Set<string> | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private flash: ReturnType<typeof setInterval> | null = null;
  private view = "";

  constructor(public lang: Lang) {
    this.root = document.getElementById("p2p-root")!;
    this.names = new Intl.DisplayNames([lang], { type: "currency" });
  }

  t = (es: string, en: string) => (this.lang === "es" ? es : en);

  // ------------------------------------------------------------ arranque

  async mount() {
    initTelegram();
    try {
      [this.cfg, this.fiats] = await Promise.all([get<P2PConfig>("/v1/p2p/config"), get<typeof this.fiats>("/v1/p2p/fiats")]);
    } catch {
      this.root.replaceChildren(h("p", { class: "notice warn" }, this.t("P2P Fiat no está disponible ahora mismo.", "P2P Fiat is not available right now.")));
      return;
    }
    if (this.cfg.xmr_network === "mainnet") this.node = XMR_MAINNET.defaultNode;
    window.addEventListener("hashchange", () => void this.route());
    // En Telegram: pedir confirmación al cerrar mientras el navegador firma un escrow.
    if (inTelegram()) setInterval(() => closingConfirmation(this.drivers.size > 0), 3000);
    window.addEventListener("beforeunload", (e) => {
      if (this.drivers.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    await this.route();
  }

  async route() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const [, view = "", arg] = location.hash.split("?")[0]!.replace(/^#\/?/, "/").split("/");
    const needs = ["nuevo", "ordenes", "orden", "anuncios", "cuenta", "admin", "wallet"].includes(view);
    if (needs && !this.vault) return this.accountView(view === "cuenta" ? "" : location.hash);
    this.nav(view);
    try {
      if (view === "nuevo") await newAdView(this);
      else if (view === "ordenes") await ordersView(this);
      else if (view === "orden" && arg) await orderView(this, arg);
      else if (view === "anuncios") await myAdsView(this);
      else if (view === "cuenta") await this.profileView();
      else if (view === "wallet" && WALLETS_ON) await walletView(this);
      else if (view === "admin") await adminView(this, arg);
      else await marketView(this);
    } catch (e) {
      this.show(this.error(e));
    }
  }

  nav(view: string = this.view) {
    this.view = view;
    const link = (hash: string, ico: Parameters<typeof icon>[0], label: string, key: string, dot = 0) =>
      h(
        "a",
        { href: hash, "aria-current": view === key || (key === "ordenes" && view === "orden") ? "page" : undefined },
        h("span", { class: "p2p-ico", "aria-hidden": "true" }, icon(ico)),
        h("span", {}, label),
        dot ? h("b", { class: "p2p-dot", title: this.t("Esperan tu acción", "Waiting for you") }, String(dot)) : null,
      );
    document.getElementById("p2p-nav")!.replaceChildren(
      link("#/", "market", this.t("Mercado", "Market"), ""),
      link("#/nuevo", "plus", this.t("Publicar", "Post ad"), "nuevo"),
      link("#/ordenes", "orders", this.t("Mis órdenes", "My orders"), "ordenes", this.pending),
      link("#/anuncios", "ads", this.t("Mis anuncios", "My ads"), "anuncios"),
      WALLETS_ON ? link("#/wallet", "lock", "Wallet", "wallet") : "",
      link("#/cuenta", "user", this.me ? this.me.nickname : this.t("Cuenta", "Account"), "cuenta"),
      this.isAdmin ? link("#/admin", "shield", "Admin", "admin") : "",
    );
  }

  /** Latido (marca «en línea») y revisión de órdenes nuevas mientras la cuenta está abierta. */
  private startBeat() {
    if (this.beat) return;
    const ping = () => void this.req("POST", "/v1/p2p/me/ping", {}).catch(() => {});
    const watch = async () => {
      if (!this.me) return;
      try {
        const r = await this.req<{ orders: { id: string; role: string; status: string; fiat: string; fiat_amount: string; xmr: string; is_maker?: boolean }[] }>("GET", "/v1/p2p/my/orders");
        const needs = (o: { role: string; status: string; is_maker?: boolean }) =>
          (o.status === "requested" && !!o.is_maker) ||
          (o.role === "seller" && ["setup", "awaiting_deposit", "paid"].includes(o.status)) ||
          (o.role === "buyer" && ["setup", "awaiting_payment"].includes(o.status));
        const pending = r.orders.filter(needs);
        const fresh = this.seenOrders ? pending.filter((o) => !this.seenOrders!.has(o.id) && ["requested", "setup", "awaiting_deposit"].includes(o.status)) : [];
        this.seenOrders = new Set(r.orders.map((o) => o.id));
        if (pending.length !== this.pending) {
          this.pending = pending.length;
          this.nav();
        }
        for (const o of fresh) this.alertOrder(o);
      } catch {
        /* sin red: se reintenta en la siguiente vuelta */
      }
    };
    ping();
    void watch();
    void this.syncPush();
    this.beat = setInterval(ping, 120_000);
    setInterval(() => void watch(), 30_000);
  }

  /** Aviso de orden nueva: notificación del navegador, sonido corto y título que parpadea. */
  private alertOrder(o: { id: string; role: string; fiat: string; fiat_amount: string; xmr: string }) {
    const title = this.t("Nueva orden en MoneroP2P", "New order on MoneroP2P");
    const body =
      o.role === "seller"
        ? this.t(`Te compran ${fmtXmr(o.xmr)} XMR por ${o.fiat_amount} ${o.fiat}. Abre la orden y deposita.`, `Someone buys ${fmtXmr(o.xmr)} XMR for ${o.fiat_amount} ${o.fiat}. Open the order and deposit.`)
        : this.t(`Te venden ${fmtXmr(o.xmr)} XMR por ${o.fiat_amount} ${o.fiat}. Abre la orden.`, `Someone sells you ${fmtXmr(o.xmr)} XMR for ${o.fiat_amount} ${o.fiat}. Open the order.`);
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(title, { body, tag: o.id });
        n.onclick = () => (window.focus(), (location.hash = `#/orden/${o.id}`));
      }
    } catch {
      /* algunos navegadores no permiten notificaciones aquí */
    }
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(g).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* sin audio */
    }
    if (this.flash || document.hasFocus()) return;
    const base = document.title;
    let on = false;
    this.flash = setInterval(() => (document.title = (on = !on) ? `🔔 ${this.t("Nueva orden", "New order")}` : base), 1000);
    window.addEventListener("focus", () => (clearInterval(this.flash!), (this.flash = null), (document.title = base)), { once: true });
  }

  /** Pide permiso de notificaciones (solo tras un clic del usuario). */
  askNotify() {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission().catch(() => {});
  }

  // ------------------------------------------------------------ avisos push (con la app cerrada)

  pushSupported(): boolean {
    return !!this.cfg.vapid_public && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  /** iPhone/iPad sin instalar: Safari solo permite push en la app agregada a la pantalla de inicio. */
  private iosNeedsInstall(): boolean {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios && !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia("(display-mode: standalone)").matches;
  }

  private async pushReg(): Promise<ServiceWorkerRegistration> {
    const app = location.pathname.match(/^\/[a-z]{2}\/app\//)?.[0] ?? "/en/app/";
    return navigator.serviceWorker.register(`/p2p-sw.js?app=${encodeURIComponent(app)}`, { scope: "/" });
  }

  private async currentSub(): Promise<PushSubscription | null> {
    if (!this.pushSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return (await reg?.pushManager.getSubscription()) ?? null;
  }

  /** Activa los avisos: pide permiso, suscribe este navegador y lo registra en tu cuenta. */
  async enablePush(): Promise<boolean> {
    if (!this.pushSupported() || this.iosNeedsInstall()) return false;
    if ((await Notification.requestPermission()) !== "granted") return false;
    const reg = await this.pushReg();
    await navigator.serviceWorker.ready;
    const key = Uint8Array.from(atob(this.cfg.vapid_public!.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    await this.req("PUT", "/v1/p2p/push", { endpoint: sub.endpoint });
    return true;
  }

  async disablePush() {
    const sub = await this.currentSub();
    if (!sub) return;
    await this.req("DELETE", "/v1/p2p/push", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }

  /** Al entrar: si este navegador ya tenía avisos, los liga a la cuenta abierta. */
  private async syncPush() {
    try {
      const sub = Notification.permission === "granted" ? await this.currentSub() : null;
      if (sub) await this.req("PUT", "/v1/p2p/push", { endpoint: sub.endpoint });
    } catch {
      /* sin avisos push */
    }
  }

  /** Botón para activar o desactivar los avisos con la app cerrada. */
  pushButton(): HTMLElement | null {
    if (!this.pushSupported()) return null;
    const box = h("div", { class: "p2p-push" });
    const draw = async () => {
      if (this.iosNeedsInstall())
        return void box.replaceChildren(
          h("small", {}, this.t("En iPhone, para recibir avisos agrega esta página a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.", "On iPhone, to get notifications add this page to your home screen (Share → Add to Home Screen) and open it from there.")),
        );
      if (Notification.permission === "denied")
        return void box.replaceChildren(h("small", {}, this.t("Bloqueaste las notificaciones de este sitio: actívalas en los ajustes del navegador.", "You blocked notifications for this site: allow them in your browser settings.")));
      const on = !!(await this.currentSub().catch(() => null)) && Notification.permission === "granted";
      const b = h("button", { class: "btn small " + (on ? "secondary" : ""), type: "button" }, on ? null : icon("bell"), on ? this.t("Desactivar avisos", "Turn off notifications") : this.t("Activar avisos", "Turn on notifications"));
      b.onclick = () =>
        void this.busy(b, async () => {
          if (on) await this.disablePush();
          else if (!(await this.enablePush())) throw new Error(this.t("No se pudieron activar los avisos en este navegador.", "Could not turn on notifications in this browser."));
          await draw();
        }, box);
      box.replaceChildren(
        b,
        h("small", { class: "muted" }, on ? this.t("Avisos activos en este navegador.", "Notifications on in this browser.") : this.t("El aviso no lleva montos ni datos de la orden.", "The notification carries no amounts or order details.")),
      );
    };
    void draw();
    return box;
  }

  // ------------------------------------------------------------ avisos por Telegram

  /** Conectar o desconectar el bot de avisos. El bot solo recibe el evento y el enlace, nunca montos. */
  telegramButton(): HTMLElement | null {
    if (!this.cfg.telegram_bot || !this.me) return null;
    const box = h("div", { class: "p2p-push p2p-tg" });
    let poll = 0;
    const draw = () => {
      clearInterval(poll);
      if (this.me?.telegram) {
        const off = h("button", { class: "btn small secondary", type: "button" }, this.t("Desconectar Telegram", "Disconnect Telegram"));
        off.onclick = () =>
          void this.busy(off, async () => {
            await this.req("DELETE", "/v1/p2p/telegram", {});
            this.me = { ...this.me!, telegram: false };
            draw();
          }, box);
        return void box.replaceChildren(
          off,
          h("small", { class: "muted" }, this.t(
            "Telegram conectado: ahí te llegan tus órdenes y puedes aceptar o rechazar solicitudes. Activa «Aceptar solicitudes» en tus anuncios para recibir órdenes aunque no estés en la web.",
            "Telegram connected: your orders arrive there and you can accept or decline requests. Turn on “Accept requests” on your ads to get orders even when you're not on the web.",
          )),
        );
      }
      const on = h("button", { class: "btn small", type: "button" }, icon("send"), this.t("Conectar Telegram", "Connect Telegram"));
      on.onclick = () =>
        void this.busy(on, async () => {
          const r = await this.req<{ url: string; expires_at: number }>("POST", "/v1/p2p/telegram/link", { lang: this.lang });
          window.open(r.url, "_blank", "noopener");
          box.replaceChildren(
            h("a", { class: "btn small", href: r.url, target: "_blank", rel: "noopener" }, this.t("Abrir Telegram", "Open Telegram")),
            h("small", { class: "muted" }, this.t(
              `Toca «Iniciar» en @${this.cfg.telegram_bot}. Esta página se actualiza sola cuando quede conectado (el enlace vence en 10 min).`,
              `Tap “Start” in @${this.cfg.telegram_bot}. This page updates itself once it's connected (the link expires in 10 min).`,
            )),
          );
          // Revisa cada 3 s hasta que el bot confirme el vínculo o venza el código.
          poll = window.setInterval(async () => {
            if (!box.isConnected || Date.now() / 1000 > r.expires_at) return void (clearInterval(poll), box.isConnected && draw());
            const me = await this.req<PublicUser>("GET", "/v1/p2p/me").catch(() => null);
            if (me?.telegram) {
              this.me = me;
              draw();
            }
          }, 3000);
        }, box);
      box.replaceChildren(
        on,
        h("small", { class: "muted" }, this.t(
          "Avisos en Telegram aunque cierres la web. El bot solo recibe el tipo de aviso y el enlace a la orden: nunca montos, apodos ni datos de pago.",
          "Notifications on Telegram even with the web closed. The bot only gets the kind of notice and the order link: never amounts, nicknames or payment details.",
        )),
      );
    };
    draw();
    return box;
  }

  show(...nodes: Child[]) {
    this.root.replaceChildren(...(nodes.filter(Boolean) as Node[]));
  }

  /** Con MoneroP2P Wallet instalada: botón junto al campo que lo llena con una subdirección nueva. */
  walletFill(input: HTMLInputElement): void {
    void walletAddressButton(input, this.cfg.xmr_network, this.t("Usar mi MoneroP2P Wallet", "Use my MoneroP2P Wallet"), (m) => input.parentElement?.append(this.error(new Error(m)))).then(
      (b) => b && input.insertAdjacentElement("afterend", b),
    );
  }

  error(e: unknown): HTMLElement {
    const msg = e instanceof ApiError || e instanceof Error ? e.message : String(e);
    return h("p", { class: "notice danger", role: "alert" }, msg);
  }

  async busy<T>(btn: HTMLButtonElement, f: () => Promise<T>, out?: HTMLElement): Promise<T | undefined> {
    btn.disabled = true;
    btn.classList.add("loading");
    out?.replaceChildren();
    try {
      return await f();
    } catch (e) {
      (out ?? this.root).prepend(this.error(e));
      return undefined;
    } finally {
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  }

  fiatSelect(value: string, id: string): HTMLSelectElement {
    const opt = (c: string) => h("option", { value: c, selected: c === value }, `${c} · ${this.names.of(c) ?? c}`);
    return h(
      "select",
      { id },
      h("optgroup", { label: this.t("Populares", "Popular") }, this.fiats.popular.map(opt)),
      h("optgroup", { label: this.t("Todas", "All") }, this.fiats.all.filter((c) => !this.fiats.popular.includes(c)).map(opt)),
    );
  }

  field(label: string, input: HTMLElement, hint?: string) {
    return h("div", { class: "field app" }, h("label", { for: input.id }, label), input, hint ? h("small", {}, hint) : null);
  }

  /** Conexión: «En línea» o «Visto hace X». */
  seen(u: PublicUser): string {
    return this.isOn(u) ? this.t("En línea", "Online") : this.t(`Visto hace ${this.ago(u.last_seen)}`, `Seen ${this.ago(u.last_seen)} ago`);
  }
  isOn(u: PublicUser) {
    return u.online ?? nowS() - u.last_seen < 600;
  }

  /** Anunciante: avatar, apodo, conexión y reputación (órdenes, % completadas, tiempos). */
  userLine(u?: PublicUser | null, compact = false) {
    if (!u) return h("span", {}, "—");
    const stats = [
      `${u.orders_done} ${this.t("órdenes", "orders")}`,
      u.completion_pct !== null ? `${u.completion_pct}% ${this.t("completadas", "completion")}` : null,
      compact || u.avg_deposit_min == null ? null : `${this.t("deposita en", "deposits in")} ~${u.avg_deposit_min} min`,
      compact || u.avg_release_min === null ? null : `${this.t("libera en", "releases in")} ~${u.avg_release_min} min`,
    ].filter(Boolean);
    const on = this.isOn(u);
    const votes = u.positive + u.negative;
    return h(
      "span",
      { class: "p2p-user" },
      avatar(u.nickname, on),
      h(
        "span",
        { class: "p2p-user-txt" },
        h("strong", {}, u.nickname, votes ? h("span", { class: "p2p-rate", title: `+${u.positive} · −${u.negative}` }, " · ", icon("up"), ` ${Math.round((u.positive / votes) * 100)}%`) : null),
        h("small", {}, stats.join(" · ")),
        h("small", { class: on ? "p2p-on" : "p2p-off" }, this.seen(u)),
      ),
    );
  }

  methodTag(m: Method) {
    return h("span", { class: "p2p-tag" + (m.reversible ? " rev" : ""), title: m.reversible ? this.t("Pago reversible: riesgo de contracargo", "Reversible payment: chargeback risk") : undefined }, m.name, m.country ? ` (${m.country})` : "", m.reversible ? " ⚠" : "");
  }

  async req<T>(method: string, path: string, body?: Record<string, unknown>) {
    return signed<T>(this.acct!, method, path, body);
  }

  async saveV() {
    await saveVault(this.vault!, this.pass);
  }

  // ------------------------------------------------------------ cuenta

  async accountView(next: string) {
    this.nav("cuenta");
    const net = this.cfg.xmr_network;
    const out = h("div");
    const exists = await hasVault(net);
    const pass = h("input", { id: "p2p-pass", type: "password", autocomplete: "current-password" });
    const unlock = h("button", { class: "btn", type: "button" }, this.t("Entrar", "Unlock"));
    unlock.onclick = () => void this.busy(unlock, async () => this.unlocked(await openVault(net, pass.value), pass.value, next), out);

    const nick = h("input", { id: "p2p-nick", type: "text", maxLength: 20, autocomplete: "off", placeholder: "satoshi_mx" });
    const p1 = h("input", { id: "p2p-p1", type: "password", autocomplete: "new-password" });
    const p2 = h("input", { id: "p2p-p2", type: "password", autocomplete: "new-password" });
    const create = h("button", { class: "btn", type: "button" }, this.t("Crear cuenta", "Create account"));
    create.onclick = () =>
      void this.busy(
        create,
        async () => {
          if (p1.value.length < 10) throw new Error(this.t("La contraseña debe tener al menos 10 caracteres.", "The password must be at least 10 characters."));
          if (p1.value !== p2.value) throw new Error(this.t("Las contraseñas no coinciden.", "Passwords do not match."));
          const v = newVault(net, WALLETS_ON);
          await signed(account(v), "PUT", "/v1/p2p/me", { nickname: nick.value.trim(), enc_pubkey: await encPublic(v) });
          await saveVault(v, p1.value);
          await this.unlocked(v, p1.value, next);
          await this.downloadBackup();
        },
        out,
      );

    const file = h("input", { id: "p2p-file", type: "file", accept: "application/json,.json" });
    const rpass = h("input", { id: "p2p-rpass", type: "password", autocomplete: "current-password" });
    const restore = h("button", { class: "btn secondary", type: "button" }, this.t("Restaurar", "Restore"));
    restore.onclick = () =>
      void this.busy(
        restore,
        async () => {
          const f = file.files?.[0];
          if (!f) throw new Error(this.t("Elige el archivo de respaldo.", "Choose the backup file."));
          const v = await openVault(net, rpass.value, JSON.parse(await f.text()) as RecoveryFile);
          await saveVault(v, rpass.value);
          await this.unlocked(v, rpass.value, next);
        },
        out,
      );

    const words = h("textarea", { id: "p2p-words", rows: 3, autocomplete: "off", spellcheck: false, autocapitalize: "none" });
    const w1 = h("input", { id: "p2p-w1", type: "password", autocomplete: "new-password" });
    const w2 = h("input", { id: "p2p-w2", type: "password", autocomplete: "new-password" });
    const fromWords = h("button", { class: "btn secondary", type: "button" }, this.t("Recuperar", "Recover"));
    fromWords.onclick = () =>
      void this.busy(
        fromWords,
        async () => {
          if (w1.value.length < 10) throw new Error(this.t("La contraseña debe tener al menos 10 caracteres.", "The password must be at least 10 characters."));
          if (w1.value !== w2.value) throw new Error(this.t("Las contraseñas no coinciden.", "Passwords do not match."));
          let v: P2PVault;
          try {
            // Escanea Monero desde que existen las wallets: no sabemos cuándo se creó esta cuenta.
            v = vaultFromSeed(net, words.value, XMR_SINCE[net]);
          } catch {
            throw new Error(this.t("Revisa las 12 palabras: deben ser las de tu cuenta, en inglés y en orden.", "Check the 12 words: they must be your account's, in English and in order."));
          }
          words.value = "";
          await saveVault(v, w1.value);
          await this.unlocked(v, w1.value, next);
        },
        out,
      );

    this.show(
      out,
      exists
        ? h("section", { class: "card p2p-box" }, h("h2", {}, this.t("Entra a tu cuenta", "Unlock your account")), this.field(this.t("Contraseña", "Password"), pass), h("p", {}, unlock))
        : h(
            "section",
            { class: "card p2p-box" },
            h("h2", {}, this.t("Crea tu cuenta P2P", "Create your P2P account")),
            h("p", {}, this.t("Sin correo ni KYC: tu cuenta es una llave que se crea en este navegador. Guarda el respaldo; sin él no la recuperas.", "No email, no KYC: your account is a key created in this browser. Keep the backup; without it you cannot recover it.")),
            this.field(this.t("Apodo público", "Public nickname"), nick, this.t("3–20 letras, números, punto o guion.", "3–20 letters, numbers, dot or dash.")),
            this.field(this.t("Contraseña", "Password"), p1, this.t("Cifra la cuenta y el respaldo.", "Encrypts the account and the backup.")),
            this.field(this.t("Repite la contraseña", "Repeat the password"), p2),
            h("p", {}, create),
          ),
      h(
        "details",
        { class: "card p2p-box" },
        h("summary", {}, this.t("Restaurar desde un respaldo", "Restore from a backup")),
        this.field(this.t("Archivo de respaldo", "Backup file"), file),
        this.field(this.t("Contraseña del respaldo", "Backup password"), rpass),
        h("p", {}, restore),
      ),
      WALLETS_ON
        ? h(
            "details",
            { class: "card p2p-box" },
            h("summary", {}, this.t("Recuperar con mis 12 palabras", "Recover with my 12 words")),
            h("p", {}, h("small", { class: "muted" }, this.t("Sirve para cuentas creadas con wallets. Recupera tu apodo y tus wallets; los escrows de órdenes abiertas solo están en el archivo de respaldo.", "Works for accounts created with wallets. It recovers your nickname and your wallets; the escrows of open orders are only in the backup file."))),
            this.field(this.t("Tus 12 palabras", "Your 12 words"), words),
            this.field(this.t("Contraseña nueva para este navegador", "New password for this browser"), w1),
            this.field(this.t("Repite la contraseña", "Repeat the password"), w2),
            h("p", {}, fromWords),
          )
        : null,
    );
  }

  async unlocked(v: P2PVault, pass: string, next: string) {
    this.vault = v;
    this.pass = pass;
    this.acct = account(v);
    try {
      this.me = await this.req<PublicUser>("GET", "/v1/p2p/me");
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    this.startBeat();
    if (location.hash === next || !next) await this.route();
    else location.hash = next;
  }

  async downloadBackup() {
    const file = await saveVault(this.vault!, this.pass);
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: "application/json" })), download: `monerop2p-p2p-respaldo-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async profileView() {
    const out = h("div");
    const nick = h("input", { id: "p2p-nick", type: "text", maxLength: 20, value: this.me?.nickname ?? "" });
    const save = h("button", { class: "btn", type: "button" }, this.t("Guardar apodo", "Save nickname"));
    save.onclick = () =>
      void this.busy(
        save,
        async () => {
          this.me = await this.req<PublicUser>("PUT", "/v1/p2p/me", { nickname: nick.value.trim(), enc_pubkey: await encPublic(this.vault!) });
          this.nav("cuenta");
          out.replaceChildren(h("p", { class: "notice ok" }, this.t("Guardado.", "Saved.")));
        },
        out,
      );
    const backup = h("button", { class: "btn secondary", type: "button", onclick: () => void this.downloadBackup() }, this.t("Descargar respaldo", "Download backup"));
    const lock = h("button", { class: "btn secondary", type: "button" }, this.t("Cerrar sesión en esta pestaña", "Lock this tab"));
    lock.onclick = () => location.reload();
    this.show(
      out,
      h(
        "section",
        { class: "card p2p-box" },
        h("h2", {}, this.t("Tu cuenta", "Your account")),
        this.me ? this.userLine(this.me) : h("p", { class: "notice warn" }, this.t("Aún no tienes perfil: elige un apodo.", "You have no profile yet: choose a nickname.")),
        h("p", {}, h("small", {}, `ID: ${this.acct!.address}`)),
        this.field(this.t("Apodo", "Nickname"), nick),
        h("p", { class: "row wrap" }, save, backup, lock),
        h("p", {}, h("small", {}, this.t("El respaldo incluye las llaves de tus escrows abiertos. Descárgalo de nuevo después de cada orden.", "The backup includes the keys of your open escrows. Download it again after each order."))),
      ),
      this.me && (this.cfg.telegram_bot || this.pushSupported())
        ? h("section", { class: "card p2p-box" }, h("h2", {}, this.t("Avisos", "Notifications")), this.telegramButton(), this.pushButton())
        : null,
    );
  }

  // ------------------------------------------------------------ mercado

  // ------------------------------------------------------------ crear anuncio

  kindName(k: string) {
    const es: Record<string, string> = { bank: "Banco", wallet: "Billetera / app", cash: "Efectivo", card: "Tarjeta", giftcard: "Tarjeta de regalo", other: "Otro" };
    const en: Record<string, string> = { bank: "Bank", wallet: "Wallet / app", cash: "Cash", card: "Card", giftcard: "Gift card", other: "Other" };
    return (this.lang === "es" ? es : en)[k] ?? k;
  }

  saved(fiat: string, name: string): SavedMethod | undefined {
    return this.vault?.methods.find((m) => m.fiat === fiat && m.name.toLowerCase() === name.toLowerCase());
  }
  remember(m: SavedMethod) {
    const v = this.vault!;
    v.methods = [...v.methods.filter((x) => !(x.fiat === m.fiat && x.name.toLowerCase() === m.name.toLowerCase())), m];
  }

  // ------------------------------------------------------------ mis anuncios y órdenes

  statusName(s: string): string {
    const es: Record<string, string> = {
      requested: "Solicitud pendiente", setup: "Armando escrow", awaiting_deposit: "Esperando depósito", confirming: "Confirmando depósito", awaiting_payment: "Esperando pago",
      paid: "Pagado, por liberar", releasing: "Liberando", released: "Completada", cancelled: "Cancelada", refunding: "Reembolsando",
      refunded: "Reembolsada", disputed: "En apelación", resolving: "Resolviendo", resolved_buyer: "Resuelta a favor del comprador", resolved_seller: "Resuelta a favor del vendedor",
    };
    const en: Record<string, string> = {
      requested: "Pending request", setup: "Setting up escrow", awaiting_deposit: "Waiting for deposit", confirming: "Confirming deposit", awaiting_payment: "Waiting for payment",
      paid: "Paid, to release", releasing: "Releasing", released: "Completed", cancelled: "Cancelled", refunding: "Refunding",
      refunded: "Refunded", disputed: "Under appeal", resolving: "Resolving", resolved_buyer: "Resolved for the buyer", resolved_seller: "Resolved for the seller",
    };
    return (this.lang === "es" ? es : en)[s] ?? s;
  }

  // ------------------------------------------------------------ orden

  // ------------------------------------------------------------ administrador

  get isAdmin() {
    return !!this.acct && !!this.cfg.admin_address && this.acct.address.toLowerCase() === this.cfg.admin_address;
  }

  ago(ts: number | null | undefined) {
    if (!ts) return "—";
    const m = Math.round((nowS() - ts) / 60);
    return m < 1 ? this.t("ahora", "now") : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
  }

  steps(o: OrderView) {
    const order = ["setup", "awaiting_deposit", "confirming", "awaiting_payment", "paid", "releasing", "released"];
    const i = order.indexOf(o.status);
    const labels = this.lang === "es" ? ["Escrow", "Depósito", "Confirmación", "Pago", "Liberación", "Listo"] : ["Escrow", "Deposit", "Confirmation", "Payment", "Release", "Done"];
    const at = [0, 1, 2, 3, 4, 6];
    if (i < 0) return null;
    return h("ol", { class: "p2p-steps" }, labels.map((l, k) => h("li", { class: i >= at[k]! ? (i > at[k]! || o.status === "released" ? "done" : "now") : "" }, l)));
  }
}
