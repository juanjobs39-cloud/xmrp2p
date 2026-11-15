---
key: account-wallet
lang: pt
slug: non-custodial-monero-and-usdt-wallet-in-your-account
title: "Carteira de Monero e USDT sem custódia na sua conta MoneroP2P"
description: "Sua conta MoneroP2P agora traz carteira de Monero (XMR), USDT e ETH na Arbitrum: sem KYC, sem custódia, envios por @apelido e backup de 12 palavras."
published: 2026-11-15
keywords:
  - carteira Monero sem custódia
  - carteira Monero web
  - carteira Monero e USDT
  - carteira XMR sem KYC
  - enviar Monero por apelido
  - carteira Monero no navegador
  - carteira USDT Arbitrum sem cadastro
  - trocar USDT por Monero pela carteira
  - conta MoneroP2P
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/pt/
    description: "Mercado P2P para comprar e vender Monero (XMR) com moeda local, com escrow multisig 2 de 3 e sem KYC. Cada conta inclui uma carteira sem custódia de Monero, USDT e ETH na Arbitrum."
  - name: MoneroP2P
    url: https://monerop2p.app/pt/app/
    description: "Exchange sem conta para trocar USDT, BTC, ETH e outras cripto por Monero (XMR)."
howto:
  name: "Como criar sua carteira de Monero e USDT no MoneroP2P"
  totalTime: PT5M
  steps:
    - name: "Abra o app e toque em «Create account»"
      text: "Acesse fiat.monerop2p.app/pt/app/. A faixa de conta no topo tem o botão «Create account». Não pede e-mail, telefone nem documento."
    - name: "Escolha um apelido e uma senha"
      text: "O apelido é público; a senha (mínimo de 10 caracteres) criptografa sua conta no navegador. Não dá para recuperá-la se você esquecer."
    - name: "Guarde seu backup"
      text: "Baixe o arquivo de backup criptografado e guarde-o fora do aparelho. Com ele e sua senha você recupera a conta em outro celular ou computador."
    - name: "Copie seu endereço para receber"
      text: "Em «Wallet» você vê seu endereço de Monero e seu endereço da Arbitrum (o mesmo para USDT e ETH), cada um com QR code."
    - name: "Envie, cobre ou troque"
      text: "Envie para um endereço ou para outro usuário por @apelido, crie um link de cobrança ou toque em «Swap coins» para passar de USDT a XMR sem copiar endereços."
faq:
  - q: "O MoneroP2P guarda meus fundos ou minhas chaves?"
    a: "Não. As chaves são criadas no seu navegador a partir de uma semente de 12 palavras e ficam criptografadas com sua senha. O servidor nunca as recebe, então o MoneroP2P não pode ver, mover nem congelar seus fundos, nem recuperá-los se você perder o backup e a senha."
  - q: "Quais moedas a carteira da conta tem?"
    a: "Monero (XMR) na rede principal, e USDT e ETH na Arbitrum One. O endereço da Arbitrum é uma conta padrão do tipo Ethereum: o mesmo serve para USDT e ETH."
  - q: "Quanto custa usar a carteira?"
    a: "Criar a conta, receber e enviar para outro usuário por @apelido não pagam taxa da plataforma. Sacar para um endereço externo paga 0,5 %, mostrado em linha própria antes de confirmar. Saques muito pequenos (menos de cerca de 0,002 XMR, 10 USDT ou 0,004 ETH) não são cobrados, nem os depósitos no escrow de uma ordem ou em uma troca. A taxa da rede é paga à parte."
  - q: "Como recupero minha carteira se perder o celular?"
    a: "Com o arquivo de backup e sua senha, ou com as 12 palavras da conta. As 12 palavras recuperam o apelido e as carteiras; as chaves dos escrows de ordens abertas ficam só no arquivo de backup, por isso baixe-o de novo depois de cada ordem."
  - q: "Posso levar minhas chaves para outra carteira?"
    a: "Sim. Em Wallet → More options você exporta as 12 palavras da conta, a semente de Monero de 25 palavras (para Cake Wallet, Feather ou a carteira oficial) e a chave privada da Arbitrum (para MetaMask e similares)."
  - q: "Preciso de conta para trocar cripto por Monero?"
    a: "Não. A exchange sem conta em monerop2p.app continua igual. A conta é opcional: serve para que o que você troca chegue à sua carteira sem copiar endereços."
  - q: "Enviar por @apelido é privado?"
    a: "Se você ativar «Receive by nickname», seu endereço fica ligado ao seu apelido e qualquer pessoa pode consultá-lo. No Monero isso não revela o que você recebe; na Arbitrum sim, porque essa rede é pública. Fica desligado até você ativar."
---

