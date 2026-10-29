# Correo para Trocador (borrador)

**Para:** commercial@trocador.app
**Asunto:** Listing a non-custodial USDT→XMR atomic swap provider (MoneroP2P)

> Revisa y ajusta los datos de contacto antes de enviarlo desde tu correo. Si quieres ofrecer parte de tu comisión a Trocador, completa la línea marcada con [OPCIONAL].

---

Hi Trocador team,

I'm the developer of **MoneroP2P** (https://monerop2p.app), a non-custodial platform that swaps **USDT (USD₮0 on Arbitrum One) for Monero** through atomic swaps that run in the user's browser. It is live with real money and open source (AGPL-3.0): https://github.com/juanjobs39-cloud/xmrp2p

Key facts:
- No KYC, no account, no custody: the USDT sits in an escrow contract until the buyer can take the XMR; if anything fails, the buyer refunds it.
- Swap contract on Arbitrum One: `0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`, verified on Sourcify. Checked with Halmos (7/7 properties proven), Aderyn and Slither. No external audit yet, so swaps are capped at 100 USDT.
- Buyer pays network gas only; the 0.5 % fee is paid by the maker.
- Typical time: 30–45 minutes (10 Monero confirmations).

Since it is an atomic swap, the buyer has to finish in our web app (they keep their own keys and sign the deposit). So we don't fit the usual "send to a deposit address" flow. I'd like to ask:

1. Would you consider listing a non-custodial provider whose flow is **"show our quote → open our app"**? We expose a public quote API that returns a ready deep link with your referral id:
   `GET https://api.monerop2p.app/v1/quote?network=arbitrum_one&usdt=50&ref=trocador`
   Integration notes: https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AGREGADORES.md
2. If not, is there another way to appear on Trocador (for example a section for DEX or atomic-swap providers)?

[OPCIONAL] We'd be happy to share part of our fee on swaps referred by Trocador.

Thanks for your work for the Monero community.

Best regards,
[Tu nombre]
MoneroP2P — https://monerop2p.app
