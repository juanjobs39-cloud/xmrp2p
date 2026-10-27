---
key: security
lang: en
title: MoneroP2P security
description: "Why nobody holds your funds, how refunds work, which risks exist and how to verify the code. Verified with Halmos, Aderyn and Slither."
updated: 2026-10-27
---

**Short answer:** on MoneroP2P nobody holds funds. Your USDT is in a contract that only releases money under public rules, and the XMR is in an address nobody can move without both key halves. It runs with real money on Arbitrum One + Monero, with a **maximum of 100 USDT per swap enforced by the contract**. The contract is verified with Halmos, Aderyn and Slither and its source is published on Sourcify; it has not had an external audit yet, which is why each swap is capped.

## Why nobody holds your funds

- **The USDT** sits in a contract dedicated to your swap. It has no admin functions: neither we nor the maker can take it out except through `claim` and `refund`.
- **The XMR** sits in a shared address. The maker cannot take it back without your key half, and you cannot take it without theirs.
- **Your keys** are generated in your browser and never sent to our servers. The backend rejects any message containing a full private key.

## How refunds work

| Situation | What happens |
|---|---|
| The maker does not deposit the XMR | You refund before t0 (the app asks you to) |
| The maker deposits less XMR | You do not confirm and refund before t0 |
| You confirmed and the maker does not claim | You refund from t1 |
| You closed the tab | Come back with your [recovery file](/en/guides/what-to-do-if-you-closed-the-tab/) |

## Risks you should know

1. **Deadlines.** If you do not refund in time when the XMR did not arrive, you can lose the USDT. The app warns you, but it must be open or you must come back with the file.
2. **Recovery file.** Without it and its password you cannot claim the XMR or refund. We cannot recover it for you.
3. **USDT freezes.** Tether can freeze addresses. Each swap uses a separate contract, but the risk exists.
4. **No external audit yet.** The contract passed automated verification (Halmos, Aderyn, Slither), but software can still have bugs. The 100 USDT cap per swap limits what a single swap can put at risk.
5. **Privacy.** The Monero node proxy sees what your browser queries. You can use your own node.

## How we protect the app

- Strict **Content Security Policy**: the app only runs its own code.
- **Subresource Integrity** on scripts and styles, and the crypto core's integrity is verified before use.
- **No third-party scripts**, no analytics, no cookies.
- **Verifiable builds:** we publish `SHA256SUMS` for every file and a copy on IPFS.

## Audits

The contract was verified with free, open tools: **Halmos** (symbolic verification, 7/7 properties proven for all inputs), **Aderyn** (0 high findings) and **Slither** (no medium or high findings). Its source is verified on **Sourcify** (exact match). Report: [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). An external audit is still pending; the prepared scope is in [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md).

## Source code and reports

Open source (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). To report a vulnerability, use GitHub private reporting as described in `SECURITY.md`.
