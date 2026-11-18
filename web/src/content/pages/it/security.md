---
key: security
lang: it
title: Sicurezza di MoneroP2P
description: "Perché nessuno custodisce i tuoi fondi, come funzionano i rimborsi, quali rischi esistono e come verificare il codice. Verificato con Halmos, Aderyn e Slither."
updated: 2026-10-27
---

**In breve:** su MoneroP2P nessuno custodisce fondi. I tuoi USDT sono in un contratto che rilascia denaro solo secondo regole pubbliche, e gli XMR sono in un indirizzo che nessuno può muovere senza entrambe le metà della chiave. Funziona con denaro reale su Arbitrum One + Monero, con un **massimo di 100 USDT per swap imposto dal contratto**. Il contratto è verificato con Halmos, Aderyn e Slither e il codice è pubblicato su Sourcify; non ha ancora avuto un audit esterno, per questo ogni swap ha un limite.

## Perché nessuno custodisce i tuoi fondi

- **Gli USDT** sono in un contratto dedicato al tuo swap. Non ha funzioni di amministrazione: né noi né il maker possiamo prelevarli, se non tramite `claim` e `refund`.
- **Gli XMR** sono in un indirizzo condiviso. Il maker non può riprenderli senza la tua metà della chiave, e tu non puoi prenderli senza la sua.
- **Le tue chiavi** vengono generate nel tuo browser e non vengono mai inviate ai nostri server. Il backend rifiuta qualsiasi messaggio che contenga una chiave privata completa.

## Come funzionano i rimborsi

| Situazione | Cosa succede |
|---|---|
| Il maker non deposita gli XMR | Chiedi il rimborso prima di t0 (te lo chiede l'app) |
| Il maker deposita meno XMR | Non confermi e chiedi il rimborso prima di t0 |
| Hai confermato e il maker non incassa | Chiedi il rimborso da t1 |
| Hai chiuso la scheda | Torna con il tuo [file di recupero](/it/guides/what-to-do-if-you-closed-the-tab/) |

## Rischi da conoscere

1. **Scadenze.** Se non chiedi il rimborso in tempo quando gli XMR non sono arrivati, puoi perdere gli USDT. L'app ti avvisa, ma deve essere aperta o devi tornare con il file.
2. **File di recupero.** Senza di esso e la sua password non puoi né reclamare gli XMR né chiedere il rimborso. Non possiamo recuperarlo per te.
3. **Congelamenti di USDT.** Tether può congelare indirizzi. Ogni swap usa un contratto separato, ma il rischio esiste.
4. **Nessun audit esterno per ora.** Il contratto ha superato verifiche automatiche (Halmos, Aderyn, Slither), ma il software può comunque avere bug. Il limite di 100 USDT per swap limita quanto un singolo swap può mettere a rischio.
5. **Privacy.** Il proxy del nodo Monero vede cosa chiede il tuo browser. Puoi usare il tuo nodo.

## Come proteggiamo l'app

- **Content Security Policy** rigorosa: l'app esegue solo il proprio codice.
- **Subresource Integrity** su script e stili, e l'integrità del nucleo crittografico viene verificata prima dell'uso.
- **Nessuno script di terzi**, nessuna analisi, nessun cookie.
- **Build verificabili:** pubblichiamo gli `SHA256SUMS` di ogni file e una copia su IPFS.

## Audit

Il contratto è stato verificato con strumenti liberi e aperti: **Halmos** (verifica simbolica, 7/7 proprietà dimostrate per tutti gli input), **Aderyn** (0 problemi alti) e **Slither** (nessun problema medio o alto). Il codice è verificato su **Sourcify** (exact match). Rapporto: [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). Un audit esterno è ancora in sospeso; il perimetro preparato è in [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md).

## Codice sorgente e segnalazioni

Open source (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). Per segnalare una vulnerabilità, usa la segnalazione privata di GitHub come descritto in `SECURITY.md`.
