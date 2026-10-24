---
key: maker
lang: es
title: Conviértete en maker
description: "Un maker aporta XMR y cobra un margen sobre el precio de mercado. Qué necesitas, cómo correr el daemon y qué riesgos asumes."
updated: 2026-10-24
---

**Respuesta corta:** un maker es quien tiene XMR y lo ofrece a cambio de USDT. Corre un programa (daemon) en su propio servidor o computadora que publica ofertas, responde swaps automáticamente, bloquea el XMR y cobra el USDT. Gana el margen que fija sobre el precio de referencia. En esta etapa solo funciona en testnet.

## Qué necesitas

| Requisito | Detalle |
|---|---|
| Un equipo encendido de forma continua | El daemon debe estar en línea para responder y cobrar a tiempo |
| `monero-wallet-rpc` con una wallet con XMR | Para bloquear y recuperar XMR |
| Una cuenta en la red EVM con algo de gas | Para enviar `claim` |
| Python 3.10+ y el núcleo criptográfico compilado | Instrucciones en `maker/README.md` |

## Cómo se fija el precio

El daemon toma la mediana de varias fuentes públicas (Kraken, CoinGecko y KuCoin), descarta la cotización si alguna se aleja demasiado de la mediana y aplica tu margen. Tú defines:

- el margen sobre el precio de referencia,
- los montos mínimo y máximo por swap,
- la exposición máxima (XMR comprometido al mismo tiempo),
- el número de swaps simultáneos.

## Reglas de seguridad del daemon

- No envía XMR sin un depósito válido en la cadena.
- Nunca cobra si no bloqueó el XMR.
- No intenta cobrar en los últimos minutos antes de t1.
- Simula cada transacción antes de enviarla.
- Si el taker reembolsa, recupera el XMR automáticamente.

## Riesgos para el maker

- **Volatilidad:** el precio puede moverse entre la cotización y el cobro.
- **Disponibilidad:** si tu daemon está caído entre t0 y t1, no cobrarás y deberás recuperar tu XMR.
- **Respaldo:** la base de datos del daemon contiene las mitades de llave de cada swap; sin ella no puedes recuperar el XMR.
- **Regulación:** operar como maker puede tener implicaciones legales en tu país. Infórmate antes.

Nada de esto garantiza ganancias. La guía completa para instalar el daemon está en [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
