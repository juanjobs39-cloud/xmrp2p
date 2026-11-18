---
key: trust
lang: it
title: "MoneroP2P è affidabile e sicuro? Come verificarlo da solo"
description: "Cosa puoi verificare da solo prima di fidarti di MoneroP2P: contratto, codice, commissioni e limiti. E cosa manca ancora, come un audit esterno."
updated: 2026-11-10
faq:
  - q: "MoneroP2P è affidabile?"
    a: "MoneroP2P è una piattaforma open source e senza custodia che funziona con denaro reale dal 26 ottobre 2026. Il suo contratto di swap non ha funzioni di amministrazione e il codice è verificato su Sourcify, quindi le affermazioni principali si possono controllare su fonti pubbliche. È un progetto giovane senza audit esterno, per questo ogni atomic swap è limitato a 100 USDT."
  - q: "MoneroP2P può prendere i miei fondi?"
    a: "Non in un atomic swap: gli USDT sono in un contratto senza funzioni di amministrazione, pausa o aggiornamento, e gli XMR sono in un indirizzo che richiede entrambe le metà della chiave. In P2P Fiat gli XMR sono in un escrow multisig 2 su 3 che nessuna parte può muovere da sola, MoneroP2P compreso. Gli exchange istantanei tramite Trocador sono diversi: l'exchange scelto custodisce i fondi durante lo scambio."
  - q: "MoneroP2P è stato sottoposto ad audit?"
    a: "Non ancora da una società esterna. Il contratto ha superato verifiche automatiche con Halmos (7/7 proprietà dimostrate), Aderyn (0 problemi alti) e Slither (nessun problema medio o alto), e il rapporto e le esecuzioni sono pubblici. Finché non ci sarà un audit esterno, il contratto limita ogni swap a 100 USDT."
---

**In breve:** MoneroP2P è una piattaforma open source e senza custodia che funziona con denaro reale dal 26 ottobre 2026. Non devi crederci sulla parola: ogni affermazione qui sotto si può verificare su fonti pubbliche. È anche un progetto giovane senza audit esterno, quindi i limiti sono bassi di proposito.

## Cosa puoi verificare da solo

| Affermazione | Come verificarla |
|---|---|
| Nessuno custodisce i tuoi USDT in un atomic swap | Il contratto non ha funzioni di amministrazione, pausa o aggiornamento. Leggi il codice verificato su [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match) o su [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| Il contratto è stato verificato | Halmos ha dimostrato 7 proprietà su 7, Aderyn ha trovato 0 problemi alti e Slither nessun problema medio o alto. Vedi il [rapporto](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) e le [esecuzioni pubbliche](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Limiti e commissioni non possono aumentare | Il massimo di 100 USDT per swap e il tetto dell'1% alle commissioni sono costanti nel contratto. La commissione attuale è dello 0,5%, pagata dal maker. |
| Il sito esegue il codice pubblicato | Tutto il codice è su [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) con licenza AGPL-3.0. Ogni release pubblica gli [SHA256SUMS](/SHA256SUMS) per confrontare i file caricati con la tua build. |
| P2P Fiat non può muovere i tuoi XMR da solo | Ogni ordine usa un multisig Monero 2 su 3: acquirente, venditore e arbitro hanno una chiave ciascuno e ne servono due. Vedi [come funziona P2P Fiat](https://fiat.monerop2p.app/it/how-it-works/). |
| Le tue chiavi restano a te | Le chiavi vengono generate nel tuo browser. L'app di swap non ha account e le sue pagine applicano una Content Security Policy rigorosa che puoi leggere nel sorgente. |
| Ha funzionato con fondi reali | Il primo swap su mainnet si è completato il 26 ottobre 2026. Ogni swap crea il proprio contratto tramite la factory, visibile su Arbiscan. |

## Limiti e cosa ci manca ancora

- **Nessun audit esterno.** Le verifiche sopra sono strumenti automatici, non la revisione di una società di audit. Per questo il contratto limita ogni swap a 100 USDT.
- **Progetto giovane.** Lanciato a ottobre 2026. Il volume è basso e P2P Fiat ha pochi annunci in alcune valute.
- **Gli exchange istantanei hanno custodia.** Gli swap da BTC, ETH e altre monete passano da exchange terzi tramite Trocador: l'exchange scelto custodisce i fondi per qualche minuto e la quotazione include un margine dell'1% per MoneroP2P.
- **P2P Fiat protegge gli XMR, non il pagamento bancario.** Il pagamento in valuta avviene fuori dalla piattaforma. I metodi reversibili come PayPal o le carte sono più rischiosi, e le controversie le decide l'arbitro, gestito da noi.
- **Sei responsabile delle tue chiavi.** Se perdi il file di recupero o la password dell'account, non possiamo ripristinarli.
- **Nessuna garanzia aziendale.** Non c'è assicurazione sui depositi né assistenza telefonica. Leggi l'[avviso sui rischi](/it/risk-notice/).

## Chi c'è dietro e come contattarci

MoneroP2P è un progetto open source indipendente. Il protocollo si basa sugli atomic swap di AthanorLabs. Puoi contattarci dalla [pagina contatti](/it/contact/) e segnalare vulnerabilità in privato dalla scheda Security del repository. Non ti chiederemo mai il seed, il file di recupero o un pagamento per «sbloccare» uno swap.

## Prima di usarlo

1. Inizia con un importo piccolo.
2. Leggi [come funziona](/it/how-it-works/) e la [pagina sulla sicurezza](/it/security/).
3. Non fare mai scambi fuori dalla piattaforma, anche se qualcuno te lo chiede.
