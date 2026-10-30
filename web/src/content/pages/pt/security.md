---
key: security
lang: pt
title: Segurança do MoneroP2P
description: "Por que ninguém guarda seus fundos, como funcionam os reembolsos, quais riscos existem e como verificar o código. Verificado com Halmos, Aderyn e Slither."
updated: 2026-10-27
---

**Resposta curta:** no MoneroP2P ninguém guarda fundos. Seu USDT fica em um contrato que só libera dinheiro com regras públicas, e o XMR fica em um endereço que ninguém consegue mover sem as duas metades da chave. Funciona com dinheiro real na Arbitrum One + Monero, com **máximo de 100 USDT por swap imposto pelo contrato**. O contrato foi verificado com Halmos, Aderyn e Slither e seu código está publicado no Sourcify; ainda não teve auditoria externa, por isso cada swap tem teto.

## Por que ninguém guarda seus fundos

- **O USDT** fica em um contrato dedicado ao seu swap. Ele não tem funções de administrador: nem nós nem o maker conseguimos tirá-lo, exceto por `claim` e `refund`.
- **O XMR** fica em um endereço compartilhado. O maker não consegue pegá-lo de volta sem a sua metade da chave, e você não consegue pegá-lo sem a dele.
- **Suas chaves** são geradas no seu navegador e nunca são enviadas aos nossos servidores. O backend rejeita qualquer mensagem que contenha uma chave privada completa.

## Como funcionam os reembolsos

| Situação | O que acontece |
|---|---|
| O maker não deposita o XMR | Você reembolsa antes de t0 (o app pede isso) |
| O maker deposita menos XMR | Você não confirma e reembolsa antes de t0 |
| Você confirmou e o maker não resgata | Você reembolsa a partir de t1 |
| Você fechou a aba | Volte com seu [arquivo de recuperação](/pt/guides/what-to-do-if-you-closed-the-tab/) |

## Riscos que você deve conhecer

1. **Prazos.** Se você não reembolsar a tempo quando o XMR não chegou, pode perder o USDT. O app avisa, mas precisa estar aberto ou você precisa voltar com o arquivo.
2. **Arquivo de recuperação.** Sem ele e sem a senha você não consegue receber o XMR nem reembolsar. Não conseguimos recuperá-lo para você.
3. **Congelamento de USDT.** A Tether pode congelar endereços. Cada swap usa um contrato separado, mas o risco existe.
4. **Ainda sem auditoria externa.** O contrato passou por verificação automatizada (Halmos, Aderyn, Slither), mas o software ainda pode ter bugs. O teto de 100 USDT por swap limita o que um único swap pode colocar em risco.
5. **Privacidade.** O proxy de nós Monero vê o que seu navegador consulta. Você pode usar seu próprio nó.

## Como protegemos o app

- **Content Security Policy** rígida: o app só executa o próprio código.
- **Subresource Integrity** em scripts e estilos, e a integridade do núcleo criptográfico é verificada antes do uso.
- **Nenhum script de terceiros**, sem analytics, sem cookies.
- **Builds verificáveis:** publicamos `SHA256SUMS` de cada arquivo e uma cópia no IPFS.

## Auditorias

O contrato foi verificado com ferramentas livres e abertas: **Halmos** (verificação simbólica, 7/7 propriedades provadas para todas as entradas), **Aderyn** (0 achados altos) e **Slither** (nenhum achado médio ou alto). Seu código está verificado no **Sourcify** (correspondência exata). Relatório: [docs/AUDITORIA-GRATUITA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md). Uma auditoria externa ainda está pendente; o escopo preparado está em [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md).

## Código-fonte e relatos

Código aberto (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). Para reportar uma vulnerabilidade, use o relato privado do GitHub, como descrito em `SECURITY.md`.
