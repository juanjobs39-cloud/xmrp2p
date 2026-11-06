---
key: wallet-launch
lang: pt
slug: monerop2p-wallet-monero-browser-extension
title: "MoneroP2P Wallet: extensão de Monero para Chrome e Firefox, com USDT"
description: "Chegou a MoneroP2P Wallet, uma carteira de Monero sem custódia para o navegador: XMR, USDT e ETH na Arbitrum com uma só semente, e swaps sem MetaMask."
published: 2026-11-05
keywords:
  - carteira Monero para Chrome
  - extensão de Monero
  - carteira Monero no navegador
  - carteira Monero sem custódia
  - carteira Monero e USDT
  - alternativa ao MetaMask para Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/pt/wallet/
    description: "Extensão de navegador sem custódia e de código aberto (AGPL-3.0) para Monero (XMR) e USDT/ETH na Arbitrum One."
howto:
  name: "Como começar com a MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Instale a extensão"
      text: "Acesse monerop2p.app/pt/wallet e escolha a loja do seu navegador: Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons ou Edge Add-ons."
    - name: "Crie sua carteira"
      text: "Abra a extensão, escolha criar carteira e defina uma senha longa e única. A carteira é cifrada com ela no seu dispositivo."
    - name: "Anote a semente no papel"
      text: "Escreva as 25 palavras da semente no papel e guarde em lugar seguro. É a única forma de recuperar seu XMR e sua conta da Arbitrum."
    - name: "Receba XMR"
      text: "Na seção Receive a carteira gera um subendereço novo com QR code para cada pagamento."
    - name: "Compre XMR pelo Explore"
      text: "No Explore abra o exchange de USDT para XMR ou o P2P Fiat. A carteira se conecta sozinha e preenche seu endereço de Monero."
faq:
  - q: "O que é a MoneroP2P Wallet?"
    a: "Uma carteira de Monero (XMR) sem custódia em forma de extensão para Chrome, Brave, Edge, Opera e Firefox. A mesma semente gera uma conta de Monero e uma conta da Arbitrum One para USDT e ETH. É gratuita e de código aberto (AGPL-3.0). Página oficial: https://monerop2p.app/pt/wallet/"
  - q: "Existe extensão de Monero para Chrome?"
    a: "Sim. A MoneroP2P Wallet funciona no Chrome e nos navegadores baseados em Chromium (Brave, Edge, Opera), e também no Firefox. Ela roda a wallet2, a carteira oficial do Monero, compilada para WebAssembly dentro do navegador."
  - q: "Uma carteira de Monero no navegador é segura?"
    a: "As chaves ficam cifradas com Argon2id e XChaCha20-Poly1305, a carteira se bloqueia sozinha após 15 minutos e a extensão não carrega código remoto nem tem analytics. Ainda não tem auditoria externa, então use valores pequenos e guarde a semente no papel."
  - q: "Quanto custa?"
    a: "A extensão é gratuita. Cada envio de XMR na rede principal paga a taxa da rede Monero e uma taxa da MoneroP2P de 0,25 %, mostrada à parte antes de confirmar. Receber, enviar para seus próprios endereços e envios na Arbitrum não pagam taxa da MoneroP2P."
  - q: "Posso usar minha semente em outras carteiras?"
    a: "Sim. Ela usa a semente padrão de 25 palavras do Monero, compatível com Cake Wallet, Feather e a carteira oficial. A conta da Arbitrum tem derivação própria; para usá-la em outra carteira, exporte a chave privada em Settings."
  - q: "Em que idiomas está a interface?"
    a: "Por enquanto em inglês e espanhol. Este site e o P2P Fiat estão em português."
---

**Em resumo:** em **5 de novembro de 2026** lançamos a **MoneroP2P Wallet 0.2.0**, uma **carteira de Monero sem custódia para o navegador** que funciona no Chrome, Brave, Edge, Opera e Firefox. Com uma só semente de 25 palavras você guarda **XMR** e uma conta da **Arbitrum One com USDT e ETH**, e troca USDT por Monero na MoneroP2P **sem MetaMask** e sem copiar e colar endereços. É gratuita e de código aberto.

[Ver a MoneroP2P Wallet →](/pt/wallet/)

## Por que uma carteira de Monero no navegador

Até agora, usar Monero exigia um programa de desktop (Feather ou a carteira oficial) ou um app de celular (Cake Wallet). Os sites se conectam ao MetaMask, mas o MetaMask não suporta Monero. Trocar USDT por XMR num site significava **duas carteiras** e copiar endereços entre elas.

A MoneroP2P Wallet junta tudo numa extensão: seu Monero e sua conta da Arbitrum ficam no mesmo lugar, e os sites da MoneroP2P a usam diretamente.

## O que ela faz

