---
key: what-is-monero
lang: pt
slug: what-is-monero
title: O que é Monero e como difere do Bitcoin
description: "Monero (XMR) é privada por padrão: oculta remetente, destinatário e valor. Diferenças com o Bitcoin em privacidade, emissão e uso."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**Resposta curta:** Monero (XMR) é uma criptomoeda que oculta por padrão quem envia, quem recebe e quanto. No Bitcoin, por outro lado, cada endereço e valor é público e qualquer pessoa pode rastrear os fundos. A Monero existe desde 2014 e é de código aberto.

## Principais diferenças

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Remetente | Oculto (assinaturas em anel) | Público |
| Destinatário | Oculto (endereços de uso único) | Público |
| Valor | Oculto (RingCT) | Público |
| Privacidade | Sempre ativa | Opcional e limitada |
| Tempo de bloco | Cerca de 2 minutos | Cerca de 10 minutos |
| Emissão | Pequena emissão residual permanente desde 2022 | Teto de 21 milhões |
| Contratos inteligentes | Não | Scripts limitados |

## Como ela consegue privacidade

- **Assinaturas em anel:** sua transação é misturada com outras saídas da blockchain, então não se sabe qual é a real.
- **Endereços furtivos:** cada pagamento vai para um endereço de uso único; seu endereço público nunca aparece na blockchain.
- **RingCT:** os valores são criptografados, e mesmo assim a rede verifica que nenhum dinheiro é criado do nada.

## Fungibilidade

Como o histórico não é visível, cada XMR é intercambiável com qualquer outro. Com moedas transparentes, algumas unidades podem ser rejeitadas por causa do histórico delas.

## Chave de visualização

A Monero permite compartilhar uma **chave de visualização**, que mostra os pagamentos recebidos sem permitir gastá-los. O MoneroP2P a usa para que o comprador possa verificar se o XMR chegou ao endereço compartilhado.

## O que ter em mente

- Algumas exchanges centralizadas deslistaram a Monero em certas jurisdições. Por isso métodos sem intermediários, como os atomic swaps, importam.
- A privacidade não isenta você das leis do seu país.

Próximo: [como criar uma carteira Monero](/pt/guides/how-to-create-a-monero-wallet/).
