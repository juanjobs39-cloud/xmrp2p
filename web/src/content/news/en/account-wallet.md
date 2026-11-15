---
key: account-wallet
lang: en
slug: non-custodial-monero-and-usdt-wallet-in-your-account
title: "A non-custodial Monero and USDT wallet in your MoneroP2P account"
description: "Your MoneroP2P account now includes a wallet for Monero (XMR), USDT and ETH on Arbitrum: no KYC, non-custodial, sends by @nickname and a 12-word backup."
published: 2026-11-15
keywords:
  - non-custodial Monero wallet
  - Monero web wallet
  - Monero and USDT wallet
  - XMR wallet no KYC
  - send Monero by username
  - browser Monero wallet
  - USDT Arbitrum wallet no sign-up
  - swap USDT to Monero from wallet
  - MoneroP2P account
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/en/
    description: "P2P market to buy and sell Monero (XMR) for local currency, with a 2-of-3 multisig escrow and no KYC. Every account includes a non-custodial wallet for Monero, USDT and ETH on Arbitrum."
  - name: MoneroP2P
    url: https://monerop2p.app/en/app/
    description: "No-account exchange to swap USDT, BTC, ETH and other crypto for Monero (XMR)."
howto:
  name: "How to create your Monero and USDT wallet on MoneroP2P"
  totalTime: PT5M
  steps:
    - name: "Open the app and tap “Create account”"
      text: "Go to fiat.monerop2p.app/en/app/. The account strip at the top has a “Create account” button. No email, phone or ID is asked."
    - name: "Choose a nickname and a password"
      text: "The nickname is public; the password (at least 10 characters) encrypts your account in the browser. It cannot be recovered if you forget it."
    - name: "Save your backup"
      text: "Download the encrypted backup file and keep it off the device. With it and your password you recover the account on another phone or computer."
    - name: "Copy your receiving address"
      text: "Under “Wallet” you get a Monero address and an Arbitrum address (the same one for USDT and ETH), each with a QR code."
    - name: "Send, request or swap"
      text: "Send to an address or to another user by @nickname, create a payment link, or tap “Swap coins” to go from USDT to XMR without copying addresses."
faq:
  - q: "Does MoneroP2P hold my funds or my keys?"
    a: "No. The keys are created in your browser from a 12-word seed and stored encrypted with your password. The server never receives them, so MoneroP2P cannot see, move or freeze your funds, and cannot recover them if you lose both the backup and the password."
  - q: "Which coins does the account wallet support?"
    a: "Monero (XMR) on mainnet, and USDT and ETH on Arbitrum One. The Arbitrum address is a standard Ethereum-type account: the same one works for USDT and ETH."
  - q: "How much does the wallet cost?"
    a: "Creating the account, receiving, and sending to another user by @nickname pay no platform fee. Withdrawing to an external address pays 0.5%, shown on its own line before you confirm. Very small withdrawals (under about 0.002 XMR, 10 USDT or 0.004 ETH) are not charged, and neither are deposits into a P2P order's escrow or into a swap. The network fee is paid separately."
  - q: "How do I recover my wallet if I lose my phone?"
    a: "With the backup file and your password, or with the account's 12 words. The 12 words recover the nickname and the wallets; the escrow keys of open orders are only in the backup file, so download it again after each order."
  - q: "Can I take my keys to another wallet?"
    a: "Yes. Under Wallet → More options you can export the account's 12 words, the 25-word Monero seed (for Cake Wallet, Feather or the official wallet) and the Arbitrum private key (for MetaMask and similar)."
  - q: "Do I need an account to swap crypto for Monero?"
    a: "No. The no-account exchange at monerop2p.app works as before. The account is optional: it makes what you swap land in your wallet with no addresses to copy."
  - q: "How private is sending by @nickname?"
    a: "If you turn on “Receive by nickname”, your address becomes linked to your nickname and anyone can look it up. On Monero that does not reveal what you receive; on Arbitrum it does, because that network is public. It stays off until you turn it on."
---

