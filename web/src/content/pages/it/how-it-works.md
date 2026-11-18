---
key: how
lang: it
title: Come funziona uno swap da USDT a Monero su MoneroP2P
description: "Un atomic swap scambia i tuoi USDT con XMR senza intermediari: un contratto tiene gli USDT e li rilascia solo quando puoi prendere gli XMR. Spiegazione semplice."
updated: 2026-10-24
---

**In breve:** i tuoi USDT stanno in uno smart contract che può pagare il venditore solo se rivela un segreto. Quello stesso segreto è la metà che ti manca per aprire l'indirizzo Monero dove il venditore ha lasciato gli XMR. Per questo lo swap è «atomico»: o si completano entrambe le parti o nessuna. Se qualcosa fallisce, il contratto ti rimborsa gli USDT.

## Per principianti

Immagina una cassaforte con due serrature:

1. **Tu e il venditore (il «maker») create insieme un indirizzo Monero**, e ognuno ha solo metà della sua chiave. Nessuno può muovere ciò che c'è dentro senza entrambe le metà.
2. **Depositi gli USDT in un contratto.** Il contratto sa verificare la mezza chiave del maker, ma non la conosce.
3. **Il maker deposita gli XMR** sull'indirizzo comune. L'app controlla che sia arrivato l'importo giusto.
4. **Confermi** nel contratto che è tutto a posto.
5. **Il maker incassa gli USDT** e, per farlo, deve consegnare al contratto la sua mezza chiave, che viene pubblicata on-chain.
6. **L'app prende quella mezza chiave**, la combina con la tua e invia gli XMR al tuo indirizzo.

Se il maker non deposita mai gli XMR, non confermi e riavrai i tuoi USDT con un rimborso.

## Cosa ti serve

| Ti serve | Per |
|---|---|
| Un wallet da browser (MetaMask o compatibile) con USDT | Depositare nel contratto |
| Un po' della moneta della rete (es. ETH su Arbitrum) | Pagare il gas |
| Un indirizzo Monero | Ricevere gli XMR ([come creare un wallet](/it/guides/how-to-create-a-monero-wallet/)) |
| Un file di recupero protetto da password | Riprendere se chiudi la scheda |

## Le due scadenze (t0 e t1)

| Momento | Cosa puoi fare | Cosa può fare il maker |
|---|---|---|
| Prima di **t0**, non ancora confermato | Confermare o chiedere il rimborso | Niente |
| Dopo aver confermato, o tra **t0** e **t1** | Aspettare | Incassare (rivelando il suo segreto) |
| Da **t1** | Chiedere il rimborso | Niente |

**Importante:** se prima di t0 non confermi né chiedi il rimborso, il contratto lascia incassare il maker anche se non ha mai depositato gli XMR. Per questo l'app ti chiede in automatico di chiedere il rimborso quando gli XMR non sono verificati all'avvicinarsi di t0, e per questo devi conservare il file di recupero.

## Spiegazione tecnica

- **Metà della chiave.** Ogni parte sceglie uno scalare a 252 bit `s`. La spend key dell'indirizzo comune è `S_taker + S_maker` (ed25519); la view key è `v_taker + v_maker`.
- **Prova DLEQ.** Ogni parte dimostra, senza rivelarlo, che dietro la sua chiave ed25519 (Monero) e una chiave secp256k1, quella che verifica il contratto, c'è lo stesso `s`. Usiamo la costruzione `sigma_fun`, la stessa di eigenwallet.
- **Contratto.** Un escrow per swap (clone EIP-1167) memorizza `keccak(s_maker·G)` e `keccak(s_taker·G)`. `claim(s_maker)` e `refund(s_taker)` verificano il segreto con un trucco basato su `ecrecover`. Le loro finestre non si sovrappongono mai.
- **Verifica degli XMR.** Il maker invia l'ID e la chiave della transazione; l'app verifica il pagamento con `check_tx_key` senza sincronizzare un intero wallet.
- **Sweep.** Appena il segreto del maker compare nell'evento `Claimed`, l'app calcola `s_taker + s_maker` e invia gli XMR al tuo indirizzo.

Il design completo è nel [documento di architettura](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) (in spagnolo) e si basa sul protocollo di AthanorLabs.
