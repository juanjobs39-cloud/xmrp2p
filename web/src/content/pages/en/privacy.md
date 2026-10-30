---
key: privacy
lang: en
title: Privacy policy
description: "What data MoneroP2P processes (almost none), what is public on-chain, what the node proxy sees and how to reduce exposure."
updated: 2026-10-30
---

**Short answer:** we have no accounts, use no cookies or analytics and do not store your keys. Some data is public by nature (transactions on the USDT chain) and our servers process minimal technical data to work. The exception is instant exchanges via Trocador, explained below.

## What we do NOT collect

- Name, email, phone or identity documents.
- Tracking cookies or third-party analytics.
- Private keys, seed phrases or the contents of your recovery file.

## What our servers process (Cloudflare)

| Data | Purpose | Retention |
|---|---|---|
| IP address | Abuse limits and regional blocking | We do not store it for MoneroP2P swaps; Cloudflare may log it under its policy |
| Public protocol messages (public keys, DLEQ proof, view key) | Letting you and the maker complete the swap | The room deletes itself after 3 days |
| Maker offers | Showing the order book | While the offer is active |

## Instant exchanges via Trocador

When no MoneroP2P maker covers your amount, the app can show quotes from instant exchanges through [Trocador](https://trocador.app). That option works differently:

- The exchange you choose does the swap, not MoneroP2P, and you send your USDT to that exchange's address. It is a custodial service with its own terms and KYC rating.
- Our server requests the quotes and creates the exchange on your behalf. The exchanges listed on Trocador require that, when you **create** an exchange, we keep your **IP address, browser language and browser/device information (user agent)** linked to the exchange ID, so we can answer law-enforcement requests that Trocador forwards to us.
- We keep this data **indefinitely**, as Trocador advises, because such requests can arrive long after the exchange. It is used for nothing else, and it is never shared except in response to such a request.
- Looking at the quotes stores nothing. Swaps with MoneroP2P makers never store this data.
- To avoid it, use a MoneroP2P maker, or go to Trocador directly (it then keeps your data itself under its own terms). Tor or a VPN reduce what your IP reveals.

## What is public on-chain

- Your USDT deposit, your EVM wallet address and the contract events are public on the USDT network.
- On Monero, transactions are private by design, but the swap's shared view key lets both parties see the shared address.

## Monero node proxy

If you use our proxy, it sees which queries your browser makes (for example, which transaction you verify). To avoid that, use your own node.

## Browser storage

The app stores an **encrypted** copy of the swap in progress in your browser, with the same password as your recovery file. You can delete it by clearing the site's data.

## Contact

[EMAIL_CONTACTO]
