import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { fmtDate, guidePath, newsIndex, newsPath } from "../../../lib/content";
import { ROUTES } from "../../../site";
import { makeT } from "../../../i18n/ui";

interface Doc {
  lang: "es" | "en" | "pt" | "ru" | "uk" | "zh" | "ja" | "ko" | "hi" | "fa";
  title: string;
  description: string;
  date: Date;
  url: string;
  body: string;
}

/** Versión Markdown de cada guía y de cada novedad en la misma URL terminada en .md (p. ej. /es/guias/<slug>.md). */
export const getStaticPaths: GetStaticPaths = async () => [
  ...(await getCollection("guides")).map((g) => ({
    params: { lang: g.data.lang, section: ROUTES.guides[g.data.lang].split("/")[2], slug: g.data.slug },
    props: { doc: { lang: g.data.lang, title: g.data.title, description: g.data.description, date: g.data.updated, url: guidePath(g), body: g.body ?? "" } satisfies Doc },
  })),
  ...(await getCollection("news")).map((n) => ({
    params: { lang: n.data.lang, section: newsIndex(n.data.lang).split("/")[2], slug: n.data.slug },
    props: { doc: { lang: n.data.lang, title: n.data.title, description: n.data.description, date: n.data.updated ?? n.data.published, url: newsPath(n), body: n.body ?? "" } satisfies Doc },
  })),
];

export const GET: APIRoute = ({ props, site }) => {
  const d = (props as { doc: Doc }).doc;
  const t = makeT(d.lang);
  const head = `# ${d.title}\n\n> ${d.description}\n\n${t("Última actualización", "Last updated")}: ${fmtDate(d.date, d.lang)} · ${t("Versión web", "Web version")}: ${new URL(d.url, site).href}\n\n`;
  return new Response(head + d.body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
};
