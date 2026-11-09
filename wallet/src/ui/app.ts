// Interfaz de la wallet (popup y pestaña). DOM simple, sin frameworks ni innerHTML con datos.
import qrcode from "qrcode-generator";
import { formatXmr, parseXmr } from "../core/amount";
import { FEE_ADDRESS, feePercentLabel } from "../core/fee";
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
import * as evm from "./evm-engine";
import { CHAINS, deriveEvmKey, formatUnitsShort, isEvmAddress, parseUnitsStrict, TOKEN_DECIMALS } from "../core/evm";
import { checkTypedData, type EvmTxParams, type PendingRequest, type TypedData } from "../core/provider";
import { getLang, setLang, strength, t, type Key } from "./i18n";
import * as swap from "../core/swap";

declare const __VERSION__: string;

interface Snapshot {
  balance: string;
  unlocked: string;
  txs: engine.Tx[];
}
interface CacheMeta {
  recent: string[];
  /** Intercambios vía Trocador que la wallet sigue (van cifrados con el resto del caché). */
  swaps?: swap.SwapRef[];
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

/** Error con un texto ya pensado para el usuario (se muestra tal cual). */
class UserError extends Error {}

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
let swaps: swap.SwapRef[] = [];
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

const params = new URLSearchParams(location.search);
const isTab = params.get("view") === "tab";
const approveId = params.get("view") === "approve" ? params.get("id") : null;
document.documentElement.classList.toggle("tab", isTab);
document.documentElement.classList.toggle("approve", !!approveId);

/** Mensaje al fondo de la extensión (null fuera de la extensión). */
async function bg<T>(msg: Record<string, unknown>): Promise<T | null> {
  const ext = (globalThis as { chrome?: typeof chrome }).chrome;
  if (!inExtension || !ext?.runtime) return null;
  return (await ext.runtime.sendMessage(msg).catch(() => null)) as T | null;
}

// ------------------------------------------------------------------ cuenta de Arbitrum

let evmReady: Promise<string | null> = Promise.resolve(null);

/**
 * Carga la cuenta de Arbitrum. La llave se deriva una vez de la llave de gasto de Monero y se guarda
 * cifrada con la llave de la bóveda; la dirección (pública) va a la sesión para que el fondo
 * responda eth_accounts sin tocar llaves.
 */
function loadEvm(): Promise<string | null> {
  const key = sessionKey;
  const s = secret;
  if (!key || !s) return (evmReady = Promise.resolve(null));
  evmReady = (async () => {
    let hex: string;
    const sealed = await getSealed(key, "evm");
    if (sealed) hex = new TextDecoder().decode(sealed);
    else {
      hex = deriveEvmKey(await engine.spendKey(s.seed, s.network));
      await putSealed(key, "evm", new TextEncoder().encode(hex));
    }
    if (sessionKey !== key) return null; // se bloqueó mientras tanto
    const a = evm.load(hex as `0x${string}`, s.network);
    await setSession({ evmAddress: a });
    return a;
  })().catch(() => null);
  return evmReady;
}

/** Guarda cuántas subdirecciones hay, para que la ventana de aprobación no repita índices. */
async function syncSubNext(): Promise<void> {
  const n = await engine.subaddressCount();
  if (((await getLocal("subNext")) ?? 1) < n) await setLocal({ subNext: n });
}

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
    const meta: CacheMeta = { recent, swaps, savedAt: Date.now(), snap };
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
  evm.unload();
  unlockView();
  const ext = (globalThis as { chrome?: typeof chrome }).chrome;
  if (inExtension) await ext!.runtime.sendMessage({ type: "lock" }).catch(() => {});
  else await clearSession();
  await engine.closeWallet(false);
}

