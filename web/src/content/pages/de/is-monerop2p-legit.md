---
key: trust
lang: de
title: "Ist MoneroP2P seriös und sicher? So prüfst du es selbst"
description: "Was du selbst prüfen kannst, bevor du MoneroP2P vertraust: Vertrag, Code, Gebühren und Limits. Und was noch fehlt, etwa ein externes Audit."
updated: 2026-11-10
faq:
  - q: "Ist MoneroP2P seriös?"
    a: "MoneroP2P ist eine quelloffene Plattform ohne Verwahrung, die seit dem 26. Oktober 2026 mit echtem Geld läuft. Der Swap-Vertrag hat keine Admin-Funktionen und sein Quellcode ist auf Sourcify verifiziert, sodass die wichtigsten Aussagen anhand öffentlicher Quellen prüfbar sind. Es ist ein junges Projekt ohne externes Audit, deshalb ist jeder Atomic Swap auf 100 USDT begrenzt."
  - q: "Kann MoneroP2P meine Mittel nehmen?"
    a: "Nicht bei einem Atomic Swap: Die USDT liegen in einem Vertrag ohne Admin-, Pause- oder Upgrade-Funktionen, und das XMR liegt auf einer Adresse, die beide Schlüsselhälften braucht. Bei P2P Fiat liegt das XMR in einer 2-von-3-Multisig-Treuhand, die keine Partei allein bewegen kann, auch nicht MoneroP2P. Sofort-Börsen über Trocador sind anders: Die gewählte Börse hält die Coins während des Tauschs."
  - q: "Wurde MoneroP2P auditiert?"
    a: "Noch nicht von einer externen Firma. Der Vertrag hat automatische Prüfungen mit Halmos (7/7 Eigenschaften bewiesen), Aderyn (0 hohe Befunde) und Slither (keine mittleren oder hohen Befunde) bestanden; Bericht und Läufe sind öffentlich. Bis es ein externes Audit gibt, begrenzt der Vertrag jeden Swap auf 100 USDT."
---

**Kurz gesagt:** MoneroP2P ist eine quelloffene Plattform ohne Verwahrung, die seit dem 26. Oktober 2026 mit echtem Geld läuft. Du musst uns nicht glauben: Jede Aussage unten lässt sich anhand öffentlicher Quellen prüfen. Es ist auch ein junges Projekt ohne externes Audit, deshalb sind die Limits bewusst niedrig.

## Was du selbst prüfen kannst

| Aussage | So prüfst du sie |
|---|---|
| Niemand verwahrt deine USDT bei einem Atomic Swap | Der Vertrag hat keine Admin-, Pause- oder Upgrade-Funktionen. Lies den verifizierten Quellcode auf [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match) oder auf [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| Der Vertrag wurde geprüft | Halmos hat 7 von 7 Eigenschaften bewiesen, Aderyn fand 0 hohe Befunde und Slither keine mittleren oder hohen. Siehe den [Bericht](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) und die [öffentlichen Läufe](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Limits und Gebühren können nicht erhöht werden | Das Maximum von 100 USDT pro Swap und die Gebührenobergrenze von 1 % sind Konstanten im Vertrag. Die aktuelle Gebühr beträgt 0,5 % und zahlt der Maker. |
| Die Website führt den veröffentlichten Code aus | Der gesamte Code liegt auf [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) unter AGPL-3.0. Jedes Release veröffentlicht [SHA256SUMS](/SHA256SUMS), damit du die geladenen Dateien mit deinem eigenen Build vergleichen kannst. |
| P2P Fiat kann dein XMR nicht allein bewegen | Jede Order nutzt eine 2-von-3-Monero-Multisig: Käufer, Verkäufer und Schiedsstelle halten je einen Schlüssel, zwei sind nötig. Siehe [so funktioniert P2P Fiat](https://fiat.monerop2p.app/de/how-it-works/). |
| Deine Schlüssel bleiben bei dir | Die Schlüssel werden in deinem Browser erzeugt. Die Swap-App hat keine Konten, und die App-Seiten erzwingen eine strenge Content Security Policy, die du im Seitenquelltext lesen kannst. |
| Es hat mit echtem Geld funktioniert | Der erste Mainnet-Swap wurde am 26. Oktober 2026 abgeschlossen. Jeder Swap erzeugt über die Factory einen eigenen Vertrag, sichtbar auf Arbiscan. |

## Limits und was uns noch fehlt

- **Kein externes Audit.** Die Prüfungen oben sind automatische Werkzeuge, keine Prüfung durch eine Audit-Firma. Deshalb begrenzt der Vertrag jeden Swap auf 100 USDT.
- **Junges Projekt.** Gestartet im Oktober 2026. Das Volumen ist klein, und P2P Fiat hat in manchen Währungen wenige Anzeigen.
- **Sofort-Börsen verwahren.** Swaps von BTC, ETH und anderen Coins laufen über Drittbörsen via Trocador: Die gewählte Börse hält die Coins ein paar Minuten, und der Kurs enthält 1 % Marge für MoneroP2P.
- **P2P Fiat schützt das XMR, nicht die Bankzahlung.** Die Fiat-Zahlung erfolgt außerhalb der Plattform. Umkehrbare Methoden wie PayPal oder Karten sind riskanter, und Streitfälle entscheidet die Schiedsstelle, die wir betreiben.
- **Du bist für deine Schlüssel verantwortlich.** Wenn du deine Wiederherstellungsdatei oder dein Kontopasswort verlierst, können wir sie nicht wiederherstellen.
- **Keine Firmengarantie.** Es gibt keine Einlagensicherung und keine Support-Hotline. Lies den [Risikohinweis](/de/risk-notice/).

## Wer dahintersteht und wie du uns erreichst

MoneroP2P ist ein unabhängiges Open-Source-Projekt. Das Protokoll baut auf den Atomic Swaps von AthanorLabs auf. Du erreichst uns über [die Kontaktseite](/de/contact/) und kannst Sicherheitslücken vertraulich über den Security-Tab des Repositorys melden. Wir werden dich nie nach deinem Seed, deiner Wiederherstellungsdatei oder einer Zahlung zum „Freischalten“ eines Swaps fragen.

## Bevor du es nutzt

1. Fang mit einem kleinen Betrag an.
2. Lies [so funktioniert es](/de/how-it-works/) und die [Sicherheitsseite](/de/security/).
3. Handle nie außerhalb der Plattform, auch wenn dich jemand darum bittet.
