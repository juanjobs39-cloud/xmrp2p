---
key: wallet
lang: de
title: "MoneroP2P Wallet: Monero-Wallet (XMR) ohne Verwahrung für deinen Browser"
description: "Kostenlose Erweiterung für Chrome, Brave, Edge und Firefox. Deine Monero-Schlüssel verlassen nie dein Gerät; kaufe XMR mit USDT oder lokaler Währung in der Wallet."
updated: 2026-11-05
keywords:
  - Monero Wallet
  - XMR Wallet
  - Monero Chrome Erweiterung
  - Monero Browser-Wallet
  - Monero Firefox Wallet
  - Monero Wallet ohne Verwahrung
faq:
  - q: "Speichert MoneroP2P Wallet meine Schlüssel auf einem Server?"
    a: "Nein. Seed und Schlüssel werden nur in deinem Browser erzeugt und verschlüsselt gespeichert. Es gibt keine Konten, keine Registrierung und keine Analysen. Der MoneroP2P-Node erhält nur Blockchain-Abfragen und bereits signierte Transaktionen."
  - q: "Was, wenn ich mein Gerät verliere oder die Erweiterung deinstalliere?"
    a: "Stelle die Wallet mit deinem 25-Wörter-Seed in MoneroP2P Wallet oder einer kompatiblen Monero-Wallet wieder her, etwa Cake Wallet, Feather oder der offiziellen Wallet."
  - q: "Ist sie mit anderen Monero-Wallets kompatibel?"
    a: "Ja. Sie nutzt den Standard-Seed von Monero mit 25 Wörtern, sodass du ihn in andere Wallets importieren kannst und umgekehrt."
  - q: "Kann ich meinen eigenen Node nutzen?"
    a: "Ja. In den Einstellungen kannst du die URL deines Nodes eingeben (https oder http://127.0.0.1 für einen lokalen)."
  - q: "Was kostet sie?"
    a: "Die Erweiterung ist kostenlos und Open Source (AGPL-3.0). Jede XMR-Überweisung zahlt die Gebühr des Monero-Netzwerks plus 0,25 % MoneroP2P-Gebühr, die vor der Bestätigung separat angezeigt wird. Empfangen und Senden an eigene Adressen kostet keine MoneroP2P-Gebühr."
---

**MoneroP2P Wallet** ist eine Monero-Wallet (XMR), die als Browser-Erweiterung läuft. Deine Schlüssel werden auf deinem Gerät erzeugt und bleiben dort, verschlüsselt mit deinem Passwort. Aus derselben Wallet kannst du XMR mit USDT oder mit deiner lokalen Währung über die Dienste von MoneroP2P kaufen.

## Was du tun kannst

- **Erstellen oder wiederherstellen** einer Wallet mit dem Standard-Seed von Monero mit 25 Wörtern.
- **Empfangen** mit einer neuen Subadresse für jede Zahlung, mit QR-Code, damit niemand deine Zahlungen verknüpfen kann.
- **Senden** mit der genauen Gebühr vor der Bestätigung und einer klaren Zusammenfassung des Ziels.
- **Entdecken:** Öffne die [Börse USDT zu XMR](/de/app/) (mit bereits eingetragener Adresse) und [P2P Fiat](https://fiat.monerop2p.app/de/app/) mit einem Klick, um per Überweisung, bar oder mit anderen lokalen Methoden zu kaufen.
- **USDT und ETH auf Arbitrum:** Aus demselben Seed entsteht ein Arbitrum-One-Konto. Auf monerop2p.app und P2P Fiat verbindet sich die Wallet von selbst (ohne MetaMask) und trägt deine Monero-Adresse ein; jede Signatur oder Überweisung fragt in einem Fenster der Erweiterung nach deiner Zustimmung.

## Wie sie dich schützt

| Schutz | Was er tut |
|---|---|
| Ohne Verwahrung | Der Seed verlässt nie dein Gerät; niemand sonst kann dein XMR bewegen. |
| Starke Verschlüsselung | Dein Passwort wird mit Argon2id (64 MiB) zu einem Schlüssel, und die Wallet wird mit XChaCha20-Poly1305 verschlüsselt. |
| Automatische Sperre | Sie sperrt sich nach 15 Minuten Inaktivität (einstellbar) und beim Schließen des Browsers. |
| Kein Remote-Code | Der gesamte Code steckt in der Erweiterung, mit strenger Sicherheitsrichtlinie (CSP). |
| Anti-Poisoning | Sie warnt dich, wenn du eine Adresse einfügst, die einer früher genutzten ähnelt, aber nicht dieselbe ist. |
| Überprüfbar | Das Paket wird reproduzierbar gebaut: Jeder kann prüfen, dass es dem Quellcode entspricht. |

## Bevor du anfängst

1. Schreib den Seed **auf Papier** und bewahre ihn sicher auf: Er ist der einzige Weg, dein Geld wiederherzustellen.
2. Nutze ein langes, einmaliges Passwort für die Erweiterung.
3. Probier es zuerst mit einem kleinen Betrag.

Noch kein XMR? Sieh dir [alle Wege, Monero zu kaufen](/de/buy-monero/) an.
