/** Datos del sitio. Los valores entre corchetes se reemplazan desde config/xmrp2p.example.toml. */
export const SITE = {
  brand: import.meta.env.PUBLIC_BRAND ?? "MoneroP2P",
  email: import.meta.env.PUBLIC_CONTACT_EMAIL ?? "[EMAIL_CONTACTO]",
  repo: "https://github.com/juanjobs39-cloud/xmrp2p",
  apiUrl: import.meta.env.PUBLIC_API_URL ?? "",
};

export type Lang = "es" | "en" | "pt" | "ru" | "uk" | "zh" | "ja" | "ko" | "hi" | "fa";
export const LANGS: Lang[] = ["en", "es", "pt", "ru", "uk", "zh", "ja", "ko", "hi", "fa"];

/** Nombre de cada idioma en su propio idioma (selector), locale de Open Graph y de fechas. */
export const LANG_INFO: Record<Lang, { name: string; og: string; locale: string; rtl?: boolean }> = {
  en: { name: "English", og: "en_US", locale: "en-US" },
  es: { name: "Español", og: "es_419", locale: "es-419" },
  pt: { name: "Português", og: "pt_BR", locale: "pt-BR" },
  ru: { name: "Русский", og: "ru_RU", locale: "ru-RU" },
  uk: { name: "Українська", og: "uk_UA", locale: "uk-UA" },
  zh: { name: "中文", og: "zh_CN", locale: "zh-CN" },
  ja: { name: "日本語", og: "ja_JP", locale: "ja-JP" },
  ko: { name: "한국어", og: "ko_KR", locale: "ko-KR" },
  hi: { name: "हिन्दी", og: "hi_IN", locale: "hi-IN" },
  fa: { name: "فارسی", og: "fa_IR", locale: "fa-IR", rtl: true },
};

/** Rutas en español e inglés; los demás idiomas usan la ruta en inglés con su prefijo (/pt/how-it-works/). */
const BASE: Record<string, { es: string; en: string }> = {
  home: { es: "/es/", en: "/en/" },
  how: { es: "/es/como-funciona/", en: "/en/how-it-works/" },
  security: { es: "/es/seguridad/", en: "/en/security/" },
  maker: { es: "/es/conviertete-en-maker/", en: "/en/become-a-maker/" },
  guides: { es: "/es/guias/", en: "/en/guides/" },
  faq: { es: "/es/preguntas-frecuentes/", en: "/en/faq/" },
  glossary: { es: "/es/glosario/", en: "/en/glossary/" },
  about: { es: "/es/acerca-de/", en: "/en/about/" },
  contact: { es: "/es/contacto/", en: "/en/contact/" },
  terms: { es: "/es/terminos/", en: "/en/terms/" },
  privacy: { es: "/es/privacidad/", en: "/en/privacy/" },
  risks: { es: "/es/aviso-de-riesgos/", en: "/en/risk-notice/" },
  app: { es: "/es/app/", en: "/en/app/" },
  makerApp: { es: "/es/maker/", en: "/en/maker/" },
};

/** Rutas equivalentes entre idiomas (para hreflang y el selector de idioma). */
export const ROUTES: Record<string, Record<Lang, string>> = Object.fromEntries(
  Object.entries(BASE).map(([k, r]) => [
    k,
    Object.fromEntries(LANGS.map((l) => [l, l === "es" ? r.es : r.en.replace(/^\/en\//, `/${l}/`)])) as Record<Lang, string>,
  ]),
);

/** Menú principal: textos en español e inglés; los demás idiomas se traducen con makeT (src/i18n/ui.ts). */
export const NAV: { key: keyof typeof ROUTES; es: string; en: string }[] = [
  { key: "how", es: "Cómo funciona", en: "How it works" },
  { key: "security", es: "Seguridad", en: "Security" },
  { key: "guides", es: "Guías", en: "Guides" },
  { key: "faq", es: "Preguntas", en: "FAQ" },
  { key: "maker", es: "Cómo ser maker", en: "How to be a maker" },
];
