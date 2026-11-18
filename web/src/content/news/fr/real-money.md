---
key: real-money-launch
lang: fr
slug: monerop2p-is-live-with-real-money
title: MoneroP2P fonctionne avec de l'argent réel
description: "Depuis le 26 octobre 2026, échange de l'USDT contre du Monero avec de l'argent réel sur Arbitrum One : non custodial, sans compte, jusqu'à 100 USDT par swap."
published: 2026-10-30
---

**En bref :** depuis le **26 octobre 2026**, MoneroP2P fonctionne avec de l'argent réel. Tu peux échanger de l'USDT (USD₮0 sur Arbitrum One) contre du Monero grâce à un atomic swap qui tourne dans ton navigateur, sans compte et sans que personne ne détienne tes fonds. Chaque swap est plafonné à **100 USDT**, une limite imposée par le contrat lui-même.

## Ce qui a changé

Jusque-là, la plateforme ne tournait que sur des réseaux de test. Le premier swap en argent réel s'est déroulé de bout en bout le 26 octobre : l'acheteur a déposé l'USDT, le maker a bloqué le XMR, l'acheteur a confirmé et reçu son Monero, et le contrat a payé le maker. Depuis, l'argent réel est le mode par défaut du site.

## Comment nous protégeons ton argent

- **Personne ne détient les fonds.** Ton USDT est dans un contrat dédié à ton swap, sans fonctions d'administration. Il ne peut que payer le maker une fois que tu peux prendre le XMR, ou te rembourser si quelque chose échoue.
- **Contrat vérifié.** Il a passé la vérification symbolique avec **Halmos** (7 propriétés sur 7 prouvées pour toute entrée) et l'analyse statique avec **Aderyn** (0 résultat élevé) et **Slither** (aucun résultat moyen ou élevé). Son code source est vérifié sur **Sourcify** : [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **Plafond de 100 USDT par swap.** Il n'y a pas encore d'audit externe, donc nous limitons ce qu'un seul swap peut mettre en jeu. Le plafond est dans le contrat et personne ne peut le relever sans en déployer un nouveau.
- **Open source** (AGPL-3.0) sur [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), avec des sommes SHA-256 pour chaque fichier du site afin que tu vérifies ce que tu charges.

## Ce que ça coûte

Les frais de la plateforme sont de **0,5 %** et c'est le maker qui les paie en réclamant. Tu ne paies que le gas d'Arbitrum pour déposer et confirmer, et les frais du réseau Monero à la réception. Le prix de chaque maker inclut déjà sa marge ; l'app affiche le XMR exact avant que tu déposes.

## Autres nouveautés de ces semaines

- **Vue simple :** tape combien d'USDT tu envoies, appuie sur « Échanger » et vois toutes les offres triées selon ce que tu reçois.
- **Plus de 100 USDT, ou aucun maker disponible :** l'app affiche des offres d'échanges instantanés via Trocador. Cette option fonctionne autrement (la plateforme détient l'échange) ; nous l'expliquons dans la [politique de confidentialité](/fr/privacy/).
- **Deviens maker depuis ton navigateur**, sans rien installer : l'onglet ouvert sert de serveur. [Comment devenir maker](/fr/become-a-maker/).
- **Plus de langues :** l'app existe désormais aussi en allemand, en français et en italien.

## La suite

- Un audit externe du contrat, qui nous permettrait de relever le plafond par swap.
- Plus de makers, pour qu'il y ait toujours des offres.
- L'étude d'autres réseaux USDT, comme Tron.

[Ouvrir l'app →](/fr/app/) · Avant de l'utiliser, lis l'[avertissement sur les risques](/fr/risk-notice/).
