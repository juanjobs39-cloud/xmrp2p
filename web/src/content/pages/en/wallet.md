---
key: wallet
lang: en
title: "MoneroP2P Wallet: non-custodial Monero (XMR) wallet for your browser"
description: "Free extension for Chrome, Brave, Edge and Firefox. Your Monero keys never leave your device; buy XMR with USDT or local currency without leaving the wallet."
updated: 2026-11-05
keywords:
  - monero wallet
  - xmr wallet
  - monero chrome extension
  - monero browser wallet
  - monero firefox wallet
  - non-custodial monero wallet
faq:
  - q: "Does MoneroP2P Wallet store my keys on a server?"
    a: "No. The seed and keys are generated and stored, encrypted, only in your browser. There are no accounts, no sign-up and no analytics. The MoneroP2P node only receives blockchain queries and already-signed transactions."
  - q: "What if I lose my device or uninstall the extension?"
    a: "Restore the wallet with your 25-word seed in MoneroP2P Wallet or any compatible Monero wallet, such as Cake Wallet, Feather or the official wallet."
  - q: "Is it compatible with other Monero wallets?"
    a: "Yes. It uses Monero's standard 25-word seed, so you can import it into other wallets and the other way around."
  - q: "Can I use my own node?"
    a: "Yes. In Settings you can enter your node's URL (https, or http://127.0.0.1 for a local one)."
  - q: "How much does it cost?"
    a: "The extension is free and open source (AGPL-3.0). Each XMR transfer pays the Monero network fee plus a 0.25% MoneroP2P fee, shown separately before you confirm. Receiving and sending to your own addresses pay no MoneroP2P fee."
---

**MoneroP2P Wallet** is a Monero (XMR) wallet that runs as a browser extension. Your keys are created and stay on your device, encrypted with your password. From the same wallet you can buy XMR with USDT or with your local currency on MoneroP2P's services.

## What you can do

- **Create or restore** a wallet with Monero's standard 25-word seed.
- **Receive** with a new subaddress for every payment, with a QR code, so nobody can link your payments.
- **Send** with the exact fee shown before you confirm and a clear summary of the destination.
- **Explore:** open the [USDT to XMR exchange](/en/app/) (with your address already filled in) and [P2P Fiat](https://fiat.monerop2p.app/en/app/) in one click, to buy with bank transfer, cash or other local methods.
- **USDT and ETH on Arbitrum:** an Arbitrum One account comes from the same seed. On monerop2p.app and P2P Fiat the wallet connects by itself (no MetaMask) and fills in your Monero address; every signature or transfer asks for your approval in an extension window.

## How it protects you

| Protection | What it does |
|---|---|
| Non-custodial | The seed never leaves your device; nobody else can move your XMR. |
| Strong encryption | Your password becomes a key with Argon2id (64 MiB) and the wallet is encrypted with XChaCha20-Poly1305. |
| Auto-lock | It locks itself after 15 minutes of inactivity (configurable) and when you close the browser. |
| No remote code | All the code ships inside the extension, with a strict security policy (CSP). |
| Anti-poisoning | It warns you if you paste an address that looks like one you used before but isn't the same. |
| Verifiable | The package is built reproducibly: anyone can check that it matches the source code. |

## Before you start

1. Write the seed down **on paper** and keep it safe: it is the only way to recover your money.
2. Use a long, unique password for the extension.
3. Try a small amount first.

Don't have XMR yet? See [every way to buy Monero](/en/buy-monero/).
