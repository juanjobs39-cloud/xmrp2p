---
key: trust
lang: pt
title: "O MoneroP2P é confiável e seguro? Como verificar você mesmo"
description: "O que você pode conferir por conta própria antes de confiar no MoneroP2P: contrato, código, taxas e limites. E o que ainda falta, como uma auditoria externa."
updated: 2026-11-10
faq:
  - q: "O MoneroP2P é confiável?"
    a: "O MoneroP2P é uma plataforma de código aberto e sem custódia que funciona com dinheiro real desde 26 de outubro de 2026. O contrato não tem funções de administrador e seu código está verificado no Sourcify, então o principal pode ser conferido em fontes públicas. É um projeto jovem e ainda sem auditoria externa; por isso cada atomic swap tem limite de 100 USDT."
  - q: "O MoneroP2P pode ficar com meus fundos?"
    a: "Em um atomic swap, não: o USDT fica em um contrato sem funções de administrador, pausa ou atualização, e o XMR fica em um endereço que exige as duas metades da chave. No P2P Fiat o XMR fica em um escrow multisig 2 de 3 que ninguém, nem o MoneroP2P, consegue mover sozinho. As exchanges instantâneas via Trocador são diferentes: a exchange escolhida guarda as moedas durante a troca."
  - q: "O MoneroP2P foi auditado?"
    a: "Ainda não por uma empresa externa. O contrato passou por verificação automática com Halmos (7/7 propriedades provadas), Aderyn (0 achados altos) e Slither (sem achados médios ou altos), e o relatório e as execuções são públicos. Enquanto não houver auditoria externa, o contrato limita cada swap a 100 USDT."
---

**Resposta curta:** o MoneroP2P é uma plataforma de código aberto e sem custódia que funciona com dinheiro real desde 26 de outubro de 2026. Você não precisa acreditar em nós: cada afirmação abaixo pode ser conferida em fontes públicas. Também é um projeto jovem e ainda sem auditoria externa, por isso os limites são baixos de propósito.

## O que você mesmo pode verificar

| Afirmação | Como conferir |
|---|---|
| Ninguém guarda seu USDT em um atomic swap | O contrato não tem funções de administrador, pausa ou atualização. Leia o código verificado no [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (correspondência exata) ou no [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| O contrato foi revisado | O Halmos provou 7 de 7 propriedades, o Aderyn encontrou 0 achados altos e o Slither nenhum médio ou alto. Veja o [relatório](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) e as [execuções públicas](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Limites e taxa não podem ser aumentados | O máximo de 100 USDT por swap e o teto de taxa de 1% são constantes do contrato. A taxa atual é 0,5%, paga pelo maker. |
| O site roda o código publicado | Todo o código está no [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) sob AGPL-3.0. Cada versão publica [SHA256SUMS](/SHA256SUMS) para comparar os arquivos carregados com o seu próprio build. |
| O P2P Fiat não consegue mover seu XMR sozinho | Cada ordem usa um multisig 2 de 3 do Monero: comprador, vendedor e árbitro têm uma chave cada e são necessárias duas. Veja [como o P2P Fiat funciona](https://fiat.monerop2p.app/pt/como-funciona/). |
| Suas chaves ficam com você | As chaves são geradas no seu navegador. O app de swaps não tem contas, e suas páginas aplicam uma política de segurança de conteúdo rígida que você pode ler no código da página. |
| Já funcionou com fundos reais | O primeiro swap na rede principal foi concluído em 26 de outubro de 2026. Cada swap cria seu próprio contrato pela fábrica, visível no Arbiscan. |

## Limites e o que ainda não temos

- **Sem auditoria externa.** As verificações acima são ferramentas automáticas, não a análise de uma empresa de auditoria. Por isso o contrato limita cada swap a 100 USDT.
- **Projeto jovem.** Foi lançado em outubro de 2026. O volume é pequeno e o P2P Fiat tem poucos anúncios em algumas moedas.
- **As exchanges instantâneas têm custódia.** As trocas a partir de BTC, ETH e outras moedas passam por exchanges de terceiros via Trocador: a exchange escolhida guarda as moedas por alguns minutos, e a cotação inclui uma margem de 1% para o MoneroP2P.
- **O P2P Fiat protege o XMR, não o pagamento bancário.** O pagamento em dinheiro acontece fora da plataforma. Métodos reversíveis, como PayPal ou cartões, têm mais risco, e as disputas são decididas pelo árbitro, que nós operamos.
- **Você é responsável pelas suas chaves.** Se perder o arquivo de recuperação ou a senha da conta, não conseguimos restaurá-los.
- **Sem garantia de empresa.** Não há seguro de depósitos nem central de atendimento. Leia o [aviso de riscos](/pt/risk-notice/).

## Quem está por trás e como falar conosco

O MoneroP2P é um projeto independente de código aberto. O protocolo se baseia nos atomic swaps da AthanorLabs. Você pode falar conosco pela [página de contato](/pt/contact/) e reportar vulnerabilidades em privado pela aba Security do repositório. Nunca pediremos sua seed, seu arquivo de recuperação nem um pagamento para "desbloquear" um swap.

## Antes de usar

1. Teste o modo de prática com fundos de teste: adicione `?red=prueba` ao [app de swaps](/pt/app/).
2. Comece com um valor pequeno.
3. Leia [como funciona](/pt/how-it-works/) e a [página de segurança](/pt/security/).
4. Nunca negocie fora da plataforma, mesmo que peçam.
