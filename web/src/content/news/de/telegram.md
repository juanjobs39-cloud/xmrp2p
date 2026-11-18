---
key: telegram-bot
lang: de
slug: buy-monero-on-telegram-bot
title: "Monero auf Telegram kaufen und verkaufen: ein Bot mit Alarmen und ohne KYC"
description: "Der MoneroP2P-Bot öffnet den P2P-Markt und die Börse in Telegram, benachrichtigt dich über deine Orders und sendet Alarme für neue Anzeigen. Ohne KYC, ohne Verwahrung."
published: 2026-11-11
keywords:
  - Monero auf Telegram kaufen
  - Monero Telegram Bot
  - XMR verkaufen Telegram
  - XMR Bot ohne KYC
  - Monero Preisalarm Telegram
  - Monero Mini App
  - XMR P2P kaufen
  - Bitcoin in Monero tauschen Telegram
  - MoneroP2PFiatBot
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/de/
    description: "P2P-Marktplatz, um Monero (XMR) mit lokaler Währung zu kaufen und zu verkaufen, mit 2-von-3-Multisig-Treuhand im Monero-Netzwerk und ohne KYC."
  - name: MoneroP2P
    url: https://monerop2p.app/de/app/
    description: "Börse ohne Konto, um USDT, BTC, ETH und andere Krypto in Monero (XMR) zu tauschen, mit einem Atomic Swap ohne Verwahrung für USDT auf Arbitrum."
howto:
  name: "So kaufst du Monero über Telegram mit dem MoneroP2P-Bot"
  totalTime: PT45M
  steps:
    - name: "Öffne den offiziellen Bot"
      text: "Such @MoneroP2PFiatBot in Telegram oder folge dem Link auf der Seite und tippe auf Start. Prüfe, dass der Benutzername genau dieser ist."
    - name: "Öffne den Markt in Telegram"
      text: "Tippe auf die Schaltfläche «P2P». Der Markt öffnet sich als Mini App, ohne Telegram zu verlassen. Erstelle dein Konto mit einem Spitznamen und einem Passwort: ohne E-Mail oder Ausweis."
    - name: "Wähle eine Anzeige"
      text: "Filtere nach Währung und Zahlungsmethode und vergleiche Preis, Limits und den Ruf des Verkäufers."
    - name: "Warte auf die Treuhand"
      text: "Der Verkäufer zahlt das XMR in eine 2-von-3-Multisig-Treuhand ein, die auf deinem Handy signiert wird. Der Bot sagt dir, wenn sich der Status der Order ändert."
    - name: "Bezahle und empfange"
      text: "Sobald das XMR gesperrt ist, bezahl mit der vereinbarten Methode und markiere «Ich habe bezahlt». Der Verkäufer bestätigt, und die Treuhand sendet das Monero an deine Wallet."
faq:
  - q: "Kann man Monero auf Telegram kaufen?"
    a: "Ja. Der Bot @MoneroP2PFiatBot öffnet den P2P-Fiat-Markt von MoneroP2P als Mini App in Telegram: Du wählst eine Anzeige, das XMR liegt in einer 2-von-3-Multisig-Treuhand, und du zahlst per Überweisung, Bezahl-App oder bar. Er verlangt weder KYC noch E-Mail."
  - q: "Hält der MoneroP2P-Bot mein Geld oder meine Schlüssel?"
    a: "Nein. Der Bot öffnet nur die Plattform und sendet Benachrichtigungen. Dein Konto und die Treuhand werden auf deinem Gerät signiert; der Bot sieht nie Schlüssel, Passwörter oder Zahlungsdaten und kann kein XMR bewegen."
  - q: "Was kann Telegram sehen?"
    a: "Telegram weiß, dass du mit dem Bot sprichst, und sieht den Text der Benachrichtigungen. Deshalb enthalten Benachrichtigungen keine Beträge, Adressen oder Zahlungsdaten, und die Apps entfernen die Daten, die Telegram an die URL anhängt, und laden keine Skripte von telegram.org."
  - q: "Brauche ich ein Konto für Alarme zu neuen Anzeigen?"
    a: "Nein. Mit /alerts wählst du, ob du Kauf-, Verkaufsanzeigen oder beides sehen willst, und in welchen Währungen. Es gibt kein Konto zu erstellen und nichts zu verbinden."
  - q: "Wie schalte ich Benachrichtigungen aus?"
    a: "Sende /stop an den Bot. Er löst die Verbindung zu deinem Konto und löscht deine Alarme. Den Bot zu blockieren bewirkt dasselbe."
  - q: "Jemand hat mir auf Telegram geschrieben, um mir Monero zu verkaufen. Ist das der Bot?"
    a: "Nein. Der offizielle Bot beginnt nie Gespräche, um Geschäfte anzubieten, chattet nicht im Namen der anderen Partei und fragt nie nach Zahlungen, Seeds oder Passwörtern. Wenn dir eine Person auf Telegram schreibt, um einen Kauf abzuschließen oder eine Zahlung außerhalb einer Order zu verlangen, ist es Betrug."
  - q: "Welche Sprachen spricht der Bot?"
    a: "Englisch und Spanisch, je nach Sprache deines Telegram. Die Seiten von P2P Fiat und die Börse gibt es auch auf Deutsch, Französisch und Italienisch."
