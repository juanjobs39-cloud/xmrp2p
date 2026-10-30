---
key: usdt-networks
lang: pt
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs ERC-20 vs L2: qual usar"
description: "Diferenças entre o USDT na Tron (TRC-20), na Ethereum (ERC-20) e em redes de camada 2 como a Arbitrum: taxas, velocidade, compatibilidade e riscos."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**Resposta curta:** é o mesmo dólar digital da Tether, mas em redes separadas que não se misturam. Para um swap, use a rede onde seu USDT já está e onde o serviço está ativo. As redes de camada 2 (como a Arbitrum) costumam ser mais baratas que a Ethereum, e a Tron é muito usada na América Latina, mas as taxas mudam com o tempo: confira na sua carteira antes de enviar.

## Diferenças principais

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum e outras L2 |
|---|---|---|---|
| Formato do endereço | Começa com `T` | `0x…` | `0x…` (igual à Ethereum) |
| Moeda da taxa | TRX (energia e largura de banda) | ETH | ETH (na L2) |
| Custo típico | Variável; depende da energia disponível | Geralmente o mais alto | Geralmente baixo |
| Carteiras comuns | TronLink e outras | MetaMask e compatíveis | MetaMask e compatíveis |
| A Tether pode congelar? | Sim | Sim | Sim |

> Não damos valores de taxas porque eles mudam com o congestionamento e com as decisões de cada rede. Sua carteira mostra o custo exato antes de você assinar.

## São a mesma moeda?

Mesmo valor, rede diferente. O USDT na Tron não pode ser enviado diretamente para um endereço da Ethereum: você precisa de uma exchange ou de uma ponte. Enviar pela rede errada é um dos [erros mais comuns](/pt/guides/common-mistakes-when-sending-crypto/).

## Qual o MoneroP2P usa?

- **Agora:** Arbitrum One, cujo USDT (USD₮0) permite autorizar o depósito com uma assinatura, sem uma transação de aprovação extra. O modo de prática usa a Arbitrum Sepolia (testnet).
- **Em avaliação:** Tron. O contrato já compila para a Tron, mas ainda precisa de testes na testnet dela; a Tron tem particularidades (por exemplo, seu USDT retorna um valor inesperado na transferência) que o contrato já trata.

## Como escolher

1. **Onde está seu USDT hoje?** Movê-lo entre redes custa taxas e tempo.
2. **Você tem a moeda da taxa?** Sem ETH (ou TRX) você não consegue assinar.
3. **O que o serviço suporta?** Use só redes ativas no app.
4. **Com que rapidez você precisa?** As L2 confirmam em segundos; a Monero demora mais para confirmar o XMR.

## Um risco comum a todas

A Tether pode congelar endereços em todas essas redes. O MoneroP2P usa um contrato separado por swap para que um congelamento não afete os outros, mas o risco existe. Leia o [aviso de riscos](/pt/risk-notice/).
