---
key: telegram-bot
lang: en
slug: buy-monero-on-telegram-bot
title: "Buy and sell Monero on Telegram: a bot with alerts and no KYC"
description: "The MoneroP2P bot opens the P2P market and the exchange inside Telegram, notifies you about your orders and sends alerts for new ads. No KYC, non-custodial."
published: 2026-11-11
keywords:
  - buy Monero on Telegram
  - Monero Telegram bot
  - sell XMR Telegram
  - XMR bot no KYC
  - Monero price alerts Telegram
  - Monero Mini App
  - buy XMR P2P
  - swap Bitcoin to Monero Telegram
  - MoneroP2PFiatBot
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/en/
    description: "P2P marketplace to buy and sell Monero (XMR) with local currency, with a 2-of-3 multisig escrow on the Monero network and no KYC."
  - name: MoneroP2P
    url: https://monerop2p.app/en/app/
    description: "No-account exchange to swap USDT, BTC, ETH and other crypto for Monero (XMR), with a non-custodial atomic swap for USDT on Arbitrum."
howto:
  name: "How to buy Monero from Telegram with the MoneroP2P bot"
  totalTime: PT45M
  steps:
    - name: "Open the official bot"
      text: "Search for @MoneroP2PFiatBot on Telegram, or follow the link on the site, and tap Start. Check that the username is exactly that one."
    - name: "Open the market inside Telegram"
      text: "Tap the “P2P” button. The market opens as a Mini App without leaving Telegram. Create your account with a nickname and a password: no email or ID."
    - name: "Pick an ad"
      text: "Filter by currency and payment method and compare price, limits and the seller's reputation."
    - name: "Wait for the escrow"
      text: "The seller deposits the XMR into a 2-of-3 multisig escrow that is signed on your phone. The bot tells you when the order changes state."
    - name: "Pay and receive"
      text: "Once the XMR is locked, pay with the agreed method and mark “I've paid”. The seller confirms and the escrow sends the Monero to your wallet."
faq:
  - q: "Can you buy Monero on Telegram?"
    a: "Yes. The @MoneroP2PFiatBot bot opens MoneroP2P's P2P Fiat market inside Telegram as a Mini App: you pick an ad, the XMR sits in a 2-of-3 multisig escrow and you pay by bank transfer, payment app or cash. It asks for no KYC and no email."
  - q: "Does the MoneroP2P bot hold my funds or my keys?"
    a: "No. The bot only opens the platform and sends notifications. Your account and the escrow are signed on your device; the bot never sees keys, passwords or payment details, and it cannot move XMR."
  - q: "What can Telegram see?"
    a: "Telegram knows you talk to the bot and sees the text of the notifications. That is why notifications carry no amounts, addresses or payment details, and the apps strip the data Telegram adds to the URL and load no scripts from telegram.org."
  - q: "Do I need an account to get alerts about new ads?"
    a: "No. With /alerts you choose whether to see buy ads, sell ads or both, and in which currencies. There is no account to create and nothing to connect."
  - q: "How do I turn notifications off?"
    a: "Send /stop to the bot. It removes the link to your account and your alerts. Blocking the bot does the same."
  - q: "Someone messaged me on Telegram to sell me Monero. Is that the bot?"
    a: "No. The official bot never starts conversations to offer deals, does not chat on behalf of the other party and never asks for payments, seeds or passwords. If a person messages you on Telegram to close a purchase or to ask for a payment outside an order, it is a scam."
  - q: "Which languages does the bot support?"
    a: "English and Spanish, following your Telegram language. The P2P Fiat site is also available in Portuguese and Russian, and the exchange in 10 languages."
---

