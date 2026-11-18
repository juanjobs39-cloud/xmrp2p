---
key: monero-traceable
lang: de
slug: is-monero-traceable-xmr-vs-bitcoin-vs-zcash
title: "Ist Monero rückverfolgbar? Privatsphäre von XMR, Bitcoin und Zcash 2026"
description: "Was Monero verbirgt, was nicht, und wie es sich mit Bitcoin und Zcash vergleicht. Dazu, was FCMP++ ändert und wie du XMR 2026 privater nutzt."
published: 2026-11-06
keywords:
  - ist Monero rückverfolgbar
  - ist Monero anonym
  - Monero vs Bitcoin Privatsphäre
  - Monero vs Zcash
  - privateste Kryptowährung
  - Monero FCMP++
  - wie funktioniert Monero Privatsphäre
  - Monero Ringsignaturen
howto:
  name: "So nutzt du Monero privater"
  totalTime: PT20M
  steps:
    - name: "Nutze eine Wallet ohne Verwahrung"
      text: "Bewahre dein XMR in einer Wallet auf, in der nur du die Seed hast, etwa MoneroP2P Wallet, Feather oder Cake Wallet. Eine Börse weiß, wer du bist und was du abhebst."
    - name: "Empfange jede Zahlung auf einer neuen Subadresse"
      text: "Erzeuge für jede Zahlung oder jede Person eine andere Subadresse, damit niemand deine eingehenden Zahlungen verknüpfen kann."
    - name: "Verbinde dich mit einem Node, dem du vertraust"
      text: "Nutze deinen eigenen Node oder einen, dem du vertraust. Der Node sieht deine IP-Adresse, wenn du eine Transaktion sendest."
    - name: "Kauf ohne KYC"
      text: "Kauf XMR P2P oder per Atomic Swap, ohne deinen Ausweis einer Börse zu geben, die deinen Namen mit deinen Abhebungen verknüpft."
    - name: "Beweg nicht alles auf einmal"
      text: "Vermeide es, genau den gerade gekauften Betrag direkt nach dem Empfang weiterzuschicken. Zeit- und Betragsmuster sind die Hinweise, die am häufigsten zum Raten genutzt werden."
faq:
  - q: "Ist Monero rückverfolgbar?"
    a: "Nicht so wie Bitcoin. Die Monero-Blockchain zeigt weder Absender noch Empfänger noch Betrag, weil sie Stealth-Adressen, Ringsignaturen und RingCT nutzt. Was Informationen preisgeben kann, passiert außerhalb der Kette: eine Börse mit KYC, ein Node, der deine IP protokolliert, oder Zeit- und Betragsmuster."
  - q: "Ist Monero zu 100 % anonym?"
    a: "Keine Technologie ist zu 100 % anonym. Monero verbirgt standardmäßig, wer sendet, wer empfängt und wie viel, aber Ringsignaturen verstecken den Absender unter 16 Kandidaten, und statistische Analysen können in manchen Fällen den echten schätzen. Das Upgrade FCMP++ soll diese Schwäche beseitigen."
  - q: "Was ist FCMP++?"
    a: "Full-Chain Membership Proofs. Es ersetzt die Ringsignaturen mit 16 Mitgliedern: Statt deinen Output unter 16 zu verstecken, versteckt es ihn unter allen Outputs der Blockchain. Stand November 2026 ist es nicht im Mainnet aktiv; ein inoffizieller Entwurf der Entwickler nennt etwa März 2027."
  - q: "Was ist privater, Monero oder Zcash?"
    a: "Zcash hat sehr starke Kryptografie (zk-SNARKs), wenn du abgeschirmte Adressen nutzt, aber die Privatsphäre ist optional, und es gibt auch transparente Adressen wie bei Bitcoin. Bei Monero ist jede Transaktion privat, sodass du durch die Nutzung nicht auffällst. Deshalb gilt Monero in der Praxis meist als privater."
  - q: "Ist Bitcoin anonym?"
    a: "Nein. Bitcoin ist pseudonym: Jede Transaktion, Adresse und jeder Betrag ist für immer öffentlich. Chain-Analyse-Firmen verknüpfen Adressen über Börsen mit KYC und Nutzungsmuster mit Personen."
  - q: "Ist es legal, Monero zu nutzen?"
    a: "In den meisten Ländern ist es legal, Monero zu besitzen und zu nutzen. Eingeschränkt wurde, dass regulierte Börsen es anbieten; in der Europäischen Union gilt dieses Verbot ab Juli 2027. Prüfe die Gesetze deines Landes."
---

