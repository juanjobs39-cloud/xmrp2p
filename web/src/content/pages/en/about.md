---
key: about
lang: en
title: About MoneroP2P
description: "What MoneroP2P is, its current status and how it is funded (a fee on each completed swap)."
updated: 2026-10-24
---

**Short answer:** MoneroP2P is an open-source project to swap USDT for Monero without intermediaries, using atomic swaps that run in the browser. It runs with real money on Arbitrum One + Monero (maximum 100 USDT per swap); the contract is verified with Halmos, Aderyn and Slither and has no external audit yet.

## What we build

The web app, the smart contract, the crypto core and the program makers run. We do not hold funds or store user keys.

## How it is funded

The contract charges a percentage fee when a swap completes. The percentage is fixed when the contract is deployed and capped at 1% in the code, which nobody can change. Refunds pay no fee.

## Status

- Live with real money since October 2026 (maximum 100 USDT per swap), with a testnet practice mode.
- Contract verified with Halmos, Aderyn and Slither and published on Sourcify.
- Pending: an external audit.

## Credits

The protocol builds on work by AthanorLabs and earlier research by COMIT and the Farcaster project. The DLEQ proof uses the same construction as eigenwallet.

## Code

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (AGPL-3.0 license).
