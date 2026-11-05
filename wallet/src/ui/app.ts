// Interfaz de la wallet (popup y pestaña). DOM simple, sin frameworks ni innerHTML con datos.
import qrcode from "qrcode-generator";
import { formatXmr, parseXmr } from "../core/amount";
import { lookalikeOf, parseAddress } from "../core/monero-address";
import {
  clearLocal,
  clearSession,
  getLocal,
  getSession,
  getSettings,
  inExtension,
  onLocked,
  saveSettings,
  setLocal,
  setSession,
  type Settings,
} from "../core/storage";
import { clearBlobs, deleteBlob, getSealed, pack, putSealed, unpack } from "../core/blobstore";
import { createVault, fromB64, MIN_PASSWORD, openJson, passwordScore, randomBytes, toB64, unlockVault, type VaultFile } from "../core/vault";
import * as engine from "./engine";
import { getLang, setLang, strength, t, type Key } from "./i18n";

declare const __VERSION__: string;

interface Snapshot {
  balance: string;
  unlocked: string;
  txs: engine.Tx[];
}
interface CacheMeta {
  recent: string[];
  savedAt: number;
  /** Último saldo y movimientos, para mostrarlos al instante mientras wallet2 abre. */
  snap?: Snapshot;
}

// ------------------------------------------------------------------ utilidades DOM

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k in el && k !== "list" && k !== "form") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c != null && c !== false) el.append(c);
  return el;
}

const root = document.getElementById("app")!;
function render(...nodes: Child[]): void {
  root.replaceChildren(...(nodes.filter(Boolean) as (Node | string)[]));
  root.querySelector<HTMLElement>("[autofocus]")?.focus();
}

function header(title: string, back?: () => void): HTMLElement {
  return h(
    "header",
    { class: "bar" },
    back ? h("button", { class: "icon", type: "button", "aria-label": t("back"), onclick: back }, "←") : h("span", { class: "logo", "aria-hidden": "true" }, "ɱ"),
    h("h1", {}, title),
    secret?.network === "stagenet" ? h("span", { class: "badge" }, t("stagenet_badge")) : null,
  );
}

function errorBox(): HTMLElement {
  return h("p", { class: "msg error", role: "alert", hidden: true });
}
function showError(box: HTMLElement, m: string): void {
  box.textContent = m;
  box.hidden = false;
}

function busy(label: string): void {
  render(h("div", { class: "center" }, h("div", { class: "spinner", "aria-hidden": "true" }), h("p", {}, label)));
}

async function copy(text: string, btn: HTMLButtonElement): Promise<void> {
  await navigator.clipboard.writeText(text);
  const old = btn.textContent;
  btn.textContent = t("copied");
  setTimeout(() => (btn.textContent = old), 1500);
}

function openUrl(url: string): void {
  const ext = (globalThis as { chrome?: typeof chrome }).chrome;
  if (inExtension && ext?.tabs) void ext.tabs.create({ url });
  else window.open(url, "_blank", "noopener,noreferrer");
}

function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 200 ? m.slice(0, 200) + "…" : m;
}

// ------------------------------------------------------------------ estado

let settings: Settings;
let vaultFile: VaultFile | undefined;
let secret: engine.Secret | null = null;
let sessionKey: Uint8Array | null = null;
let recent: string[] = [];
let syncPct = 0;
let syncError = false;
let syncBlocks = "";
let snapshot: Snapshot | null = null;
let opening = false;
let markReady: () => void = () => {};
let ready: Promise<void> = Promise.resolve();
let currentView: () => void = () => {};
let lastTouch = 0;
let saveTimer: ReturnType<typeof setInterval> | undefined;

const isTab = new URLSearchParams(location.search).get("view") === "tab";
document.documentElement.classList.toggle("tab", isTab);

function node(): string {
  const net = secret?.network ?? "mainnet";
  return settings.nodes[net] || engine.DEFAULT_NODES[net];
}

/** Avisa al fondo que hay actividad (reinicia el bloqueo automático). */
function touch(): void {
  const now = Date.now();
  if (now - lastTouch < 20_000) return;
  lastTouch = now;
  const ext = (globalThis as { chrome?: typeof chrome }).chrome;
  if (inExtension) void ext!.runtime.sendMessage({ type: "touch" }).catch(() => {});
}
addEventListener("pointerdown", touch, { passive: true });
addEventListener("keydown", touch, { passive: true });

