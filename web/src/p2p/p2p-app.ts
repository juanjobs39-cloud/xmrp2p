/**
 * P2P Fiat (beta): mercado tipo Binance para cambiar XMR por dinero fiat entre personas.
 * Vistas por hash: #/ (mercado), #/nuevo, #/ordenes, #/orden/<id>, #/anuncios, #/cuenta.
 * El XMR queda en un escrow 2 de 3 (comprador, vendedor, árbitro); el chat y los datos de pago van cifrados.
 */
import type { PrivateKeyAccount } from "viem";
import { MONERO, XMR_MAINNET } from "../app/config";
import type { RecoveryFile } from "../app/recovery";
import { moneroWallet, walletAddressButton } from "../app/wallet-provider";
import { ApiError, get, signed, type Ad, type Method, type OrderView, type P2PConfig, type PublicUser, type RoomMessage } from "./api";
import { EscrowDriver, type EscrowNote } from "./escrow";
import { account, encPublic, hasVault, newVault, open, openVault, saveVault, seal, type P2PVault, type SavedMethod } from "./identity";
import "./p2p.css";
import { avatar, h, fmtXmr, nowS, type Child } from "./ui";
import { marketView } from "./market";
import { newAdView } from "./new-ad";
import { myAdsView, orderView, ordersView } from "./orders";
import { adminView } from "./admin";

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
    try {
      [this.cfg, this.fiats] = await Promise.all([get<P2PConfig>("/v1/p2p/config"), get<typeof this.fiats>("/v1/p2p/fiats")]);
    } catch {
      this.root.replaceChildren(h("p", { class: "notice warn" }, this.t("P2P Fiat no está disponible ahora mismo.", "P2P Fiat is not available right now.")));
      return;
    }
    if (this.cfg.xmr_network === "mainnet") this.node = XMR_MAINNET.defaultNode;
    window.addEventListener("hashchange", () => void this.route());
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
    const needs = ["nuevo", "ordenes", "orden", "anuncios", "cuenta", "admin"].includes(view);
    if (needs && !this.vault) return this.accountView(view === "cuenta" ? "" : location.hash);
    this.nav(view);
    try {
      if (view === "nuevo") await newAdView(this);
      else if (view === "ordenes") await ordersView(this);
      else if (view === "orden" && arg) await orderView(this, arg);
      else if (view === "anuncios") await myAdsView(this);
      else if (view === "cuenta") await this.profileView();
      else if (view === "admin") await adminView(this, arg);
      else await marketView(this);
    } catch (e) {
      this.show(this.error(e));
    }
  }

  nav(view: string = this.view) {
    this.view = view;
    const link = (hash: string, icon: string, label: string, key: string, dot = 0) =>
      h(
        "a",
        { href: hash, "aria-current": view === key || (key === "ordenes" && view === "orden") ? "page" : undefined },
        h("span", { class: "p2p-ico", "aria-hidden": "true" }, icon),
        h("span", {}, label),
        dot ? h("b", { class: "p2p-dot", title: this.t("Esperan tu acción", "Waiting for you") }, String(dot)) : null,
      );
    document.getElementById("p2p-nav")!.replaceChildren(
      link("#/", "⇄", this.t("Mercado", "Market"), ""),
      link("#/nuevo", "＋", this.t("Publicar", "Post ad"), "nuevo"),
      link("#/ordenes", "☰", this.t("Mis órdenes", "My orders"), "ordenes", this.pending),
      link("#/anuncios", "▤", this.t("Mis anuncios", "My ads"), "anuncios"),
      link("#/cuenta", "◉", this.me ? this.me.nickname : this.t("Cuenta", "Account"), "cuenta"),
      this.isAdmin ? link("#/admin", "🛡", "Admin", "admin") : "",
    );
  }

  /** Latido (marca «en línea») y revisión de órdenes nuevas mientras la cuenta está abierta. */
  private startBeat() {
    if (this.beat) return;
    const ping = () => void this.req("POST", "/v1/p2p/me/ping", {}).catch(() => {});
    const watch = async () => {
      if (!this.me) return;
      try {
        const r = await this.req<{ orders: { id: string; role: string; status: string; fiat: string; fiat_amount: string; xmr: string }[] }>("GET", "/v1/p2p/my/orders");
        const needs = (o: { role: string; status: string }) =>
          (o.role === "seller" && ["setup", "awaiting_deposit", "paid"].includes(o.status)) || (o.role === "buyer" && ["setup", "awaiting_payment"].includes(o.status));
        const pending = r.orders.filter(needs);
        const fresh = this.seenOrders ? pending.filter((o) => !this.seenOrders!.has(o.id) && ["setup", "awaiting_deposit"].includes(o.status)) : [];
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
        h("strong", {}, u.nickname, votes ? h("span", { class: "p2p-rate", title: `👍 ${u.positive} · 👎 ${u.negative}` }, ` · 👍 ${Math.round((u.positive / votes) * 100)}%`) : null),
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
          const v = newVault(net);
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
      setup: "Armando escrow", awaiting_deposit: "Esperando depósito", confirming: "Confirmando depósito", awaiting_payment: "Esperando pago",
      paid: "Pagado, por liberar", releasing: "Liberando", released: "Completada", cancelled: "Cancelada", refunding: "Reembolsando",
      refunded: "Reembolsada", disputed: "En apelación", resolving: "Resolviendo", resolved_buyer: "Resuelta a favor del comprador", resolved_seller: "Resuelta a favor del vendedor",
    };
    const en: Record<string, string> = {
      setup: "Setting up escrow", awaiting_deposit: "Waiting for deposit", confirming: "Confirming deposit", awaiting_payment: "Waiting for payment",
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
