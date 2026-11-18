---
key: wallet-launch
lang: de
slug: monerop2p-wallet-monero-browser-extension
title: "MoneroP2P Wallet: eine Monero-Browser-Erweiterung für Chrome und Firefox"
description: "MoneroP2P Wallet ist da: eine Monero-Wallet ohne Verwahrung für deinen Browser, mit XMR sowie USDT und ETH auf Arbitrum aus einer Seed und Swaps ohne MetaMask."
published: 2026-11-05
keywords:
  - Monero Browser-Erweiterung
  - Monero Wallet Chrome Erweiterung
  - XMR Wallet für Firefox
  - Monero Wallet ohne Verwahrung
  - Monero und USDT Wallet
  - MetaMask für Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/de/wallet/
    description: "Quelloffene (AGPL-3.0) Browser-Erweiterung ohne Verwahrung für Monero (XMR) und USDT/ETH auf Arbitrum One."
howto:
  name: "So startest du mit MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Installiere die Erweiterung"
      text: "Geh auf monerop2p.app/de/wallet und wähle den Store deines Browsers: Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons oder Edge Add-ons."
    - name: "Erstelle deine Wallet"
      text: "Öffne die Erweiterung, wähle «Wallet erstellen» und setze ein langes, einzigartiges Passwort. Damit wird die Wallet auf deinem Gerät verschlüsselt."
    - name: "Schreib die Seed auf Papier"
      text: "Notiere die Seed mit 25 Wörtern auf Papier und bewahre sie sicher auf. Sie ist der einzige Weg, dein XMR und dein Arbitrum-Konto wiederherzustellen."
    - name: "Empfange XMR"
      text: "Unter «Empfangen» gibt dir die Wallet für jede Zahlung eine neue Subadresse mit QR-Code."
    - name: "Kauf XMR über Entdecken"
      text: "Öffne unter «Entdecken» die USDT-zu-XMR-Börse oder P2P Fiat. Die Wallet verbindet sich von selbst und trägt deine Monero-Adresse ein."
faq:
  - q: "Was ist MoneroP2P Wallet?"
    a: "Eine Monero-Wallet (XMR) ohne Verwahrung, gebaut als Erweiterung für Chrome, Brave, Edge, Opera und Firefox. Dieselbe Seed gibt dir ein Monero-Konto und ein Arbitrum-One-Konto für USDT und ETH. Sie ist kostenlos und quelloffen (AGPL-3.0). Offizielle Seite: https://monerop2p.app/de/wallet/"
  - q: "Gibt es eine Monero-Erweiterung für Chrome?"
    a: "Ja. MoneroP2P Wallet läuft auf Chrome und anderen Chromium-Browsern (Brave, Edge, Opera) sowie auf Firefox. Sie führt wallet2, die offizielle Monero-Wallet, als WebAssembly im Browser aus."
  - q: "Ist eine Monero-Wallet im Browser sicher?"
    a: "Die Schlüssel werden mit Argon2id und XChaCha20-Poly1305 verschlüsselt gespeichert, die Wallet sperrt sich nach 15 Minuten selbst, und die Erweiterung lädt keinen Code von außen und hat keine Analytik. Bewahre deine Seed auf Papier auf: Sie ist der einzige Weg, dein Geld wiederherzustellen."
  - q: "Was kostet sie?"
    a: "Die Erweiterung ist kostenlos. Jeder XMR-Versand im Mainnet zahlt die Gebühr des Monero-Netzwerks plus eine MoneroP2P-Gebühr von 0,25 %, die vor dem Bestätigen in einer eigenen Zeile angezeigt wird. Empfangen, Senden an eigene Adressen und Arbitrum-Sendungen zahlen keine MoneroP2P-Gebühr."
  - q: "Kann ich meine Seed in anderen Wallets nutzen?"
    a: "Ja. Sie nutzt die Standard-Seed von Monero mit 25 Wörtern, kompatibel mit Cake Wallet, Feather und der offiziellen Wallet. Das Arbitrum-Konto nutzt eine eigene Ableitung; um es anderswo zu nutzen, exportiere seinen privaten Schlüssel in den Einstellungen."
  - q: "Ersetzt sie MetaMask auf MoneroP2P?"
    a: "Ja, auf monerop2p.app und fiat.monerop2p.app. Die Wallet meldet sich der Seite über EIP-6963, und jede Verbindung, Signatur oder Überweisung fragt in einem Fenster der Erweiterung nach deiner Zustimmung. Mit anderen Seiten verbindet sie sich nicht."
