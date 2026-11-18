---
key: privacy
lang: it
title: Informativa sulla privacy
description: "Quali dati tratta MoneroP2P (quasi nessuno), cosa è pubblico on-chain, cosa vede il proxy del nodo e come ridurre la tua esposizione."
updated: 2026-11-09
---

**In breve:** non abbiamo account, non usiamo cookie né strumenti di analisi e non conserviamo le tue chiavi. Alcuni dati sono pubblici per natura (le transazioni sulla chain di USDT) e i nostri server trattano dati tecnici minimi per funzionare. L'eccezione sono gli exchange istantanei tramite Trocador, spiegati più sotto.

## Cosa NON raccogliamo

- Nome, email, telefono o documenti d'identità.
- Cookie di tracciamento o analisi di terzi.
- Chiavi private, frasi seed o il contenuto del tuo file di recupero.

## Cosa trattano i nostri server (Cloudflare)

| Dato | Scopo | Conservazione |
|---|---|---|
| Indirizzo IP | Limiti anti-abuso e blocco regionale | Non lo conserviamo per gli swap di MoneroP2P; Cloudflare può registrarlo secondo la sua policy |
| Messaggi pubblici del protocollo (chiavi pubbliche, prova DLEQ, view key) | Permettere a te e al maker di completare lo swap | La stanza si cancella dopo 3 giorni |
| Offerte dei maker | Mostrare il book degli ordini | Finché l'offerta è attiva |

## Exchange istantanei tramite Trocador

Quando nessun maker di MoneroP2P copre il tuo importo, l'app può mostrare quotazioni di exchange istantanei tramite [Trocador](https://trocador.app). Questa opzione funziona in modo diverso:

- Lo scambio lo fa l'exchange scelto, non MoneroP2P, e invii i tuoi USDT all'indirizzo di quell'exchange. È un servizio con custodia, con propri termini e valutazione KYC.
- Il nostro server richiede le quotazioni e crea lo scambio per tuo conto. Gli exchange elencati su Trocador richiedono che, quando **crei** uno scambio, conserviamo il tuo **indirizzo IP, la lingua del browser e le informazioni del browser/dispositivo (user agent)** collegati all'ID dello scambio, per rispondere alle richieste delle autorità che Trocador ci inoltra.
- Conserviamo questi dati **a tempo indeterminato**, come consiglia Trocador, perché tali richieste possono arrivare molto dopo lo scambio. Non vengono usati per nient'altro e sono condivisi solo in risposta a una simile richiesta.
- Guardare le quotazioni non salva nulla. Gli swap con i maker di MoneroP2P non salvano mai questi dati.
- Per evitarlo, usa un maker di MoneroP2P o vai direttamente su Trocador (che allora conserva i tuoi dati secondo i propri termini). Tor o una VPN riducono ciò che rivela il tuo IP.

## Cosa è pubblico on-chain

- Il tuo deposito di USDT, l'indirizzo del tuo wallet EVM e gli eventi del contratto sono pubblici sulla rete di USDT.
- Su Monero le transazioni sono private per progettazione, ma la view key condivisa dello swap permette a entrambe le parti di vedere l'indirizzo comune.

## Proxy del nodo Monero

Se usi il nostro proxy, vede quali richieste fa il tuo browser (per esempio, quale transazione verifichi). Per evitarlo, usa il tuo nodo.

## Archiviazione nel browser

L'app salva una copia **cifrata** dello swap in corso nel tuo browser, con la stessa password del file di recupero. Puoi eliminarla cancellando i dati del sito.

## Estensione MoneroP2P Wallet

L'estensione **non raccoglie né invia dati personali**: niente account, analisi o telemetria. Il tuo seed, le chiavi e la cronologia sono salvati **cifrati solo nel tuo browser** (Argon2id e XChaCha20-Poly1305) e non ne escono mai. Per sincronizzarsi, l'estensione si collega al nodo Monero che scegli (di default il nostro proxy, descritto sopra); quel nodo vede le richieste alla blockchain e le transazioni già firmate che invii, non le tue chiavi. Disinstallare l'estensione cancella tutti i suoi dati.

Per l'account Arbitrum, l'estensione interroga l'RPC pubblico di Arbitrum (arb1.arbitrum.io; sepolia-rollup.arbitrum.io per i test), che vede il tuo indirizzo Arbitrum pubblico e le transazioni firmate, mai le tue chiavi. Su monerop2p.app e fiat.monerop2p.app condivide il tuo account o un indirizzo Monero con il sito solo se lo approvi, e puoi disconnetterla nelle Impostazioni.

**Swap (opzionale).** Se usi la scheda «Swap» dell'estensione, quotazioni e scambio vengono richiesti alla nostra API (api.monerop2p.app), che comunica con Trocador. Vale lo stesso degli scambi Trocador nell'app: alla creazione dello scambio conserviamo IP, lingua e browser collegati al suo ID, come richiedono quegli exchange. L'elenco dei tuoi scambi è salvato cifrato nel tuo browser. Se non usi «Swap», l'estensione non si collega alla nostra API.

## Notifiche di P2P Fiat (opzionale)

Se attivi le notifiche su fiat.monerop2p.app, salviamo l'indirizzo di iscrizione che ci dà il tuo browser, collegato al tuo account P2P, per avvisarti di richieste e cambiamenti dei tuoi ordini quando l'app è chiusa. La notifica passa dal servizio push del tuo browser (Google, Mozilla, Apple o Microsoft) ed è vuota: non contiene importi, nickname o dettagli dell'ordine; il testo lo aggiunge il sito. Puoi disattivarle in qualsiasi momento e l'iscrizione viene cancellata. Se non le attivi, non si salva nulla.

Puoi anche collegare il bot Telegram di P2P Fiat da «Account». Salviamo solo l'ID della tua chat con il bot e la lingua, collegati al tuo account P2P. I messaggi indicano il tipo di avviso (per esempio «nuova richiesta» o «l'acquirente ha segnato come pagato») e includono il link all'ordine: mai importi, nickname o dati di pagamento. Telegram, come servizio di messaggistica, vede che usi il bot e quei messaggi. Se rispondi a una richiesta con i pulsanti «Accetta» o «Rifiuta», il bot lo registra come il sito. Inviare /stop al bot, o «Disconnetti Telegram» nell'app, cancella il collegamento; anche bloccare il bot. I pulsanti del bot aprono l'app dentro Telegram. Aperta così, Telegram passa alla pagina alcuni dati del tuo account Telegram (come il nome); l'app li cancella all'avvio e non li invia mai al nostro server. Il tuo account P2P, le sue chiavi e la firma dell'escrow restano sul tuo dispositivo, come nel browser. Gli avvisi di nuovi annunci (/alerts nel bot) funzionano senza account: salviamo il chat_id, la lingua e i filtri scelti (acquisto o vendita, e valute), e «Disattiva avvisi» o /stop li cancellano. Gli avvisi contengono solo dati già pubblici nel mercato. Se apri l'exchange dal bot (/swap), salviamo con lo swap un codice che ci permette di avvisarti dei progressi in quella chat (solo lo stato, niente importi o indirizzi); viene cancellato insieme allo swap.

## Contatto

[EMAIL_CONTACTO]
