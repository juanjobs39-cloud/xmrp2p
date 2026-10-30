---
key: monero-wallet
lang: pt
slug: how-to-create-a-monero-wallet
title: Como criar uma carteira Monero
description: "Opções de carteira Monero para celular e computador, como criar uma, guardar a seed com segurança e obter seu endereço. Inclui stagenet para testes."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Criar uma carteira Monero
  steps:
    - name: Escolha uma carteira
      text: Baixe uma carteira do site oficial dela ou da lista em getmonero.org.
    - name: Crie uma carteira nova
      text: Escolha criar uma carteira nova e defina uma senha local.
    - name: Guarde a seed
      text: Anote a seed em papel, na ordem, e guarde-a em um lugar seguro e offline.
    - name: Copie seu endereço
      text: Na seção Receber, copie seu endereço. Para testar o MoneroP2P use uma carteira stagenet.
---

**Resposta curta:** baixe uma carteira Monero do site oficial, crie uma carteira nova, anote a seed em papel e copie seu endereço em "Receber". Para testar o MoneroP2P você precisa de uma carteira **stagenet** (a rede de testes da Monero), que algumas carteiras de computador permitem escolher.

## Opções conhecidas

| Carteira | Plataforma | Observações |
|---|---|---|
| Monero GUI e CLI (oficiais) | Windows, macOS, Linux | Do projeto Monero; suportam stagenet |
| Feather Wallet | Windows, macOS, Linux | Carteira leve para computador; suporta stagenet |
| Cake Wallet | Android, iOS, computador | Popular no celular |
| Outras | Várias | Confira a lista atualizada em getmonero.org |

> Baixe sempre do site oficial de cada carteira e verifique as assinaturas se o projeto as publicar. Desconfie de apps parecidos nas lojas.

## Passo a passo

1. **Instale a carteira** pelo site oficial.
2. **Crie uma carteira nova.** Ela pede uma senha: ela protege o arquivo neste dispositivo, não é a sua seed.
3. **Guarde a seed.** É uma lista de palavras (25 no formato clássico, 16 no formato Polyseed que algumas carteiras usam). Anote-as em papel, na ordem. Quem tiver essas palavras controla seus fundos.
4. **Anote a altura de restauração** se a carteira mostrar: ela acelera a recuperação.
5. **Copie seu endereço** em "Receber". Os endereços principais da Monero na rede real começam com `4`; os subendereços, com `8`. Na stagenet começam com `5` ou `7`.

## Para testar o MoneroP2P (stagenet)

- No Monero GUI ou no Feather, escolha **stagenet** ao criar a carteira (nas configurações ou ao iniciar).
- O XMR da stagenet não tem valor; você o consegue em faucets de stagenet.
- No modo de prática, o app do MoneroP2P rejeita endereços que não sejam de stagenet.

## Boas práticas

- Nunca compartilhe sua seed, nem com o suporte.
- Use um endereço ou subendereço novo para cada swap se quiser mais privacidade.
- Ao receber XMR, a rede exige cerca de 10 confirmações (uns 20 minutos) antes de você poder gastá-lo.

Próximo: [o que é Monero e como difere do Bitcoin](/pt/guides/what-is-monero/).
