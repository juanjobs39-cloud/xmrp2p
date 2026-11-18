---
key: telegram-bot
lang: fr
slug: buy-monero-on-telegram-bot
title: "Acheter et vendre du Monero sur Telegram : un bot avec alertes et sans KYC"
description: "Le bot MoneroP2P ouvre le marché P2P et l’échange dans Telegram, notifie tes ordres et envoie des alertes de nouvelles annonces. Sans KYC, non custodial."
published: 2026-11-11
keywords:
  - acheter Monero sur Telegram
  - bot Telegram Monero
  - vendre XMR Telegram
  - bot XMR sans KYC
  - alertes prix Monero Telegram
  - Mini App Monero
  - acheter XMR en P2P
  - échanger Bitcoin contre Monero Telegram
  - MoneroP2PFiatBot
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/fr/
    description: "Marché P2P pour acheter et vendre du Monero (XMR) en monnaie locale, avec un séquestre multisig 2 sur 3 sur le réseau Monero et sans KYC."
  - name: MoneroP2P
    url: https://monerop2p.app/fr/app/
    description: "Plateforme sans compte pour échanger de l'USDT, du BTC, de l'ETH et d'autres cryptos contre du Monero (XMR), avec un atomic swap non custodial pour l'USDT sur Arbitrum."
howto:
  name: "Comment acheter du Monero depuis Telegram avec le bot MoneroP2P"
  totalTime: PT45M
  steps:
    - name: "Ouvre le bot officiel"
      text: "Cherche @MoneroP2PFiatBot sur Telegram, ou suis le lien du site, et appuie sur Démarrer. Vérifie que le nom d'utilisateur est exactement celui-ci."
    - name: "Ouvre le marché dans Telegram"
      text: "Appuie sur le bouton « P2P ». Le marché s'ouvre en Mini App sans quitter Telegram. Crée ton compte avec un pseudo et un mot de passe : sans e-mail ni pièce d'identité."
    - name: "Choisis une annonce"
      text: "Filtre par monnaie et moyen de paiement et compare le prix, les limites et la réputation du vendeur."
    - name: "Attends le séquestre"
      text: "Le vendeur dépose le XMR dans un séquestre multisig 2 sur 3 qui est signé sur ton téléphone. Le bot te prévient quand l'ordre change d'état."
    - name: "Paie et reçois"
      text: "Une fois le XMR bloqué, paie avec le moyen convenu et marque « J'ai payé ». Le vendeur confirme et le séquestre envoie le Monero à ton portefeuille."
faq:
  - q: "Peut-on acheter du Monero sur Telegram ?"
    a: "Oui. Le bot @MoneroP2PFiatBot ouvre le marché P2P Fiat de MoneroP2P dans Telegram en Mini App : tu choisis une annonce, le XMR est dans un séquestre multisig 2 sur 3 et tu paies par virement, appli de paiement ou en espèces. Il ne demande ni KYC ni e-mail."
  - q: "Le bot MoneroP2P détient-il mes fonds ou mes clés ?"
    a: "Non. Le bot ne fait qu'ouvrir la plateforme et envoyer des notifications. Ton compte et le séquestre sont signés sur ton appareil ; le bot ne voit jamais de clés, de mots de passe ni de coordonnées de paiement, et il ne peut pas déplacer de XMR."
  - q: "Que peut voir Telegram ?"
    a: "Telegram sait que tu parles au bot et voit le texte des notifications. C'est pourquoi les notifications ne contiennent ni montants, ni adresses, ni coordonnées de paiement, et les apps retirent les données que Telegram ajoute à l'URL et ne chargent aucun script de telegram.org."
  - q: "Faut-il un compte pour recevoir des alertes de nouvelles annonces ?"
    a: "Non. Avec /alerts, tu choisis de voir les annonces d'achat, de vente ou les deux, et dans quelles monnaies. Il n'y a pas de compte à créer ni rien à connecter."
  - q: "Comment désactiver les notifications ?"
    a: "Envoie /stop au bot. Il supprime le lien avec ton compte et tes alertes. Bloquer le bot fait la même chose."
  - q: "Quelqu'un m'a écrit sur Telegram pour me vendre du Monero. Est-ce le bot ?"
    a: "Non. Le bot officiel ne commence jamais de conversation pour proposer des affaires, ne discute pas au nom de l'autre partie et ne demande jamais de paiements, de seeds ni de mots de passe. Si une personne t'écrit sur Telegram pour conclure un achat ou demander un paiement hors d'un ordre, c'est une arnaque."
  - q: "Quelles langues parle le bot ?"
    a: "L'anglais et l'espagnol, selon la langue de ton Telegram. Le site de P2P Fiat et la plateforme d'échange existent aussi en français, en allemand et en italien."
