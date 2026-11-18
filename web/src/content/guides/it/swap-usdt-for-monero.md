---
key: swap-usdt-xmr
lang: it
slug: how-to-swap-usdt-for-monero-without-intermediaries
title: Come scambiare USDT con Monero senza intermediari
description: "Passo dopo passo: scambia USDT con XMR con un atomic swap dal tuo browser, senza account e senza che nessuno custodisca i tuoi fondi."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: Scambiare USDT con Monero con un atomic swap
  totalTime: PT1H
  steps:
    - name: Prepara il tuo wallet Monero
      text: Crea un wallet Monero e copia il tuo indirizzo di ricezione. In modalità di prova deve essere un indirizzo stagenet.
    - name: Apri l'app e scegli un'offerta
      text: Scegli l'offerta di un maker, inserisci l'importo in USDT e il tuo indirizzo Monero.
    - name: Imposta una password e scarica il file di recupero
      text: Scegli una password di almeno 10 caratteri e scarica il file cifrato. È obbligatorio prima di depositare.
    - name: Deposita gli USDT
      text: Collega il tuo wallet (MetaMask o compatibile) e firma il deposito nel contratto.
    - name: Aspetta e conferma
      text: L'app verifica gli XMR che blocca il maker. Dopo la verifica, conferma con setReady.
    - name: Ricevi gli XMR
      text: Quando il maker incassa, l'app unisce le due metà della chiave e invia gli XMR al tuo indirizzo.
---

**In breve:** apri l'app, scegli un'offerta, inserisci il tuo indirizzo Monero, scarica il file di recupero, deposita gli USDT dal tuo wallet e aspetta. L'app verifica gli XMR, ti chiede di confermare e infine invia gli XMR al tuo indirizzo. Se qualcosa va storto, ti chiede di farti rimborsare gli USDT. L'intero processo di solito richiede da 30 a 60 minuti.

> MoneroP2P funziona con denaro reale su **Arbitrum One + Monero** (massimo 100 USDT per swap) e ha una modalità di prova su **testnet** (Arbitrum Sepolia e stagenet di Monero). I passaggi sono gli stessi in entrambi.

## Prima di iniziare

| Ti serve | Dove trovarlo |
|---|---|
| Un wallet nel browser con USDT | MetaMask o un wallet compatibile EVM |
| Un po' di ETH sulla stessa rete | Per il gas di 2 o 3 transazioni |
| Un indirizzo Monero | [Come creare un wallet Monero](/it/guides/how-to-create-a-monero-wallet/) |
| Da 30 a 60 minuti con la scheda aperta | Oppure il file di recupero per tornare più tardi |

## Passo dopo passo

### Passo 1: scegli un'offerta

L'app mostra le offerte dei maker: prezzo in USDT per XMR e importi minimo e massimo. Ogni maker fissa il proprio prezzo, che cambia con il mercato; l'app mostra l'importo esatto in XMR prima che tu depositi.

### Passo 2: inserisci il tuo indirizzo e una password

- **Indirizzo Monero:** dove riceverai gli XMR. Controllalo due volte; i trasferimenti sono irreversibili.
- **Password:** protegge il tuo file di recupero. Se la dimentichi, nessuno può recuperarla.

### Passo 3: scarica il file di recupero

L'app non ti fa depositare senza. Contiene la tua metà della chiave, cifrata. Con esso puoi riprendere lo swap da qualsiasi browser ([cosa fare se hai chiuso la scheda](/it/guides/what-to-do-if-you-closed-the-tab/)).

### Passo 4: deposita gli USDT

Collega il tuo wallet. Se il token lo supporta, firmi un'autorizzazione e depositi in un'unica transazione; altrimenti prima approvi l'importo. Gli USDT vanno in un contratto che li rilascia solo secondo le regole dello swap.

### Passo 5: aspetta la verifica e conferma

Il maker blocca gli XMR in un indirizzo condiviso e invia una prova di pagamento. L'app controlla l'importo e le conferme sulla rete Monero. Quando è tutto a posto compare il pulsante **Conferma**. Appena confermi, il maker può incassare.

Se gli XMR non arrivano o l'importo è inferiore, l'app ti chiede di **chiedere il rimborso** prima della scadenza t0. Fallo: dopo quella scadenza non puoi chiedere il rimborso fino alla scadenza finale.

### Passo 6: ricevi i tuoi XMR

Quando il maker incassa gli USDT, rivela la sua metà della chiave. L'app la unisce alla tua e invia gli XMR al tuo indirizzo. Il tuo wallet li mostra dopo alcune conferme.

## Costi

- **Commissione della piattaforma:** una percentuale degli USDT, applicata dal contratto quando lo swap si completa, con un massimo dell'1%.
- **Gas** sulla rete di USDT per depositare e confermare (e chiedere il rimborso se serve).
- **Commissione della rete Monero** quando ti vengono inviati gli XMR.
- **Margine del maker**, già incluso nel suo prezzo.

Le commissioni di rete cambiano con la congestione; controllale nel tuo wallet prima di firmare.

## Se qualcosa va storto

| Problema | Cosa fare |
|---|---|
| Il maker non ha risposto | Non hai depositato nulla: scegli un'altra offerta |
| Hai chiuso la scheda | Riapri l'app e usa il file di recupero |
| Gli XMR non arrivano | Aspetta; se t0 si avvicina, l'app ti chiederà di chiedere il rimborso |
| Sei rimasto senza gas | Procurati un po' di ETH sulla rete e riprova |

Prima di usare il servizio, leggi l'[avviso sui rischi](/it/risk-notice/).
