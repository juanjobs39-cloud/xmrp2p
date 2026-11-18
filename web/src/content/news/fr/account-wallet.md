---
key: account-wallet
lang: fr
slug: non-custodial-monero-and-usdt-wallet-in-your-account
title: "Un portefeuille Monero et USDT non custodial dans ton compte MoneroP2P"
description: "Ton compte MoneroP2P inclut maintenant un portefeuille Monero (XMR), USDT et ETH sur Arbitrum : sans KYC, non custodial, envois par @pseudo et sauvegarde de 12 mots."
published: 2026-11-15
keywords:
  - portefeuille Monero non custodial
  - portefeuille web Monero
  - portefeuille Monero et USDT
  - portefeuille XMR sans KYC
  - envoyer Monero par nom d'utilisateur
  - portefeuille Monero dans le navigateur
  - portefeuille USDT Arbitrum sans inscription
  - échanger USDT contre Monero depuis le portefeuille
  - compte MoneroP2P
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/fr/
    description: "Marché P2P pour acheter et vendre du Monero (XMR) en monnaie locale, avec un séquestre multisig 2 sur 3 et sans KYC. Chaque compte inclut un portefeuille non custodial pour Monero, USDT et ETH sur Arbitrum."
  - name: MoneroP2P
    url: https://monerop2p.app/fr/app/
    description: "Plateforme sans compte pour échanger de l'USDT, du BTC, de l'ETH et d'autres cryptos contre du Monero (XMR)."
howto:
  name: "Comment créer ton portefeuille Monero et USDT sur MoneroP2P"
  totalTime: PT5M
  steps:
    - name: "Ouvre l'app et appuie sur « Créer un compte »"
      text: "Va sur fiat.monerop2p.app/fr/app/. La barre de compte en haut a un bouton « Créer un compte ». Ni e-mail, ni téléphone, ni pièce d'identité ne sont demandés."
    - name: "Choisis un pseudo et un mot de passe"
      text: "Le pseudo est public ; le mot de passe (au moins 10 caractères) chiffre ton compte dans le navigateur. Il ne peut pas être récupéré si tu l'oublies."
    - name: "Garde ta sauvegarde"
      text: "Télécharge le fichier de sauvegarde chiffré et garde-le hors de l'appareil. Avec lui et ton mot de passe, tu récupères le compte sur un autre téléphone ou ordinateur."
    - name: "Copie ton adresse de réception"
      text: "Dans « Portefeuille », tu obtiens une adresse Monero et une adresse Arbitrum (la même pour l'USDT et l'ETH), chacune avec un QR code."
    - name: "Envoie, demande ou échange"
      text: "Envoie à une adresse ou à un autre utilisateur par @pseudo, crée un lien de paiement, ou appuie sur « Échanger des cryptos » pour passer de l'USDT au XMR sans copier d'adresses."
faq:
  - q: "MoneroP2P détient-il mes fonds ou mes clés ?"
    a: "Non. Les clés sont créées dans ton navigateur à partir d'une seed de 12 mots et stockées chiffrées avec ton mot de passe. Le serveur ne les reçoit jamais, donc MoneroP2P ne peut ni voir, ni déplacer, ni geler tes fonds, et ne peut pas les récupérer si tu perds à la fois la sauvegarde et le mot de passe."
  - q: "Quelles cryptos le portefeuille du compte prend-il en charge ?"
    a: "Monero (XMR) sur le mainnet, et l'USDT et l'ETH sur Arbitrum One. L'adresse Arbitrum est un compte standard de type Ethereum : la même fonctionne pour l'USDT et l'ETH."
  - q: "Combien coûte le portefeuille ?"
    a: "Créer le compte, recevoir et envoyer à un autre utilisateur par @pseudo ne paient pas de frais de plateforme. Retirer vers une adresse externe coûte 0,5 %, affiché sur une ligne à part avant de confirmer. Les très petits retraits (moins d'environ 0,002 XMR, 10 USDT ou 0,004 ETH) ne sont pas facturés, ni les dépôts dans le séquestre d'un ordre P2P ou dans un swap. Les frais réseau se paient à part."
  - q: "Comment récupérer mon portefeuille si je perds mon téléphone ?"
    a: "Avec le fichier de sauvegarde et ton mot de passe, ou avec les 12 mots du compte. Les 12 mots récupèrent le pseudo et les portefeuilles ; les clés de séquestre des ordres ouverts ne sont que dans le fichier de sauvegarde, alors retélécharge-le après chaque ordre."
  - q: "Puis-je emporter mes clés dans un autre portefeuille ?"
    a: "Oui. Dans Portefeuille → Plus d'options, tu peux exporter les 12 mots du compte, la seed Monero de 25 mots (pour Cake Wallet, Feather ou le portefeuille officiel) et la clé privée Arbitrum (pour MetaMask et similaires)."
  - q: "Faut-il un compte pour échanger des cryptos contre du Monero ?"
    a: "Non. La plateforme sans compte sur monerop2p.app fonctionne comme avant. Le compte est optionnel : il fait arriver ce que tu échanges dans ton portefeuille sans copier d'adresses."
  - q: "L'envoi par @pseudo est-il privé ?"
    a: "Si tu actives « Recevoir par pseudo », ton adresse est liée à ton pseudo et n'importe qui peut la consulter. Sur Monero, ça ne révèle pas ce que tu reçois ; sur Arbitrum si, car ce réseau est public. C'est désactivé tant que tu ne l'actives pas."
