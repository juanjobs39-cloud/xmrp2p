---
key: swap-usdt-xmr
lang: pt
slug: how-to-swap-usdt-for-monero-without-intermediaries
title: Como trocar USDT por Monero sem intermediários
description: "Passo a passo: troque USDT por XMR com um atomic swap no seu navegador, sem conta e sem ninguém guardando seus fundos."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: Trocar USDT por Monero com um atomic swap
  totalTime: PT1H
  steps:
    - name: Prepare sua carteira Monero
      text: Crie uma carteira Monero e copie seu endereço de recebimento. No modo de prática ele deve ser de stagenet.
    - name: Abra o app e escolha uma oferta
      text: Escolha a oferta de um maker, informe o valor em USDT e seu endereço Monero.
    - name: Defina uma senha e baixe o arquivo de recuperação
      text: Escolha uma senha de pelo menos 10 caracteres e baixe o arquivo criptografado. Ele é obrigatório antes de depositar.
    - name: Deposite o USDT
      text: Conecte sua carteira (MetaMask ou compatível) e assine o depósito no contrato.
    - name: Espere e confirme
      text: O app verifica o XMR que o maker bloqueia. Depois de verificado, confirme com setReady.
    - name: Receba o XMR
      text: Quando o maker resgatar, o app junta as duas metades da chave e envia o XMR para o seu endereço.
---

**Resposta curta:** abra o app, escolha uma oferta, informe seu endereço Monero, baixe seu arquivo de recuperação, deposite o USDT pela sua carteira e espere. O app verifica o XMR, pede sua confirmação e por fim envia o XMR para o seu endereço. Se algo falhar, ele pede que você reembolse o USDT. O processo todo costuma levar de 30 a 60 minutos.

> O MoneroP2P funciona com dinheiro real na **Arbitrum One + Monero** (máximo de 100 USDT por swap) e tem um modo de prática na **testnet** (Arbitrum Sepolia e Monero stagenet). Os passos são os mesmos nos dois.

## Antes de começar

| Você precisa de | Onde conseguir |
|---|---|
| Uma carteira de navegador com USDT | MetaMask ou uma carteira compatível com EVM |
| Um pouco de ETH na mesma rede | Para pagar o gas de 2 ou 3 transações |
| Um endereço Monero | [Como criar uma carteira Monero](/pt/guides/how-to-create-a-monero-wallet/) |
| 30 a 60 minutos com a aba aberta | Ou seu arquivo de recuperação para voltar depois |

## Passo a passo

### Passo 1: Escolha uma oferta

O app mostra as ofertas dos makers: preço em USDT por XMR e valores mínimo e máximo. Cada maker define seu preço, que muda com o mercado; o app mostra o valor exato de XMR antes de você depositar.

### Passo 2: Informe seu endereço e uma senha

- **Endereço Monero:** onde você vai receber o XMR. Confira duas vezes; as transferências são irreversíveis.
- **Senha:** protege seu arquivo de recuperação. Se você esquecê-la, ninguém consegue recuperá-la.

### Passo 3: Baixe o arquivo de recuperação

O app não deixa você depositar sem ele. Ele guarda a sua metade da chave, criptografada. Com ele você retoma o swap em qualquer navegador ([o que fazer se você fechou a aba](/pt/guides/what-to-do-if-you-closed-the-tab/)).

### Passo 4: Deposite o USDT

Conecte sua carteira. Se o token permitir, você assina uma autorização e deposita em uma única transação; se não, primeiro aprova o valor. O USDT vai para um contrato que só o libera seguindo as regras do swap.

### Passo 5: Espere a verificação e confirme

O maker bloqueia o XMR em um endereço compartilhado e envia o comprovante de pagamento. O app verifica o valor e as confirmações da rede Monero. Quando tudo estiver certo, aparece o botão **Confirmar**. Depois que você confirma, o maker pode resgatar.

Se o XMR não chegar ou o valor for menor, o app pede que você **reembolse** antes do prazo t0. Faça isso: depois desse prazo você só poderá reembolsar no prazo final.

### Passo 6: Receba seu XMR

Quando o maker resgata o USDT, ele revela sua metade da chave. O app junta com a sua e envia o XMR para o seu endereço. Sua carteira mostra o valor depois de algumas confirmações.

## Custos

- **Taxa da plataforma:** uma porcentagem do USDT, cobrada pelo contrato quando o swap é concluído, com teto de 1%.
- **Gas** na rede do USDT para depositar e confirmar (e reembolsar, se precisar).
- **Taxa da rede Monero** ao enviar o XMR para o seu endereço.
- **Margem do maker**, já incluída no preço dele.

As taxas de rede mudam com o congestionamento; confira na sua carteira antes de assinar.

## Se algo der errado

| Problema | O que fazer |
|---|---|
| O maker não respondeu | Você não depositou nada: escolha outra oferta |
| Você fechou a aba | Abra o app de novo e use seu arquivo de recuperação |
| O XMR não chega | Espere; se t0 se aproximar, o app vai pedir que você reembolse |
| Você ficou sem gas | Consiga um pouco de ETH na rede e tente de novo |

Antes de usar o serviço, leia o [aviso de riscos](/pt/risk-notice/).
