import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fmtDate, guidePath, guides, plain } from "../lib/content";
import { SITE, type Lang } from "../site";

/** Contenido completo de las guías y las preguntas frecuentes, en texto plano (ES y EN). */
export const GET: APIRoute = async ({ site }) => {
  const parts: string[] = [`# ${SITE.brand} — contenido completo\n\nFuente: ${site?.href}\nEstado: testnet, sin auditoría.\n`];
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
