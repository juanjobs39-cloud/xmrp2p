---
key: atomic-swap
lang: it
slug: what-is-an-atomic-swap
title: Cos'è un atomic swap e perché è sicuro
description: "Un atomic swap scambia monete tra due blockchain senza intermediari: o si completano entrambi i lati o nessuno. Come funziona tra USDT e Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**In breve:** un atomic swap è uno scambio tra due criptovalute su blockchain diverse in cui nessuna parte può tenersi i fondi dell'altra. Si chiama «atomico» perché è indivisibile: o si completano entrambi i trasferimenti, o vengono annullati entrambi. La sua sicurezza non dipende dalla fiducia, ma dalla crittografia e da un contratto con scadenze.

## L'idea in una frase

Ogni parte blocca i propri fondi in modo che **l'unico modo per essere pagata sia rivelare la chiave di cui l'altra ha bisogno** per prendere i suoi.

## Come funziona tra USDT e Monero

Monero non ha smart contract, quindi il protocollo usa due elementi:

1. **Un indirizzo Monero condiviso**, la cui chiave privata è divisa in due metà: l'acquirente di XMR ne ha una e il venditore l'altra. Nessuno può spendere con una sola metà.
2. **Un contratto sulla rete di USDT** che custodisce gli USDT e paga il venditore solo se rivela la sua metà della chiave.

Quando il venditore reclama gli USDT, la sua metà viene pubblicata on-chain; l'acquirente la usa per completare la chiave e prendere gli XMR. Se il venditore non blocca mai gli XMR, l'acquirente recupera gli USDT.

## Perché è sicuro

| Rischio in uno scambio | Come lo gestisce l'atomic swap |
|---|---|
| L'altra parte non invia | Puoi chiedere il rimborso entro la scadenza |
| L'altra parte incassa senza consegnare | Per incassare deve rivelare la chiave che ti dà gli XMR |
| Un custode sparisce | Non c'è custode: un contratto e chiavi divise |
| L'altra parte usa una chiave diversa su ogni chain | Una prova crittografica (DLEQ) dimostra che è la stessa |

## A cosa devi fare attenzione

- **Scadenze.** Gli atomic swap sono sicuri se ogni parte agisce in tempo. Su MoneroP2P, se gli XMR non sono verificati prima della scadenza t0, devi chiedere il rimborso.
- **Il tuo file di recupero.** Se chiudi il browser, ti serve per completare o chiedere il rimborso.
- **Il software.** La sicurezza dipende dalla correttezza del codice; il contratto di MoneroP2P è verificato con strumenti automatici ma non ha ancora un audit esterno.

## Un po' di storia

Degli atomic swap si discute per Bitcoin dai primi anni 2010. Per Monero, che non ha script, sono stati sviluppati protocolli a chiavi divise: quello di COMIT (oggi eigenwallet) per Bitcoin e quello di AthanorLabs per Ethereum, su cui si basa MoneroP2P.

Prossima: [come scambiare USDT con Monero senza intermediari](/it/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
