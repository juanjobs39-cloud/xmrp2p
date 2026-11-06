---
key: wallet-launch
lang: en
slug: monerop2p-wallet-monero-browser-extension
title: "MoneroP2P Wallet: a Monero browser extension for Chrome and Firefox"
description: "MoneroP2P Wallet is here: a non-custodial Monero wallet for your browser with XMR plus USDT and ETH on Arbitrum from one seed, and swaps without MetaMask."
published: 2026-11-05
keywords:
  - Monero browser extension
  - Monero wallet Chrome extension
  - XMR wallet for Firefox
  - non-custodial Monero wallet
  - Monero and USDT wallet
  - MetaMask for Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/en/wallet/
    description: "Open-source (AGPL-3.0), non-custodial browser extension for Monero (XMR) and USDT/ETH on Arbitrum One."
howto:
  name: "How to get started with MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Install the extension"
      text: "Go to monerop2p.app/en/wallet and pick your browser's store: Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons or Edge Add-ons."
    - name: "Create your wallet"
      text: "Open the extension, choose «Create wallet» and set a long, unique password. The wallet is encrypted with it on your device."
    - name: "Write the seed on paper"
      text: "Write down the 25-word seed on paper and keep it somewhere safe. It is the only way to recover your XMR and your Arbitrum account."
    - name: "Receive XMR"
      text: "Under «Receive» the wallet gives you a fresh subaddress with a QR code for every payment."
    - name: "Buy XMR from Explore"
      text: "Under «Explore» open the USDT to XMR exchange or P2P Fiat. The wallet connects by itself and fills in your Monero address."
faq:
  - q: "What is MoneroP2P Wallet?"
    a: "A non-custodial Monero (XMR) wallet built as an extension for Chrome, Brave, Edge, Opera and Firefox. The same seed gives you a Monero account and an Arbitrum One account for USDT and ETH. It is free and open source (AGPL-3.0). Official page: https://monerop2p.app/en/wallet/"
  - q: "Is there a Monero extension for Chrome?"
    a: "Yes. MoneroP2P Wallet runs on Chrome and other Chromium browsers (Brave, Edge, Opera) as well as Firefox. It runs wallet2, the official Monero wallet, compiled to WebAssembly inside the browser."
  - q: "Is a Monero browser wallet safe?"
    a: "Keys are stored encrypted with Argon2id and XChaCha20-Poly1305, the wallet locks itself after 15 minutes, and the extension loads no remote code and has no analytics. Keep your seed on paper: it is the only way to recover your funds."
  - q: "How much does it cost?"
    a: "The extension is free. Every mainnet XMR send pays the Monero network fee plus a 0.25 % MoneroP2P fee, shown on its own line before you confirm. Receiving, sending to your own addresses and Arbitrum sends pay no MoneroP2P fee."
  - q: "Can I use my seed in other wallets?"
    a: "Yes. It uses the standard 25-word Monero seed, compatible with Cake Wallet, Feather and the official wallet. The Arbitrum account uses its own derivation; to use it elsewhere, export its private key from Settings."
  - q: "Does it replace MetaMask on MoneroP2P?"
    a: "Yes, on monerop2p.app and fiat.monerop2p.app. The wallet announces itself to the site via EIP-6963, and every connection, signature or transfer asks for your approval in an extension window. It does not connect to other sites."
---

**In short:** on **November 5, 2026** we launched **MoneroP2P Wallet 0.2.0**, a **non-custodial Monero wallet for your browser** that runs on Chrome, Brave, Edge, Opera and Firefox. One 25-word seed holds your **XMR** and an **Arbitrum One account with USDT and ETH**, so you can swap USDT for Monero on MoneroP2P **without MetaMask** and without copying addresses around. It is free and open source.

[See MoneroP2P Wallet →](/en/wallet/)

## Why a Monero wallet in the browser

Until now, using Monero meant a desktop app (Feather or the official wallet) or a phone app (Cake Wallet). Websites talk to MetaMask, but MetaMask does not support Monero. Swapping USDT for XMR on a website meant **two wallets** and copying addresses between them.

MoneroP2P Wallet puts both in one extension: your Monero and your Arbitrum account live in the same place, and MoneroP2P's sites use it directly.

## What it does