let saving: Promise<void> | null = null;
/** Guarda el estado de wallet2 cifrado (en IndexedDB) para abrir rápido la próxima vez. */
async function saveCache(): Promise<void> {
  if (!sessionKey || !engine.isOpen()) return;
  if (saving) return saving;
  const key = sessionKey;
  saving = (async () => {
    const d = await engine.data();
    const i = await engine.info();
    const snap: Snapshot = { balance: i.balance, unlocked: i.unlocked, txs: (await engine.txs()).slice(0, 5) };
    const meta: CacheMeta = { recent, savedAt: Date.now(), snap };
    await putSealed(key, "cache", pack([d.keysData, d.cacheData, new TextEncoder().encode(JSON.stringify(meta))]));
  })().finally(() => (saving = null));
  return saving;
}

async function loadCache(): Promise<{ keysData: Uint8Array; cacheData: Uint8Array; meta: CacheMeta } | null> {
  if (!sessionKey) return null;
  try {
    const raw = await getSealed(sessionKey, "cache");
    if (!raw) return null;
    const [keysData, cacheData, meta] = unpack(raw);
    return { keysData, cacheData, meta: JSON.parse(new TextDecoder().decode(meta)) as CacheMeta };
  } catch {
    return null;
  }
}

/** Bloqueo inmediato: primero se borra la sesión y la pantalla; el caché ya se guarda solo cada 2 min. */
async function lockNow(): Promise<void> {
  clearInterval(saveTimer);
  secret = null;
  sessionKey = null;
  snapshot = null;
  unlockView();
  const ext = (globalThis as { chrome?: typeof chrome }).chrome;
  if (inExtension) await ext!.runtime.sendMessage({ type: "lock" }).catch(() => {});
  else await clearSession();
  await engine.closeWallet(false);
}

onLocked(() => {
  if (secret) {
    clearInterval(saveTimer);
    secret = null;
    sessionKey = null;
    snapshot = null;
    unlockView();
    void engine.closeWallet(false);
  }
});

// ------------------------------------------------------------------ inicio y bienvenida

async function start(): Promise<void> {
  settings = await getSettings();
  setLang(settings.lang);
  document.documentElement.lang = getLang();
  vaultFile = await getLocal("vaultFile");
  if (!vaultFile) return welcomeView();
  const k = await getSession("sessionKey");
  if (k) {
    try {
      const key = fromB64(k);
      secret = openJson<engine.Secret>(key, "vault", vaultFile.vault);
      sessionKey = key;
      touch();
      return void openAndSync();
    } catch {
      await clearSession();
    }
  }
  unlockView();
}

function welcomeView(): void {
  currentView = welcomeView;
  const net = h(
    "select",
    { id: "net" },
    h("option", { value: "mainnet" }, t("network_main")),
    h("option", { value: "stagenet" }, t("network_stage")),
  );
  render(
    h(
      "main",
      { class: "welcome" },
      h("div", { class: "hero" }, h("span", { class: "logo big", "aria-hidden": "true" }, "ɱ"), h("h1", {}, "MoneroP2P Wallet"), h("p", { class: "muted" }, t("tagline"))),
      h("button", { class: "primary block", type: "button", onclick: () => passwordView("create", net.value as engine.Net) }, t("create")),
      h("button", { class: "secondary block", type: "button", onclick: () => restoreView(net.value as engine.Net) }, t("restore")),
      h("details", { class: "adv" }, h("summary", {}, t("advanced")), h("label", {}, t("network"), net)),
      h("p", { class: "msg warn small" }, t("beta")),
    ),
  );
}

function passwordFields(): { box: HTMLElement; get: () => string | null; err: HTMLElement } {
  const p1 = h("input", { type: "password", autocomplete: "new-password", minLength: MIN_PASSWORD, required: true, autofocus: true });
  const p2 = h("input", { type: "password", autocomplete: "new-password", required: true });
  const meter = h("meter", { min: 0, max: 4, value: 0, low: 2, high: 3, optimum: 4 });
  const label = h("span", { class: "small muted" });
  p1.addEventListener("input", () => {
    const s = passwordScore(p1.value);
    meter.value = s;
    label.textContent = p1.value ? strength(s) : "";
  });
  const err = errorBox();
  const box = h(
    "div",
    {},
    h("label", {}, t("password"), p1),
    h("div", { class: "strength" }, meter, label),
    h("label", {}, t("password2"), p2),
    h("p", { class: "small muted" }, t("password_hint")),
    err,
  );
  return {
    box,
    err,
    get: () => {
      if (p1.value.length < MIN_PASSWORD) return showError(err, t("pw_short")), null;
      if (p1.value !== p2.value) return showError(err, t("pw_mismatch")), null;
      return p1.value;
    },
  };
}

