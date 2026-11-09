---
key: privacy
lang: pt
title: Política de privacidade
description: "Quais dados o MoneroP2P processa (quase nenhum), o que é público na blockchain, o que o proxy de nós vê e como reduzir a exposição."
updated: 2026-11-09
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

## Extensão MoneroP2P Wallet

A extensão **não coleta nem envia dados pessoais**: não tem contas, analytics nem telemetria. Sua semente, suas chaves e seu histórico ficam **cifrados só no seu navegador** (Argon2id e XChaCha20-Poly1305) e nunca saem dele. Para sincronizar, a extensão se conecta ao nó Monero que você escolher (por padrão, nosso proxy, descrito acima); esse nó vê as consultas à blockchain e as transações já assinadas que você envia, não suas chaves. Ao desinstalar a extensão, todos os dados dela são apagados.

Para a conta da Arbitrum, a extensão consulta o RPC público da Arbitrum (arb1.arbitrum.io; sepolia-rollup.arbitrum.io em testes), que vê seu endereço público da Arbitrum e as transações assinadas, nunca suas chaves. Na monerop2p.app e na fiat.monerop2p.app ela só compartilha sua conta ou um endereço de Monero com o site se você aprovar, e você pode desconectá-lo em Ajustes.

**Trocar (opcional).** Se você usar a aba «Trocar» da extensão, as cotações e a troca são pedidas à nossa API (api.monerop2p.app), que fala com a Trocador. Vale o mesmo que nas trocas pela Trocador no app: ao criar a troca guardamos seu IP, idioma e navegador ligados ao ID dela, por exigência dessas exchanges. A lista das suas trocas fica cifrada no seu navegador. Se você não usar «Trocar», a extensão não se conecta à nossa API.

## Avisos do P2P Fiat (opcionais)

Se você ativar os avisos em fiat.monerop2p.app, guardamos o endereço de inscrição que o seu navegador fornece, ligado à sua conta P2P, para avisar sobre solicitações e mudanças nas suas ordens com o app fechado. O aviso passa pelo serviço de push do seu navegador (Google, Mozilla, Apple ou Microsoft) e vai vazio: não leva valores, apelidos nem dados da ordem; o texto é colocado pelo site. Você pode desativar quando quiser e a inscrição é apagada. Se não ativar, nada é guardado.

Você também pode conectar o bot de Telegram do P2P Fiat em «Conta». Guardamos só o identificador do chat com o bot e o idioma, ligados à sua conta P2P. As mensagens dizem o tipo de aviso (por exemplo, «nova solicitação» ou «o comprador marcou que pagou») e trazem o link da ordem: nunca valores, apelidos nem dados de pagamento. O Telegram, como serviço de mensagens, vê que você usa o bot e essas mensagens. Se você responder a uma solicitação com os botões «Aceitar» ou «Recusar», o bot registra igual à web. Com /stop no bot, ou «Desconectar Telegram» no app, o vínculo é apagado; bloquear o bot também apaga. Os botões do bot abrem o app dentro do Telegram. Aberto assim, o Telegram passa à página dados da sua conta do Telegram (como o seu nome); o app os apaga ao iniciar e nunca os envia ao nosso servidor. A sua conta P2P, as chaves dela e a assinatura do escrow ficam no seu dispositivo, igual ao navegador. Os alertas de anúncios novos (/alertas no bot) funcionam sem conta: guardamos o chat_id, o idioma e os filtros que você escolher (comprar ou vender, e moedas), e «Desligar alertas» ou /stop os apagam. Os alertas só levam dados que já são públicos no mercado.

## Contato

[EMAIL_CONTACTO]