- **Full Monero wallet:** create or restore with the standard 25-word seed, balance, history with confirmations, and sends that show the exact fee before broadcasting.
- **A fresh subaddress for every payment**, with a QR code, so nobody can link your payments.
- **USDT and ETH on Arbitrum One:** the same seed creates your Arbitrum account, with balance, receive with QR and send with an estimated network fee.
- **Explore:** one click opens the [USDT to XMR exchange](/en/app/) or [P2P Fiat](https://fiat.monerop2p.app/en/), where you buy XMR with your local currency.
- **Site connection:** on monerop2p.app and fiat.monerop2p.app the wallet fills in your Monero address and signs the swap deposit. Every step asks for your approval in an extension window.
- **Your own node:** swap MoneroP2P's node for yours in Settings.

## How it protects your funds

| Layer | What it does |
|---|---|
| Non-custodial | The seed is created and stays on your device. No accounts, key servers or analytics. |
| Encrypted vault | Argon2id (64 MiB) turns your password into a key and XChaCha20-Poly1305 encrypts the wallet. |
| Auto-lock | After 15 idle minutes (configurable) and when the browser closes. |
| No remote code | All code ships inside the extension, with a strict Content Security Policy. |
| Two sites only | The extension only talks to monerop2p.app and fiat.monerop2p.app, and only with your approval. |
| Decoded approvals | Before signing you see in plain words what the transaction does: transfer, spending approval or swap deposit. |
| Address poisoning check | Warns you if you paste an address that looks like one you used but isn't. |
| Verifiable | Open source (AGPL-3.0) and a reproducible package with its SHA-256. |

**Keep your seed on paper.** It is the only way to recover your funds if you lose or replace your device.

## How it compares with other Monero wallets

| | MoneroP2P Wallet | Feather | Cake Wallet | Official GUI |
|---|---|---|---|---|
| Runs on | Browser (extension) | Desktop | Phone and desktop | Desktop |
| 25-word seed | Yes | Yes | Yes | Yes |
| USDT on Arbitrum | Yes | No | Other networks | No |
| Connects to websites | Yes (MoneroP2P only) | No | No | No |
| Open source | Yes | Yes | Yes | Yes |

For large long-term savings, a desktop or hardware wallet is still the best choice. MoneroP2P Wallet is built for **buying, receiving and moving XMR day to day** from your browser.

## Fees

- **Extension:** free.
- **Mainnet XMR sends:** Monero network fee plus a **0.25 %** MoneroP2P fee, shown on its own line before you confirm. Amounts whose fee would be under 0.00001 XMR don't pay it.
- **No MoneroP2P fee:** receiving, sending to your own addresses, stagenet and Arbitrum sends (you only pay the network there).

## How to get started

1. Go to [monerop2p.app/en/wallet](/en/wallet/) and pick your browser's store.
2. Create the wallet with a long, unique password.
3. **Write the 25-word seed on paper.** It is the only way to recover your funds.
4. Receive XMR with the subaddress under «Receive», or buy it from **Explore**.

No Monero yet? See [every way to buy XMR](/en/buy-monero/) or the guide on [how to create a Monero wallet](/en/guides/how-to-create-a-monero-wallet/).

## FAQ

### What is MoneroP2P Wallet?
A non-custodial Monero wallet built as an extension for Chrome, Brave, Edge, Opera and Firefox, with an Arbitrum One account for USDT and ETH from the same seed.

### Is there a Monero extension for Chrome?
Yes. MoneroP2P Wallet runs on Chrome and other Chromium browsers, and on Firefox. It runs wallet2, the official Monero wallet, compiled to WebAssembly.

### Is a Monero browser wallet safe?
Keys are encrypted, the wallet locks itself and the extension loads no remote code.

### How much does it cost?
It is free. XMR sends pay the network fee plus 0.25 % to MoneroP2P, shown before you confirm.

### Can I use my seed in other wallets?
Yes, the 25-word seed works with Cake Wallet, Feather and the official wallet. The Arbitrum key can be exported from Settings.

### Does it replace MetaMask on MoneroP2P?
Yes, on monerop2p.app and fiat.monerop2p.app. Every connection or signature asks for your approval.

The code is on [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Using crypto carries risk: read the [risk notice](/en/risk-notice/).

[See MoneroP2P Wallet →](/en/wallet/)
