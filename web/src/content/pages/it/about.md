---
key: about
lang: it
title: Chi siamo
description: "Cos'è MoneroP2P, a che punto è e come si finanzia (una commissione su ogni swap completato)."
updated: 2026-10-24
---

**In breve:** MoneroP2P è un progetto open source per scambiare USDT con Monero senza intermediari, con atomic swap che girano nel browser. Funziona con denaro reale su Arbitrum One + Monero (massimo 100 USDT per swap); il contratto è verificato con Halmos, Aderyn e Slither e non ha ancora un audit esterno.

## Cosa costruiamo

L'app web, lo smart contract, il nucleo crittografico e il programma che usano i maker. Non custodiamo fondi e non conserviamo le chiavi degli utenti.

## Come si finanzia

Il contratto applica una commissione percentuale quando uno swap si completa. La percentuale si fissa quando il contratto viene distribuito ed è limitata all'1% nel codice, e nessuno può cambiarla. I rimborsi non pagano commissioni. Gli scambi istantanei tramite Trocador includono un margine dell'1% per MoneroP2P nella quotazione che vedi; non ci sono costi separati.

## Stato

- Attivo con denaro reale da ottobre 2026 (massimo 100 USDT per swap), con una modalità di prova sul testnet.
- Contratto verificato con Halmos, Aderyn e Slither e pubblicato su Sourcify.
- In sospeso: un audit esterno.

## Riconoscimenti

Il protocollo si basa sul lavoro di AthanorLabs e su ricerche precedenti di COMIT e del progetto Farcaster. La prova DLEQ usa la stessa costruzione di eigenwallet.

## Codice

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (licenza AGPL-3.0).
