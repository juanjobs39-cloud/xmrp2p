---
key: atomic-swap
lang: en
slug: what-is-an-atomic-swap
title: What is an atomic swap and why is it safe
description: "An atomic swap trades coins across two chains with no intermediary: either both sides complete or neither does. How it works between USDT and Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**Short answer:** an atomic swap is a trade between two cryptocurrencies on different chains where neither party can keep the other's funds. It is called "atomic" because it is indivisible: either both transfers complete, or both are undone. Its safety does not depend on trusting anyone, but on cryptography and a contract with deadlines.

## The idea in one sentence

Each party locks their funds so that **the only way to get paid is to reveal the key the other party needs** to take theirs.

## How it works between USDT and Monero

Monero has no smart contracts, so the protocol uses two pieces:

1. **A shared Monero address**, whose private key is split in two halves: the XMR buyer holds one and the seller holds the other. Nobody can spend from it with only one half.
2. **A contract on the USDT network** that holds the USDT and only pays the seller if they reveal their key half.

When the seller claims the USDT, their half is published on-chain; the buyer uses it to complete the key and take the XMR. If the seller never locks the XMR, the buyer recovers the USDT.

## Why it is safe

| Risk in a trade | How the atomic swap handles it |
|---|---|
| The other party does not send | You can refund within the deadline |
| The other party gets paid without delivering | To get paid, they must reveal the key that gives you the XMR |
| A custodian disappears | There is no custodian: a contract and split keys |
| The other party uses a different key on each chain | A cryptographic proof (DLEQ) shows it is the same |

## What you must take care of

- **Deadlines.** Atomic swaps are safe if each party acts in time. On MoneroP2P, if the XMR is not verified before deadline t0, you must refund.
- **Your recovery file.** If you close the browser, you need it to finish or refund.
- **The software.** Safety depends on the code being correct; MoneroP2P is not audited yet.

## A bit of history

Atomic swaps have been discussed for Bitcoin since the early 2010s. For Monero, which has no scripts, split-key protocols were developed: COMIT's (now eigenwallet) for Bitcoin, and AthanorLabs' for Ethereum, which MoneroP2P builds on.

Next: [how to swap USDT for Monero without intermediaries](/en/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
