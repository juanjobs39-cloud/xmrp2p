---
key: monero-traceable
lang: pt
slug: is-monero-traceable-xmr-vs-bitcoin-vs-zcash
title: "Dá para rastrear Monero? XMR vs Bitcoin e Zcash em 2026"
description: "O que o Monero esconde, o que não esconde e como ele se compara ao Bitcoin e ao Zcash. E o que muda com o FCMP++ e como usar XMR com mais privacidade."
published: 2026-11-06
keywords:
  - dá para rastrear Monero
  - Monero é anônimo
  - Monero vs Bitcoin privacidade
  - Monero vs Zcash
  - criptomoeda mais privada
  - FCMP++ Monero
  - como funciona a privacidade do Monero
  - assinaturas em anel Monero
howto:
  name: "Como usar Monero com mais privacidade"
  totalTime: PT20M
  steps:
    - name: "Use uma carteira sem custódia"
      text: "Guarde seu XMR numa carteira onde só você tem a semente, como MoneroP2P Wallet, Feather ou Cake Wallet. Uma exchange sabe quem você é e o que você saca."
    - name: "Receba cada pagamento num subendereço novo"
      text: "Gere um subendereço diferente para cada pagamento ou pessoa. Assim ninguém consegue ligar seus recebimentos."
    - name: "Conecte-se a um nó de confiança"
      text: "Use seu próprio nó ou um em que você confie. O nó vê seu IP quando você envia uma transação."
    - name: "Compre sem KYC"
      text: "Compre XMR no P2P ou com um atomic swap, sem entregar sua identidade a uma exchange que liga seu nome aos seus saques."
    - name: "Não mova tudo de uma vez"
      text: "Evite mover o valor exato que acabou de comprar logo depois de recebê-lo. Padrões de horário e valor são as pistas mais usadas para adivinhar."
faq:
  - q: "Dá para rastrear Monero?"
    a: "Não do jeito que se rastreia Bitcoin. Na blockchain do Monero não aparecem remetente, destinatário nem valor, porque ele usa endereços ocultos, assinaturas em anel e RingCT. O que pode vazar informação é o que acontece fora da blockchain: uma exchange com KYC, um nó que registra seu IP ou padrões de horário e valor."
  - q: "Monero é 100 % anônimo?"
    a: "Nenhuma tecnologia é 100 % anônima. O Monero esconde por padrão quem envia, quem recebe e quanto, mas as assinaturas em anel escondem o remetente entre 16 candidatos, e a análise estatística pode estimar o verdadeiro em alguns casos. A atualização FCMP++ quer eliminar essa fraqueza."
  - q: "O que é FCMP++?"
    a: "Full-Chain Membership Proofs (provas de pertencimento à cadeia inteira). Substitui as assinaturas em anel de 16 membros: em vez de esconder sua saída entre 16, esconde entre todas as saídas da blockchain. Em novembro de 2026 ainda não está ativa na rede principal; um rascunho não oficial dos desenvolvedores aponta para março de 2027."
  - q: "O que é mais privado, Monero ou Zcash?"
    a: "O Zcash tem criptografia muito forte (zk-SNARKs) quando você usa endereços protegidos, mas a privacidade é opcional e também existem endereços transparentes como os do Bitcoin. No Monero toda transação é privada, então você não se destaca por usá-lo. Por isso o Monero costuma ser considerado mais privado na prática."
  - q: "Bitcoin é anônimo?"
    a: "Não. O Bitcoin é pseudônimo: todas as transações, endereços e valores são públicos para sempre. Empresas de análise de blockchain ligam endereços a pessoas usando exchanges com KYC e padrões de uso."
  - q: "É legal usar Monero?"
    a: "Na maioria dos países ter e usar Monero é legal. O que foi restringido é que exchanges reguladas o ofereçam; na União Europeia essa proibição vale a partir de julho de 2027. Verifique as leis do seu país."
---

