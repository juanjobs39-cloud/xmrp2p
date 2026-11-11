---
key: telegram-bot
lang: pt
slug: buy-monero-on-telegram-bot
title: "Comprar e vender Monero pelo Telegram: bot com alertas e sem KYC"
description: "O bot do MoneroP2P abre o mercado P2P e a exchange dentro do Telegram, avisa sobre suas ordens e envia alertas de novos anúncios. Sem KYC e sem custódia."
published: 2026-11-11
keywords:
  - comprar Monero pelo Telegram
  - bot de Telegram Monero
  - vender XMR Telegram
  - bot XMR sem KYC
  - alertas de Monero no Telegram
  - Mini App Monero
  - comprar XMR P2P
  - trocar Bitcoin por Monero Telegram
  - MoneroP2PFiatBot
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/pt/
    description: "Mercado P2P para comprar e vender Monero (XMR) com moeda local, com escrow multisig 2 de 3 na rede Monero e sem KYC."
  - name: MoneroP2P
    url: https://monerop2p.app/pt/app/
    description: "Exchange sem conta para trocar USDT, BTC, ETH e outras cripto por Monero (XMR), com atomic swap sem custódia para USDT na Arbitrum."
howto:
  name: "Como comprar Monero pelo Telegram com o bot do MoneroP2P"
  totalTime: PT45M
  steps:
    - name: "Abra o bot oficial"
      text: "Procure @MoneroP2PFiatBot no Telegram, ou entre pelo link do site, e toque em Iniciar. Confira se o usuário é exatamente esse."
    - name: "Abra o mercado dentro do Telegram"
      text: "Toque no botão “P2P”. O mercado abre como Mini App sem sair do Telegram. Crie sua conta com um apelido e uma senha: não pede e-mail nem documento."
    - name: "Escolha um anúncio"
      text: "Filtre por moeda e método de pagamento e compare preço, limites e reputação do vendedor."
    - name: "Aguarde o escrow"
      text: "O vendedor deposita o XMR em um escrow multisig 2 de 3 assinado no seu celular. O bot avisa quando a ordem muda de estado."
    - name: "Pague e receba"
      text: "Com o XMR já bloqueado, pague pelo método combinado e marque “Já paguei”. O vendedor confirma e o escrow envia o Monero para a sua carteira."
faq:
  - q: "Dá para comprar Monero pelo Telegram?"
    a: "Sim. O bot @MoneroP2PFiatBot abre o mercado P2P Fiat do MoneroP2P dentro do Telegram como Mini App: você escolhe um anúncio, o XMR fica em um escrow multisig 2 de 3 e você paga com Pix, transferência, app de pagamentos ou dinheiro. Não pede KYC nem e-mail."
  - q: "O bot do MoneroP2P guarda meus fundos ou minhas chaves?"
    a: "Não. O bot só abre a plataforma e envia avisos. Sua conta e o escrow são assinados no seu dispositivo; o bot nunca vê chaves, senhas nem dados de pagamento, e não consegue mover XMR."
  - q: "O que o Telegram consegue ver?"
    a: "O Telegram sabe que você fala com o bot e vê o texto dos avisos. Por isso os avisos não trazem valores, endereços nem dados de pagamento, e os apps apagam da URL os dados que o Telegram adiciona e não carregam scripts de telegram.org."
  - q: "Preciso de conta para receber alertas de novos anúncios?"
    a: "Não. Com /alerts você escolhe se quer ver anúncios de compra, de venda ou ambos, e em quais moedas. Não é preciso criar conta nem conectar nada."
  - q: "Como desligo os avisos?"
    a: "Envie /stop para o bot. Ele apaga a conexão com a sua conta e os seus alertas. Bloquear o bot faz o mesmo."
  - q: "Alguém me escreveu no Telegram para me vender Monero. É o bot?"
    a: "Não. O bot oficial nunca inicia conversas para oferecer negócios, não conversa em nome da outra parte e nunca pede pagamentos, seeds nem senhas. Se uma pessoa escrever no Telegram para fechar uma compra ou pedir um pagamento fora de uma ordem, é golpe."
  - q: "Em quais idiomas o bot funciona?"
    a: "Em inglês e espanhol, conforme o idioma do seu Telegram. O site do P2P Fiat também está em português e russo, e a exchange em 10 idiomas."
---

