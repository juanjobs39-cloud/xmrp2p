---
key: maker
lang: fr
title: Devenir maker
description: "Un maker apporte du XMR et gagne une marge sur le prix du marché. Depuis ton navigateur sans rien installer, ou 24 h/24 avec ton propre serveur."
updated: 2026-10-26
---

**En bref :** un maker détient du XMR et le propose contre de l'USDT, avec une marge sur le prix de référence. Tu peux le faire **depuis ton navigateur sans rien installer** (l'onglet ouvert fait office de serveur), ou **24 h/24 avec ton propre serveur ou ordinateur**. Dans les deux cas, personne ne détient tes fonds. Il fonctionne avec de l'argent réel sur Arbitrum One (maximum 100 USDT par swap), et un mode entraînement sur le testnet est aussi disponible.

## Deux façons d'être maker

| | Dans ton navigateur (recommandé) | Ton propre serveur 24 h/24 |
|---|---|---|
| Pour | Tout le monde | Makers techniques |
| Installation | Aucune : ouvre [la page maker](/fr/maker/) | Python, `monero-wallet-rpc` et le daemon ([guide](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| Quand tu proposes | Tant que l'onglet est ouvert sur un ordinateur | En permanence |
| Tes clés | Dans ton navigateur, chiffrées avec ton mot de passe et dans une sauvegarde | Sur ton serveur |
| Paiement en USDT | Directement sur ton MetaMask | À l'adresse que tu configures |

**Commence ici :** [Devenir maker depuis ton navigateur →](/fr/maker/)

## Ce qu'il te faut dans le navigateur

| Condition | Détail |
|---|---|
| Un ordinateur avec l'onglet ouvert | Les téléphones mettent les onglets en veille |
| Du XMR à proposer | Envoie-le à l'adresse que te donne la page ; il se débloque après 10 confirmations |
| Un peu d'ETH pour le gas | Pour encaisser ; recharge-le en un clic depuis MetaMask |
| Un mot de passe et ton fichier de sauvegarde | Sans la sauvegarde, tu ne peux pas restaurer ton maker dans un autre navigateur |

## Comment le prix est fixé

Le daemon prend la médiane de plusieurs sources publiques (Kraken, CoinGecko et KuCoin), écarte la cotation si une source s'éloigne trop de la médiane, et applique ta marge. Tu fixes :

- la marge sur le prix de référence,
- le montant minimum et maximum par swap,
- l'exposition maximale (XMR engagé en même temps),
- le nombre de swaps simultanés.

## Règles de sécurité (navigateur et serveur)

- Il n'envoie jamais de XMR sans dépôt valide sur la blockchain.
- Il n'encaisse jamais s'il n'a pas bloqué le XMR.
- Il n'essaie pas d'encaisser dans les dernières minutes avant t1.
- Il simule chaque transaction avant de l'envoyer.
- Si le taker se fait rembourser, il récupère automatiquement le XMR.

## Risques pour le maker

- **Volatilité :** le prix peut bouger entre la cotation et l'encaissement.
- **Disponibilité :** si tu fermes l'onglet (ou si ton serveur tombe) entre t0 et t1, tu ne seras pas payé ; le taker se fera rembourser et tu devras revenir récupérer ton XMR.
- **Sauvegardes :** ton fichier de sauvegarde (ou la base de données du daemon) contient les moitiés de clé de chaque swap ; sans lui, tu ne peux pas récupérer le XMR.
- **Réglementation :** agir comme maker peut avoir des implications légales dans ton pays. Vérifie avant de commencer.

Rien de tout cela ne garantit des gains. Le guide d'installation complet est dans [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
