---
key: about
lang: pt
title: Sobre o MoneroP2P
description: "O que é o MoneroP2P, seu estado atual e como se financia (uma taxa em cada swap concluído)."
updated: 2026-10-24
---

**Resposta curta:** o MoneroP2P é um projeto de código aberto para trocar USDT por Monero sem intermediários, com atomic swaps que rodam no navegador. Funciona com dinheiro real na Arbitrum One + Monero (máximo de 100 USDT por swap); o contrato foi verificado com Halmos, Aderyn e Slither e ainda não tem auditoria externa.

## O que construímos

O app web, o contrato inteligente, o núcleo criptográfico e o programa que os makers rodam. Não guardamos fundos nem armazenamos chaves de usuários.

## Como se financia

O contrato cobra uma taxa percentual quando um swap é concluído. A porcentagem é fixada quando o contrato é implantado e tem teto de 1% no código, que ninguém pode mudar. Reembolsos não pagam taxa.

## Estado

- No ar com dinheiro real desde outubro de 2026 (máximo de 100 USDT por swap), com um modo de prática em testnet.
- Contrato verificado com Halmos, Aderyn e Slither e publicado no Sourcify.
- Pendente: uma auditoria externa.

## Créditos

O protocolo se baseia no trabalho da AthanorLabs e em pesquisas anteriores da COMIT e do projeto Farcaster. A prova DLEQ usa a mesma construção da eigenwallet.

## Código

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (licença AGPL-3.0).
