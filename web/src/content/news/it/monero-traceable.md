---
key: monero-traceable
lang: it
slug: is-monero-traceable-xmr-vs-bitcoin-vs-zcash
title: "Monero è tracciabile? Privacy di XMR, Bitcoin e Zcash nel 2026"
description: "Cosa nasconde Monero, cosa no, e come si confronta con Bitcoin e Zcash. Più cosa cambia con FCMP++ e come usare XMR in modo più privato nel 2026."
published: 2026-11-06
keywords:
  - Monero è tracciabile
  - Monero è anonimo
  - Monero vs Bitcoin privacy
  - Monero vs Zcash
  - criptovaluta più privata
  - Monero FCMP++
  - come funziona la privacy di Monero
  - firme ad anello Monero
howto:
  name: "Come usare Monero in modo più privato"
  totalTime: PT20M
  steps:
    - name: "Usa un wallet senza custodia"
      text: "Tieni i tuoi XMR in un wallet di cui solo tu hai la seed, come MoneroP2P Wallet, Feather o Cake Wallet. Un exchange sa chi sei e cosa prelevi."
    - name: "Ricevi ogni pagamento su un nuovo sottoindirizzo"
      text: "Genera un sottoindirizzo diverso per ogni pagamento o persona, così nessuno può collegare i tuoi pagamenti in entrata."
    - name: "Collegati a un nodo di fiducia"
      text: "Usa il tuo nodo o uno di cui ti fidi. Il nodo vede il tuo indirizzo IP quando invii una transazione."
    - name: "Compra senza KYC"
      text: "Compra XMR da persona a persona o con un atomic swap, senza dare i tuoi documenti a un exchange che collega il tuo nome ai tuoi prelievi."
    - name: "Non muovere tutto in una volta"
      text: "Evita di rispedire l'importo esatto appena comprato subito dopo averlo ricevuto. Gli schemi di orari e importi sono gli indizi più usati per indovinare."
faq:
  - q: "Monero è tracciabile?"
    a: "Non come Bitcoin. La blockchain di Monero non mostra mittente, destinatario né importo, perché usa indirizzi stealth, firme ad anello e RingCT. Ciò che può far trapelare informazioni avviene fuori dalla catena: un exchange con KYC, un nodo che registra il tuo IP, o schemi di orari e importi."
  - q: "Monero è anonimo al 100%?"
    a: "Nessuna tecnologia è anonima al 100%. Monero nasconde di default chi invia, chi riceve e quanto, ma le firme ad anello nascondono il mittente tra 16 candidati, e l'analisi statistica può stimare quello vero in alcuni casi. L'aggiornamento FCMP++ punta a eliminare questa debolezza."
  - q: "Cos'è FCMP++?"
    a: "Full-Chain Membership Proofs. Sostituisce le firme ad anello da 16 membri: invece di nascondere il tuo output tra 16, lo nasconde tra tutti gli output della blockchain. A novembre 2026 non è attivo sulla mainnet; una bozza non ufficiale degli sviluppatori indica circa marzo 2027."
  - q: "Cos'è più privato, Monero o Zcash?"
    a: "Zcash ha una crittografia molto forte (zk-SNARKs) quando usi indirizzi schermati, ma la privacy è facoltativa ed esistono anche indirizzi trasparenti come quelli di Bitcoin. Su Monero ogni transazione è privata, quindi usarlo non ti fa notare. Per questo Monero è di solito considerato più privato nella pratica."
  - q: "Bitcoin è anonimo?"
    a: "No. Bitcoin è pseudonimo: ogni transazione, indirizzo e importo è pubblico per sempre. Le società di analisi on-chain collegano gli indirizzi alle persone tramite exchange con KYC e abitudini d'uso."
  - q: "È legale usare Monero?"
    a: "Nella maggior parte dei paesi possedere e usare Monero è legale. Ciò che è stato limitato è che gli exchange regolamentati lo offrano; nell'Unione Europea questo divieto si applica da luglio 2027. Verifica le leggi del tuo paese."
---

