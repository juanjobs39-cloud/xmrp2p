# MoneroP2P

[![CI](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/ci.yml/badge.svg)](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/ci.yml)
[![Contract verification](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml/badge.svg)](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml)
[![Sourcify](https://img.shields.io/badge/Sourcify-verified-green)](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

**Buy, sell and swap Monero (XMR) without KYC and without handing your funds to a custodian.** MoneroP2P is an open-source platform with three ways to get or sell XMR:

| Product | What it does | Custody | Limits and cost |
|---|---|---|---|
| **Atomic swap** USDT → XMR | Swaps USDT (Arbitrum One) for XMR in your browser. A contract locks the USDT and only releases it once you can take the XMR; otherwise you refund. | **Non-custodial** | Up to 100 USDT per swap. 0.5% fee paid by the maker; the buyer pays only gas. |
| **Instant exchange** | Quotes from instant exchanges via [Trocador](https://trocador.app) to swap BTC, ETH, SOL, LTC and 2,500+ coins for XMR, or sell XMR. | Custodial for a few minutes (the exchange you pick) | Limits set by each exchange. Quotes include a 1% margin for MoneroP2P. |
| **P2P Fiat** | Person-to-person market to buy and sell XMR for local currency (bank transfer, payment apps, cash). Each order's XMR sits in a **2-of-3 Monero multisig escrow**. | **Non-custodial** (no single party can move the XMR) | Up to 1000 USD per order. Buying is free; sellers pay 0.5%. |

No account for swaps, no KYC, and the apps load no third-party scripts. Available in 10 languages.

🌐 **Live with real money since October 26, 2026:** **[monerop2p.app](https://monerop2p.app)** (swaps and exchange) · **[fiat.monerop2p.app](https://fiat.monerop2p.app)** (P2P Fiat) · Telegram bot [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot)

## Is it safe? What you can verify

You do not have to trust us. Each claim has a public source, listed with its limits on **[monerop2p.app/en/is-monerop2p-legit](https://monerop2p.app/en/is-monerop2p-legit/)**.

- **The swap contract is immutable:** no admin, no pause, no upgrades. Source verified on [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match).
- **Automated verification is public and repeatable:** see [Verification](#verification) below.
- **Limits and the fee cap are constants in the contract:** 100 USDT per swap, fee capped at 1%.
- **The published site matches this repository:** every release ships [`SHA256SUMS`](https://monerop2p.app/SHA256SUMS).
- **Keys never leave the browser.** The backend rejects any message containing a full private key.

**What it does not have yet:** an external audit, a long track record or large volume. It is a young project, which is why limits are low. Instant exchanges are custodial during the swap. On P2P Fiat the escrow protects the XMR, not the bank payment, and disputes are decided by an arbiter operated by the project. Read the [risk notice](https://monerop2p.app/en/risk-notice/).

## How an atomic swap works

1. **Buyer (taker)** picks an offer, enters their Monero address and downloads an encrypted recovery file.
2. They deposit USDT into a fresh escrow contract from their wallet (MetaMask or compatible).
3. **Seller (maker)** locks the XMR at a shared address. The app verifies the amount with the transaction key while the Monero network confirms it (10 confirmations, ~20 min).
4. The buyer confirms. The maker claims the USDT and, by doing so, reveals a secret. The app combines both secrets and sends the XMR to the buyer's address.

If the maker never locks the XMR, the buyer refunds before the first deadline. If the maker never claims, the buyer refunds after the second deadline and the maker recovers their XMR. **At every moment exactly one party can close the swap.**

The protocol (split Monero keys, a cross-group DLEQ proof between secp256k1 and ed25519, and a two-deadline escrow) is based on [AthanorLabs' atomic swaps](https://github.com/AthanorLabs/atomic-swap). Details: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## How P2P Fiat works

1. A user posts an ad (buy or sell) with price, limits and payment methods. No XMR is locked at this point.
2. When someone opens an order, the browsers of buyer and seller and the arbiter build a **2-of-3 Monero multisig** address. Two of three keys are needed to move the XMR.
3. The seller deposits the XMR. After 10 confirmations the order shows it as locked and the encrypted chat opens.
4. The buyer pays outside the platform and marks the order as paid. The seller checks their account and releases.
5. If they disagree, either side opens an appeal and the arbiter signs with one of them.

Accounts are keys generated in the browser and protected by a password. Design notes: [docs/PLAN-P2P-FIAT.md](docs/PLAN-P2P-FIAT.md) and [arbiter/README.md](arbiter/README.md).

## Use it

| I want to… | Where |
|---|---|
| Swap USDT or another coin for XMR | [monerop2p.app/en/app](https://monerop2p.app/en/app/) |
| Buy or sell XMR for local currency | [fiat.monerop2p.app/en/app](https://fiat.monerop2p.app/en/app/) |
| Offer XMR and earn a margin from my browser | [monerop2p.app/en/maker](https://monerop2p.app/en/maker/) |
| Run a 24/7 maker on my own PC or server | [maker/README.md](maker/README.md) |
| Use it inside Telegram, with order notifications and alerts for new ads | [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) |
| Use the browser-extension wallet (in development, not in the stores yet) | [wallet/README.md](wallet/README.md) |
| Practice with test funds | add `?red=prueba` to the app or maker URL |

## Contracts (Arbitrum One)

| Contract | Address |
|---|---|
| SwapFactory | [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) |
| SwapEscrow (implementation) | [`0xea627C04432e9959eAF15Fe7EE25DE7588bdA341`](https://arbiscan.io/address/0xea627C04432e9959eAF15Fe7EE25DE7588bdA341) |
| Token | USD₮0 `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |

Immutable: no admin, no pause, no upgrades. `MAX_AMOUNT` = 100 USDT per swap. Source verified on [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match). All deployments: [docs/DESPLIEGUES.md](docs/DESPLIEGUES.md).

## Verification

| Tool | Result |
|---|---|
| [Halmos](https://github.com/a16z/halmos) (symbolic verification) | ✅ 7/7 properties proven for **all** inputs: the cap holds, only the maker claims, only the taker refunds, exactly one party can close at any time, exact payout and fee, no double close |
| [Aderyn](https://github.com/Cyfrin/aderyn) (Cyfrin) | ✅ 0 high findings; 6 low, all triaged |
| [Slither](https://github.com/crytic/slither) (Trail of Bits) | ✅ No medium or high findings |
| Foundry tests | ✅ 122 unit, fuzz and invariant tests; long run with 20,000 fuzz cases and 100,000 invariant calls; fork tests against the real USD₮0 |
| End to end | ✅ 10/10 testnet failure cases, plus real-money swaps on mainnet |

Report: [docs/AUDITORIA-GRATUITA.md](docs/AUDITORIA-GRATUITA.md). Re-run it yourself with the [verification workflow](.github/workflows/auditoria.yml). **No external audit yet**: that is why each swap is capped at 100 USDT in the contract. These tools cover the swap contract; the P2P Fiat escrow relies on Monero's own multisig and is covered by the tests in `workers/` and `arbiter/`.

## For developers, aggregators and AI agents

Everything here is read-only, needs no key and has CORS enabled.

| What | Where |
|---|---|
| Site summary for language models | [monerop2p.app/llms.txt](https://monerop2p.app/llms.txt) · [fiat.monerop2p.app/llms.txt](https://fiat.monerop2p.app/llms.txt) (each links its `llms-full.txt`) |
| Swap API: offers, quotes, reference price | [api.monerop2p.app/openapi.json](https://api.monerop2p.app/openapi.json) |
| MCP server (tools `list_networks`, `list_offers`, `get_quote`) | `https://api.monerop2p.app/mcp` |
| P2P Fiat API: price per currency, live ads, methods | [fiat.monerop2p.app/openapi.json](https://fiat.monerop2p.app/openapi.json) |
| Integration guide for aggregators | [docs/AGREGADORES.md](docs/AGREGADORES.md) |
| Every guide as Markdown | add `.md` to a guide URL, e.g. [what-is-an-atomic-swap.md](https://monerop2p.app/en/guides/what-is-an-atomic-swap.md) |

## Repository

| Folder | Contents |
|---|---|
| [`contracts/`](contracts/README.md) | Escrow and factory in Solidity (Foundry), Halmos properties |
| [`crypto-wasm/`](crypto-wasm/README.md) | Cryptographic core in Rust → WebAssembly (keys, DLEQ, shared address, key recovery) |
| [`web/`](web/README.md) | Public site (Astro) with the swap app and the in-browser maker (`web/src`), and the P2P Fiat site and market app (`web/src-fiat`, `web/src/p2p`) |
| [`workers/`](workers/README.md) | Cloudflare backend: order book (D1), swap channel (Durable Objects), Monero node proxy, price API, contract monitor, MCP server, the P2P Fiat API and its Telegram bot |
| [`arbiter/`](arbiter/README.md) | Third key of the P2P Fiat 2-of-3 escrow: co-signs releases, refunds and dispute resolutions |
| [`maker/`](maker/README.md) | Self-hosted 24/7 maker daemon (Python), with systemd units |
| [`wallet/`](wallet/README.md) | MoneroP2P Wallet: non-custodial browser-extension wallet (Manifest V3) |
| [`e2e/`](e2e/) | Automated end-to-end taker used for testnet tests |
| [`docs/`](docs/) | Architecture, tests, deployments, verification report, mainnet checklist |

## Develop

```bash
# Contracts
cd contracts && forge test
# Crypto core
cd crypto-wasm && cargo test
# Web (site + app)
cd web && npm ci && npm test && npm run build
# P2P Fiat site
cd web && PUBLIC_SITE=fiat npm run build
# Backend
cd workers && npm ci && npm test
# Maker daemon
cd maker && python -m venv .venv && .venv/bin/pip install -e ".[dev]" && .venv/bin/python -m pytest
```

Copy `web/.env.example` and `maker/maker.example.toml` before running locally. **Never commit private keys, seeds or recovery files**, not even for testnet; CI scans every commit with gitleaks.

## Security

Found a vulnerability? Please report it privately: see [SECURITY.md](SECURITY.md). Crypto transactions are irreversible; read the [risk notice](https://monerop2p.app/en/risk-notice/) before using the service. MoneroP2P never asks for your seed phrase, private keys or recovery file.

## License

[AGPL-3.0](LICENSE). If you modify this software and offer it as a network service, you must publish your source code.

---

### Resumen en español

MoneroP2P es una plataforma de código abierto para **comprar, vender y cambiar Monero (XMR) sin KYC**, con tres opciones: *atomic swaps* de USDT a XMR **sin custodia** (máximo 100 USDT por swap), cotizaciones de **exchanges instantáneos** para BTC, ETH y 2,500+ monedas vía Trocador (con custodia durante el cambio y un margen de 1 %), y **P2P Fiat**, un mercado de persona a persona con moneda local y **escrow multifirma 2 de 3** (máximo 1000 USD por orden). Funciona con **dinero real desde el 26 de octubre de 2026**. Sitios: **[monerop2p.app/es](https://monerop2p.app/es/)** y **[fiat.monerop2p.app/es](https://fiat.monerop2p.app/es/)**; bot de Telegram [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot). El contrato está verificado con Halmos, Aderyn, Slither y Sourcify ([informe](docs/AUDITORIA-GRATUITA.md)) y **todavía no tiene auditoría externa**. Qué se puede comprobar y qué límites tiene: **[monerop2p.app/es/es-confiable](https://monerop2p.app/es/es-confiable/)**.
