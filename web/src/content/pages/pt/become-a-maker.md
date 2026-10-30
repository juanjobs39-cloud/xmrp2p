---
key: maker
lang: pt
title: Seja maker
description: "Um maker fornece XMR e ganha uma margem sobre o preço de mercado. Faça isso pelo navegador, sem instalar nada, ou 24/7 com seu próprio servidor."
updated: 2026-10-26
---

**Resposta curta:** um maker tem XMR e o oferece por USDT, com uma margem sobre o preço de referência. Você pode fazer isso **pelo navegador, sem instalar nada** (a aba aberta funciona como seu servidor), ou **24/7 com seu próprio servidor ou computador**. Nos dois casos, ninguém guarda seus fundos. Funciona com dinheiro real na Arbitrum One (máximo de 100 USDT por swap), e também há um modo de prática em testnet.

## Duas formas de ser maker

| | No navegador (recomendado) | Seu próprio servidor 24/7 |
|---|---|---|
| Para | Qualquer pessoa | Makers técnicos |
| Configuração | Nenhuma: abra [a página do maker](/pt/maker/) | Python, `monero-wallet-rpc` e o programa ([guia](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| Quando você oferece | Enquanto a aba está aberta em um computador | O tempo todo |
| Suas chaves | No seu navegador, criptografadas com sua senha e em um backup | No seu servidor |
| Recebimento do USDT | Direto na sua MetaMask | No endereço que você configurar |

**Comece aqui:** [Seja maker pelo navegador →](/pt/maker/)

## O que você precisa no navegador

| Requisito | Detalhe |
|---|---|
| Um computador com a aba aberta | Celulares suspendem as abas |
| XMR para oferecer | Envie para o endereço que a página mostra; ele é liberado após 10 confirmações |
| Um pouco de ETH para gas | Para resgatar; recarregue com um clique pela MetaMask |
| Uma senha e seu arquivo de backup | Sem o backup você não consegue restaurar seu maker em outro navegador |

## Como o preço é definido

O programa pega a mediana de várias fontes públicas (Kraken, CoinGecko e KuCoin), descarta a cotação se alguma fonte se afastar demais da mediana e aplica sua margem. Você define:

- a margem sobre o preço de referência,
- o valor mínimo e máximo por swap,
- a exposição máxima (XMR comprometido ao mesmo tempo),
- o número de swaps simultâneos.

## Regras de segurança (navegador e servidor)

- Nunca envia XMR sem um depósito válido na blockchain.
- Nunca resgata se não bloqueou o XMR.
- Não tenta resgatar nos últimos minutos antes de t1.
- Simula cada transação antes de enviá-la.
- Se o taker reembolsar, recupera o XMR automaticamente.

## Riscos para o maker

- **Volatilidade:** o preço pode mudar entre a cotação e o resgate.
- **Disponibilidade:** se você fechar a aba (ou seu servidor cair) entre t0 e t1, não recebe; o taker vai reembolsar e você precisa voltar para recuperar seu XMR.
- **Backups:** seu arquivo de backup (ou o banco de dados do programa) guarda as metades de chave de cada swap; sem ele você não recupera o XMR.
- **Regulação:** atuar como maker pode ter implicações legais no seu país. Verifique antes de começar.

Nada disso garante lucro. O guia completo de instalação está em [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
