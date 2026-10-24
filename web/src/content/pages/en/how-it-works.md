---
key: how
lang: en
title: How a USDT to Monero swap works on xmrp2p
description: "An atomic swap trades your USDT for XMR with no intermediary: a contract holds the USDT and only releases it once you can take the XMR. Simple and technical explanation."
updated: 2026-10-24
---

**Short answer:** your USDT sits in a smart contract that can only pay the seller if they reveal a secret. That same secret is the half you are missing to open the Monero address where the seller left the XMR. That is why the swap is "atomic": either both sides complete, or neither does. If something fails, the contract refunds your USDT.

## For beginners

Think of a safe with two locks:

1. **You and the seller (the "maker") create a Monero address together**, and each of you holds only half of its key. Nobody can move what is there without both halves.
2. **You deposit the USDT into a contract.** The contract knows how to check the maker's half key, but does not know it.
3. **The maker deposits the XMR** into the shared address. The app checks that the right amount arrived.
4. **You confirm** in the contract that everything is fine.
5. **The maker claims the USDT**, and to do so must hand their half key to the contract, which publishes it on-chain.
6. **The app takes that half key**, combines it with yours and sends the XMR to your address.

If the maker never deposits the XMR, you do not confirm and you get your USDT back with a refund.

## What you need

| You need | For |
|---|---|
| A browser wallet (MetaMask or compatible) with USDT | Depositing into the contract |
| A little of the network's coin (e.g. ETH on Arbitrum) | Paying gas |
| A Monero address | Receiving the XMR ([how to create a wallet](/en/guides/how-to-create-a-monero-wallet/)) |
| A password-protected recovery file | Resuming if you close the tab |

## The two deadlines (t0 and t1)

| Moment | What you can do | What the maker can do |
|---|---|---|
| Before **t0**, not confirmed yet | Confirm or refund | Nothing |
| After confirming, or between **t0** and **t1** | Wait | Claim (revealing their secret) |
| From **t1** | Refund | Nothing |

**Important:** if you neither confirm nor refund before t0, the contract lets the maker claim even if they never deposited the XMR. That is why the app asks you to refund automatically when the XMR is not verified as t0 approaches, and why you must keep the recovery file.

## Technical explanation

- **Key halves.** Each party picks a 252-bit scalar `s`. The shared address spend key is `S_taker + S_maker` (ed25519); the view key is `v_taker + v_maker`.
- **DLEQ proof.** Each party proves, without revealing it, that the same `s` is behind their ed25519 key (Monero) and a secp256k1 key, which is what the contract checks. We use the `sigma_fun` construction, the same as eigenwallet.
- **Contract.** One escrow per swap (EIP-1167 clone) stores `keccak(s_maker·G)` and `keccak(s_taker·G)`. `claim(s_maker)` and `refund(s_taker)` check the secret with an `ecrecover` trick. Their windows never overlap.
- **XMR verification.** The maker sends the transaction ID and transaction key; the app checks the payment with `check_tx_key` without syncing a whole wallet.
- **Sweep.** Once the maker's secret appears in the `Claimed` event, the app computes `s_taker + s_maker` and sends the XMR to your address.

The full design is in the [architecture document](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) (Spanish) and builds on the AthanorLabs protocol.