onLocked(() => {
  if (approveId) return window.close(); // cerrar la ventana equivale a rechazar
  if (secret) {
    evm.unload();
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
  if (approveId) return approveStart(approveId);
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
  // La cuenta de Arbitrum primero: el inicio la espera (evmReady) aunque se dibuje desde el caché.
  void loadEvm();
  try {
    const c = await loadCache();
    recent = c?.meta.recent ?? [];
    swaps = swap.prune(c?.meta.swaps ?? []);
    snapshot = c?.meta.snap ?? null;
    if (snapshot) homeView();
    await engine.openWallet(secret!, node(), c ? { keysData: c.keysData, cacheData: c.cacheData } : undefined);
    // Que wallet2 vigile también las subdirecciones que se dieron a sitios desde la ventana de aprobación.
    const next = (await getLocal("subNext")) ?? 1;
    const n = await engine.ensureSubaddresses(next);
    if (n !== next) await setLocal({ subNext: n });
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
      await syncSubNext();
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
  return h(
    "nav",
    { class: "tabs" },
    item("balance", "◎", homeView),
    item("swap", "⇄", () => swapView()),
    item("explore", "⧉", exploreView),
    item("history", "≡", historyView),
    item("settings", "⚙", settingsView),
  );
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
        "section",
        { class: "card arb" },
        h("strong", {}, CHAINS[secret!.network].name),
        h("span", { class: "small muted" }, t("arb_hint")),
        h("p", { class: "arb-bal", id: "arb-bal" }, "…"),
        h(
          "div",
          { class: "actions" },
          h("button", { class: "secondary", type: "button", onclick: evmReceiveView }, "↓ ", t("receive")),
          h("button", { class: "secondary", type: "button", onclick: () => evmSendView() }, "↑ ", t("send")),
        ),
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
  void fillArb();
}

async function fillArb(): Promise<void> {
  const el = document.getElementById("arb-bal");
  if (!el) return;
  if (!(await evmReady)) return void (el.textContent = t("arb_offline"));
  try {
    const b = await evm.balances();
    el.replaceChildren(
      h("span", {}, h("strong", {}, formatUnitsShort(b.token, TOKEN_DECIMALS, 2)), ` ${evm.chain().tokenSymbol}`),
      h("span", {}, h("strong", {}, formatUnitsShort(b.eth, 18, 6)), " ETH"),
    );
  } catch {
    el.textContent = t("arb_offline");
  }
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

function qr(address: string, scheme = "monero:"): HTMLImageElement {
  const q = qrcode(0, "M");
  q.addData(`${scheme}${address}`);
  q.make();
  return h("img", { class: "qr", src: q.createDataURL(4, 8), alt: "QR", width: 200, height: 200 });
}

function receiveView(forceNew = false): void {
  currentView = () => receiveView();
  const box = h("div", { class: "receive" }, h("div", { class: "spinner", "aria-hidden": "true" }));
  render(header(t("receive_title"), homeView), h("main", {}, h("p", { class: "muted small" }, t("receive_hint")), box));
  void ready
    .then(() => engine.freshSubaddress(forceNew))
    .then(async (sub) => {
      await syncSubNext();
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
              // Envíos a una dirección de esta misma wallet no pagan comisión de MoneroP2P.
              const own = (await engine.subaddresses()).some((s) => s.address === a) || (await engine.info()).address === a;
              const p = await engine.prepare(a, amount, own ? null : FEE_ADDRESS[net]);
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
        FEE_ADDRESS[net] ? h("p", { class: "small muted" }, t("fee_note", { pct: feePercentLabel() })) : null,
        err,
        btn,
      ),
    ),
  );
}

function confirmView(p: engine.Prepared, own: boolean, back: { address: string; amount: string; all: boolean }, after?: { done: (txid: string) => void; cancel: () => void }): void {
  const goBack = after ? after.cancel : () => sendView(back);
  currentView = goBack;
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
      if (after) after.done(p.txid);
      else sentView(p.txid);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = t("confirm_send");
      showError(err, t("error", { m: errText(e) }));
    }
  });
  render(
    header(t("confirm_title"), goBack),
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
        BigInt(p.platformFee) > 0n ? h("dt", {}, t("platform_fee", { pct: feePercentLabel() })) : null,
        BigInt(p.platformFee) > 0n ? h("dd", {}, `${formatXmr(p.platformFee)} XMR`) : null,
        h("dt", {}, t("total")),
        h("dd", {}, h("strong", {}, `${formatXmr(BigInt(p.amount) + BigInt(p.fee) + BigInt(p.platformFee))} XMR`)),
      ),
      like ? h("p", { class: "msg error" }, t("lookalike")) : null,
      own ? h("p", { class: "msg warn" }, t("self_send")) : null,
      err,
      btn,
      h("button", { class: "secondary block", type: "button", onclick: goBack }, t("cancel")),
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

// ------------------------------------------------------------------ Arbitrum: recibir y enviar

function evmReceiveView(): void {
  currentView = evmReceiveView;
  const box = h("div", { class: "receive" }, h("div", { class: "spinner", "aria-hidden": "true" }));
  const c = CHAINS[secret!.network];
  render(header(t("arb_receive_title"), homeView), h("main", {}, h("p", { class: "msg warn small" }, t("arb_receive_warn", { token: c.tokenSymbol, net: c.name })), box));
  void evmReady.then((a) => {
    if (!a) return box.replaceChildren(h("p", { class: "msg error" }, t("arb_offline")));
    const cp = h("button", { class: "primary", type: "button" }, t("copy"));
    cp.addEventListener("click", () => void copy(a, cp));
    box.replaceChildren(qr(a, ""), h("p", { class: "addr", translate: "no" }, h("strong", {}, a.slice(0, 6)), a.slice(6, -4), h("strong", {}, a.slice(-4))), cp);
  });
}

interface EvmDraft {
  asset: "token" | "eth";
  to: string;
  amount: string;
}

function evmSendView(prefill?: EvmDraft): void {
  currentView = () => evmSendView();
  const c = CHAINS[secret!.network];
  const asset = h(
    "select",
    {},
    h("option", { value: "token", selected: prefill?.asset !== "eth" }, c.tokenSymbol),
    h("option", { value: "eth", selected: prefill?.asset === "eth" }, "ETH"),
  );
  const to = h("input", { type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "off", required: true, autofocus: true, placeholder: "0x…", value: prefill?.to ?? "" });
  const amt = h("input", { type: "text", inputMode: "decimal", autocomplete: "off", required: true, placeholder: "0.0", value: prefill?.amount ?? "" });
  const warn = h("p", { class: "msg warn", hidden: true });
  to.addEventListener("input", () => {
    const like = lookalikeOf(to.value.trim(), recent);
    warn.textContent = like ? t("lookalike") : "";
    warn.hidden = !like;
  });
  const err = errorBox();
  const btn = h("button", { class: "primary block", type: "submit" }, t("review"));
  render(
    header(t("arb_send_title"), homeView),
    h(
      "main",
      {},
      h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            err.hidden = true;
            const a = to.value.trim();
            if (!isEvmAddress(a)) return showError(err, t("bad_evm_address"));
            const kind = asset.value as "token" | "eth";
            let amount: bigint;
            try {
              amount = parseUnitsStrict(amt.value, kind === "eth" ? 18 : TOKEN_DECIMALS);
            } catch {
              return showError(err, t("bad_amount"));
            }
            btn.disabled = true;
            btn.textContent = t("preparing");
            try {
              if (!(await evmReady)) throw new UserError(t("arb_offline"));
              const b = await evm.balances();
              if ((kind === "eth" ? b.eth : b.token) < amount) throw new UserError(t("not_enough"));
              const p = await evm.prepareSend(kind, a, amount);
              if (b.eth < p.estNetworkFee + (kind === "eth" ? amount : 0n)) throw new UserError(t("need_eth", { net: c.name }));
              evmConfirmView(p, { asset: kind, to: a, amount: amt.value });
            } catch (e) {
              btn.disabled = false;
              btn.textContent = t("review");
              const m = errText(e);
              showError(err, e instanceof UserError ? m : /insufficient funds/i.test(m) ? t("need_eth", { net: c.name }) : t("error", { m }));
            }
          },
        },
        h("label", {}, t("asset"), asset),
        h("label", {}, t("to"), to),
        warn,
        h("label", {}, t("amount_plain"), amt),
        err,
        btn,
      ),
    ),
  );
}

