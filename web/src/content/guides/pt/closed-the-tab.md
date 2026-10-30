---
key: closed-tab
lang: pt
slug: what-to-do-if-you-closed-the-tab
title: O que fazer se você fechou a aba no meio do swap
description: "Como retomar um swap do MoneroP2P com seu arquivo de recuperação, o que acontece com os prazos t0 e t1 e quando você precisa reembolsar."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Retomar um swap com o arquivo de recuperação
  totalTime: PT5M
  steps:
    - name: Abra o app
      text: Abra o app do MoneroP2P em qualquer navegador, de preferência no mesmo dispositivo.
    - name: Escolha Retomar
      text: Clique em "Retomar" e envie seu arquivo de recuperação (ou use a cópia deste navegador se você a salvou aqui).
    - name: Digite sua senha
      text: Digite a senha que você usou para criptografar o arquivo.
    - name: Siga a ação que o app mostrar
      text: O app lê o estado do contrato e diz se você deve confirmar, esperar, reembolsar ou receber o XMR.
---

**Resposta curta:** abra o app de novo, clique em "Retomar", envie seu arquivo de recuperação e digite sua senha. O app vai ler o contrato e dizer o que fazer. **Faça isso o quanto antes:** se o XMR não foi verificado e o prazo t0 está perto, você precisa reembolsar a tempo.

## O que acontece enquanto a aba está fechada

Nada se perde na hora, mas o relógio do contrato continua correndo:

| Momento | O que pode acontecer | O que você faz ao voltar |
|---|---|---|
| Antes de t0 | O maker pode ter bloqueado o XMR | O app verifica; você confirma ou reembolsa |
| Entre t0 e t1 | O maker pode resgatar (se bloqueou o XMR) | Se ele resgatou, o app envia o XMR para você |
| Depois de t1 | Se o maker não resgatou | Você reembolsa seu USDT |

**O risco:** se você não voltar antes de t0 e o maker *não* tiver bloqueado o XMR, o contrato ainda permite que ele resgate entre t0 e t1. Por isso é importante voltar logo, ou não fechar a aba.

## Se o maker já resgatou

Ao resgatar, o maker revelou sua metade da chave na blockchain. Com seu arquivo de recuperação o app reconstrói a chave completa e envia o XMR para o seu endereço, mesmo dias depois. Não há prazo para isso.

## Se você perdeu o arquivo

- Se você usa **o mesmo navegador** e não apagou os dados dele, o app guardou uma cópia criptografada: clique em "Retomar" e digite sua senha sem enviar arquivo.
- Se você perdeu o arquivo **e** o navegador, não há como recuperar sua metade da chave. Nós não a temos.

## Dicas

- Guarde o arquivo em dois lugares (por exemplo, no computador e em um pendrive).
- Use uma senha de que você se lembre.
- Se puder, deixe a aba aberta até o swap terminar.

Próximo: [como trocar USDT por Monero sem intermediários](/pt/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
