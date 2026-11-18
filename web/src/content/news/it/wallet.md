---
key: wallet-launch
lang: it
slug: monerop2p-wallet-monero-browser-extension
title: "MoneroP2P Wallet: un'estensione Monero per Chrome e Firefox"
description: "Arriva MoneroP2P Wallet: un wallet Monero senza custodia per il tuo browser, con XMR più USDT ed ETH su Arbitrum da una sola seed, e swap senza MetaMask."
published: 2026-11-05
keywords:
  - estensione Monero per browser
  - estensione Chrome wallet Monero
  - wallet XMR per Firefox
  - wallet Monero senza custodia
  - wallet Monero e USDT
  - MetaMask per Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/it/wallet/
    description: "Estensione per browser open source (AGPL-3.0) e senza custodia per Monero (XMR) e USDT/ETH su Arbitrum One."
howto:
  name: "Come iniziare con MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Installa l'estensione"
      text: "Vai su monerop2p.app/it/wallet e scegli lo store del tuo browser: Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons o Edge Add-ons."
    - name: "Crea il tuo wallet"
      text: "Apri l'estensione, scegli «Crea wallet» e imposta una password lunga e unica. Il wallet viene cifrato con essa sul tuo dispositivo."
    - name: "Scrivi la seed su carta"
      text: "Annota la seed da 25 parole su carta e conservala in un posto sicuro. È l'unico modo per recuperare i tuoi XMR e il tuo account Arbitrum."
    - name: "Ricevi XMR"
      text: "In «Ricevi» il wallet ti dà un nuovo sottoindirizzo con codice QR per ogni pagamento."
    - name: "Compra XMR da Esplora"
      text: "In «Esplora» apri l'exchange da USDT a XMR o P2P Fiat. Il wallet si collega da solo e compila il tuo indirizzo Monero."
faq:
  - q: "Cos'è MoneroP2P Wallet?"
    a: "Un wallet Monero (XMR) senza custodia realizzato come estensione per Chrome, Brave, Edge, Opera e Firefox. La stessa seed ti dà un account Monero e un account Arbitrum One per USDT ed ETH. È gratuito e open source (AGPL-3.0). Pagina ufficiale: https://monerop2p.app/it/wallet/"
  - q: "Esiste un'estensione Monero per Chrome?"
    a: "Sì. MoneroP2P Wallet funziona su Chrome e sugli altri browser Chromium (Brave, Edge, Opera) oltre che su Firefox. Esegue wallet2, il wallet ufficiale di Monero, compilato in WebAssembly dentro il browser."
  - q: "Un wallet Monero nel browser è sicuro?"
    a: "Le chiavi sono salvate cifrate con Argon2id e XChaCha20-Poly1305, il wallet si blocca da solo dopo 15 minuti, e l'estensione non carica codice remoto e non ha analytics. Conserva la tua seed su carta: è l'unico modo per recuperare i tuoi fondi."
  - q: "Quanto costa?"
    a: "L'estensione è gratuita. Ogni invio di XMR su mainnet paga la commissione della rete Monero più una commissione MoneroP2P dello 0,25%, mostrata su una riga separata prima di confermare. Ricevere, inviare ai tuoi indirizzi e gli invii su Arbitrum non pagano commissioni MoneroP2P."
  - q: "Posso usare la mia seed in altri wallet?"
    a: "Sì. Usa la seed standard di Monero da 25 parole, compatibile con Cake Wallet, Feather e il wallet ufficiale. L'account Arbitrum usa una derivazione propria; per usarlo altrove, esporta la sua chiave privata dalle Impostazioni."
  - q: "Sostituisce MetaMask su MoneroP2P?"
    a: "Sì, su monerop2p.app e fiat.monerop2p.app. Il wallet si annuncia al sito tramite EIP-6963, e ogni connessione, firma o trasferimento chiede la tua approvazione in una finestra dell'estensione. Non si collega ad altri siti."
---

**In breve:** il **5 novembre 2026** abbiamo lanciato **MoneroP2P Wallet 0.2.0**, un **wallet Monero senza custodia per il tuo browser** che funziona su Chrome, Brave, Edge, Opera e Firefox. Una seed da 25 parole gestisce i tuoi **XMR** e un **account Arbitrum One con USDT ed ETH**, così puoi scambiare USDT con Monero su MoneroP2P **senza MetaMask** e senza copiare indirizzi avanti e indietro. È gratuito e open source.

[Vedi MoneroP2P Wallet →](/it/wallet/)

## Perché un wallet Monero nel browser

Finora usare Monero voleva dire un'app desktop (Feather o il wallet ufficiale) o un'app per telefono (Cake Wallet). I siti web parlano con MetaMask, ma MetaMask non supporta Monero. Scambiare USDT con XMR su un sito voleva dire **due wallet** e copiare indirizzi dall'uno all'altro.

MoneroP2P Wallet mette entrambi in un'unica estensione: i tuoi Monero e il tuo account Arbitrum stanno nello stesso posto, e i siti di MoneroP2P lo usano direttamente.

## Cosa fa