function evmConfirmView(p: evm.PreparedEvm, back: EvmDraft, after?: { done: (hash: string) => void; cancel: () => void }): void {
  const goBack = after ? after.cancel : () => evmSendView(back);
  currentView = goBack;
  const c = CHAINS[secret!.network];
  const token = back.asset === "token";
  const amount = token ? parseUnitsStrict(back.amount, TOKEN_DECIMALS) : p.value;
  const like = lookalikeOf(back.to, recent);
  const err = errorBox();
  const btn = h("button", { class: "primary block", type: "button" }, t("confirm_send"));
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = t("sending");
    try {
      const hash = await evm.send(p);
      recent = [back.to, ...recent.filter((r) => r !== back.to)].slice(0, 20);
      void saveCache().catch(() => {});
      if (after) after.done(hash);
      else evmSentView(hash);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = t("confirm_send");
      showError(err, t("error", { m: errText(e) }));
    }
  });
  render(
    header(t("confirm_title"), goBack),
    h(
      "main",
      {},
      h("p", { class: "muted small" }, t("confirm_hint")),
      h(
        "dl",
        { class: "summary card" },
        h("dt", {}, t("to")),
        h("dd", { class: "addr", translate: "no" }, h("strong", {}, back.to.slice(0, 6)), back.to.slice(6, -4), h("strong", {}, back.to.slice(-4))),
        h("dt", {}, t("amount")),
        h("dd", {}, h("strong", {}, `${formatUnitsShort(amount, token ? TOKEN_DECIMALS : 18, token ? 6 : 8)} ${token ? c.tokenSymbol : "ETH"}`)),
        h("dt", {}, t("net_fee_est")),
        h("dd", {}, `${formatUnitsShort(p.estNetworkFee, 18, 8)} ETH`),
        h("dd", { class: "small muted wide" }, t("net_fee_max", { v: formatUnitsShort(p.maxNetworkFee, 18, 8) })),
        h("dt", {}, t("network")),
        h("dd", {}, c.name),
      ),
      like ? h("p", { class: "msg error" }, t("lookalike")) : null,
      err,
      btn,
      h("button", { class: "secondary block", type: "button", onclick: goBack }, t("cancel")),
    ),
  );
}

function evmSentView(hash: string): void {
  currentView = homeView;
  render(
    header(t("sent")),
    h(
      "main",
      { class: "center" },
      h("p", { class: "big-ok", "aria-hidden": "true" }, "✓"),
      h("p", { class: "small muted" }, t("txid")),
      h("p", { class: "addr small", translate: "no" }, hash),
      h("button", { class: "secondary", type: "button", onclick: () => openUrl(evm.explorerTx(hash)) }, t("view_explorer")),
      h("button", { class: "primary block", type: "button", onclick: homeView }, t("done")),
    ),
  );
}

// ------------------------------------------------------------------ Cambiar (swaps vía Trocador)

let swapSide: swap.SwapSide = "buy";
let swapCoinKey = swap.coinKey(swap.SWAP_COINS[0]!);
let swapAmount = "";
/** Consulta periódica del estado mientras la vista del intercambio está abierta. */
let swapPoll: ReturnType<typeof setInterval> | undefined;

function swapCoin(): swap.SwapCoin {
  return swap.SWAP_COINS.find((c) => swap.coinKey(c) === swapCoinKey) ?? swap.SWAP_COINS[0]!;
}

function swapErr(e: unknown): string {
  const m = errText(e);
  return m === "network" ? t("swap_net_error") : t("error", { m });
}

function stopSwapPoll(): void {
  if (swapPoll) clearInterval(swapPoll);
  swapPoll = undefined;
}

function swapView(): void {
  stopSwapPoll();
  currentView = () => swapView();
  if (secret!.network !== "mainnet") {
    render(header(t("swap_title")), h("main", {}, h("p", { class: "msg warn" }, t("swap_mainnet_only"))), nav("swap"));
    return;
  }
  const sideBtn = (s: swap.SwapSide, k: Key) =>
    h("button", { type: "button", class: swapSide === s ? "on" : "", "aria-pressed": swapSide === s ? "true" : "false", onclick: () => ((swapSide = s), swapView()) }, t(k));
  const coin = h("select", {}, ...swap.SWAP_COINS.map((c) => h("option", { value: swap.coinKey(c), selected: swap.coinKey(c) === swapCoinKey }, c.label)));
  const unit = () => (swapSide === "buy" ? swapCoin().ticker.toUpperCase() : "XMR");
  const amtLabel = h("span", {}, t("swap_amount_in", { coin: unit() }));
  coin.addEventListener("change", () => {
    swapCoinKey = coin.value;
    amtLabel.textContent = t("swap_amount_in", { coin: unit() });
  });
  const amt = h("input", { type: "text", inputMode: "decimal", autocomplete: "off", required: true, placeholder: swapSide === "buy" ? "50" : "0.5", value: swapAmount });
  const err = errorBox();
  const list = h("ul", { class: "quotes" });
  const btn = h("button", { class: "primary block", type: "submit" }, t("swap_quotes"));
  const mine = swaps.length
    ? h(
        "section",
        {},
        h("h2", {}, t("swap_active")),
        h(
          "ul",
          { class: "txs" },
          ...swaps.map((r) => {
            const c = swap.findCoin(r.ticker, r.network);
            const pair = r.side === "buy" ? `${r.amount} ${r.ticker.toUpperCase()} → XMR` : `${r.amount} XMR → ${r.ticker.toUpperCase()}`;
            return h(
              "li",
              { class: "swap-item", role: "button", tabindex: 0, onclick: () => void swapTradeView(r.id), onkeydown: (e: KeyboardEvent) => e.key === "Enter" && void swapTradeView(r.id) },
              h("span", { class: "dir", "aria-hidden": "true" }, "⇄"),
              h("span", { class: "what" }, h("strong", {}, pair), h("span", { class: "small muted" }, c?.label ?? r.network)),
              h("span", { class: "val small" }, swapStatusLabel(r.status ?? "new", r.side === "buy" ? "XMR" : r.ticker.toUpperCase())),
            );
          }),
        ),
      )
    : null;
  render(
    header(t("swap_title")),
    h(
      "main",
      {},
      h("div", { class: "seg" }, sideBtn("buy", "swap_buy"), sideBtn("sell", "swap_sell")),
      h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            err.hidden = true;
            const a = swap.cleanAmount(amt.value);
            if (!a) return showError(err, t("swap_bad_amount"));
            swapAmount = a;
            const c = swapCoin();
            btn.disabled = true;
            btn.textContent = t("swap_loading");
            list.replaceChildren();
            try {
              const r = await swap.rates(a, c, swapSide);
              if (!r.quotes.length) return showError(err, t("swap_no_quotes"));
              const gets = swapSide === "buy" ? "XMR" : c.ticker.toUpperCase();
              list.replaceChildren(
                ...r.quotes.slice(0, 6).map((q, i) =>
                  h(
                    "li",
                    { class: i === 0 ? "quote best" : "quote" },
                    h(
                      "span",
                      { class: "what" },
                      h("strong", {}, t("swap_get", { v: fmtSwap(q.amount_to, gets), coin: gets })),
                      h(
                        "span",
                        { class: "small muted" },
                        [q.provider, q.fixed ? t("swap_fixed") : t("swap_float"), t("swap_kyc", { r: q.kycrating }), q.eta ? t("swap_eta", { n: q.eta }) : ""].filter(Boolean).join(" · "),
                      ),
                      i === 0 ? h("span", { class: "small verified" }, t("swap_best")) : null,
                    ),
                    h("button", { class: "secondary", type: "button", onclick: () => swapReviewView(r, q, c) }, t("swap_choose")),
                  ),
                ),
              );
            } catch (e) {
              showError(err, swapErr(e));
            } finally {
              btn.disabled = false;
              btn.textContent = t("swap_quotes");
            }
          },
        },
        h("label", {}, t("swap_coin"), coin),
        h("label", {}, amtLabel, amt),
        err,
        btn,
      ),
      list,
      h("p", { class: "small muted" }, t("swap_privacy")),
      mine,
    ),
    nav("swap"),
  );
}

