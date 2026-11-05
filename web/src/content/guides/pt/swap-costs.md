---
key: swap-costs
lang: pt
slug: how-much-does-it-cost-to-swap-usdt-for-monero
title: Quanto custa de verdade trocar USDT por Monero
description: "O que você paga ao trocar USDT por XMR: margem de preço, taxa, gas e taxa de rede. Como calcular o custo total e comparar opções com um único número."
published: 2026-11-04
updated: 2026-11-04
order: 10
related: [buy-xmr-no-kyc, swap-usdt-xmr, usdt-networks]
---

**Resposta curta:** o custo total de trocar USDT por Monero tem quatro partes: a **margem de preço** (quanto XMR você recebe em relação ao preço de mercado), a **taxa do serviço**, o **gas** da rede do USDT e a **taxa da rede Monero**. Para comparar opções você não precisa somar tudo: basta olhar **quanto XMR você recebe pelo mesmo valor em USDT**. Quem dá mais XMR é mais barato.

## As quatro partes do custo

| Parte | O que é | Tamanho típico |
|---|---|---|
| Margem de preço | A diferença entre o preço de mercado e o preço oferecido a você | A maior parte; depende do vendedor |
| Taxa do serviço | O que a plataforma ou exchange cobra | Varia; às vezes já vem no preço |
| Gas | O que a rede do USDT cobra pelas suas transações | Na Arbitrum, normalmente centavos de dólar |
| Taxa da rede Monero | O que a Monero cobra para enviar o XMR a você | Normalmente uma fração de centavo |

A margem e a taxa costumam vir **embutidas na cotação**, então você não as vê separadas. Por isso o número que importa é o XMR final.

## Como calcular o custo real

1. Consulte o **preço de referência** do XMR em USDT em um site de preços.
2. Divida o que você envia por esse preço: esse é o XMR que você receberia sem custos.
3. Compare com o que oferecem. A diferença, em porcentagem, é o seu custo total.

**Exemplo com números inventados**, só para mostrar a conta: se o XMR vale 300 USDT e você envia 50 USDT, sem custos receberia 0,1667 XMR.

| Opção | Você recebe | Custo total |
|---|---|---|
| A | 0,1625 XMR | 2,5% |
| B | 0,1640 XMR | 1,6% |

A opção B é mais barata mesmo que sua "taxa" anunciada fosse maior: o que conta é o XMR que chega à sua carteira.

## Quanto custa no MoneroP2P

- **Taxa da plataforma: 0,5%**, paga pelo maker quando resgata seus USDT. O preço publicado por cada maker já inclui sua margem; o app mostra o XMR exato **antes** de você depositar.
- **Gas na Arbitrum One:** você paga o depósito e a confirmação (e o reembolso, se for preciso). Sua carteira mostra o custo exato antes de assinar.
- **Taxa da rede Monero:** é descontada quando o XMR é enviado a você.
- **Reembolsos não pagam taxa da plataforma**; só gas.

Na visão simples do [app](/pt/app/) você digita quanto USDT envia e vê todas as cotações ordenadas pelo XMR recebido, então a comparação já está feita.

## Custos que você não vê de cara

- **Mover seus USDT entre redes.** Se seus USDT estão na Tron ou na Ethereum e o serviço usa Arbitrum, movê-los custa taxas e tempo. Às vezes isso custa mais que o próprio swap. [Diferenças entre redes](/pt/guides/usdt-trc20-vs-erc20-vs-l2/).
- **Taxa flutuante ou fixa.** Nas exchanges instantâneas, uma taxa **flutuante** pode mudar enquanto seu depósito chega; uma taxa **fixa** garante o valor, mas costuma dar menos XMR.
- **Valores pequenos.** O gas e a taxa de rede são quase fixos, então pesam mais em swaps pequenos.
- **Tempo.** Um swap que demora uma hora expõe você a variações de preço. No MoneroP2P o valor em XMR fica travado quando você solicita o swap.

## Dicas para pagar menos

- Compare sempre pelo **XMR recebido**, não pela taxa anunciada.
- Troque a partir da **rede onde seus USDT já estão**, se o serviço suportar.
- Evite valores muito pequenos se puder juntar um maior (até 100 USDT por swap no MoneroP2P).
- Guarde um pouco de **ETH na Arbitrum** para o gas, para não ter que comprar com pressa.

Se ainda não sabe qual opção usar, comece por [como comprar Monero sem KYC](/pt/guides/how-to-buy-monero-without-kyc/).
