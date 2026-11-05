// Compila la extensión para Chromium (Chrome, Brave, Edge) y Firefox con esbuild.
// Salida: dist/chromium y dist/firefox, listas para cargar o empaquetar en .zip.
// Sin código remoto: todo (monero-ts, su worker y su WASM) va dentro del paquete.
import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const stubs = join(root, ".stubs");
await mkdir(stubs, { recursive: true });
await writeFile(join(stubs, "empty.js"), "export default {};\n");
await writeFile(join(stubs, "http.js"), "export class Agent { constructor(o) { this.options = o; } on() { return this; } }\nexport default { Agent };\n");
await writeFile(
  join(stubs, "shims.js"),
  'import process from "process/browser.js";\nimport { Buffer } from "buffer";\nglobalThis.process = globalThis.process || process;\nglobalThis.Buffer = globalThis.Buffer || Buffer;\n',
);
const empty = join(stubs, "empty.js");
const alias = { http: join(stubs, "http.js"), https: join(stubs, "http.js") };
for (const m of ["fs", "path", "child_process", "worker_threads", "os", "net", "tls", "url", "stream", "zlib", "crypto"]) alias[m] = empty;

// DEV_SITES=1 agrega el sitio local (astro dev) para probar el proveedor. Nunca en un paquete publicado.
const DEV_ORIGINS = process.env.DEV_SITES ? ["http://localhost:4321", "http://127.0.0.1:4321"] : [];
const SITE_MATCHES = ["https://monerop2p.app/*", "https://fiat.monerop2p.app/*", ...(process.env.DEV_SITES ? ["http://localhost/*", "http://127.0.0.1/*"] : [])];

const common = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome116", "firefox140"],
  minify: process.env.DEV ? false : true,
  legalComments: "external",
  logLevel: "warning",
  define: { global: "globalThis", __VERSION__: JSON.stringify(pkg.version), __DEV_ORIGINS__: JSON.stringify(DEV_ORIGINS) },
};

const tmp = join(root, ".esbuild-tmp");
await rm(tmp, { recursive: true, force: true });
await build({ ...common, entryPoints: { popup: join(root, "src", "ui", "app.ts") }, outdir: tmp, inject: [join(stubs, "shims.js")], alias });
await build({ ...common, entryPoints: { background: join(root, "src", "background.ts") }, outdir: tmp });
// Content scripts: scripts clásicos (iife), sin dependencias.
await build({ ...common, format: "iife", entryPoints: { inpage: join(root, "src", "inpage.ts"), content: join(root, "src", "content.ts") }, outdir: tmp });

const CSP = "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function manifest(target) {
  const m = {
    manifest_version: 3,
    name: "__MSG_name__",
    short_name: "MoneroP2P",
    description: "__MSG_description__",
    version: pkg.version,
    default_locale: "en",
    homepage_url: "https://monerop2p.app/",
    icons: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
    action: { default_popup: "popup.html", default_title: "MoneroP2P Wallet", default_icon: { 16: "icons/16.png", 32: "icons/32.png" } },
    // storage: bóveda cifrada (local) y llave de sesión en memoria (session).
    // alarms: bloqueo automático. Nada de "tabs" ni "scripting"; las páginas, solo las de MoneroP2P.
    // unlimitedStorage: el caché cifrado de wallet2 puede pesar decenas de MB (IndexedDB).
    permissions: ["storage", "unlimitedStorage", "alarms"],
    // Nuestros nodos de Monero y el RPC público de Arbitrum (One y Sepolia). Un nodo propio se pide en
    // tiempo de ejecución (optional_host_permissions).
    host_permissions: ["https://nodo-xmr.monerop2p.app/*", "https://nodo.monerop2p.app/*", "https://arb1.arbitrum.io/*", "https://sepolia-rollup.arbitrum.io/*"],
    // El proveedor (EIP-1193 + window.moneroP2P) solo existe en los sitios de MoneroP2P.
    content_scripts: [
      { matches: SITE_MATCHES, js: ["inpage.js"], run_at: "document_start", world: "MAIN", all_frames: false },
      { matches: SITE_MATCHES, js: ["content.js"], run_at: "document_start", all_frames: false },
    ],
    optional_host_permissions: ["https://*/*", "http://127.0.0.1/*", "http://localhost/*"],
    content_security_policy: { extension_pages: CSP },
  };
  if (target === "firefox") {
    m.background = { scripts: ["background.js"], type: "module" };
    m.browser_specific_settings = { gecko: { id: "wallet@monerop2p.app", strict_min_version: "140.0", data_collection_permissions: { required: ["none"] } }, gecko_android: { strict_min_version: "142.0" } };
  } else {
    m.background = { service_worker: "background.js", type: "module" };
    m.minimum_chrome_version = "116";
  }
  return m;
}

for (const target of ["chromium", "firefox"]) {
  const out = join(root, "dist", target);
  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, "vendor"), { recursive: true });
  await cp(tmp, out, { recursive: true });
  await cp(join(root, "static"), out, { recursive: true });
  await cp(join(root, "node_modules", "monero-ts", "dist", "monero.worker.js"), join(out, "vendor", "monero.worker.js"));
  await writeFile(join(out, "manifest.json"), JSON.stringify(manifest(target), null, 2) + "\n");
}
await rm(tmp, { recursive: true, force: true });
console.log(`MoneroP2P Wallet ${pkg.version} compilada en dist/chromium y dist/firefox`);
