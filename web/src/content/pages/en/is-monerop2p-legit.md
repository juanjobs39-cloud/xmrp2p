---
key: trust
lang: en
title: "Is MoneroP2P legit and safe? How to verify it yourself"
description: "What you can check on your own before trusting MoneroP2P: contract, code, fees and limits. And what it still lacks, such as an external audit."
updated: 2026-11-10
faq:
  - q: "Is MoneroP2P legit?"
    a: "MoneroP2P is an open-source, non-custodial platform that has run with real money since October 26, 2026. Its swap contract has no admin functions and its source is verified on Sourcify, so the main claims can be checked on public sources. It is a young project with no external audit yet, which is why each atomic swap is capped at 100 USDT."
  - q: "Can MoneroP2P take my funds?"
    a: "Not in an atomic swap: the USDT sits in a contract with no admin, pause or upgrade functions, and the XMR sits in an address that needs both key halves. In P2P Fiat the XMR is in a 2-of-3 multisig escrow where no single party, including MoneroP2P, can move it alone. Instant exchanges via Trocador are different: the exchange you choose holds the coins during the swap."
  - q: "Has MoneroP2P been audited?"
    a: "Not by an external firm yet. The contract passed automated verification with Halmos (7/7 properties proven), Aderyn (0 high findings) and Slither (no medium or high findings), and the report and runs are public. Until an external audit exists, the contract limits each swap to 100 USDT."
---

**Short answer:** MoneroP2P is an open-source, non-custodial platform that has run with real money since October 26, 2026. You do not have to take our word for it: every claim below can be checked on public sources. It is also a young project with no external audit yet, so limits are low on purpose.

## What you can verify yourself

| Claim | How to check it |
|---|---|
| Nobody holds your USDT in an atomic swap | The contract has no admin, pause or upgrade functions. Read its verified source on [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match) or on [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| The contract was checked | Halmos proved 7 of 7 properties, Aderyn found 0 high issues and Slither found no medium or high issues. See the [report](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) and the [public runs](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Limits and fees cannot be raised | The 100 USDT maximum per swap and the 1% fee cap are constants in the contract. The current fee is 0.5%, paid by the maker. |
| The site runs the published code | All the code is on [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) under AGPL-3.0. Every release publishes [SHA256SUMS](/SHA256SUMS) so you can compare the files you load with your own build. |
| P2P Fiat cannot move your XMR alone | Each order uses a 2-of-3 Monero multisig: buyer, seller and arbiter hold one key each and two are needed. See [how P2P Fiat works](https://fiat.monerop2p.app/en/how-it-works/). |
| Your keys stay with you | Keys are generated in your browser. There are no accounts on the swap app, and the app pages enforce a strict Content Security Policy that you can read in the page source. |
| It has worked with real funds | The first mainnet swap completed on October 26, 2026. Every swap creates its own contract through the factory, visible on Arbiscan. |

## Limits and what we do not have yet

- **No external audit.** The checks above are automated tools, not a review by an audit firm. That is why the contract caps each swap at 100 USDT.
- **Young project.** It launched in October 2026. Volume is small, and P2P Fiat has few ads in some currencies.
- **Instant exchanges are custodial.** Swaps from BTC, ETH and other coins go through third-party exchanges via Trocador: the exchange you pick holds the coins for a few minutes, and the quote includes a 1% margin for MoneroP2P.
- **P2P Fiat protects the XMR, not the bank payment.** The fiat payment happens outside the platform. Reversible methods such as PayPal or cards carry more risk, and disputes are decided by the arbiter, which we operate.
- **You are responsible for your keys.** If you lose your recovery file or your account password, we cannot restore them.
- **No company guarantee.** There is no deposit insurance and no customer-support hotline. Read the [risk notice](/en/risk-notice/).

## Who is behind it and how to reach us

MoneroP2P is an independent open-source project. The protocol builds on the atomic swaps by AthanorLabs. You can reach us through [the contact page](/en/contact/) and report vulnerabilities privately through the repository's Security tab. We will never ask for your seed, your recovery file or a payment to "unlock" a swap.

## Before you use it

1. Try the practice mode with test funds: add `?red=prueba` to the [swap app](/en/app/).
2. Start with a small amount.
3. Read [how it works](/en/how-it-works/) and the [security page](/en/security/).
4. Never trade outside the platform, even if someone asks you to.
