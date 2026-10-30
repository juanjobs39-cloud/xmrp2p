---
key: atomic-swap
lang: pt
slug: what-is-an-atomic-swap
title: O que é um atomic swap e por que é seguro
description: "Um atomic swap troca moedas entre duas blockchains sem intermediário: ou os dois lados se completam ou nenhum. Como funciona entre USDT e Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**Resposta curta:** um atomic swap é uma troca entre duas criptomoedas em blockchains diferentes em que nenhuma das partes consegue ficar com os fundos da outra. Chama-se "atômico" porque é indivisível: ou as duas transferências se completam, ou as duas são desfeitas. Sua segurança não depende de confiar em ninguém, mas de criptografia e de um contrato com prazos.

## A ideia em uma frase

Cada parte bloqueia seus fundos de modo que **a única forma de receber é revelar a chave de que a outra parte precisa** para pegar os dela.

## Como funciona entre USDT e Monero

A Monero não tem contratos inteligentes, então o protocolo usa duas peças:

1. **Um endereço Monero compartilhado**, cuja chave privada é dividida em duas metades: o comprador do XMR tem uma e o vendedor tem a outra. Ninguém consegue gastar dele com só uma metade.
2. **Um contrato na rede do USDT** que guarda o USDT e só paga o vendedor se ele revelar sua metade da chave.

Quando o vendedor resgata o USDT, sua metade é publicada na blockchain; o comprador a usa para completar a chave e pegar o XMR. Se o vendedor nunca bloquear o XMR, o comprador recupera o USDT.

## Por que é seguro

| Risco em uma troca | Como o atomic swap lida com ele |
|---|---|
| A outra parte não envia | Você pode reembolsar dentro do prazo |
| A outra parte recebe sem entregar | Para receber, ela precisa revelar a chave que dá o XMR a você |
| Um custodiante desaparece | Não há custodiante: um contrato e chaves divididas |
| A outra parte usa uma chave diferente em cada blockchain | Uma prova criptográfica (DLEQ) mostra que é a mesma |

## O que você precisa cuidar

- **Prazos.** Atomic swaps são seguros se cada parte agir a tempo. No MoneroP2P, se o XMR não for verificado antes do prazo t0, você precisa reembolsar.
- **Seu arquivo de recuperação.** Se você fechar o navegador, precisa dele para terminar ou reembolsar.
- **O software.** A segurança depende de o código estar correto; o contrato do MoneroP2P foi verificado com ferramentas automatizadas, mas ainda não tem auditoria externa.

## Um pouco de história

Atomic swaps são discutidos para o Bitcoin desde o início dos anos 2010. Para a Monero, que não tem scripts, foram desenvolvidos protocolos de chaves divididas: o da COMIT (hoje eigenwallet) para Bitcoin e o da AthanorLabs para Ethereum, no qual o MoneroP2P se baseia.

Próximo: [como trocar USDT por Monero sem intermediários](/pt/guides/how-to-swap-usdt-for-monero-without-intermediaries/).