**Kurz gesagt:** **Die Blockchain von Monero (XMR) zeigt weder Absender noch Empfänger noch Betrag** einer Transaktion, deshalb **kann man sie nicht so verfolgen wie Bitcoin**, wo alles öffentlich ist. Monero erreicht das mit **Stealth-Adressen, Ringsignaturen mit 16 Mitgliedern und RingCT** und wendet sie standardmäßig auf jede Transaktion an, anders als **Zcash**, wo Privatsphäre optional ist. Seine Schwachstellen liegen außerhalb der Kette: **Börsen mit KYC, deine IP und Nutzungsmuster**. Das nächste Upgrade, **FCMP++**, ist noch nicht aktiv (Entwurfsziel **März 2027**) und stärkt genau den schwächsten Teil.

[Monero ohne KYC kaufen →](/de/buy-monero/)

## Monero vs Bitcoin vs Zcash: Vergleichstabelle

| | Monero (XMR) | Bitcoin (BTC) | Zcash (ZEC) |
|---|---|---|---|
| Standardmäßig privat | Ja, jede Transaktion | Nein | Nein, optional |
| Absender | Verborgen (Ringsignatur mit 16) | Öffentlich | Nur mit abgeschirmten Adressen verborgen |
| Empfänger | Verborgen (Stealth-Adressen) | Öffentlich | Nur mit abgeschirmten Adressen verborgen |
| Betrag | Verborgen (RingCT) | Öffentlich | Nur mit abgeschirmten Adressen verborgen |
| IP-Herkunft beim Senden | Geschützt durch Dandelion++ | Für Nodes sichtbar | Für Nodes sichtbar |
| Im Block-Explorer | Nur verschlüsselte Daten | Vollständige Historie | Hängt vom Adresstyp ab |
| Eigene Wallet prüfen | View Key | Immer öffentlich | Viewing Key |
| Mining | RandomX (CPU) | SHA-256 (ASIC) | Equihash (ASIC) |
| Blockzeit | ~2 Minuten | ~10 Minuten | ~75 Sekunden |

Der entscheidende Unterschied ist **standardmäßig**. Wenn eine Währung dich zwischen öffentlichen und privaten Transaktionen wählen lässt, fallen diejenigen auf, die private wählen. Bei Monero sehen alle Transaktionen gleich aus, deine geht also unter allen anderen unter.

## Wie Monero jede Information verbirgt

### Wer empfängt: Stealth-Adressen
Jedes Mal, wenn dich jemand bezahlt, erzeugt die Wallet des Absenders eine **Einmal-Adresse**, die von deiner abgeleitet ist. Deine öffentliche Adresse erscheint nie in der Blockchain, niemand sieht also, wie viele Zahlungen du erhalten hast. Zusätzlich kannst du **Subadressen** nutzen: eine andere für jede Person oder Zahlung.

### Wer sendet: Ringsignaturen
Wenn du XMR ausgibst, signiert deine Transaktion zusammen mit **15 Outputs anderer Leute** aus der Blockchain (insgesamt 16 seit dem Upgrade im August 2022). Ein Beobachter weiß, dass einer der 16 echt ist, aber nicht welcher. Ein **Key Image** verhindert, denselben Output zweimal auszugeben, ohne zu verraten, welcher es war.

### Wie viel: RingCT
Seit Januar 2017 sind Beträge mit **Ring Confidential Transactions** verschlüsselt. Das Netzwerk prüft, dass keine Coins aus dem Nichts entstehen, ohne die Beträge zu sehen.

### Woher: Dandelion++
Seit 2020 springen Transaktionen erst über einige zufällige Nodes, bevor sie ans ganze Netzwerk verteilt werden. Das macht es schwerer zu erkennen, welche IP sie zuerst gesendet hat.

## Ist Monero also rückverfolgbar?

In der Blockchain nicht wie Bitcoin. Aber es gibt Grenzen, die du kennen solltest:

- **Ringsignaturen sind probabilistisch.** Sie verstecken den Absender unter 16, nicht unter allen. Statistische Analysen (Alter der Outputs, verkettete Ausgaben oder ein Akteur, der mehrere Köder kontrolliert) können in manchen Fällen den echten **schätzen**. Das ist kein Beweis, verringert aber die Anonymität.
- **Der Node sieht deine IP.** Wenn du einen fremden Node nutzt, weiß dieser Node, von welcher IP du gesendet hast. 2024 tauchte ein Video einer Chain-Analyse-Firma auf, die behauptete, Monero-Transaktionen über **bösartige Nodes** zu verknüpfen, die IPs protokollierten.
- **KYC verrät dich außerhalb der Kette.** Wenn du XMR auf einer Börse kaufst, die deinen Ausweis hat, weiß die Börse, dass du zu einer bestimmten Zeit einen bestimmten Betrag abgehoben hast. Damit kann sie raten, wohin er ging.
- **Muster sprechen.** Genau den Betrag weiterzuschicken, den du gerade erhalten hast, immer zur selben Uhrzeit, erleichtert das Raten.

