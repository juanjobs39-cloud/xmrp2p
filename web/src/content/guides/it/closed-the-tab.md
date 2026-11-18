---
key: closed-tab
lang: it
slug: what-to-do-if-you-closed-the-tab
title: Cosa fare se hai chiuso la scheda durante uno swap
description: "Come riprendere uno swap di MoneroP2P con il file di recupero, cosa succede con le scadenze t0 e t1 e quando devi chiedere il rimborso."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Riprendere uno swap con il file di recupero
  totalTime: PT5M
  steps:
    - name: Apri l'app
      text: Apri l'app di MoneroP2P in qualsiasi browser, meglio se sullo stesso dispositivo.
    - name: Scegli Riprendi
      text: Clicca su «Riprendi» e carica il file di recupero (o usa la copia in questo browser se l'hai salvata qui).
    - name: Inserisci la password
      text: Digita la password con cui hai cifrato il file.
    - name: Segui l'azione indicata dall'app
      text: L'app legge lo stato del contratto e ti dice se confermare, aspettare, chiedere il rimborso o ricevere gli XMR.
---

**In breve:** riapri l'app, clicca su «Riprendi», carica il file di recupero e inserisci la password. L'app leggerà il contratto e ti dirà cosa fare. **Fallo il prima possibile:** se gli XMR non sono stati verificati e la scadenza t0 si avvicina, devi chiedere il rimborso in tempo.

## Cosa succede mentre la scheda è chiusa

Non si perde nulla subito, ma l'orologio del contratto continua a correre:

| Momento | Cosa può succedere | Cosa fai quando torni |
|---|---|---|
| Prima di t0 | Il maker potrebbe aver bloccato gli XMR | L'app lo verifica; confermi o chiedi il rimborso |
| Tra t0 e t1 | Il maker può incassare (se ha bloccato gli XMR) | Se ha incassato, l'app ti invia gli XMR |
| Dopo t1 | Se il maker non ha incassato | Chiedi il rimborso dei tuoi USDT |

**Il rischio:** se non torni prima di t0 e il maker *non* ha bloccato gli XMR, il contratto gli permette comunque di incassare tra t0 e t1. Per questo conta tornare presto, o non chiudere la scheda.

## Se il maker ha già incassato

Incassando, il maker ha rivelato la sua metà della chiave on-chain. Con il tuo file di recupero l'app ricostruisce la chiave completa e invia gli XMR al tuo indirizzo, anche giorni dopo. Per questo non c'è scadenza.

## Se hai perso il file

- Se usi **lo stesso browser** e non ne hai cancellato i dati, l'app ha conservato una copia cifrata: clicca su «Riprendi» e inserisci la password senza caricare file.
- Se hai perso il file **e** il browser, non c'è modo di recuperare la tua metà della chiave. Noi non l'abbiamo.

## Consigli

- Conserva il file in due posti (per esempio il computer e una chiavetta USB).
- Usa una password che ricordi.
- Se puoi, lascia la scheda aperta finché lo swap non è finito.

Prossima: [come scambiare USDT con Monero senza intermediari](/it/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
