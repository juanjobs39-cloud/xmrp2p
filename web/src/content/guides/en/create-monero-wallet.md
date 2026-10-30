---
key: monero-wallet
lang: en
slug: how-to-create-a-monero-wallet
title: How to create a Monero wallet
description: "Monero wallet options for mobile and desktop, how to create one, keep the seed safe and get your address. Includes stagenet for testing."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Create a Monero wallet
  steps:
    - name: Choose a wallet
      text: Download a wallet from its official site or from the list on getmonero.org.
    - name: Create a new wallet
      text: Choose to create a new wallet and set a local password.
    - name: Back up the seed phrase
      text: Write the seed phrase on paper, in order, and keep it somewhere safe and offline.
    - name: Copy your address
      text: In the Receive section, copy your address. To try MoneroP2P use a stagenet wallet.
---

**Short answer:** download a Monero wallet from its official site, create a new wallet, write the seed phrase on paper and copy your address from "Receive". For MoneroP2P's practice mode you need a **stagenet** wallet (Monero's test network), which some desktop wallets let you choose.

## Well-known options

| Wallet | Platform | Notes |
|---|---|---|
| Monero GUI and CLI (official) | Windows, macOS, Linux | From the Monero project; support stagenet |
| Feather Wallet | Windows, macOS, Linux | Lightweight desktop wallet; supports stagenet |
| Cake Wallet | Android, iOS, desktop | Popular on mobile |
| Others | Various | Check the up-to-date list on getmonero.org |

> Always download from each wallet's official site and verify signatures if the project publishes them. Be wary of look-alike apps in app stores.

## Step by step

1. **Install the wallet** from its official site.
2. **Create a new wallet.** It asks for a password: it protects the file on this device, it is not your seed.
3. **Back up the seed phrase.** It is a list of words (25 in the classic format, 16 in the Polyseed format some wallets use). Write them on paper, in order. Whoever has them controls your funds.
4. **Note the restore height** if the wallet shows it: it speeds up recovery.
5. **Copy your address** from "Receive". Main Monero addresses on the real network start with `4`; subaddresses with `8`. On stagenet they start with `5` or `7`.

## To try MoneroP2P (stagenet)

- In Monero GUI or Feather, choose **stagenet** when creating the wallet (in settings or at startup).
- Stagenet XMR has no value; you get it from stagenet faucets.
- In practice mode, the MoneroP2P app only accepts stagenet addresses.

## Good practices

- Never share your seed, not even with support.
- Use a new address or subaddress for each swap if you want more privacy.
- When you receive XMR, the network requires about 10 confirmations (about 20 minutes) before you can spend it.

Next: [what is Monero and how it differs from Bitcoin](/en/guides/what-is-monero/).