function passwordView(mode: "create", network: engine.Net): void {
  const f = passwordFields();
  const form = h(
    "form",
    {
      onsubmit: (e: Event) => {
        e.preventDefault();
        const pw = f.get();
        if (pw) void createFlow(pw, network);
      },
    },
    f.box,
    h("button", { class: "primary block", type: "submit" }, t("continue")),
  );
  render(header(t("create"), welcomeView), h("main", {}, form));
  void mode;
}

async function createFlow(password: string, network: engine.Net): Promise<void> {
  busy(t("generating"));
  let seed: string;
  try {
    seed = await engine.generateSeed(network);
  } catch (e) {
    return render(header(t("create"), welcomeView), h("main", {}, h("p", { class: "msg error" }, t("error", { m: errText(e) }))));
  }
  seedView(seed, password, network);
}

function seedView(seed: string, password: string, network: engine.Net): void {
  const words = seed.split(" ");
  const ok = h("input", { type: "checkbox", id: "written" });
  const next = h("button", { class: "primary block", type: "button", disabled: true, onclick: () => seedCheckView(seed, password, network) }, t("continue"));
  ok.addEventListener("change", () => (next.disabled = !ok.checked));
  render(
    header(t("seed_title"), welcomeView),
    h(
      "main",
      {},
      h("p", { class: "msg warn" }, t("seed_warn")),
      h("ol", { class: "seed" }, ...words.map((w) => h("li", {}, w))),
      h("label", { class: "check" }, ok, t("seed_written")),
      next,
    ),
  );
}

function seedCheckView(seed: string, password: string, network: engine.Net): void {
  const words = seed.split(" ");
  const picks = new Set<number>();
  while (picks.size < 3) picks.add(Number(randomBytes(1)[0]) % words.length);
  const idx = [...picks].sort((a, b) => a - b);
  const inputs = idx.map((i) => h("input", { type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "off", required: true }));
  const err = errorBox();
  inputs[0].autofocus = true;
  render(
    header(t("seed_check"), () => seedView(seed, password, network)),
    h(
      "main",
      {},
      h("p", { class: "muted" }, t("seed_check_hint")),
      h(
        "form",
        {
          onsubmit: (e: Event) => {
            e.preventDefault();
            const good = idx.every((i, k) => inputs[k].value.trim().toLowerCase() === words[i]);
            if (!good) return showError(err, t("seed_check_fail"));
            void saveNewWallet(password, network, seed, null);
          },
        },
        ...idx.map((i, k) => h("label", {}, t("word_n", { n: i + 1 }), inputs[k])),
        err,
        h("button", { class: "primary block", type: "submit" }, t("continue")),
      ),
    ),
  );
}

function restoreView(network: engine.Net): void {
  const seedIn = h("textarea", { rows: 4, autocomplete: "off", spellcheck: false, autocapitalize: "off", required: true, autofocus: true });
  const date = h("input", { type: "date", max: new Date().toISOString().slice(0, 10) });
  const f = passwordFields();
  const err = errorBox();
  render(
    header(t("restore_title"), welcomeView),
    h(
      "main",
      {},
      h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            const words = seedIn.value.trim().toLowerCase().split(/\s+/);
            if (words.length !== 25) return showError(err, t("seed_words"));
            try {
              await engine.validateSeed(words.join(" "), network);
            } catch {
              return showError(err, t("seed_invalid"));
            }
            const pw = f.get();
            if (!pw) return;
            void saveNewWallet(pw, network, words.join(" "), date.value ? new Date(date.value + "T00:00:00Z").getTime() : 0);
          },
        },
        h("label", {}, t("seed_label"), seedIn),
        h("label", {}, t("restore_date"), date),
        h("p", { class: "small muted" }, t("restore_date_hint")),
        err,
        f.box,
        h("button", { class: "primary block", type: "submit" }, t("continue")),
      ),
    ),
  );
}

/** fromDate: null = wallet nueva (desde la altura actual); 0 = desde el principio; ms = fecha. */
async function saveNewWallet(password: string, network: engine.Net, seed: string, fromDate: number | null): Promise<void> {
  busy(t("saving"));
  try {
    const nodeUrl = settings.nodes[network] || engine.DEFAULT_NODES[network];
    let restoreHeight = 0;
    if (fromDate !== 0) {
      const tip = await engine.daemonHeight(nodeUrl);
      if (fromDate === null) restoreHeight = Math.max(0, tip - 5);
      else restoreHeight = Math.max(0, tip - Math.ceil((Date.now() - fromDate) / 120_000) - 720 * 3);
    }
    const s: engine.Secret = { network, seed, restoreHeight, walletPassword: toB64(randomBytes(24)), createdAt: Date.now() };
    const { file, key } = await createVault(password, s);
    await deleteBlob("cache");
    await setLocal({ vaultFile: file, network });
    vaultFile = file;
    secret = s;
    sessionKey = key;
    await setSession({ sessionKey: toB64(key) });
    lastTouch = 0;
    touch();
    void openAndSync();
  } catch (e) {
    render(header(t("create"), welcomeView), h("main", {}, h("p", { class: "msg error" }, t("error", { m: errText(e) })), h("button", { class: "secondary block", onclick: welcomeView }, t("back"))));
  }
}

