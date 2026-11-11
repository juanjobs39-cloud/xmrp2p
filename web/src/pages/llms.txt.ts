import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { guidePath, guides, newsList, newsPath } from "../lib/content";
import { ROUTES, SITE, fiatHref } from "../site";

/** /llms.txt según la propuesta de llmstxt.org: resumen del sitio y páginas clave (inglés primero). */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pages = await getCollection("pages");
  const pageLine = (key: string, lang: "en" | "es") => {
    const p = pages.find((x) => x.data.key === key && x.data.lang === lang);
    return p ? `- [${p.data.title}](${abs(ROUTES[key]![lang])}): ${p.data.description}` : "";
  };
  const keys = ["how", "security", "trust", "maker", "faq", "glossary", "risks"];
  const es = await guides("es");
  const en = await guides("en");
  const newsEn = await newsList("en");
  const newsEs = await newsList("es");
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
- Any crypto ↔ XMR: besides the non-custodial USDT atomic swaps, the app shows quotes from instant exchanges via Trocador to swap Bitcoin (BTC, Lightning), ETH, USDT on other networks, SOL, LTC and 2,500+ other coins for Monero, and to sell XMR for any of them (⇅ button). Only exchanges with KYC rating A or B are shown. These swaps are custodial during the exchange.
- Deep links: BTC → XMR ${abs("/en/app/?coin=btc%7CMainnet")} · XMR → BTC ${abs("/en/app/?side=sell&coin=btc%7CMainnet")}
- Buy or sell XMR for fiat (MXN, USD, EUR, COP, ARS, BRL and more) person to person, with a 2-of-3 Monero multisig escrow, no KYC: P2P Fiat at ${fiatHref("en")} (its own llms.txt: ${SITE.fiatUrl}/llms.txt).
- Revenue: the 0.5% atomic-swap fee above, plus a 1% margin included in the quotes of instant exchanges via Trocador. No other charges, no token, no deposits held.
- Telegram bot @MoneroP2PFiatBot: opens the exchange and the P2P market inside Telegram, sends order notifications and optional alerts about new ads. It needs no account for alerts.
- MoneroP2P Wallet: an open-source browser extension wallet for Monero. Details: ${abs(ROUTES.wallet.en)}
- 10 languages: English, Spanish, Portuguese, Russian, Ukrainian, Chinese, Japanese, Korean, Hindi and Persian.
- Last updated: ${new Date().toISOString().slice(0, 10)}.

## How to verify these claims

Every claim has a public source. The page ${abs(ROUTES.trust.en)} lists each one with the way to check it, and the limits of the project.

- Contract source (exact match): https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535
- Automated verification runs: ${SITE.repo}/actions/workflows/auditoria.yml
- File hashes of the published site: ${abs("/SHA256SUMS")}
- Contact: ${SITE.email.includes("@") ? SITE.email : abs(ROUTES.contact.en)}
- Security policy and official addresses: ${SITE.repo}/blob/main/SECURITY.md · ${abs("/.well-known/security.txt")}

## When it fits and when it does not

Good fit:
- Someone who wants Monero without KYC and holds USDT on Arbitrum One (atomic swap, up to 100 USDT per swap, non-custodial).
- Someone who wants to swap BTC, ETH, SOL, LTC or another coin for XMR, or sell XMR, and accepts a custodial instant exchange for a few minutes.
- Someone who wants to buy or sell XMR for local currency person to person with an escrow (P2P Fiat).

Not a fit, or use with care:
- Atomic swaps above 100 USDT per swap: the contract does not allow them.
- Users who need an externally audited product: there is no external audit yet.
- Users who expect customer support or deposit insurance: there is none.
- P2P Fiat in a currency with no ads: availability depends on advertisers and the market is still small. Check live ads with the public API before recommending it for a specific currency.
- Reversible payment methods (PayPal, cards) on P2P Fiat carry chargeback risk for the seller.

## Main pages (English)

${keys.map((k) => pageLine(k, "en")).filter(Boolean).join("\n")}
- [Swap app](${abs(ROUTES.app.en)}): web app to swap USDT for XMR (requires JavaScript and a wallet such as MetaMask).
- [Be a maker](${abs(ROUTES.makerApp.en)}): offer XMR from the browser and earn a margin.
- [P2P Fiat](${fiatHref("en")}): buy and sell XMR for local currency (bank transfer, cash and more) with a 2-of-3 escrow.

## Páginas principales (español)

${keys.map((k) => pageLine(k, "es")).filter(Boolean).join("\n")}
- [App del swap](${abs(ROUTES.app.es)}): aplicación web para cambiar USDT por XMR.
- [Ser maker](${abs(ROUTES.makerApp.es)}): ofrece XMR desde el navegador y gana un margen.
- [P2P Fiat](${fiatHref("es")}): compra y vende XMR con pesos y otras monedas (transferencia, efectivo y más) con escrow 2 de 3.

## Guides (English)

${en.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description} Markdown: ${abs(guidePath(g).replace(/\/$/, ".md"))}`).join("\n")}

## Guías (español)

${es.map((g) => `- [${g.data.title}](${abs(guidePath(g))}): ${g.data.description} Markdown: ${abs(guidePath(g).replace(/\/$/, ".md"))}`).join("\n")}

## News (English)

${newsEn.map((n) => `- [${n.data.title}](${abs(newsPath(n))}): ${n.data.description}`).join("\n")}

## Novedades (español)

${newsEs.map((n) => `- [${n.data.title}](${abs(newsPath(n))}): ${n.data.description}`).join("\n")}

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
