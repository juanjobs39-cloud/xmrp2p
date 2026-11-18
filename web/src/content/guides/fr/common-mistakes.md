---
key: common-mistakes
lang: fr
slug: common-mistakes-when-sending-crypto
title: Erreurs courantes en envoyant des cryptos (et comment les éviter)
description: "Mauvais réseau, mémo ou tag oublié, montants minimums, pas de gas, adresses empoisonnées et approbations illimitées : comment éviter de perdre des fonds."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**En bref :** les erreurs les plus coûteuses sont d'envoyer sur le mauvais réseau, d'oublier le mémo ou le tag qu'exige une plateforme, d'envoyer moins que le minimum, de manquer de gas et de copier une fausse adresse. Vérifie le réseau, l'adresse complète et le montant avant de signer : les transactions sont irréversibles.

## Erreur 1 : envoyer sur le mauvais réseau

Le même jeton existe sur plusieurs réseaux (par exemple l'USDT sur Tron, Ethereum et Arbitrum). Si tu envoies sur un réseau que le destinataire ne prend pas en charge, les fonds peuvent être perdus ou nécessiter un sauvetage coûteux.

**Comment l'éviter :** confirme le réseau avec le destinataire. L'app MoneroP2P n'affiche que les réseaux actifs.

## Erreur 2 : oublier le mémo, le tag ou le payment ID

Certaines plateformes partagent une adresse entre de nombreux clients et t'identifient par un mémo ou un tag. Sans lui, le dépôt peut rester non attribué.

**Comment l'éviter :** si la plateforme affiche un mémo ou un tag, inclus-le toujours. Sur Monero, les plateformes te donnent en général ta propre sous-adresse et tu n'as pas besoin de payment ID.

## Erreur 3 : envoyer moins que le minimum

Les plateformes et services ont des montants minimums de dépôt. En dessous, le dépôt peut ne pas être crédité. Sur MoneroP2P, chaque offre affiche son minimum et son maximum.

## Erreur 4 : manquer de gas

Pour déplacer de l'USDT, il te faut la crypto du réseau (ETH, TRX…). Sans elle, tu ne peux ni déposer ni te faire rembourser.

**Comment l'éviter :** avant un swap, garde de quoi payer au moins 3 transactions (dépôt, confirmation et un éventuel remboursement).

## Erreur 5 : adresses empoisonnées et malware du presse-papiers

Des attaquants envoient de petits montants depuis des adresses qui ressemblent à la tienne pour que tu les copies depuis ton historique. Certains malwares remplacent l'adresse que tu copies.

**Comment l'éviter :** copie l'adresse depuis sa source (pas ton historique) et compare tout le début **et** la fin.

## Erreur 6 : approbations illimitées

Certaines apps demandent la permission de dépenser une quantité illimitée de tes jetons. Si l'app est compromise, elle peut vider ton solde.

**Comment l'éviter :** n'approuve que le nécessaire. MoneroP2P approuve exactement le montant du swap.

## Erreur 7 : faire confiance à un « support » qui te contacte

Aucune partie légitime ne te demandera ta seed, ton fichier de récupération ou des fonds pour « débloquer » quelque chose.

## Liste de vérification rapide avant de signer

- [ ] Le réseau est-il correct ?
- [ ] L'adresse complète correspond-elle ?
- [ ] Le montant dépasse-t-il le minimum ?
- [ ] Ai-je assez de gas ?
- [ ] Ai-je enregistré mon fichier de récupération (sur MoneroP2P) ?
