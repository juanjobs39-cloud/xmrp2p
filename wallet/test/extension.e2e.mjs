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
  ok(errors.length === 0, `sin errores en consola${errors.length ? ": " + errors.join(" | ") : ""}`);
} finally {
  await ctx.close();
}
