---
key: security
lang: en
title: MoneroP2P security
description: "Why nobody holds your funds, how refunds work, which risks exist and how to verify the code. Verified with Halmos, Aderyn and Slither."
updated: 2026-10-24
---

**Short answer:** on MoneroP2P nobody holds funds. Your USDT is in a contract that only releases money under public rules, and the XMR is in an address nobody can move without both key halves. Even so, the software is experimental and **has not been audited yet**: use it on testnet only.

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
4. **Unaudited software.** It may have bugs. Before real money, the contract and the crypto core will get an external audit.
5. **Privacy.** The Monero node proxy sees what your browser queries. You can use your own node.

## How we protect the app

- Strict **Content Security Policy**: the app only runs its own code.
- **Subresource Integrity** on scripts and styles, and the crypto core's integrity is verified before use.
- **No third-party scripts**, no analytics, no cookies.
- **Verifiable builds:** we publish `SHA256SUMS` for every file and a copy on IPFS.

## Audits

There is no external audit yet. The prepared scope is in [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md). Once it exists, we will publish the report here.

## Source code and reports

Open source (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). To report a vulnerability, use GitHub private reporting as described in `SECURITY.md`.
