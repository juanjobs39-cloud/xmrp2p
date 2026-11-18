---
key: wallet-launch
lang: fr
slug: monerop2p-wallet-monero-browser-extension
title: "MoneroP2P Wallet : une extension Monero pour Chrome et Firefox"
description: "MoneroP2P Wallet : un portefeuille Monero non custodial pour ton navigateur, avec XMR, USDT et ETH sur Arbitrum depuis une seule seed, et des swaps sans MetaMask."
published: 2026-11-05
keywords:
  - extension Monero navigateur
  - extension Chrome portefeuille Monero
  - portefeuille XMR pour Firefox
  - portefeuille Monero non custodial
  - portefeuille Monero et USDT
  - MetaMask pour Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/fr/wallet/
    description: "Extension de navigateur open source (AGPL-3.0) et non custodial pour Monero (XMR) et USDT/ETH sur Arbitrum One."
howto:
  name: "Comment démarrer avec MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Installe l'extension"
      text: "Va sur monerop2p.app/fr/wallet et choisis la boutique de ton navigateur : Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons ou Edge Add-ons."
    - name: "Crée ton portefeuille"
      text: "Ouvre l'extension, choisis « Créer un portefeuille » et définis un mot de passe long et unique. Le portefeuille est chiffré avec lui sur ton appareil."
    - name: "Écris la seed sur papier"
      text: "Note la seed de 25 mots sur papier et garde-la en lieu sûr. C'est le seul moyen de récupérer ton XMR et ton compte Arbitrum."
    - name: "Reçois du XMR"
      text: "Dans « Recevoir », le portefeuille te donne une nouvelle sous-adresse avec un QR code pour chaque paiement."
    - name: "Achète du XMR depuis Explorer"
      text: "Dans « Explorer », ouvre l'échange USDT vers XMR ou P2P Fiat. Le portefeuille se connecte tout seul et remplit ton adresse Monero."
faq:
  - q: "Qu'est-ce que MoneroP2P Wallet ?"
    a: "Un portefeuille Monero (XMR) non custodial conçu comme extension pour Chrome, Brave, Edge, Opera et Firefox. La même seed te donne un compte Monero et un compte Arbitrum One pour l'USDT et l'ETH. Il est gratuit et open source (AGPL-3.0). Page officielle : https://monerop2p.app/fr/wallet/"
  - q: "Existe-t-il une extension Monero pour Chrome ?"
    a: "Oui. MoneroP2P Wallet fonctionne sur Chrome et les autres navigateurs Chromium (Brave, Edge, Opera) ainsi que sur Firefox. Il exécute wallet2, le portefeuille officiel de Monero, compilé en WebAssembly dans le navigateur."
  - q: "Un portefeuille Monero dans le navigateur est-il sûr ?"
    a: "Les clés sont stockées chiffrées avec Argon2id et XChaCha20-Poly1305, le portefeuille se verrouille tout seul après 15 minutes, et l'extension ne charge aucun code distant et n'a pas d'analytique. Garde ta seed sur papier : c'est le seul moyen de récupérer tes fonds."
  - q: "Combien ça coûte ?"
    a: "L'extension est gratuite. Chaque envoi de XMR sur le mainnet paie les frais du réseau Monero plus des frais MoneroP2P de 0,25 %, affichés sur une ligne à part avant de confirmer. Recevoir, envoyer vers tes propres adresses et les envois sur Arbitrum ne paient pas de frais MoneroP2P."
  - q: "Puis-je utiliser ma seed dans d'autres portefeuilles ?"
    a: "Oui. Il utilise la seed Monero standard de 25 mots, compatible avec Cake Wallet, Feather et le portefeuille officiel. Le compte Arbitrum utilise sa propre dérivation ; pour l'utiliser ailleurs, exporte sa clé privée depuis les Paramètres."
  - q: "Remplace-t-il MetaMask sur MoneroP2P ?"
    a: "Oui, sur monerop2p.app et fiat.monerop2p.app. Le portefeuille s'annonce au site via EIP-6963, et chaque connexion, signature ou transfert demande ton accord dans une fenêtre de l'extension. Il ne se connecte pas à d'autres sites."
---

**En bref :** le **5 novembre 2026**, nous avons lancé **MoneroP2P Wallet 0.2.0**, un **portefeuille Monero non custodial pour ton navigateur** qui fonctionne sur Chrome, Brave, Edge, Opera et Firefox. Une seed de 25 mots gère ton **XMR** et un **compte Arbitrum One avec USDT et ETH**, pour échanger de l'USDT contre du Monero sur MoneroP2P **sans MetaMask** et sans copier d'adresses partout. Il est gratuit et open source.

[Voir MoneroP2P Wallet →](/fr/wallet/)

## Pourquoi un portefeuille Monero dans le navigateur

Jusqu'ici, utiliser Monero voulait dire une app de bureau (Feather ou le portefeuille officiel) ou une app mobile (Cake Wallet). Les sites web parlent à MetaMask, mais MetaMask ne prend pas en charge Monero. Échanger de l'USDT contre du XMR sur un site voulait dire **deux portefeuilles** et copier des adresses de l'un à l'autre.

MoneroP2P Wallet réunit les deux dans une extension : ton Monero et ton compte Arbitrum sont au même endroit, et les sites de MoneroP2P l'utilisent directement.

## Ce qu'il fait