---

**Kurz gesagt:** Du kannst jetzt **Monero (XMR) kaufen und verkaufen, ohne Telegram zu verlassen**. Der offizielle Bot [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) öffnet den [P2P-Fiat-Markt](https://fiat.monerop2p.app/de/) und die [Börse](/de/app/) als Mini App, sagt dir, wenn eine Order vorankommt, und sendet **Alarme für neue Anzeigen** in deiner Währung. **Ohne KYC und ohne Verwahrung:** Die Treuhand wird auf deinem Handy signiert, und der Bot berührt dein Geld nie.

[Bot in Telegram öffnen →](https://t.me/MoneroP2PFiatBot)

## Was macht der Bot?

| Befehl | Was er tut | Konto nötig? |
|---|---|---|
| Schaltfläche **P2P** | Öffnet den Markt, um XMR mit lokaler Währung zu kaufen oder zu verkaufen | Ja, in Sekunden erstellt |
| `/alerts` | Informiert dich über neue Kauf-, Verkaufsanzeigen oder beides, in den Währungen deiner Wahl | Nein |
| `/swap` | Öffnet die Börse, um BTC, USDT, ETH und andere Krypto in XMR zu tauschen, und meldet dir den Fortschritt | Nein |
| `/orders` | Listet deine offenen Orders mit einer Schaltfläche zum Öffnen | Ja |
| `/stop` | Schaltet Benachrichtigungen aus und löscht deine Alarme | Nein |

Wenn du verkaufst und Anfragen auch offline annimmst, kannst du mit dem Bot außerdem **eine Anfrage direkt in der Nachricht annehmen oder ablehnen**, ohne die Webseite zu öffnen.

## Wie kaufe ich Monero über Telegram?

1. Öffne [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) und tippe auf **Start**.
2. Tippe auf **P2P**. Der Markt öffnet sich in Telegram. Erstelle dein Konto mit einem Spitznamen und einem Passwort.
3. Wähle deine Währung und Zahlungsmethode und nimm eine Anzeige an.
4. Der Verkäufer zahlt das XMR in eine **2-von-3-Multisig-Treuhand** ein. Nach 10 Bestätigungen (etwa 20 Minuten) öffnen sich der verschlüsselte Chat und seine Zahlungsdaten.
5. Bezahle, markiere **«Ich habe bezahlt»** und warte, bis der Verkäufer freigibt. Das XMR kommt in deiner Wallet an.

Es ist derselbe Markt wie im Web, mit denselben Regeln. Die Details stehen unter [So funktioniert P2P Fiat](https://fiat.monerop2p.app/de/how-it-works/).

## Wie bekomme ich Alarme für neue Anzeigen?

Sende `/alerts` und wähle mit den Schaltflächen, was du sehen willst. Du kannst die Währungen auch direkt eingeben, zum Beispiel `/alerts EUR CHF`.

- **Was jeder Alarm enthält:** Preis, Limits, Zahlungsmethoden und eine Schaltfläche, die den Markt bereits gefiltert öffnet.
- **Was er weglässt:** die Bedingungen der Anzeige und jede Möglichkeit, den Anbieter außerhalb der Plattform zu kontaktieren.
- **Wann er kommt:** 15 Minuten nach dem Schalten der Anzeige und nur, wenn sie noch aktiv ist.
- **Keine Flut:** höchstens ein Alarm pro Anbieter alle 6 Stunden.
- **Betrugsfilter:** Anzeigen, die dich auffordern, über WhatsApp, Telegram oder Telefon weiterzumachen, werden nie gemeldet.

## Kann ich über Telegram Bitcoin oder USDT gegen Monero tauschen?

Ja. `/swap` öffnet die [Börse](/de/app/) in Telegram: Du vergleichst Angebote, um von BTC, USDT, ETH und über 2.500 Coins zu XMR zu wechseln oder [XMR zu verkaufen](/de/news/sell-monero-for-usdt-or-bitcoin/). Wenn du willst, sagt dir der Bot, wenn sich der Status des Tauschs ändert: Einzahlung erkannt, wird gesendet, abgeschlossen, abgelaufen oder erstattet.

Diese Benachrichtigungen nutzen einen Code, der nur für einen Chat gilt, höchstens 10 Benachrichtigungen sendet und nach 48 Stunden abläuft. Sie enthalten keine Beträge oder Adressen.

## Ist es sicher, Monero auf Telegram zu kaufen?

Es kommt darauf an, mit wem du sprichst. Es gibt drei sehr unterschiedliche Situationen:

| | MoneroP2P-Webseite | Offizieller Bot | Jemand, der dir auf Telegram schreibt |
|---|---|---|---|
| Wer hält das XMR | 2-von-3-Multisig-Treuhand | Dieselbe Treuhand | Niemand: Du vertraust einem Fremden |
| Verlangt Vorauszahlung | Nein | Nein | Fast immer |
| Chat mit der anderen Partei | Verschlüsselt, in der Order | Derselbe, in der Order | Privat, ohne Aufzeichnung |
| Wenn etwas schiefgeht | Einspruch beim Support | Einspruch beim Support | Niemand, bei dem du dich beschweren kannst |

**Der Bot ist kein Chat mit dem Verkäufer.** Er öffnet nur die Plattform und benachrichtigt dich. Daher gilt weiter die übliche Regel: **Schließ nie ein Geschäft über Telegram-Direktnachrichten ab**. Wenn dir jemand schreibt, um XMR anzubieten, eine Zahlung außerhalb einer Order zu verlangen oder dir mit deinem Konto zu «helfen», ist es Betrug.

So erkennst du den offiziellen Bot:

- Der Benutzername ist genau **@MoneroP2PFiatBot**. Vorsicht bei ähnlichen Namen.
- Er fragt **nie** nach deiner Seed, deinem Passwort, deiner Backup-Datei oder einer Zahlung.
- Er schreibt dir **nie** zuerst, um ein Geschäft anzubieten.

Mehr Regeln unter [Sicherheit und häufige Betrugsmaschen](https://fiat.monerop2p.app/de/safety/).

## Was kann Telegram sehen?

Telegram ist keine private App wie Monero, deshalb ist der Bot so gebaut, dass Telegram so wenig wie möglich erfährt:

- **Benachrichtigungen enthalten keine Beträge, Adressen oder Zahlungsdaten.** Sie sagen nur, dass sich etwas geändert hat, und enthalten eine Schaltfläche zum Öffnen der Order.
- **Schlüssel verlassen nie dein Gerät.** Dein Konto und die Treuhand werden auf deinem Handy signiert; der Bot sieht sie nie.
- **Keine Telegram-Skripte.** Die Apps laden keinen Code von telegram.org und entfernen aus der URL die Daten, die Telegram beim Öffnen anhängt.
- **Was Telegram weiß:** dass du den Bot nutzt und wann du Benachrichtigungen bekommst. Wenn dir das wichtig ist, nutze die Webseite und schalte Browser-Benachrichtigungen ein.

Die Details stehen in der [Datenschutzerklärung](/de/privacy/).

## Was er nicht tut

- **Er hält weder Geld noch Schlüssel** und kann kein XMR bewegen.
- **Er ersetzt nicht die Regeln des Marktes:** Die Fiat-Zahlung läuft weiterhin außerhalb der Plattform, und die Treuhand schützt das XMR, nicht die Überweisung.
- **Er spricht nicht jede Sprache:** Der Bot antwortet auf Englisch und Spanisch.
- **Er garantiert keine Anzeigen in deiner Währung.** Der Markt ist jung; genau dafür gibt es die Alarme, die dir sagen, wenn eine erscheint.

Was sich an der Plattform überprüfen lässt und wo ihre Grenzen liegen: [Ist MoneroP2P seriös?](/de/is-monerop2p-legit/)

## Loslegen

[@MoneroP2PFiatBot öffnen →](https://t.me/MoneroP2PFiatBot) · [Markt im Web ansehen →](https://fiat.monerop2p.app/de/app/) · [Krypto in XMR tauschen →](/de/app/)

Kommst du von LocalMonero? Lies [LocalMonero-Alternativen 2026](/de/news/localmonero-alternatives-2026/).