---

**Kurz gesagt:** Am **5. November 2026** haben wir **MoneroP2P Wallet 0.2.0** veröffentlicht, eine **Monero-Wallet ohne Verwahrung für deinen Browser**, die auf Chrome, Brave, Edge, Opera und Firefox läuft. Eine Seed mit 25 Wörtern verwaltet dein **XMR** und ein **Arbitrum-One-Konto mit USDT und ETH**, sodass du auf MoneroP2P USDT gegen Monero tauschen kannst, **ohne MetaMask** und ohne Adressen hin und her zu kopieren. Sie ist kostenlos und quelloffen.

[MoneroP2P Wallet ansehen →](/de/wallet/)

## Warum eine Monero-Wallet im Browser

Bisher brauchte man für Monero eine Desktop-App (Feather oder die offizielle Wallet) oder eine Handy-App (Cake Wallet). Webseiten sprechen mit MetaMask, aber MetaMask unterstützt Monero nicht. USDT auf einer Webseite gegen XMR zu tauschen bedeutete **zwei Wallets** und Adressen zwischen ihnen zu kopieren.

MoneroP2P Wallet vereint beides in einer Erweiterung: Dein Monero und dein Arbitrum-Konto liegen am selben Ort, und die Seiten von MoneroP2P nutzen sie direkt.

## Was sie kann

