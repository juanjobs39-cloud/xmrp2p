// Empaqueta monero-ts para el navegador con esbuild (configuración validada en research/monero-ts-browser).
// Salida: public/vendor/xmr/xmr.js + monero.worker.js, cargados solo por la ruta /app.
import { build } from "esbuild";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vendor", "xmr");
const stubs = join(root, "scripts", "stubs");
await mkdir(out, { recursive: true });
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

await build({
  entryPoints: [join(root, "src", "app", "monero-entry.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: join(out, "xmr.js"),
  define: { global: "globalThis" },
  inject: [join(stubs, "shims.js")],
  alias,
  minify: true,
  legalComments: "external",
  logLevel: "warning",
});
await copyFile(join(root, "node_modules", "monero-ts", "dist", "monero.worker.js"), join(out, "monero.worker.js"));
console.log("monero-ts empaquetado en public/vendor/xmr/");

// Núcleo cripto (crypto-wasm compilado con wasm-pack --target web).
const pkg = join(root, "..", "crypto-wasm", "pkg");
const cryptoOut = join(root, "public", "vendor", "crypto");
await mkdir(cryptoOut, { recursive: true });
for (const f of ["xmrp2p_crypto.js", "xmrp2p_crypto_bg.wasm"]) {
  try {
    await copyFile(join(pkg, f), join(cryptoOut, f));
  } catch {
    throw new Error(`Falta crypto-wasm/pkg/${f}: ejecuta "wasm-pack build --release --target web --out-dir pkg" en crypto-wasm/`);
  }
}
console.log("crypto-wasm copiado en public/vendor/crypto/");