**In breve:** **la blockchain di Monero (XMR) non mostra mittente, destinatario né importo** di nessuna transazione, quindi **non si può tracciare come Bitcoin**, dove tutto è pubblico. Monero ci riesce con **indirizzi stealth, firme ad anello da 16 membri e RingCT**, applicati di default a ogni transazione, a differenza di **Zcash**, dove la privacy è facoltativa. I suoi punti deboli sono fuori dalla catena: **exchange con KYC, il tuo IP e le abitudini d'uso**. Il prossimo aggiornamento, **FCMP++**, non è ancora attivo (obiettivo della bozza: **marzo 2027**) e rafforzerà proprio la parte più debole.

[Compra Monero senza KYC →](/it/buy-monero/)

## Monero vs Bitcoin vs Zcash: tabella di confronto

| | Monero (XMR) | Bitcoin (BTC) | Zcash (ZEC) |
|---|---|---|---|
| Privato di default | Sì, ogni transazione | No | No, facoltativo |
| Mittente | Nascosto (firma ad anello da 16) | Pubblico | Nascosto solo con indirizzi schermati |
| Destinatario | Nascosto (indirizzi stealth) | Pubblico | Nascosto solo con indirizzi schermati |
| Importo | Nascosto (RingCT) | Pubblico | Nascosto solo con indirizzi schermati |
| Origine IP all'invio | Protetta da Dandelion++ | Visibile ai nodi | Visibile ai nodi |
| In un block explorer | Solo dati cifrati | Storico completo | Dipende dal tipo di indirizzo |
| Verificare il tuo wallet | View key | Sempre pubblico | Viewing key |
| Mining | RandomX (CPU) | SHA-256 (ASIC) | Equihash (ASIC) |
| Tempo di blocco | ~2 minuti | ~10 minuti | ~75 secondi |

La differenza chiave è **di default**. Se una moneta ti fa scegliere tra transazioni pubbliche e private, chi sceglie quelle private si fa notare. Su Monero tutte le transazioni si somigliano, quindi la tua si confonde con tutte le altre.

## Come Monero nasconde ogni dato

### Chi riceve: indirizzi stealth
Ogni volta che qualcuno ti paga, il wallet del mittente crea un **indirizzo monouso** derivato dal tuo. Il tuo indirizzo pubblico non compare mai sulla blockchain, quindi nessuno vede quanti pagamenti hai ricevuto. In più puoi usare **sottoindirizzi**: uno diverso per ogni persona o pagamento.

