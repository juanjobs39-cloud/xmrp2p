---
key: swap-costs
lang: fr
slug: how-much-does-it-cost-to-swap-usdt-for-monero
title: Combien coûte vraiment l'échange d'USDT contre du Monero
description: "Ce que tu paies en échangeant de l'USDT contre du XMR : marge sur le prix, frais, gas et frais de réseau. Comment calculer le coût total et comparer avec un seul chiffre."
published: 2026-10-30
updated: 2026-10-30
order: 10
related: [buy-xmr-no-kyc, swap-usdt-xmr, usdt-networks]
---

**En bref :** le coût total d'un échange d'USDT contre du Monero a quatre parties : la **marge sur le prix** (combien de XMR tu reçois par rapport au prix du marché), les **frais du service**, le **gas** sur le réseau de l'USDT et les **frais du réseau Monero**. Pour comparer, inutile de tout additionner : regarde simplement **combien de XMR tu reçois pour le même montant d'USDT**. Celui qui te donne le plus de XMR est le moins cher.

## Les quatre parties du coût

| Partie | Ce que c'est | Ordre de grandeur |
|---|---|---|
| Marge sur le prix | L'écart entre le prix du marché et le prix proposé | La plus grosse partie ; dépend du vendeur |
| Frais du service | Ce que prend la plateforme ou l'échange | Variable ; parfois déjà inclus dans le prix |
| Gas | Ce que le réseau de l'USDT facture pour tes transactions | Sur Arbitrum, en général quelques centimes |
| Frais du réseau Monero | Ce que Monero facture pour t'envoyer le XMR | En général une fraction de centime |

La marge et les frais sont souvent **inclus dans la cotation**, donc tu ne les vois pas séparément. C'est pourquoi le chiffre qui compte est le XMR final.

## Comment calculer le coût réel

1. Cherche le **prix de référence** du XMR en USDT sur un site de cotations.
2. Divise ce que tu envoies par ce prix : c'est le XMR que tu obtiendrais sans frais.
3. Compare avec ce qu'on te propose. La différence, en pourcentage, est ton coût total.

**Exemple avec des chiffres inventés**, juste pour montrer le calcul : si le XMR vaut 300 USDT et que tu envoies 50 USDT, sans frais tu obtiendrais 0,1667 XMR.

| Option | Tu reçois | Coût total |
|---|---|---|
| A | 0,1625 XMR | 2,5 % |
| B | 0,1640 XMR | 1,6 % |

L'option B est moins chère même si ses « frais » affichés étaient plus élevés : ce qui compte, c'est le XMR qui arrive dans ton portefeuille.

## Ce que ça coûte sur MoneroP2P

- **Frais de la plateforme : 0,5 %**, payés par le maker quand il encaisse son USDT. Le prix publié de chaque maker inclut déjà sa marge ; l'app affiche le XMR exact **avant** que tu déposes.
- **Gas sur Arbitrum One :** tu paies le dépôt et la confirmation (et le remboursement si besoin). Ton portefeuille affiche le coût exact avant de signer.
- **Frais du réseau Monero :** déduits quand le XMR t'est envoyé.
- **Les remboursements ne paient pas de frais de plateforme**, seulement le gas.

Dans la vue simple de l'[app](/fr/app/), tu saisis combien d'USDT tu envoies et tu vois toutes les cotations triées par XMR reçu : la comparaison est déjà faite.

## Les coûts qu'on ne voit pas tout de suite

- **Déplacer ton USDT entre réseaux.** Si ton USDT est sur Tron ou Ethereum et que le service utilise Arbitrum, le déplacer coûte des frais et du temps. Parfois plus que le swap lui-même. [Différences entre réseaux](/fr/guides/usdt-trc20-vs-erc20-vs-l2/).
- **Taux flottant ou fixe.** Sur les échanges instantanés, un taux **flottant** peut changer pendant que ton dépôt arrive ; un taux **fixe** garantit le montant mais donne en général moins de XMR.
- **Petits montants.** Le gas et les frais de réseau sont presque fixes, donc ils pèsent plus sur les petits swaps.
- **Le temps.** Un swap qui dure une heure t'expose aux variations de prix. Sur MoneroP2P, le montant de XMR est fixé quand tu demandes le swap.

## Conseils pour payer moins

- Compare toujours par **XMR reçu**, pas par les frais affichés.
- Échange depuis le **réseau où se trouve déjà ton USDT**, si le service le prend en charge.
- Évite les très petits montants si tu peux en regrouper un plus grand (jusqu'à 100 USDT par swap sur MoneroP2P).
- Garde un peu d'**ETH sur Arbitrum** pour le gas, pour ne pas devoir en acheter dans l'urgence.

Si tu ne sais pas encore quelle option utiliser, commence par [comment acheter du Monero sans KYC](/fr/guides/how-to-buy-monero-without-kyc/).
