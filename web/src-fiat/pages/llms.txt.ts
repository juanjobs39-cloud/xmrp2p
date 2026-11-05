import type { APIRoute } from "astro";
import { COUNTRIES, FACTS, faq, MAIN_SITE, METHODS, pageGroups, REAL, REPO, ROUTES } from "../content";

/** llms.txt: resumen del sitio para asistentes de IA, con la API pública de solo lectura. */
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const groups = pageGroups();
  const list = (lang: "es" | "en", kind: string) =>
    groups
      .filter((g) => g.kind === kind)
      .map((g) => `- [${g.name[lang]}](${abs(g.urls[lang])})`)
      .join("\n");
  const body = `# MoneroP2P Fiat

> Peer-to-peer marketplace to buy and sell Monero (XMR) for local currency (MXN, USD, EUR, COP, ARS, BRL, PEN, VES, CLP, CAD, INR and 150+ more) with bank transfers, payment apps or cash. Every order's XMR is locked in a 2-of-3 Monero multisig escrow (buyer, seller, arbiter) until the seller confirms the fiat payment. No KYC, no email. ${REAL ? "Live on Monero mainnet (real money)." : "Beta on Monero stagenet (test network)."}

Key facts:
- Buying is free; sellers pay ${FACTS.feePct}% of the amount in XMR on release, plus the Monero network fee.
- Cap of ${FACTS.capUsd} USD (or equivalent) per order; up to ${FACTS.maxOpenOrders} open orders per user.
- The escrow is built when an order opens (it needs the buyer's key), not when an ad is posted. Only ads from advertisers active in the last ${FACTS.onlineMin} minutes can be taken. Sellers have ${FACTS.depositWindowMin} minutes to deposit (any overpayment or unused network reserve is refunded automatically to the seller on payout; an underfunded deposit cancels the order and is refunded to the seller minus the network fee); the order chat and the seller's payment details stay locked until the deposit is confirmed; after ${FACTS.confirmations} confirmations (~20 min) the buyer pays off-platform and marks the payment; the seller releases. Appeals open ${FACTS.disputeAfterMin} minutes after the payment is marked; support signs with one party.
- Prices are set by advertisers, usually as a margin over the market price (median of Kraken, KuCoin, MEXC, HTX and CoinGecko, converted with daily FX rates).
- Reversible payment methods (PayPal, Mercado Pago, Revolut, cards) are flagged; sellers can require a minimum order history for them.
- Accounts are keys generated in the browser, protected by a password, with a downloadable backup.
- Languages: Spanish (/es/), English (/en/), Portuguese (/pt/) and Russian (/ru/); the market app UI is in Spanish or English.
- Open source (AGPL-3.0): ${REPO}. Crypto ↔ XMR swaps (BTC, USDT, ETH… and atomic swaps) live on the main site: ${MAIN_SITE}/

## Deep links (market with filters)

- Buy XMR with SPEI in MXN: ${abs(ROUTES.app.en)}#/?lado=comprar&fiat=MXN&metodo=SPEI
- Sell XMR for EUR: ${abs(ROUTES.app.en)}#/?lado=vender&fiat=EUR
- Parameters: lado=comprar|vender, fiat=<ISO 4217>, metodo=<method name>, pais=<ISO 3166-1 alpha-2>, monto=<amount>. Spanish pages use ${abs(ROUTES.app.es)}.

## Public read-only API (JSON, no key, CORS enabled)

- Market price of XMR in a currency: ${abs("/v1/p2p/price?fiat=MXN")} → {fiat, price, usd, rate, sources, at}
- Ads: ${abs("/v1/p2p/ads?side=sell&fiat=MXN")} (side=sell lists XMR for sale, i.e. where you can buy; side=buy lists buyers). Optional: method, country, amount, online=1. Each ad includes price, min_fiat, max_fiat, available_xmr, methods, pay_window_min and the advertiser's public stats (orders, completion %, online).
- Supported currencies: ${abs("/v1/p2p/fiats")} · Suggested methods for a currency: ${abs("/v1/p2p/methods?fiat=COP")} · Platform settings: ${abs("/v1/p2p/config")}

## Pages (English)

${list("en", "info")}

### Payment methods

${list("en", "method")}

### Countries

${list("en", "country")}

## Páginas (español)

${list("es", "info")}

### Métodos de pago

${list("es", "method")}

### Países

${list("es", "country")}

## FAQ

${faq("en")
  .map((x) => `### ${x.q}\n${x.a}`)
  .join("\n\n")}

## Optional

- Methods covered: ${METHODS.map((m) => m.name).join(", ")}.
- Countries covered: ${COUNTRIES.map((c) => c.name.en.replace(/^the /, "")).join(", ")}.
- Sitemap: ${abs("/sitemap.xml")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
