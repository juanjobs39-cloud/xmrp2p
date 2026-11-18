---
key: security
lang: de
title: Sicherheit von MoneroP2P
description: "Warum niemand deine Mittel verwahrt, wie Rückerstattungen funktionieren, welche Risiken es gibt und wie du den Code prüfst. Verifiziert mit Halmos, Aderyn und Slither."
updated: 2026-10-27
---

**Kurz gesagt:** Auf MoneroP2P verwahrt niemand Mittel. Deine USDT liegen in einem Vertrag, der Geld nur nach öffentlichen Regeln freigibt, und das XMR liegt auf einer Adresse, die niemand ohne beide Schlüsselhälften bewegen kann. Es läuft mit echtem Geld auf Arbitrum One + Monero, mit einem **vom Vertrag erzwungenen Maximum von 100 USDT pro Swap**. Der Vertrag ist mit Halmos, Aderyn und Slither geprüft und sein Quellcode auf Sourcify veröffentlicht; ein externes Audit gab es noch nicht, deshalb ist jeder Swap begrenzt.

## Warum niemand deine Mittel verwahrt

- **Die USDT** liegen in einem Vertrag nur für deinen Swap. Er hat keine Admin-Funktionen: Weder wir noch der Maker können sie herausholen, außer über `claim` und `refund`.
- **Das XMR** liegt auf einer gemeinsamen Adresse. Der Maker kann es ohne deine Schlüsselhälfte nicht zurückholen, und du kannst es ohne seine nicht nehmen.
- **Deine Schlüssel** werden in deinem Browser erzeugt und nie an unsere Server gesendet. Das Backend lehnt jede Nachricht ab, die einen vollständigen privaten Schlüssel enthält.

## Wie Rückerstattungen funktionieren

| Situation | Was passiert |
|---|---|
| Der Maker zahlt das XMR nicht ein | Du lässt dir vor t0 erstatten (die App fordert dich dazu auf) |
| Der Maker zahlt weniger XMR ein | Du bestätigst nicht und lässt dir vor t0 erstatten |
| Du hast bestätigt und der Maker kassiert nicht | Du lässt dir ab t1 erstatten |
| Du hast den Tab geschlossen | Komm mit deiner [Wiederherstellungsdatei](/de/guides/what-to-do-if-you-closed-the-tab/) zurück |

## Risiken, die du kennen solltest

1. **Fristen.** Wenn du dir nicht rechtzeitig erstatten lässt, obwohl das XMR nicht ankam, kannst du die USDT verlieren. Die App warnt dich, aber sie muss offen sein oder du musst mit der Datei zurückkommen.
2. **Wiederherstellungsdatei.** Ohne sie und ihr Passwort kannst du weder das XMR beanspruchen noch dir erstatten lassen. Wir können sie nicht für dich wiederherstellen.
3. **USDT-Sperren.** Tether kann Adressen sperren. Jeder Swap nutzt einen eigenen Vertrag, aber das Risiko besteht.
4. **Noch kein externes Audit.** Der Vertrag hat automatische Prüfungen bestanden (Halmos, Aderyn, Slither), aber Software kann trotzdem Fehler haben. Die Grenze von 100 USDT pro Swap begrenzt, was ein einzelner Swap riskieren kann.
5. **Privatsphäre.** Der Monero-Node-Proxy sieht, was dein Browser abfragt. Du kannst deinen eigenen Node nutzen.

## Wie wir die App schützen

- Strenge **Content Security Policy**: Die App führt nur ihren eigenen Code aus.
- **Subresource Integrity** für Skripte und Styles, und die Integrität des Krypto-Kerns wird vor der Nutzung geprüft.
- **Keine Skripte von Dritten**, keine Analysen, keine Cookies.
- **Überprüfbare Builds:** Wir veröffentlichen `SHA256SUMS` für jede Datei und eine Kopie auf IPFS.

## Audits

Der Vertrag wurde mit freien, offenen Werkzeugen geprüft: **Halmos** (symbolische Verifikation, 7/7 Eigenschaften für alle Eingaben bewiesen), **Aderyn** (0 hohe Befunde) und **Slither** (keine mittleren oder hohen Befunde). Sein Quellcode ist auf **Sourcify** verifiziert (exact match). Bericht: [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). Ein externes Audit steht noch aus; der vorbereitete Umfang steht in [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md).

## Quellcode und Meldungen

Open Source (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). Um eine Sicherheitslücke zu melden, nutze die private Meldefunktion von GitHub, wie in `SECURITY.md` beschrieben.
