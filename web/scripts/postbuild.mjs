// Endurece el build estático:
// 1. SRI (sha384) en <script src> y <link rel=stylesheet> locales.
// 2. Import map con "integrity" para los módulos que la app carga dinámicamente (núcleo cripto y
//    monero-ts), y su hash agregado a la CSP de la página.
// 3. Hash del WASM criptográfico embebido en la página: la app lo verifica antes de ejecutarlo.
// 4. _headers para Cloudflare Pages (cabeceras de seguridad).
// 5. SHA256SUMS de todo dist/ para verificar que el sitio publicado corresponde al código.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const sri = (buf) => "sha384-" + createHash("sha384").update(buf).digest("base64");
const sha256b64 = (s) => "'sha256-" + createHash("sha256").update(s).digest("base64") + "'";

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(dist);
const local = (href) => href.startsWith("/") && !href.startsWith("//");
const fileFor = (href) => join(dist, decodeURIComponent(href.split("?")[0]));

// Versión de los archivos de /vendor/ (hash de su contenido). Se agrega como ?v= a sus URLs: /vendor/
// se sirve con caché inmutable, y sin versión un navegador podía quedarse con un xmr.js viejo que ya
// no coincide con el integrity del import map ("Failed to fetch dynamically imported module").
const vendorFiles = ["vendor/crypto/xmrp2p_crypto.js", "vendor/crypto/xmrp2p_crypto_bg.wasm", "vendor/xmr/xmr.js", "vendor/xmr/monero.worker.js"];
const vh = createHash("sha256");
for (const f of vendorFiles) vh.update(await readFile(join(dist, f)));
const vendorVersion = vh.digest("hex").slice(0, 12);
const vendor = {
  [`/vendor/crypto/xmrp2p_crypto.js?v=${vendorVersion}`]: await readFile(join(dist, "vendor/crypto/xmrp2p_crypto.js")),
  [`/vendor/xmr/xmr.js?v=${vendorVersion}`]: await readFile(join(dist, "vendor/xmr/xmr.js")),
};
const wasmHash = sri(await readFile(join(dist, "vendor/crypto/xmrp2p_crypto_bg.wasm")));

// 0. Marcadores de contenido ([EMAIL_CONTACTO]) en HTML, Markdown y texto plano.
const contact = process.env.PUBLIC_CONTACT_EMAIL;
if (contact) {
  for (const f of files.filter((p) => /\.(html|md|txt)$/.test(p))) {
    const t = await readFile(f, "utf8");
    if (t.includes("[EMAIL_CONTACTO]")) await writeFile(f, t.split("[EMAIL_CONTACTO]").join(contact));
  }
}

let pages = 0;
for (const f of files.filter((p) => p.endsWith(".html"))) {
  let html = await readFile(f, "utf8");
  // 1. SRI
  html = html.replace(/<script([^>]*?)\ssrc="([^"]+)"([^>]*)><\/script>/g, (m, a, src, b) => {
    if (!local(src) || m.includes("integrity=")) return m;
    return `<script${a} src="${src}"${b} integrity="${sri(readFileSync(fileFor(src)))}"></script>`;
  });
  html = html.replace(/<link([^>]*?)rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g, (m, a, b, href, c) => {
    if (!local(href) || m.includes("integrity=")) return m;
    return `<link${a}rel="stylesheet"${b}href="${href}"${c} integrity="${sri(readFileSync(fileFor(href)))}">`;
  });
  // 2 y 3: solo en las páginas de la app (tienen CSP)
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    const map = JSON.stringify({ imports: {}, integrity: Object.fromEntries(Object.entries(vendor).map(([k, v]) => [k, sri(v)])) });
    const tag = `<script type="importmap">${map}</script>`;
    html = html.replace("<head>", `<head>${tag}<meta name="xmrp2p-wasm-integrity" content="${wasmHash}"><meta name="xmrp2p-vendor-version" content="${vendorVersion}">`);
    html = html.replace(/(script-src 'self' 'wasm-unsafe-eval')/, `$1 ${sha256b64(map)}`);
  }
  await writeFile(f, html);
  pages++;
}

// 4. Cabeceras de seguridad (Cloudflare Pages)
await writeFile(
  join(dist, "_headers"),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/*/app/*
  Content-Security-Policy: frame-ancestors 'none'
  Cache-Control: no-store

/*/maker/*
  Content-Security-Policy: frame-ancestors 'none'
  Cache-Control: no-store

/vendor/*
  Cache-Control: public, max-age=31536000, immutable
`,
);

// 5. Sumas de verificación (orden estable)
const all = (await walk(dist)).filter((p) => !p.endsWith("SHA256SUMS")).sort();
const lines = [];
for (const p of all) {
  const buf = await readFile(p);
  lines.push(`${createHash("sha256").update(buf).digest("hex")}  ${relative(dist, p).split(sep).join("/")}`);
}
await writeFile(join(dist, "SHA256SUMS"), lines.join("\n") + "\n");
console.log(`postbuild: vendor v=${vendorVersion}, SRI en ${pages} páginas, ${lines.length} archivos en SHA256SUMS, WASM ${wasmHash.slice(0, 20)}…`);
