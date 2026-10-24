---
key: maker
lang: en
title: Become a maker
description: "A maker provides XMR and earns a margin over the market price. What you need, how to run the daemon and which risks you take."
updated: 2026-10-24
---

**Short answer:** a maker holds XMR and offers it in exchange for USDT. They run a program (daemon) on their own server or computer that publishes offers, answers swaps automatically, locks the XMR and claims the USDT. They earn the margin they set over the reference price. At this stage it only runs on testnet.

## What you need

| Requirement | Detail |
|---|---|
| A machine that stays on | The daemon must be online to answer and claim in time |
| `monero-wallet-rpc` with a funded wallet | Locking and recovering XMR |
| An account on the EVM network with some gas | Sending `claim` |
| Python 3.10+ and the compiled crypto core | Instructions in `maker/README.md` |

## How the price is set

The daemon takes the median of several public sources (Kraken, CoinGecko and KuCoin), drops the quote if any source strays too far from the median, and applies your margin. You set:

- the margin over the reference price,
- the minimum and maximum amount per swap,
- the maximum exposure (XMR committed at once),
- the number of concurrent swaps.

## Daemon safety rules

- It never sends XMR without a valid on-chain deposit.
- It never claims if it did not lock the XMR.
- It does not try to claim in the last minutes before t1.
- It simulates every transaction before sending it.
- If the taker refunds, it recovers the XMR automatically.

## Risks for the maker

- **Volatility:** the price can move between the quote and the claim.
- **Availability:** if your daemon is down between t0 and t1, you will not get paid and must recover your XMR.
- **Backups:** the daemon database holds the key halves of each swap; without it you cannot recover the XMR.
- **Regulation:** acting as a maker may have legal implications in your country. Check before you start.

None of this guarantees profits. The full install guide is in [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
