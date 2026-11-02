/**
 * P2P Fiat (beta): mercado tipo Binance para cambiar XMR por dinero fiat entre personas.
 * Vistas por hash: #/ (mercado), #/nuevo, #/ordenes, #/orden/<id>, #/anuncios, #/cuenta.
 * El XMR queda en un escrow 2 de 3 (comprador, vendedor, árbitro); el chat y los datos de pago van cifrados.
 */
import type { PrivateKeyAccount } from "viem";
import { MONERO, XMR_MAINNET } from "../app/config";
import type { RecoveryFile } from "../app/recovery";
import { ApiError, get, signed, type Ad, type Method, type OrderView, type P2PConfig, type PublicUser, type RoomMessage } from "./api";
import { EscrowDriver, type EscrowNote } from "./escrow";
import { account, encPublic, hasVault, newVault, open, openVault, saveVault, seal, type P2PVault, type SavedMethod } from "./identity";
import "./p2p.css";

type Lang = "es" | "en";
const KINDS = ["bank", "wallet", "cash", "card", "giftcard", "other"] as const;

// ---------- utilidades de DOM ----------
type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k in el && typeof v !== "string") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}
const fmtXmr = (x: string) => String(Number(x).toFixed(6)).replace(/\.?0+$/, "");
const nowS = () => Math.floor(Date.now() / 1000);

export class P2PApp {
  private cfg!: P2PConfig;
  private fiats: { popular: string[]; all: string[] } = { popular: [], all: [] };
  private vault: P2PVault | null = null;
  private pass = "";
  private acct: PrivateKeyAccount | null = null;
  private me: PublicUser | null = null;
  private root: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private drivers = new Map<string, EscrowDriver>();
  private names: Intl.DisplayNames;
  private node = MONERO.defaultNode;

  constructor(private lang: Lang) {
    this.root = document.getElementById("p2p-root")!;
    this.names = new Intl.DisplayNames([lang], { type: "currency" });
  }

  private t = (es: string, en: string) => (this.lang === "es" ? es : en);

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

  private async route() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const [, view = "", arg] = location.hash.replace(/^#\/?/, "/").split("/");
    const needs = ["nuevo", "ordenes", "orden", "anuncios", "cuenta"].includes(view);
    if (needs && !this.vault) return this.accountView(view === "cuenta" ? "" : location.hash);
    this.nav(view);
    try {
      if (view === "nuevo") await this.newAdView();
      else if (view === "ordenes") await this.ordersView();
      else if (view === "orden" && arg) await this.orderView(arg);
      else if (view === "anuncios") await this.myAdsView();
      else if (view === "cuenta") await this.profileView();
      else await this.marketView();
    } catch (e) {
      this.show(this.error(e));
    }
  }

  private nav(view: string) {
    const link = (hash: string, label: string, key: string) => h("a", { href: hash, "aria-current": view === key ? "page" : undefined }, label);
    document.getElementById("p2p-nav")!.replaceChildren(
      link("#/", this.t("Mercado", "Market"), ""),
      link("#/nuevo", this.t("Publicar anuncio", "Post an ad"), "nuevo"),
      link("#/ordenes", this.t("Mis órdenes", "My orders"), "ordenes"),
      link("#/anuncios", this.t("Mis anuncios", "My ads"), "anuncios"),
      link("#/cuenta", this.me ? `👤 ${this.me.nickname}` : this.t("Cuenta", "Account"), "cuenta"),
    );
  }

  private show(...nodes: Child[]) {
    this.root.replaceChildren(...(nodes.filter(Boolean) as Node[]));
  }

  private error(e: unknown): HTMLElement {
    const msg = e instanceof ApiError || e instanceof Error ? e.message : String(e);
    return h("p", { class: "notice danger", role: "alert" }, msg);
  }

