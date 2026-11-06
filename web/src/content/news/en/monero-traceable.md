---
key: monero-traceable
lang: en
slug: is-monero-traceable-xmr-vs-bitcoin-vs-zcash
title: "Is Monero traceable? XMR vs Bitcoin vs Zcash privacy in 2026"
description: "What Monero hides, what it doesn't, and how it compares with Bitcoin and Zcash. Plus what FCMP++ changes and how to use XMR more privately in 2026."
published: 2026-11-06
keywords:
  - is Monero traceable
  - is Monero anonymous
  - Monero vs Bitcoin privacy
  - Monero vs Zcash
  - most private cryptocurrency
  - Monero FCMP++
  - how Monero privacy works
  - Monero ring signatures
howto:
  name: "How to use Monero more privately"
  totalTime: PT20M
  steps:
    - name: "Use a non-custodial wallet"
      text: "Keep your XMR in a wallet where only you hold the seed, such as MoneroP2P Wallet, Feather or Cake Wallet. An exchange knows who you are and what you withdraw."
    - name: "Receive each payment on a new subaddress"
      text: "Generate a different subaddress for each payment or each person, so nobody can link your incoming payments."
    - name: "Connect to a node you trust"
      text: "Use your own node or one you trust. The node sees your IP address when you send a transaction."
    - name: "Buy without KYC"
      text: "Buy XMR peer to peer or with an atomic swap, without handing your ID to an exchange that links your name to your withdrawals."
    - name: "Don't move everything at once"
      text: "Avoid moving the exact amount you just bought right after receiving it. Timing and amount patterns are the clues most often used to guess."
faq:
  - q: "Is Monero traceable?"
    a: "Not the way Bitcoin is. Monero's blockchain does not show the sender, the receiver or the amount, because it uses stealth addresses, ring signatures and RingCT. What can leak information is what happens off-chain: a KYC exchange, a node that logs your IP, or timing and amount patterns."
  - q: "Is Monero 100% anonymous?"
    a: "No technology is 100% anonymous. Monero hides who sends, who receives and how much by default, but ring signatures hide the sender among 16 candidates, and statistical analysis can estimate the real one in some cases. The FCMP++ upgrade aims to remove that weakness."
  - q: "What is FCMP++?"
    a: "Full-Chain Membership Proofs. It replaces 16-member ring signatures: instead of hiding your output among 16, it hides it among every output on the blockchain. As of November 2026 it is not live on mainnet; an unofficial developer draft points to around March 2027."
  - q: "Which is more private, Monero or Zcash?"
    a: "Zcash has very strong cryptography (zk-SNARKs) when you use shielded addresses, but privacy is optional and transparent, Bitcoin-like addresses also exist. On Monero every transaction is private, so using it doesn't make you stand out. That is why Monero is usually considered more private in practice."
  - q: "Is Bitcoin anonymous?"
    a: "No. Bitcoin is pseudonymous: every transaction, address and amount is public forever. Chain analysis companies link addresses to people using KYC exchanges and usage patterns."
  - q: "Is it legal to use Monero?"
    a: "In most countries holding and using Monero is legal. What has been restricted is regulated exchanges offering it; in the European Union that ban applies from July 2027. Check the laws in your country."
---

**In short:** **Monero's (XMR) blockchain does not show the sender, the receiver or the amount** of any transaction, so it **cannot be traced the way Bitcoin is**, where everything is public. Monero does this with **stealth addresses, 16-member ring signatures and RingCT**, and applies them to every transaction by default, unlike **Zcash**, where privacy is optional. Its weak spots are off-chain: **KYC exchanges, your IP and usage patterns**. The next upgrade, **FCMP++**, is not live yet (draft target **March 2027**) and will strengthen exactly the weakest part.

[Buy Monero without KYC →](/en/buy-monero/)

## Monero vs Bitcoin vs Zcash: comparison table

| | Monero (XMR) | Bitcoin (BTC) | Zcash (ZEC) |
|---|---|---|---|
| Private by default | Yes, every transaction | No | No, optional |
| Sender | Hidden (16-member ring signature) | Public | Hidden only with shielded addresses |
| Receiver | Hidden (stealth addresses) | Public | Hidden only with shielded addresses |
| Amount | Hidden (RingCT) | Public | Hidden only with shielded addresses |
| IP origin when sending | Protected by Dandelion++ | Visible to nodes | Visible to nodes |
| In a block explorer | Only encrypted data | Full history | Depends on address type |
| Auditing your own wallet | View key | Always public | Viewing key |
| Mining | RandomX (CPU) | SHA-256 (ASIC) | Equihash (ASIC) |
| Block time | ~2 minutes | ~10 minutes | ~75 seconds |

The key difference is **by default**. If a coin lets you choose between public and private transactions, the people who choose private ones stand out. On Monero every transaction looks the same, so yours blends in with all the others.

## How Monero hides each piece of data