function unlockView(): void {
  currentView = unlockView;
  const pw = h("input", { type: "password", autocomplete: "current-password", required: true, autofocus: true });
  const err = errorBox();
  const btn = h("button", { class: "primary block", type: "submit" }, t("unlock"));
  render(
    h(
      "main",
      { class: "welcome" },
      h("div", { class: "hero" }, h("span", { class: "logo big", "aria-hidden": "true" }, "ɱ"), h("h1", {}, t("unlock_title"))),
      h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            if (!vaultFile) return;
            btn.disabled = true;
            btn.textContent = "…";
            try {
              const r = await unlockVault<engine.Secret>(pw.value, vaultFile);
              secret = r.secret;
              sessionKey = r.key;
              await setSession({ sessionKey: toB64(r.key) });
              lastTouch = 0;
              touch();
              void openAndSync();
            } catch {
              btn.disabled = false;
              btn.textContent = t("unlock");
              pw.select();
              showError(err, t("wrong_pw"));
            }
          },
        },
        h("label", {}, t("password"), pw),
        err,
        btn,
      ),
    ),
  );
}

// ------------------------------------------------------------------ wallet abierta

async function openAndSync(): Promise<void> {
  busy(t("opening"));
  opening = true;
  ready = new Promise((r) => (markReady = r));
  try {
    const c = await loadCache();
    recent = c?.meta.recent ?? [];
    snapshot = c?.meta.snap ?? null;
    if (snapshot) homeView();
    await engine.openWallet(secret!, node(), c ? { keysData: c.keysData, cacheData: c.cacheData } : undefined);
  } catch (e) {
    opening = false;
    return render(header("MoneroP2P"), h("main", {}, h("p", { class: "msg error" }, t("error", { m: errText(e) })), h("button", { class: "secondary block", onclick: () => void openAndSync() }, "↻")));
  }
  opening = false;
  markReady();
  updateSyncBar();
  if (currentView === homeView) void fillHome();
  else if (!snapshot) homeView();
  void runSync();
  clearInterval(saveTimer);
  saveTimer = setInterval(() => void saveCache().catch(() => {}), 120_000);
}

async function runSync(): Promise<void> {
  syncError = false;
  try {
    await engine.sync(
      (pct, height, end) => {
        syncPct = Math.floor(pct * 100);
        syncBlocks = end > height ? `${height.toLocaleString(getLang())} / ${end.toLocaleString(getLang())}` : "";
        updateSyncBar();
      },
      () => refreshIfHome(),
    );
    syncPct = 100;
    updateSyncBar();
    refreshIfHome();
    await saveCache();
  } catch {
    if (!engine.isOpen()) return;
    syncError = true;
    updateSyncBar();
    setTimeout(() => engine.isOpen() && void runSync(), 15_000);
  }
}

function updateSyncBar(): void {
  const bar = document.getElementById("sync");
  if (!bar) return;
  bar.textContent = opening ? t("opening") : syncError ? t("sync_error") : syncPct >= 100 ? t("synced") : t("syncing", { pct: syncPct }) + (syncBlocks ? ` · ${syncBlocks}` : "");
  bar.className = `sync ${syncError ? "bad" : syncPct >= 100 ? "ok" : ""}`;
  const prog = document.getElementById("sync-prog") as HTMLProgressElement | null;
  if (prog) {
    prog.value = syncPct;
    prog.hidden = syncPct >= 100;
  }
}

let refreshQueued = false;
function refreshIfHome(): void {
  if (currentView !== homeView || refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    if (currentView === homeView) void fillHome();
  }, 500);
}

