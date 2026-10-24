// Copia dist/ a dist-ipfs/ con todas las rutas internas relativas, para publicar en IPFS
// (las pasarelas sirven el sitio bajo /ipfs/<CID>/, así que "/es/" no funcionaría).
// Las URL absolutas de canonical, hreflang y Open Graph se mantienen (apuntan al dominio).
import { createHash } from "node:crypto";
import { cp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "dist");
const out = join(root, "dist-ipfs");
await rm(out, { recursive: true, force: true });
await cp(src, out, { recursive: true });
await rm(join(out, "_headers"), { force: true });

async function walk(dir) {
  const r = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) r.push(...(await walk(p)));
    else r.push(p);
  }
  return r;
}

const sha = (s) => "'sha256-" + createHash("sha256").update(s).digest("base64") + "'";

for (const f of (await walk(out)).filter((p) => p.endsWith(".html"))) {
  const fromDir = posix.join("/", relative(out, dirname(f)).split(sep).join("/"));
  const rel = (abs) => {
    let r = posix.relative(fromDir, abs);
    if (abs.endsWith("/") && !r.endsWith("/")) r += "/";
    return r === "" ? "./" : r;
  };
  let html = await readFile(f, "utf8");
  html = html.replace(/\b(href|src|content)="(\/(?!\/)[^"]*)"/g, (m, attr, url) => {
    if (attr === "content" && !/^\/(es|en)\//.test(url)) return m;
    return `${attr}="${rel(url)}"`;
  });
  // Import map: claves relativas y nuevo hash en la CSP.
  const im = /<script type="importmap">([^<]*)<\/script>/.exec(html);
  if (im) {
    const oldText = im[1];
    const map = JSON.parse(oldText);
    map.integrity = Object.fromEntries(Object.entries(map.integrity).map(([k, v]) => [rel(k), v]));
    const newText = JSON.stringify(map);
    html = html.replace(oldText, newText).replace(sha(oldText), sha(newText));
  }
  await writeFile(f, html);
}
console.log("dist-ipfs/ listo: súbelo con `ipfs add -r dist-ipfs` (ver docs/PUBLICAR.md)");