**Em resumo:** na blockchain do **Monero (XMR) não aparecem remetente, destinatário nem valor** de nenhuma transação, então **não dá para rastreá-lo como o Bitcoin**, onde tudo é público. O Monero faz isso com **endereços ocultos, assinaturas em anel de 16 membros e RingCT**, aplicados a toda transação por padrão, ao contrário do **Zcash**, onde a privacidade é opcional. Seus pontos fracos estão fora da blockchain: **exchanges com KYC, seu IP e padrões de uso**. A próxima atualização, **FCMP++**, ainda não está ativa (rascunho para **março de 2027**) e vai reforçar justamente a parte mais fraca.

[Comprar Monero sem KYC →](/pt/buy-monero/)

## Monero vs Bitcoin vs Zcash: tabela comparativa

| | Monero (XMR) | Bitcoin (BTC) | Zcash (ZEC) |
|---|---|---|---|
| Privado por padrão | Sim, em toda transação | Não | Não, é opcional |
| Remetente | Oculto (assinatura em anel de 16) | Público | Oculto só em endereços protegidos |
| Destinatário | Oculto (endereços ocultos) | Público | Oculto só em endereços protegidos |
| Valor | Oculto (RingCT) | Público | Oculto só em endereços protegidos |
| IP de origem ao enviar | Protegido pelo Dandelion++ | Visível para os nós | Visível para os nós |
| Num explorador de blocos | Só dados cifrados | Todo o histórico | Depende do tipo de endereço |
| Auditar sua própria carteira | Chave de visualização (view key) | Sempre público | Chave de visualização |
| Mineração | RandomX (CPU) | SHA-256 (ASIC) | Equihash (ASIC) |
| Tempo por bloco | ~2 minutos | ~10 minutos | ~75 segundos |

A diferença principal é **por padrão**. Se uma moeda deixa escolher entre transações públicas e privadas, quem escolhe as privadas se destaca. No Monero todas parecem iguais, então a sua se mistura com todas as outras.

## Como o Monero esconde cada dado

### Quem recebe: endereços ocultos (stealth addresses)
Cada vez que alguém paga você, a carteira de quem envia cria um **endereço de uso único** derivado do seu. Seu endereço público nunca aparece na blockchain, então ninguém vê quantos pagamentos você recebeu. Além disso você pode usar **subendereços**: um diferente para cada pessoa ou pagamento.

### Quem envia: assinaturas em anel
Quando você gasta XMR, sua transação assina junto com **15 saídas de outras pessoas** tiradas da blockchain (16 no total desde a atualização de agosto de 2022). Quem observa sabe que uma das 16 é a real, mas não qual. Uma **key image** impede gastar a mesma saída duas vezes sem revelar qual foi.

### Quanto: RingCT
Desde janeiro de 2017 os valores são cifrados com **Ring Confidential Transactions**. A rede confere que nenhuma moeda é criada do nada sem ver os valores.

### De onde: Dandelion++
Desde 2020 as transações passam primeiro por alguns nós aleatórios antes de serem espalhadas para a rede toda. Isso dificulta saber qual IP enviou primeiro.

## Então, dá para rastrear Monero?

Na blockchain, não como o Bitcoin. Mas há limites que vale conhecer:

- **As assinaturas em anel são probabilísticas.** Escondem o remetente entre 16, não entre todos. Com análise estatística (idade das saídas, gastos encadeados ou um mesmo ator controlando vários chamarizes) dá para **estimar** a real em alguns casos. Não é prova, mas reduz o anonimato.
- **O nó vê seu IP.** Se você usa o nó de terceiros, esse nó sabe de qual IP você enviou. Em 2024 vazou um vídeo de uma empresa de análise de blockchain que dizia ligar transações de Monero usando **nós maliciosos** que registravam IPs.
- **O KYC entrega você fora da cadeia.** Se você compra XMR numa exchange que tem seu documento, ela sabe que você sacou tal valor em tal horário. Com isso pode adivinhar para onde foi.
- **Os padrões falam.** Mover o valor exato que acabou de receber, sempre no mesmo horário, facilita adivinhar.