function siteLang(): "es" | "en" {
  return getLang() === "es" ? "es" : "en";
}
function fiatLang(): string {
  const l = (navigator.language || "en").slice(0, 2).toLowerCase();
  return ["es", "pt", "ru"].includes(l) ? l : "en";
}
const URLS = {
  swap: () => `https://monerop2p.app/${siteLang()}/app/`,
  fiat: () => `https://fiat.monerop2p.app/${fiatLang()}/app/`,
  buy: () => (siteLang() === "es" ? "https://monerop2p.app/es/comprar-monero/" : "https://monerop2p.app/en/buy-monero/"),
  guides: () => (siteLang() === "es" ? "https://monerop2p.app/es/guias/" : "https://monerop2p.app/en/guides/"),
};

async function buyWithUsdt(): Promise<void> {
  await ready;
  let url = URLS.swap();
  // El exchange acepta ?to= para precargar la dirección (solo red principal).
  if (secret?.network === "mainnet") {
    try {
      const sub = await engine.freshSubaddress(false, "swap");
      url += `?to=${encodeURIComponent(sub.address)}`;
    } catch {
      /* sin dirección precargada */
    }
  }
  openUrl(url);
}

function nav(active: string): HTMLElement {
  const item = (k: Key, icon: string, go: () => void) =>
    h("button", { type: "button", class: active === k ? "on" : "", "aria-current": active === k ? "page" : null, onclick: go }, h("span", { "aria-hidden": "true" }, icon), t(k));
  return h("nav", { class: "tabs" }, item("balance", "◎", homeView), item("explore", "⧉", exploreView), item("history", "≡", historyView), item("settings", "⚙", settingsView));
}

function topBar(): HTMLElement {
  return h(
    "header",
    { class: "bar" },
    h("span", { class: "logo", "aria-hidden": "true" }, "ɱ"),
    h("h1", {}, "MoneroP2P"),
    secret?.network === "stagenet" ? h("span", { class: "badge" }, t("stagenet_badge")) : null,
    h("span", { class: "spacer" }),
    !isTab && inExtension
      ? h("button", { class: "icon", type: "button", title: t("expand"), "aria-label": t("expand"), onclick: () => (openUrl(chrome.runtime.getURL("popup.html?view=tab")), window.close()) }, "⤢")
      : null,
    h("button", { class: "icon", type: "button", title: t("lock"), "aria-label": t("lock"), onclick: () => void lockNow() }, "🔒"),
  );
}

function homeView(): void {
  currentView = homeView;
  render(
    topBar(),
    h(
      "main",
      {},
      h(
        "section",
        { class: "balance card" },
        h("p", { class: "small muted" }, t("balance")),
        h("p", { class: "amount", id: "bal" }, "—"),
        h("p", { class: "small muted", id: "unl" }),
        h("p", { class: "small muted", id: "lockednote", hidden: true }, t("locked_note")),
        h("progress", { id: "sync-prog", max: 100, value: syncPct }),
        h("p", { id: "sync", class: "sync" }),
      ),
      h(
        "div",
        { class: "actions" },
        h("button", { class: "primary", type: "button", onclick: receiveView }, "↓ ", t("receive")),
        h("button", { class: "primary", type: "button", onclick: () => sendView() }, "↑ ", t("send")),
      ),
      h(
        "div",
        { class: "quick" },
        h("button", { type: "button", class: "quick-item", onclick: () => void buyWithUsdt() }, h("strong", {}, t("quick_usdt")), h("span", { class: "small muted" }, t("quick_usdt_hint"))),
        h("button", { type: "button", class: "quick-item", onclick: () => openUrl(URLS.fiat()) }, h("strong", {}, t("quick_fiat")), h("span", { class: "small muted" }, t("quick_fiat_hint"))),
      ),
      h("h2", {}, t("history")),
      h("ul", { class: "txs", id: "txs" }, h("li", { class: "muted small" }, "…")),
    ),
    nav("balance"),
  );
  updateSyncBar();
  void fillHome();
}

function showBalance(balance: string, unlocked: string): void {
  const bal = document.getElementById("bal");
  if (!bal) return;
  bal.textContent = `${formatXmr(balance, 6)} XMR`;
  document.getElementById("unl")!.textContent = balance !== unlocked ? t("unlocked", { v: formatXmr(unlocked, 6) }) : "";
  document.getElementById("lockednote")!.hidden = balance === unlocked;
}

async function fillHome(): Promise<void> {
  if (!engine.isOpen() || opening) {
    if (snapshot) {
      showBalance(snapshot.balance, snapshot.unlocked);
      document.getElementById("txs")?.replaceChildren(...txItems(snapshot.txs));
    }
    return;
  }
  try {
    const i = await engine.info();
    if (!document.getElementById("bal")) return;
    showBalance(i.balance, i.unlocked);
    const list = await engine.txs();
    const ul = document.getElementById("txs");
    if (ul) ul.replaceChildren(...txItems(list.slice(0, 5)));
  } catch {
    /* la wallet se está cerrando */
  }
}

