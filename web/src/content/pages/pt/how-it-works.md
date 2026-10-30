---
key: how
lang: pt
title: Como funciona um swap de USDT para Monero no MoneroP2P
description: "Um atomic swap troca seu USDT por XMR sem intermediário: um contrato guarda o USDT e só o libera quando você pode pegar o XMR. Explicação simples e técnica."
updated: 2026-10-24
---

**Resposta curta:** seu USDT fica em um contrato inteligente que só pode pagar o vendedor se ele revelar um segredo. Esse mesmo segredo é a metade que falta para você abrir o endereço Monero onde o vendedor deixou o XMR. Por isso o swap é "atômico": ou os dois lados se completam, ou nenhum. Se algo falhar, o contrato devolve seu USDT.

## Para iniciantes

Pense em um cofre com duas fechaduras:

1. **Você e o vendedor (o "maker") criam juntos um endereço Monero**, e cada um tem só metade da chave. Ninguém consegue mover o que está lá sem as duas metades.
2. **Você deposita o USDT em um contrato.** O contrato sabe verificar a metade da chave do maker, mas não a conhece.
3. **O maker deposita o XMR** no endereço compartilhado. O app verifica se chegou o valor certo.
4. **Você confirma** no contrato que está tudo certo.
5. **O maker resgata o USDT** e, para isso, precisa entregar sua metade da chave ao contrato, que a publica na blockchain.
6. **O app pega essa metade da chave**, junta com a sua e envia o XMR para o seu endereço.

Se o maker nunca depositar o XMR, você não confirma e recebe seu USDT de volta com um reembolso.

## O que você precisa

| Você precisa de | Para |
|---|---|
| Uma carteira de navegador (MetaMask ou compatível) com USDT | Depositar no contrato |
| Um pouco da moeda da rede (ex.: ETH na Arbitrum) | Pagar o gas |
| Um endereço Monero | Receber o XMR ([como criar uma carteira](/pt/guides/how-to-create-a-monero-wallet/)) |
| Um arquivo de recuperação protegido por senha | Retomar se você fechar a aba |

## Os dois prazos (t0 e t1)

| Momento | O que você pode fazer | O que o maker pode fazer |
|---|---|---|
| Antes de **t0**, ainda sem confirmar | Confirmar ou reembolsar | Nada |
| Depois de confirmar, ou entre **t0** e **t1** | Esperar | Resgatar (revelando seu segredo) |
| A partir de **t1** | Reembolsar | Nada |

**Importante:** se você não confirmar nem reembolsar antes de t0, o contrato permite que o maker resgate mesmo que ele nunca tenha depositado o XMR. Por isso o app pede que você reembolse automaticamente quando o XMR não é verificado perto de t0, e por isso você precisa guardar o arquivo de recuperação.

## Explicação técnica

- **Metades de chave.** Cada parte escolhe um escalar `s` de 252 bits. A chave de gasto do endereço compartilhado é `S_taker + S_maker` (ed25519); a chave de visualização é `v_taker + v_maker`.
- **Prova DLEQ.** Cada parte prova, sem revelar, que o mesmo `s` está por trás da sua chave ed25519 (Monero) e de uma chave secp256k1, que é o que o contrato verifica. Usamos a construção `sigma_fun`, a mesma da eigenwallet.
- **Contrato.** Um escrow por swap (clone EIP-1167) guarda `keccak(s_maker·G)` e `keccak(s_taker·G)`. `claim(s_maker)` e `refund(s_taker)` verificam o segredo com um truque de `ecrecover`. As janelas deles nunca se sobrepõem.
- **Verificação do XMR.** O maker envia o ID da transação e a chave da transação; o app verifica o pagamento com `check_tx_key` sem sincronizar uma carteira inteira.
- **Varredura.** Quando o segredo do maker aparece no evento `Claimed`, o app calcula `s_taker + s_maker` e envia o XMR para o seu endereço.

O design completo está no [documento de arquitetura](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) (em espanhol) e se baseia no protocolo da AthanorLabs.
