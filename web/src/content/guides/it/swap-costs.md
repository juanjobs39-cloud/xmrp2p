---
key: swap-costs
lang: it
slug: how-much-does-it-cost-to-swap-usdt-for-monero
title: Quanto costa davvero scambiare USDT con Monero
description: "Cosa paghi quando scambi USDT con XMR: margine sul prezzo, commissione, gas e commissione di rete. Come calcolare il costo totale e confrontare con un solo numero."
published: 2026-10-30
updated: 2026-10-30
order: 10
related: [buy-xmr-no-kyc, swap-usdt-xmr, usdt-networks]
---

**In breve:** il costo totale di uno scambio da USDT a Monero ha quattro parti: il **margine sul prezzo** (quanti XMR ricevi rispetto al prezzo di mercato), la **commissione del servizio**, il **gas** sulla rete di USDT e la **commissione della rete Monero**. Per confrontare non serve sommare tutto: guarda solo **quanti XMR ricevi per lo stesso importo di USDT**. Chi ti dà più XMR costa meno.

## Le quattro parti del costo

| Parte | Cos'è | Ordine di grandezza |
|---|---|---|
| Margine sul prezzo | La differenza tra il prezzo di mercato e quello che ti offrono | La parte più grande; dipende dal venditore |
| Commissione del servizio | Quanto chiede la piattaforma o l'exchange | Variabile; a volte già inclusa nel prezzo |
| Gas | Quanto chiede la rete di USDT per le tue transazioni | Su Arbitrum, di solito centesimi |
| Commissione della rete Monero | Quanto chiede Monero per inviarti gli XMR | Di solito una frazione di centesimo |

Margine e commissione sono spesso **inclusi nella quotazione**, quindi non li vedi separati. Per questo il numero che conta sono gli XMR finali.

## Come calcolare il costo reale

1. Cerca il **prezzo di riferimento** di XMR in USDT su un sito di quotazioni.
2. Dividi quanto invii per quel prezzo: sono gli XMR che otterresti senza costi.
3. Confrontalo con quanto ti offrono. La differenza, in percentuale, è il tuo costo totale.

**Esempio con numeri inventati**, solo per mostrare il calcolo: se XMR vale 300 USDT e invii 50 USDT, senza costi otterresti 0,1667 XMR.

| Opzione | Ricevi | Costo totale |
|---|---|---|
| A | 0,1625 XMR | 2,5% |
| B | 0,1640 XMR | 1,6% |

L'opzione B costa meno anche se la sua «commissione» pubblicizzata fosse più alta: conta quanti XMR arrivano nel tuo wallet.

## Quanto costa su MoneroP2P

- **Commissione della piattaforma: 0,5%**, pagata dal maker quando incassa i suoi USDT. Il prezzo pubblicato di ogni maker include già il suo margine; l'app mostra gli XMR esatti **prima** che tu depositi.
- **Gas su Arbitrum One:** paghi il deposito e la conferma (e il rimborso, se serve). Il tuo wallet mostra il costo esatto prima di firmare.
- **Commissione della rete Monero:** viene detratta quando ti vengono inviati gli XMR.
- **I rimborsi non pagano commissioni di piattaforma**, solo il gas.

Nella vista semplice dell'[app](/it/app/) scrivi quanti USDT invii e vedi tutte le quotazioni ordinate per XMR ricevuti, quindi il confronto è già fatto.

## Costi che all'inizio non vedi

- **Spostare gli USDT tra reti.** Se i tuoi USDT sono su Tron o Ethereum e il servizio usa Arbitrum, spostarli costa commissioni e tempo. A volte più dello swap stesso. [Differenze tra reti](/it/guides/usdt-trc20-vs-erc20-vs-l2/).
- **Tasso variabile o fisso.** Negli exchange istantanei un tasso **variabile** può cambiare mentre arriva il tuo deposito; un tasso **fisso** garantisce l'importo ma di solito dà meno XMR.
- **Importi piccoli.** Gas e commissione di rete sono quasi fissi, quindi pesano di più sugli swap piccoli.
- **Tempo.** Uno swap che dura un'ora ti espone ai movimenti di prezzo. Su MoneroP2P l'importo in XMR viene fissato quando richiedi lo swap.

## Consigli per pagare meno

- Confronta sempre per **XMR ricevuti**, non per la commissione pubblicizzata.
- Scambia dalla **rete dove sono già i tuoi USDT**, se il servizio la supporta.
- Evita importi molto piccoli se puoi metterne insieme uno più grande (fino a 100 USDT per swap su MoneroP2P).
- Tieni un po' di **ETH su Arbitrum** per il gas, così non devi comprarlo di fretta.

Se non sai ancora quale opzione usare, inizia da [come comprare Monero senza KYC](/it/guides/how-to-buy-monero-without-kyc/).
