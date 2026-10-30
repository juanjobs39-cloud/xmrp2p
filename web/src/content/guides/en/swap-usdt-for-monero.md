---
key: swap-usdt-xmr
lang: en
slug: how-to-swap-usdt-for-monero-without-intermediaries
title: How to swap USDT for Monero without intermediaries
description: "Step by step: swap USDT for XMR with an atomic swap from your browser, with no account and nobody holding your funds."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: Swap USDT for Monero with an atomic swap
  totalTime: PT1H
  steps:
    - name: Prepare your Monero wallet
      text: Create a Monero wallet and copy your receiving address. In practice mode it must be a stagenet address.
    - name: Open the app and pick an offer
      text: Pick a maker's offer, enter the USDT amount and your Monero address.
    - name: Set a password and download the recovery file
      text: Choose a password of at least 10 characters and download the encrypted file. It is required before depositing.
    - name: Deposit the USDT
      text: Connect your wallet (MetaMask or compatible) and sign the deposit into the contract.
    - name: Wait and confirm
      text: The app verifies the XMR the maker locks. Once verified, confirm with setReady.
    - name: Receive the XMR
      text: When the maker claims, the app combines both key halves and sends the XMR to your address.
---

**Short answer:** open the app, pick an offer, enter your Monero address, download your recovery file, deposit the USDT from your wallet and wait. The app verifies the XMR, asks you to confirm and finally sends the XMR to your address. If something fails, it asks you to refund the USDT. The whole process usually takes 30 to 60 minutes.

> MoneroP2P runs with real money on **Arbitrum One + Monero** (maximum 100 USDT per swap) and has a practice mode on **testnet** (Arbitrum Sepolia and Monero stagenet). The steps are the same in both.

## Before you start

| You need | Where to get it |
|---|---|
| A browser wallet with USDT | MetaMask or an EVM-compatible wallet |
| Some ETH on the same network | To pay gas for 2 or 3 transactions |
| A Monero address | [How to create a Monero wallet](/en/guides/how-to-create-a-monero-wallet/) |
| 30 to 60 minutes with the tab open | Or your recovery file to come back later |

## Step by step

### Step 1: Pick an offer

The app shows makers' offers: price in USDT per XMR and minimum and maximum amounts. Each maker sets their own price and it changes with the market; the app shows the exact XMR amount before you deposit.

### Step 2: Enter your address and a password

- **Monero address:** where you will receive the XMR. Double-check it; transfers are irreversible.
- **Password:** protects your recovery file. If you forget it, nobody can recover it.

### Step 3: Download the recovery file

The app will not let you deposit without it. It holds your key half, encrypted. With it you can resume the swap from any browser ([what to do if you closed the tab](/en/guides/what-to-do-if-you-closed-the-tab/)).

### Step 4: Deposit the USDT

Connect your wallet. If the token supports it, you sign an authorization and deposit in a single transaction; otherwise you approve the amount first. The USDT goes into a contract that only releases it under the swap rules.

### Step 5: Wait for verification and confirm

The maker locks the XMR in a shared address and sends proof of payment. The app checks the amount and the Monero network confirmations. When everything is fine, the **Confirm** button appears. Once you confirm, the maker can claim.

If the XMR does not arrive or the amount is lower, the app asks you to **refund** before deadline t0. Do it: after that deadline you cannot refund until the final deadline.

### Step 6: Receive your XMR

When the maker claims the USDT, they reveal their key half. The app combines it with yours and sends the XMR to your address. Your wallet shows it after a few confirmations.

## Costs

- **Platform fee:** a percentage of the USDT, charged by the contract when the swap completes, capped at 1%.
- **Gas** on the USDT network to deposit and confirm (and refund if needed).
- **Monero network fee** when sending the XMR to your address.
- **Maker margin**, already included in their price.

Network fees change with congestion; check them in your wallet before signing.

## If something goes wrong

| Problem | What to do |
|---|---|
| The maker did not answer | You deposited nothing: pick another offer |
| You closed the tab | Reopen the app and use your recovery file |
| The XMR does not arrive | Wait; if t0 gets close, the app will ask you to refund |
| You ran out of gas | Get a little ETH on the network and try again |

Before using the service, read the [risk notice](/en/risk-notice/).
