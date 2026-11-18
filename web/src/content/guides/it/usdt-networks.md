---
key: usdt-networks
lang: it
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs ERC-20 vs L2: quale usare"
description: "Differenze tra USDT su Tron (TRC-20), Ethereum (ERC-20) e reti layer 2 come Arbitrum: commissioni, velocità, compatibilità e rischi."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**In breve:** è lo stesso dollaro digitale di Tether, ma su reti separate che non si mescolano. Per uno swap usa la rete dove si trovano già i tuoi USDT e dove il servizio è attivo. Le reti layer 2 (come Arbitrum) di solito costano meno di Ethereum, e Tron è molto usato in America Latina, ma le commissioni cambiano: controllale nel tuo wallet prima di inviare.

## Differenze chiave

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum e altre L2 |
|---|---|---|---|
| Formato dell'indirizzo | Inizia con `T` | `0x…` | `0x…` (come Ethereum) |
| Valuta delle commissioni | TRX (energia e banda) | ETH | ETH (sulla L2) |
| Costo tipico | Variabile; dipende dall'energia disponibile | Di solito il più alto | Di solito basso |
| Wallet comuni | TronLink e altri | MetaMask e compatibili | MetaMask e compatibili |
| Tether può congelare? | Sì | Sì | Sì |

> Non diamo cifre sulle commissioni perché cambiano con la congestione e le decisioni di ogni rete. Il tuo wallet mostra il costo esatto prima di firmare.

## È la stessa moneta?

Stesso valore, rete diversa. Gli USDT su Tron non si possono inviare direttamente a un indirizzo Ethereum: serve un exchange o un bridge. Inviare sulla rete sbagliata è uno degli [errori più comuni](/it/guides/common-mistakes-when-sending-crypto/).

## Quale usa MoneroP2P?

- **Ora:** Arbitrum One, il cui USDT (USD₮0) permette di autorizzare il deposito con una firma, senza una transazione di approvazione in più. La modalità di prova usa Arbitrum Sepolia (testnet).
- **In valutazione:** Tron. Il contratto compila già per Tron ma deve ancora essere testato sul suo testnet; Tron ha delle particolarità (per esempio il suo USDT restituisce un valore inatteso nei trasferimenti) che il contratto gestisce già.

## Come scegliere

1. **Dove sono oggi i tuoi USDT?** Spostarli tra reti costa commissioni e tempo.
2. **Hai la valuta delle commissioni?** Senza ETH (o TRX) non puoi firmare.
3. **Cosa supporta il servizio?** Usa solo le reti attive nell'app.
4. **Quanto in fretta ti serve?** Le L2 confermano in pochi secondi; Monero impiega di più a confermare gli XMR.

## Un rischio comune a tutte

Tether può congelare indirizzi su tutte queste reti. MoneroP2P usa un contratto separato per ogni swap perché un congelamento non coinvolga gli altri, ma il rischio esiste. Leggi l'[avviso sui rischi](/it/risk-notice/).