/** Monto para mostrar: XMR con 6 decimales; otras monedas, hasta 6 sin ceros de sobra. */
function fmtSwap(v: string, coin: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return coin === "XMR" ? n.toFixed(6) : String(Number(n.toFixed(6)));
}

function swapStatusLabel(status: string, coin: string): string {
  const k = `swap_st_${status.toLowerCase()}` as Key;
  try {
    const s = t(k, { coin });
    return s && s !== "undefined" ? s : status;
  } catch {
    return status;
  }
}

/** Revisar: a dónde llega y de dónde sale el reembolso, antes de crear el intercambio. */
function swapReviewView(r: swap.Rates, q: swap.Quote, c: swap.SwapCoin): void {
  currentView = () => swapView();
  const buy = r.side === "buy";
  const gets = buy ? "XMR" : c.ticker.toUpperCase();
  const own = evm.address();
  // Al vender por una moneda de Arbitrum, se recibe en la cuenta de Arbitrum de esta wallet.
  const dest = !buy && c.arb && own ? null : !buy ? h("input", { type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "off", required: true, autofocus: true }) : null;
  const err = errorBox();
  const btn = h("button", { class: "primary block", type: "button" }, t("swap_create"));
  btn.addEventListener("click", async () => {
    err.hidden = true;
    if (Date.now() - r.created_at > 10 * 60_000) return showError(err, t("swap_expired_quote"));
    btn.disabled = true;
    btn.textContent = t("swap_creating");
    try {
      await ready;
      let address: string;
      let refund: string | undefined;
      if (buy) {
        const sub = await engine.freshSubaddress(false, "swap");
        await syncSubNext();
        address = sub.address;
        // Reembolso a la cuenta de Arbitrum de esta wallet si la moneda es de Arbitrum.
        if (c.arb && own) refund = own;
      } else {
        address = dest ? dest.value.trim() : own!;
        const looksOk = address.startsWith("0x") ? isEvmAddress(address) : /^[A-Za-z0-9:_.-]{10,128}$/.test(address);
        if (!looksOk) throw new UserError(t("swap_bad_dest", { coin: c.label }));
        refund = (await engine.freshSubaddress(false, "swap-refund")).address;
        await syncSubNext();
      }
      const tr = await swap.create({ rate_id: r.rate_id, provider: q.provider, fixed: q.fixed, amount: r.usdt, ticker: c.ticker, network: c.network, side: r.side, address, ...(refund ? { refund } : {}) });
      swaps = swap.prune([{ id: tr.trade_id, side: r.side, ticker: c.ticker, network: c.network, amount: tr.amount_from || r.usdt, at: Date.now(), status: tr.status }, ...swaps]);
      void saveCache().catch(() => {});
      void swapTradeView(tr.trade_id, tr);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = t("swap_create");
      showError(err, e instanceof UserError ? errText(e) : swapErr(e));
    }
  });
  render(
    header(t("swap_review_title"), () => swapView()),
    h(
      "main",
      {},
      h(
        "dl",
        { class: "summary card" },
        h("dt", {}, t("swap_you_send")),
        h("dd", {}, h("strong", {}, `${r.usdt} ${buy ? c.ticker.toUpperCase() : "XMR"}`), buy ? h("span", { class: "small muted" }, ` · ${c.label.split(" · ")[1] ?? c.network}`) : null),
        h("dt", {}, t("swap_you_get")),
        h("dd", {}, h("strong", {}, `${fmtSwap(q.amount_to, gets)} ${gets}`), !buy ? h("span", { class: "small muted" }, ` · ${c.label.split(" · ")[1] ?? c.network}`) : null),
        h("dt", {}, t("swap_via")),
        h("dd", {}, `${q.provider} · ${q.fixed ? t("swap_fixed") : t("swap_float")}`),
      ),
      buy ? h("p", { class: "small" }, "✓ ", t("swap_to_wallet")) : null,
      !buy && !dest ? h("p", { class: "small" }, "✓ ", t("swap_dest_own"), own ? h("span", { class: "addr small", translate: "no" }, ` ${own.slice(0, 6)}…${own.slice(-4)}`) : null) : null,
      dest ? h("label", {}, t("swap_dest", { coin: c.label }), dest) : null,
      buy && !c.arb ? null : h("p", { class: "small muted" }, t("swap_refund_own")),
      h("p", { class: "small muted" }, t("swap_privacy")),
      err,
      btn,
      h("button", { class: "secondary block", type: "button", onclick: () => swapView() }, t("cancel")),
    ),
  );
}

