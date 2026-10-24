import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { guidePath, guides } from "../lib/content";
import { ROUTES, SITE } from "../site";

/** /llms.txt según la propuesta de llmstxt.org: resumen del sitio y páginas clave. */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pages = await getCollection("pages", (p) => p.data.lang === "es");
  const pageLine = (key: string) => {
    const p = pages.find((x) => x.data.key === key);
    return p ? `- [${p.data.title}](${abs(ROUTES[key]!.es)}): ${p.data.description}` : "";
  };
  const es = await guides("es");
  const en = await guides("en");
  const body = `# ${SITE.brand}

> ${SITE.brand} es una plataforma P2P sin custodia para cambiar USDT por Monero (XMR) mediante atomic swaps que corren en el navegador del usuario. Nadie custodia fondos: un contrato inteligente retiene el USDT y solo lo libera al maker cuando este revela el secreto que permite al usuario tomar el XMR; si algo falla, el usuario recupera su USDT. Estado actual: pruebas en testnet, sin auditoría; no usar con dinero real.

Datos clave:
- Redes: Arbitrum Sepolia (testnet) para USDT; Monero stagenet. Tron en evaluación.
- Comisión: porcentaje fijo cobrado por el contrato al completarse el swap, con tope de 1 % escrito en el código.
- Plazos: el usuario confirma antes de t0 o reembolsa; desde t1 puede reembolsar si el maker no cobró.
- Código abierto (AGPL-3.0): ${SITE.repo}
- API pública de cotizaciones (OpenAPI) y servidor MCP de solo lectura: ver la sección API.

## Páginas principales

${["how", "security", "maker", "faq", "glossary", "risks"].map(pageLine).filter(Boolean).join("\n")}
- [App del swap](${abs(ROUTES.app.es)}): aplicación web para hacer el swap (requiere JavaScript).

## Guías (español)

${es.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description} Markdown: ${abs(guidePath(g).replace(/\/$/, ".md"))}`).join("\n")}

## Guides (English)

${en.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description}`).join("\n")}

## API

- OpenAPI: ${SITE.apiUrl ? SITE.apiUrl + "/openapi.json" : "(se publica con el backend)"}
- MCP (solo lectura, JSON-RPC por HTTP): ${SITE.apiUrl ? SITE.apiUrl + "/mcp" : "(se publica con el backend)"} — herramientas list_networks, list_offers, get_quote.

## Optional

- [Contenido completo en texto plano](${abs("/llms-full.txt")})
- [Términos de uso](${abs(ROUTES.terms.es)})
- [Política de privacidad](${abs(ROUTES.privacy.es)})
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
