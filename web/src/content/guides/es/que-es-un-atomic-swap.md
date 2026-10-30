---
key: atomic-swap
lang: es
slug: que-es-un-atomic-swap
title: Qué es un atomic swap y por qué es seguro
description: "Un atomic swap intercambia criptomonedas de dos cadenas sin intermediarios: o se completan ambas partes o ninguna. Cómo funciona entre USDT y Monero."
published: 2026-10-24
updated: 2026-10-24
order: 2
related: [swap-usdt-xmr, comparison, what-is-monero]
---

**Respuesta corta:** un atomic swap es un intercambio entre dos criptomonedas de cadenas distintas en el que ninguna de las partes puede quedarse con los fondos de la otra. Se llama "atómico" porque es indivisible: o se completan las dos transferencias, o se deshacen ambas. La seguridad no depende de confiar en alguien, sino de la criptografía y de un contrato con plazos.

## La idea en una frase

Cada parte bloquea sus fondos de forma que **la única manera de cobrar es revelar la llave que la otra parte necesita** para tomar lo suyo.

## Cómo funciona entre USDT y Monero

Monero no tiene contratos inteligentes, así que el protocolo usa dos piezas:

1. **Una dirección de Monero compartida**, cuya llave privada se divide en dos mitades: una la tiene quien compra XMR y otra quien lo vende. Nadie puede gastar desde ahí con una sola mitad.
2. **Un contrato en la red del USDT** que guarda el USDT y que solo paga al vendedor si este revela su mitad de la llave.

Cuando el vendedor cobra el USDT, su mitad queda publicada en la cadena; el comprador la usa para completar la llave y tomar el XMR. Si el vendedor nunca bloquea el XMR, el comprador recupera el USDT.

## Por qué es seguro

| Riesgo en un intercambio | Cómo lo resuelve el atomic swap |
|---|---|
| Que la otra parte no envíe | Puedes reembolsar dentro del plazo |
| Que la otra parte cobre sin entregar | Para cobrar, debe revelar la llave que te da el XMR |
| Que alguien custodie y desaparezca | No hay custodio: un contrato y llaves divididas |
| Que la otra parte use una llave distinta en cada cadena | Una prueba criptográfica (DLEQ) demuestra que es la misma |

## Lo que sí debes cuidar

- **Los plazos.** Los atomic swaps son seguros si cada parte actúa a tiempo. En MoneroP2P, si el XMR no se verifica antes del plazo t0, debes reembolsar.
- **Tu archivo de recuperación.** Si cierras el navegador, lo necesitas para terminar o reembolsar.
- **El software.** La seguridad depende de que el código sea correcto; el contrato de MoneroP2P está verificado con herramientas automáticas, pero aún no tiene auditoría externa.

## Un poco de historia

La idea de los atomic swaps se discute desde principios de la década de 2010 para Bitcoin. Para Monero, que no tiene scripts, se desarrollaron protocolos con llaves divididas: el de COMIT (hoy eigenwallet) para Bitcoin y el de AthanorLabs para Ethereum, en el que se basa MoneroP2P.

Sigue con: [cómo cambiar USDT a Monero sin intermediarios](/es/guias/como-cambiar-usdt-a-monero-sin-intermediarios/).
