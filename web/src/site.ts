/** Datos del sitio. Los valores entre corchetes se reemplazan desde config/xmrp2p.example.toml. */
export const SITE = {
  brand: import.meta.env.PUBLIC_BRAND ?? "MoneroP2P",
  email: import.meta.env.PUBLIC_CONTACT_EMAIL ?? "[EMAIL_CONTACTO]",
  repo: "https://github.com/juanjobs39-cloud/xmrp2p",
  apiUrl: import.meta.env.PUBLIC_API_URL ?? "",
};

export type Lang = "es" | "en";
export const LANGS: Lang[] = ["es", "en"];

/** Rutas equivalentes entre idiomas (para hreflang y el selector de idioma). */
export const ROUTES: Record<string, Record<Lang, string>> = {
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
};

export const NAV: { key: keyof typeof ROUTES; es: string; en: string }[] = [
  { key: "how", es: "Cómo funciona", en: "How it works" },
  { key: "security", es: "Seguridad", en: "Security" },
  { key: "guides", es: "Guías", en: "Guides" },
  { key: "faq", es: "Preguntas", en: "FAQ" },
  { key: "maker", es: "Ser maker", en: "Become a maker" },
];