**In short:** you can now **buy and sell Monero (XMR) without leaving Telegram**. The official bot [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) opens the [P2P Fiat market](https://fiat.monerop2p.app/en/) and the [exchange](/en/app/) as a Mini App, tells you when an order moves forward and sends **alerts for new ads** in your currency. **No KYC and non-custodial:** the escrow is signed on your phone and the bot never touches your funds.

[Open the bot on Telegram →](https://t.me/MoneroP2PFiatBot)

## What does the bot do?

| Command | What it does | Account needed? |
|---|---|---|
| **P2P** button | Opens the market to buy or sell XMR with local currency | Yes, created in seconds |
| `/alerts` | Tells you about new buy ads, sell ads or both, in the currencies you choose | No |
| `/swap` | Opens the exchange to swap BTC, USDT, ETH and other crypto for XMR, and tells you as the swap progresses | No |
| `/orders` | Lists your open orders with a button to open each one | Yes |
| `/stop` | Turns notifications off and deletes your alerts | No |

Also, if you sell and accept requests while offline, the bot lets you **accept or decline a request from the message**, without opening the web.

## How do I buy Monero from Telegram?

1. Open [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) and tap **Start**.
2. Tap **P2P**. The market opens inside Telegram. Create your account with a nickname and a password.
3. Choose your currency and payment method and take an ad.
4. The seller deposits the XMR into a **2-of-3 multisig escrow**. After 10 confirmations (about 20 minutes) the encrypted chat and their payment details open.
5. Pay, mark **“I've paid”** and wait for the seller to release. The XMR arrives in your wallet.

It is the same market as on the web, with the same rules. The details are in [how P2P Fiat works](https://fiat.monerop2p.app/en/how-it-works/).

## How do I get alerts for new ads?

Send `/alerts` and choose what you want to see with the buttons. You can also type the currencies directly, for example `/alerts USD EUR`.

- **What each alert includes:** price, limits, payment methods and a button that opens the market already filtered.
- **What it leaves out:** the ad's terms and any way to contact the advertiser off-platform.
- **When it arrives:** 15 minutes after the ad is posted, and only if it is still active.
- **No flooding:** at most one alert per advertiser every 6 hours.
- **Scam filter:** ads that ask you to continue on WhatsApp, Telegram or by phone are never alerted.

## Can I swap Bitcoin or USDT for Monero from Telegram?

Yes. `/swap` opens the [exchange](/en/app/) inside Telegram: you compare quotes to go from BTC, USDT, ETH and 2,500+ coins to XMR, or to [sell XMR](/en/news/sell-monero-for-usdt-or-bitcoin/). If you want, the bot tells you when the swap changes state: deposit detected, sending, completed, expired or refunded.

Those notifications use a code that works for a single chat, sends at most 10 notifications and expires after 48 hours. They carry no amounts or addresses.

## Is it safe to buy Monero on Telegram?

It depends on who you are talking to. There are three very different situations:

| | MoneroP2P website | Official bot | Someone who messages you on Telegram |
|---|---|---|---|
| Who holds the XMR | 2-of-3 multisig escrow | The same escrow | Nobody: you trust a stranger |
| Asks you to pay upfront | No | No | Almost always |
| Chat with the other party | Encrypted, inside the order | The same, inside the order | Private, with no record |
| If something goes wrong | Appeal with support | Appeal with support | Nobody to complain to |

**The bot is not a chat with the seller.** It only opens the platform and notifies you. So the usual rule still stands: **never close a deal over Telegram direct messages**. If someone messages you to offer XMR, to ask for a payment outside an order or to "help" with your account, it is a scam.

How to recognize the official bot:

- The username is exactly **@MoneroP2PFiatBot**. Be wary of lookalike names.
- It **never** asks for your seed, your password, your backup file or a payment.
- It **never** messages you first to offer a deal.

More rules in [safety and common scams](https://fiat.monerop2p.app/en/safety/).

## What can Telegram see?

Telegram is not a private app the way Monero is, so the bot is built to give it as little as possible:

- **Notifications carry no amounts, addresses or payment details.** They only say that something changed and include a button to open the order.
- **Keys never leave your device.** Your account and the escrow are signed on your phone; the bot never sees them.
- **No Telegram scripts.** The apps load no code from telegram.org and strip from the URL the data Telegram adds when opening them.
- **What Telegram does know:** that you use the bot and when you receive notifications. If that matters to you, use the website and turn on browser notifications.

The details are in the [privacy policy](/en/privacy/).

## What it does not do

- **It holds no funds or keys**, and it cannot move XMR.
- **It does not replace the market's rules:** the fiat payment still happens outside the platform, and the escrow protects the XMR, not the bank transfer.
- **It does not speak every language:** the bot replies in English and Spanish.
- **It does not guarantee ads in your currency.** The market is young; alerts are there precisely to tell you when one shows up.

What can be verified about the platform and what its limits are: [Is MoneroP2P legit?](/en/is-monerop2p-legit/)

## Get started

[Open @MoneroP2PFiatBot →](https://t.me/MoneroP2PFiatBot) · [See the market on the web →](https://fiat.monerop2p.app/en/app/) · [Swap crypto for XMR →](/en/app/)

Coming from LocalMonero? Read [LocalMonero alternatives in 2026](/en/news/localmonero-alternatives-2026/).
