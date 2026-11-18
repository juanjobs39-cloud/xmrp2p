---
key: real-money-launch
lang: de
slug: monerop2p-is-live-with-real-money
title: MoneroP2P läuft mit echtem Geld
description: "Seit dem 26. Oktober 2026 tauschst du USDT gegen Monero mit echtem Geld auf Arbitrum One: ohne Verwahrung, ohne Konto, bis 100 USDT pro Swap."
published: 2026-10-30
---

**Kurz gesagt:** Seit dem **26. Oktober 2026** läuft MoneroP2P mit echtem Geld. Du kannst USDT (USD₮0 auf Arbitrum One) über einen Atomic Swap, der in deinem Browser läuft, gegen Monero tauschen: ohne Konto und ohne dass jemand dein Geld hält. Jeder Swap ist auf **100 USDT** begrenzt, und diese Grenze setzt der Vertrag selbst durch.

## Was sich geändert hat

Bis dahin lief die Plattform nur in Testnetzen. Der erste Swap mit echtem Geld wurde am 26. Oktober vollständig abgeschlossen: Der Käufer zahlte USDT ein, der Maker sperrte das XMR, der Käufer bestätigte und erhielt sein Monero, und der Vertrag bezahlte den Maker. Seitdem ist echtes Geld der Standard der Seite.

## Wie wir dein Geld schützen

- **Niemand hält Gelder.** Deine USDT liegen in einem Vertrag nur für deinen Swap, ohne Admin-Funktionen. Er kann nur den Maker bezahlen, sobald du das XMR nehmen kannst, oder dir deine USDT zurückerstatten, wenn etwas schiefgeht.
- **Geprüfter Vertrag.** Er hat die symbolische Verifikation mit **Halmos** bestanden (7 von 7 Eigenschaften für jede Eingabe bewiesen) sowie die statische Analyse mit **Aderyn** (0 hohe Befunde) und **Slither** (keine mittleren oder hohen Befunde). Sein Quellcode ist auf **Sourcify** verifiziert: [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **Grenze von 100 USDT pro Swap.** Es gibt noch kein externes Audit, deshalb begrenzen wir, was ein einzelner Swap riskieren kann. Die Grenze steht im Vertrag, und niemand kann sie erhöhen, ohne einen neuen zu deployen.
- **Open Source** (AGPL-3.0) auf [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), mit SHA-256-Summen für jede Datei der Seite, damit du prüfen kannst, was du lädst.

## Was es kostet

Die Plattformgebühr beträgt **0,5 %**, und der Maker zahlt sie beim Einlösen. Du zahlst nur Arbitrum-Gas für Einzahlung und Bestätigung sowie die Gebühr des Monero-Netzwerks beim Empfang. Der Preis jedes Makers enthält bereits seine Marge; die App zeigt das genaue XMR, bevor du einzahlst.

## Weitere Neuigkeiten aus diesen Wochen

- **Einfache Ansicht:** Gib ein, wie viel USDT du sendest, drück auf «Tauschen» und sieh alle Angebote, sortiert danach, was du bekommst.
- **Mehr als 100 USDT oder keine Maker verfügbar:** Die App zeigt Angebote von Sofort-Börsen über Trocador. Diese Option funktioniert anders (die Börse hält den Tausch); wir erklären es in der [Datenschutzerklärung](/de/privacy/).
- **Werde Maker im Browser**, ohne etwas zu installieren: Der offene Tab arbeitet als dein Server. [So wirst du Maker](/de/become-a-maker/).
- **Mehr Sprachen:** Die App gibt es inzwischen auch auf Deutsch, Französisch und Italienisch.

## Was als Nächstes kommt

- Ein externes Audit des Vertrags, mit dem wir die Grenze pro Swap anheben könnten.
- Mehr Maker, damit es immer Angebote gibt.
- Prüfung weiterer USDT-Netzwerke, etwa Tron.

[App öffnen →](/de/app/) · Lies vor der Nutzung den [Risikohinweis](/de/risk-notice/).