---

**En bref :** chaque compte [MoneroP2P Fiat](https://fiat.monerop2p.app/fr/) inclut maintenant un **portefeuille non custodial pour Monero (XMR), USDT et ETH sur Arbitrum**. Il se crée dans ton navigateur avec un pseudo et un mot de passe, **sans e-mail ni KYC** ; les clés ne quittent jamais ton appareil. Tu peux recevoir, envoyer à une adresse ou à un autre utilisateur par **@pseudo**, alimenter le séquestre d'un ordre P2P et échanger entre tes cryptos sans copier d'adresses.

[Créer mon compte et mon portefeuille →](https://fiat.monerop2p.app/fr/app/#/cuenta)

## Que fait le portefeuille du compte ?

| Fonction | Comment ça marche |
|---|---|
| **Recevoir** | Une adresse Monero et une adresse Arbitrum (USDT et ETH), chacune avec un QR code. |
| **Envoyer** | À une adresse ou à un @pseudo. Il y a toujours un écran de vérification avec le montant, les frais et le total avant de confirmer. |
| **Envoyer par @pseudo** | Tape `@pseudo` au lieu d'une longue adresse. Sans frais de plateforme. |
| **Liens de paiement** | Crée un lien ou un QR avec une crypto et un montant ; qui l'ouvre avec son compte n'a qu'à vérifier et confirmer. |
| **Échanger** | Passe de l'USDT au XMR (et inversement) entre tes propres portefeuilles : le dépôt est envoyé pour toi et ce que tu achètes arrive dans ton portefeuille. |
| **Alimenter le séquestre** | Si tu vends du XMR sur le marché P2P, dépose dans le séquestre depuis ton portefeuille avec un bouton. |
| **Historique** | Transactions Monero avec confirmations et lien vers l'explorateur. |
| **Exporter les clés** | Les 12 mots du compte, la seed Monero de 25 mots et la clé privée Arbitrum. |

## Qui détient mes clés ?

Toi. Le compte part d'une **seed de 12 mots** générée dans ton navigateur. Ta clé de compte, ton portefeuille Monero et ton compte Arbitrum en dérivent tous. Tout est stocké **chiffré avec ton mot de passe** dans le navigateur et dans ton fichier de sauvegarde.

- Le serveur ne reçoit jamais ton mot de passe, ta seed ni tes clés.
- MoneroP2P **ne peut ni déplacer ni geler** tes fonds.
- Pour la même raison, **personne ne peut les récupérer** si tu perds à la fois la sauvegarde et le mot de passe. Garde la sauvegarde hors de l'appareil.

Pour voir ou exporter tes clés, l'app redemande ton mot de passe, pour que quelqu'un qui trouve l'onglet ouvert ne puisse pas les voir.

## Comment envoyer du Monero ou de l'USDT à un autre utilisateur par @pseudo ?

1. Dans « Portefeuille », ouvre l'onglet **Envoyer** de Monero ou d'Arbitrum.
2. Saisis `@pseudo` comme destination, et le montant.
3. Vérifie et confirme.

L'adresse de chaque utilisateur est **signée avec sa clé de compte**, et ton navigateur vérifie cette signature avant d'envoyer. Ainsi, ni le serveur ni quiconque l'aurait compromis ne peut remplacer l'adresse de quelqu'un par une autre. L'app se souvient de qui tu as payé et **bloque le transfert si ce pseudo appartient maintenant à un autre compte**.

La réception par pseudo est désactivée tant que tu ne l'actives pas dans Portefeuille → Plus d'options.

## Combien ça coûte ?

| Opération | Frais MoneroP2P |
|---|---|
| Créer un compte et recevoir | 0 |
| Envoyer à un autre utilisateur par @pseudo | 0 |
| Déposer dans le séquestre d'un ordre P2P | 0 |
| Déposer dans un swap | 0 |
| Retirer vers une adresse externe | **0,5 %** |
| Très petits retraits (moins d'environ 0,002 XMR, 10 USDT ou 0,004 ETH) | 0 |

Les frais sont affichés **sur une ligne à part** dans l'écran de vérification, avec le total qui sort de ton portefeuille. Les frais réseau (Monero ou Arbitrum) se paient à part ; pour envoyer de l'USDT, il te faut un peu d'ETH sur Arbitrum.

## Faut-il un compte pour échanger des cryptos contre du Monero ?

Non. La [plateforme sans compte](/fr/app/) fonctionne comme avant : tu choisis les cryptos, saisis ton adresse et envoies le dépôt depuis ton propre portefeuille.

Avec un compte, c'est plus pratique : dans « Échanger des cryptos », tu choisis de quel portefeuille ça part et dans lequel ça arrive, et l'app envoie le dépôt après un écran de vérification. Ces échanges passent par des **échanges instantanés** choisis avec la liste comparative (notes KYC A ou B uniquement) : pendant les quelques minutes de l'échange, la plateforme détient les cryptos. Le portefeuille est non custodial ; l'échange ne l'est pas.

## Ce qu'il faut savoir avant de l'utiliser

- **C'est nouveau.** Commence par de petits montants jusqu'à ce que tu lui fasses confiance.
- **Le portefeuille Monero se synchronise dans ton navigateur.** La première fois, ça peut prendre quelques minutes.
- **Le Monero tout juste reçu met environ 20 minutes** (10 confirmations) à devenir dépensable.
- **Arbitrum est un réseau public :** quiconque connaît ton adresse peut voir ce que tu y reçois. Pas Monero.
- **Utilise uniquement le réseau Arbitrum** pour l'USDT et l'ETH. Si tu envoies par un autre réseau, les fonds sont perdus.

Tu préfères un portefeuille installé dans le navigateur ? Vois [MoneroP2P Wallet, l'extension pour Chrome et Firefox](/fr/news/monerop2p-wallet-monero-browser-extension/) ou le comparatif des [meilleurs portefeuilles Monero en 2026](/fr/news/best-monero-wallets-2026/).

## Questions fréquentes

### MoneroP2P détient-il mes fonds ou mes clés ?
Non. Les clés sont créées et restent dans ton navigateur, chiffrées avec ton mot de passe.

### Quelles cryptos le portefeuille prend-il en charge ?
Monero (XMR), et l'USDT et l'ETH sur Arbitrum One.

### Combien ça coûte ?
Recevoir et envoyer par @pseudo ne paient pas de frais de plateforme. Retirer vers une adresse externe coûte 0,5 %, affiché avant de confirmer.

### Comment le récupérer si je perds mon téléphone ?
Avec le fichier de sauvegarde et ton mot de passe, ou avec les 12 mots du compte.

### Puis-je emporter mes clés dans un autre portefeuille ?
Oui : tu peux exporter les 12 mots, la seed Monero de 25 mots et la clé privée Arbitrum.

### Faut-il un compte pour échanger des cryptos contre du Monero ?
Non. La [plateforme sans compte](/fr/app/) est toujours disponible.

Utiliser des cryptos comporte des risques : lis l'[avertissement sur les risques](/fr/risk-notice/).

[Créer mon compte et mon portefeuille →](https://fiat.monerop2p.app/fr/app/#/cuenta) · [Acheter du Monero en monnaie locale →](https://fiat.monerop2p.app/fr/app/)

Sur Telegram ? Le marché s'y ouvre aussi, avec des notifications pour tes ordres : [acheter et vendre du Monero sur Telegram](/fr/news/buy-monero-on-telegram-bot/).
