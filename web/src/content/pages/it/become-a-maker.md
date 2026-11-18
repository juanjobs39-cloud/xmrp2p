---
key: maker
lang: it
title: Diventa maker
description: "Un maker fornisce XMR e guadagna un margine sul prezzo di mercato. Dal browser senza installare nulla, o 24/7 con il tuo server."
updated: 2026-10-26
---

**In breve:** un maker ha XMR e li offre in cambio di USDT, con un margine sul prezzo di riferimento. Puoi farlo **dal browser senza installare nulla** (la scheda aperta fa da server) oppure **24/7 con il tuo server o computer**. In entrambi i casi nessuno custodisce i tuoi fondi. Funziona con denaro reale su Arbitrum One (massimo 100 USDT per swap) ed è disponibile anche una modalità di prova sul testnet.

## Due modi per essere maker

| | Nel browser (consigliato) | Il tuo server 24/7 |
|---|---|---|
| Per | Tutti | Maker tecnici |
| Configurazione | Nessuna: apri [la pagina del maker](/it/maker/) | Python, `monero-wallet-rpc` e il daemon ([guida](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| Quando offri | Finché la scheda è aperta su un computer | Sempre |
| Le tue chiavi | Nel tuo browser, cifrate con la tua password e in un backup | Sul tuo server |
| Pagamento in USDT | Direttamente sul tuo MetaMask | All'indirizzo che configuri |

**Inizia qui:** [Diventa maker dal browser →](/it/maker/)

## Cosa ti serve nel browser

| Requisito | Dettaglio |
|---|---|
| Un computer con la scheda aperta | I telefoni sospendono le schede |
| XMR da offrire | Inviali all'indirizzo che ti dà la pagina; si sbloccano dopo 10 conferme |
| Un po' di ETH per il gas | Per incassare; ricaricalo con un clic da MetaMask |
| Una password e il tuo file di backup | Senza backup non puoi ripristinare il maker in un altro browser |

## Come si fissa il prezzo

Il daemon prende la mediana di varie fonti pubbliche (Kraken, CoinGecko e KuCoin), scarta la quotazione se una fonte si allontana troppo dalla mediana e applica il tuo margine. Tu stabilisci:

- il margine sul prezzo di riferimento,
- l'importo minimo e massimo per swap,
- l'esposizione massima (XMR impegnati contemporaneamente),
- il numero di swap simultanei.

## Regole di sicurezza (browser e server)

- Non invia mai XMR senza un deposito on-chain valido.
- Non incassa mai se non ha bloccato gli XMR.
- Non prova a incassare negli ultimi minuti prima di t1.
- Simula ogni transazione prima di inviarla.
- Se il taker chiede il rimborso, recupera automaticamente gli XMR.

## Rischi per il maker

- **Volatilità:** il prezzo può muoversi tra la quotazione e l'incasso.
- **Disponibilità:** se chiudi la scheda (o il tuo server si ferma) tra t0 e t1, non verrai pagato; il taker chiederà il rimborso e dovrai tornare a recuperare i tuoi XMR.
- **Backup:** il file di backup (o il database del daemon) contiene le metà della chiave di ogni swap; senza non puoi recuperare gli XMR.
- **Normativa:** fare il maker può avere implicazioni legali nel tuo paese. Verifica prima di iniziare.

Niente di tutto questo garantisce guadagni. La guida completa all'installazione è in [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
