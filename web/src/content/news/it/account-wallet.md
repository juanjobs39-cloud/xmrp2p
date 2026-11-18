---
key: account-wallet
lang: it
slug: non-custodial-monero-and-usdt-wallet-in-your-account
title: "Un wallet Monero e USDT senza custodia nel tuo account MoneroP2P"
description: "Il tuo account MoneroP2P ora include un wallet per Monero (XMR), USDT ed ETH su Arbitrum: senza KYC, senza custodia, invii tramite @nickname e backup da 12 parole."
published: 2026-11-15
keywords:
  - wallet Monero senza custodia
  - wallet web Monero
  - wallet Monero e USDT
  - wallet XMR senza KYC
  - inviare Monero con nome utente
  - wallet Monero nel browser
  - wallet USDT Arbitrum senza registrazione
  - scambiare USDT con Monero dal wallet
  - account MoneroP2P
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/it/
    description: "Mercato P2P per comprare e vendere Monero (XMR) con valuta locale, con escrow multisig 2 su 3 e senza KYC. Ogni account include un wallet senza custodia per Monero, USDT ed ETH su Arbitrum."
  - name: MoneroP2P
    url: https://monerop2p.app/it/app/
    description: "Exchange senza account per scambiare USDT, BTC, ETH e altre crypto con Monero (XMR)."
howto:
  name: "Come creare il tuo wallet Monero e USDT su MoneroP2P"
  totalTime: PT5M
  steps:
    - name: "Apri l'app e tocca «Crea account»"
      text: "Vai su fiat.monerop2p.app/it/app/. La barra dell'account in alto ha un pulsante «Crea account». Non si chiedono email, telefono né documenti."
    - name: "Scegli un nickname e una password"
      text: "Il nickname è pubblico; la password (almeno 10 caratteri) cifra il tuo account nel browser. Non si può recuperare se la dimentichi."
    - name: "Salva il tuo backup"
      text: "Scarica il file di backup cifrato e conservalo fuori dal dispositivo. Con esso e la tua password recuperi l'account su un altro telefono o computer."
    - name: "Copia il tuo indirizzo di ricezione"
      text: "In «Wallet» ottieni un indirizzo Monero e un indirizzo Arbitrum (lo stesso per USDT ed ETH), ciascuno con codice QR."
    - name: "Invia, richiedi o scambia"
      text: "Invia a un indirizzo o a un altro utente tramite @nickname, crea un link di pagamento, o tocca «Scambia monete» per passare da USDT a XMR senza copiare indirizzi."
faq:
  - q: "MoneroP2P tiene i miei fondi o le mie chiavi?"
    a: "No. Le chiavi vengono create nel tuo browser da una seed da 12 parole e salvate cifrate con la tua password. Il server non le riceve mai, quindi MoneroP2P non può vedere, muovere né congelare i tuoi fondi, e non può recuperarli se perdi sia il backup sia la password."
  - q: "Quali monete supporta il wallet dell'account?"
    a: "Monero (XMR) su mainnet, e USDT ed ETH su Arbitrum One. L'indirizzo Arbitrum è un account standard di tipo Ethereum: lo stesso funziona per USDT ed ETH."
  - q: "Quanto costa il wallet?"
    a: "Creare l'account, ricevere e inviare a un altro utente tramite @nickname non pagano commissioni della piattaforma. Prelevare verso un indirizzo esterno costa lo 0,5%, mostrato su una riga separata prima di confermare. I prelievi molto piccoli (sotto circa 0,002 XMR, 10 USDT o 0,004 ETH) non pagano, così come i depositi nell'escrow di un ordine P2P o in uno swap. La commissione di rete si paga a parte."
  - q: "Come recupero il wallet se perdo il telefono?"
    a: "Con il file di backup e la tua password, o con le 12 parole dell'account. Le 12 parole recuperano il nickname e i wallet; le chiavi di escrow degli ordini aperti sono solo nel file di backup, quindi riscaricalo dopo ogni ordine."
  - q: "Posso portare le mie chiavi in un altro wallet?"
    a: "Sì. In Wallet → Altre opzioni puoi esportare le 12 parole dell'account, la seed Monero da 25 parole (per Cake Wallet, Feather o il wallet ufficiale) e la chiave privata Arbitrum (per MetaMask e simili)."
  - q: "Serve un account per scambiare crypto con Monero?"
    a: "No. L'exchange senza account su monerop2p.app funziona come prima. L'account è facoltativo: fa arrivare ciò che scambi nel tuo wallet senza copiare indirizzi."
  - q: "Quanto è privato inviare tramite @nickname?"
    a: "Se attivi «Ricevi tramite nickname», il tuo indirizzo viene collegato al tuo nickname e chiunque può consultarlo. Su Monero questo non rivela cosa ricevi; su Arbitrum sì, perché quella rete è pubblica. Resta disattivato finché non lo attivi."
