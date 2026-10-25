---
key: privacy
lang: en
title: Privacy policy
description: "What data MoneroP2P processes (almost none), what is public on-chain, what the node proxy sees and how to reduce exposure."
updated: 2026-10-24
---

**Short answer:** we have no accounts, use no cookies or analytics and do not store your keys. Some data is public by nature (transactions on the USDT chain) and our servers process minimal technical data to work.

## What we do NOT collect

- Name, email, phone or identity documents.
- Tracking cookies or third-party analytics.
- Private keys, seed phrases or the contents of your recovery file.

## What our servers process (Cloudflare)

| Data | Purpose | Retention |
|---|---|---|
| IP address | Abuse limits and regional blocking | We do not store it; Cloudflare may log it under its policy |
| Public protocol messages (public keys, DLEQ proof, view key) | Letting you and the maker complete the swap | The room deletes itself after 3 days |
| Maker offers | Showing the order book | While the offer is active |

## What is public on-chain

- Your USDT deposit, your EVM wallet address and the contract events are public on the USDT network.
- On Monero, transactions are private by design, but the swap's shared view key lets both parties see the shared address.

## Monero node proxy

If you use our proxy, it sees which queries your browser makes (for example, which transaction you verify). To avoid that, use your own node.

## Browser storage

The app stores an **encrypted** copy of the swap in progress in your browser, with the same password as your recovery file. You can delete it by clearing the site's data.

## Contact

[EMAIL_CONTACTO]
