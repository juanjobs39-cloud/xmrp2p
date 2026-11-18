---
key: privacy
lang: fr
title: Politique de confidentialité
description: "Quelles données MoneroP2P traite (presque aucune), ce qui est public sur la blockchain, ce que voit le proxy de nœud et comment réduire ton exposition."
updated: 2026-11-09
---

**En bref :** nous n'avons pas de comptes, n'utilisons ni cookies ni outils d'analyse et ne stockons pas tes clés. Certaines données sont publiques par nature (les transactions sur la chaîne de l'USDT) et nos serveurs traitent un minimum de données techniques pour fonctionner. L'exception, ce sont les échanges instantanés via Trocador, expliqués plus bas.

## Ce que nous ne collectons PAS

- Nom, e-mail, téléphone ou pièces d'identité.
- Cookies de suivi ou outils d'analyse tiers.
- Clés privées, phrases seed ou contenu de ton fichier de récupération.

## Ce que traitent nos serveurs (Cloudflare)

| Donnée | Finalité | Conservation |
|---|---|---|
| Adresse IP | Limites anti-abus et blocage régional | Nous ne la stockons pas pour les swaps MoneroP2P ; Cloudflare peut la journaliser selon sa politique |
| Messages publics du protocole (clés publiques, preuve DLEQ, view key) | Permettre à toi et au maker de terminer le swap | La salle s'efface après 3 jours |
| Offres des makers | Afficher le carnet d'ordres | Tant que l'offre est active |

## Échanges instantanés via Trocador

Quand aucun maker MoneroP2P ne couvre ton montant, l'app peut afficher des cotations d'échanges instantanés via [Trocador](https://trocador.app). Cette option fonctionne autrement :

- C'est la plateforme choisie qui fait l'échange, pas MoneroP2P, et tu envoies ton USDT à l'adresse de cette plateforme. C'est un service custodial avec ses propres conditions et sa note KYC.
- Notre serveur demande les cotations et crée l'échange en ton nom. Les plateformes listées sur Trocador exigent que, lorsque tu **crées** un échange, nous conservions ton **adresse IP, la langue du navigateur et les informations du navigateur/appareil (user agent)** liées à l'identifiant de l'échange, afin de répondre aux demandes des autorités que Trocador nous transmet.
- Nous conservons ces données **indéfiniment**, comme le conseille Trocador, car ces demandes peuvent arriver longtemps après l'échange. Elles ne servent à rien d'autre et ne sont partagées qu'en réponse à une telle demande.
- Consulter les cotations ne stocke rien. Les swaps avec des makers MoneroP2P ne stockent jamais ces données.
- Pour l'éviter, utilise un maker MoneroP2P, ou va directement sur Trocador (qui conserve alors tes données selon ses propres conditions). Tor ou un VPN réduisent ce que révèle ton IP.

## Ce qui est public sur la blockchain

- Ton dépôt d'USDT, ton adresse de portefeuille EVM et les événements du contrat sont publics sur le réseau de l'USDT.
- Sur Monero, les transactions sont privées par conception, mais la view key partagée du swap permet aux deux parties de voir l'adresse commune.

## Proxy de nœud Monero

Si tu utilises notre proxy, il voit les requêtes de ton navigateur (par exemple, quelle transaction tu vérifies). Pour l'éviter, utilise ton propre nœud.

## Stockage dans le navigateur

L'app conserve une copie **chiffrée** du swap en cours dans ton navigateur, avec le même mot de passe que ton fichier de récupération. Tu peux la supprimer en effaçant les données du site.

## Extension MoneroP2P Wallet

L'extension **ne collecte ni n'envoie aucune donnée personnelle** : pas de comptes, d'analyse ni de télémétrie. Ta seed, tes clés et ton historique sont stockés **chiffrés uniquement dans ton navigateur** (Argon2id et XChaCha20-Poly1305) et n'en sortent jamais. Pour se synchroniser, l'extension se connecte au nœud Monero de ton choix (par défaut, notre proxy décrit plus haut) ; ce nœud voit les requêtes à la blockchain et les transactions déjà signées que tu envoies, pas tes clés. Désinstaller l'extension supprime toutes ses données.

Pour le compte Arbitrum, l'extension interroge le RPC public d'Arbitrum (arb1.arbitrum.io ; sepolia-rollup.arbitrum.io pour les tests), qui voit ton adresse Arbitrum publique et les transactions signées, jamais tes clés. Sur monerop2p.app et fiat.monerop2p.app, elle ne partage ton compte ou une adresse Monero avec le site que si tu l'approuves, et tu peux la déconnecter dans les Réglages.

**Swap (optionnel).** Si tu utilises l'onglet « Swap » de l'extension, les cotations et l'échange sont demandés à notre API (api.monerop2p.app), qui communique avec Trocador. Il en va de même que pour les échanges Trocador dans l'app : à la création de l'échange, nous conservons ton IP, ta langue et ton navigateur liés à son identifiant, comme ces plateformes l'exigent. La liste de tes échanges est stockée chiffrée dans ton navigateur. Si tu n'utilises pas « Swap », l'extension ne se connecte pas à notre API.

## Notifications de P2P Fiat (optionnel)

Si tu actives les notifications sur fiat.monerop2p.app, nous stockons l'adresse d'abonnement que ton navigateur nous donne, liée à ton compte P2P, pour te prévenir des demandes et des changements de tes ordres quand l'app est fermée. La notification passe par le service push de ton navigateur (Google, Mozilla, Apple ou Microsoft) et elle est vide : aucun montant, pseudo ni détail d'ordre ; le texte est ajouté par le site. Tu peux les désactiver à tout moment et l'abonnement est supprimé. Si tu ne les actives pas, rien n'est stocké.

Tu peux aussi connecter le bot Telegram de P2P Fiat depuis « Compte ». Nous stockons uniquement l'identifiant de ta conversation avec le bot et la langue, liés à ton compte P2P. Les messages indiquent le type d'avis (par exemple « nouvelle demande » ou « l'acheteur a marqué comme payé ») et incluent le lien de l'ordre : jamais de montants, pseudos ni coordonnées de paiement. Telegram, en tant que messagerie, voit que tu utilises le bot et ces messages. Si tu réponds à une demande avec les boutons « Accepter » ou « Refuser », le bot l'enregistre comme le site. Envoyer /stop au bot, ou « Déconnecter Telegram » dans l'app, supprime le lien ; bloquer le bot aussi. Les boutons du bot ouvrent l'app dans Telegram. Ouverte ainsi, Telegram transmet à la page quelques données de ton compte Telegram (comme ton nom) ; l'app les efface au démarrage et ne les envoie jamais à notre serveur. Ton compte P2P, ses clés et la signature du séquestre restent sur ton appareil, comme dans le navigateur. Les alertes de nouvelles annonces (/alerts dans le bot) fonctionnent sans compte : nous stockons le chat_id, la langue et les filtres choisis (achat ou vente, et monnaies), et « Désactiver les alertes » ou /stop les suppriment. Les alertes ne contiennent que des données déjà publiques sur le marché. Si tu ouvres l'échange depuis le bot (/swap), nous stockons avec le swap un code qui nous permet de t'informer de sa progression dans cette conversation (statut uniquement, ni montants ni adresses) ; il est supprimé avec le swap.

## Contact

[EMAIL_CONTACTO]
