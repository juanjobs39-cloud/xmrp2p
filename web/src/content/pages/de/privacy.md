---
key: privacy
lang: de
title: Datenschutzerklärung
description: "Welche Daten MoneroP2P verarbeitet (fast keine), was on-chain öffentlich ist, was der Node-Proxy sieht und wie du deine Spuren verringerst."
updated: 2026-11-09
---

**Kurz gesagt:** Wir haben keine Konten, nutzen keine Cookies oder Analysen und speichern deine Schlüssel nicht. Manche Daten sind von Natur aus öffentlich (Transaktionen auf der USDT-Chain), und unsere Server verarbeiten minimale technische Daten, um zu funktionieren. Die Ausnahme sind Sofort-Börsen über Trocador, unten erklärt.

## Was wir NICHT erfassen

- Name, E-Mail, Telefon oder Ausweisdokumente.
- Tracking-Cookies oder Analysen von Dritten.
- Private Schlüssel, Seed-Phrasen oder den Inhalt deiner Wiederherstellungsdatei.

## Was unsere Server verarbeiten (Cloudflare)

| Daten | Zweck | Aufbewahrung |
|---|---|---|
| IP-Adresse | Missbrauchslimits und regionale Sperren | Für MoneroP2P-Swaps speichern wir sie nicht; Cloudflare kann sie nach eigener Richtlinie protokollieren |
| Öffentliche Protokollnachrichten (öffentliche Schlüssel, DLEQ-Beweis, View Key) | Damit du und der Maker den Swap abschließen könnt | Der Raum löscht sich nach 3 Tagen |
| Maker-Angebote | Anzeige des Orderbuchs | Solange das Angebot aktiv ist |

## Sofort-Börsen über Trocador

