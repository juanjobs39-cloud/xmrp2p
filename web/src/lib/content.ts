import { getCollection, type CollectionEntry } from "astro:content";
import { LANG_INFO, ROUTES, type Lang } from "../site";

export type Guide = CollectionEntry<"guides">;

export async function guides(lang: Lang): Promise<Guide[]> {
  return (await getCollection("guides", (g) => g.data.lang === lang)).sort((a, b) => a.data.order - b.data.order);
}

export function guidePath(g: Guide): string {
  return `${ROUTES.guides[g.data.lang]}${g.data.slug}/`;
}

/** Rutas equivalentes de una guía en ambos idiomas (para hreflang). */
export async function guideAlternates(key: string): Promise<Partial<Record<Lang, string>>> {
  const all = await getCollection("guides", (g) => g.data.key === key);
  return Object.fromEntries(all.map((g) => [g.data.lang, guidePath(g)]));
}

export type News = CollectionEntry<"news">;

/** Las novedades existen solo en español e inglés; los demás idiomas enlazan a las de inglés. */
export const newsIndex = (lang: Lang): string => (lang === "es" ? "/es/novedades/" : "/en/news/");

export function newsPath(n: News): string {
  return `${newsIndex(n.data.lang)}${n.data.slug}/`;
}

export async function newsList(lang: "es" | "en"): Promise<News[]> {
  return (await getCollection("news", (n) => n.data.lang === lang)).sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export async function newsAlternates(key: string): Promise<Partial<Record<Lang, string>>> {
  const all = await getCollection("news", (n) => n.data.key === key);
  return Object.fromEntries(all.map((n) => [n.data.lang, newsPath(n)]));
}

export const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(LANG_INFO[lang].locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** Markdown → texto plano aproximado (para llms-full.txt). */
export function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