  private async busy<T>(btn: HTMLButtonElement, f: () => Promise<T>, out?: HTMLElement): Promise<T | undefined> {
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

  private fiatSelect(value: string, id: string): HTMLSelectElement {
    const opt = (c: string) => h("option", { value: c, selected: c === value }, `${c} · ${this.names.of(c) ?? c}`);
    return h(
      "select",
      { id },
      h("optgroup", { label: this.t("Populares", "Popular") }, this.fiats.popular.map(opt)),
      h("optgroup", { label: this.t("Todas", "All") }, this.fiats.all.filter((c) => !this.fiats.popular.includes(c)).map(opt)),
    );
  }

  private field(label: string, input: HTMLElement, hint?: string) {
    return h("div", { class: "field app" }, h("label", { for: input.id }, label), input, hint ? h("small", {}, hint) : null);
  }

  private userLine(u?: PublicUser | null) {
    if (!u) return h("span", {}, "—");
    const stats = [
      `${u.orders_done} ${this.t("órdenes", "orders")}`,
      u.completion_pct !== null ? `${u.completion_pct}%` : null,
      u.avg_release_min !== null ? `${this.t("libera en", "releases in")} ~${u.avg_release_min} min` : null,
      `👍 ${u.positive} · 👎 ${u.negative}`,
    ].filter(Boolean);
    const online = nowS() - u.last_seen < 600;
    return h("span", { class: "p2p-user" }, h("strong", {}, u.nickname), online ? h("span", { class: "p2p-online", title: "online" }, "●") : null, " ", h("small", {}, stats.join(" · ")));
  }

  private methodTag(m: Method) {
    return h("span", { class: "p2p-tag" + (m.reversible ? " rev" : ""), title: m.reversible ? this.t("Pago reversible: riesgo de contracargo", "Reversible payment: chargeback risk") : undefined }, m.name, m.country ? ` (${m.country})` : "", m.reversible ? " ⚠" : "");
  }

  private async req<T>(method: string, path: string, body?: Record<string, unknown>) {
    return signed<T>(this.acct!, method, path, body);
  }

  private async saveV() {
    await saveVault(this.vault!, this.pass);
  }

  // ------------------------------------------------------------ cuenta

  private async accountView(next: string) {
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

  private async unlocked(v: P2PVault, pass: string, next: string) {
    this.vault = v;
    this.pass = pass;
    this.acct = account(v);
    try {
      this.me = await this.req<PublicUser>("GET", "/v1/p2p/me");
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    if (location.hash === next || !next) await this.route();
    else location.hash = next;
  }

  private async downloadBackup() {
    const file = await saveVault(this.vault!, this.pass);
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: "application/json" })), download: `monerop2p-p2p-respaldo-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  private async profileView() {
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

  private async marketView() {
    const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const wantBuy = sp.get("lado") !== "vender";
    const fiat = this.fiatSelect(sp.get("fiat") ?? (this.lang === "es" ? "MXN" : "USD"), "p2p-fiat");
    const country = h("input", { id: "p2p-country", type: "text", maxLength: 2, placeholder: "MX", value: sp.get("pais") ?? "" });
    const method = h("input", { id: "p2p-method", type: "text", placeholder: "SPEI", value: sp.get("metodo") ?? "" });
    const amount = h("input", { id: "p2p-amount", type: "text", inputMode: "decimal", placeholder: "500", value: sp.get("monto") ?? "" });
    const list = h("div", { class: "p2p-list" });
    const price = h("p", { class: "p2p-market" });

    const tab = (buy: boolean, label: string) =>
      h("button", { type: "button", class: "p2p-tab" + (buy === wantBuy ? " on" : "") + (buy ? " buy" : " sell"), onclick: () => go(buy) }, label);
    const go = (buy = wantBuy) => {
      const q = new URLSearchParams({ lado: buy ? "comprar" : "vender", fiat: fiat.value });
      if (country.value) q.set("pais", country.value.toUpperCase());
      if (method.value) q.set("metodo", method.value);
      if (amount.value) q.set("monto", amount.value);
      location.hash = `#/?${q}`;
    };
    const search = h("button", { class: "btn", type: "button", onclick: () => go() }, this.t("Buscar", "Search"));
    for (const el of [country, method, amount]) el.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && go());
    fiat.onchange = () => go();

    this.show(
      h("div", { class: "p2p-tabs" }, tab(true, this.t("Comprar XMR", "Buy XMR")), tab(false, this.t("Vender XMR", "Sell XMR"))),
      h("div", { class: "p2p-filters" }, this.field(this.t("Moneda", "Currency"), fiat), this.field(this.t("País", "Country"), country), this.field(this.t("Método", "Method"), method), this.field(this.t("Monto", "Amount"), amount), h("div", { class: "field app" }, h("label", {}, " "), search)),
      price,
      list,
    );

    const q = new URLSearchParams({ side: wantBuy ? "sell" : "buy", fiat: fiat.value });
    if (country.value) q.set("country", country.value.toUpperCase());
    if (method.value) q.set("method", method.value);
    if (amount.value) q.set("amount", amount.value);
    list.replaceChildren(h("p", {}, this.t("Cargando anuncios…", "Loading ads…")));
    const r = await get<{ market_price: number | null; ads: (Ad & { user: PublicUser })[] }>(`/v1/p2p/ads?${q}`);
    if (r.market_price) price.textContent = `${this.t("Precio de mercado", "Market price")}: 1 XMR ≈ ${r.market_price.toLocaleString(this.lang, { maximumFractionDigits: 2 })} ${fiat.value}`;
    if (!r.ads.length) {
      list.replaceChildren(h("p", { class: "notice" }, this.t("No hay anuncios con estos filtros. ¡Publica el primero!", "No ads match these filters. Post the first one!"), " ", h("a", { href: "#/nuevo" }, this.t("Publicar anuncio", "Post an ad"))));
      return;
    }
    list.replaceChildren(...r.ads.map((ad) => this.adCard(ad, wantBuy)));
  }

  private adCard(ad: Ad & { user: PublicUser }, wantBuy: boolean): HTMLElement {
    const form = h("div", { class: "p2p-take", hidden: true });
    const take = h("button", { class: "btn small " + (wantBuy ? "buy" : "sell"), type: "button" }, wantBuy ? this.t("Comprar", "Buy") : this.t("Vender", "Sell"));
    take.onclick = () => {
      if (!this.vault) {
        location.hash = "#/cuenta";
        return;
      }
      form.hidden = !form.hidden;
      if (!form.childElementCount) this.takeForm(ad, wantBuy, form);
    };
    const own = this.acct && ad.user_id.toLowerCase() === this.acct.address.toLowerCase();
    return h(
      "article",
      { class: "card p2p-ad" },
      h("div", { class: "p2p-ad-main" },
        h("div", {}, this.userLine(ad.user)),
        h("div", { class: "p2p-price" }, `${ad.price!.toLocaleString(this.lang)} `, h("small", {}, `${ad.fiat}/XMR`)),
        h("div", {}, h("small", {}, `${this.t("Límite", "Limit")}: ${ad.min_fiat} – ${ad.max_fiat} ${ad.fiat}`), h("br"), h("small", {}, `${this.t("Disponible", "Available")}: ${fmtXmr(ad.available_xmr)} XMR`)),
        h("div", { class: "p2p-tags" }, ad.methods.map((m) => this.methodTag(m))),
        h("div", {}, own ? h("small", {}, this.t("Tu anuncio", "Your ad")) : take),
      ),
      ad.terms ? h("p", { class: "p2p-terms" }, h("small", {}, ad.terms)) : null,
      form,
    );
  }

  private takeForm(ad: Ad, wantBuy: boolean, box: HTMLElement) {
    const out = h("div");
    const amount = h("input", { id: `p2p-amt-${ad.id}`, type: "text", inputMode: "decimal", placeholder: `${ad.min_fiat} – ${ad.max_fiat}` });
    const est = h("small", {});
    amount.oninput = () => {
      const n = Number(amount.value);
      est.textContent = n > 0 && ad.price ? `≈ ${fmtXmr(String(n / ad.price))} XMR` : "";
    };
    const method = h("select", { id: `p2p-m-${ad.id}` }, ad.methods.map((m, i) => h("option", { value: String(i) }, m.name + (m.reversible ? " ⚠" : ""))));
    const addr = h("input", { id: `p2p-addr-${ad.id}`, type: "text", spellcheck: false, autocomplete: "off", placeholder: MONERO.addressPrefixes[0] + "…" });
    const go = h("button", { class: "btn", type: "button" }, this.t("Abrir orden", "Open order"));
    go.onclick = () =>
      void this.busy(
        go,
        async () => {
          if (!this.me) throw new Error(this.t("Primero elige un apodo en Cuenta.", "First choose a nickname in Account."));
          const o = await this.req<OrderView>("POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: amount.value.trim(), method_index: Number(method.value), xmr_address: addr.value.trim() });
          location.hash = `#/orden/${o.id}`;
        },
        out,
      );
    box.replaceChildren(
      out,
      this.field(`${this.t(wantBuy ? "Vas a pagar" : "Vas a recibir", wantBuy ? "You pay" : "You receive")} (${ad.fiat})`, amount),
      est,
      this.field(this.t("Método de pago", "Payment method"), method),
      this.field(
        wantBuy ? this.t("Tu dirección de Monero (donde recibes el XMR)", "Your Monero address (where you get the XMR)") : this.t("Tu dirección de Monero para reembolsos", "Your Monero address for refunds"),
        addr,
        this.cfg.xmr_network === "stagenet" ? this.t("Red de prueba: dirección de stagenet (empieza con 5 o 7).", "Test network: stagenet address (starts with 5 or 7).") : undefined,
      ),
      wantBuy
        ? h("p", {}, h("small", {}, this.t("El vendedor deposita el XMR en un escrow 2 de 3. Tú pagas por fuera y él libera.", "The seller deposits the XMR into a 2-of-3 escrow. You pay off-platform and they release.")))
        : h("p", {}, h("small", {}, this.t(`Depositarás el XMR más la comisión del ${this.cfg.fee_bps / 100}% en un escrow 2 de 3. Libera solo cuando veas el dinero en tu cuenta.`, `You will deposit the XMR plus the ${this.cfg.fee_bps / 100}% fee into a 2-of-3 escrow. Release only when you see the money in your account.`))),
      h("p", {}, go),
    );
  }

  // ------------------------------------------------------------ crear anuncio

  private async newAdView() {
    const out = h("div");
    const side = h("select", { id: "na-side" }, h("option", { value: "sell" }, this.t("Quiero vender XMR", "I want to sell XMR")), h("option", { value: "buy" }, this.t("Quiero comprar XMR", "I want to buy XMR")));
    const fiat = this.fiatSelect(this.lang === "es" ? "MXN" : "USD", "na-fiat");
    const country = h("input", { id: "na-country", type: "text", maxLength: 2, placeholder: this.t("opcional", "optional") });
    const ptype = h("select", { id: "na-ptype" }, h("option", { value: "float" }, this.t("Flotante (mercado ± margen)", "Floating (market ± margin)")), h("option", { value: "fixed" }, this.t("Fijo", "Fixed")));
    const margin = h("input", { id: "na-margin", type: "text", inputMode: "decimal", value: "0" });
    const fixed = h("input", { id: "na-price", type: "text", inputMode: "decimal" });
    const marginF = this.field(this.t("Margen sobre el mercado (%)", "Margin over market (%)"), margin);
    const fixedF = this.field(this.t("Precio por XMR", "Price per XMR"), fixed);
    const mkt = h("small", {});
    fixedF.hidden = true;
    ptype.onchange = () => ((marginF.hidden = ptype.value !== "float"), (fixedF.hidden = ptype.value !== "fixed"));
    const min = h("input", { id: "na-min", type: "text", inputMode: "decimal", placeholder: "100" });
    const max = h("input", { id: "na-max", type: "text", inputMode: "decimal", placeholder: "5000" });
    const amount = h("input", { id: "na-amount", type: "text", inputMode: "decimal", placeholder: "1.5" });
    const windowMin = h("select", { id: "na-window" }, [15, 30, 45, 60, 120].map((n) => h("option", { value: String(n), selected: n === 30 }, `${n} min`)));
    const terms = h("textarea", { id: "na-terms", rows: 3, maxLength: 1000 });
    const minRev = h("input", { id: "na-minrev", type: "text", inputMode: "numeric", value: "0" });
    const addr = h("input", { id: "na-addr", type: "text", spellcheck: false, autocomplete: "off" });
    const addrF = this.field("", addr);
    const methodsBox = h("div", { class: "p2p-methods" });
    const chosen: (Method & { details?: string })[] = [];

    const renderChosen = () =>
      methodsBox.replaceChildren(
        ...chosen.map((m, i) => {
          const det = h("textarea", { id: `na-det-${i}`, rows: 2, maxLength: 500, value: m.details ?? this.saved(fiat.value, m.name)?.details ?? "", placeholder: this.t("Titular, CLABE / cuenta / correo…", "Holder, account / IBAN / email…") });
          det.oninput = () => (m.details = det.value);
          m.details = det.value;
          return h(
            "div",
            { class: "p2p-chosen" },
            h("div", { class: "row between" }, this.methodTag(m), h("button", { class: "btn secondary small", type: "button", onclick: () => (chosen.splice(i, 1), renderChosen()) }, "✕")),
            side.value === "sell" ? this.field(this.t("Tus datos para recibir el pago (se envían cifrados solo al comprador)", "Your details to get paid (sent encrypted only to the buyer)"), det) : null,
          );
        }),
      );
    const suggested = h("div", { class: "p2p-tags" });
    const loadMethods = async () => {
      const r = await get<{ suggested: Method[] }>(`/v1/p2p/methods?fiat=${fiat.value}`);
      suggested.replaceChildren(
        ...r.suggested.map((m) =>
          h("button", { type: "button", class: "p2p-tag btn-tag" + (m.reversible ? " rev" : ""), onclick: () => chosen.length < 5 && !chosen.some((c) => c.name === m.name) && (chosen.push({ ...m }), renderChosen()) }, `+ ${m.name}${m.country ? ` (${m.country})` : ""}${m.reversible ? " ⚠" : ""}`),
        ),
      );
      const p = await get<{ price: number }>(`/v1/p2p/price?fiat=${fiat.value}`).catch(() => null);
      mkt.textContent = p ? `${this.t("Mercado", "Market")}: 1 XMR ≈ ${p.price.toLocaleString(this.lang, { maximumFractionDigits: 2 })} ${fiat.value}` : "";
    };
    const kind = h("select", { id: "na-kind" }, KINDS.map((k) => h("option", { value: k }, this.kindName(k))));
    const cname = h("input", { id: "na-cname", type: "text", maxLength: 40, placeholder: this.t("Banco, app o PayPal…", "Bank, app or PayPal…") });
    const ccountry = h("input", { id: "na-ccountry", type: "text", maxLength: 2, placeholder: this.t("país", "country") });
    const cadd = h("button", { class: "btn secondary small", type: "button" }, this.t("Agregar", "Add"));
    cadd.onclick = () => {
      const name = cname.value.trim();
      if (name.length < 2 || chosen.length >= 5) return;
      chosen.push({ kind: kind.value, name, country: ccountry.value.toUpperCase() || undefined, reversible: kind.value === "card" || /paypal|revolut|mercado ?pago|venmo|cash ?app|card|tarjeta/i.test(name) });
      cname.value = "";
      renderChosen();
    };
    const syncSide = () => {
      addrF.querySelector("label")!.textContent =
        side.value === "sell" ? this.t("Tu dirección de Monero para reembolsos", "Your Monero address for refunds") : this.t("Tu dirección de Monero (donde recibes el XMR)", "Your Monero address (where you get the XMR)");
      amount.placeholder = side.value === "sell" ? "1.5" : "1.5";
      renderChosen();
    };
    side.onchange = syncSide;
    fiat.onchange = () => ((chosen.length = 0), renderChosen(), void loadMethods());

    const publish = h("button", { class: "btn big", type: "button" }, this.t("Publicar anuncio", "Post ad"));
    publish.onclick = () =>
      void this.busy(
        publish,
        async () => {
          if (!this.me) throw new Error(this.t("Primero elige un apodo en Cuenta.", "First choose a nickname in Account."));
          if (!chosen.length) throw new Error(this.t("Agrega al menos un método de pago.", "Add at least one payment method."));
          if (side.value === "sell" && chosen.some((m) => !m.details?.trim())) throw new Error(this.t("Escribe tus datos de pago para cada método.", "Enter your payment details for each method."));
          const body: Record<string, unknown> = {
            side: side.value,
            fiat: fiat.value,
            country: country.value.toUpperCase() || null,
            price_type: ptype.value,
            ...(ptype.value === "float" ? { margin_pct: Number(margin.value) } : { price: fixed.value.trim() }),
            min_fiat: min.value.trim(),
            max_fiat: max.value.trim(),
            amount_xmr: amount.value.trim(),
            methods: chosen.map(({ details: _d, ...m }) => m),
            pay_window_min: Number(windowMin.value),
            terms: terms.value,
            min_orders_reversible: Number(minRev.value) || 0,
            xmr_address: addr.value.trim(),
          };
          await this.req("POST", "/v1/p2p/ads", body);
          if (side.value === "sell") {
            for (const m of chosen) this.remember({ fiat: fiat.value, kind: m.kind, name: m.name, country: m.country ?? undefined, details: m.details!.trim() });
            await this.saveV();
          }
          location.hash = "#/anuncios";
        },
        out,
      );

    this.show(
      h("h2", {}, this.t("Publicar anuncio", "Post an ad")),
      out,
      h(
        "section",
        { class: "card p2p-form" },
        this.field(this.t("Tipo", "Type"), side),
        h("div", { class: "p2p-grid" }, this.field(this.t("Moneda", "Currency"), fiat), this.field(this.t("País (opcional)", "Country (optional)"), country)),
        h("div", { class: "p2p-grid" }, this.field(this.t("Precio", "Price"), ptype), marginF, fixedF),
        mkt,
        h("div", { class: "p2p-grid" }, this.field(this.t("Mínimo por orden", "Minimum per order"), min), this.field(this.t("Máximo por orden", "Maximum per order"), max, this.t(`Tope: equivalente a ${this.cfg.cap_usd} USD`, `Cap: ${this.cfg.cap_usd} USD equivalent`))),
        this.field(this.t("Cantidad total de XMR", "Total XMR amount"), amount),
        h("h3", {}, this.t("Métodos de pago (hasta 5)", "Payment methods (up to 5)")),
        h("p", {}, h("small", {}, this.t("Sugeridos:", "Suggested:"))),
        suggested,
        h("div", { class: "p2p-grid" }, this.field(this.t("Otro: tipo", "Other: type"), kind), this.field(this.t("Nombre", "Name"), cname), this.field(this.t("País", "Country"), ccountry), h("div", { class: "field app" }, h("label", {}, " "), cadd)),
        methodsBox,
        h("p", { class: "notice warn" }, this.t("⚠ PayPal, tarjetas y similares se pueden revertir después de que liberas. Úsalos solo con gente con historial.", "⚠ PayPal, cards and similar can be reversed after you release. Use them only with people who have a track record.")),
        h("div", { class: "p2p-grid" }, this.field(this.t("Tiempo para pagar", "Time to pay"), windowMin), this.field(this.t("Órdenes mínimas para métodos reversibles", "Minimum orders for reversible methods"), minRev)),
        this.field(this.t("Condiciones (opcional)", "Terms (optional)"), terms),
        addrF,
        h("p", {}, publish),
      ),
    );
    syncSide();
    await loadMethods();
  }

  private kindName(k: string) {
    const es: Record<string, string> = { bank: "Banco", wallet: "Billetera / app", cash: "Efectivo", card: "Tarjeta", giftcard: "Tarjeta de regalo", other: "Otro" };
    const en: Record<string, string> = { bank: "Bank", wallet: "Wallet / app", cash: "Cash", card: "Card", giftcard: "Gift card", other: "Other" };
    return (this.lang === "es" ? es : en)[k] ?? k;
  }

  private saved(fiat: string, name: string): SavedMethod | undefined {
    return this.vault?.methods.find((m) => m.fiat === fiat && m.name.toLowerCase() === name.toLowerCase());
  }
  private remember(m: SavedMethod) {
    const v = this.vault!;
    v.methods = [...v.methods.filter((x) => !(x.fiat === m.fiat && x.name.toLowerCase() === m.name.toLowerCase())), m];
  }

  // ------------------------------------------------------------ mis anuncios y órdenes

  private async myAdsView() {
    const r = await this.req<{ ads: Ad[] }>("GET", "/v1/p2p/my/ads");
    const row = (ad: Ad) => {
      const out = h("div");
      const set = (status: string, label: string) => {
        const b = h("button", { class: "btn secondary small", type: "button" }, label);
        b.onclick = () => void this.busy(b, async () => (await this.req("PATCH", `/v1/p2p/ads/${ad.id}`, { status }), this.route()), out);
        return b;
      };
      return h(
        "article",
        { class: "card p2p-ad" },
        out,
        h("div", { class: "p2p-ad-main" },
          h("strong", {}, ad.side === "sell" ? this.t("Vendes XMR", "You sell XMR") : this.t("Compras XMR", "You buy XMR")),
          h("div", { class: "p2p-price" }, ad.price ? `${ad.price.toLocaleString(this.lang)} ` : "—", h("small", {}, `${ad.fiat}/XMR`)),
          h("small", {}, `${ad.min_fiat} – ${ad.max_fiat} ${ad.fiat} · ${fmtXmr(ad.available_xmr)} XMR`),
          h("div", { class: "p2p-tags" }, ad.methods.map((m) => this.methodTag(m))),
          h("span", { class: "badge" + (ad.status === "active" ? " ok" : "") }, ({ active: this.t("Activo", "Active"), paused: this.t("En pausa", "Paused"), hidden: this.t("Oculto por soporte", "Hidden by support") } as Record<string, string>)[ad.status] ?? ad.status),
        ),
        h("p", { class: "row wrap" }, ad.status === "active" ? set("paused", this.t("Pausar", "Pause")) : set("active", this.t("Activar", "Activate")), set("closed", this.t("Cerrar", "Close"))),
      );
    };
    this.show(
      h("div", { class: "row between" }, h("h2", {}, this.t("Mis anuncios", "My ads")), h("a", { class: "btn small", href: "#/nuevo" }, this.t("Nuevo anuncio", "New ad"))),
      r.ads.length ? h("div", { class: "p2p-list" }, r.ads.map(row)) : h("p", {}, this.t("Aún no tienes anuncios.", "You have no ads yet.")),
    );
  }

  private statusName(s: string): string {
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

  private async ordersView() {
    const r = await this.req<{ orders: { id: string; role: string; status: string; fiat: string; fiat_amount: string; xmr: string; price: string; created_at: number }[] }>("GET", "/v1/p2p/my/orders");
    this.show(
      h("h2", {}, this.t("Mis órdenes", "My orders")),
      r.orders.length
        ? h(
            "div",
            { class: "p2p-list" },
            r.orders.map((o) =>
              h(
                "a",
                { class: "card p2p-orow", href: `#/orden/${o.id}` },
                h("strong", { class: o.role === "buyer" ? "buy" : "sell" }, o.role === "buyer" ? this.t("Compra", "Buy") : this.t("Venta", "Sell")),
                h("span", {}, `${fmtXmr(o.xmr)} XMR · ${o.fiat_amount} ${o.fiat}`),
                h("span", { class: "badge" }, this.statusName(o.status)),
                h("small", {}, new Date(o.created_at * 1000).toLocaleString(this.lang)),
              ),
            ),
          )
        : h("p", {}, this.t("Aún no tienes órdenes.", "You have no orders yet."), " ", h("a", { href: "#/" }, this.t("Ir al mercado", "Go to the market"))),
    );
  }

  // ------------------------------------------------------------ orden

  private async orderView(id: string) {
    const messages: RoomMessage[] = [];
    let after = 0;
    let adminEnc: string | null | undefined;
    const plain = new Map<number, string>();
    let paymentText: string | null = null;
    let note: EscrowNote = null;
    let noteErr = "";
    const chatBox = h("div", { class: "p2p-chat-log", "aria-live": "polite" });
    const head = h("div");
    const actions = h("div");
    const escrowBox = h("div");
    const out = h("div");
    const input = h("textarea", { id: "p2p-msg", rows: 2, maxLength: 2000, placeholder: this.t("Escribe un mensaje (cifrado)…", "Write a message (encrypted)…") });
    const send = h("button", { class: "btn small", type: "button" }, this.t("Enviar", "Send"));
    let o!: OrderView;

    const recipients = () => [o.buyer?.enc_pubkey, o.seller?.enc_pubkey, adminEnc ?? ""].filter(Boolean) as string[];
    send.onclick = () =>
      void this.busy(
        send,
        async () => {
          const txt = input.value.trim();
          if (!txt) return;
          await this.req("POST", `/v1/p2p/orders/${id}/messages`, { ciphertext: await seal(txt, recipients()) });
          input.value = "";
          await tick(false);
        },
        out,
      );

    const driver = () => {
      let d = this.drivers.get(id);
      if (!d)
        this.drivers.set(
          id,
          (d = new EscrowDriver(id, {
            vault: this.vault!,
            save: () => this.saveV(),
            post: (data) => this.req("POST", `/v1/p2p/orders/${id}/messages`, { protocol: data }),
            cfg: this.cfg,
            node: this.node,
          })),
        );
      return d;
    };

    const render = () => {
      const me = o.role;
      const cp = o.counterpart;
      const left = o.deadline_at ? o.deadline_at - nowS() : null;
      head.replaceChildren(
        h("div", { class: "row between wrap" },
          h("h2", {}, `${me === "buyer" ? this.t("Compras", "You buy") : this.t("Vendes", "You sell")} ${fmtXmr(o.xmr)} XMR`),
          h("span", { class: "badge" }, this.statusName(o.status)),
        ),
        h("dl", { class: "p2p-dl" },
          h("dt", {}, this.t("Monto", "Amount")), h("dd", {}, `${o.fiat_amount} ${o.fiat}`),
          h("dt", {}, this.t("Precio", "Price")), h("dd", {}, `${o.price} ${o.fiat}/XMR`),
          h("dt", {}, this.t("Método", "Method")), h("dd", {}, this.methodTag(o.method)),
          h("dt", {}, me === "buyer" ? this.t("Vendedor", "Seller") : this.t("Comprador", "Buyer")), h("dd", {}, this.userLine(cp)),
          me === "seller" ? [h("dt", {}, this.t("Comisión (0.5%)", "Fee (0.5%)")), h("dd", {}, `${fmtXmr(o.fee_xmr)} XMR`)] : null,
          left !== null && left > 0 ? [h("dt", {}, this.t("Tiempo restante", "Time left")), h("dd", { class: "p2p-timer" }, `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`)] : null,
          o.payout_txid ? [h("dt", {}, "Tx"), h("dd", {}, h("code", {}, o.payout_txid))] : null,
        ),
        this.steps(o) ?? "",
      );

      // Escrow y avisos
      const ek: Child[] = [];
      if (["setup", "awaiting_deposit", "releasing", "refunding", "resolving"].includes(o.status))
        ek.push(h("p", { class: "notice warn" }, this.t("Deja esta pestaña abierta: tu navegador firma su parte del escrow.", "Keep this tab open: your browser signs its part of the escrow.")));
      if (note?.kind === "deposit")
        ek.push(
          h("div", { class: "card p2p-deposit" },
            h("p", {}, h("strong", {}, this.t(`Deposita exactamente ${o.deposit_required_xmr} XMR`, `Deposit exactly ${o.deposit_required_xmr} XMR`))),
            h("p", {}, h("code", { class: "p2p-addr" }, note.address)),
            h("small", {}, this.t("Incluye el XMR de la orden, la comisión y una pequeña reserva para la comisión de red. Tu navegador calculó esta dirección.", "Includes the order XMR, the fee and a small reserve for the network fee. Your browser computed this address.")),
          ),
        );
      if (note?.kind === "mismatch") ek.push(h("p", { class: "notice danger" }, this.t("¡La dirección del escrow no coincide con la que calculó tu navegador! No deposites y abre una apelación.", "The escrow address does not match the one your browser computed! Do not deposit; open an appeal.")));
      if (note?.kind === "rejected") ek.push(h("p", { class: "notice danger" }, `${this.t("El árbitro rechazó el pago", "The arbiter rejected the payment")}: ${note.reason}`));
      if (note?.kind === "info" && note.text === "waiting_signature") ek.push(h("p", { class: "notice" }, this.t("Pago armado; esperando la segunda firma del árbitro…", "Payment built; waiting for the arbiter's second signature…")));
      if (noteErr) ek.push(h("p", { class: "notice danger" }, noteErr));
      if (o.status === "confirming") ek.push(h("p", { class: "notice" }, this.t("Depósito visto. Esperando 10 confirmaciones (~20 min).", "Deposit seen. Waiting for 10 confirmations (~20 min).")));
      if (me === "buyer" && ["awaiting_payment", "paid", "disputed"].includes(o.status))
        ek.push(
          h("div", { class: "card p2p-pay" },
            h("h3", {}, this.t("Datos de pago del vendedor", "Seller's payment details")),
            paymentText ? h("pre", {}, paymentText) : h("p", {}, this.t("Esperando que el vendedor los envíe…", "Waiting for the seller to send them…")),
            o.status === "awaiting_payment" ? h("small", {}, this.t("Paga exactamente el monto, desde una cuenta a tu nombre, y sin escribir «Monero» ni «XMR» en el concepto.", "Pay the exact amount, from an account in your name, and do not write “Monero” or “XMR” in the reference.")) : null,
          ),
        );
      escrowBox.replaceChildren(...(ek.filter(Boolean) as Node[]));

      // Acciones
      const act: HTMLElement[] = [];
      const btn = (label: string, cls: string, f: () => Promise<unknown>, confirmText?: string) => {
        const b = h("button", { class: `btn ${cls}`, type: "button" }, label);
        b.onclick = () => {
          if (confirmText && !confirm(confirmText)) return;
          void this.busy(b, async () => (await f(), await tick(false)), out);
        };
        return b;
      };
      const post = (action: string, body: Record<string, unknown> = {}) => this.req<OrderView>("POST", `/v1/p2p/orders/${id}/${action}`, body);
      if (me === "buyer" && o.status === "awaiting_payment")
        act.push(btn(this.t("Ya pagué", "I have paid"), "buy", () => post("paid"), this.t("¿Ya hiciste el pago completo? Marcarlo sin pagar es fraude.", "Have you made the full payment? Marking it without paying is fraud.")));
      if (me === "seller" && ["awaiting_payment", "paid", "disputed"].includes(o.status))
        act.push(btn(this.t("Liberar XMR", "Release XMR"), "sell", () => post("release"), this.t("¿Ya ves el dinero en TU cuenta? Libera solo si lo recibiste. No se puede deshacer.", "Do you see the money in YOUR account? Release only if you received it. This cannot be undone.")));
      const canCancel = me === "buyer" ? ["setup", "awaiting_deposit", "confirming", "awaiting_payment"].includes(o.status) : ["setup", "awaiting_deposit"].includes(o.status);
      if (canCancel) act.push(btn(this.t("Cancelar orden", "Cancel order"), "secondary", () => post("cancel"), this.t("¿Cancelar la orden?", "Cancel the order?")));
      if (o.status === "paid") {
        if (o.dispute_available_at && nowS() < o.dispute_available_at)
          act.push(h("small", {}, this.t(`Podrás apelar en ${Math.ceil((o.dispute_available_at - nowS()) / 60)} min.`, `You can appeal in ${Math.ceil((o.dispute_available_at - nowS()) / 60)} min.`)));
        else {
          const reason = h("textarea", { id: "p2p-reason", rows: 2, maxLength: 1000, placeholder: this.t("Qué pasó (mín. 5 caracteres)", "What happened (min. 5 characters)") });
          act.push(h("details", { class: "p2p-appeal" }, h("summary", {}, this.t("Apelar", "Appeal")), reason, btn(this.t("Abrir apelación", "Open appeal"), "secondary", () => post("dispute", { reason: reason.value }))));
        }
      }
      if (o.dispute) act.push(h("p", { class: "notice warn" }, `${this.t("Apelación", "Appeal")}: ${o.dispute.reason}${o.dispute.note ? ` — ${this.t("Resolución", "Decision")}: ${o.dispute.note}` : ""}`));
      if (["released", "resolved_buyer", "resolved_seller"].includes(o.status)) {
        const c = h("input", { id: "p2p-fb", type: "text", maxLength: 300, placeholder: this.t("Comentario (opcional)", "Comment (optional)") });
        act.push(h("div", { class: "row wrap" }, c, btn("👍", "secondary small", () => post("feedback", { positive: true, comment: c.value })), btn("👎", "secondary small", () => post("feedback", { positive: false, comment: c.value }))));
      }
      actions.replaceChildren(...act);

      // Chat
      chatBox.replaceChildren(
        ...messages
          .filter((m) => m.body.type !== "protocol")
          .map((m) => {
            if (m.body.type === "status") return h("p", { class: "p2p-sys" }, `• ${this.statusName(m.body.status ?? "")}`);
            if (m.body.type === "payment_details") return h("p", { class: "p2p-sys" }, `• ${this.t("El vendedor envió sus datos de pago", "The seller sent the payment details")}`);
            if (m.body.type !== "message") return h("p", { class: "p2p-sys" }, `• ${m.body.type}`);
            const who = m.from === me ? this.t("Tú", "You") : m.from === "admin" ? this.t("Soporte", "Support") : cp?.nickname ?? m.from;
            return h("div", { class: "p2p-msg " + (m.from === me ? "mine" : m.from === "admin" ? "admin" : "") }, h("small", {}, who), h("div", {}, plain.get(m.seq) ?? this.t("[no se pudo descifrar]", "[could not decrypt]")));
          }),
      );
    };

    const tick = async (schedule = true) => {
      try {
        o = await this.req<OrderView>("GET", `/v1/p2p/orders/${id}`);
        const r = await this.req<{ messages: RoomMessage[] }>("GET", `/v1/p2p/orders/${id}/messages?after=${after}`);
        for (const m of r.messages) {
          messages.push(m);
          after = Math.max(after, m.seq);
          if (m.body.type === "message" && m.body.ciphertext) plain.set(m.seq, await open(m.body.ciphertext, this.vault!).catch(() => this.t("[no se pudo descifrar]", "[could not decrypt]")));
        }
        if (adminEnc === undefined)
          adminEnc = this.cfg.admin_address ? ((await get<PublicUser>(`/v1/p2p/users/${this.cfg.admin_address}`).catch(() => null))?.enc_pubkey ?? null) : null;
        if (o.role === "buyer" && o.enc_payment && !paymentText) paymentText = await open(o.enc_payment, this.vault!).catch(() => null);
        // Vendedor: manda sus datos de pago guardados (cifrados) en cuanto el depósito está confirmado.
        if (o.role === "seller" && ["awaiting_payment", "paid"].includes(o.status) && !messages.some((m) => m.body.type === "payment_details")) {
          const s = this.saved(o.fiat, o.method.name);
          if (s) await this.req("POST", `/v1/p2p/orders/${id}/payment-details`, { enc_payment: await seal(`${o.method.name}\n${s.details}`, recipients()) });
          else if (!actions.querySelector("#p2p-paydet")) noteErr = this.t(`No tienes guardados tus datos de ${o.method.name}: escríbelos en el chat para el comprador.`, `You have no saved details for ${o.method.name}: write them in the chat for the buyer.`);
        }
        if (this.vault!.escrows[id] || o.status === "setup") {
          try {
            note = await driver().step(o, messages);
            noteErr = "";
          } catch (e) {
            noteErr = `${this.t("Escrow", "Escrow")}: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        if (["released", "cancelled", "refunded", "resolved_buyer", "resolved_seller"].includes(o.status) && this.drivers.has(id)) {
          await this.drivers.get(id)!.close();
          this.drivers.delete(id);
        }
        render();
      } catch (e) {
        out.replaceChildren(this.error(e));
      }
      if (schedule && location.hash === `#/orden/${id}`) this.timer = setTimeout(() => void tick(), o && ["setup", "releasing", "refunding", "resolving"].includes(o.status) ? 4000 : 8000);
    };

    this.show(
      out,
      head,
      escrowBox,
      actions,
      h("section", { class: "card p2p-chat" }, h("h3", {}, this.t("Chat (cifrado de punta a punta)", "Chat (end-to-end encrypted)")), chatBox, h("div", { class: "row" }, input, send), h("small", {}, this.t("Soporte puede leer el chat solo si hay una apelación.", "Support can read the chat only if there is an appeal."))),
    );
    await tick();
  }

  private steps(o: OrderView) {
    const order = ["setup", "awaiting_deposit", "confirming", "awaiting_payment", "paid", "releasing", "released"];
    const i = order.indexOf(o.status);
    const labels = this.lang === "es" ? ["Escrow", "Depósito", "Confirmación", "Pago", "Liberación", "Listo"] : ["Escrow", "Deposit", "Confirmation", "Payment", "Release", "Done"];
    const at = [0, 1, 2, 3, 4, 6];
    if (i < 0) return null;
    return h("ol", { class: "p2p-steps" }, labels.map((l, k) => h("li", { class: i >= at[k]! ? (i > at[k]! || o.status === "released" ? "done" : "now") : "" }, l)));
  }
}