Keine dieser Grenzen bricht die Kryptografie von Monero; alle nutzen Informationen, die du drumherum hinterlässt. Deshalb ist es genauso wichtig, wie du es nutzt, wie die Währung selbst.

## FCMP++: was kommt

**FCMP++ (Full-Chain Membership Proofs)** ersetzt die Ringsignaturen. Statt deinen Output unter 16 zu verstecken, versteckt es ihn **unter allen Outputs der Monero-Geschichte**, mehr als hundert Millionen. Damit fallen fast alle statistischen Angriffe auf Ringe weg. Es kommt zusammen mit **Carrot**, einem neuen Adressschema.

**Stand November 2026:**
- Im Oktober 2026 wird es in **Testnetzen** (Testnet und Stressnet) getestet, nicht im Mainnet.
- Ein Entwurf der Entwickler, den sie selbst **unverbindlich** nennen, peilt die Aktivierung im Mainnet um **März 2027** an.
- **Es gibt kein offizielles Datum.** Prüfe [getmonero.org](https://www.getmonero.org/), bevor du einem Datum vertraust.

Wenn es kommt, musst du mit deinem XMR nichts Besonderes tun: Aktualisiere einfach deine Wallet auf eine kompatible Version.

## So nutzt du Monero privater

1. **Wallet ohne Verwahrung.** Nutze eine Wallet, in der nur du die Seed hast, etwa [MoneroP2P Wallet](/de/wallet/), Feather oder Cake Wallet. Ratgeber: [So erstellst du eine Monero-Wallet](/de/guides/how-to-create-a-monero-wallet/).
2. **Eine neue Subadresse pro Zahlung.** MoneroP2P Wallet erstellt bei jedem Öffnen von «Empfangen» schon eine andere.
3. **Ein Node, dem du vertraust.** Nutze wenn möglich deinen eigenen Node; in MoneroP2P Wallet änderst du ihn in den Einstellungen.
4. **Kauf ohne KYC.** Nutze [P2P Fiat](https://fiat.monerop2p.app/de/) mit deiner lokalen Währung oder einen [Atomic Swap von USDT zu XMR](/de/guides/how-to-swap-usdt-for-monero-without-intermediaries/). Mehr Optionen in [Monero ohne KYC kaufen](/de/guides/how-to-buy-monero-without-kyc/).
5. **Warte und kopiere keine Beträge.** Lass etwas Zeit vergehen, bevor du Erhaltenes wieder bewegst, und schick nicht genau dieselbe Summe weiter.

## Andere «Privacy Coins» im Vergleich mit Monero

- **Litecoin (MWEB):** optionale Privatsphäre in einem separaten Erweiterungsblock; der Großteil der Nutzung ist weiter öffentlich.
- **Dash:** Seine Mischfunktion (CoinJoin) ist optional, und die Beträge bleiben sichtbar.
- **Bitcoin mit CoinJoin:** Mischen hilft, aber gemischte Outputs sind erkennbar, und manche Börsen blockieren sie.

Bei allen ist Privatsphäre ein Extra, das du einschalten musst. Bei Monero ist sie die Regel.

## FAQ

### Ist Monero rückverfolgbar?
Nicht wie Bitcoin: Die Blockchain zeigt weder Absender noch Empfänger noch Betrag. Was dich verraten kann, liegt außerhalb der Kette: KYC, deine IP und deine Muster.

### Ist Monero zu 100 % anonym?
Nichts ist es. Ringsignaturen verstecken den Absender unter 16, und statistische Analysen können in manchen Fällen den echten schätzen. FCMP++ soll das beheben.

### Was ist FCMP++?
Das Upgrade, das deinen Output unter allen Outputs der Blockchain versteckt statt unter 16. Stand November 2026 ist es nicht aktiv; der Entwurf peilt März 2027 an.

### Was ist privater, Monero oder Zcash?
In der Praxis Monero, weil seine Privatsphäre verpflichtend ist. Zcash ist mit abgeschirmten Adressen sehr stark, erlaubt aber auch öffentliche Transaktionen.

### Ist Bitcoin anonym?
Nein. Es ist pseudonym, und seine gesamte Historie ist öffentlich.

### Ist es legal, Monero zu nutzen?
In den meisten Ländern ja. Eingeschränkt ist, dass regulierte Börsen es anbieten: Lies [warum Monero delistet wurde](/de/news/monero-delisted-where-to-buy-xmr-in-2026/).

Für die Grundlagen lies [Was Monero ist und wie es sich von Bitcoin unterscheidet](/de/guides/what-is-monero/). Krypto zu nutzen birgt Risiken: Lies den [Risikohinweis](/de/risk-notice/).

[Monero ohne KYC kaufen →](/de/buy-monero/)