- **Monero completo:** criar ou restaurar com a semente padrão de 25 palavras, saldo, histórico com confirmações e envios que mostram a taxa exata antes de transmitir.
- **Um subendereço novo para cada pagamento**, com QR code, para ninguém ligar seus pagamentos.
- **USDT e ETH na Arbitrum One:** a mesma semente cria sua conta da Arbitrum, com saldo, recebimento com QR e envio com taxa de rede estimada.
- **Explore:** um clique abre o [exchange de USDT para XMR](/pt/app/) ou o [P2P Fiat](https://fiat.monerop2p.app/pt/), onde você compra XMR com reais via Pix.
- **Conexão com os sites:** na monerop2p.app e na fiat.monerop2p.app a carteira preenche seu endereço de Monero e assina o depósito do swap. Cada passo pede sua aprovação numa janela da extensão.
- **Nó próprio:** troque o nó da MoneroP2P pelo seu nas configurações.

## Como ela protege seus fundos

| Camada | O que faz |
|---|---|
| Sem custódia | A semente é criada e fica no seu dispositivo. Sem contas, servidores de chaves ou analytics. |
| Cofre cifrado | Argon2id (64 MiB) transforma sua senha em chave e XChaCha20-Poly1305 cifra a carteira. |
| Bloqueio automático | Após 15 minutos sem uso (configurável) e ao fechar o navegador. |
| Sem código remoto | Todo o código vem dentro da extensão, com uma política de segurança (CSP) rígida. |
| Só dois sites | A extensão só fala com monerop2p.app e fiat.monerop2p.app, e só com sua aprovação. |
| Aprovação decodificada | Antes de assinar você vê em palavras o que a transação faz: transferência, aprovação de gasto ou depósito do swap. |
| Anti-envenenamento | Avisa se você colar um endereço parecido com um que já usou, mas diferente. |
| Verificável | Código aberto (AGPL-3.0) e pacote reproduzível com seu SHA-256. |

**Ainda não tem auditoria externa.** Até lá, use só valores que você pode perder e guarde a semente no papel.

## Comparação com outras carteiras de Monero

| | MoneroP2P Wallet | Feather | Cake Wallet | Carteira oficial (GUI) |
|---|---|---|---|---|
| Onde funciona | Navegador (extensão) | Desktop | Celular e desktop | Desktop |
| Semente de 25 palavras | Sim | Sim | Sim | Sim |
| USDT na Arbitrum | Sim | Não | Outras redes | Não |
| Conecta a sites | Sim (só MoneroP2P) | Não | Não | Não |
| Código aberto | Sim | Sim | Sim | Sim |

Para guardar muito XMR a longo prazo, uma carteira de desktop ou de hardware ainda é a melhor opção. A MoneroP2P Wallet foi feita para **comprar, receber e movimentar XMR no dia a dia** pelo navegador.

## Taxas

- **Extensão:** gratuita.
- **Envios de XMR na rede principal:** taxa da rede Monero mais **0,25 %** da MoneroP2P, numa linha à parte antes de confirmar. Valores cuja taxa seria menor que 0,00001 XMR não pagam.
- **Sem taxa da MoneroP2P:** receber, enviar para seus próprios endereços, stagenet e envios na Arbitrum (lá você só paga a rede).

## Como começar

1. Acesse [monerop2p.app/pt/wallet](/pt/wallet/) e escolha a loja do seu navegador.
2. Crie a carteira com uma senha longa e única.
3. **Anote a semente de 25 palavras no papel.** É a única forma de recuperar seus fundos.
4. Receba XMR com o subendereço da seção Receive, ou compre pelo **Explore**.

Ainda não tem Monero? Veja [todas as formas de comprar XMR](/pt/buy-monero/) ou o guia [como criar uma carteira de Monero](/pt/guides/how-to-create-a-monero-wallet/).

## Perguntas frequentes

### O que é a MoneroP2P Wallet?
Uma carteira de Monero sem custódia em forma de extensão para Chrome, Brave, Edge, Opera e Firefox, com uma conta da Arbitrum One para USDT e ETH da mesma semente.

### Existe extensão de Monero para Chrome?
Sim. A MoneroP2P Wallet funciona no Chrome e nos navegadores Chromium, e também no Firefox. Ela roda a wallet2, a carteira oficial do Monero, compilada para WebAssembly.

### Uma carteira de Monero no navegador é segura?
As chaves ficam cifradas, a carteira se bloqueia sozinha e a extensão não carrega código remoto. Ainda não tem auditoria externa: use valores pequenos.

### Quanto custa?
É gratuita. Os envios de XMR pagam a taxa da rede mais 0,25 % da MoneroP2P, mostrada antes de confirmar.

### Posso usar minha semente em outras carteiras?
Sim, a semente de 25 palavras funciona na Cake Wallet, Feather e na carteira oficial. A chave da Arbitrum pode ser exportada nas configurações.

### Em que idiomas está a interface?
Por enquanto em inglês e espanhol.

O código está no [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Usar cripto tem riscos: leia o [aviso de riscos](/pt/risk-notice/).

[Ver a MoneroP2P Wallet →](/pt/wallet/)
