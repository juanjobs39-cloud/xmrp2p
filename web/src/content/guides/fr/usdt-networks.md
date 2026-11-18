---
key: usdt-networks
lang: fr
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs ERC-20 vs L2 : lequel utiliser"
description: "Différences entre l'USDT sur Tron (TRC-20), Ethereum (ERC-20) et les réseaux de couche 2 comme Arbitrum : frais, rapidité, compatibilité et risques."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**En bref :** c'est le même dollar numérique de Tether, mais sur des réseaux séparés qui ne se mélangent pas. Pour un swap, utilise le réseau où se trouve déjà ton USDT et où le service est actif. Les réseaux de couche 2 (comme Arbitrum) sont en général moins chers qu'Ethereum, et Tron est très utilisé en Amérique latine, mais les frais changent : vérifie-les dans ton portefeuille avant d'envoyer.

## Différences clés

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum et autres L2 |
|---|---|---|---|
| Format d'adresse | Commence par `T` | `0x…` | `0x…` (comme Ethereum) |
| Monnaie des frais | TRX (énergie et bande passante) | ETH | ETH (sur la L2) |
| Coût typique | Variable ; dépend de l'énergie disponible | En général le plus élevé | En général faible |
| Portefeuilles courants | TronLink et autres | MetaMask et compatibles | MetaMask et compatibles |
| Tether peut-il geler ? | Oui | Oui | Oui |

> Nous ne donnons pas de chiffres de frais car ils changent avec la congestion et les décisions de chaque réseau. Ton portefeuille affiche le coût exact avant de signer.

## Est-ce la même crypto ?

Même valeur, réseau différent. L'USDT sur Tron ne peut pas être envoyé directement à une adresse Ethereum : il faut une plateforme ou un bridge. Envoyer sur le mauvais réseau est l'une des [erreurs les plus courantes](/fr/guides/common-mistakes-when-sending-crypto/).

## Lequel utilise MoneroP2P ?

- **Maintenant :** Arbitrum One, dont l'USDT (USD₮0) permet d'autoriser le dépôt par une signature, sans transaction d'approbation supplémentaire. Le mode entraînement utilise Arbitrum Sepolia (testnet).
- **À l'étude :** Tron. Le contrat compile déjà pour Tron mais doit encore être testé sur son testnet ; Tron a des particularités (par exemple, son USDT renvoie une valeur inattendue lors d'un transfert) que le contrat gère déjà.

## Comment choisir

1. **Où est ton USDT aujourd'hui ?** Le déplacer entre réseaux coûte des frais et du temps.
2. **As-tu la monnaie des frais ?** Sans ETH (ou TRX), tu ne peux pas signer.
3. **Que prend en charge le service ?** N'utilise que les réseaux actifs dans l'app.
4. **À quelle vitesse en as-tu besoin ?** Les L2 confirment en quelques secondes ; Monero met plus de temps à confirmer le XMR.

## Un risque commun à tous

Tether peut geler des adresses sur tous ces réseaux. MoneroP2P utilise un contrat séparé par swap pour qu'un gel n'affecte pas les autres, mais le risque existe. Lis l'[avertissement sur les risques](/fr/risk-notice/).
