# MoneroP2P

[![CI](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/ci.yml/badge.svg)](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/ci.yml)
[![Contract verification](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml/badge.svg)](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml)
[![Sourcify](https://img.shields.io/badge/Sourcify-verified-green)](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

**Swap USDT for Monero (XMR) without handing your funds to anyone.** MoneroP2P is a non-custodial, peer-to-peer platform that runs **atomic swaps in your browser**. A smart contract locks the USDT and only releases it to the seller once you can take the XMR; if anything fails, you get your USDT back. No account, no KYC, nothing to install.

🌐 **Live:** **[monerop2p.app](https://monerop2p.app)** — real money on Arbitrum One + Monero, maximum **100 USDT per swap**. Tested end to end with real funds (first swap completed on October 26, 2026). A testnet practice mode is also available.

## How it works

1. **Buyer (taker)** picks an offer, enters their Monero address and downloads an encrypted recovery file.
2. They deposit USDT into a fresh escrow contract from their wallet (MetaMask or compatible).
3. **Seller (maker)** locks the XMR at a shared address. The app verifies the amount with the transaction key while the Monero network confirms it (10 confirmations, ~20 min).
4. The buyer confirms. The maker claims the USDT and, by doing so, reveals a secret. The app combines both secrets and sends the XMR to the buyer's address.

If the maker never locks the XMR, the buyer refunds before the first deadline. If the maker never claims, the buyer refunds after the second deadline and the maker recovers their XMR. **At every moment exactly one party can close the swap.**

The protocol (split Monero keys, a cross-group DLEQ proof between secp256k1 and ed25519, and a two-deadline escrow) is based on [AthanorLabs' atomic swaps](https://github.com/AthanorLabs/atomic-swap). Details: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Use it

| I want to… | Where |
|---|---|
| Swap USDT for XMR | [monerop2p.app/en/app](https://monerop2p.app/en/app/) |
| Offer XMR and earn a margin from my browser | [monerop2p.app/en/maker](https://monerop2p.app/en/maker/) |
| Run a 24/7 maker on my own PC or server | [maker/README.md](maker/README.md) |
| Practice with test funds | add `?red=prueba` to the app or maker URL |

**Fee:** 0.5 % of each completed swap, paid by the maker out of the USDT they receive (the buyer only pays network gas). The contract caps the fee at 1 %.

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

Report: [docs/AUDITORIA-GRATUITA.md](docs/AUDITORIA-GRATUITA.md). Re-run it yourself with the [verification workflow](.github/workflows/auditoria.yml). **No external audit yet**: that is why each swap is capped at 100 USDT in the contract.

## Repository

| Folder | Contents |
|---|---|
| [`contracts/`](contracts/README.md) | Escrow and factory in Solidity (Foundry), Halmos properties |
| [`crypto-wasm/`](crypto-wasm/README.md) | Cryptographic core in Rust → WebAssembly (keys, DLEQ, shared address, key recovery) |
| [`web/`](web/README.md) | Public site (Astro) + the buyer app and the in-browser maker |
| [`workers/`](workers/README.md) | Cloudflare backend: order book (D1), swap channel (Durable Objects), Monero node proxy, price API, contract monitor, MCP server |
| [`maker/`](maker/README.md) | Self-hosted 24/7 maker daemon (Python), with systemd units |
| [`e2e/`](e2e/) | Automated end-to-end taker used for testnet tests |
| [`docs/`](docs/) | Architecture, tests, deployments, verification report, mainnet checklist |

**For AI agents and integrations:** [`/llms.txt`](https://monerop2p.app/llms.txt), a read-only [OpenAPI](https://api.monerop2p.app/openapi.json) (offers, quotes, reference price) and a read-only [MCP server](https://api.monerop2p.app/mcp).

## Develop

```bash
# Contracts
cd contracts && forge test
# Crypto core
cd crypto-wasm && cargo test
# Web (site + app)
cd web && npm ci && npm test && npm run build
# Backend
cd workers && npm ci && npm test
# Maker daemon
cd maker && python -m venv .venv && .venv/bin/pip install -e ".[dev]" && .venv/bin/python -m pytest
```

Copy `web/.env.example` and `maker/maker.example.toml` before running locally. **Never commit private keys, seeds or recovery files**, not even for testnet; CI scans every commit with gitleaks.

## Security

Found a vulnerability? Please report it privately: see [SECURITY.md](SECURITY.md). Crypto transactions are irreversible; read the [risk notice](https://monerop2p.app/en/risk-notice/) before using the service.

## License

[AGPL-3.0](LICENSE). If you modify this software and offer it as a network service, you must publish your source code.

---

### Resumen en español

MoneroP2P es una plataforma P2P **sin custodia** para cambiar **USDT por Monero (XMR)** con *atomic swaps* que corren en tu navegador. Funciona con **dinero real en Arbitrum One + Monero**, con un **máximo de 100 USDT por swap**, y también tiene un modo de práctica en testnet. Sitio: **[monerop2p.app/es](https://monerop2p.app/es/)**. Puedes ser maker desde el navegador ([monerop2p.app/es/maker](https://monerop2p.app/es/maker/)) o con tu propio servidor ([maker/README.md](maker/README.md)). Contrato verificado con Halmos, Aderyn, Slither y Sourcify ([informe](docs/AUDITORIA-GRATUITA.md)); todavía sin auditoría externa.
