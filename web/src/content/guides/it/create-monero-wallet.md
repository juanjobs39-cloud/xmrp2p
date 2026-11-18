---
key: monero-wallet
lang: it
slug: how-to-create-a-monero-wallet
title: Come creare un wallet Monero
description: "Wallet Monero per smartphone e computer, come crearne uno, conservare il seed al sicuro e ottenere il tuo indirizzo. Con lo stagenet per i test."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Creare un wallet Monero
  steps:
    - name: Scegli un wallet
      text: Scarica un wallet dal suo sito ufficiale o dall'elenco su getmonero.org.
    - name: Crea un nuovo wallet
      text: Scegli di creare un nuovo wallet e imposta una password locale.
    - name: Fai il backup della frase seed
      text: Scrivi la frase seed su carta, in ordine, e conservala in un posto sicuro e offline.
    - name: Copia il tuo indirizzo
      text: Nella sezione Ricevi, copia il tuo indirizzo. Per provare MoneroP2P usa un wallet stagenet.
---

**In breve:** scarica un wallet Monero dal suo sito ufficiale, crea un nuovo wallet, scrivi la frase seed su carta e copia il tuo indirizzo da «Ricevi». Per la modalità di prova di MoneroP2P ti serve un wallet **stagenet** (la rete di test di Monero), che alcuni wallet desktop permettono di scegliere.

## Opzioni conosciute

| Wallet | Piattaforma | Note |
|---|---|---|
| Monero GUI e CLI (ufficiali) | Windows, macOS, Linux | Del progetto Monero; supportano lo stagenet |
| Feather Wallet | Windows, macOS, Linux | Wallet desktop leggero; supporta lo stagenet |
| Cake Wallet | Android, iOS, desktop | Popolare su smartphone |
| Altri | Varie | Controlla l'elenco aggiornato su getmonero.org |

> Scarica sempre dal sito ufficiale di ogni wallet e verifica le firme se il progetto le pubblica. Diffida delle app imitazione negli store.

## Passo dopo passo

1. **Installa il wallet** dal suo sito ufficiale.
2. **Crea un nuovo wallet.** Ti chiede una password: protegge il file su questo dispositivo, non è il tuo seed.
3. **Fai il backup della frase seed.** È un elenco di parole (25 nel formato classico, 16 nel formato Polyseed usato da alcuni wallet). Scrivile su carta, in ordine. Chi le ha controlla i tuoi fondi.
4. **Annota l'altezza di ripristino** se il wallet la mostra: velocizza il recupero.
5. **Copia il tuo indirizzo** da «Ricevi». Gli indirizzi principali di Monero sulla rete reale iniziano con `4`; i sottoindirizzi con `8`. Sullo stagenet iniziano con `5` o `7`.

## Per provare MoneroP2P (stagenet)

- In Monero GUI o Feather, scegli **stagenet** quando crei il wallet (nelle impostazioni o all'avvio).
- Gli XMR dello stagenet non hanno valore; li ottieni dai faucet dello stagenet.
- In modalità di prova, l'app di MoneroP2P accetta solo indirizzi stagenet.

## Buone pratiche

- Non condividere mai il seed, nemmeno con il supporto.
- Usa un nuovo indirizzo o sottoindirizzo per ogni swap se vuoi più privacy.
- Quando ricevi XMR, la rete richiede circa 10 conferme (circa 20 minuti) prima che tu possa spenderli.

Prossima: [cos'è Monero e in cosa si differenzia da Bitcoin](/it/guides/what-is-monero/).
