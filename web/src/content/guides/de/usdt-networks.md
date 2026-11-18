---
key: usdt-networks
lang: de
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs. ERC-20 vs. L2: welches nutzen"
description: "Unterschiede zwischen USDT auf Tron (TRC-20), Ethereum (ERC-20) und Layer-2-Netzwerken wie Arbitrum: Gebühren, Geschwindigkeit, Kompatibilität und Risiken."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**Kurz gesagt:** Es ist derselbe digitale Dollar von Tether, aber auf getrennten Netzwerken, die sich nicht mischen. Für einen Swap nutzt du das Netzwerk, auf dem deine USDT schon liegen und auf dem der Dienst aktiv ist. Layer-2-Netzwerke (wie Arbitrum) sind meist günstiger als Ethereum, und Tron ist in Lateinamerika weit verbreitet, aber Gebühren ändern sich: Prüfe sie vor dem Senden in deiner Wallet.

## Die wichtigsten Unterschiede

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum und andere L2 |
|---|---|---|---|
| Adressformat | Beginnt mit `T` | `0x…` | `0x…` (wie Ethereum) |
| Gebührenwährung | TRX (Energie und Bandbreite) | ETH | ETH (auf dem L2) |
| Typische Kosten | Variabel; hängt von verfügbarer Energie ab | Meist am höchsten | Meist niedrig |
| Übliche Wallets | TronLink und andere | MetaMask und kompatible | MetaMask und kompatible |
| Kann Tether sperren? | Ja | Ja | Ja |

> Wir nennen keine Gebührenzahlen, weil sie sich mit der Auslastung und den Entscheidungen jedes Netzwerks ändern. Deine Wallet zeigt dir die genauen Kosten vor dem Signieren.

## Ist es dieselbe Coin?

Gleicher Wert, anderes Netzwerk. USDT auf Tron lassen sich nicht direkt an eine Ethereum-Adresse senden: Du brauchst eine Börse oder eine Bridge. Im falschen Netzwerk zu senden ist einer der [häufigsten Fehler](/de/guides/common-mistakes-when-sending-crypto/).

## Welches nutzt MoneroP2P?

- **Jetzt:** Arbitrum One, dessen USDT (USD₮0) dir erlaubt, die Einzahlung mit einer Signatur zu autorisieren, ohne zusätzliche Freigabe-Transaktion. Der Übungsmodus nutzt Arbitrum Sepolia (Testnet).
- **In Prüfung:** Tron. Der Vertrag kompiliert bereits für Tron, braucht aber noch Tests im Testnet; Tron hat Eigenheiten (zum Beispiel gibt sein USDT bei Überweisungen einen unerwarteten Wert zurück), die der Vertrag schon berücksichtigt.

## So entscheidest du

1. **Wo liegen deine USDT heute?** Sie zwischen Netzwerken zu bewegen kostet Gebühren und Zeit.
2. **Hast du die Gebührenwährung?** Ohne ETH (oder TRX) kannst du nicht signieren.
3. **Was unterstützt der Dienst?** Nutze nur Netzwerke, die in der App aktiv sind.
4. **Wie schnell brauchst du es?** L2 bestätigen in Sekunden; Monero braucht länger, um das XMR zu bestätigen.

## Ein Risiko, das alle teilen

Tether kann auf all diesen Netzwerken Adressen sperren. MoneroP2P nutzt pro Swap einen eigenen Vertrag, damit eine Sperre andere nicht betrifft, aber das Risiko besteht. Lies den [Risikohinweis](/de/risk-notice/).