function txItems(list: engine.Tx[]): HTMLElement[] {
  if (!list.length) return [h("li", { class: "muted small" }, t("no_txs"))];
  return list.map((tx) =>
    h(
      "li",
      { class: tx.incoming ? "in" : "out" },
      h("span", { class: "dir", "aria-hidden": "true" }, tx.incoming ? "↓" : "↑"),
      h(
        "span",
        { class: "what" },
        h("strong", {}, tx.incoming ? t("in") : t("out")),
        h("span", { class: "small muted" }, tx.pending ? t("pending") : tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString(getLang()) : `#${tx.height}`),
      ),
      h("span", { class: "val" }, `${tx.incoming ? "+" : "−"}${formatXmr(tx.amount, 6)}`, h("span", { class: "small muted" }, tx.confirmations < 10 ? t("confs", { n: tx.confirmations }) : "")),
    ),
  );
}

function historyView(): void {
  currentView = historyView;
  const ul = h("ul", { class: "txs" }, h("li", { class: "muted small" }, "…"));
  render(header(t("history")), h("main", {}, ul), nav("history"));
  if (snapshot && opening) ul.replaceChildren(...txItems(snapshot.txs));
  void ready.then(() => engine.txs()).then((l) => ul.replaceChildren(...txItems(l))).catch(() => {});
}

function qr(address: string): HTMLImageElement {
  const q = qrcode(0, "M");
  q.addData(`monero:${address}`);
  q.make();
  return h("img", { class: "qr", src: q.createDataURL(4, 8), alt: "QR", width: 200, height: 200 });
}

function receiveView(forceNew = false): void {
  currentView = () => receiveView();
  const box = h("div", { class: "receive" }, h("div", { class: "spinner", "aria-hidden": "true" }));
  render(header(t("receive_title"), homeView), h("main", {}, h("p", { class: "muted small" }, t("receive_hint")), box));
  void ready
    .then(() => engine.freshSubaddress(forceNew))
    .then((sub) => {
      // Guardar en segundo plano para que el índice de la subdirección no se repita.
      void saveCache().catch(() => {});
      const cp = h("button", { class: "primary", type: "button" }, t("copy"));
      cp.addEventListener("click", () => void copy(sub.address, cp));
      box.replaceChildren(
        qr(sub.address),
        h("p", { class: "addr", translate: "no" }, h("strong", {}, sub.address.slice(0, 6)), sub.address.slice(6, -6), h("strong", {}, sub.address.slice(-6))),
        h("div", { class: "actions" }, cp, h("button", { class: "secondary", type: "button", onclick: () => receiveView(true) }, t("new_address"))),
      );
    })
    .catch((e) => box.replaceChildren(h("p", { class: "msg error" }, t("error", { m: errText(e) }))));
}

function sendView(prefill?: { address: string; amount: string; all: boolean }): void {
  currentView = () => sendView();
  const net = secret!.network;
  const addr = h("textarea", { rows: 3, autocomplete: "off", spellcheck: false, autocapitalize: "off", required: true, autofocus: true, value: prefill?.address ?? "" });
  const amt = h("input", { type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "0.0", value: prefill?.amount ?? "" });
  const all = h("input", { type: "checkbox", checked: prefill?.all ?? false });
  all.addEventListener("change", () => (amt.disabled = all.checked));
  amt.disabled = all.checked;
  const warn = h("p", { class: "msg warn", hidden: true });
  const err = errorBox();
  addr.addEventListener("input", () => {
    const like = lookalikeOf(addr.value, recent);
    warn.textContent = like ? t("lookalike") : "";
    warn.hidden = !like;
  });
  const btn = h("button", { class: "primary block", type: "submit" }, t("review"));
  render(
    header(t("send_title"), homeView),
    h(
      "main",
      {},
      h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            err.hidden = true;
            await ready;
            const a = addr.value.trim();
            try {
              if (parseAddress(a).network !== net) throw new Error();
            } catch {
              return showError(err, t("bad_address", { net: net === "mainnet" ? "Monero" : "stagenet" }));
            }
            let amount: bigint | "all" = "all";
            if (!all.checked) {
              try {
                amount = parseXmr(amt.value);
              } catch {
                return showError(err, t("bad_amount"));
              }
              const i = await engine.info();
              if (amount > BigInt(i.unlocked)) return showError(err, t("not_enough"));
            }
            btn.disabled = true;
            btn.textContent = t("preparing");
            try {
              const p = await engine.prepare(a, amount);
              const own = (await engine.subaddresses()).some((s) => s.address === a) || (await engine.info()).address === a;
              confirmView(p, own, { address: a, amount: amt.value, all: all.checked });
            } catch (e) {
              btn.disabled = false;
              btn.textContent = t("review");
              showError(err, /not enough|insufficient|no unlocked/i.test(errText(e)) ? t("not_enough") : t("error", { m: errText(e) }));
            }
          },
        },
        h("label", {}, t("to"), addr),
        warn,
        h("label", {}, t("amount"), h("span", { class: "row" }, amt, h("label", { class: "check inline" }, all, t("max")))),
        err,
        btn,
      ),
    ),
  );
}