**In short:** every [MoneroP2P Fiat](https://fiat.monerop2p.app/en/) account now includes a **non-custodial wallet for Monero (XMR), USDT and ETH on Arbitrum**. It is created in your browser with a nickname and a password, **no email and no KYC**; the keys never leave your device. You can receive, send to an address or to another user by **@nickname**, fund a P2P order's escrow and swap between your coins without copying addresses.

[Create my account and wallet →](https://fiat.monerop2p.app/en/app/#/cuenta)

## What does the account wallet do?

| Feature | How it works |
|---|---|
| **Receive** | One Monero address and one Arbitrum address (USDT and ETH), each with a QR code. |
| **Send** | To an address or an @nickname. There is always a review screen with the amount, the fees and the total before you confirm. |
| **Send by @nickname** | Type `@nickname` instead of a long address. No platform fee. |
| **Payment links** | Create a link or QR with a coin and an amount; whoever opens it with their account only reviews and confirms. |
| **Swap** | Go from USDT to XMR (and back) between your own wallets: the deposit is sent for you and what you buy lands in your wallet. |
| **Fund the escrow** | If you sell XMR on the P2P market, deposit into the escrow from your wallet with one button. |
| **History** | Monero transactions with confirmations and a link to the explorer. |
| **Export keys** | The account's 12 words, the 25-word Monero seed and the Arbitrum private key. |

## Who holds my keys?

You do. The account starts from a **12-word seed** generated in your browser. Your account key, your Monero wallet and your Arbitrum account all derive from it. Everything is stored **encrypted with your password** in the browser and in your backup file.

- The server never receives your password, your seed or your keys.
- MoneroP2P **cannot move or freeze** your funds.
- For the same reason, **nobody can recover them** if you lose both the backup and the password. Keep the backup off the device.

To view or export your keys the app asks for your password again, so someone who finds the tab open cannot see them.

## How do I send Monero or USDT to another user by @nickname?

1. Under “Wallet”, open the **Send** tab of Monero or Arbitrum.
2. Enter `@nickname` as the destination, and the amount.
3. Review and confirm.

Each user's address is **signed with their account key**, and your browser checks that signature before sending. So neither the server nor anyone who compromised it can swap someone's address for another. The app remembers who you have sent to and **blocks the transfer if that nickname now belongs to a different account**.

Receiving by nickname is off until you turn it on under Wallet → More options.

## How much does it cost?

| Operation | MoneroP2P fee |
|---|---|
| Create an account and receive | 0 |
| Send to another user by @nickname | 0 |
| Deposit into a P2P order's escrow | 0 |
| Deposit into a swap | 0 |
| Withdraw to an external address | **0.5%** |
| Very small withdrawals (under about 0.002 XMR, 10 USDT or 0.004 ETH) | 0 |

The fee is shown **on its own line** on the review screen, together with the total leaving your wallet. The network fee (Monero or Arbitrum) is paid separately; to send USDT you need a little ETH on Arbitrum.

## Do I need an account to swap crypto for Monero?

No. The [no-account exchange](/en/app/) works as before: you pick the coins, enter your address and send the deposit from your own wallet.

With an account it is more convenient: under “Swap coins” you choose which wallet it leaves from and which one it lands in, and the app sends the deposit after a review screen. Those swaps go through **instant exchanges** picked with the comparison list (KYC rating A or B only): for the few minutes the swap takes, the exchange holds the coins. The wallet is non-custodial; the swap is not.

## What to know before you use it

- **It is new.** Start with small amounts until you trust it.
- **The Monero wallet syncs in your browser.** The first time can take a few minutes.
- **Newly received Monero takes about 20 minutes** (10 confirmations) to become spendable.
- **Arbitrum is a public network:** anyone who knows your address can see what you receive there. Monero is not.
- **Use only the Arbitrum network** for USDT and ETH. If you send over another network, the funds are lost.

Prefer a wallet installed in the browser? See [MoneroP2P Wallet, the extension for Chrome and Firefox](/en/news/monerop2p-wallet-monero-browser-extension/) or the comparison of [the best Monero wallets in 2026](/en/news/best-monero-wallets-2026/).

## Frequently asked questions

### Does MoneroP2P hold my funds or my keys?
No. The keys are created and stay in your browser, encrypted with your password.

### Which coins does the wallet support?
Monero (XMR), and USDT and ETH on Arbitrum One.

### How much does it cost?
Receiving and sending by @nickname pay no platform fee. Withdrawing to an external address pays 0.5%, shown before you confirm.

### How do I recover it if I lose my phone?
With the backup file and your password, or with the account's 12 words.

### Can I take my keys to another wallet?
Yes: you can export the 12 words, the 25-word Monero seed and the Arbitrum private key.

### Do I need an account to swap crypto for Monero?
No. The [no-account exchange](/en/app/) is still available.

Using crypto carries risk: read the [risk notice](/en/risk-notice/).

[Create my account and wallet →](https://fiat.monerop2p.app/en/app/#/cuenta) · [Buy Monero with local currency →](https://fiat.monerop2p.app/en/app/)

On Telegram? The market opens there too, with notifications for your orders: [buy and sell Monero on Telegram](/en/news/buy-monero-on-telegram-bot/).
