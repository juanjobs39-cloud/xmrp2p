---
key: atomic-swap
lang: de
slug: what-is-an-atomic-swap
title: Was ist ein Atomic Swap und warum ist er sicher
description: "Ein Atomic Swap tauscht Coins zwischen zwei Chains ohne Mittelsmann: Entweder werden beide Seiten abgeschlossen oder keine. So funktioniert es zwischen USDT und Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**Kurz gesagt:** Ein Atomic Swap ist ein Tausch zwischen zwei Kryptowährungen auf verschiedenen Chains, bei dem keine Partei die Mittel der anderen behalten kann. „Atomar“ heißt er, weil er unteilbar ist: Entweder werden beide Überweisungen ausgeführt oder beide rückgängig gemacht. Seine Sicherheit beruht nicht auf Vertrauen, sondern auf Kryptografie und einem Vertrag mit Fristen.

## Die Idee in einem Satz

Jede Partei sperrt ihre Mittel so, dass **der einzige Weg, bezahlt zu werden, darin besteht, den Schlüssel offenzulegen, den die andere Partei braucht**, um ihre zu nehmen.

## So funktioniert es zwischen USDT und Monero

Monero hat keine Smart Contracts, daher nutzt das Protokoll zwei Teile:

1. **Eine gemeinsame Monero-Adresse**, deren privater Schlüssel in zwei Hälften geteilt ist: Der XMR-Käufer hält eine, der Verkäufer die andere. Mit nur einer Hälfte kann niemand davon ausgeben.
2. **Ein Vertrag im USDT-Netzwerk**, der die USDT hält und den Verkäufer nur bezahlt, wenn er seine Schlüsselhälfte offenlegt.

Wenn der Verkäufer die USDT beansprucht, wird seine Hälfte on-chain veröffentlicht; der Käufer nutzt sie, um den Schlüssel zu vervollständigen und das XMR zu nehmen. Wenn der Verkäufer das XMR nie sperrt, holt sich der Käufer die USDT zurück.

## Warum er sicher ist

| Risiko bei einem Tausch | Wie der Atomic Swap damit umgeht |
|---|---|
| Die andere Partei sendet nicht | Du kannst dir innerhalb der Frist erstatten lassen |
| Die andere Partei kassiert, ohne zu liefern | Um zu kassieren, muss sie den Schlüssel offenlegen, der dir das XMR gibt |
| Ein Verwahrer verschwindet | Es gibt keinen Verwahrer: einen Vertrag und geteilte Schlüssel |
| Die andere Partei nutzt auf jeder Chain einen anderen Schlüssel | Ein kryptografischer Beweis (DLEQ) zeigt, dass es derselbe ist |

## Worauf du achten musst

- **Fristen.** Atomic Swaps sind sicher, wenn jede Partei rechtzeitig handelt. Auf MoneroP2P musst du dir erstatten lassen, wenn das XMR nicht vor der Frist t0 verifiziert ist.
- **Deine Wiederherstellungsdatei.** Wenn du den Browser schließt, brauchst du sie, um abzuschließen oder dir erstatten zu lassen.
- **Die Software.** Die Sicherheit hängt davon ab, dass der Code korrekt ist; der Vertrag von MoneroP2P ist mit automatischen Werkzeugen geprüft, hat aber noch kein externes Audit.

## Ein bisschen Geschichte

Atomic Swaps werden für Bitcoin seit Anfang der 2010er-Jahre diskutiert. Für Monero, das keine Skripte hat, wurden Protokolle mit geteilten Schlüsseln entwickelt: das von COMIT (heute eigenwallet) für Bitcoin und das von AthanorLabs für Ethereum, auf dem MoneroP2P aufbaut.

Weiter: [USDT ohne Mittelsmann gegen Monero tauschen](/de/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