- **Portefeuille Monero complet :** création ou restauration avec la seed standard de 25 mots, solde, historique avec confirmations et envois qui affichent les frais exacts avant diffusion.
- **Une nouvelle sous-adresse pour chaque paiement**, avec QR code, pour que personne ne relie tes paiements.
- **USDT et ETH sur Arbitrum One :** la même seed crée ton compte Arbitrum, avec solde, réception par QR et envoi avec frais réseau estimés.
- **Explorer :** un clic ouvre l'[échange USDT vers XMR](/fr/app/) ou [P2P Fiat](https://fiat.monerop2p.app/fr/), où tu achètes du XMR avec ta monnaie locale.
- **Connexion aux sites :** sur monerop2p.app et fiat.monerop2p.app, le portefeuille remplit ton adresse Monero et signe le dépôt du swap. Chaque étape demande ton accord dans une fenêtre de l'extension.
- **Ton propre nœud :** remplace le nœud de MoneroP2P par le tien dans les Paramètres.

## Comment il protège tes fonds

| Couche | Ce qu'elle fait |
|---|---|
| Non custodial | La seed est créée et reste sur ton appareil. Pas de comptes, de serveurs de clés ni d'analytique. |
| Coffre chiffré | Argon2id (64 Mio) transforme ton mot de passe en clé et XChaCha20-Poly1305 chiffre le portefeuille. |
| Verrouillage automatique | Après 15 minutes d'inactivité (réglable) et à la fermeture du navigateur. |
| Pas de code distant | Tout le code est inclus dans l'extension, avec une Content Security Policy stricte. |
| Deux sites seulement | L'extension ne parle qu'à monerop2p.app et fiat.monerop2p.app, et seulement avec ton accord. |
| Approbations lisibles | Avant de signer, tu vois en mots simples ce que fait la transaction : transfert, autorisation de dépense ou dépôt de swap. |
| Contrôle anti-empoisonnement d'adresse | T'avertit si tu colles une adresse qui ressemble à une que tu as utilisée mais qui n'est pas la même. |
| Vérifiable | Open source (AGPL-3.0) et paquet reproductible avec son SHA-256. |

**Garde ta seed sur papier.** C'est le seul moyen de récupérer tes fonds si tu perds ou changes d'appareil.

## Comparaison avec d'autres portefeuilles Monero

| | MoneroP2P Wallet | Feather | Cake Wallet | GUI officielle |
|---|---|---|---|---|
| Fonctionne sur | Navigateur (extension) | Ordinateur | Mobile et ordinateur | Ordinateur |
| Seed de 25 mots | Oui | Oui | Oui | Oui |
| USDT sur Arbitrum | Oui | Non | Autres réseaux | Non |
| Se connecte aux sites web | Oui (MoneroP2P seulement) | Non | Non | Non |
| Open source | Oui | Oui | Oui | Oui |

Pour une grosse épargne à long terme, un portefeuille de bureau ou matériel reste le meilleur choix. MoneroP2P Wallet est fait pour **acheter, recevoir et déplacer du XMR au quotidien** depuis ton navigateur.

## Frais

- **Extension :** gratuite.
- **Envois de XMR sur le mainnet :** frais du réseau Monero plus des frais MoneroP2P de **0,25 %**, affichés sur une ligne à part avant de confirmer. Les montants dont les frais seraient inférieurs à 0,00001 XMR ne les paient pas.
- **Sans frais MoneroP2P :** réception, envois vers tes propres adresses, stagenet et envois sur Arbitrum (tu ne paies que le réseau).

## Pour commencer

1. Va sur [monerop2p.app/fr/wallet](/fr/wallet/) et choisis la boutique de ton navigateur.
2. Crée le portefeuille avec un mot de passe long et unique.
3. **Écris la seed de 25 mots sur papier.** C'est le seul moyen de récupérer tes fonds.
4. Reçois du XMR avec la sous-adresse de « Recevoir », ou achète-le depuis **Explorer**.

Pas encore de Monero ? Vois [toutes les façons d'acheter du XMR](/fr/buy-monero/) ou le guide [comment créer un portefeuille Monero](/fr/guides/how-to-create-a-monero-wallet/).

## FAQ

### Qu'est-ce que MoneroP2P Wallet ?
Un portefeuille Monero non custodial en extension pour Chrome, Brave, Edge, Opera et Firefox, avec un compte Arbitrum One pour l'USDT et l'ETH depuis la même seed.

### Existe-t-il une extension Monero pour Chrome ?
Oui. MoneroP2P Wallet fonctionne sur Chrome et les autres navigateurs Chromium, ainsi que sur Firefox. Il exécute wallet2, le portefeuille officiel de Monero, compilé en WebAssembly.

### Un portefeuille Monero dans le navigateur est-il sûr ?
Les clés sont chiffrées, le portefeuille se verrouille tout seul et l'extension ne charge aucun code distant.

### Combien ça coûte ?
C'est gratuit. Les envois de XMR paient les frais réseau plus 0,25 % à MoneroP2P, affichés avant de confirmer.

### Puis-je utiliser ma seed dans d'autres portefeuilles ?
Oui, la seed de 25 mots fonctionne avec Cake Wallet, Feather et le portefeuille officiel. La clé Arbitrum s'exporte depuis les Paramètres.

### Remplace-t-il MetaMask sur MoneroP2P ?
Oui, sur monerop2p.app et fiat.monerop2p.app. Chaque connexion ou signature demande ton accord.

Le code est sur [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Utiliser des cryptos comporte des risques : lis l'[avertissement sur les risques](/fr/risk-notice/).

[Voir MoneroP2P Wallet →](/fr/wallet/)

Tu préfères ne rien installer ? Chaque compte P2P Fiat inclut maintenant un portefeuille web non custodial : [portefeuille Monero et USDT dans ton compte](/fr/news/non-custodial-monero-and-usdt-wallet-in-your-account/).
