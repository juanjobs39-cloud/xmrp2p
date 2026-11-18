---
key: wallet
lang: it
title: "MoneroP2P Wallet: wallet Monero (XMR) senza custodia per il tuo browser"
description: "Estensione gratuita per Chrome, Brave, Edge e Firefox. Le tue chiavi Monero non lasciano mai il dispositivo; compra XMR con USDT o valuta locale senza uscire dal wallet."
updated: 2026-11-05
keywords:
  - wallet Monero
  - wallet XMR
  - estensione Monero Chrome
  - wallet Monero browser
  - wallet Monero Firefox
  - wallet Monero senza custodia
faq:
  - q: "MoneroP2P Wallet salva le mie chiavi su un server?"
    a: "No. Il seed e le chiavi vengono generati e salvati, cifrati, solo nel tuo browser. Niente account, registrazione o analisi. Il nodo di MoneroP2P riceve solo richieste alla blockchain e transazioni già firmate."
  - q: "E se perdo il dispositivo o disinstallo l'estensione?"
    a: "Ripristina il wallet con il tuo seed di 25 parole in MoneroP2P Wallet o in qualsiasi wallet Monero compatibile, come Cake Wallet, Feather o il wallet ufficiale."
  - q: "È compatibile con altri wallet Monero?"
    a: "Sì. Usa il seed standard di Monero da 25 parole, quindi puoi importarlo in altri wallet e viceversa."
  - q: "Posso usare il mio nodo?"
    a: "Sì. Nelle Impostazioni puoi inserire l'URL del tuo nodo (https, o http://127.0.0.1 per uno locale)."
  - q: "Quanto costa?"
    a: "L'estensione è gratuita e open source (AGPL-3.0). Ogni trasferimento di XMR paga la commissione della rete Monero più lo 0,25% di commissione MoneroP2P, mostrata a parte prima di confermare. Ricevere e inviare ai tuoi indirizzi non paga commissioni MoneroP2P."
---

**MoneroP2P Wallet** è un wallet Monero (XMR) che funziona come estensione del browser. Le tue chiavi vengono create e restano sul tuo dispositivo, cifrate con la tua password. Dallo stesso wallet puoi comprare XMR con USDT o con la tua valuta locale sui servizi di MoneroP2P.

## Cosa puoi fare

- **Creare o ripristinare** un wallet con il seed standard di Monero da 25 parole.
- **Ricevere** con un nuovo sottoindirizzo per ogni pagamento, con codice QR, così nessuno può collegare i tuoi pagamenti.
- **Inviare** con la commissione esatta mostrata prima di confermare e un riepilogo chiaro della destinazione.
- **Esplorare:** apri l'[exchange da USDT a XMR](/it/app/) (con il tuo indirizzo già inserito) e [P2P Fiat](https://fiat.monerop2p.app/it/app/) con un clic, per comprare con bonifico, contanti o altri metodi locali.
- **USDT ed ETH su Arbitrum:** dallo stesso seed nasce un account Arbitrum One. Su monerop2p.app e P2P Fiat il wallet si collega da solo (senza MetaMask) e inserisce il tuo indirizzo Monero; ogni firma o trasferimento chiede la tua approvazione in una finestra dell'estensione.

## Come ti protegge

| Protezione | Cosa fa |
|---|---|
| Senza custodia | Il seed non lascia mai il tuo dispositivo; nessun altro può muovere i tuoi XMR. |
| Cifratura forte | La tua password diventa una chiave con Argon2id (64 MiB) e il wallet è cifrato con XChaCha20-Poly1305. |
| Blocco automatico | Si blocca dopo 15 minuti di inattività (configurabile) e quando chiudi il browser. |
| Nessun codice remoto | Tutto il codice è incluso nell'estensione, con una policy di sicurezza rigorosa (CSP). |
| Anti-poisoning | Ti avvisa se incolli un indirizzo che somiglia a uno usato prima ma non è lo stesso. |
| Verificabile | Il pacchetto è compilato in modo riproducibile: chiunque può verificare che corrisponde al codice sorgente. |

## Prima di iniziare

1. Scrivi il seed **su carta** e conservalo al sicuro: è l'unico modo per recuperare il tuo denaro.
2. Usa una password lunga e unica per l'estensione.
3. Prova prima con un importo piccolo.

Non hai ancora XMR? Vedi [tutti i modi per comprare Monero](/it/buy-monero/).
