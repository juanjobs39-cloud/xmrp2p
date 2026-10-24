import { defineConfig } from "astro/config";

// Dominio definitivo: PUBLIC_SITE_URL (ver web/.env.example). Hasta tenerlo, un valor de ejemplo.
const site = process.env.PUBLIC_SITE_URL ?? "https://xmrp2p.example";

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
  vite: {
    build: {
      // Nombres con hash de contenido: builds reproducibles y SRI estable.
      assetsInlineLimit: 0,
    },
  },
});
