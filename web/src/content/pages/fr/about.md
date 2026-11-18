---
key: about
lang: fr
title: À propos de MoneroP2P
description: "Ce qu'est MoneroP2P, où en est le projet et comment il se finance (des frais sur chaque swap terminé)."
updated: 2026-10-24
---

**En bref :** MoneroP2P est un projet open source pour échanger de l'USDT contre du Monero sans intermédiaire, grâce à des atomic swaps qui tournent dans le navigateur. Il fonctionne avec de l'argent réel sur Arbitrum One + Monero (maximum 100 USDT par swap) ; le contrat est vérifié avec Halmos, Aderyn et Slither et n'a pas encore d'audit externe.

## Ce que nous construisons

L'application web, le smart contract, le cœur cryptographique et le programme que font tourner les makers. Nous ne détenons pas de fonds et ne stockons pas les clés des utilisateurs.

## Comment il se finance

Le contrat prélève un pourcentage quand un swap se termine. Ce pourcentage est fixé au déploiement du contrat et plafonné à 1 % dans le code, ce que personne ne peut modifier. Les remboursements ne paient pas de frais. Les échanges instantanés via Trocador incluent une marge de 1 % pour MoneroP2P dans la cotation affichée ; il n'y a pas de frais séparés.

## Où en est le projet

- En service avec de l'argent réel depuis octobre 2026 (maximum 100 USDT par swap), avec un mode entraînement sur le testnet.
- Contrat vérifié avec Halmos, Aderyn et Slither et publié sur Sourcify.
- En attente : un audit externe.

## Crédits

Le protocole s'appuie sur le travail d'AthanorLabs et sur les recherches antérieures de COMIT et du projet Farcaster. La preuve DLEQ utilise la même construction qu'eigenwallet.

## Code

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (licence AGPL-3.0).