### Who receives: stealth addresses
Every time someone pays you, the sender's wallet creates a **one-time address** derived from yours. Your public address never appears on the blockchain, so nobody can see how many payments you received. On top of that you can use **subaddresses**: a different one for each person or payment.

### Who sends: ring signatures
When you spend XMR, your transaction signs it together with **15 outputs from other people** taken from the blockchain (16 in total since the August 2022 upgrade). An observer knows one of the 16 is real, but not which one. A **key image** prevents spending the same output twice without revealing which one it was.

### How much: RingCT
Since January 2017 amounts are encrypted with **Ring Confidential Transactions**. The network checks that no coins are created out of thin air without seeing the amounts.

### From where: Dandelion++
Since 2020 transactions first hop through a few random nodes before being broadcast to the whole network. That makes it harder to tell which IP sent it first.

## So, is Monero traceable?

On the blockchain, not like Bitcoin. But there are limits worth knowing:

- **Ring signatures are probabilistic.** They hide the sender among 16, not among everyone. Statistical analysis (output age, chained spends, or one actor controlling several decoys) can **estimate** the real one in some cases. It is not proof, but it reduces anonymity.
- **The node sees your IP.** If you use someone else's node, that node knows which IP you sent from. In 2024 a video leaked from a chain analysis company claiming to link Monero transactions using **malicious nodes** that logged IPs.
- **KYC gives you away off-chain.** If you buy XMR on an exchange that has your ID, the exchange knows you withdrew a certain amount at a certain time. With that it can guess where it went.
- **Patterns talk.** Moving the exact amount you just received, always at the same time, makes guessing easier.

None of these limits break Monero's cryptography; they all exploit information you leave around it. That is why how you use it matters as much as the coin itself.

## FCMP++: what's coming

**FCMP++ (Full-Chain Membership Proofs)** replaces ring signatures. Instead of hiding your output among 16, it hides it **among every output in Monero's history**, more than a hundred million. That removes almost all statistical attacks on rings. It ships together with **Carrot**, a new address scheme.

**Status as of November 2026:**
- In October 2026 it is being tested on **test networks** (testnet and stressnet), not mainnet.
- A developer draft, which they themselves call **non-binding**, targets mainnet activation around **March 2027**.
- **There is no official date.** Check [getmonero.org](https://www.getmonero.org/) before trusting any date.

When it arrives you don't need to do anything special with your XMR: just update your wallet to a compatible version.

## How to use Monero more privately

1. **Non-custodial wallet.** Use a wallet where only you hold the seed, such as [MoneroP2P Wallet](/en/wallet/), Feather or Cake Wallet. Guide: [how to create a Monero wallet](/en/guides/how-to-create-a-monero-wallet/).
2. **A new subaddress per payment.** MoneroP2P Wallet already creates a different one every time you open «Receive».
3. **A node you trust.** Use your own node if you can; in MoneroP2P Wallet you change it in Settings.
4. **Buy without KYC.** Use [P2P Fiat](https://fiat.monerop2p.app/en/) with your local currency or a [USDT to XMR atomic swap](/en/guides/how-to-swap-usdt-for-monero-without-intermediaries/). More options in [how to buy Monero without KYC](/en/guides/how-to-buy-monero-without-kyc/).
5. **Wait and don't copy amounts.** Let some time pass before moving what you received again, and don't forward the exact figure.

## Other "privacy coins" compared with Monero

- **Litecoin (MWEB):** optional privacy in a separate extension block; most usage is still public.
- **Dash:** its mixing feature (CoinJoin) is optional and amounts stay visible.
- **Bitcoin with CoinJoin:** mixing helps, but mixed outputs are recognizable and some exchanges block them.

In all of them privacy is an extra you have to turn on. On Monero it is the rule.

## FAQ

### Is Monero traceable?
Not like Bitcoin: the blockchain shows no sender, receiver or amount. What can give you away is off-chain: KYC, your IP and your patterns.

### Is Monero 100% anonymous?
Nothing is. Ring signatures hide the sender among 16 and statistical analysis can estimate the real one in some cases. FCMP++ aims to fix that.

### What is FCMP++?
The upgrade that hides your output among every output on the blockchain instead of among 16. As of November 2026 it is not live; the draft targets March 2027.

### Which is more private, Monero or Zcash?
In practice, Monero, because its privacy is mandatory. Zcash is very strong with shielded addresses but also allows public transactions.

### Is Bitcoin anonymous?
No. It is pseudonymous and its whole history is public.

### Is it legal to use Monero?
In most countries, yes. What is restricted is regulated exchanges offering it: read [why Monero was delisted](/en/news/monero-delisted-where-to-buy-xmr-in-2026/).

For the basics, read [what Monero is and how it differs from Bitcoin](/en/guides/what-is-monero/). Using crypto carries risk: read the [risk notice](/en/risk-notice/).

[Buy Monero without KYC →](/en/buy-monero/)
