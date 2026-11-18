---
key: monero-wallet
lang: de
slug: how-to-create-a-monero-wallet
title: So erstellst du eine Monero-Wallet
description: "Monero-Wallets für Handy und Desktop, wie du eine erstellst, den Seed sicher aufbewahrst und deine Adresse bekommst. Inklusive Stagenet zum Testen."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Eine Monero-Wallet erstellen
  steps:
    - name: Wähle eine Wallet
      text: Lade eine Wallet von ihrer offiziellen Website oder aus der Liste auf getmonero.org herunter.
    - name: Erstelle eine neue Wallet
      text: Wähle, eine neue Wallet zu erstellen, und lege ein lokales Passwort fest.
    - name: Sichere die Seed-Phrase
      text: Schreib die Seed-Phrase der Reihe nach auf Papier und bewahre sie sicher und offline auf.
    - name: Kopiere deine Adresse
      text: Kopiere im Bereich Empfangen deine Adresse. Zum Ausprobieren von MoneroP2P nutze eine Stagenet-Wallet.
---

**Kurz gesagt:** Lade eine Monero-Wallet von ihrer offiziellen Website herunter, erstelle eine neue Wallet, schreib die Seed-Phrase auf Papier und kopiere deine Adresse unter „Empfangen“. Für den Übungsmodus von MoneroP2P brauchst du eine **Stagenet**-Wallet (das Testnetz von Monero), die manche Desktop-Wallets anbieten.

## Bekannte Optionen

| Wallet | Plattform | Hinweise |
|---|---|---|
| Monero GUI und CLI (offiziell) | Windows, macOS, Linux | Vom Monero-Projekt; unterstützen Stagenet |
| Feather Wallet | Windows, macOS, Linux | Leichte Desktop-Wallet; unterstützt Stagenet |
| Cake Wallet | Android, iOS, Desktop | Beliebt auf dem Handy |
| Andere | Verschiedene | Prüfe die aktuelle Liste auf getmonero.org |

> Lade immer von der offiziellen Website der jeweiligen Wallet herunter und prüfe Signaturen, wenn das Projekt sie veröffentlicht. Vorsicht vor Nachahmer-Apps in App-Stores.

## Schritt für Schritt

1. **Installiere die Wallet** von ihrer offiziellen Website.
2. **Erstelle eine neue Wallet.** Sie fragt nach einem Passwort: Es schützt die Datei auf diesem Gerät, es ist nicht dein Seed.
3. **Sichere die Seed-Phrase.** Sie ist eine Liste von Wörtern (25 im klassischen Format, 16 im Polyseed-Format, das manche Wallets nutzen). Schreib sie der Reihe nach auf Papier. Wer sie hat, kontrolliert deine Mittel.
4. **Notiere die Restore Height**, wenn die Wallet sie anzeigt: Sie beschleunigt die Wiederherstellung.
5. **Kopiere deine Adresse** unter „Empfangen“. Hauptadressen von Monero im echten Netzwerk beginnen mit `4`, Subadressen mit `8`. Im Stagenet beginnen sie mit `5` oder `7`.

## Um MoneroP2P auszuprobieren (Stagenet)

- Wähle in Monero GUI oder Feather beim Erstellen der Wallet **Stagenet** (in den Einstellungen oder beim Start).
- Stagenet-XMR hat keinen Wert; du bekommst es von Stagenet-Faucets.
- Im Übungsmodus akzeptiert die MoneroP2P-App nur Stagenet-Adressen.

## Gute Gewohnheiten

- Teile deinen Seed nie, auch nicht mit dem Support.
- Nutze für jeden Swap eine neue Adresse oder Subadresse, wenn du mehr Privatsphäre willst.
- Wenn du XMR empfängst, verlangt das Netzwerk etwa 10 Bestätigungen (etwa 20 Minuten), bevor du es ausgeben kannst.

Weiter: [Was ist Monero und wie unterscheidet es sich von Bitcoin](/de/guides/what-is-monero/).