Wenn kein MoneroP2P-Maker deinen Betrag abdeckt, kann die App Kurse von Sofort-Börsen über [Trocador](https://trocador.app) zeigen. Diese Option funktioniert anders:

- Den Tausch macht die gewählte Börse, nicht MoneroP2P, und du sendest deine USDT an die Adresse dieser Börse. Es ist ein Dienst mit Verwahrung, mit eigenen Bedingungen und KYC-Bewertung.
- Unser Server fragt die Kurse ab und erstellt den Tausch in deinem Namen. Die bei Trocador gelisteten Börsen verlangen, dass wir beim **Erstellen** eines Tauschs deine **IP-Adresse, Browsersprache und Browser-/Geräteinformationen (User-Agent)** verknüpft mit der Tausch-ID aufbewahren, damit wir Anfragen von Strafverfolgungsbehörden beantworten können, die Trocador an uns weiterleitet.
- Wir bewahren diese Daten **unbegrenzt** auf, wie Trocador empfiehlt, weil solche Anfragen lange nach dem Tausch kommen können. Sie werden für nichts anderes genutzt und nur auf eine solche Anfrage hin weitergegeben.
- Das Ansehen der Kurse speichert nichts. Swaps mit MoneroP2P-Makern speichern diese Daten nie.
- Um das zu vermeiden, nutze einen MoneroP2P-Maker oder geh direkt zu Trocador (dann speichert Trocador deine Daten selbst nach eigenen Bedingungen). Tor oder ein VPN verringern, was deine IP verrät.

## Was on-chain öffentlich ist

- Deine USDT-Einzahlung, deine EVM-Wallet-Adresse und die Vertragsereignisse sind im USDT-Netzwerk öffentlich.
- Bei Monero sind Transaktionen von Haus aus privat, aber der gemeinsame View Key des Swaps lässt beide Parteien die gemeinsame Adresse sehen.

## Monero-Node-Proxy

Wenn du unseren Proxy nutzt, sieht er, welche Abfragen dein Browser macht (zum Beispiel, welche Transaktion du prüfst). Um das zu vermeiden, nutze deinen eigenen Node.

## Speicher im Browser

Die App speichert eine **verschlüsselte** Kopie des laufenden Swaps in deinem Browser, mit demselben Passwort wie deine Wiederherstellungsdatei. Du kannst sie löschen, indem du die Website-Daten entfernst.

## Erweiterung MoneroP2P Wallet

Die Erweiterung **erfasst oder sendet keine personenbezogenen Daten**: keine Konten, Analysen oder Telemetrie. Dein Seed, deine Schlüssel und dein Verlauf werden **nur verschlüsselt in deinem Browser** gespeichert (Argon2id und XChaCha20-Poly1305) und verlassen ihn nie. Zum Synchronisieren verbindet sich die Erweiterung mit dem Monero-Node deiner Wahl (standardmäßig unser oben beschriebener Proxy); dieser Node sieht Blockchain-Abfragen und die bereits signierten Transaktionen, die du sendest, nicht deine Schlüssel. Beim Deinstallieren werden alle Daten der Erweiterung gelöscht.

Für das Arbitrum-Konto fragt die Erweiterung den öffentlichen RPC von Arbitrum ab (arb1.arbitrum.io; sepolia-rollup.arbitrum.io für Tests), der deine öffentliche Arbitrum-Adresse und signierte Transaktionen sieht, nie deine Schlüssel. Auf monerop2p.app und fiat.monerop2p.app teilt sie dein Konto oder eine Monero-Adresse nur, wenn du zustimmst, und du kannst sie in den Einstellungen trennen.

**Swap (optional).** Wenn du den Tab „Swap“ der Erweiterung nutzt, werden Kurse und Tausch über unsere API (api.monerop2p.app) angefragt, die mit Trocador spricht. Es gilt dasselbe wie für Trocador-Tausche in der App: Beim Erstellen des Tauschs bewahren wir IP, Sprache und Browser verknüpft mit seiner ID auf, wie diese Börsen es verlangen. Die Liste deiner Tausche wird verschlüsselt in deinem Browser gespeichert. Wenn du „Swap“ nicht nutzt, verbindet sich die Erweiterung nicht mit unserer API.

## Benachrichtigungen von P2P Fiat (optional)

Wenn du auf fiat.monerop2p.app Benachrichtigungen aktivierst, speichern wir die Abo-Adresse, die dein Browser uns gibt, verknüpft mit deinem P2P-Konto, um dich bei geschlossener App über Anfragen und Änderungen deiner Orders zu informieren. Die Benachrichtigung läuft über den Push-Dienst deines Browsers (Google, Mozilla, Apple oder Microsoft) und ist leer: Sie enthält keine Beträge, Nicknames oder Order-Details; den Text fügt die Website hinzu. Du kannst sie jederzeit abschalten, dann wird das Abo gelöscht. Wenn du sie nicht aktivierst, wird nichts gespeichert.

Du kannst auch den Telegram-Bot von P2P Fiat unter „Konto“ verbinden. Wir speichern nur die ID deines Chats mit dem Bot und die Sprache, verknüpft mit deinem P2P-Konto. Die Nachrichten nennen die Art des Hinweises (zum Beispiel „neue Anfrage“ oder „der Käufer hat bezahlt markiert“) und enthalten den Order-Link: nie Beträge, Nicknames oder Zahlungsdaten. Telegram sieht als Messaging-Dienst, dass du den Bot nutzt, und diese Nachrichten. Wenn du eine Anfrage mit den Buttons „Annehmen“ oder „Ablehnen“ beantwortest, speichert der Bot das genau wie die Website. /stop an den Bot oder „Telegram trennen“ in der App löscht die Verknüpfung; ebenso das Blockieren des Bots. Die Buttons des Bots öffnen die App in Telegram. So geöffnet, übergibt Telegram der Seite einige Daten deines Telegram-Kontos (etwa deinen Namen); die App löscht sie beim Start und sendet sie nie an unseren Server. Dein P2P-Konto, seine Schlüssel und die Treuhand-Signatur bleiben auf deinem Gerät, genau wie im Browser. Alarme für neue Anzeigen (/alerts im Bot) funktionieren ohne Konto: Wir speichern die chat_id, die Sprache und die gewählten Filter (Kauf oder Verkauf und Währungen), und „Alarme ausschalten“ oder /stop löscht sie. Alarme enthalten nur Daten, die im Markt ohnehin öffentlich sind. Wenn du die Börse aus dem Bot öffnest (/swap), speichern wir mit dem Swap einen Code, mit dem wir dich in diesem Chat über den Fortschritt informieren (nur Status, keine Beträge oder Adressen); er wird zusammen mit dem Swap gelöscht.

## Kontakt

[EMAIL_CONTACTO]
