import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { guidePath } from "../lib/content";
import { ROUTES, type Lang } from "../site";

/** sitemap.xml con hreflang (xhtml:link) para cada par de páginas equivalentes. */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pagesUpdated = new Map<string, Date>();
  for (const p of await getCollection("pages")) pagesUpdated.set(ROUTES[p.data.key]![p.data.lang], p.data.updated);

  const groups: { urls: Partial<Record<Lang, string>>; lastmod?: Date }[] = [];
  for (const key of Object.keys(ROUTES)) groups.push({ urls: ROUTES[key]!, lastmod: pagesUpdated.get(ROUTES[key]!.es) });
  const byKey = new Map<string, { urls: Partial<Record<Lang, string>>; lastmod?: Date }>();
  for (const g of await getCollection("guides")) {
    const e = byKey.get(g.data.key) ?? { urls: {} };
    e.urls[g.data.lang] = guidePath(g);
    if (!e.lastmod || g.data.updated > e.lastmod) e.lastmod = g.data.updated;
    byKey.set(g.data.key, e);
  }
  groups.push(...byKey.values());

  const entries = groups.flatMap(({ urls, lastmod }) =>
    (Object.entries(urls) as [Lang, string][]).map(([, path]) => {
      const alts = (Object.entries(urls) as [Lang, string][])
        .map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(p)}"/>`)
        .concat(urls.en ?? urls.es ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${abs((urls.en ?? urls.es)!)}"/>`] : [])
        .join("\n");
      return `  <url>\n    <loc>${abs(path)}</loc>\n${lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` : ""}${alts}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
