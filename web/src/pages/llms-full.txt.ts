import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fmtDate, guidePath, guides, plain } from "../lib/content";
import { SITE, type Lang } from "../site";

/** Contenido completo de las guías y las preguntas frecuentes, en texto plano (ES y EN). */
export const GET: APIRoute = async ({ site }) => {
  const parts: string[] = [`# ${SITE.brand} — contenido completo\n\nFuente: ${site?.href}\nEstado: en funcionamiento con dinero real en Arbitrum One + Monero desde el 26 de octubre de 2026. Contrato verificado con Halmos, Aderyn y Slither y publicado en Sourcify; sin auditoría externa todavía. Máximo 100 USDT por atomic swap.\nStatus: live with real money on Arbitrum One + Monero since October 26, 2026. Contract verified with Halmos, Aderyn and Slither and published on Sourcify; no external audit yet. Maximum 100 USDT per atomic swap.\nResumen / summary: ${new URL("/llms.txt", site).href}\n`];
  for (const lang of ["es", "en"] as Lang[]) {
    parts.push(lang === "es" ? "\n## Guías (español)\n" : "\n## Guides (English)\n");
    for (const g of await guides(lang)) {
      parts.push(`\n### ${g.data.title}\nURL: ${new URL(guidePath(g), site).href}\n${lang === "es" ? "Última actualización" : "Last updated"}: ${fmtDate(g.data.updated, lang)}\n\n${plain(g.body ?? "")}\n`);
    }
    const faq = (await getCollection("faq")).find((f) => f.data.lang === lang)!;
    parts.push(lang === "es" ? "\n## Preguntas frecuentes\n" : "\n## Frequently asked questions\n");
    for (const f of faq.data.items) parts.push(`\nP: ${f.q}\nR: ${f.a}\n`);
  }
  return new Response(parts.join(""), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
