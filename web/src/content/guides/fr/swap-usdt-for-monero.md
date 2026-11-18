---
key: swap-usdt-xmr
lang: fr
slug: how-to-swap-usdt-for-monero-without-intermediaries
title: Comment échanger de l'USDT contre du Monero sans intermédiaire
description: "Pas à pas : échange de l'USDT contre du XMR par atomic swap depuis ton navigateur, sans compte et sans que personne ne détienne tes fonds."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: Échanger de l'USDT contre du Monero par atomic swap
  totalTime: PT1H
  steps:
    - name: Prépare ton portefeuille Monero
      text: Crée un portefeuille Monero et copie ton adresse de réception. En mode entraînement, ce doit être une adresse stagenet.
    - name: Ouvre l'app et choisis une offre
      text: Choisis l'offre d'un maker, saisis le montant d'USDT et ton adresse Monero.
    - name: Définis un mot de passe et télécharge le fichier de récupération
      text: Choisis un mot de passe d'au moins 10 caractères et télécharge le fichier chiffré. Il est obligatoire avant de déposer.
    - name: Dépose l'USDT
      text: Connecte ton portefeuille (MetaMask ou compatible) et signe le dépôt dans le contrat.
    - name: Attends et confirme
      text: L'app vérifie le XMR que bloque le maker. Une fois vérifié, confirme avec setReady.
    - name: Reçois le XMR
      text: Quand le maker encaisse, l'app combine les deux moitiés de clé et envoie le XMR à ton adresse.
---

**En bref :** ouvre l'app, choisis une offre, saisis ton adresse Monero, télécharge ton fichier de récupération, dépose l'USDT depuis ton portefeuille et attends. L'app vérifie le XMR, te demande de confirmer et envoie enfin le XMR à ton adresse. Si quelque chose échoue, elle te demande de te faire rembourser l'USDT. Le processus complet prend en général 30 à 60 minutes.

> MoneroP2P fonctionne avec de l'argent réel sur **Arbitrum One + Monero** (maximum 100 USDT par swap) et propose un mode entraînement sur le **testnet** (Arbitrum Sepolia et stagenet Monero). Les étapes sont les mêmes dans les deux cas.

## Avant de commencer

| Il te faut | Où l'obtenir |
|---|---|
| Un portefeuille de navigateur avec de l'USDT | MetaMask ou un portefeuille compatible EVM |
| Un peu d'ETH sur le même réseau | Pour le gas de 2 ou 3 transactions |
| Une adresse Monero | [Comment créer un portefeuille Monero](/fr/guides/how-to-create-a-monero-wallet/) |
| 30 à 60 minutes avec l'onglet ouvert | Ou ton fichier de récupération pour revenir plus tard |

## Pas à pas

### Étape 1 : choisis une offre

L'app affiche les offres des makers : prix en USDT par XMR et montants minimum et maximum. Chaque maker fixe son prix et il évolue avec le marché ; l'app affiche le montant exact de XMR avant que tu déposes.

### Étape 2 : saisis ton adresse et un mot de passe

- **Adresse Monero :** là où tu recevras le XMR. Vérifie-la deux fois ; les transferts sont irréversibles.
- **Mot de passe :** protège ton fichier de récupération. Si tu l'oublies, personne ne peut le récupérer.

### Étape 3 : télécharge le fichier de récupération

L'app ne te laisse pas déposer sans lui. Il contient ta moitié de clé, chiffrée. Avec lui, tu peux reprendre le swap depuis n'importe quel navigateur ([que faire si tu as fermé l'onglet](/fr/guides/what-to-do-if-you-closed-the-tab/)).

### Étape 4 : dépose l'USDT

Connecte ton portefeuille. Si le jeton le permet, tu signes une autorisation et déposes en une seule transaction ; sinon, tu approuves d'abord le montant. L'USDT va dans un contrat qui ne le libère que selon les règles du swap.

### Étape 5 : attends la vérification et confirme

Le maker bloque le XMR sur une adresse partagée et envoie une preuve de paiement. L'app vérifie le montant et les confirmations sur le réseau Monero. Quand tout est bon, le bouton **Confirmer** apparaît. Dès que tu confirmes, le maker peut encaisser.

Si le XMR n'arrive pas ou si le montant est inférieur, l'app te demande de **te faire rembourser** avant le délai t0. Fais-le : après ce délai, tu ne peux plus te faire rembourser avant le délai final.

### Étape 6 : reçois ton XMR

Quand le maker encaisse l'USDT, il révèle sa moitié de clé. L'app la combine avec la tienne et envoie le XMR à ton adresse. Ton portefeuille l'affiche après quelques confirmations.

## Coûts

- **Frais de la plateforme :** un pourcentage de l'USDT, prélevé par le contrat à la fin du swap, plafonné à 1 %.
- **Gas** sur le réseau de l'USDT pour déposer et confirmer (et te faire rembourser si besoin).
- **Frais du réseau Monero** à l'envoi du XMR à ton adresse.
- **Marge du maker**, déjà incluse dans son prix.

Les frais de réseau changent avec la congestion ; vérifie-les dans ton portefeuille avant de signer.

## Si quelque chose tourne mal

| Problème | Que faire |
|---|---|
| Le maker n'a pas répondu | Tu n'as rien déposé : choisis une autre offre |
| Tu as fermé l'onglet | Rouvre l'app et utilise ton fichier de récupération |
| Le XMR n'arrive pas | Attends ; si t0 approche, l'app te demandera de te faire rembourser |
| Tu n'as plus de gas | Procure-toi un peu d'ETH sur le réseau et réessaie |

Avant d'utiliser le service, lis l'[avertissement sur les risques](/fr/risk-notice/).
