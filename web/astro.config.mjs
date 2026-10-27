import { defineConfig } from "astro/config";
import GithubSlugger from "github-slugger";
import { loadEnv } from "vite";

// Astro no carga .env en process.env al leer esta configuración: se carga aquí. Sin esto, el sitio
// se generaba con el dominio de ejemplo en canonical, hreflang, sitemap y llms.txt.
const env = { ...loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_"), ...process.env };

// Dominio definitivo: PUBLIC_SITE_URL (ver web/.env.example).
const site = env.PUBLIC_SITE_URL ?? "https://monerop2p.app";

// Reemplaza marcadores del contenido (p. ej. [EMAIL_CONTACTO]) por los valores configurados.
const PLACEHOLDERS = { "[EMAIL_CONTACTO]": env.PUBLIC_CONTACT_EMAIL };
function rehypePlaceholders() {
  let slugger;
  const text = (n) => (n.type === "text" ? n.value : (n.children ?? []).map(text).join(""));
  const walk = (node, inHead = false) => {
    if (node.type === "text") {
      for (const [k, v] of Object.entries(PLACEHOLDERS)) if (v) node.value = node.value.split(k).join(v);
    }
    if (node.type === "element") {
      // Accesibilidad: encabezados de tabla con scope (WCAG H63).
      if (node.tagName === "th" && !node.properties?.scope) node.properties = { ...node.properties, scope: inHead ? "col" : "row" };
      // id de títulos asignados aquí (Astro respeta los existentes); deben empezar con letra
      // (títulos numerados como "1. Qué es…").
      if (/^h[2-6]$/.test(node.tagName) && !node.properties?.id) {
        const id = slugger.slug(text(node));
        node.properties = { ...node.properties, id: /^[0-9]/.test(id) ? "s-" + id : id };
      }
    }
    node.children?.forEach((c) => walk(c, inHead || node.tagName === "thead"));
  };
  return (tree) => {
    slugger = new GithubSlugger();
    walk(tree);
  };
}

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
    // Sin estilos en línea: la CSP no necesita 'unsafe-inline'.
    inlineStylesheets: "never",
    assets: "_assets",
  },
  compressHTML: true,
  markdown: { rehypePlugins: [rehypePlaceholders] },
  vite: {
    build: {
      // Nombres con hash de contenido: builds reproducibles y SRI estable.
      assetsInlineLimit: 0,
    },
  },
});
