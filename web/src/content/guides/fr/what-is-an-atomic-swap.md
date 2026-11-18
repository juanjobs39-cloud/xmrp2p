---
key: atomic-swap
lang: fr
slug: what-is-an-atomic-swap
title: Qu'est-ce qu'un atomic swap et pourquoi est-il sûr
description: "Un atomic swap échange des cryptos entre deux blockchains sans intermédiaire : soit les deux côtés se réalisent, soit aucun. Comment ça marche entre USDT et Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**En bref :** un atomic swap est un échange entre deux cryptomonnaies sur des blockchains différentes où aucune partie ne peut garder les fonds de l'autre. On l'appelle « atomique » parce qu'il est indivisible : soit les deux transferts se réalisent, soit les deux sont annulés. Sa sécurité ne repose pas sur la confiance, mais sur la cryptographie et un contrat avec des délais.

## L'idée en une phrase

Chaque partie bloque ses fonds de sorte que **la seule façon d'être payé soit de révéler la clé dont l'autre a besoin** pour prendre les siens.

## Comment ça marche entre USDT et Monero

Monero n'a pas de smart contracts, donc le protocole utilise deux éléments :

1. **Une adresse Monero partagée**, dont la clé privée est divisée en deux moitiés : l'acheteur de XMR en détient une, le vendeur l'autre. Personne ne peut en dépenser avec une seule moitié.
2. **Un contrat sur le réseau de l'USDT** qui garde l'USDT et ne paie le vendeur que s'il révèle sa moitié de clé.

Quand le vendeur réclame l'USDT, sa moitié est publiée sur la blockchain ; l'acheteur l'utilise pour compléter la clé et prendre le XMR. Si le vendeur ne bloque jamais le XMR, l'acheteur récupère l'USDT.

## Pourquoi c'est sûr

| Risque dans un échange | Comment l'atomic swap le gère |
|---|---|
| L'autre partie n'envoie pas | Tu peux te faire rembourser dans le délai |
| L'autre partie encaisse sans livrer | Pour encaisser, elle doit révéler la clé qui te donne le XMR |
| Un dépositaire disparaît | Il n'y a pas de dépositaire : un contrat et des clés partagées |
| L'autre partie utilise une clé différente sur chaque chaîne | Une preuve cryptographique (DLEQ) montre que c'est la même |

## Ce à quoi tu dois veiller

- **Les délais.** Les atomic swaps sont sûrs si chaque partie agit à temps. Sur MoneroP2P, si le XMR n'est pas vérifié avant le délai t0, tu dois te faire rembourser.
- **Ton fichier de récupération.** Si tu fermes le navigateur, il te faut pour terminer ou te faire rembourser.
- **Le logiciel.** La sécurité dépend de la justesse du code ; le contrat de MoneroP2P est vérifié avec des outils automatiques mais n'a pas encore d'audit externe.

## Un peu d'histoire

Les atomic swaps sont discutés pour Bitcoin depuis le début des années 2010. Pour Monero, qui n'a pas de scripts, des protocoles à clés partagées ont été développés : celui de COMIT (aujourd'hui eigenwallet) pour Bitcoin, et celui d'AthanorLabs pour Ethereum, sur lequel s'appuie MoneroP2P.

Suite : [comment échanger de l'USDT contre du Monero sans intermédiaire](/fr/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
