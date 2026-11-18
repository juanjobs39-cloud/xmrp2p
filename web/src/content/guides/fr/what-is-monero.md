---
key: what-is-monero
lang: fr
slug: what-is-monero
title: Qu'est-ce que Monero et en quoi il diffère de Bitcoin
description: "Monero (XMR) est privé par défaut : il cache l'expéditeur, le destinataire et le montant. Différences avec Bitcoin en confidentialité, émission et usage."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**En bref :** Monero (XMR) est une cryptomonnaie qui cache par défaut qui envoie, qui reçoit et combien. Sur Bitcoin, au contraire, chaque adresse et chaque montant sont publics et n'importe qui peut tracer les fonds. Monero existe depuis 2014 et il est open source.

## Principales différences

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Expéditeur | Caché (signatures de cercle) | Public |
| Destinataire | Caché (adresses à usage unique) | Public |
| Montant | Caché (RingCT) | Public |
| Confidentialité | Toujours active | Optionnelle et limitée |
| Temps de bloc | Environ 2 minutes | Environ 10 minutes |
| Émission | Petite émission de queue permanente depuis 2022 | Plafond de 21 millions |
| Smart contracts | Non | Scripts limités |

## Comment il assure la confidentialité

- **Signatures de cercle :** ta transaction est mêlée à d'autres sorties de la chaîne, donc on ne sait pas laquelle est la vraie.
- **Adresses furtives :** chaque paiement va à une adresse à usage unique ; ton adresse publique n'apparaît jamais sur la blockchain.
- **RingCT :** les montants sont chiffrés, et pourtant le réseau vérifie qu'aucune monnaie n'est créée de nulle part.

## Fongibilité

Comme l'historique n'est pas visible, chaque XMR est interchangeable avec n'importe quel autre. Avec les cryptos transparentes, certaines unités peuvent être refusées à cause de leur historique.

## View key

Monero permet de partager une **view key** (clé de lecture), qui montre les paiements reçus sans permettre de dépenser. MoneroP2P l'utilise pour que l'acheteur vérifie que le XMR est arrivé à l'adresse partagée.

## À garder en tête

- Certaines plateformes centralisées ont retiré Monero dans certaines juridictions. C'est pourquoi les méthodes sans intermédiaire, comme les atomic swaps, comptent.
- La confidentialité ne te dispense pas des lois de ton pays.

Suite : [comment créer un portefeuille Monero](/fr/guides/how-to-create-a-monero-wallet/).
