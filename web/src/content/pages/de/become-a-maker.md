---
key: maker
lang: de
title: Maker werden
description: "Ein Maker stellt XMR bereit und verdient eine Marge über dem Marktpreis. Direkt im Browser ohne Installation oder rund um die Uhr mit eigenem Server."
updated: 2026-10-26
---

**Kurz gesagt:** Ein Maker hält XMR und bietet es gegen USDT an, mit einer Marge über dem Referenzpreis. Das geht **direkt im Browser ohne Installation** (der offene Tab arbeitet als dein Server) oder **rund um die Uhr mit deinem eigenen Server oder Computer**. In beiden Fällen verwahrt niemand deine Mittel. Es läuft mit echtem Geld auf Arbitrum One (maximal 100 USDT pro Swap), und es gibt auch einen Übungsmodus im Testnet.

## Zwei Wege, Maker zu werden

| | Im Browser (empfohlen) | Eigener Server rund um die Uhr |
|---|---|---|
| Für | Alle | Technische Maker |
| Einrichtung | Keine: Öffne [die Maker-Seite](/de/maker/) | Python, `monero-wallet-rpc` und der Daemon ([Anleitung](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| Wann du anbietest | Solange der Tab auf einem Computer offen ist | Die ganze Zeit |
| Deine Schlüssel | In deinem Browser, verschlüsselt mit deinem Passwort und in einem Backup | Auf deinem Server |
| USDT-Auszahlung | Direkt an dein MetaMask | An die Adresse, die du einstellst |

**Hier starten:** [Maker werden, direkt im Browser →](/de/maker/)

## Was du im Browser brauchst

| Voraussetzung | Detail |
|---|---|
| Einen Computer mit offenem Tab | Handys schicken Tabs in den Ruhezustand |
| XMR zum Anbieten | Sende es an die Adresse, die dir die Seite gibt; es wird nach 10 Bestätigungen frei |
| Etwas ETH für Gas | Zum Einlösen; mit einem Klick aus MetaMask aufladen |
| Ein Passwort und deine Backup-Datei | Ohne Backup kannst du deinen Maker nicht in einem anderen Browser wiederherstellen |

## Wie der Preis entsteht

Der Daemon nimmt den Median mehrerer öffentlicher Quellen (Kraken, CoinGecko und KuCoin), verwirft den Kurs, wenn eine Quelle zu weit vom Median abweicht, und wendet deine Marge an. Du legst fest:

- die Marge über dem Referenzpreis,
- den Mindest- und Höchstbetrag pro Swap,
- das maximale Risiko (gleichzeitig gebundenes XMR),
- die Anzahl gleichzeitiger Swaps.

## Sicherheitsregeln (Browser und Server)

- Er sendet nie XMR ohne gültige On-Chain-Einzahlung.
- Er löst nie ein, wenn er das XMR nicht gesperrt hat.
- Er versucht nicht, in den letzten Minuten vor t1 einzulösen.
- Er simuliert jede Transaktion, bevor er sie sendet.
- Wenn der Taker zurückholt, holt er das XMR automatisch zurück.

## Risiken für den Maker

- **Volatilität:** Der Preis kann sich zwischen Kurs und Einlösung bewegen.
- **Verfügbarkeit:** Wenn du den Tab schließt (oder dein Server ausfällt) zwischen t0 und t1, wirst du nicht bezahlt; der Taker holt zurück und du musst wiederkommen, um dein XMR zurückzuholen.
- **Backups:** Deine Backup-Datei (oder die Datenbank des Daemons) enthält die Schlüsselhälften jedes Swaps; ohne sie kannst du das XMR nicht zurückholen.
- **Regulierung:** Als Maker zu handeln kann in deinem Land rechtliche Folgen haben. Prüfe das, bevor du anfängst.

Nichts davon garantiert Gewinne. Die vollständige Installationsanleitung steht in [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
