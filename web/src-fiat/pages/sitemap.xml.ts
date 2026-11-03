import type { APIRoute } from "astro";
import { pageGroups } from "../content";

/** sitemap.xml con hreflang (xhtml:link) para cada par es/en. */
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const today = new Date().toISOString().slice(0, 10);
  const entries = pageGroups().flatMap(({ urls }) =>
    Object.values(urls).map((path) => {
      const alts = Object.entries(urls)
        .map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(p)}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(urls.en)}"/>`)
        .join("\n");
      return `  <url>\n    <loc>${abs(path)}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
