---
key: swap-costs
lang: en
slug: how-much-does-it-cost-to-swap-usdt-for-monero
title: How much it really costs to swap USDT for Monero
description: "What you pay when swapping USDT for XMR: price margin, fee, gas and network fee. How to work out the total cost and compare options with a single number."
published: 2026-10-30
updated: 2026-10-30
order: 10
related: [buy-xmr-no-kyc, swap-usdt-xmr, usdt-networks]
---

**Short answer:** the total cost of swapping USDT for Monero has four parts: the **price margin** (how much XMR you get versus the market price), the **service fee**, **gas** on the USDT network and the **Monero network fee**. To compare options you don't need to add it all up: just look at **how much XMR you receive for the same amount of USDT**. Whoever gives you more XMR is cheaper.

## The four parts of the cost

| Part | What it is | Typical size |
|---|---|---|
| Price margin | The gap between the market price and the price you are offered | The largest part; depends on the seller |
| Service fee | What the platform or exchange charges | Varies; sometimes already built into the price |
| Gas | What the USDT network charges for your transactions | On Arbitrum, usually cents of a dollar |
| Monero network fee | What Monero charges to send you the XMR | Usually a fraction of a cent |

The margin and the fee are often **built into the quote**, so you don't see them separately. That is why the number that matters is the final XMR.

## How to work out the real cost

1. Look up the **reference price** of XMR in USDT on a price site.
2. Divide what you send by that price: that is the XMR you would get with no costs.
3. Compare it with what you are offered. The difference, as a percentage, is your total cost.

**Example with made-up numbers**, just to show the calculation: if XMR is worth 300 USDT and you send 50 USDT, with no costs you would get 0.1667 XMR.

| Option | You get | Total cost |
|---|---|---|
| A | 0.1625 XMR | 2.5% |
| B | 0.1640 XMR | 1.6% |

Option B is cheaper even if its advertised "fee" were higher: what counts is the XMR that reaches your wallet.

## What it costs on MoneroP2P

- **Platform fee: 0.5%**, paid by the maker when they claim their USDT. Each maker's published price already includes their margin; the app shows the exact XMR **before** you deposit.
- **Gas on Arbitrum One:** you pay for the deposit and the confirmation (and the refund, if needed). Your wallet shows the exact cost before you sign.
- **Monero network fee:** deducted when the XMR is sent to you.
- **Refunds pay no platform fee**; only gas.

In the [app](/en/app/)'s simple view you type how much USDT you send and see every quote sorted by XMR received, so the comparison is already done for you.

## Costs you don't see at first

- **Moving your USDT across networks.** If your USDT is on Tron or Ethereum and the service uses Arbitrum, moving it costs fees and time. Sometimes that costs more than the swap itself. [Differences between networks](/en/guides/usdt-trc20-vs-erc20-vs-l2/).
- **Floating or fixed rate.** On instant exchanges, a **floating** rate can change while your deposit arrives; a **fixed** rate guarantees the amount but usually gives less XMR.
- **Small amounts.** Gas and the network fee are nearly fixed, so they weigh more on small swaps.
- **Time.** A swap that takes an hour exposes you to price moves. On MoneroP2P the XMR amount is locked in when you request the swap.

## Tips to pay less

- Always compare by **XMR received**, not by the advertised fee.
- Swap from the **network where your USDT already is**, if the service supports it.
- Avoid very small amounts if you can put together a larger one (up to 100 USDT per swap on MoneroP2P).
- Keep a little **ETH on Arbitrum** for gas, so you don't have to buy it in a hurry.

If you are not sure which option to use yet, start with [how to buy Monero without KYC](/en/guides/how-to-buy-monero-without-kyc/).
