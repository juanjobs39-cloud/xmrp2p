---
key: common-mistakes
lang: pt
slug: common-mistakes-when-sending-crypto
title: Erros comuns ao enviar cripto (e como evitá-los)
description: "Rede errada, memo ou tag esquecido, valores mínimos, falta de gas, endereços envenenados e aprovações ilimitadas: como não perder fundos."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**Resposta curta:** os erros mais caros são enviar pela rede errada, esquecer o memo ou tag que uma exchange exige, enviar menos que o mínimo, ficar sem gas e copiar um endereço falso. Confira rede, endereço completo e valor antes de assinar: as transações não podem ser revertidas.

## Erro 1: Enviar pela rede errada

O mesmo token existe em várias redes (por exemplo, USDT na Tron, na Ethereum e na Arbitrum). Se você enviar por uma rede que o destinatário não suporta, os fundos podem se perder ou exigir um resgate caro.

**Como evitar:** confirme a rede com o destinatário. O app do MoneroP2P só mostra redes ativas.

## Erro 2: Esquecer o memo, a tag ou o payment ID

Algumas exchanges usam um único endereço para muitos clientes e identificam você por um memo ou tag. Sem ele, o depósito pode ficar sem dono.

**Como evitar:** se a exchange mostrar um memo ou tag, inclua sempre. Na Monero, as exchanges costumam dar um subendereço só seu e você não precisa de payment ID.

## Erro 3: Enviar menos que o mínimo

Exchanges e serviços têm valores mínimos de depósito. Abaixo deles, o depósito pode não ser creditado. No MoneroP2P cada oferta mostra seu mínimo e máximo.

## Erro 4: Ficar sem gas

Para mover USDT você precisa da moeda da rede (ETH, TRX…). Sem ela, você não consegue depositar nem reembolsar.

**Como evitar:** antes de um swap, tenha o suficiente para pelo menos 3 transações (depósito, confirmação e um possível reembolso).

## Erro 5: Endereços envenenados e malware na área de transferência

Golpistas enviam valores mínimos de endereços parecidos com o seu para que você os copie do seu histórico. Alguns malwares trocam o endereço que você copia.

**Como evitar:** copie o endereço da fonte original (não do histórico) e compare o começo **e** o final completos.

## Erro 6: Aprovações ilimitadas

Alguns apps pedem permissão para gastar uma quantidade ilimitada dos seus tokens. Se esse app for comprometido, ele pode esvaziar seu saldo.

**Como evitar:** aprove só o necessário. O MoneroP2P aprova exatamente o valor do swap.

## Erro 7: Confiar em um "suporte" que procura você

Nenhuma parte legítima vai pedir sua seed, seu arquivo de recuperação ou fundos para "desbloquear" algo.

## Checklist rápido antes de assinar

- [ ] A rede está correta?
- [ ] O endereço completo confere?
- [ ] O valor está acima do mínimo?
- [ ] Tenho gas suficiente?
- [ ] Salvei meu arquivo de recuperação (no MoneroP2P)?
