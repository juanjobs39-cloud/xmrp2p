---
key: common-mistakes
lang: de
slug: common-mistakes-when-sending-crypto
title: Typische Fehler beim Senden von Krypto (und wie du sie vermeidest)
description: "Falsches Netzwerk, fehlendes Memo oder Tag, Mindestbeträge, kein Gas, vergiftete Adressen und unbegrenzte Freigaben: So verlierst du keine Mittel."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**Kurz gesagt:** Die teuersten Fehler sind: im falschen Netzwerk senden, das Memo oder Tag vergessen, das eine Börse verlangt, weniger als den Mindestbetrag senden, kein Gas mehr haben und eine gefälschte Adresse kopieren. Prüfe Netzwerk, vollständige Adresse und Betrag vor dem Signieren: Transaktionen lassen sich nicht rückgängig machen.

## Fehler 1: Im falschen Netzwerk senden

Derselbe Token existiert in mehreren Netzwerken (zum Beispiel USDT auf Tron, Ethereum und Arbitrum). Wenn du in einem Netzwerk sendest, das der Empfänger nicht unterstützt, können Mittel verloren gehen oder eine teure Rettung erfordern.

**So vermeidest du es:** Bestätige das Netzwerk mit dem Empfänger. Die MoneroP2P-App zeigt nur aktive Netzwerke.

## Fehler 2: Memo, Tag oder Payment-ID vergessen

Manche Börsen teilen sich eine Adresse für viele Kunden und erkennen dich an einem Memo oder Tag. Ohne es bleibt die Einzahlung womöglich unzugeordnet.

**So vermeidest du es:** Wenn die Börse ein Memo oder Tag anzeigt, gib es immer mit an. Bei Monero geben dir Börsen meist eine eigene Subadresse, und du brauchst keine Payment-ID.

## Fehler 3: Weniger als den Mindestbetrag senden

Börsen und Dienste haben Mindesteinzahlungen. Darunter wird die Einzahlung womöglich nicht gutgeschrieben. Auf MoneroP2P zeigt jedes Angebot sein Minimum und Maximum.

## Fehler 4: Kein Gas mehr

Um USDT zu bewegen, brauchst du die Coin des Netzwerks (ETH, TRX…). Ohne sie kannst du weder einzahlen noch dir erstatten lassen.

**So vermeidest du es:** Halte vor einem Swap genug für mindestens 3 Transaktionen bereit (Einzahlung, Bestätigung und eine mögliche Rückerstattung).

## Fehler 5: Vergiftete Adressen und Zwischenablage-Malware

Angreifer senden winzige Beträge von Adressen, die deiner ähneln, damit du sie aus deinem Verlauf kopierst. Manche Malware tauscht die kopierte Adresse aus.

**So vermeidest du es:** Kopiere die Adresse aus ihrer Quelle (nicht aus deinem Verlauf) und vergleiche den vollständigen Anfang **und** das Ende.

## Fehler 6: Unbegrenzte Freigaben

Manche Apps verlangen die Erlaubnis, eine unbegrenzte Menge deiner Token auszugeben. Wird diese App kompromittiert, kann sie dein Guthaben leeren.

**So vermeidest du es:** Gib nur frei, was nötig ist. MoneroP2P gibt genau den Swap-Betrag frei.

## Fehler 7: Einem „Support“ vertrauen, der dich anschreibt

Keine seriöse Stelle fragt nach deinem Seed, deiner Wiederherstellungsdatei oder nach Geld, um etwas „freizuschalten“.

## Schnelle Checkliste vor dem Signieren

- [ ] Ist das Netzwerk richtig?
- [ ] Stimmt die vollständige Adresse?
- [ ] Liegt der Betrag über dem Minimum?
- [ ] Habe ich genug Gas?
- [ ] Habe ich meine Wiederherstellungsdatei gespeichert (auf MoneroP2P)?
