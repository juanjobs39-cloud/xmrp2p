---
key: closed-tab
lang: fr
slug: what-to-do-if-you-closed-the-tab
title: Que faire si tu as fermé l'onglet en plein swap
description: "Comment reprendre un swap MoneroP2P avec ton fichier de récupération, ce qui se passe avec les délais t0 et t1 et quand tu dois te faire rembourser."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Reprendre un swap avec le fichier de récupération
  totalTime: PT5M
  steps:
    - name: Ouvre l'app
      text: Ouvre l'app MoneroP2P dans n'importe quel navigateur, idéalement sur le même appareil.
    - name: Choisis Reprendre
      text: Clique sur « Reprendre » et charge ton fichier de récupération (ou utilise la copie de ce navigateur si tu l'y as enregistrée).
    - name: Saisis ton mot de passe
      text: Tape le mot de passe utilisé pour chiffrer le fichier.
    - name: Suis l'action indiquée par l'app
      text: L'app lit l'état du contrat et te dit s'il faut confirmer, attendre, te faire rembourser ou recevoir le XMR.
---

**En bref :** rouvre l'app, clique sur « Reprendre », charge ton fichier de récupération et saisis ton mot de passe. L'app lira le contrat et te dira quoi faire. **Fais-le dès que possible :** si le XMR n'a pas été vérifié et que le délai t0 approche, tu dois te faire rembourser à temps.

## Ce qui se passe pendant que l'onglet est fermé

Rien n'est perdu tout de suite, mais l'horloge du contrat continue :

| Moment | Ce qui peut arriver | Ce que tu fais à ton retour |
|---|---|---|
| Avant t0 | Le maker a peut-être bloqué le XMR | L'app le vérifie ; tu confirmes ou tu te fais rembourser |
| Entre t0 et t1 | Le maker peut encaisser (s'il a bloqué le XMR) | S'il a encaissé, l'app t'envoie le XMR |
| Après t1 | Si le maker n'a pas encaissé | Tu te fais rembourser ton USDT |

**Le risque :** si tu ne reviens pas avant t0 et que le maker n'a *pas* bloqué le XMR, le contrat le laisse quand même encaisser entre t0 et t1. C'est pourquoi il est important de revenir vite, ou de ne pas fermer l'onglet.

## Si le maker a déjà encaissé

En encaissant, le maker a révélé sa moitié de clé sur la blockchain. Avec ton fichier de récupération, l'app reconstitue la clé complète et envoie le XMR à ton adresse, même des jours plus tard. Il n'y a pas de délai pour ça.

## Si tu as perdu le fichier

- Si tu utilises **le même navigateur** et n'as pas effacé ses données, l'app a gardé une copie chiffrée : clique sur « Reprendre » et saisis ton mot de passe sans charger de fichier.
- Si tu as perdu le fichier **et** le navigateur, il n'y a aucun moyen de récupérer ta moitié de clé. Nous ne l'avons pas.

## Conseils

- Garde le fichier à deux endroits (par exemple ton ordinateur et une clé USB).
- Utilise un mot de passe dont tu te souviendras.
- Si tu peux, laisse l'onglet ouvert jusqu'à la fin du swap.

Suite : [comment échanger de l'USDT contre du Monero sans intermédiaire](/fr/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