### Chi invia: firme ad anello
Quando spendi XMR, la tua transazione firma insieme a **15 output di altre persone** presi dalla blockchain (16 in totale dall'aggiornamento di agosto 2022). Un osservatore sa che uno dei 16 è quello vero, ma non quale. Una **key image** impedisce di spendere due volte lo stesso output senza rivelare quale fosse.

### Quanto: RingCT
Da gennaio 2017 gli importi sono cifrati con le **Ring Confidential Transactions**. La rete verifica che non si creino monete dal nulla senza vedere gli importi.

### Da dove: Dandelion++
Dal 2020 le transazioni passano prima da alcuni nodi casuali e poi vengono diffuse a tutta la rete. Così è più difficile capire quale IP l'ha inviata per primo.

## Quindi, Monero è tracciabile?

Sulla blockchain, non come Bitcoin. Ma ci sono limiti che conviene conoscere:

- **Le firme ad anello sono probabilistiche.** Nascondono il mittente tra 16, non tra tutti. L'analisi statistica (età degli output, spese concatenate o un attore che controlla più esche) può **stimare** quello vero in alcuni casi. Non è una prova, ma riduce l'anonimato.
- **Il nodo vede il tuo IP.** Se usi il nodo di qualcun altro, quel nodo sa da quale IP hai inviato. Nel 2024 è trapelato un video di una società di analisi on-chain che sosteneva di collegare transazioni Monero usando **nodi malevoli** che registravano gli IP.
- **Il KYC ti tradisce fuori dalla catena.** Se compri XMR su un exchange che ha i tuoi documenti, l'exchange sa che hai prelevato un certo importo a una certa ora. Con questo può indovinare dove è andato.
- **Le abitudini parlano.** Rispedire l'importo esatto appena ricevuto, sempre alla stessa ora, rende più facile indovinare.

Nessuno di questi limiti rompe la crittografia di Monero; tutti sfruttano informazioni che lasci intorno. Per questo come lo usi conta quanto la moneta stessa.

## FCMP++: cosa arriva

**FCMP++ (Full-Chain Membership Proofs)** sostituisce le firme ad anello. Invece di nascondere il tuo output tra 16, lo nasconde **tra tutti gli output della storia di Monero**, oltre cento milioni. Questo elimina quasi tutti gli attacchi statistici agli anelli. Arriva insieme a **Carrot**, un nuovo schema di indirizzi.

**Stato a novembre 2026:**
- A ottobre 2026 è in prova su **reti di test** (testnet e stressnet), non sulla mainnet.
- Una bozza degli sviluppatori, che loro stessi definiscono **non vincolante**, punta all'attivazione sulla mainnet intorno a **marzo 2027**.
- **Non c'è una data ufficiale.** Controlla [getmonero.org](https://www.getmonero.org/) prima di fidarti di una data.

Quando arriverà non dovrai fare niente di speciale con i tuoi XMR: aggiorna semplicemente il wallet a una versione compatibile.

## Come usare Monero in modo più privato

1. **Wallet senza custodia.** Usa un wallet di cui solo tu hai la seed, come [MoneroP2P Wallet](/it/wallet/), Feather o Cake Wallet. Guida: [come creare un wallet Monero](/it/guides/how-to-create-a-monero-wallet/).
2. **Un nuovo sottoindirizzo per pagamento.** MoneroP2P Wallet ne crea già uno diverso ogni volta che apri «Ricevi».
3. **Un nodo di fiducia.** Usa il tuo nodo se puoi; in MoneroP2P Wallet lo cambi nelle Impostazioni.
4. **Compra senza KYC.** Usa [P2P Fiat](https://fiat.monerop2p.app/it/) con la tua valuta locale o un [atomic swap da USDT a XMR](/it/guides/how-to-swap-usdt-for-monero-without-intermediaries/). Altre opzioni in [come comprare Monero senza KYC](/it/guides/how-to-buy-monero-without-kyc/).
5. **Aspetta e non copiare gli importi.** Lascia passare un po' di tempo prima di muovere di nuovo ciò che hai ricevuto, e non rispedire la cifra esatta.

## Altre «privacy coin» a confronto con Monero

- **Litecoin (MWEB):** privacy facoltativa in un blocco di estensione separato; la maggior parte dell'uso resta pubblica.
- **Dash:** la sua funzione di mixing (CoinJoin) è facoltativa e gli importi restano visibili.
- **Bitcoin con CoinJoin:** il mixing aiuta, ma gli output mixati sono riconoscibili e alcuni exchange li bloccano.

In tutte la privacy è un extra da attivare. Su Monero è la regola.

## FAQ

### Monero è tracciabile?
Non come Bitcoin: la blockchain non mostra mittente, destinatario né importo. Ciò che può tradirti è fuori dalla catena: KYC, il tuo IP e le tue abitudini.

### Monero è anonimo al 100%?
Niente lo è. Le firme ad anello nascondono il mittente tra 16 e l'analisi statistica può stimare quello vero in alcuni casi. FCMP++ punta a risolverlo.

### Cos'è FCMP++?
L'aggiornamento che nasconde il tuo output tra tutti gli output della blockchain invece che tra 16. A novembre 2026 non è attivo; la bozza punta a marzo 2027.

### Cos'è più privato, Monero o Zcash?
Nella pratica Monero, perché la sua privacy è obbligatoria. Zcash è molto forte con indirizzi schermati ma permette anche transazioni pubbliche.

### Bitcoin è anonimo?
No. È pseudonimo e tutta la sua storia è pubblica.

### È legale usare Monero?
Nella maggior parte dei paesi sì. Ciò che è limitato è che gli exchange regolamentati lo offrano: leggi [perché Monero è stato delistato](/it/news/monero-delisted-where-to-buy-xmr-in-2026/).

Per le basi, leggi [cos'è Monero e in cosa si differenzia da Bitcoin](/it/guides/what-is-monero/). Usare crypto comporta rischi: leggi l'[avviso sui rischi](/it/risk-notice/).

[Compra Monero senza KYC →](/it/buy-monero/)