**Em resumo:** agora você pode **comprar e vender Monero (XMR) sem sair do Telegram**. O bot oficial [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) abre o [mercado P2P Fiat](https://fiat.monerop2p.app/pt/) e a [exchange](/pt/app/) como Mini App, avisa quando uma ordem avança e envia **alertas de novos anúncios** na sua moeda. **Sem KYC e sem custódia:** o escrow é assinado no seu celular e o bot nunca toca nos seus fundos.

[Abrir o bot no Telegram →](https://t.me/MoneroP2PFiatBot)

## O que o bot faz?

| Comando | O que faz | Precisa de conta? |
|---|---|---|
| Botão **P2P** | Abre o mercado para comprar ou vender XMR com moeda local | Sim, criada em segundos |
| `/alerts` | Avisa sobre novos anúncios de compra, de venda ou ambos, nas moedas que você escolher | Não |
| `/swap` | Abre a exchange para trocar BTC, USDT, ETH e outras cripto por XMR, e avisa conforme a troca avança | Não |
| `/orders` | Lista suas ordens abertas com um botão para abrir cada uma | Sim |
| `/stop` | Desliga os avisos e apaga seus alertas | Não |

Além disso, se você vende e aceita solicitações offline, o bot permite **aceitar ou recusar uma solicitação pela própria mensagem**, sem abrir o site.

## Como compro Monero pelo Telegram?

1. Abra [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) e toque em **Iniciar**.
2. Toque em **P2P**. O mercado abre dentro do Telegram. Crie sua conta com um apelido e uma senha.
3. Escolha sua moeda e método de pagamento e pegue um anúncio.
4. O vendedor deposita o XMR em um **escrow multisig 2 de 3**. Após 10 confirmações (cerca de 20 minutos) abrem-se o chat criptografado e os dados de pagamento dele.
5. Pague, marque **“Já paguei”** e aguarde o vendedor liberar. O XMR chega na sua carteira.

É o mesmo mercado do site, com as mesmas regras. Os detalhes estão em [como o P2P Fiat funciona](https://fiat.monerop2p.app/pt/como-funciona/).

## Como recebo alertas de novos anúncios?

Envie `/alerts` e escolha pelos botões o que quer ver. Você também pode digitar as moedas diretamente, por exemplo `/alerts BRL USD`.

- **O que cada alerta traz:** preço, limites, métodos de pagamento e um botão que abre o mercado já filtrado.
- **O que não traz:** as condições do anúncio nem qualquer forma de contatar o anunciante por fora.
- **Quando chega:** 15 minutos depois de o anúncio ser publicado, e só se continuar ativo.
- **Sem excesso:** no máximo um alerta por anunciante a cada 6 horas.
- **Filtro contra golpes:** anúncios que pedem para continuar por WhatsApp, Telegram ou telefone nunca são alertados.

## Posso trocar Bitcoin ou USDT por Monero pelo Telegram?

Sim. `/swap` abre a [exchange](/pt/app/) dentro do Telegram: você compara cotações para ir de BTC, USDT, ETH e mais de 2.500 moedas para XMR, ou para [vender XMR](/pt/news/sell-monero-for-usdt-or-bitcoin/). Se quiser, o bot avisa quando a troca muda de estado: depósito detectado, enviando, concluída, expirada ou reembolsada.

Esses avisos usam um código que vale para um único chat, envia no máximo 10 avisos e expira em 48 horas. Não trazem valores nem endereços.

## É seguro comprar Monero pelo Telegram?

Depende de com quem você fala. Há três situações bem diferentes:

| | Site do MoneroP2P | Bot oficial | Alguém que escreve para você no Telegram |
|---|---|---|---|
| Quem guarda o XMR | Escrow multisig 2 de 3 | O mesmo escrow | Ninguém: você confia em um desconhecido |
| Pede pagamento adiantado | Não | Não | Quase sempre |
| Chat com a outra parte | Criptografado, dentro da ordem | O mesmo, dentro da ordem | Privado, sem registro |
| Se houver problema | Disputa com o suporte | Disputa com o suporte | Ninguém a quem reclamar |

**O bot não é um chat com o vendedor.** Ele só abre a plataforma e avisa. Por isso a regra de sempre continua valendo: **nunca feche negócio por mensagens privadas do Telegram**. Se alguém escrever para oferecer XMR, pedir um pagamento fora de uma ordem ou "ajudar" com a sua conta, é golpe.

Para reconhecer o bot oficial:

- O usuário é exatamente **@MoneroP2PFiatBot**. Desconfie de nomes parecidos.
- Ele **nunca** pede sua seed, sua senha, seu arquivo de backup nem um pagamento.
- Ele **nunca** escreve primeiro para oferecer um negócio.

Mais regras em [segurança e golpes comuns](https://fiat.monerop2p.app/pt/seguranca/).

## O que o Telegram consegue ver?

O Telegram não é um app privado como o Monero, então o bot foi feito para lhe entregar o mínimo:

- **Os avisos não trazem valores, endereços nem dados de pagamento.** Só dizem que algo mudou e trazem um botão para abrir a ordem.
- **As chaves não saem do seu dispositivo.** Sua conta e o escrow são assinados no seu celular; o bot nunca as vê.
- **Sem scripts do Telegram.** Os apps não carregam código de telegram.org e apagam da URL os dados que o Telegram adiciona ao abri-los.
- **O que o Telegram sabe:** que você usa o bot e quando recebe avisos. Se isso importa para você, use o site e ative os avisos do navegador.

Os detalhes estão na [política de privacidade](/pt/privacy/).

## O que ele não faz

- **Não guarda fundos nem chaves**, e não consegue mover XMR.
- **Não substitui as regras do mercado:** o pagamento em dinheiro continua acontecendo fora da plataforma, e o escrow protege o XMR, não a transferência bancária.
- **Não fala todos os idiomas:** o bot responde em inglês e espanhol.
- **Não garante que haja anúncios na sua moeda.** O mercado é jovem; os alertas servem justamente para avisar quando aparecer um.

O que pode ser verificado sobre a plataforma e quais são seus limites: [O MoneroP2P é confiável?](/pt/is-monerop2p-legit/)

## Começar

[Abrir @MoneroP2PFiatBot →](https://t.me/MoneroP2PFiatBot) · [Ver o mercado no site →](https://fiat.monerop2p.app/pt/app/) · [Trocar cripto por XMR →](/pt/app/)

Vem do LocalMonero? Leia [alternativas ao LocalMonero em 2026](/pt/news/localmonero-alternatives-2026/).