Nenhum desses limites quebra a criptografia do Monero; todos aproveitam informação que você deixa em volta. Por isso o jeito de usar importa tanto quanto a moeda.

## FCMP++: o que vem aí

O **FCMP++ (Full-Chain Membership Proofs)** substitui as assinaturas em anel. Em vez de esconder sua saída entre 16, esconde **entre todas as saídas da história do Monero**, mais de cem milhões. Isso elimina quase todos os ataques estatísticos contra os anéis. Chega junto com o **Carrot**, um novo esquema de endereços.

**Situação em novembro de 2026:**
- Em outubro de 2026 está sendo testado em **redes de teste** (testnet e stressnet), não na rede principal.
- Um rascunho dos desenvolvedores, que eles mesmos chamam de **não vinculante**, aponta para a ativação na rede principal por volta de **março de 2027**.
- **Não há data oficial.** Confira o [getmonero.org](https://www.getmonero.org/) antes de confiar em qualquer data.

Quando chegar você não precisa fazer nada especial com seu XMR: basta atualizar a carteira para uma versão compatível.

## Como usar Monero com mais privacidade

1. **Carteira sem custódia.** Use uma carteira onde só você tem a semente, como a [MoneroP2P Wallet](/pt/wallet/), Feather ou Cake Wallet. Guia: [como criar uma carteira de Monero](/pt/guides/how-to-create-a-monero-wallet/).
2. **Um subendereço novo por pagamento.** A MoneroP2P Wallet já cria um diferente cada vez que você abre «Receive».
3. **Nó de confiança.** Use seu próprio nó se puder; na MoneroP2P Wallet ele é trocado em Settings.
4. **Compre sem KYC.** Use o [P2P Fiat](https://fiat.monerop2p.app/pt/) com reais via Pix ou um [atomic swap de USDT para XMR](/pt/guides/how-to-swap-usdt-for-monero-without-intermediaries/). Mais opções em [como comprar Monero sem KYC](/pt/guides/how-to-buy-monero-without-kyc/).
5. **Espere e não copie valores.** Deixe passar um tempo antes de mover de novo o que recebeu e não reenvie a quantia exata.

## Outras "moedas de privacidade" frente ao Monero

- **Litecoin (MWEB):** privacidade opcional num bloco de extensão separado; a maior parte do uso continua pública.
- **Dash:** sua função de mistura (CoinJoin) é opcional e os valores continuam visíveis.
- **Bitcoin com CoinJoin:** misturar ajuda, mas as saídas misturadas são reconhecíveis e algumas exchanges as bloqueiam.

Em todas, a privacidade é um extra que precisa ser ativado. No Monero é a regra.

## Perguntas frequentes

### Dá para rastrear Monero?
Não como o Bitcoin: a blockchain não mostra remetente, destinatário nem valor. O que pode entregar você está fora da cadeia: KYC, seu IP e seus padrões.

### Monero é 100 % anônimo?
Nada é. As assinaturas em anel escondem o remetente entre 16 e a análise estatística pode estimar o verdadeiro em alguns casos. O FCMP++ quer resolver isso.

### O que é FCMP++?
A atualização que esconde sua saída entre todas as da blockchain em vez de entre 16. Em novembro de 2026 não está ativa; o rascunho aponta para março de 2027.

### O que é mais privado, Monero ou Zcash?
Na prática, o Monero, porque a privacidade é obrigatória. O Zcash é muito forte com endereços protegidos, mas também permite transações públicas.

### Bitcoin é anônimo?
Não. É pseudônimo e todo o histórico é público.

### É legal usar Monero?
Na maioria dos países, sim. O que se restringe é exchanges reguladas oferecerem: leia [por que o Monero foi deslistado](/pt/news/monero-delisted-where-to-buy-xmr-in-2026/).

Para o básico, leia [o que é Monero e como ele difere do Bitcoin](/pt/guides/what-is-monero/). Usar cripto tem riscos: leia o [aviso de riscos](/pt/risk-notice/).

[Comprar Monero sem KYC →](/pt/buy-monero/)
