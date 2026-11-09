// Manifest de la app (para instalarla en la pantalla de inicio: en iPhone los avisos push solo
// funcionan con la app instalada).
import type { APIRoute } from "astro";
import { FIAT_LANGS, type L } from "../../../content";

export function getStaticPaths() {
  return FIAT_LANGS.map((lang) => ({ params: { lang } }));
}

const NAME: Record<L, string> = { es: "Mercado P2P de Monero", en: "Monero P2P market", pt: "Mercado P2P de Monero", ru: "P2P-рынок Monero" };

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as L;
  const app = `/${lang}/app/`;
  return new Response(
    JSON.stringify({
      name: `MoneroP2P Fiat · ${NAME[lang]}`,
      short_name: "P2P Fiat",
      lang,
      start_url: app,
      scope: app,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#f26822",
      icons: [
        { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    }),
    { headers: { "content-type": "application/manifest+json" } },
  );
};
