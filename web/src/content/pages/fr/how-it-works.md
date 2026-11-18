---
key: how
lang: fr
title: Comment fonctionne un swap USDT vers Monero sur MoneroP2P
description: "Un atomic swap échange ton USDT contre du XMR sans intermédiaire : un contrat garde l'USDT et ne le libère que lorsque tu peux prendre le XMR. Explication simple."
updated: 2026-10-24
---

**En bref :** ton USDT est placé dans un smart contract qui ne peut payer le vendeur que s'il révèle un secret. Ce même secret est la moitié qui te manque pour ouvrir l'adresse Monero où le vendeur a déposé le XMR. C'est pourquoi le swap est « atomique » : soit les deux côtés se réalisent, soit aucun. Si quelque chose échoue, le contrat te rembourse ton USDT.

## Pour les débutants

Imagine un coffre-fort à deux serrures :

1. **Toi et le vendeur (le « maker ») créez ensemble une adresse Monero**, et chacun ne détient que la moitié de sa clé. Personne ne peut déplacer ce qui s'y trouve sans les deux moitiés.
2. **Tu déposes l'USDT dans un contrat.** Le contrat sait vérifier la demi-clé du maker, mais ne la connaît pas.
3. **Le maker dépose le XMR** à l'adresse commune. L'app vérifie que le bon montant est arrivé.
4. **Tu confirmes** dans le contrat que tout est en ordre.
5. **Le maker encaisse l'USDT**, et pour cela il doit remettre sa demi-clé au contrat, qui la publie sur la blockchain.
6. **L'app récupère cette demi-clé**, la combine avec la tienne et envoie le XMR à ton adresse.

Si le maker ne dépose jamais le XMR, tu ne confirmes pas et tu récupères ton USDT par remboursement.

## Ce qu'il te faut

| Il te faut | Pour |
|---|---|
| Un portefeuille de navigateur (MetaMask ou compatible) avec de l'USDT | Déposer dans le contrat |
| Un peu de la crypto du réseau (par ex. de l'ETH sur Arbitrum) | Payer le gas |
| Une adresse Monero | Recevoir le XMR ([créer un portefeuille](/fr/guides/how-to-create-a-monero-wallet/)) |
| Un fichier de récupération protégé par mot de passe | Reprendre si tu fermes l'onglet |

## Les deux délais (t0 et t1)

| Moment | Ce que tu peux faire | Ce que le maker peut faire |
|---|---|---|
| Avant **t0**, pas encore confirmé | Confirmer ou te faire rembourser | Rien |
| Après ta confirmation, ou entre **t0** et **t1** | Attendre | Encaisser (en révélant son secret) |
| À partir de **t1** | Te faire rembourser | Rien |

**Important :** si tu ne confirmes ni ne te fais rembourser avant t0, le contrat laisse le maker encaisser même s'il n'a jamais déposé le XMR. C'est pourquoi l'app te demande automatiquement de te faire rembourser quand le XMR n'est pas vérifié à l'approche de t0, et pourquoi tu dois garder le fichier de récupération.

## Explication technique

- **Moitiés de clé.** Chaque partie choisit un scalaire de 252 bits `s`. La clé de dépense de l'adresse commune est `S_taker + S_maker` (ed25519) ; la clé de lecture est `v_taker + v_maker`.
- **Preuve DLEQ.** Chaque partie prouve, sans le révéler, que le même `s` se cache derrière sa clé ed25519 (Monero) et une clé secp256k1, celle que vérifie le contrat. Nous utilisons la construction `sigma_fun`, la même qu'eigenwallet.
- **Contrat.** Un séquestre par swap (clone EIP-1167) stocke `keccak(s_maker·G)` et `keccak(s_taker·G)`. `claim(s_maker)` et `refund(s_taker)` vérifient le secret grâce à une astuce `ecrecover`. Leurs fenêtres ne se chevauchent jamais.
- **Vérification du XMR.** Le maker envoie l'ID et la clé de transaction ; l'app vérifie le paiement avec `check_tx_key` sans synchroniser tout un portefeuille.
- **Sweep.** Dès que le secret du maker apparaît dans l'événement `Claimed`, l'app calcule `s_taker + s_maker` et envoie le XMR à ton adresse.

La conception complète est dans le [document d'architecture](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) (en espagnol) et s'appuie sur le protocole d'AthanorLabs.
