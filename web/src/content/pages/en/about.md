---
key: about
lang: en
title: About xmrp2p
description: "What xmrp2p is, its current status and how it is funded (a fee on each completed swap)."
updated: 2026-10-24
---

**Short answer:** xmrp2p is an open-source project to swap USDT for Monero without intermediaries, using atomic swaps that run in the browser. It is in testnet trials and has not been audited yet.

## What we build

The web app, the smart contract, the crypto core and the program makers run. We do not hold funds or store user keys.

## How it is funded

The contract charges a percentage fee when a swap completes. The percentage is fixed when the contract is deployed and capped at 1% in the code, which nobody can change. Refunds pay no fee.

## Status

- Contract, crypto core, maker daemon, backend and app: implemented and tested in test environments.
- Pending: full testnet runs with Monero stagenet and an external audit.
- There is no version for real money.

## Credits

The protocol builds on work by AthanorLabs and earlier research by COMIT and the Farcaster project. The DLEQ proof uses the same construction as eigenwallet.

## Code

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (AGPL-3.0 license).
