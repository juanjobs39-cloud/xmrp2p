---
key: maker
lang: en
title: Become a maker
description: "A maker provides XMR and earns a margin over the market price. Do it from your browser with nothing to install, or 24/7 with your own server."
updated: 2026-10-26
---

**Short answer:** a maker holds XMR and offers it for USDT, with a margin over the reference price. You can do it **from your browser with nothing to install** (the open tab works as your server), or **24/7 with your own server or computer**. Either way, nobody holds your funds. It runs with real money on Arbitrum One (maximum 100 USDT per swap), and a testnet practice mode is also available.

## Two ways to be a maker

| | In your browser (recommended) | Your own 24/7 server |
|---|---|---|
| For | Anyone | Technical makers |
| Setup | None: open [the maker page](/en/maker/) | Python, `monero-wallet-rpc` and the daemon ([guide](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| When you offer | While the tab is open on a computer | All the time |
| Your keys | In your browser, encrypted with your password and in a backup | On your server |
| USDT payout | Straight to your MetaMask | To the address you configure |

**Start here:** [Be a maker from your browser →](/en/maker/)

## What you need in the browser

| Requirement | Detail |
|---|---|
| A computer with the tab open | Phones put tabs to sleep |
| XMR to offer | Send it to the address the page gives you; it unlocks after 10 confirmations |
| A little ETH for gas | To claim; top it up with one click from MetaMask |
| A password and your backup file | Without the backup you cannot restore your maker in another browser |

## How the price is set

The daemon takes the median of several public sources (Kraken, CoinGecko and KuCoin), drops the quote if any source strays too far from the median, and applies your margin. You set:

- the margin over the reference price,
- the minimum and maximum amount per swap,
- the maximum exposure (XMR committed at once),
- the number of concurrent swaps.

## Safety rules (browser and server)

- It never sends XMR without a valid on-chain deposit.
- It never claims if it did not lock the XMR.
- It does not try to claim in the last minutes before t1.
- It simulates every transaction before sending it.
- If the taker refunds, it recovers the XMR automatically.

## Risks for the maker

- **Volatility:** the price can move between the quote and the claim.
- **Availability:** if you close the tab (or your server goes down) between t0 and t1, you will not get paid; the taker will refund and you must come back to recover your XMR.
- **Backups:** your backup file (or the daemon database) holds the key halves of each swap; without it you cannot recover the XMR.
- **Regulation:** acting as a maker may have legal implications in your country. Check before you start.

None of this guarantees profits. The full install guide is in [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