/** Depósito y estado de un intercambio. Consulta nuestra API cada 15 s mientras está abierta. */
async function swapTradeView(id: string, first?: swap.Trade): Promise<void> {
  stopSwapPoll();
  currentView = () => void swapTradeView(id);
  const ref = swaps.find((s) => s.id === id);
  const box = h("div", { id: "swap-trade" }, h("div", { class: "spinner", "aria-hidden": "true" }));
  render(header(t("swap_title"), () => swapView()), h("main", {}, box), nav("swap"));
  let expires = 0;
  let state = "";
  const timer = h("p", { class: "timer", hidden: true });
  const tick = () => {
    const left = expires - Math.floor(Date.now() / 1000);
    const waiting = state === "new" || state === "waiting";
    if (!waiting || !expires) return void (timer.hidden = true);
    timer.hidden = false;
    timer.className = left > 0 ? "timer" : "timer over";
    if (left <= 0) return void (timer.textContent = t("swap_timer_over"));
    const hh = Math.floor(left / 3600);
    const mm = String(Math.floor((left % 3600) / 60)).padStart(hh ? 2 : 1, "0");
    timer.textContent = t("swap_timer", { time: `${hh ? `${hh}:` : ""}${mm}:${String(left % 60).padStart(2, "0")}` });
  };
  const show = (tr: swap.Trade) => {
    if (!document.body.contains(box)) return stopSwapPoll();
    state = (tr.status || "new").toLowerCase();
    expires = tr.expires_at ?? 0;
    const buy = tr.ticker_from !== "xmr";
    const pay = tr.ticker_from.toUpperCase();
    const gets = (tr.ticker_to || "xmr").toUpperCase();
    const coin = swap.findCoin(buy ? tr.ticker_from : tr.ticker_to ?? "", buy ? tr.network_from : tr.network_to ?? "");
    const net = buy ? coin?.label ?? tr.network_from : "Monero";
    if (ref && ref.status !== state) {
      ref.status = state;
      void saveCache().catch(() => {});
    }
    const memo = tr.address_provider_memo && tr.address_provider_memo !== "0" ? tr.address_provider_memo : "";
    const waiting = state === "new" || state === "waiting";
    // Pagar desde aquí: XMR al vender, o USDT/ETH de Arbitrum al comprar. Solo una vez y mientras espera.
    const canPay = waiting && !ref?.paid && (!buy || !!coin?.arb) && !memo;
    const cp = h("button", { class: "secondary", type: "button" }, t("copy"));
    cp.addEventListener("click", () => void copy(tr.address_provider, cp));
    const payBtn = canPay ? h("button", { class: "primary block", type: "button" }, t("swap_pay")) : null;
    const payErr = errorBox();
    payBtn?.addEventListener("click", () => void swapPay(tr, coin, payBtn, payErr));
    const step = swap.stepOf(state);
    const bad = ["failed", "halted", "refunded", "expired"].includes(state);
    const hint = state === "confirming" ? t("swap_hint_confirming") : state === "sending" ? t("swap_hint_sending", { coin: gets }) : "";
    const kids: (Node | null)[] = [
      h("p", { class: "status" }, t("swap_status", { s: swapStatusLabel(state, gets) })),
      bad
        ? null
        : h(
            "ol",
            { class: "steps", "aria-hidden": "true" },
            ...(["swap_step_deposit", "swap_step_confirming", "swap_step_sending", "swap_step_done"] as const).map((k, i) => h("li", { class: i < step ? "done" : i === step ? "now" : "" }, t(k))),
          ),
      hint ? h("p", { class: "msg info small" }, hint) : null,
      waiting
        ? h(
            "section",
            { class: "card deposit" },
            h("p", {}, t("swap_send_exact"), " ", h("strong", {}, `${tr.amount_from} ${pay}`)),
            h("p", { class: "small muted" }, t("swap_deposit_net", { net })),
            timer,
            qr(tr.address_provider, buy ? "" : "monero:"),
            h("p", { class: "addr", translate: "no" }, tr.address_provider),
            memo ? h("p", { class: "small" }, h("strong", {}, t("swap_memo"))) : null,
            memo ? h("p", { class: "addr", translate: "no" }, memo) : null,
            cp,
          )
        : null,
      ref?.paid ? h("p", { class: "msg ok small" }, t("swap_paid")) : null,
      payErr,
      payBtn,
      tr.hashout ? h("p", { class: "small" }, h("strong", {}, t("swap_hash"))) : null,
      tr.hashout ? h("p", { class: "addr small", translate: "no" }, tr.hashout) : null,
      h("p", { class: "small muted" }, t("swap_id", { p: tr.provider, id: tr.trade_id }), h("br"), t("swap_support")),
      swap.FINAL.has(state)
        ? h(
            "button",
            {
              class: "secondary block",
              type: "button",
              onclick: () => {
                swaps = swaps.filter((s) => s.id !== id);
                void saveCache().catch(() => {});
                swapView();
              },
            },
            t("swap_remove"),
          )
        : null,
    ];
    box.replaceChildren(...kids.filter((k): k is Node => !!k));
    tick();
    if (swap.FINAL.has(state)) stopSwapPoll();
  };
  try {
    show(first ?? (await swap.trade(id)));
  } catch (e) {
    box.replaceChildren(h("p", { class: "msg error" }, swapErr(e)));
    return;
  }
  if (swap.FINAL.has(state)) return;
  const clock = setInterval(() => (document.body.contains(timer) ? tick() : clearInterval(clock)), 1000);
  swapPoll = setInterval(() => {
    if (!document.body.contains(box)) return stopSwapPoll();
    swap.trade(id).then(show, () => {});
  }, 15_000);
}

