---
key: common-mistakes
lang: en
slug: common-mistakes-when-sending-crypto
title: Common mistakes when sending crypto (and how to avoid them)
description: "Wrong network, missing memo or tag, minimum amounts, no gas, poisoned addresses and unlimited approvals: how to avoid losing funds."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**Short answer:** the most costly mistakes are sending on the wrong network, forgetting the memo or tag an exchange requires, sending less than the minimum, running out of gas and copying a fake address. Check network, full address and amount before signing: transactions cannot be reversed.

## Mistake 1: Sending on the wrong network

The same token exists on several networks (for example, USDT on Tron, Ethereum and Arbitrum). If you send on a network the recipient does not support, funds can be lost or require a costly rescue.

**How to avoid it:** confirm the network with the recipient. The xmrp2p app only shows active networks.

## Mistake 2: Forgetting the memo, tag or payment ID

Some exchanges share one address among many customers and identify you by a memo or tag. Without it, the deposit may stay unassigned.

**How to avoid it:** if the exchange shows a memo or tag, always include it. On Monero, exchanges usually give you your own subaddress and you do not need a payment ID.

## Mistake 3: Sending less than the minimum

Exchanges and services have minimum deposit amounts. Below them, the deposit may not be credited. On xmrp2p each offer shows its minimum and maximum.

## Mistake 4: Running out of gas

To move USDT you need the network's coin (ETH, TRX…). Without it, you cannot deposit or refund.

**How to avoid it:** before a swap, keep enough for at least 3 transactions (deposit, confirmation and a possible refund).

## Mistake 5: Poisoned addresses and clipboard malware

Attackers send tiny amounts from addresses that look like yours so you copy them from your history. Some malware swaps the address you copy.

**How to avoid it:** copy the address from its source (not your history) and compare the full beginning **and** end.

## Mistake 6: Unlimited approvals

Some apps ask for permission to spend an unlimited amount of your tokens. If that app is compromised, it can drain your balance.

**How to avoid it:** approve only what is needed. xmrp2p approves exactly the swap amount.

## Mistake 7: Trusting "support" that contacts you

No legitimate party will ask for your seed, your recovery file or funds to "unlock" something.

## Quick checklist before signing

- [ ] Is the network correct?
- [ ] Does the full address match?
- [ ] Is the amount above the minimum?
- [ ] Do I have enough gas?
- [ ] Did I save my recovery file (on xmrp2p)?
