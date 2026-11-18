---
key: trust
lang: fr
title: "MoneroP2P est-il fiable et sûr ? Comment le vérifier toi-même"
description: "Ce que tu peux vérifier toi-même avant de faire confiance à MoneroP2P : contrat, code, frais et limites. Et ce qui manque encore, comme un audit externe."
updated: 2026-11-10
faq:
  - q: "MoneroP2P est-il fiable ?"
    a: "MoneroP2P est une plateforme open source et non custodial qui fonctionne avec de l'argent réel depuis le 26 octobre 2026. Son contrat de swap n'a aucune fonction d'administration et son code source est vérifié sur Sourcify, donc les principales affirmations se vérifient sur des sources publiques. C'est un projet jeune sans audit externe, c'est pourquoi chaque atomic swap est limité à 100 USDT."
  - q: "MoneroP2P peut-il prendre mes fonds ?"
    a: "Pas dans un atomic swap : l'USDT est dans un contrat sans fonction d'administration, de pause ni de mise à jour, et le XMR est sur une adresse qui exige les deux moitiés de clé. Dans P2P Fiat, le XMR est dans un séquestre multisig 2 sur 3 qu'aucune partie ne peut déplacer seule, MoneroP2P compris. Les échanges instantanés via Trocador sont différents : la plateforme choisie détient les fonds pendant l'échange."
  - q: "MoneroP2P a-t-il été audité ?"
    a: "Pas encore par une société externe. Le contrat a passé des vérifications automatiques avec Halmos (7/7 propriétés prouvées), Aderyn (0 problème élevé) et Slither (aucun problème moyen ou élevé), et le rapport et les exécutions sont publics. Tant qu'il n'y a pas d'audit externe, le contrat limite chaque swap à 100 USDT."
---

**En bref :** MoneroP2P est une plateforme open source et non custodial qui fonctionne avec de l'argent réel depuis le 26 octobre 2026. Tu n'as pas à nous croire sur parole : chaque affirmation ci-dessous se vérifie sur des sources publiques. C'est aussi un projet jeune sans audit externe, donc les limites sont basses exprès.

## Ce que tu peux vérifier toi-même

| Affirmation | Comment la vérifier |
|---|---|
| Personne ne détient ton USDT dans un atomic swap | Le contrat n'a aucune fonction d'administration, de pause ni de mise à jour. Lis son code vérifié sur [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (exact match) ou sur [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| Le contrat a été vérifié | Halmos a prouvé 7 propriétés sur 7, Aderyn n'a trouvé aucun problème élevé et Slither aucun problème moyen ou élevé. Voir le [rapport](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) et les [exécutions publiques](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Les limites et les frais ne peuvent pas augmenter | Le maximum de 100 USDT par swap et le plafond de frais de 1 % sont des constantes du contrat. Les frais actuels sont de 0,5 %, payés par le maker. |
| Le site exécute le code publié | Tout le code est sur [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) sous AGPL-3.0. Chaque version publie des [SHA256SUMS](/SHA256SUMS) pour comparer les fichiers chargés avec ta propre compilation. |
| P2P Fiat ne peut pas déplacer ton XMR seul | Chaque ordre utilise un multisig Monero 2 sur 3 : acheteur, vendeur et arbitre détiennent une clé chacun et il en faut deux. Voir [comment fonctionne P2P Fiat](https://fiat.monerop2p.app/fr/how-it-works/). |
| Tes clés restent chez toi | Les clés sont générées dans ton navigateur. L'app de swap n'a pas de comptes, et ses pages appliquent une Content Security Policy stricte que tu peux lire dans le code source. |
| Ça a fonctionné avec des fonds réels | Le premier swap sur le mainnet s'est terminé le 26 octobre 2026. Chaque swap crée son propre contrat via la factory, visible sur Arbiscan. |

## Limites et ce qui nous manque encore

- **Pas d'audit externe.** Les vérifications ci-dessus sont des outils automatiques, pas l'examen d'une société d'audit. C'est pourquoi le contrat limite chaque swap à 100 USDT.
- **Projet jeune.** Lancé en octobre 2026. Le volume est faible et P2P Fiat a peu d'annonces dans certaines monnaies.
- **Les échanges instantanés sont custodial.** Les swaps depuis BTC, ETH et d'autres cryptos passent par des plateformes tierces via Trocador : la plateforme choisie détient les fonds quelques minutes, et la cotation inclut une marge de 1 % pour MoneroP2P.
- **P2P Fiat protège le XMR, pas le paiement bancaire.** Le paiement en monnaie fiat se fait hors de la plateforme. Les moyens réversibles comme PayPal ou les cartes sont plus risqués, et les litiges sont tranchés par l'arbitre, que nous gérons.
- **Tu es responsable de tes clés.** Si tu perds ton fichier de récupération ou le mot de passe de ton compte, nous ne pouvons pas les restaurer.
- **Aucune garantie d'entreprise.** Pas d'assurance des dépôts ni de hotline. Lis l'[avertissement sur les risques](/fr/risk-notice/).

## Qui est derrière et comment nous joindre

MoneroP2P est un projet open source indépendant. Le protocole s'appuie sur les atomic swaps d'AthanorLabs. Tu peux nous joindre via [la page contact](/fr/contact/) et signaler des vulnérabilités en privé via l'onglet Security du dépôt. Nous ne te demanderons jamais ta seed, ton fichier de récupération ni un paiement pour « débloquer » un swap.

## Avant de l'utiliser

1. Commence par un petit montant.
2. Lis [comment ça marche](/fr/how-it-works/) et la [page sécurité](/fr/security/).
3. N'échange jamais hors de la plateforme, même si quelqu'un te le demande.