- **Vollständige Monero-Wallet:** Erstellen oder Wiederherstellen mit der Standard-Seed mit 25 Wörtern, Kontostand, Verlauf mit Bestätigungen und Sendungen, die vor dem Senden die genaue Gebühr zeigen.
- **Eine neue Subadresse für jede Zahlung**, mit QR-Code, damit niemand deine Zahlungen verknüpfen kann.
- **USDT und ETH auf Arbitrum One:** Dieselbe Seed erstellt dein Arbitrum-Konto, mit Kontostand, Empfangen per QR und Senden mit geschätzter Netzwerkgebühr.
- **Entdecken:** Ein Klick öffnet die [USDT-zu-XMR-Börse](/de/app/) oder [P2P Fiat](https://fiat.monerop2p.app/de/), wo du XMR mit deiner lokalen Währung kaufst.
- **Verbindung mit den Seiten:** Auf monerop2p.app und fiat.monerop2p.app trägt die Wallet deine Monero-Adresse ein und signiert die Einzahlung des Swaps. Jeder Schritt fragt in einem Fenster der Erweiterung nach deiner Zustimmung.
- **Dein eigener Node:** Ersetze den Node von MoneroP2P in den Einstellungen durch deinen.

## Wie sie dein Geld schützt

| Schicht | Was sie tut |
|---|---|
| Ohne Verwahrung | Die Seed wird auf deinem Gerät erstellt und bleibt dort. Keine Konten, Schlüssel-Server oder Analytik. |
| Verschlüsselter Tresor | Argon2id (64 MiB) macht aus deinem Passwort einen Schlüssel, und XChaCha20-Poly1305 verschlüsselt die Wallet. |
| Automatische Sperre | Nach 15 Minuten Inaktivität (einstellbar) und beim Schließen des Browsers. |
| Kein Code von außen | Der gesamte Code steckt in der Erweiterung, mit einer strengen Content Security Policy. |
| Nur zwei Seiten | Die Erweiterung spricht nur mit monerop2p.app und fiat.monerop2p.app, und nur mit deiner Zustimmung. |
| Verständliche Freigaben | Vor dem Signieren siehst du in klaren Worten, was die Transaktion tut: Überweisung, Ausgabe-Freigabe oder Einzahlung eines Swaps. |
| Schutz vor Address Poisoning | Warnt dich, wenn du eine Adresse einfügst, die einer benutzten ähnelt, es aber nicht ist. |
| Überprüfbar | Quelloffen (AGPL-3.0) und ein reproduzierbares Paket mit seinem SHA-256. |

**Bewahre deine Seed auf Papier auf.** Sie ist der einzige Weg, dein Geld wiederherzustellen, wenn du dein Gerät verlierst oder wechselst.

## Vergleich mit anderen Monero-Wallets

| | MoneroP2P Wallet | Feather | Cake Wallet | Offizielle GUI |
|---|---|---|---|---|
| Läuft auf | Browser (Erweiterung) | Desktop | Handy und Desktop | Desktop |
| Seed mit 25 Wörtern | Ja | Ja | Ja | Ja |
| USDT auf Arbitrum | Ja | Nein | Andere Netzwerke | Nein |
| Verbindet sich mit Webseiten | Ja (nur MoneroP2P) | Nein | Nein | Nein |
| Quelloffen | Ja | Ja | Ja | Ja |

Für große langfristige Ersparnisse bleibt eine Desktop- oder Hardware-Wallet die beste Wahl. MoneroP2P Wallet ist dafür gemacht, **XMR im Alltag zu kaufen, zu empfangen und zu bewegen**, direkt aus dem Browser.

## Gebühren

- **Erweiterung:** kostenlos.
- **XMR-Sendungen im Mainnet:** Gebühr des Monero-Netzwerks plus eine MoneroP2P-Gebühr von **0,25 %**, vor dem Bestätigen in einer eigenen Zeile angezeigt. Beträge, deren Gebühr unter 0,00001 XMR läge, zahlen sie nicht.
- **Keine MoneroP2P-Gebühr:** Empfangen, Senden an eigene Adressen, Stagenet und Arbitrum-Sendungen (dort zahlst du nur das Netzwerk).

## So legst du los

1. Geh auf [monerop2p.app/de/wallet](/de/wallet/) und wähle den Store deines Browsers.
2. Erstelle die Wallet mit einem langen, einzigartigen Passwort.
3. **Schreib die Seed mit 25 Wörtern auf Papier.** Sie ist der einzige Weg, dein Geld wiederherzustellen.
4. Empfange XMR mit der Subadresse unter «Empfangen» oder kauf es über **Entdecken**.

Noch kein Monero? Sieh dir [alle Wege, XMR zu kaufen](/de/buy-monero/), an oder den Ratgeber [So erstellst du eine Monero-Wallet](/de/guides/how-to-create-a-monero-wallet/).

## FAQ

### Was ist MoneroP2P Wallet?
Eine Monero-Wallet ohne Verwahrung als Erweiterung für Chrome, Brave, Edge, Opera und Firefox, mit einem Arbitrum-One-Konto für USDT und ETH aus derselben Seed.

### Gibt es eine Monero-Erweiterung für Chrome?
Ja. MoneroP2P Wallet läuft auf Chrome und anderen Chromium-Browsern sowie auf Firefox. Sie führt wallet2, die offizielle Monero-Wallet, als WebAssembly aus.

### Ist eine Monero-Wallet im Browser sicher?
Die Schlüssel sind verschlüsselt, die Wallet sperrt sich selbst, und die Erweiterung lädt keinen Code von außen.

### Was kostet sie?
Sie ist kostenlos. XMR-Sendungen zahlen die Netzwerkgebühr plus 0,25 % an MoneroP2P, vor dem Bestätigen angezeigt.

### Kann ich meine Seed in anderen Wallets nutzen?
Ja, die Seed mit 25 Wörtern funktioniert mit Cake Wallet, Feather und der offiziellen Wallet. Der Arbitrum-Schlüssel lässt sich in den Einstellungen exportieren.

### Ersetzt sie MetaMask auf MoneroP2P?
Ja, auf monerop2p.app und fiat.monerop2p.app. Jede Verbindung oder Signatur fragt nach deiner Zustimmung.

Der Code liegt auf [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Krypto zu nutzen birgt Risiken: Lies den [Risikohinweis](/de/risk-notice/).

[MoneroP2P Wallet ansehen →](/de/wallet/)

Lieber nichts installieren? Jedes P2P-Fiat-Konto enthält jetzt eine Web-Wallet ohne Verwahrung: [Monero- und USDT-Wallet in deinem Konto](/de/news/non-custodial-monero-and-usdt-wallet-in-your-account/).