/** Paga el depósito desde esta wallet, con la pantalla de confirmación de siempre. */
async function swapPay(tr: swap.Trade, coin: swap.SwapCoin | undefined, btn: HTMLButtonElement, err: HTMLElement): Promise<void> {
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = t("preparing");
  const back = () => void swapTradeView(tr.trade_id);
  const done = (hash: string) => {
    const r = swaps.find((s) => s.id === tr.trade_id);
    if (r) r.paid = hash;
    void saveCache().catch(() => {});
    back();
  };
  try {
    await ready;
    if (tr.ticker_from === "xmr") {
      const amount = parseXmr(String(tr.amount_from));
      if (amount > BigInt((await engine.info()).unlocked)) throw new UserError(t("not_enough"));
      // El depósito del intercambio no paga la comisión de envío de la wallet: ya se cobra en el cambio.
      const p = await engine.prepare(tr.address_provider, amount, null);
      return confirmView(p, false, { address: tr.address_provider, amount: String(tr.amount_from), all: false }, { done, cancel: back });
    }
    if (!coin?.arb || !isEvmAddress(tr.address_provider)) throw new UserError(t("error", { m: "?" }));
    if (!(await evmReady)) throw new UserError(t("arb_offline"));
    const amount = parseUnitsStrict(String(tr.amount_from), coin.arb === "eth" ? 18 : TOKEN_DECIMALS);
    const b = await evm.balances();
    if ((coin.arb === "eth" ? b.eth : b.token) < amount) throw new UserError(t("not_enough"));
    const p = await evm.prepareSend(coin.arb, tr.address_provider as `0x${string}`, amount);
    const c = CHAINS[secret!.network];
    if (b.eth < p.estNetworkFee + (coin.arb === "eth" ? amount : 0n)) throw new UserError(t("need_eth", { net: c.name }));
    evmConfirmView(p, { asset: coin.arb, to: tr.address_provider, amount: String(tr.amount_from) }, { done, cancel: back });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = t("swap_pay");
    const m = errText(e);
    showError(err, e instanceof UserError ? m : /not enough|insufficient|no unlocked/i.test(m) ? t("not_enough") : t("error", { m }));
  }
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
  const seedPw = h("input", { type: "password", autocomplete: "current-password", placeholder: t("password"), "aria-label": t("password") });
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

  const arbAddr = h("p", { class: "addr small", translate: "no" }, "…");
  void evmReady.then((a) => (arbAddr.textContent = a ?? t("arb_offline")));
  const keyBox = h("div", {});
  const keyPw = h("input", { type: "password", autocomplete: "current-password", placeholder: t("password"), "aria-label": t("password") });
  const keyErr = errorBox();
  const keyBtn = h("button", { class: "secondary", type: "button" }, t("export_key"));
  keyBtn.addEventListener("click", async () => {
    if (!vaultFile) return;
    keyBtn.disabled = true;
    try {
      const r = await unlockVault<engine.Secret>(keyPw.value, vaultFile);
      keyPw.value = "";
      const sealed = await getSealed(r.key, "evm");
      r.key.fill(0);
      if (!sealed) throw new Error();
      keyErr.hidden = true;
      keyBox.replaceChildren(h("p", { class: "msg error small" }, t("export_key_warn")), h("p", { class: "addr small", translate: "no" }, new TextDecoder().decode(sealed)));
    } catch {
      showError(keyErr, t("wrong_pw"));
    } finally {
      keyBtn.disabled = false;
    }
  });

  const siteList = h("ul", { class: "sites" });
  const drawSites = async () => {
    const sites = (await getLocal("sites")) ?? {};
    const keys = Object.keys(sites);
    if (!keys.length) return siteList.replaceChildren(h("li", { class: "small muted" }, t("sites_none")));
    siteList.replaceChildren(
      ...keys.map((o) =>
        h(
          "li",
          {},
          h("span", { translate: "no" }, o.replace(/^https:\/\//, "")),
          h("button", { class: "link", type: "button", onclick: async () => (await bg({ type: "revokeSite", origin: o }), void drawSites()) }, t("disconnect")),
        ),
      ),
    );
  };
  void drawSites();

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
      h("section", { class: "card" }, h("h2", {}, t("arb_account")), h("p", { class: "small muted" }, t("arb_account_hint")), arbAddr, keyPw, keyErr, keyBtn, keyBox),
      h("section", { class: "card" }, h("h2", {}, t("sites")), siteList),
      h("section", { class: "card" }, h("h2", {}, t("show_seed")), h("p", { class: "small muted" }, t("show_seed_hint")), seedPw, seedErr, seedBtn, seedBox),
      h("section", { class: "card danger-zone" }, h("h2", {}, t("delete_wallet")), h("p", { class: "small muted" }, t("delete_hint")), del, delBtn),
      h("p", { class: "small muted" }, t("fee_note", { pct: feePercentLabel() })),
      h("p", { class: "small muted" }, `${t("version")} ${__VERSION__} · ${net}`),
    ),
    nav("settings"),
  );
}

// ------------------------------------------------------------------ ventana de aprobación (sitios)

let approval: PendingRequest | null = null;
let answered = false;

async function answer(result: unknown, error?: { code: number; message: string }): Promise<void> {
  if (!approval || answered) return;
  answered = true;
  await bg({ type: "resolve", id: approval.id, ...(error ? { error } : { result }) });
}

function rejectAndClose(): void {
  void answer(undefined, { code: 4001, message: "El usuario rechazó la solicitud." }).finally(() => window.close());
}

function doneAndClose(): void {
  render(h("main", { class: "center" }, h("p", { class: "big-ok", "aria-hidden": "true" }, "✓"), h("p", {}, t("ap_done"))));
  setTimeout(() => window.close(), 900);
}

