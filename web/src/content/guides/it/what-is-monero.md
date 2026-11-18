---
key: what-is-monero
lang: it
slug: what-is-monero
title: Cos'è Monero e in cosa si differenzia da Bitcoin
description: "Monero (XMR) è privato di default: nasconde mittente, destinatario e importo. Differenze con Bitcoin in privacy, emissione e uso."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**In breve:** Monero (XMR) è una criptovaluta che nasconde di default chi invia, chi riceve e quanto. Su Bitcoin, invece, ogni indirizzo e ogni importo sono pubblici e chiunque può tracciare i fondi. Monero esiste dal 2014 ed è open source.

## Differenze principali

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Mittente | Nascosto (firme ad anello) | Pubblico |
| Destinatario | Nascosto (indirizzi monouso) | Pubblico |
| Importo | Nascosto (RingCT) | Pubblico |
| Privacy | Sempre attiva | Opzionale e limitata |
| Tempo di blocco | Circa 2 minuti | Circa 10 minuti |
| Emissione | Piccola emissione di coda permanente dal 2022 | Tetto di 21 milioni |
| Smart contract | No | Script limitati |

## Come ottiene la privacy

- **Firme ad anello:** la tua transazione viene mescolata con altri output della chain, quindi non si sa qual è quella vera.
- **Indirizzi stealth:** ogni pagamento va a un indirizzo monouso; il tuo indirizzo pubblico non compare mai on-chain.
- **RingCT:** gli importi sono cifrati, eppure la rete verifica che non si crei denaro dal nulla.

## Fungibilità

Poiché la cronologia non è visibile, ogni XMR è intercambiabile con qualsiasi altro. Con le monete trasparenti, alcune unità possono essere rifiutate per la loro cronologia.

## View key

Monero ti permette di condividere una **view key** (chiave di visualizzazione), che mostra i pagamenti ricevuti senza permettere di spendere. MoneroP2P la usa perché l'acquirente verifichi che gli XMR sono arrivati all'indirizzo condiviso.

## Cosa tenere a mente

- Alcuni exchange centralizzati hanno delistato Monero in certe giurisdizioni. Per questo contano i metodi senza intermediari, come gli atomic swap.
- La privacy non ti esonera dalle leggi del tuo paese.

Prossima: [come creare un wallet Monero](/it/guides/how-to-create-a-monero-wallet/).
