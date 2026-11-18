---
key: security
lang: fr
title: Sécurité de MoneroP2P
description: "Pourquoi personne ne détient tes fonds, comment fonctionnent les remboursements, les risques et comment vérifier le code. Vérifié avec Halmos, Aderyn et Slither."
updated: 2026-10-27
---

**En bref :** sur MoneroP2P, personne ne détient de fonds. Ton USDT est dans un contrat qui ne libère l'argent que selon des règles publiques, et le XMR est sur une adresse que personne ne peut déplacer sans les deux moitiés de clé. Il fonctionne avec de l'argent réel sur Arbitrum One + Monero, avec un **maximum de 100 USDT par swap imposé par le contrat**. Le contrat est vérifié avec Halmos, Aderyn et Slither et son code est publié sur Sourcify ; il n'a pas encore eu d'audit externe, c'est pourquoi chaque swap est plafonné.

## Pourquoi personne ne détient tes fonds

- **L'USDT** est dans un contrat dédié à ton swap. Il n'a aucune fonction d'administration : ni nous ni le maker ne pouvons le retirer, sauf via `claim` et `refund`.
- **Le XMR** est sur une adresse partagée. Le maker ne peut pas le reprendre sans ta moitié de clé, et tu ne peux pas le prendre sans la sienne.
- **Tes clés** sont générées dans ton navigateur et ne sont jamais envoyées à nos serveurs. Le backend rejette tout message contenant une clé privée complète.

## Comment fonctionnent les remboursements

| Situation | Ce qui se passe |
|---|---|
| Le maker ne dépose pas le XMR | Tu te fais rembourser avant t0 (l'app te le demande) |
| Le maker dépose moins de XMR | Tu ne confirmes pas et tu te fais rembourser avant t0 |
| Tu as confirmé et le maker n'encaisse pas | Tu te fais rembourser à partir de t1 |
| Tu as fermé l'onglet | Reviens avec ton [fichier de récupération](/fr/guides/what-to-do-if-you-closed-the-tab/) |

## Risques à connaître

1. **Délais.** Si tu ne te fais pas rembourser à temps alors que le XMR n'est pas arrivé, tu peux perdre l'USDT. L'app te prévient, mais elle doit être ouverte ou tu dois revenir avec le fichier.
2. **Fichier de récupération.** Sans lui et son mot de passe, tu ne peux ni réclamer le XMR ni te faire rembourser. Nous ne pouvons pas le récupérer pour toi.
3. **Gels d'USDT.** Tether peut geler des adresses. Chaque swap utilise un contrat séparé, mais le risque existe.
4. **Pas encore d'audit externe.** Le contrat a passé des vérifications automatiques (Halmos, Aderyn, Slither), mais un logiciel peut toujours contenir des bugs. Le plafond de 100 USDT par swap limite ce qu'un seul swap peut mettre en jeu.
5. **Confidentialité.** Le proxy de nœud Monero voit ce que ton navigateur demande. Tu peux utiliser ton propre nœud.

## Comment nous protégeons l'app

- **Content Security Policy** stricte : l'app n'exécute que son propre code.
- **Subresource Integrity** sur les scripts et les styles, et l'intégrité du cœur cryptographique est vérifiée avant usage.
- **Aucun script tiers**, aucun outil d'analyse, aucun cookie.
- **Compilations vérifiables :** nous publions des `SHA256SUMS` pour chaque fichier et une copie sur IPFS.

## Audits

Le contrat a été vérifié avec des outils libres et ouverts : **Halmos** (vérification symbolique, 7/7 propriétés prouvées pour toutes les entrées), **Aderyn** (0 problème élevé) et **Slither** (aucun problème moyen ou élevé). Son code est vérifié sur **Sourcify** (exact match). Rapport : [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). Un audit externe est encore en attente ; le périmètre préparé est dans [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md).

## Code source et signalements

Open source (AGPL-3.0) : [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). Pour signaler une vulnérabilité, utilise le signalement privé de GitHub comme décrit dans `SECURITY.md`.
