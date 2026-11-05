---
key: wallet
lang: pt
title: "MoneroP2P Wallet: carteira de Monero (XMR) sem custódia para o seu navegador"
description: "Extensão gratuita para Chrome, Brave, Edge e Firefox. Suas chaves de Monero nunca saem do seu dispositivo; compre XMR com USDT ou Pix sem sair da carteira."
updated: 2026-11-05
keywords:
  - carteira monero
  - carteira xmr
  - extensão monero chrome
  - monero wallet navegador
  - carteira monero sem custódia
faq:
  - q: "A MoneroP2P Wallet guarda minhas chaves em um servidor?"
    a: "Não. A semente e as chaves são geradas e guardadas, cifradas, só no seu navegador. Não há contas, cadastro nem analytics. O nó da MoneroP2P só recebe consultas da blockchain e transações já assinadas."
  - q: "E se eu perder o dispositivo ou desinstalar a extensão?"
    a: "Você restaura a carteira com sua semente de 25 palavras na MoneroP2P Wallet ou em qualquer carteira Monero compatível, como Cake Wallet, Feather ou a carteira oficial."
  - q: "Quanto custa?"
    a: "A extensão é grátis e de código aberto (AGPL-3.0). Cada envio de XMR paga a taxa da rede Monero e uma taxa da MoneroP2P de 0,25 %, mostrada à parte antes de confirmar. Receber e enviar para seus próprios endereços não pagam taxa da MoneroP2P."
---

**MoneroP2P Wallet** é uma carteira de Monero (XMR) que funciona como extensão do navegador. Suas chaves são criadas e ficam no seu dispositivo, cifradas com sua senha. Na mesma carteira você pode comprar XMR com USDT ou com sua moeda local nos serviços da MoneroP2P.

## O que você pode fazer

- **Criar ou restaurar** uma carteira com a semente padrão de 25 palavras da Monero.
- **Receber** com um subendereço novo a cada pagamento, com QR code, para que ninguém relacione seus pagamentos.
- **Enviar** vendo a taxa exata antes de confirmar e um resumo claro do destino.
- **Explorar:** abra com um clique a [troca de USDT por XMR](/pt/app/) (com seu endereço já preenchido) e o [P2P Fiat](https://fiat.monerop2p.app/pt/app/) para comprar com Pix, transferência ou dinheiro.
- **USDT e ETH na Arbitrum:** uma conta da Arbitrum One sai da mesma semente. Na monerop2p.app e no P2P Fiat a carteira se conecta sozinha (sem MetaMask) e preenche seu endereço de Monero; cada assinatura ou envio pede sua aprovação numa janela da extensão.

## Como ela protege você

| Proteção | O que faz |
|---|---|
| Sem custódia | A semente nunca sai do seu dispositivo; ninguém mais pode mover seu XMR. |
| Criptografia forte | Sua senha vira chave com Argon2id (64 MiB) e a carteira é cifrada com XChaCha20-Poly1305. |
| Bloqueio automático | Ela se bloqueia após 15 minutos sem uso (configurável) e ao fechar o navegador. |
| Sem código remoto | Todo o código vai dentro da extensão, com uma política de segurança (CSP) rígida. |
| Antienvenenamento | Avisa se você colar um endereço parecido com um que já usou, mas que não é igual. |
| Verificável | O pacote é compilado de forma reprodutível: qualquer pessoa pode conferir que bate com o código. |

## Antes de começar

1. Anote a semente **no papel** e guarde bem: é a única forma de recuperar seu dinheiro.
2. Use uma senha longa e exclusiva para a extensão.
3. Teste primeiro com um valor pequeno.

Ainda não tem XMR? Veja [todas as formas de comprar Monero](/pt/buy-monero/).
