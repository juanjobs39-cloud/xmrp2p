# Integrating MoneroP2P in an aggregator

MoneroP2P swaps **USDT (USD₮0, Arbitrum One) → Monero (XMR)** with non-custodial atomic swaps. The buyer finishes the swap in our web app: they keep their own keys, download an encrypted recovery file and sign one deposit with their wallet (MetaMask or compatible). Nobody, including MoneroP2P, holds their funds.

That means the flow is **"quote → open the app"** instead of **"send to a deposit address"**. Aggregators can show our live quotes and send the user to the app with everything pre-filled.

## 1. Get a quote

```
GET https://api.monerop2p.app/v1/quote?network=arbitrum_one&usdt=50&ref=<your-id>
GET https://api.monerop2p.app/v1/quote?network=arbitrum_one&xmr=0.08&ref=<your-id>
```

Use `usdt` (amount to pay) **or** `xmr` (amount to receive). Response `200`:

```json
{
  "network": "arbitrum_one",
  "usdt": "50",
  "xmr": "0.081234567890",
  "price": "615.500000",
  "offer_id": "…",
  "maker": "0x…",
  "expires_at": 1793072287,
  "indicative": true,
  "buyer_fee": "network gas only",
  "eta_minutes": 45,
  "app_url": "https://monerop2p.app/en/app/?usdt=50&offer=…&ref=<your-id>",
  "limits": { "min_usdt": "5", "max_usdt": "100" }
}
```

`404` means no offer covers that amount; the body still includes `limits`. Quotes are indicative: the maker confirms the exact amount when the swap starts, and the app checks it is at least 98 % of the published offer.

Other read-only endpoints: `GET /v1/offers?network=arbitrum_one` (all live offers), `GET /v1/price` (reference XMR/USDT price), `GET /openapi.json`, and a read-only MCP server at `/mcp`.

## 2. Send the user to the app

Use `app_url` from the quote, optionally adding the user's Monero address:

```
https://monerop2p.app/en/app/?usdt=50&offer=<offer_id>&to=<XMR address>&ref=<your-id>
```

| Parameter | Meaning |
|---|---|
| `usdt` | Amount to pay (up to 6 decimals) |
| `offer` | Offer id from the quote (pre-selected if still live) |
| `to` | Buyer's Monero address (standard `4…` or subaddress `8…`) |
| `ref` | Your id (letters, digits, `-`, `_`, up to 32), counted in our statistics |
| `red=prueba` | Testnet practice mode instead of real money |

The app only pre-fills the form. The user still reviews it, sets a password for the recovery file and signs.

## 3. Facts to show your users

| | |
|---|---|
| Pair | USDT (USD₮0 on Arbitrum One) → XMR |
| Limits | Up to **100 USDT per swap** (enforced by the contract) |
| Time | ~30–45 min (10 Monero confirmations) |
| Fees | 0.5 % paid by the maker out of the USDT they receive; the buyer pays network gas only |
| KYC | None. No account, no email |
| Custody | None. If anything fails, the buyer refunds their USDT from the contract |
| Contract | SwapFactory `0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`, verified on Sourcify |
| Verification | Halmos 7/7, Aderyn 0 high, Slither 0 medium/high ([report](AUDITORIA-GRATUITA.md)); no external audit yet |
| Source | https://github.com/juanjobs39-cloud/xmrp2p (AGPL-3.0) |

Contact for partnerships: open an issue on GitHub or see the contact page at https://monerop2p.app/en/contact/.
