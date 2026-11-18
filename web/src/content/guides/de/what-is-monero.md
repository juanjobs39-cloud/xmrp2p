---
key: what-is-monero
lang: de
slug: what-is-monero
title: Was ist Monero und wie unterscheidet es sich von Bitcoin
description: "Monero (XMR) ist standardmäßig privat: Es verbirgt Absender, Empfänger und Betrag. Unterschiede zu Bitcoin bei Privatsphäre, Ausgabe und Nutzung."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**Kurz gesagt:** Monero (XMR) ist eine Kryptowährung, die standardmäßig verbirgt, wer sendet, wer empfängt und wie viel. Bei Bitcoin dagegen sind jede Adresse und jeder Betrag öffentlich, und jeder kann Mittel zurückverfolgen. Monero gibt es seit 2014 und es ist Open Source.

## Die wichtigsten Unterschiede

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Absender | Verborgen (Ringsignaturen) | Öffentlich |
| Empfänger | Verborgen (Einmaladressen) | Öffentlich |
| Betrag | Verborgen (RingCT) | Öffentlich |
| Privatsphäre | Immer aktiv | Optional und begrenzt |
| Blockzeit | Etwa 2 Minuten | Etwa 10 Minuten |
| Ausgabe | Kleine dauerhafte Tail Emission seit 2022 | Obergrenze von 21 Millionen |
| Smart Contracts | Nein | Begrenzte Skripte |

## Wie es Privatsphäre erreicht

- **Ringsignaturen:** Deine Transaktion wird mit anderen Outputs der Chain gemischt, sodass die echte unbekannt bleibt.
- **Stealth-Adressen:** Jede Zahlung geht an eine Einmaladresse; deine öffentliche Adresse erscheint nie on-chain.
- **RingCT:** Beträge sind verschlüsselt, und trotzdem prüft das Netzwerk, dass kein Geld aus dem Nichts entsteht.

## Fungibilität

Weil die Historie nicht sichtbar ist, ist jedes XMR mit jedem anderen austauschbar. Bei transparenten Coins können manche Einheiten wegen ihrer Historie abgelehnt werden.

## View Key

Mit Monero kannst du einen **View Key** teilen, der empfangene Zahlungen zeigt, ohne Ausgaben zu erlauben. MoneroP2P nutzt ihn, damit der Käufer prüfen kann, dass das XMR auf der gemeinsamen Adresse angekommen ist.

## Was du beachten solltest

- Einige zentrale Börsen haben Monero in bestimmten Rechtsordnungen delistet. Deshalb sind Methoden ohne Mittelsmann wie Atomic Swaps wichtig.
- Privatsphäre befreit dich nicht von den Gesetzen deines Landes.

Weiter: [So erstellst du eine Monero-Wallet](/de/guides/how-to-create-a-monero-wallet/).
