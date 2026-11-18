---
key: wallet
lang: fr
title: "MoneroP2P Wallet : portefeuille Monero (XMR) non custodial pour ton navigateur"
description: "Extension gratuite pour Chrome, Brave, Edge et Firefox. Tes clés Monero ne quittent jamais ton appareil ; achète du XMR avec de l'USDT ou ta monnaie locale."
updated: 2026-11-05
keywords:
  - portefeuille Monero
  - wallet XMR
  - extension Monero Chrome
  - portefeuille Monero navigateur
  - portefeuille Monero Firefox
  - portefeuille Monero non custodial
faq:
  - q: "MoneroP2P Wallet stocke-t-il mes clés sur un serveur ?"
    a: "Non. La seed et les clés sont générées et stockées, chiffrées, uniquement dans ton navigateur. Pas de comptes, pas d'inscription, pas d'analyse. Le nœud MoneroP2P ne reçoit que des requêtes à la blockchain et des transactions déjà signées."
  - q: "Et si je perds mon appareil ou désinstalle l'extension ?"
    a: "Restaure le portefeuille avec ta seed de 25 mots dans MoneroP2P Wallet ou n'importe quel portefeuille Monero compatible, comme Cake Wallet, Feather ou le portefeuille officiel."
  - q: "Est-il compatible avec d'autres portefeuilles Monero ?"
    a: "Oui. Il utilise la seed standard de Monero de 25 mots, donc tu peux l'importer dans d'autres portefeuilles et inversement."
  - q: "Puis-je utiliser mon propre nœud ?"
    a: "Oui. Dans les Réglages, tu peux saisir l'URL de ton nœud (https, ou http://127.0.0.1 pour un nœud local)."
  - q: "Combien ça coûte ?"
    a: "L'extension est gratuite et open source (AGPL-3.0). Chaque transfert de XMR paie les frais du réseau Monero plus 0,25 % de frais MoneroP2P, affichés séparément avant de confirmer. Recevoir et envoyer vers tes propres adresses ne paie pas de frais MoneroP2P."
---

**MoneroP2P Wallet** est un portefeuille Monero (XMR) qui fonctionne comme extension de navigateur. Tes clés sont créées et restent sur ton appareil, chiffrées avec ton mot de passe. Depuis le même portefeuille, tu peux acheter du XMR avec de l'USDT ou avec ta monnaie locale sur les services de MoneroP2P.

## Ce que tu peux faire

- **Créer ou restaurer** un portefeuille avec la seed standard de Monero de 25 mots.
- **Recevoir** avec une nouvelle sous-adresse pour chaque paiement, avec un QR code, pour que personne ne puisse relier tes paiements.
- **Envoyer** avec les frais exacts affichés avant de confirmer et un résumé clair de la destination.
- **Explorer :** ouvre l'[échange USDT vers XMR](/fr/app/) (avec ton adresse déjà remplie) et [P2P Fiat](https://fiat.monerop2p.app/fr/app/) en un clic, pour acheter par virement, en espèces ou avec d'autres moyens locaux.
- **USDT et ETH sur Arbitrum :** un compte Arbitrum One est dérivé de la même seed. Sur monerop2p.app et P2P Fiat, le portefeuille se connecte tout seul (sans MetaMask) et remplit ton adresse Monero ; chaque signature ou transfert demande ton accord dans une fenêtre de l'extension.

## Comment il te protège

| Protection | Ce qu'elle fait |
|---|---|
| Non custodial | La seed ne quitte jamais ton appareil ; personne d'autre ne peut déplacer ton XMR. |
| Chiffrement fort | Ton mot de passe devient une clé avec Argon2id (64 Mio) et le portefeuille est chiffré avec XChaCha20-Poly1305. |
| Verrouillage automatique | Il se verrouille après 15 minutes d'inactivité (réglable) et à la fermeture du navigateur. |
| Pas de code distant | Tout le code est inclus dans l'extension, avec une politique de sécurité stricte (CSP). |
| Anti-empoisonnement | Il te prévient si tu colles une adresse qui ressemble à une adresse déjà utilisée mais n'est pas la même. |
| Vérifiable | Le paquet est compilé de façon reproductible : chacun peut vérifier qu'il correspond au code source. |

## Avant de commencer

1. Note la seed **sur papier** et garde-la en sécurité : c'est le seul moyen de récupérer ton argent.
2. Utilise un mot de passe long et unique pour l'extension.
3. Essaie d'abord avec un petit montant.

Pas encore de XMR ? Vois [toutes les façons d'acheter du Monero](/fr/buy-monero/).
