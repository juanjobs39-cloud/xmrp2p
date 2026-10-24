import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { fmtDate, guidePath } from "../../../lib/content";
import { ROUTES } from "../../../site";

/** Versión Markdown de cada guía en la misma URL terminada en .md (p. ej. /es/guias/<slug>.md). */
export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("guides")).map((g) => ({
    params: { lang: g.data.lang, section: ROUTES.guides[g.data.lang].split("/")[2], slug: g.data.slug },
    props: { g },
  }));

export const GET: APIRoute = ({ props, site }) => {
  const g = (props as { g: CollectionEntry<"guides"> }).g;
  const head = `# ${g.data.title}\n\n> ${g.data.description}\n\n${g.data.lang === "es" ? "Última actualización" : "Last updated"}: ${fmtDate(g.data.updated, g.data.lang)} · ${g.data.lang === "es" ? "Versión web" : "Web version"}: ${new URL(guidePath(g), site).href}\n\n`;
  return new Response(head + (g.body ?? ""), { headers: { "content-type": "text/markdown; charset=utf-8" } });
};
