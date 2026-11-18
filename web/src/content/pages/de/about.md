---
key: about
lang: de
title: Über MoneroP2P
description: "Was MoneroP2P ist, wie der aktuelle Stand ist und wie es sich finanziert (eine Gebühr auf jeden abgeschlossenen Swap)."
updated: 2026-10-24
---

**Kurz gesagt:** MoneroP2P ist ein Open-Source-Projekt, um USDT ohne Mittelsmann gegen Monero zu tauschen, mit Atomic Swaps, die im Browser laufen. Es läuft mit echtem Geld auf Arbitrum One + Monero (maximal 100 USDT pro Swap); der Vertrag ist mit Halmos, Aderyn und Slither geprüft und hat noch kein externes Audit.

## Was wir bauen

Die Web-App, den Smart Contract, den Krypto-Kern und das Programm, das Maker betreiben. Wir verwahren keine Mittel und speichern keine Schlüssel von Nutzern.

## Wie es sich finanziert

Der Vertrag erhebt eine prozentuale Gebühr, wenn ein Swap abgeschlossen wird. Der Prozentsatz wird beim Bereitstellen des Vertrags festgelegt und ist im Code auf 1 % begrenzt, was niemand ändern kann. Rückerstattungen zahlen keine Gebühr. Sofort-Tausche über Trocador enthalten eine Marge von 1 % für MoneroP2P im angezeigten Kurs; es gibt keine separaten Gebühren.

## Stand

- Live mit echtem Geld seit Oktober 2026 (maximal 100 USDT pro Swap), mit einem Übungsmodus im Testnet.
- Vertrag mit Halmos, Aderyn und Slither geprüft und auf Sourcify veröffentlicht.
- Ausstehend: ein externes Audit.

## Danksagung

Das Protokoll baut auf der Arbeit von AthanorLabs und früherer Forschung von COMIT und dem Farcaster-Projekt auf. Der DLEQ-Beweis nutzt dieselbe Konstruktion wie eigenwallet.

## Code

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (Lizenz AGPL-3.0).
