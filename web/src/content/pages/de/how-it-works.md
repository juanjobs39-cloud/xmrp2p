---
key: how
lang: de
title: So funktioniert ein Swap von USDT zu Monero auf MoneroP2P
description: "Ein Atomic Swap tauscht deine USDT ohne Mittelsmann gegen XMR: Ein Vertrag hält die USDT und gibt sie erst frei, wenn du das XMR nehmen kannst. Einfach erklärt."
updated: 2026-10-24
---

**Kurz gesagt:** Deine USDT liegen in einem Smart Contract, der den Verkäufer nur bezahlen kann, wenn dieser ein Geheimnis preisgibt. Genau dieses Geheimnis ist die Hälfte, die dir fehlt, um die Monero-Adresse zu öffnen, an der der Verkäufer das XMR hinterlegt hat. Deshalb ist der Swap „atomar“: Entweder werden beide Seiten erfüllt oder keine. Wenn etwas schiefgeht, erstattet der Vertrag deine USDT zurück.

## Für Einsteiger

Stell dir einen Tresor mit zwei Schlössern vor:

1. **Du und der Verkäufer (der „Maker“) erstellen gemeinsam eine Monero-Adresse**, und jeder hat nur die Hälfte ihres Schlüssels. Niemand kann bewegen, was dort liegt, ohne beide Hälften.
2. **Du zahlst die USDT in einen Vertrag ein.** Der Vertrag kann die Schlüsselhälfte des Makers prüfen, kennt sie aber nicht.
3. **Der Maker zahlt das XMR** an die gemeinsame Adresse ein. Die App prüft, dass der richtige Betrag angekommen ist.
4. **Du bestätigst** im Vertrag, dass alles stimmt.
5. **Der Maker löst die USDT ein**, und dafür muss er dem Vertrag seine Schlüsselhälfte übergeben, die dadurch on-chain veröffentlicht wird.
6. **Die App nimmt diese Schlüsselhälfte**, kombiniert sie mit deiner und sendet das XMR an deine Adresse.

Wenn der Maker das XMR nie einzahlt, bestätigst du nicht und bekommst deine USDT per Rückerstattung zurück.

## Was du brauchst

| Du brauchst | Wofür |
|---|---|
| Eine Browser-Wallet (MetaMask oder kompatibel) mit USDT | Einzahlung in den Vertrag |
| Etwas vom Coin des Netzwerks (z. B. ETH auf Arbitrum) | Gas bezahlen |
| Eine Monero-Adresse | Das XMR empfangen ([Wallet erstellen](/de/guides/how-to-create-a-monero-wallet/)) |
| Eine passwortgeschützte Wiederherstellungsdatei | Fortsetzen, falls du den Tab schließt |

## Die zwei Fristen (t0 und t1)

| Zeitpunkt | Was du tun kannst | Was der Maker tun kann |
|---|---|---|
| Vor **t0**, noch nicht bestätigt | Bestätigen oder zurückholen | Nichts |
| Nach deiner Bestätigung oder zwischen **t0** und **t1** | Warten | Einlösen (und dabei sein Geheimnis preisgeben) |
| Ab **t1** | Zurückholen | Nichts |

**Wichtig:** Wenn du vor t0 weder bestätigst noch zurückholst, lässt der Vertrag den Maker einlösen, auch wenn er das XMR nie eingezahlt hat. Deshalb fordert dich die App automatisch zur Rückerstattung auf, wenn das XMR kurz vor t0 nicht geprüft ist, und deshalb musst du die Wiederherstellungsdatei aufbewahren.

## Technische Erklärung

- **Schlüsselhälften.** Jede Seite wählt einen 252-Bit-Skalar `s`. Der Spend-Key der gemeinsamen Adresse ist `S_taker + S_maker` (ed25519); der View-Key ist `v_taker + v_maker`.
- **DLEQ-Beweis.** Jede Seite beweist, ohne ihn preiszugeben, dass hinter ihrem ed25519-Schlüssel (Monero) und einem secp256k1-Schlüssel, den der Vertrag prüft, dasselbe `s` steckt. Wir nutzen die Konstruktion `sigma_fun`, dieselbe wie eigenwallet.
- **Vertrag.** Ein Treuhandkonto pro Swap (EIP-1167-Klon) speichert `keccak(s_maker·G)` und `keccak(s_taker·G)`. `claim(s_maker)` und `refund(s_taker)` prüfen das Geheimnis mit einem `ecrecover`-Trick. Ihre Zeitfenster überschneiden sich nie.
- **Prüfung des XMR.** Der Maker sendet die Transaktions-ID und den Transaktionsschlüssel; die App prüft die Zahlung mit `check_tx_key`, ohne eine ganze Wallet zu synchronisieren.
- **Sweep.** Sobald das Geheimnis des Makers im Event `Claimed` erscheint, berechnet die App `s_taker + s_maker` und sendet das XMR an deine Adresse.

Das vollständige Design steht im [Architekturdokument](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) (auf Spanisch) und baut auf dem Protokoll von AthanorLabs auf.
