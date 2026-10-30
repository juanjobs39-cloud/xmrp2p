/**
 * Textos de las plantillas (.astro) en todos los idiomas.
 * Las plantillas escriben cada texto en español e inglés: t("Hola", "Hello").
 * Los demás idiomas se buscan por el texto en inglés en src/i18n/ui/<idioma>.json;
 * si falta una traducción se muestra el inglés.
 *
 * Para sacar la lista de textos en inglés: I18N_DUMP=ruta.txt npm run build
 */
import { appendFileSync } from "node:fs";
import { LANG_INFO, type Lang } from "../site";

const files = import.meta.glob("./ui/*.json", { eager: true, import: "default" }) as Record<string, Record<string, string>>;
const UI: Partial<Record<Lang, Record<string, string>>> = {};
for (const [path, dict] of Object.entries(files)) UI[path.slice(5, -5) as Lang] = dict;

const dump = typeof process !== "undefined" ? process.env.I18N_DUMP : undefined;
const seen = new Set<string>();

export type T = (es: string, en: string) => string;

export function makeT(lang: Lang): T {
  return (es, en) => {
    if (dump && !seen.has(en)) {
      seen.add(en);
      appendFileSync(dump, JSON.stringify(en) + "\n");
    }
    if (lang === "es") return es;
    if (lang === "en") return en;
    return UI[lang]?.[en] ?? en;
  };
}

/** ¿Este idioma se escribe de derecha a izquierda? */
export const isRtl = (lang: Lang): boolean => !!LANG_INFO[lang].rtl;