**Em resumo:** cada conta do [MoneroP2P Fiat](https://fiat.monerop2p.app/pt/) agora inclui uma **carteira sem custódia de Monero (XMR), USDT e ETH na Arbitrum**. Ela é criada no seu navegador com um apelido e uma senha, **sem e-mail e sem KYC**; as chaves nunca saem do seu aparelho. Você pode receber, enviar para um endereço ou para outro usuário por **@apelido**, pagar o escrow de uma ordem P2P e trocar entre suas moedas sem copiar endereços.

[Criar minha conta e carteira →](https://fiat.monerop2p.app/pt/app/#/cuenta)

## O que a carteira da conta faz?

| Função | Como funciona |
|---|---|
| **Receber** | Um endereço de Monero e um da Arbitrum (USDT e ETH), com QR code. |
| **Enviar** | Para um endereço ou um @apelido. Sempre há uma tela de revisão com o valor, as taxas e o total antes de confirmar. |
| **Enviar por @apelido** | Você digita `@apelido` em vez de um endereço longo. Sem taxa da plataforma. |
| **Cobrar com link** | Você cria um link ou QR com moeda e valor; quem abre com a conta só revisa e confirma. |
| **Trocar** | De USDT para XMR (e o contrário) entre suas próprias carteiras: o depósito sai sozinho e o que você compra chega à sua carteira. |
| **Pagar o escrow** | Se você vende XMR no mercado P2P, deposita no escrow a partir da carteira com um botão. |
| **Histórico** | Transações de Monero com confirmações e link para o explorador. |
| **Exportar chaves** | As 12 palavras da conta, a semente de Monero de 25 palavras e a chave privada da Arbitrum. |

## Quem guarda minhas chaves?

Você. A conta nasce de uma **semente de 12 palavras** gerada no seu navegador. Dela saem a chave da conta, sua carteira de Monero e sua conta da Arbitrum. Tudo fica **criptografado com sua senha** no navegador e no arquivo de backup.

- O servidor nunca recebe sua senha, sua semente nem suas chaves.
- O MoneroP2P **não pode mover nem congelar** seus fundos.
- Pelo mesmo motivo, **ninguém pode recuperá-los** se você perder o backup e a senha. Guarde o backup fora do aparelho.

Para ver ou exportar as chaves, o app pede a senha de novo: quem encontrar a aba aberta não consegue vê-las.

## Como envio Monero ou USDT para outro usuário por @apelido?

1. Em «Wallet», abra a aba **Send** de Monero ou da Arbitrum.
2. Digite `@apelido` como destino, e o valor.
3. Revise e confirme.

O endereço de cada usuário é **assinado com a chave da conta dele**, e seu navegador confere essa assinatura antes de enviar. Assim, nem o servidor nem quem o comprometesse pode trocar o endereço de alguém por outro. O app lembra para quem você já enviou e **bloqueia o envio se esse apelido passar a ser de outra conta**.

Receber por apelido fica desligado até você ativar em Wallet → More options.

## Quanto custa?

| Operação | Taxa do MoneroP2P |
|---|---|
| Criar conta e receber | 0 |
| Enviar para outro usuário por @apelido | 0 |
| Depositar no escrow de uma ordem P2P | 0 |
| Depósito de uma troca | 0 |
| Sacar para um endereço externo | **0,5 %** |
| Saques muito pequenos (menos de cerca de 0,002 XMR, 10 USDT ou 0,004 ETH) | 0 |

A taxa aparece **em linha própria** na tela de revisão, junto com o total que sai da carteira. A taxa da rede (Monero ou Arbitrum) é paga à parte; para enviar USDT você precisa de um pouco de ETH na Arbitrum.

## Preciso de conta para trocar cripto por Monero?

Não. A [exchange sem conta](/pt/app/) continua igual: você escolhe as moedas, informa seu endereço e envia o depósito da sua própria carteira.

Com conta é mais prático: em «Swap coins» você escolhe de qual carteira sai e em qual chega, e o app envia o depósito depois de uma tela de revisão. Essas trocas passam por **exchanges instantâneas** escolhidas no comparador (só com nota A ou B de KYC): durante os minutos da troca, a exchange fica com as moedas. A carteira é sem custódia; a troca, não.

## O que saber antes de usar

- **É nova.** Comece com valores pequenos até confiar.
- **A carteira de Monero sincroniza no seu navegador.** Na primeira vez pode levar alguns minutos.
- **O Monero recém-recebido leva cerca de 20 minutos** (10 confirmações) para poder ser gasto.
- **A Arbitrum é uma rede pública:** quem conhece seu endereço vê o que você recebe ali. O Monero não.
- **Use só a rede Arbitrum** para USDT e ETH. Se enviar por outra rede, os fundos se perdem.
- **O app está em inglês e espanhol** por enquanto.

Prefere uma carteira instalada no navegador? Veja a [MoneroP2P Wallet, extensão para Chrome e Firefox](/pt/news/monerop2p-wallet-monero-browser-extension/) ou a comparação das [melhores carteiras de Monero em 2026](/pt/news/best-monero-wallets-2026/).

## Perguntas frequentes

### O MoneroP2P guarda meus fundos ou minhas chaves?
Não. As chaves são criadas e ficam no seu navegador, criptografadas com sua senha.

### Quais moedas a carteira tem?
Monero (XMR), e USDT e ETH na Arbitrum One.

### Quanto custa?
Receber e enviar por @apelido não pagam taxa da plataforma. Sacar para um endereço externo paga 0,5 %, visível antes de confirmar.

### Como recupero se perder o celular?
Com o arquivo de backup e sua senha, ou com as 12 palavras da conta.

### Posso levar minhas chaves para outra carteira?
Sim: você exporta as 12 palavras, a semente de Monero de 25 palavras e a chave privada da Arbitrum.

### Preciso de conta para trocar cripto por Monero?
Não. A [exchange sem conta](/pt/app/) continua disponível.

Usar cripto tem riscos: leia o [aviso de riscos](/pt/risk-notice/).

[Criar minha conta e carteira →](https://fiat.monerop2p.app/pt/app/#/cuenta) · [Comprar Monero com moeda local →](https://fiat.monerop2p.app/pt/app/)

Usa o Telegram? O mercado também abre ali, com avisos das suas ordens: [comprar e vender Monero pelo Telegram](/pt/news/buy-monero-on-telegram-bot/).
