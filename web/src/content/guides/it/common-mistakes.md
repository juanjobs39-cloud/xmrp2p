---
key: common-mistakes
lang: it
slug: common-mistakes-when-sending-crypto
title: Errori comuni quando invii crypto (e come evitarli)
description: "Rete sbagliata, memo o tag dimenticato, importi minimi, niente gas, indirizzi avvelenati e approvazioni illimitate: come evitare di perdere fondi."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**In breve:** gli errori più costosi sono inviare sulla rete sbagliata, dimenticare il memo o il tag richiesto da un exchange, inviare meno del minimo, restare senza gas e copiare un indirizzo falso. Controlla rete, indirizzo completo e importo prima di firmare: le transazioni non si possono annullare.

## Errore 1: inviare sulla rete sbagliata

Lo stesso token esiste su più reti (per esempio USDT su Tron, Ethereum e Arbitrum). Se invii su una rete che il destinatario non supporta, i fondi possono andare persi o richiedere un recupero costoso.

**Come evitarlo:** conferma la rete con il destinatario. L'app di MoneroP2P mostra solo le reti attive.

## Errore 2: dimenticare memo, tag o payment ID

Alcuni exchange condividono un indirizzo tra molti clienti e ti identificano con un memo o tag. Senza, il deposito può restare non assegnato.

**Come evitarlo:** se l'exchange mostra un memo o tag, includilo sempre. Su Monero gli exchange di solito ti danno un sottoindirizzo tuo e non serve il payment ID.

## Errore 3: inviare meno del minimo

Exchange e servizi hanno importi minimi di deposito. Sotto quella soglia, il deposito potrebbe non essere accreditato. Su MoneroP2P ogni offerta mostra il suo minimo e massimo.

## Errore 4: restare senza gas

Per muovere USDT ti serve la moneta della rete (ETH, TRX…). Senza, non puoi depositare né chiedere il rimborso.

**Come evitarlo:** prima di uno swap tieni abbastanza per almeno 3 transazioni (deposito, conferma e un eventuale rimborso).

## Errore 5: indirizzi avvelenati e malware degli appunti

Gli attaccanti inviano importi minimi da indirizzi simili al tuo perché tu li copi dalla cronologia. Alcuni malware sostituiscono l'indirizzo che copi.

**Come evitarlo:** copia l'indirizzo dalla sua fonte (non dalla cronologia) e confronta per intero l'inizio **e** la fine.

## Errore 6: approvazioni illimitate

Alcune app chiedono il permesso di spendere una quantità illimitata dei tuoi token. Se l'app viene compromessa, può svuotarti il saldo.

**Come evitarlo:** approva solo il necessario. MoneroP2P approva esattamente l'importo dello swap.

## Errore 7: fidarsi di un «supporto» che ti contatta

Nessuno di affidabile ti chiederà il seed, il file di recupero o fondi per «sbloccare» qualcosa.

## Checklist rapida prima di firmare

- [ ] La rete è corretta?
- [ ] L'indirizzo completo corrisponde?
- [ ] L'importo supera il minimo?
- [ ] Ho abbastanza gas?
- [ ] Ho salvato il file di recupero (su MoneroP2P)?
