---
key: closed-tab
lang: de
slug: what-to-do-if-you-closed-the-tab
title: Was tun, wenn du den Tab mitten im Swap geschlossen hast
description: "So setzt du einen MoneroP2P-Swap mit deiner Wiederherstellungsdatei fort, was mit den Fristen t0 und t1 passiert und wann du dir erstatten lassen musst."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Einen Swap mit der Wiederherstellungsdatei fortsetzen
  totalTime: PT5M
  steps:
    - name: Öffne die App
      text: Öffne die MoneroP2P-App in einem beliebigen Browser, am besten auf demselben Gerät.
    - name: Wähle Fortsetzen
      text: Klicke auf „Fortsetzen“ und lade deine Wiederherstellungsdatei hoch (oder nutze die Kopie in diesem Browser, wenn du sie hier gespeichert hast).
    - name: Gib dein Passwort ein
      text: Tippe das Passwort ein, mit dem du die Datei verschlüsselt hast.
    - name: Folge der Aktion, die die App zeigt
      text: Die App liest den Vertragsstatus und sagt dir, ob du bestätigen, warten, dir erstatten lassen oder das XMR empfangen sollst.
---

**Kurz gesagt:** Öffne die App wieder, klicke auf „Fortsetzen“, lade deine Wiederherstellungsdatei hoch und gib dein Passwort ein. Die App liest den Vertrag und sagt dir, was zu tun ist. **Mach es so bald wie möglich:** Wenn das XMR nicht verifiziert wurde und die Frist t0 naht, musst du dir rechtzeitig erstatten lassen.

## Was passiert, während der Tab geschlossen ist

Nichts geht sofort verloren, aber die Uhr des Vertrags läuft weiter:

| Zeitpunkt | Was passieren kann | Was du bei der Rückkehr tust |
|---|---|---|
| Vor t0 | Der Maker hat das XMR vielleicht gesperrt | Die App prüft es; du bestätigst oder lässt dir erstatten |
| Zwischen t0 und t1 | Der Maker kann kassieren (wenn er das XMR gesperrt hat) | Wenn er kassiert hat, sendet dir die App das XMR |
| Nach t1 | Wenn der Maker nicht kassiert hat | Du lässt dir deine USDT erstatten |

**Das Risiko:** Wenn du nicht vor t0 zurückkommst und der Maker das XMR *nicht* gesperrt hat, lässt ihn der Vertrag trotzdem zwischen t0 und t1 kassieren. Deshalb ist es wichtig, bald zurückzukommen oder den Tab gar nicht zu schließen.

## Wenn der Maker schon kassiert hat

Beim Kassieren hat der Maker seine Schlüsselhälfte on-chain offengelegt. Mit deiner Wiederherstellungsdatei setzt die App den vollständigen Schlüssel zusammen und sendet das XMR an deine Adresse, auch Tage später. Dafür gibt es keine Frist.

## Wenn du die Datei verloren hast

- Wenn du **denselben Browser** nutzt und seine Daten nicht gelöscht hast, hat die App eine verschlüsselte Kopie behalten: Klicke auf „Fortsetzen“ und gib dein Passwort ein, ohne eine Datei hochzuladen.
- Wenn du die Datei **und** den Browser verloren hast, gibt es keinen Weg, deine Schlüsselhälfte wiederherzustellen. Wir haben sie nicht.

## Tipps

- Bewahre die Datei an zwei Orten auf (zum Beispiel auf deinem Computer und einem USB-Stick).
- Nutze ein Passwort, das du dir merken kannst.
- Wenn möglich, lass den Tab offen, bis der Swap abgeschlossen ist.

Weiter: [USDT ohne Mittelsmann gegen Monero tauschen](/de/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
