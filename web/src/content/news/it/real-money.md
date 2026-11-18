---
key: real-money-launch
lang: it
slug: monerop2p-is-live-with-real-money
title: MoneroP2P funziona con denaro reale
description: "Dal 26 ottobre 2026 puoi scambiare USDT con Monero con denaro reale su Arbitrum One: senza custodia, senza account, fino a 100 USDT per swap."
published: 2026-10-30
---

**In breve:** dal **26 ottobre 2026** MoneroP2P funziona con denaro reale. Puoi scambiare USDT (USD₮0 su Arbitrum One) con Monero tramite un atomic swap che gira nel tuo browser, senza account e senza che nessuno tenga i tuoi fondi. Ogni swap ha un tetto di **100 USDT**, imposto dal contratto stesso.

## Cosa è cambiato

Fino ad allora la piattaforma girava solo su reti di test. Il primo swap con denaro reale si è completato dall'inizio alla fine il 26 ottobre: l'acquirente ha depositato gli USDT, il maker ha bloccato gli XMR, l'acquirente ha confermato e ricevuto i suoi Monero, e il contratto ha pagato il maker. Da allora il denaro reale è la modalità predefinita del sito.

## Come proteggiamo il tuo denaro

- **Nessuno tiene i fondi.** I tuoi USDT stanno in un contratto dedicato al tuo swap, senza funzioni di amministrazione. Può solo pagare il maker quando puoi prendere gli XMR, o rimborsarti gli USDT se qualcosa va storto.
- **Contratto verificato.** Ha superato la verifica simbolica con **Halmos** (7 proprietà su 7 dimostrate per ogni input) e l'analisi statica con **Aderyn** (0 risultati gravi) e **Slither** (nessun risultato medio o grave). Il suo codice sorgente è verificato su **Sourcify**: [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **Tetto di 100 USDT per swap.** Non c'è ancora un audit esterno, quindi limitiamo quanto un singolo swap può mettere a rischio. Il tetto è nel contratto e nessuno può alzarlo senza pubblicarne uno nuovo.
- **Open source** (AGPL-3.0) su [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), con somme SHA-256 per ogni file del sito, così puoi verificare cosa carichi.

## Quanto costa

La commissione della piattaforma è dello **0,5%** e la paga il maker al riscatto. Tu paghi solo il gas di Arbitrum per depositare e confermare, e la commissione della rete Monero quando ricevi. Il prezzo di ogni maker include già il suo margine; l'app mostra gli XMR esatti prima che tu depositi.

## Altre novità di queste settimane

- **Vista semplice:** scrivi quanti USDT invii, premi «Scambia» e vedi tutte le quotazioni ordinate per quanto ricevi.
- **Più di 100 USDT, o nessun maker disponibile:** l'app mostra quotazioni di exchange istantanei tramite Trocador. Questa opzione funziona diversamente (l'exchange tiene lo scambio); lo spieghiamo nell'[informativa sulla privacy](/it/privacy/).
- **Diventa maker dal browser**, senza installare nulla: la scheda aperta fa da server. [Come diventare maker](/it/become-a-maker/).
- **Più lingue:** l'app ora è disponibile anche in tedesco, francese e italiano.

## Cosa viene dopo

- Un audit esterno del contratto, che ci permetterebbe di alzare il tetto per swap.
- Più maker, perché ci siano sempre offerte.
- Valutare altre reti USDT, come Tron.

[Apri l'app →](/it/app/) · Prima di usarla, leggi l'[avviso sui rischi](/it/risk-notice/).
