---
key: swap-usdt-xmr
lang: de
slug: how-to-swap-usdt-for-monero-without-intermediaries
title: USDT ohne Mittelsmann gegen Monero tauschen
description: "Schritt für Schritt: USDT per Atomic Swap aus deinem Browser in XMR tauschen, ohne Konto und ohne dass jemand deine Mittel verwahrt."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: USDT per Atomic Swap gegen Monero tauschen
  totalTime: PT1H
  steps:
    - name: Bereite deine Monero-Wallet vor
      text: Erstelle eine Monero-Wallet und kopiere deine Empfangsadresse. Im Übungsmodus muss es eine Stagenet-Adresse sein.
    - name: Öffne die App und wähle ein Angebot
      text: Wähle das Angebot eines Makers, gib den USDT-Betrag und deine Monero-Adresse ein.
    - name: Lege ein Passwort fest und lade die Wiederherstellungsdatei herunter
      text: Wähle ein Passwort mit mindestens 10 Zeichen und lade die verschlüsselte Datei herunter. Sie ist vor der Einzahlung Pflicht.
    - name: Zahle die USDT ein
      text: Verbinde deine Wallet (MetaMask oder kompatibel) und signiere die Einzahlung in den Vertrag.
    - name: Warte und bestätige
      text: Die App prüft das XMR, das der Maker sperrt. Nach der Prüfung bestätigst du mit setReady.
    - name: Erhalte das XMR
      text: Wenn der Maker kassiert, kombiniert die App beide Schlüsselhälften und sendet das XMR an deine Adresse.
---

**Kurz gesagt:** Öffne die App, wähle ein Angebot, gib deine Monero-Adresse ein, lade deine Wiederherstellungsdatei herunter, zahle die USDT aus deiner Wallet ein und warte. Die App prüft das XMR, bittet dich um Bestätigung und sendet das XMR schließlich an deine Adresse. Wenn etwas schiefgeht, fordert sie dich auf, dir die USDT erstatten zu lassen. Der ganze Ablauf dauert meist 30 bis 60 Minuten.

> MoneroP2P läuft mit echtem Geld auf **Arbitrum One + Monero** (maximal 100 USDT pro Swap) und hat einen Übungsmodus im **Testnet** (Arbitrum Sepolia und Monero-Stagenet). Die Schritte sind in beiden gleich.

## Bevor du anfängst

| Du brauchst | Woher |
|---|---|
| Eine Browser-Wallet mit USDT | MetaMask oder eine EVM-kompatible Wallet |
| Etwas ETH im selben Netzwerk | Für das Gas von 2 oder 3 Transaktionen |
| Eine Monero-Adresse | [So erstellst du eine Monero-Wallet](/de/guides/how-to-create-a-monero-wallet/) |
| 30 bis 60 Minuten mit offenem Tab | Oder deine Wiederherstellungsdatei, um später zurückzukommen |

## Schritt für Schritt

### Schritt 1: Wähle ein Angebot

Die App zeigt die Angebote der Maker: Preis in USDT pro XMR sowie Mindest- und Höchstbetrag. Jeder Maker legt seinen Preis selbst fest, und er ändert sich mit dem Markt; die App zeigt den genauen XMR-Betrag, bevor du einzahlst.

### Schritt 2: Gib deine Adresse und ein Passwort ein

- **Monero-Adresse:** Hierhin bekommst du das XMR. Prüfe sie doppelt; Überweisungen sind unumkehrbar.
- **Passwort:** schützt deine Wiederherstellungsdatei. Vergisst du es, kann niemand es wiederherstellen.

### Schritt 3: Lade die Wiederherstellungsdatei herunter

Ohne sie lässt dich die App nicht einzahlen. Sie enthält deine Schlüsselhälfte, verschlüsselt. Mit ihr kannst du den Swap in jedem Browser fortsetzen ([was tun, wenn du den Tab geschlossen hast](/de/guides/what-to-do-if-you-closed-the-tab/)).

### Schritt 4: Zahle die USDT ein

Verbinde deine Wallet. Wenn der Token es unterstützt, signierst du eine Autorisierung und zahlst in einer einzigen Transaktion ein; sonst gibst du den Betrag zuerst frei. Die USDT gehen in einen Vertrag, der sie nur nach den Swap-Regeln freigibt.

### Schritt 5: Warte auf die Prüfung und bestätige

Der Maker sperrt das XMR auf einer gemeinsamen Adresse und sendet einen Zahlungsnachweis. Die App prüft den Betrag und die Bestätigungen im Monero-Netzwerk. Wenn alles passt, erscheint der Button **Bestätigen**. Sobald du bestätigst, kann der Maker kassieren.

Wenn das XMR nicht ankommt oder der Betrag niedriger ist, fordert dich die App auf, dir vor der Frist t0 **erstatten zu lassen**. Tu das: Nach dieser Frist kannst du dir erst ab der letzten Frist erstatten lassen.

### Schritt 6: Erhalte dein XMR

Wenn der Maker die USDT kassiert, legt er seine Schlüsselhälfte offen. Die App kombiniert sie mit deiner und sendet das XMR an deine Adresse. Deine Wallet zeigt es nach ein paar Bestätigungen.

## Kosten

- **Plattformgebühr:** ein Prozentsatz der USDT, den der Vertrag beim Abschluss des Swaps erhebt, höchstens 1 %.
- **Gas** im USDT-Netzwerk für Einzahlung und Bestätigung (und Rückerstattung, falls nötig).
- **Monero-Netzwerkgebühr** beim Senden des XMR an deine Adresse.
- **Marge des Makers**, bereits in seinem Preis enthalten.

Netzwerkgebühren ändern sich mit der Auslastung; prüfe sie vor dem Signieren in deiner Wallet.

## Wenn etwas schiefgeht

| Problem | Was tun |
|---|---|
| Der Maker hat nicht geantwortet | Du hast nichts eingezahlt: Wähle ein anderes Angebot |
| Du hast den Tab geschlossen | Öffne die App wieder und nutze deine Wiederherstellungsdatei |
| Das XMR kommt nicht an | Warte; wenn t0 naht, fordert dich die App zur Rückerstattung auf |
| Dir ist das Gas ausgegangen | Besorg dir etwas ETH im Netzwerk und versuch es erneut |

Lies vor der Nutzung des Dienstes den [Risikohinweis](/de/risk-notice/).