---

**In breve:** ogni account di [MoneroP2P Fiat](https://fiat.monerop2p.app/it/) ora include un **wallet senza custodia per Monero (XMR), USDT ed ETH su Arbitrum**. Si crea nel tuo browser con un nickname e una password, **senza email e senza KYC**; le chiavi non lasciano mai il tuo dispositivo. Puoi ricevere, inviare a un indirizzo o a un altro utente tramite **@nickname**, finanziare l'escrow di un ordine P2P e scambiare tra le tue monete senza copiare indirizzi.

[Crea il mio account e wallet →](https://fiat.monerop2p.app/it/app/#/cuenta)

## Cosa fa il wallet dell'account?

| Funzione | Come funziona |
|---|---|
| **Ricevi** | Un indirizzo Monero e un indirizzo Arbitrum (USDT ed ETH), ciascuno con codice QR. |
| **Invia** | A un indirizzo o a un @nickname. C'è sempre una schermata di riepilogo con importo, commissioni e totale prima di confermare. |
| **Invia tramite @nickname** | Scrivi `@nickname` invece di un indirizzo lungo. Senza commissione della piattaforma. |
| **Link di pagamento** | Crea un link o un QR con una moneta e un importo; chi lo apre con il suo account deve solo controllare e confermare. |
| **Scambia** | Passa da USDT a XMR (e viceversa) tra i tuoi wallet: il deposito viene inviato per te e ciò che compri arriva nel tuo wallet. |
| **Finanzia l'escrow** | Se vendi XMR sul mercato P2P, depositi nell'escrow dal tuo wallet con un pulsante. |
| **Cronologia** | Transazioni Monero con conferme e link all'explorer. |
| **Esporta le chiavi** | Le 12 parole dell'account, la seed Monero da 25 parole e la chiave privata Arbitrum. |

## Chi tiene le mie chiavi?

Tu. L'account parte da una **seed da 12 parole** generata nel tuo browser. La chiave dell'account, il wallet Monero e l'account Arbitrum derivano tutti da essa. Tutto viene salvato **cifrato con la tua password** nel browser e nel tuo file di backup.

- Il server non riceve mai la tua password, la tua seed o le tue chiavi.
- MoneroP2P **non può muovere né congelare** i tuoi fondi.
- Per lo stesso motivo, **nessuno può recuperarli** se perdi sia il backup sia la password. Conserva il backup fuori dal dispositivo.

Per vedere o esportare le chiavi l'app chiede di nuovo la password, così chi trova la scheda aperta non può vederle.

## Come invio Monero o USDT a un altro utente tramite @nickname?

1. In «Wallet», apri la scheda **Invia** di Monero o Arbitrum.
2. Inserisci `@nickname` come destinazione e l'importo.
3. Controlla e conferma.

L'indirizzo di ogni utente è **firmato con la sua chiave dell'account**, e il tuo browser verifica quella firma prima di inviare. Così né il server né chi lo avesse compromesso può sostituire l'indirizzo di qualcuno con un altro. L'app ricorda a chi hai inviato e **blocca il trasferimento se quel nickname ora appartiene a un altro account**.

La ricezione tramite nickname è disattivata finché non la attivi in Wallet → Altre opzioni.

## Quanto costa?

| Operazione | Commissione MoneroP2P |
|---|---|
| Creare un account e ricevere | 0 |
| Inviare a un altro utente tramite @nickname | 0 |
| Depositare nell'escrow di un ordine P2P | 0 |
| Depositare in uno swap | 0 |
| Prelevare verso un indirizzo esterno | **0,5%** |
| Prelievi molto piccoli (sotto circa 0,002 XMR, 10 USDT o 0,004 ETH) | 0 |

La commissione è mostrata **su una riga separata** nella schermata di riepilogo, insieme al totale che esce dal tuo wallet. La commissione di rete (Monero o Arbitrum) si paga a parte; per inviare USDT ti serve un po' di ETH su Arbitrum.

## Serve un account per scambiare crypto con Monero?

No. L'[exchange senza account](/it/app/) funziona come prima: scegli le monete, inserisci il tuo indirizzo e invii il deposito dal tuo wallet.

Con un account è più comodo: in «Scambia monete» scegli da quale wallet parte e in quale arriva, e l'app invia il deposito dopo una schermata di riepilogo. Questi scambi passano da **exchange istantanei** scelti con l'elenco di confronto (solo valutazione KYC A o B): per i pochi minuti dello scambio, l'exchange tiene le monete. Il wallet è senza custodia; lo scambio no.

## Cosa sapere prima di usarlo

- **È nuovo.** Inizia con importi piccoli finché non ti fidi.
- **Il wallet Monero si sincronizza nel tuo browser.** La prima volta può richiedere qualche minuto.
- **I Monero appena ricevuti impiegano circa 20 minuti** (10 conferme) per diventare spendibili.
- **Arbitrum è una rete pubblica:** chi conosce il tuo indirizzo può vedere cosa ricevi lì. Monero no.
- **Usa solo la rete Arbitrum** per USDT ed ETH. Se invii su un'altra rete, i fondi vanno persi.

Preferisci un wallet installato nel browser? Vedi [MoneroP2P Wallet, l'estensione per Chrome e Firefox](/it/news/monerop2p-wallet-monero-browser-extension/) o il confronto dei [migliori wallet Monero del 2026](/it/news/best-monero-wallets-2026/).

## Domande frequenti

### MoneroP2P tiene i miei fondi o le mie chiavi?
No. Le chiavi vengono create e restano nel tuo browser, cifrate con la tua password.

### Quali monete supporta il wallet?
Monero (XMR), e USDT ed ETH su Arbitrum One.

### Quanto costa?
Ricevere e inviare tramite @nickname non pagano commissioni della piattaforma. Prelevare verso un indirizzo esterno costa lo 0,5%, mostrato prima di confermare.

### Come lo recupero se perdo il telefono?
Con il file di backup e la tua password, o con le 12 parole dell'account.

### Posso portare le mie chiavi in un altro wallet?
Sì: puoi esportare le 12 parole, la seed Monero da 25 parole e la chiave privata Arbitrum.

### Serve un account per scambiare crypto con Monero?
No. L'[exchange senza account](/it/app/) è sempre disponibile.

Usare crypto comporta rischi: leggi l'[avviso sui rischi](/it/risk-notice/).

[Crea il mio account e wallet →](https://fiat.monerop2p.app/it/app/#/cuenta) · [Compra Monero con valuta locale →](https://fiat.monerop2p.app/it/app/)

Su Telegram? Il mercato si apre anche lì, con notifiche per i tuoi ordini: [comprare e vendere Monero su Telegram](/it/news/buy-monero-on-telegram-bot/).
