import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { guidePath, guides } from "../lib/content";
import { ROUTES, SITE } from "../site";

/** /llms.txt según la propuesta de llmstxt.org: resumen del sitio y páginas clave (inglés primero). */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pages = await getCollection("pages");
  const pageLine = (key: string, lang: "en" | "es") => {
    const p = pages.find((x) => x.data.key === key && x.data.lang === lang);
    return p ? `- [${p.data.title}](${abs(ROUTES[key]![lang])}): ${p.data.description}` : "";
  };
  const keys = ["how", "security", "maker", "faq", "glossary", "risks"];
  const es = await guides("es");
  const en = await guides("en");
  const body = `# ${SITE.brand}

> ${SITE.brand} is a non-custodial peer-to-peer platform to swap USDT for Monero (XMR) through atomic swaps that run in the user's browser. Nobody holds funds: a smart contract locks the USDT and only releases it to the seller (maker) when the maker reveals the secret that lets the buyer take the XMR; if anything fails, the buyer gets the USDT back. Live with real money on Arbitrum One + Monero, maximum 100 USDT per swap. Tested end to end with real funds (first swap completed on October 26, 2026).

Key facts:
- Networks: USDT (USD₮0) on Arbitrum One and Monero mainnet. A testnet practice mode (Arbitrum Sepolia + Monero stagenet) is also available.
- Swap contract (SwapFactory) on Arbitrum One: 0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535 — source verified on Sourcify (exact match).
- Limits: maximum 100 USDT per swap, enforced by the contract itself.
- Fee: 0.5% of each completed swap, paid by the maker from the USDT they receive; the buyer pays only network gas. The contract caps the fee at 1%.
- Verification: Halmos (symbolic verification, 7/7 properties proven), Aderyn (0 high findings), Slither (no medium or high findings). Report: ${SITE.repo}/blob/main/docs/AUDITORIA-GRATUITA.md. No external audit yet.
- Timing: a swap takes about 30–45 minutes (10 Monero confirmations). The buyer confirms once the locked XMR is verified; if not, they refund.
- Makers: anyone can be a maker from the browser (no install) or with a self-hosted 24/7 daemon. Offers disappear automatically when a maker goes offline.
- No account, no KYC, no custody. Open source (AGPL-3.0): ${SITE.repo}

## Main pages (English)

${keys.map((k) => pageLine(k, "en")).filter(Boolean).join("\n")}
- [Swap app](${abs(ROUTES.app.en)}): web app to swap USDT for XMR (requires JavaScript and a wallet such as MetaMask).
- [Be a maker](${abs(ROUTES.makerApp.en)}): offer XMR from the browser and earn a margin.

## Páginas principales (español)

${keys.map((k) => pageLine(k, "es")).filter(Boolean).join("\n")}
- [App del swap](${abs(ROUTES.app.es)}): aplicación web para cambiar USDT por XMR.
- [Ser maker](${abs(ROUTES.makerApp.es)}): ofrece XMR desde el navegador y gana un margen.

## Guides (English)

${en.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description} Markdown: ${abs(guidePath(g).replace(/\/$/, ".md"))}`).join("\n")}

## Guías (español)

${es.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description} Markdown: ${abs(guidePath(g).replace(/\/$/, ".md"))}`).join("\n")}

## API

- OpenAPI: ${SITE.apiUrl ? SITE.apiUrl + "/openapi.json" : "(published with the backend)"}
- Live offers: ${SITE.apiUrl ? SITE.apiUrl + "/v1/offers?network=arbitrum_one" : "(published with the backend)"}
- Reference price: ${SITE.apiUrl ? SITE.apiUrl + "/v1/price" : "(published with the backend)"}
- MCP (read-only, JSON-RPC over HTTP): ${SITE.apiUrl ? SITE.apiUrl + "/mcp" : "(published with the backend)"} — tools list_networks, list_offers, get_quote.

## Optional

- [Full content in plain text](${abs("/llms-full.txt")})
- [Terms of use](${abs(ROUTES.terms.en)})
- [Privacy policy](${abs(ROUTES.privacy.en)})
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
