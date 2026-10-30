---
key: real-money-launch
lang: en
slug: monerop2p-is-live-with-real-money
title: MoneroP2P is live with real money
description: "Since October 26, 2026 you can swap USDT for Monero with real money on Arbitrum One: non-custodial, no account, up to 100 USDT per swap."
published: 2026-10-30
---

**In short:** since **October 26, 2026** MoneroP2P runs with real money. You can swap USDT (USD₮0 on Arbitrum One) for Monero through an atomic swap that runs in your browser, with no account and nobody holding your funds. Each swap is capped at **100 USDT**, enforced by the contract itself.

## What changed

Until now the platform only ran on test networks. The first real-money swap completed end to end on October 26: the buyer deposited USDT, the maker locked the XMR, the buyer confirmed and received their Monero, and the contract paid the maker. Real-money mode has been the site's default since then.

The testnet practice mode is still available for anyone who wants to try without risk.

## How we protect your money

- **Nobody holds funds.** Your USDT sits in a contract dedicated to your swap, with no admin functions. It can only pay the maker once you can take the XMR, or refund your USDT if something fails.
- **Verified contract.** It passed symbolic verification with **Halmos** (7 of 7 properties proven for every input) and static analysis with **Aderyn** (0 high findings) and **Slither** (no medium or high findings). Its source is verified on **Sourcify**: [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **100 USDT cap per swap.** There is no external audit yet, so we limit what a single swap can put at risk. The cap lives in the contract and nobody can raise it without deploying a new one.
- **Open source** (AGPL-3.0) on [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), with SHA-256 sums for every site file so you can verify what you load.

## What it costs

The platform fee is **0.5%** and the maker pays it when claiming. You only pay Arbitrum gas to deposit and confirm, and the Monero network fee when you receive. Each maker's price already includes their margin; the app shows the exact XMR before you deposit.

## Other news from these weeks

- **Simple view:** type how much USDT you send, press "Exchange" and see every quote sorted by what you get.
- **More than 100 USDT, or no makers available:** the app shows quotes from instant exchanges via Trocador. That option works differently (the exchange holds the trade); we explain it in the [privacy policy](/en/privacy/).
- **Be a maker from your browser**, with nothing to install: the open tab works as your server. [How to be a maker](/en/become-a-maker/).
- **10 languages:** English, Spanish, Portuguese, Russian, Ukrainian, Chinese, Japanese, Korean, Hindi and Persian.

## What's next

- An external audit of the contract, which would let us raise the per-swap cap.
- More makers, so there are always offers.
- Evaluating other USDT networks, such as Tron.

[Open the app →](/en/app/) · Before using it, read the [risk notice](/en/risk-notice/).
