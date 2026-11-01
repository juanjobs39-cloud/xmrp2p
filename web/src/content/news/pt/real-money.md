---
key: real-money-launch
lang: pt
slug: monerop2p-is-live-with-real-money
title: O MoneroP2P já funciona com dinheiro real
description: "Desde 26 de outubro de 2026 você pode trocar USDT por Monero com dinheiro real na Arbitrum One: sem custódia, sem conta, até 100 USDT por troca."
published: 2026-10-30
---

**Resumindo:** desde **26 de outubro de 2026** o MoneroP2P funciona com dinheiro real. Você pode trocar USDT (USD₮0 na Arbitrum One) por Monero com um atomic swap que roda no seu navegador, sem conta e sem ninguém guardar seus fundos. Cada troca tem limite de **100 USDT**, imposto pelo próprio contrato.

## O que mudou

Até agora a plataforma funcionava só em redes de teste. A primeira troca com dinheiro real foi concluída de ponta a ponta em 26 de outubro: o comprador depositou USDT, o maker bloqueou o XMR, o comprador confirmou e recebeu seus Monero, e o contrato pagou o maker. Desde então, o modo com dinheiro real é o padrão do site.

O modo de prática em testnet continua disponível para quem quiser testar sem risco.

## Como protegemos seu dinheiro

- **Ninguém guarda fundos.** Seus USDT ficam em um contrato dedicado à sua troca, sem funções de administrador. Ele só pode pagar o maker quando você já pode pegar o XMR, ou devolver seus USDT se algo falhar.
- **Contrato verificado.** Passou por verificação simbólica com **Halmos** (7 de 7 propriedades provadas para qualquer entrada) e por análise estática com **Aderyn** (0 achados altos) e **Slither** (nenhum achado médio ou alto). O código-fonte está verificado no **Sourcify**: [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **Limite de 100 USDT por troca.** Ainda não há auditoria externa, então limitamos quanto uma única troca pode arriscar. O limite está no contrato e ninguém pode aumentá-lo sem publicar um contrato novo.
- **Código aberto** (AGPL-3.0) no [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), com somas SHA-256 de cada arquivo do site para você verificar o que carrega.

## Quanto custa

A taxa da plataforma é de **0,5%** e quem paga é o maker ao receber. Você só paga o gás da Arbitrum para depositar e confirmar, e a taxa da rede Monero ao receber. O preço de cada maker já inclui sua margem; o app mostra o XMR exato antes de você depositar.

## Outras novidades destas semanas

- **Visão simples:** digite quanto USDT você envia, toque em "Trocar" e veja todas as cotações ordenadas pelo que você recebe.
- **Mais de 100 USDT, ou nenhum maker disponível:** o app mostra cotações de exchanges instantâneas via Trocador. Essa opção funciona de outro jeito (a exchange guarda a operação); explicamos na [política de privacidade](/pt/privacy/).
- **Seja maker pelo navegador**, sem instalar nada: a aba aberta funciona como seu servidor. [Como ser maker](/pt/become-a-maker/).
- **10 idiomas:** inglês, espanhol, português, russo, ucraniano, chinês, japonês, coreano, hindi e persa.

## O que vem a seguir

- Uma auditoria externa do contrato, que nos permitiria aumentar o limite por troca.
- Mais makers, para que sempre haja ofertas.
- Avaliar outras redes de USDT, como a Tron.

[Abrir o app →](/pt/app/) · Antes de usar, leia o [aviso de riscos](/pt/risk-notice/).
