---
key: usdt-networks
lang: en
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs ERC-20 vs L2: which one to use"
description: "Differences between USDT on Tron (TRC-20), Ethereum (ERC-20) and layer-2 networks like Arbitrum: fees, speed, compatibility and risks."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**Short answer:** it is the same Tether digital dollar, but on separate networks that do not mix. For a swap, use the network where your USDT already is and where the service is active. Layer-2 networks (like Arbitrum) are usually cheaper than Ethereum, and Tron is widely used in Latin America, but fees change over time: check them in your wallet before sending.

## Key differences

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum and other L2s |
|---|---|---|---|
| Address format | Starts with `T` | `0x…` | `0x…` (same as Ethereum) |
| Fee currency | TRX (energy and bandwidth) | ETH | ETH (on the L2) |
| Typical cost | Variable; depends on available energy | Usually the highest | Usually low |
| Common wallets | TronLink and others | MetaMask and compatible | MetaMask and compatible |
| Can Tether freeze? | Yes | Yes | Yes |

> We give no fee figures because they change with congestion and each network's decisions. Your wallet shows the exact cost before you sign.

## Are they the same coin?

Same value, different network. USDT on Tron cannot be sent directly to an Ethereum address: you need an exchange or a bridge. Sending on the wrong network is one of the [most common mistakes](/en/guides/common-mistakes-when-sending-crypto/).

## Which one does MoneroP2P use?

- **Now:** Arbitrum Sepolia (testnet), with a test token.
- **Planned:** Arbitrum, whose USDT (USD₮0) lets you authorize the deposit with a signature, with no extra approval transaction.
- **Under evaluation:** Tron. The contract already compiles for Tron but still needs testing on its testnet; Tron has quirks (for example, its USDT returns an unexpected value on transfer) that the contract already handles.

## How to choose

1. **Where is your USDT today?** Moving it across networks costs fees and time.
2. **Do you have the fee currency?** Without ETH (or TRX) you cannot sign.
3. **What does the service support?** Only use networks active in the app.
4. **How fast do you need it?** L2s confirm in seconds; Monero takes longer to confirm the XMR.

## A risk shared by all

Tether can freeze addresses on all these networks. MoneroP2P uses a separate contract per swap so one freeze does not affect others, but the risk exists. Read the [risk notice](/en/risk-notice/).