- **Wallet Monero completo:** crea o ripristina con la seed standard da 25 parole, saldo, cronologia con conferme e invii che mostrano la commissione esatta prima della trasmissione.
- **Un nuovo sottoindirizzo per ogni pagamento**, con codice QR, così nessuno può collegare i tuoi pagamenti.
- **USDT ed ETH su Arbitrum One:** la stessa seed crea il tuo account Arbitrum, con saldo, ricezione via QR e invio con commissione di rete stimata.
- **Esplora:** un clic apre l'[exchange da USDT a XMR](/it/app/) o [P2P Fiat](https://fiat.monerop2p.app/it/), dove compri XMR con la tua valuta locale.
- **Connessione ai siti:** su monerop2p.app e fiat.monerop2p.app il wallet compila il tuo indirizzo Monero e firma il deposito dello swap. Ogni passaggio chiede la tua approvazione in una finestra dell'estensione.
- **Il tuo nodo:** sostituisci il nodo di MoneroP2P con il tuo nelle Impostazioni.

## Come protegge i tuoi fondi

| Livello | Cosa fa |
|---|---|
| Senza custodia | La seed viene creata e resta sul tuo dispositivo. Niente account, server di chiavi o analytics. |
| Cassaforte cifrata | Argon2id (64 MiB) trasforma la tua password in una chiave e XChaCha20-Poly1305 cifra il wallet. |
| Blocco automatico | Dopo 15 minuti di inattività (configurabile) e alla chiusura del browser. |
| Niente codice remoto | Tutto il codice è dentro l'estensione, con una Content Security Policy rigorosa. |
| Solo due siti | L'estensione parla solo con monerop2p.app e fiat.monerop2p.app, e solo con la tua approvazione. |
| Approvazioni leggibili | Prima di firmare vedi in parole semplici cosa fa la transazione: trasferimento, autorizzazione di spesa o deposito di uno swap. |
| Controllo anti address poisoning | Ti avvisa se incolli un indirizzo che somiglia a uno che hai usato ma non è lo stesso. |
| Verificabile | Open source (AGPL-3.0) e pacchetto riproducibile con il suo SHA-256. |

**Conserva la tua seed su carta.** È l'unico modo per recuperare i tuoi fondi se perdi o cambi dispositivo.

## Confronto con altri wallet Monero

| | MoneroP2P Wallet | Feather | Cake Wallet | GUI ufficiale |
|---|---|---|---|---|
| Funziona su | Browser (estensione) | Desktop | Telefono e desktop | Desktop |
| Seed da 25 parole | Sì | Sì | Sì | Sì |
| USDT su Arbitrum | Sì | No | Altre reti | No |
| Si collega ai siti web | Sì (solo MoneroP2P) | No | No | No |
| Open source | Sì | Sì | Sì | Sì |

Per grandi risparmi a lungo termine, un wallet desktop o hardware resta la scelta migliore. MoneroP2P Wallet è fatto per **comprare, ricevere e muovere XMR ogni giorno** dal tuo browser.

## Commissioni

- **Estensione:** gratuita.
- **Invii di XMR su mainnet:** commissione della rete Monero più una commissione MoneroP2P dello **0,25%**, mostrata su una riga separata prima di confermare. Gli importi la cui commissione sarebbe inferiore a 0,00001 XMR non la pagano.
- **Senza commissione MoneroP2P:** ricezione, invii ai tuoi indirizzi, stagenet e invii su Arbitrum (lì paghi solo la rete).

## Come iniziare

1. Vai su [monerop2p.app/it/wallet](/it/wallet/) e scegli lo store del tuo browser.
2. Crea il wallet con una password lunga e unica.
3. **Scrivi la seed da 25 parole su carta.** È l'unico modo per recuperare i tuoi fondi.
4. Ricevi XMR con il sottoindirizzo in «Ricevi», o compralo da **Esplora**.

Ancora niente Monero? Vedi [tutti i modi per comprare XMR](/it/buy-monero/) o la guida [come creare un wallet Monero](/it/guides/how-to-create-a-monero-wallet/).

## FAQ

### Cos'è MoneroP2P Wallet?
Un wallet Monero senza custodia come estensione per Chrome, Brave, Edge, Opera e Firefox, con un account Arbitrum One per USDT ed ETH dalla stessa seed.

### Esiste un'estensione Monero per Chrome?
Sì. MoneroP2P Wallet funziona su Chrome e sugli altri browser Chromium, e su Firefox. Esegue wallet2, il wallet ufficiale di Monero, compilato in WebAssembly.

### Un wallet Monero nel browser è sicuro?
Le chiavi sono cifrate, il wallet si blocca da solo e l'estensione non carica codice remoto.

### Quanto costa?
È gratuito. Gli invii di XMR pagano la commissione di rete più lo 0,25% a MoneroP2P, mostrato prima di confermare.

### Posso usare la mia seed in altri wallet?
Sì, la seed da 25 parole funziona con Cake Wallet, Feather e il wallet ufficiale. La chiave Arbitrum si esporta dalle Impostazioni.

### Sostituisce MetaMask su MoneroP2P?
Sì, su monerop2p.app e fiat.monerop2p.app. Ogni connessione o firma chiede la tua approvazione.

Il codice è su [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Usare crypto comporta rischi: leggi l'[avviso sui rischi](/it/risk-notice/).

[Vedi MoneroP2P Wallet →](/it/wallet/)

Preferisci non installare nulla? Ogni account P2P Fiat include ora un wallet web senza custodia: [wallet Monero e USDT nel tuo account](/it/news/non-custodial-monero-and-usdt-wallet-in-your-account/).
