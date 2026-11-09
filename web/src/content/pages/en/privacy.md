---
key: privacy
lang: en
title: Privacy policy
description: "What data MoneroP2P processes (almost none), what is public on-chain, what the node proxy sees and how to reduce exposure."
updated: 2026-11-09
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

## MoneroP2P Wallet extension

The extension **does not collect or send any personal data**: no accounts, analytics or telemetry. Your seed, keys and history are stored **encrypted only in your browser** (Argon2id and XChaCha20-Poly1305) and never leave it. To sync, the extension connects to the Monero node you choose (by default, our proxy, described above); that node sees blockchain queries and the already-signed transactions you send, not your keys. Uninstalling the extension deletes all of its data.

For the Arbitrum account, the extension queries Arbitrum's public RPC (arb1.arbitrum.io; sepolia-rollup.arbitrum.io for testing), which sees your public Arbitrum address and signed transactions, never your keys. On monerop2p.app and fiat.monerop2p.app it only shares your account or a Monero address with the site if you approve it, and you can disconnect it in Settings.

**Swap (optional).** If you use the extension's “Swap” tab, quotes and the exchange are requested from our API (api.monerop2p.app), which talks to Trocador. The same applies as for Trocador exchanges in the app: when the exchange is created we keep your IP, language and browser linked to its ID, as those exchanges require. The list of your exchanges is stored encrypted in your browser. If you don't use “Swap”, the extension doesn't connect to our API.

## P2P Fiat notifications (optional)

If you turn on notifications at fiat.monerop2p.app, we store the subscription address your browser gives us, linked to your P2P account, to tell you about requests and changes to your orders while the app is closed. The notification goes through your browser's push service (Google, Mozilla, Apple or Microsoft) and is empty: it carries no amounts, nicknames or order details; the text is added by the site. You can turn it off at any time and the subscription is deleted. If you don't turn them on, nothing is stored.

You can also connect the P2P Fiat Telegram bot from "Account". We store only the ID of your chat with the bot and the language, linked to your P2P account. Messages say the kind of notice (for example "new request" or "the buyer marked as paid") and include the order link: never amounts, nicknames or payment details. Telegram, as the messaging service, sees that you use the bot and those messages. If you reply to a request with the "Accept" or "Decline" buttons, the bot records it just like the web. Sending /stop to the bot, or "Disconnect Telegram" in the app, deletes the link; so does blocking the bot. The bot's buttons open the app inside Telegram. When opened that way, Telegram passes the page some details of your Telegram account (such as your name); the app deletes them on start and never sends them to our server. Your P2P account, its keys and the escrow signature stay on your device, just like in the browser. New ad alerts (/alerts in the bot) work without an account: we store the chat_id, the language and the filters you choose (buy or sell, and currencies), and “Turn alerts off” or /stop deletes them. Alerts only carry data that is already public in the market.

## Contact

[EMAIL_CONTACTO]
