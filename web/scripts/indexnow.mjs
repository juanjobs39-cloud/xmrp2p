// Notifica a IndexNow (Bing, Yandex, Seznam, Naver…) las URL nuevas o cambiadas tras publicar.
// Uso: INDEXNOW_KEY=<llave> PUBLIC_SITE_URL=https://<DOMINIO> node scripts/indexnow.mjs [--all] [--dry-run]
// Compara el sitemap de dist/ con .indexnow-cache.json (lastmod por URL) y envía solo las diferencias.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const key = process.env.INDEXNOW_KEY ?? "";
const site = process.env.PUBLIC_SITE_URL ?? "";
const all = process.argv.includes("--all");
const dry = process.argv.includes("--dry-run");
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("Define INDEXNOW_KEY (8–128 caracteres a-z, A-Z, 0-9, -) y vuelve a construir el sitio");
if (!site.startsWith("https://")) throw new Error("Define PUBLIC_SITE_URL con https://");

const xml = await readFile(root + "dist/sitemap.xml", "utf8");
const current = Object.fromEntries(
  [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2] ?? ""]),
);
const cachePath = root + ".indexnow-cache.json";
let cache = {};
try {
  cache = JSON.parse(await readFile(cachePath, "utf8"));
} catch {
  /* primera vez */
}
const changed = Object.keys(current).filter((u) => all || cache[u] !== current[u]);
console.log(`${changed.length} URL nuevas o actualizadas de ${Object.keys(current).length}`);
if (!changed.length) process.exit(0);

const host = new URL(site).host;
const body = { host, key, keyLocation: `${site.replace(/\/$/, "")}/${key}.txt`, urlList: changed.slice(0, 10_000) };
if (dry) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log(`IndexNow respondió ${r.status} ${r.statusText}`);
if (r.status === 200 || r.status === 202) await writeFile(cachePath, JSON.stringify(current, null, 1));
else process.exit(1);
