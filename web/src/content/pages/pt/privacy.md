---
key: privacy
lang: pt
title: Política de privacidade
description: "Quais dados o MoneroP2P processa (quase nenhum), o que é público na blockchain, o que o proxy de nós vê e como reduzir a exposição."
updated: 2026-10-30
---

**Resposta curta:** não temos contas, não usamos cookies nem analytics e não guardamos suas chaves. Alguns dados são públicos por natureza (as transações na rede do USDT) e nossos servidores processam dados técnicos mínimos para funcionar. A exceção são as exchanges instantâneas via Trocador, explicadas abaixo.

## O que NÃO coletamos

- Nome, e-mail, telefone ou documentos de identidade.
- Cookies de rastreamento ou analytics de terceiros.
- Chaves privadas, seeds ou o conteúdo do seu arquivo de recuperação.

## O que nossos servidores processam (Cloudflare)

| Dado | Para quê | Por quanto tempo |
|---|---|---|
| Endereço IP | Limites contra abuso e bloqueio por região | Não o armazenamos nos swaps do MoneroP2P; a Cloudflare pode registrá-lo segundo a política dela |
| Mensagens públicas do protocolo (chaves públicas, prova DLEQ, chave de visualização) | Permitir que você e o maker concluam o swap | A sala se apaga sozinha após 3 dias |
| Ofertas dos makers | Mostrar o livro de ofertas | Enquanto a oferta estiver ativa |

## Exchanges instantâneas via Trocador

Quando nenhum maker do MoneroP2P cobre o seu valor, o app pode mostrar cotações de exchanges instantâneas pelo [Trocador](https://trocador.app). Essa opção funciona de outro jeito:

- A troca é feita pela exchange que você escolher, não pelo MoneroP2P, e você envia seu USDT para o endereço dessa exchange. É um serviço com custódia, com termos e classificação KYC próprios.
- Nosso servidor pede as cotações e cria a troca por você. As exchanges listadas no Trocador exigem que, quando você **cria** uma troca, guardemos seu **endereço IP, o idioma do navegador e os dados do navegador ou dispositivo (user agent)** vinculados ao ID da troca, para respondermos a solicitações de autoridades que o Trocador nos encaminhe.
- Guardamos esses dados **por tempo indeterminado**, como o Trocador recomenda, porque essas solicitações podem chegar muito depois da troca. Eles não são usados para mais nada e não são compartilhados, exceto para responder a uma solicitação desse tipo.
- Só ver as cotações não guarda nada. Os swaps com makers do MoneroP2P nunca guardam esses dados.
- Para evitar isso, use um maker do MoneroP2P ou vá direto ao Trocador (aí ele guarda seus dados segundo os próprios termos). Tor ou uma VPN reduzem o que seu IP revela.

## O que é público na blockchain

- Seu depósito de USDT, o endereço da sua carteira EVM e os eventos do contrato são públicos na rede do USDT.
- Na Monero, as transações são privadas por design, mas a chave de visualização compartilhada do swap permite que as duas partes vejam o endereço compartilhado.

## Proxy de nós Monero

Se você usar nosso proxy, ele vê quais consultas seu navegador faz (por exemplo, qual transação você verifica). Para evitar isso, use seu próprio nó.

## Armazenamento no navegador

O app guarda no seu navegador uma cópia **criptografada** do swap em andamento, com a mesma senha do seu arquivo de recuperação. Você pode apagá-la limpando os dados do site.

## Contato

[EMAIL_CONTACTO]