function siteName(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

function approvalFrame(title: string, ...body: Child[]): void {
  render(
    header(t("ap_title")),
    h(
      "main",
      {},
      h("div", { class: "origin card" }, h("strong", { translate: "no" }, siteName(approval!.origin)), h("span", { class: "verified" }, "✓ ", t("ap_verified"))),
      h("h2", {}, title),
      ...body,
    ),
  );
}

function decisionButtons(label: string, onApprove: () => Promise<void>): HTMLElement {
  const err = errorBox();
  const ok = h("button", { class: "primary", type: "button", autofocus: true }, label);
  ok.addEventListener("click", async () => {
    ok.disabled = true;
    const old = ok.textContent;
    ok.textContent = "…";
    try {
      await onApprove();
    } catch (e) {
      ok.disabled = false;
      ok.textContent = old;
      showError(err, e instanceof UserError ? errText(e) : t("error", { m: errText(e) }));
    }
  });
  return h("div", { class: "decide" }, err, h("div", { class: "actions" }, h("button", { class: "secondary", type: "button", onclick: rejectAndClose }, t("ap_reject")), ok));
}

function onlyReject(): HTMLElement {
  return h("button", { class: "secondary block", type: "button", onclick: rejectAndClose }, t("ap_reject"));
}

async function approveStart(id: string): Promise<void> {
  const r = await bg<{ req: PendingRequest | null }>({ type: "getRequest", id });
  approval = r?.req ?? null;
  if (!approval) return render(h("main", { class: "center" }, h("p", {}, t("ap_expired"))));
  // Cerrar la ventana sin decidir: el fondo lo toma como rechazo.
  addEventListener("pagehide", () => {
    if (!answered) void answer(undefined, { code: 4001, message: "El usuario rechazó la solicitud." });
  });
  if (!vaultFile) {
    return render(h("main", { class: "center" }, h("p", {}, t("ap_no_wallet")), onlyReject()));
  }
  const k = await getSession("sessionKey");
  if (k) {
    try {
      const key = fromB64(k);
      secret = openJson<engine.Secret>(key, "vault", vaultFile.vault);
      sessionKey = key;
    } catch {
      secret = null;
    }
  }
  if (!secret) return approveUnlockView();
  touch();
  void approveShow();
}

function approveUnlockView(): void {
  const pw = h("input", { type: "password", autocomplete: "current-password", required: true, autofocus: true });
  const err = errorBox();
  const btn = h("button", { class: "primary block", type: "submit" }, t("unlock"));
  approvalFrame(
    t("unlock_title"),
    h(
      "form",
      {
        onsubmit: async (e: Event) => {
          e.preventDefault();
          btn.disabled = true;
          btn.textContent = "…";
          try {
            const r = await unlockVault<engine.Secret>(pw.value, vaultFile!);
            secret = r.secret;
            sessionKey = r.key;
            await setSession({ sessionKey: toB64(r.key) });
            lastTouch = 0;
            touch();
            void approveShow();
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
    onlyReject(),
  );
}

async function approveShow(): Promise<void> {
  busy(t("opening"));
  const a = approval!;
  const site = siteName(a.origin);
  const needsEvm = a.kind === "connect" || a.kind === "evm_tx" || a.kind === "typed_data";
  const account = needsEvm ? await loadEvm() : null;
  if (needsEvm && !account) return approvalFrame(t("ap_title"), h("p", { class: "msg error" }, t("arb_offline")), onlyReject());
  try {
    switch (a.kind) {
      case "connect":
        return approvalFrame(
          t("ap_connect", { site }),
          h("ul", { class: "bullets" }, h("li", {}, t("ap_connect_1", { a: `${account!.slice(0, 6)}…${account!.slice(-4)}` })), h("li", {}, t("ap_connect_2"))),
          decisionButtons(t("ap_connect_btn"), async () => {
            await answer([account]);
            doneAndClose();
          }),
        );
      case "xmr_address":
        return approvalFrame(
          t("ap_address", { site }),
          h("p", { class: "small muted" }, t("ap_address_hint")),
          decisionButtons(t("ap_address_btn"), async () => {
            const idx = Math.max(1, (await getLocal("subNext")) ?? 1);
            const addr = await engine.subaddressAt(secret!.seed, secret!.network, idx);
            await setLocal({ subNext: idx + 1 });
            await answer(addr);
            doneAndClose();
          }),
        );
      case "typed_data":
        return approveTyped(a.params as TypedData, site);
      case "evm_tx":
        return await approveEvmTx(a.params as EvmTxParams, site);
      case "xmr_transfer":
        return await approveXmrTransfer(a.params as { address: string; amount: string }, site);
    }
  } catch (e) {
    approvalFrame(t("ap_title"), h("p", { class: "msg error" }, t("error", { m: errText(e) })), onlyReject());
  }
}

function approveTyped(d: TypedData, site: string): void {
  const c = CHAINS[secret!.network];
  const me = evm.address()!;
  // Se revalida aquí también: esta página es la que firma.
  checkTypedData([me, d], me, c.id);
  const isPermit = d.primaryType === "Permit" && String(d.domain.verifyingContract ?? "").toLowerCase() === c.token.toLowerCase();
  let body: Child;
  if (isPermit) {
    const m = d.message as { spender?: string; value?: string | number; deadline?: string | number };
    const spender = String(m.spender ?? "");
    const factory = spender.toLowerCase() === c.factory.toLowerCase();
    body = h(
      "div",
      { class: "stack" },
      h("p", {}, h("strong", {}, t("ap_permit", { v: formatUnitsShort(BigInt(m.value ?? 0), TOKEN_DECIMALS), token: c.tokenSymbol, d: new Date(Number(m.deadline ?? 0) * 1000).toLocaleString(getLang()) }))),
      h("dl", { class: "summary card" }, h("dt", {}, t("ap_spender")), h("dd", { class: "addr", translate: "no" }, spender)),
      h("p", { class: factory ? "small verified" : "msg error" }, factory ? `✓ ${t("ap_tx_approve_factory")}` : t("ap_tx_approve_unknown")),
    );
  } else {
    body = h("pre", { class: "raw" }, JSON.stringify({ domain: d.domain, primaryType: d.primaryType, message: d.message }, null, 2));
  }
  approvalFrame(
    t("ap_sign", { site }),
    body,
    decisionButtons(t("ap_sign_btn"), async () => {
      await answer(await evm.signTyped(d));
      doneAndClose();
    }),
  );
}

async function approveEvmTx(tx: EvmTxParams, site: string): Promise<void> {
  const c = CHAINS[secret!.network];
  if (tx.from.toLowerCase() !== evm.address()!.toLowerCase()) return rejectAndClose();
  let p: evm.PreparedEvm;
  try {
    p = await evm.prepareFromSite(tx);
  } catch (e) {
    // Si la estimación falla, la tx revertiría: no se ofrece firmarla.
    return approvalFrame(t("ap_tx", { site }), h("p", { class: "msg error" }, t("error", { m: errText(e) })), onlyReject());
  }
  const d = evm.decode(tx.to, tx.data, p.value);
  const tok = (v: bigint) => formatUnitsShort(v, TOKEN_DECIMALS);
  const what: Child[] = [];
  if (d.kind === "eth") what.push(h("p", {}, h("strong", {}, t("ap_tx_send_eth", { v: formatUnitsShort(d.value, 18, 8) }))), h("p", { class: "addr small", translate: "no" }, tx.to));
  else if (d.kind === "token_transfer") what.push(h("p", {}, h("strong", {}, t("ap_tx_transfer", { v: tok(d.amount), token: c.tokenSymbol }))), h("p", { class: "addr small", translate: "no" }, d.to));
  else if (d.kind === "token_approve")
    what.push(
      h("p", {}, h("strong", {}, t("ap_tx_approve", { v: tok(d.amount), token: c.tokenSymbol }))),
      h("p", { class: "addr small", translate: "no" }, d.spender),
      h("p", { class: d.spenderIsFactory ? "small verified" : "msg error" }, d.spenderIsFactory ? `✓ ${t("ap_tx_approve_factory")}` : t("ap_tx_approve_unknown")),
    );
  else if (d.kind === "swap_deposit") what.push(h("p", {}, h("strong", {}, t("ap_tx_deposit", { v: tok(d.amount), token: c.tokenSymbol }))), h("p", { class: "small verified" }, `✓ ${t("ap_tx_approve_factory")}`));
  else if (d.kind === "escrow") what.push(h("p", {}, h("strong", {}, t(d.fn === "setReady" ? "ap_tx_escrow_ready" : d.fn === "refund" ? "ap_tx_escrow_refund" : "ap_tx_escrow_claim"))));
  else what.push(h("p", { class: "msg error" }, t("ap_tx_unknown")));
  approvalFrame(
    t("ap_tx", { site }),
    ...what,
    h(
      "dl",
      { class: "summary card" },
      h("dt", {}, t("ap_contract")),
      h("dd", { class: "addr", translate: "no" }, tx.to),
      p.value > 0n && d.kind !== "eth" ? h("dt", {}, t("ap_value")) : null,
      p.value > 0n && d.kind !== "eth" ? h("dd", {}, `${formatUnitsShort(p.value, 18, 8)} ETH`) : null,
      h("dt", {}, t("net_fee_est")),
      h("dd", {}, `${formatUnitsShort(p.estNetworkFee, 18, 8)} ETH`),
      h("dt", {}, t("network")),
      h("dd", {}, c.name),
    ),
    decisionButtons(t("ap_approve_btn"), async () => {
      const b = await evm.balances();
      if (b.eth < p.estNetworkFee + p.value) throw new UserError(t("need_eth", { net: c.name }));
      await answer(await evm.send(p));
      doneAndClose();
    }),
  );
}

async function approveXmrTransfer(req: { address: string; amount: string }, site: string): Promise<void> {
  const net = secret!.network;
  try {
    if (parseAddress(req.address).network !== net) throw new Error();
  } catch {
    return approvalFrame(t("ap_transfer", { site }), h("p", { class: "msg error" }, t("bad_address", { net: net === "mainnet" ? "Monero" : "stagenet" })), onlyReject());
  }
  const status = h("p", { class: "sync" });
  render(h("div", { class: "center" }, h("div", { class: "spinner", "aria-hidden": "true" }), h("p", {}, t("ap_preparing_xmr")), status));
  try {
    const c = await loadCache();
    recent = c?.meta.recent ?? [];
    swaps = swap.prune(c?.meta.swaps ?? []);
    await engine.openWallet(secret!, node(), c ? { keysData: c.keysData, cacheData: c.cacheData } : undefined);
    await engine.sync(
      (pct) => (status.textContent = t("syncing", { pct: Math.floor(pct * 100) })),
      () => {},
    );
    void saveCache().catch(() => {});
    const amount = BigInt(req.amount);
    const own = (await engine.subaddresses()).some((s) => s.address === req.address) || (await engine.info()).address === req.address;
    const p = await engine.prepare(req.address, amount, own ? null : FEE_ADDRESS[net]);
    const total = BigInt(p.amount) + BigInt(p.fee) + BigInt(p.platformFee);
    approvalFrame(
      t("ap_transfer", { site }),
      h(
        "dl",
        { class: "summary card" },
        h("dt", {}, t("to")),
        h("dd", { class: "addr", translate: "no" }, h("strong", {}, p.address.slice(0, 6)), p.address.slice(6, -6), h("strong", {}, p.address.slice(-6))),
        h("dt", {}, t("amount")),
        h("dd", {}, `${formatXmr(p.amount)} XMR`),
        h("dt", {}, t("fee")),
        h("dd", {}, `${formatXmr(p.fee)} XMR`),
        BigInt(p.platformFee) > 0n ? h("dt", {}, t("platform_fee", { pct: feePercentLabel() })) : null,
        BigInt(p.platformFee) > 0n ? h("dd", {}, `${formatXmr(p.platformFee)} XMR`) : null,
        h("dt", {}, t("total")),
        h("dd", {}, h("strong", {}, `${formatXmr(total)} XMR`)),
      ),
      lookalikeOf(p.address, recent) ? h("p", { class: "msg error" }, t("lookalike")) : null,
      decisionButtons(t("confirm_send"), async () => {
        const txid = await engine.relay(p);
        recent = [p.address, ...recent.filter((r) => r !== p.address)].slice(0, 20);
        await saveCache().catch(() => {});
        await answer({ txid });
        await engine.closeWallet(false);
        doneAndClose();
      }),
    );
  } catch (e) {
    const m = errText(e);
    approvalFrame(t("ap_transfer", { site }), h("p", { class: "msg error" }, /not enough|insufficient|no unlocked/i.test(m) ? t("not_enough") : t("error", { m })), onlyReject());
  }
}

// Guardar al ocultar el popup o cerrar la pestaña (mejor esfuerzo).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void saveCache().catch(() => {});
});

void start();
