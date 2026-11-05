// Prueba de punta a punta con la extensión cargada de verdad (Edge o Chromium) en stagenet:
// crear wallet, bóveda cifrada, llave de sesión, bloqueo automático, desbloqueo y Explorar.
// Uso: npm run build && npm run test:ext   (BROWSER_CHANNEL=msedge|chrome|chromium)
import { chromium } from "playwright-core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ext = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "chromium");
const PW = "Prueba-Wallet-2026!";
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "mp2pw-")), {
  channel: process.env.BROWSER_CHANNEL || "msedge",
  headless: false,
  locale: "es-ES",
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--lang=es", "--window-position=-2400,0"],
});
const ok = (cond, msg) => {
  if (!cond) throw new Error(`FALLÓ: ${msg}`);
  console.log(`✓ ${msg}`);
};
try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const id = new URL(sw.url()).host;
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`chrome-extension://${id}/popup.html?view=tab`);

  await page.click("summary");
  await page.selectOption("#net", "stagenet");
  await page.click("text=Crear wallet nueva");
  const pw = page.locator("input[type=password]");
  await pw.nth(0).fill(PW);
  await pw.nth(1).fill(PW);
  await page.click("button[type=submit]");
  await page.waitForSelector(".seed li", { timeout: 60000 });
  const words = await page.locator(".seed li").allInnerTexts();
  ok(words.length === 25, "semilla de 25 palabras");
  await page.check("#written");
  await page.click("text=Continuar");
  for (const l of await page.locator("form label").all()) {
    const n = Number((await l.innerText()).match(/\d+/)[0]);
    await l.locator("input").fill(words[n - 1]);
  }
  await page.click("button[type=submit]");
  await page.waitForSelector("#bal", { timeout: 60000 });
  ok(await sw.evaluate(async () => !!(await chrome.storage.session.get("sessionKey")).sessionKey), "llave de sesión solo en storage.session");
  const vault = await sw.evaluate(async () => JSON.stringify((await chrome.storage.local.get("vaultFile")).vaultFile));
  ok(!words.some((w) => vault.includes(w)), "la bóveda guardada no contiene la semilla en claro");
  ok(vault.includes('"argon2id"') && vault.includes('"m":65536'), "Argon2id con 64 MiB");
  ok(!!(await sw.evaluate(async () => await chrome.alarms.get("autolock"))), "alarma de bloqueo automático programada");

  await sw.evaluate(async () => chrome.alarms.create("autolock", { when: Date.now() + 200 }));
  await page.waitForSelector("text=Wallet bloqueada", { timeout: 15000 });
  ok(!(await sw.evaluate(async () => (await chrome.storage.session.get("sessionKey")).sessionKey)), "el bloqueo automático borra la sesión");

  await page.fill("input[type=password]", "contraseña-mala-1");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Contraseña incorrecta", { timeout: 15000 });
  ok(true, "rechaza contraseña incorrecta");
  await page.fill("input[type=password]", PW);
  await page.click("button[type=submit]");
  await page.waitForSelector("#bal", { timeout: 60000 });
  ok(true, "desbloquea con la contraseña correcta");

  await page.click("nav.tabs button:nth-child(2)");
  const [tab] = await Promise.all([ctx.waitForEvent("page", { timeout: 10000 }), page.click(".site >> nth=1")]);
  ok(tab.url().startsWith("https://fiat.monerop2p.app/"), `Explorar abre ${tab.url()}`);
  // ---- Fase 2: cuenta de Arbitrum y proveedor en el sitio (monerop2p.app simulado con route).
  await page.click("nav.tabs button:nth-child(1)");
  await page.waitForSelector("#arb-bal", { timeout: 60000 });
  const evmAddr = await sw.evaluate(async () => (await chrome.storage.session.get("evmAddress")).evmAddress);
  ok(/^0x[0-9a-fA-F]{40}$/.test(evmAddr ?? ""), `cuenta de Arbitrum derivada: ${evmAddr}`);
  const blobs = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open("monerop2p-wallet"); r.onsuccess = () => { const q = r.result.transaction("blobs").objectStore("blobs").get("evm"); q.onsuccess = () => res(q.result ? q.result.byteLength ?? q.result.length ?? 1 : 0); }; }));
  ok(blobs > 0, "llave de Arbitrum guardada cifrada (IndexedDB)");

  await ctx.route("https://monerop2p.app/**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>t</title><p>sitio de prueba</p>" }));
  await ctx.route("https://evil.example/**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>e</title>" }));
  const site = await ctx.newPage();
  await site.goto("https://monerop2p.app/es/app/");
  const ann = await site.evaluate(() => new Promise((res) => { const f = []; addEventListener("eip6963:announceProvider", (e) => f.push(e.detail.info.rdns)); dispatchEvent(new Event("eip6963:requestProvider")); setTimeout(() => res(f), 300); }));
  ok(ann.includes("app.monerop2p.wallet"), "se anuncia por EIP-6963 en monerop2p.app");
  ok((await site.evaluate(() => window.moneroP2P.ethereum.request({ method: "eth_chainId" }))) === "0x66eee", "eth_chainId = Arbitrum Sepolia en stagenet");
  ok((await site.evaluate(() => window.moneroP2P.ethereum.request({ method: "eth_accounts" }))).length === 0, "eth_accounts vacío antes de conectar");
  ok((await site.evaluate(() => window.moneroP2P.getNetwork())) === "stagenet", "getNetwork");

  const approveIn = async (fn, button) => {
    const [win] = await Promise.all([ctx.waitForEvent("page", { timeout: 15000 }), site.evaluate(`window.__p = ${fn}; 0`)]);
    await win.waitForSelector(`text=${button}`, { timeout: 60000 });
    ok(await win.locator("text=Sitio oficial de MoneroP2P").isVisible(), `la ventana muestra el sitio (${button})`);
    await win.click(`button:has-text("${button}")`);
    return site.evaluate("window.__p");
  };
  const accts = await approveIn(`window.moneroP2P.ethereum.request({ method: "eth_requestAccounts" })`, "Conectar");
  ok(accts[0] === evmAddr, "eth_requestAccounts devuelve la cuenta tras aprobar");
  ok((await site.evaluate(() => window.moneroP2P.ethereum.request({ method: "eth_accounts" })))[0] === evmAddr, "eth_accounts tras conectar");
  const xmr = await approveIn(`window.moneroP2P.getAddress()`, "Compartir dirección");
  ok(/^7[1-9A-HJ-NP-Za-km-z]{94}$/.test(xmr), `getAddress da una subdirección de stagenet: ${xmr.slice(0, 12)}…`);
  const xmr2 = await approveIn(`window.moneroP2P.getAddress()`, "Compartir dirección");
  ok(xmr2 !== xmr, "cada getAddress da una subdirección distinta");

  // Rechazo: cerrar la ventana equivale a rechazar.
  const [win] = await Promise.all([ctx.waitForEvent("page", { timeout: 15000 }), site.evaluate(`window.__p = window.moneroP2P.getAddress().catch((e) => e.code); 0`)]);
  await win.waitForSelector("text=Rechazar", { timeout: 60000 });
  await win.click("button:has-text('Rechazar')");
  ok((await site.evaluate("window.__p")) === 4001, "rechazar devuelve el error 4001");
  const typed = await site.evaluate((a) => window.moneroP2P.ethereum.request({ method: "eth_signTypedData_v4", params: [a, JSON.stringify({ types: { X: [] }, domain: { chainId: 1 }, primaryType: "X", message: {} })] }).catch((e) => e.code), evmAddr);
  ok(typed === 4902, "rechaza firmar datos de otra red");

  const evil = await ctx.newPage();
  await evil.goto("https://evil.example/");
  ok(await evil.evaluate(() => typeof window.moneroP2P === "undefined"), "no se inyecta en otros sitios");

  // Ajustes: el sitio aparece conectado y se puede desconectar.
  await page.bringToFront();
  await page.click("nav.tabs button:nth-child(4)");
  await page.waitForSelector(".sites li:has-text('monerop2p.app')", { timeout: 10000 });
  await page.click(".sites button");
  await page.waitForSelector("text=Ningún sitio conectado", { timeout: 10000 });
  ok((await site.evaluate(() => window.moneroP2P.ethereum.request({ method: "eth_accounts" }))).length === 0, "desconectar quita el acceso");

  ok(errors.length === 0, `sin errores en consola${errors.length ? ": " + errors.join(" | ") : ""}`);
} finally {
  await ctx.close();
}
