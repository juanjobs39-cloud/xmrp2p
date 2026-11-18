---
key: monero-wallet
lang: fr
slug: how-to-create-a-monero-wallet
title: Comment créer un portefeuille Monero
description: "Les portefeuilles Monero pour mobile et ordinateur, comment en créer un, garder la seed en sécurité et obtenir ton adresse. Avec le stagenet pour tester."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Créer un portefeuille Monero
  steps:
    - name: Choisis un portefeuille
      text: Télécharge un portefeuille depuis son site officiel ou la liste de getmonero.org.
    - name: Crée un nouveau portefeuille
      text: Choisis de créer un nouveau portefeuille et définis un mot de passe local.
    - name: Sauvegarde la phrase seed
      text: Écris la phrase seed sur papier, dans l'ordre, et garde-la en lieu sûr et hors ligne.
    - name: Copie ton adresse
      text: Dans la section Recevoir, copie ton adresse. Pour essayer MoneroP2P, utilise un portefeuille stagenet.
---

**En bref :** télécharge un portefeuille Monero depuis son site officiel, crée un nouveau portefeuille, écris la phrase seed sur papier et copie ton adresse dans « Recevoir ». Pour le mode entraînement de MoneroP2P, il te faut un portefeuille **stagenet** (le réseau de test de Monero), que certains portefeuilles de bureau permettent de choisir.

## Options connues

| Portefeuille | Plateforme | Remarques |
|---|---|---|
| Monero GUI et CLI (officiels) | Windows, macOS, Linux | Du projet Monero ; prennent en charge le stagenet |
| Feather Wallet | Windows, macOS, Linux | Portefeuille de bureau léger ; prend en charge le stagenet |
| Cake Wallet | Android, iOS, ordinateur | Populaire sur mobile |
| Autres | Divers | Consulte la liste à jour sur getmonero.org |

> Télécharge toujours depuis le site officiel de chaque portefeuille et vérifie les signatures si le projet les publie. Méfie-toi des applis imitatrices dans les stores.

## Pas à pas

1. **Installe le portefeuille** depuis son site officiel.
2. **Crée un nouveau portefeuille.** Il demande un mot de passe : il protège le fichier sur cet appareil, ce n'est pas ta seed.
3. **Sauvegarde la phrase seed.** C'est une liste de mots (25 au format classique, 16 au format Polyseed utilisé par certains portefeuilles). Écris-les sur papier, dans l'ordre. Qui les possède contrôle tes fonds.
4. **Note la hauteur de restauration** si le portefeuille l'affiche : elle accélère la récupération.
5. **Copie ton adresse** dans « Recevoir ». Les adresses principales Monero sur le réseau réel commencent par `4` ; les sous-adresses par `8`. Sur le stagenet, elles commencent par `5` ou `7`.

## Pour essayer MoneroP2P (stagenet)

- Dans Monero GUI ou Feather, choisis **stagenet** en créant le portefeuille (dans les réglages ou au démarrage).
- Le XMR du stagenet n'a aucune valeur ; tu l'obtiens sur des faucets stagenet.
- En mode entraînement, l'app MoneroP2P n'accepte que des adresses stagenet.

## Bonnes pratiques

- Ne partage jamais ta seed, même avec le support.
- Utilise une nouvelle adresse ou sous-adresse pour chaque swap si tu veux plus de confidentialité.
- Quand tu reçois du XMR, le réseau exige environ 10 confirmations (environ 20 minutes) avant que tu puisses le dépenser.

Suite : [qu'est-ce que Monero et en quoi il diffère de Bitcoin](/fr/guides/what-is-monero/).