---

**En bref :** tu peux maintenant **acheter et vendre du Monero (XMR) sans quitter Telegram**. Le bot officiel [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) ouvre le [marché P2P Fiat](https://fiat.monerop2p.app/fr/) et la [plateforme d'échange](/fr/app/) en Mini App, te prévient quand un ordre avance et envoie des **alertes de nouvelles annonces** dans ta monnaie. **Sans KYC et non custodial :** le séquestre est signé sur ton téléphone et le bot ne touche jamais tes fonds.

[Ouvrir le bot sur Telegram →](https://t.me/MoneroP2PFiatBot)

## Que fait le bot ?

| Commande | Ce qu'elle fait | Compte requis ? |
|---|---|---|
| Bouton **P2P** | Ouvre le marché pour acheter ou vendre du XMR en monnaie locale | Oui, créé en quelques secondes |
| `/alerts` | Te prévient des nouvelles annonces d'achat, de vente ou des deux, dans les monnaies choisies | Non |
| `/swap` | Ouvre la plateforme pour échanger du BTC, de l'USDT, de l'ETH et d'autres cryptos contre du XMR, et te tient informé de l'avancement | Non |
| `/orders` | Liste tes ordres ouverts avec un bouton pour ouvrir chacun | Oui |
| `/stop` | Désactive les notifications et supprime tes alertes | Non |

En plus, si tu vends et acceptes des demandes hors ligne, le bot te permet d'**accepter ou de refuser une demande depuis le message**, sans ouvrir le site.

## Comment acheter du Monero depuis Telegram ?

1. Ouvre [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) et appuie sur **Démarrer**.
2. Appuie sur **P2P**. Le marché s'ouvre dans Telegram. Crée ton compte avec un pseudo et un mot de passe.
3. Choisis ta monnaie et ton moyen de paiement et prends une annonce.
4. Le vendeur dépose le XMR dans un **séquestre multisig 2 sur 3**. Après 10 confirmations (environ 20 minutes), le chat chiffré et ses coordonnées de paiement s'ouvrent.
5. Paie, marque **« J'ai payé »** et attends que le vendeur libère. Le XMR arrive dans ton portefeuille.

C'est le même marché que sur le site, avec les mêmes règles. Les détails sont dans [comment fonctionne P2P Fiat](https://fiat.monerop2p.app/fr/how-it-works/).

## Comment recevoir des alertes de nouvelles annonces ?

Envoie `/alerts` et choisis ce que tu veux voir avec les boutons. Tu peux aussi taper directement les monnaies, par exemple `/alerts EUR CHF`.

- **Ce que contient chaque alerte :** prix, limites, moyens de paiement et un bouton qui ouvre le marché déjà filtré.
- **Ce qu'elle omet :** les conditions de l'annonce et tout moyen de contacter l'annonceur hors de la plateforme.
- **Quand elle arrive :** 15 minutes après la publication de l'annonce, et seulement si elle est toujours active.
- **Pas d'avalanche :** au maximum une alerte par annonceur toutes les 6 heures.
- **Filtre anti-arnaque :** les annonces qui demandent de continuer sur WhatsApp, Telegram ou par téléphone ne sont jamais signalées.

## Puis-je échanger du Bitcoin ou de l'USDT contre du Monero depuis Telegram ?

Oui. `/swap` ouvre la [plateforme d'échange](/fr/app/) dans Telegram : tu compares les offres pour passer du BTC, de l'USDT, de l'ETH et de plus de 2 500 cryptos au XMR, ou pour [vendre du XMR](/fr/news/sell-monero-for-usdt-or-bitcoin/). Si tu veux, le bot te prévient quand l'échange change d'état : dépôt détecté, envoi en cours, terminé, expiré ou remboursé.

Ces notifications utilisent un code valable pour un seul chat, qui envoie au maximum 10 notifications et expire après 48 heures. Elles ne contiennent ni montants ni adresses.

## Est-ce sûr d'acheter du Monero sur Telegram ?

Ça dépend de qui tu as en face. Il y a trois situations très différentes :

| | Site MoneroP2P | Bot officiel | Quelqu'un qui t'écrit sur Telegram |
|---|---|---|---|
| Qui détient le XMR | Séquestre multisig 2 sur 3 | Le même séquestre | Personne : tu fais confiance à un inconnu |
| Demande de payer d'avance | Non | Non | Presque toujours |
| Chat avec l'autre partie | Chiffré, dans l'ordre | Le même, dans l'ordre | Privé, sans trace |
| En cas de problème | Appel au support | Appel au support | Personne à qui te plaindre |

**Le bot n'est pas un chat avec le vendeur.** Il ne fait qu'ouvrir la plateforme et te notifier. Donc la règle habituelle tient toujours : **ne conclus jamais une affaire par messages privés Telegram**. Si quelqu'un t'écrit pour proposer du XMR, demander un paiement hors d'un ordre ou t'« aider » avec ton compte, c'est une arnaque.

Comment reconnaître le bot officiel :

- Le nom d'utilisateur est exactement **@MoneroP2PFiatBot**. Méfie-toi des noms qui y ressemblent.
- Il ne demande **jamais** ta seed, ton mot de passe, ton fichier de sauvegarde ni un paiement.
- Il ne t'écrit **jamais** en premier pour proposer une affaire.

Plus de règles dans [sécurité et arnaques courantes](https://fiat.monerop2p.app/fr/safety/).

## Que peut voir Telegram ?

Telegram n'est pas une app privée comme Monero, donc le bot est conçu pour lui en donner le moins possible :

- **Les notifications ne contiennent ni montants, ni adresses, ni coordonnées de paiement.** Elles disent seulement que quelque chose a changé et incluent un bouton pour ouvrir l'ordre.
- **Les clés ne quittent jamais ton appareil.** Ton compte et le séquestre sont signés sur ton téléphone ; le bot ne les voit jamais.
- **Pas de scripts Telegram.** Les apps ne chargent aucun code de telegram.org et retirent de l'URL les données que Telegram ajoute à l'ouverture.
- **Ce que Telegram sait :** que tu utilises le bot et quand tu reçois des notifications. Si ça compte pour toi, utilise le site et active les notifications du navigateur.

Les détails sont dans la [politique de confidentialité](/fr/privacy/).

## Ce qu'il ne fait pas

- **Il ne détient ni fonds ni clés**, et il ne peut pas déplacer de XMR.
- **Il ne remplace pas les règles du marché :** le paiement en monnaie fiat se fait toujours hors de la plateforme, et le séquestre protège le XMR, pas le virement.
- **Il ne parle pas toutes les langues :** le bot répond en anglais et en espagnol.
- **Il ne garantit pas d'annonces dans ta monnaie.** Le marché est jeune ; les alertes servent justement à te prévenir quand une apparaît.

Ce qui peut être vérifié sur la plateforme et quelles sont ses limites : [MoneroP2P est-il fiable ?](/fr/is-monerop2p-legit/)

## Pour commencer

[Ouvrir @MoneroP2PFiatBot →](https://t.me/MoneroP2PFiatBot) · [Voir le marché sur le site →](https://fiat.monerop2p.app/fr/app/) · [Échanger des cryptos contre du XMR →](/fr/app/)

Tu viens de LocalMonero ? Lis [alternatives à LocalMonero en 2026](/fr/news/localmonero-alternatives-2026/).
