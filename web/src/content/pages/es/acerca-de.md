---
key: about
lang: es
title: Acerca de MoneroP2P
description: "Qué es MoneroP2P, quién lo hace, en qué estado está y cómo se financia (comisión por swap completado)."
updated: 2026-10-24
---

**Respuesta corta:** MoneroP2P es un proyecto de código abierto para cambiar USDT por Monero sin intermediarios, mediante atomic swaps que corren en el navegador. Está en fase de pruebas en testnet y todavía no tiene auditoría.

## Qué hacemos

Construimos la app web, el contrato inteligente, el núcleo criptográfico y el programa que usan los makers. No custodiamos fondos ni guardamos llaves de los usuarios.

## Cómo se financia

El contrato cobra una comisión porcentual cuando un swap se completa. El porcentaje está fijado al desplegar el contrato y tiene un tope de 1 % escrito en el código, que nadie puede cambiar. Los reembolsos no pagan comisión.

## Estado

- Contrato, núcleo criptográfico, daemon del maker, backend y app: implementados y probados en entornos de prueba.
- Pendiente: pruebas completas en testnet con Monero stagenet y auditoría externa.
- No hay versión para dinero real.

## Inspiración

El protocolo se basa en el trabajo de AthanorLabs y en la investigación previa de COMIT y del proyecto Farcaster. La prueba DLEQ usa la misma construcción que eigenwallet.

## Código

[github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p) (licencia AGPL-3.0).