function confirmView(p: engine.Prepared, own: boolean, back: { address: string; amount: string; all: boolean }): void {
  currentView = () => sendView(back);
  const like = lookalikeOf(p.address, recent);
  const btn = h("button", { class: "primary block", type: "button" }, t("confirm_send"));
  const err = errorBox();
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = t("sending");
    try {
      await engine.relay(p);
      recent = [p.address, ...recent.filter((r) => r !== p.address)].slice(0, 20);
      await saveCache().catch(() => {});
      sentView(p.txid);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = t("confirm_send");
      showError(err, t("error", { m: errText(e) }));
    }
  });
  render(
    header(t("confirm_title"), () => sendView(back)),
    h(
      "main",
      {},
      h("p", { class: "muted small" }, t("confirm_hint")),
      h(
        "dl",
        { class: "summary card" },
        h("dt", {}, t("to")),
        h("dd", { class: "addr", translate: "no" }, h("strong", {}, p.address.slice(0, 6)), p.address.slice(6, -6), h("strong", {}, p.address.slice(-6))),
        h("dt", {}, t("amount")),
        h("dd", {}, `${formatXmr(p.amount)} XMR`),
        h("dt", {}, t("fee")),
        h("dd", {}, `${formatXmr(p.fee)} XMR`),
        h("dt", {}, t("total")),
        h("dd", {}, h("strong", {}, `${formatXmr(BigInt(p.amount) + BigInt(p.fee))} XMR`)),
      ),
      like ? h("p", { class: "msg error" }, t("lookalike")) : null,
      own ? h("p", { class: "msg warn" }, t("self_send")) : null,
      err,
      btn,
      h("button", { class: "secondary block", type: "button", onclick: () => sendView(back) }, t("cancel")),
    ),
  );
}

function sentView(txid: string): void {
  currentView = homeView;
  const cp = h("button", { class: "secondary", type: "button" }, t("copy"));
  cp.addEventListener("click", () => void copy(txid, cp));
  render(
    header(t("sent")),
    h(
      "main",
      { class: "center" },
      h("p", { class: "big-ok", "aria-hidden": "true" }, "✓"),
      h("p", {}, t("sent_hint")),
      h("p", { class: "small muted" }, t("txid")),
      h("p", { class: "addr small", translate: "no" }, txid),
      cp,
      h("button", { class: "primary block", type: "button", onclick: homeView }, t("done")),
    ),
  );
}

function exploreView(): void {
  currentView = exploreView;
  const card = (title: Key, desc: Key, url: () => string, host: string) =>
    h(
      "button",
      { type: "button", class: "site card", onclick: () => openUrl(url()) },
      h("span", { class: "site-top" }, h("strong", {}, t(title)), h("span", { class: "verified", title: t("verified") }, "✓ ", host)),
      h("span", { class: "small muted" }, t(desc)),
    );
  render(
    header(t("explore_title")),
    h(
      "main",
      {},
      h("p", { class: "muted small" }, t("explore_hint")),
      card("card_swap", "card_swap_d", URLS.swap, "monerop2p.app"),
      card("card_fiat", "card_fiat_d", URLS.fiat, "fiat.monerop2p.app"),
      card("card_buy", "card_buy_d", URLS.buy, "monerop2p.app"),
      card("card_guides", "card_guides_d", URLS.guides, "monerop2p.app"),
    ),
    nav("explore"),
  );
}

