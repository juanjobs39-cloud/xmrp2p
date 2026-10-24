---
key: what-is-monero
lang: en
slug: what-is-monero
title: What is Monero and how it differs from Bitcoin
description: "Monero (XMR) is private by default: it hides sender, receiver and amount. Differences with Bitcoin in privacy, issuance and use."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**Short answer:** Monero (XMR) is a cryptocurrency that hides by default who sends, who receives and how much. On Bitcoin, by contrast, every address and amount is public and anyone can trace funds. Monero has existed since 2014 and is open source.

## Main differences

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Sender | Hidden (ring signatures) | Public |
| Receiver | Hidden (one-time addresses) | Public |
| Amount | Hidden (RingCT) | Public |
| Privacy | Always on | Optional and limited |
| Block time | About 2 minutes | About 10 minutes |
| Issuance | Small permanent tail emission since 2022 | 21 million cap |
| Smart contracts | No | Limited scripts |

## How it achieves privacy

- **Ring signatures:** your transaction is mixed with other outputs from the chain, so the real one is unknown.
- **Stealth addresses:** each payment goes to a one-time address; your public address never appears on-chain.
- **RingCT:** amounts are encrypted, yet the network verifies no money is created out of thin air.

## Fungibility

Because history is not visible, every XMR is interchangeable with any other. With transparent coins, some units can be rejected because of their history.

## View key

Monero lets you share a **view key**, which shows received payments without allowing spending. xmrp2p uses it so the buyer can verify the XMR reached the shared address.

## What to keep in mind

- Some centralized exchanges have delisted Monero in certain jurisdictions. That is why intermediary-free methods, like atomic swaps, matter.
- Privacy does not exempt you from your country's laws.

Next: [how to create a Monero wallet](/en/guides/how-to-create-a-monero-wallet/).