function settingsView(): void {
  currentView = settingsView;
  const net = secret!.network;
  const auto = h("select", {}, ...[5, 15, 30, 60].map((n) => h("option", { value: String(n), selected: settings.autolockMin === n }, t("minutes", { n }))));
  auto.addEventListener("change", async () => {
    settings.autolockMin = Number(auto.value);
    await saveSettings(settings);
    lastTouch = 0;
    touch();
  });
  const lang = h("select", {}, h("option", { value: "es", selected: getLang() === "es" }, "Español"), h("option", { value: "en", selected: getLang() === "en" }, "English"));
  lang.addEventListener("change", async () => {
    settings.lang = lang.value as "es" | "en";
    setLang(settings.lang);
    document.documentElement.lang = settings.lang;
    await saveSettings(settings);
    settingsView();
  });
  const nodeIn = h("input", { type: "url", value: node(), spellcheck: false });
  const nodeMsg = h("p", { class: "small", role: "status" });
  const saveNode = h("button", { class: "secondary", type: "button" }, t("node_save"));
  saveNode.addEventListener("click", () => {
    let u: URL;
    try {
      u = new URL(nodeIn.value.trim());
      const local = u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
      if (u.protocol !== "https:" && !local) throw new Error();
    } catch {
      nodeMsg.textContent = t("node_bad");
      return;
    }
    const origin = `${u.protocol}//${u.hostname}/*`;
    const ext = (globalThis as { chrome?: typeof chrome }).chrome;
    // permissions.request tiene que llamarse directo en el clic, sin await antes.
    const ask: Promise<boolean> = inExtension && ext?.permissions ? ext.permissions.request({ origins: [origin] }) : Promise.resolve(true);
    void ask.then(async (granted) => {
      if (!granted) return void (nodeMsg.textContent = t("node_denied"));
      settings.nodes[net] = u.origin + u.pathname.replace(/\/$/, "");
      await saveSettings(settings);
      await engine.setNode(node()).catch(() => {});
      nodeMsg.textContent = t("saved");
    });
  });
  const resetNode = h(
    "button",
    {
      class: "link",
      type: "button",
      onclick: async () => {
        delete settings.nodes[net];
        await saveSettings(settings);
        nodeIn.value = node();
        await engine.setNode(node()).catch(() => {});
        nodeMsg.textContent = t("saved");
      },
    },
    t("node_reset"),
  );

  const seedBox = h("div", {});
  const seedPw = h("input", { type: "password", autocomplete: "current-password" });
  const seedErr = errorBox();
  const seedBtn = h("button", { class: "secondary", type: "button" }, t("show_seed"));
  seedBtn.addEventListener("click", async () => {
    if (!vaultFile) return;
    seedBtn.disabled = true;
    try {
      const r = await unlockVault<engine.Secret>(seedPw.value, vaultFile);
      r.key.fill(0);
      seedPw.value = "";
      seedBox.replaceChildren(h("ol", { class: "seed" }, ...r.secret.seed.split(" ").map((w) => h("li", {}, w))), h("p", { class: "small muted" }, `${t("restore_height")}: ${r.secret.restoreHeight}`));
    } catch {
      showError(seedErr, t("wrong_pw"));
    } finally {
      seedBtn.disabled = false;
    }
  });

  const del = h("input", { type: "text", autocomplete: "off" });
  const delBtn = h("button", { class: "danger", type: "button" }, t("delete_wallet"));
  delBtn.addEventListener("click", async () => {
    if (del.value.trim().toUpperCase() !== t("delete_word")) return;
    clearInterval(saveTimer);
    await engine.closeWallet(false);
    await clearLocal();
    await clearBlobs().catch(() => {});
    await clearSession();
    secret = null;
    sessionKey = null;
    vaultFile = undefined;
    settings = await getSettings();
    welcomeView();
  });

  const primary = h("p", { class: "addr small", translate: "no" }, "…");
  void ready.then(() => engine.info()).then((i) => (primary.textContent = i.address)).catch(() => {});

  render(
    header(t("settings_title")),
    h(
      "main",
      { class: "settings" },
      h("label", {}, t("autolock"), auto),
      h("label", {}, t("language"), lang),
      h("section", { class: "card" }, h("h2", {}, t("node")), h("p", { class: "small muted" }, t("node_hint")), nodeIn, h("div", { class: "row" }, saveNode, resetNode), nodeMsg),
      h("section", { class: "card" }, h("h2", {}, t("primary_address")), primary),
      h("section", { class: "card" }, h("h2", {}, t("show_seed")), h("p", { class: "small muted" }, t("show_seed_hint")), seedPw, seedErr, seedBtn, seedBox),
      h("section", { class: "card danger-zone" }, h("h2", {}, t("delete_wallet")), h("p", { class: "small muted" }, t("delete_hint")), del, delBtn),
      h("p", { class: "small muted" }, `${t("version")} ${__VERSION__} · ${net}`),
    ),
    nav("settings"),
  );
}

// Guardar al ocultar el popup o cerrar la pestaña (mejor esfuerzo).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void saveCache().catch(() => {});
});

void start();
