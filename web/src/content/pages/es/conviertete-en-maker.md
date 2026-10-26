---
key: maker
lang: es
title: Conviértete en maker
description: "Un maker aporta XMR y cobra un margen sobre el precio de mercado. Hazlo desde tu navegador sin instalar nada, o 24/7 con tu propio servidor."
updated: 2026-10-26
---

**Respuesta corta:** un maker es quien tiene XMR y lo ofrece a cambio de USDT, con un margen sobre el precio de referencia. Puedes serlo **desde tu navegador, sin instalar nada** (la pestaña abierta hace de servidor), o **24/7 con tu propio servidor o computadora**. En ambos casos nadie custodia tus fondos. En esta etapa solo funciona en testnet.

## Dos formas de ser maker

| | En tu navegador (recomendado) | Tu propio servidor 24/7 |
|---|---|---|
| Para quién | Cualquier persona | Makers con experiencia técnica |
| Instalación | Ninguna: abre [la página del maker](/es/maker/) | Python, `monero-wallet-rpc` y el daemon ([guía](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md)) |
| Cuándo ofreces | Mientras la pestaña esté abierta en una computadora | Todo el tiempo |
| Tus llaves | En tu navegador, cifradas con tu contraseña y en un respaldo | En tu servidor |
| Cobro del USDT | Directo a tu MetaMask | A la dirección que configures |

**Empieza aquí:** [Ser maker desde el navegador →](/es/maker/)

## Qué necesitas en el navegador

| Requisito | Detalle |
|---|---|
| Una computadora con la pestaña abierta | En el celular el navegador duerme las pestañas |
| XMR para ofrecer | Lo envías a la dirección que te da la página; se desbloquea tras 10 confirmaciones |
| Un poco de ETH para gas | Para cobrar; lo recargas con un clic desde MetaMask |
| Una contraseña y tu archivo de respaldo | Sin el respaldo no puedes recuperar tu maker en otro navegador |

## Cómo se fija el precio

El daemon toma la mediana de varias fuentes públicas (Kraken, CoinGecko y KuCoin), descarta la cotización si alguna se aleja demasiado de la mediana y aplica tu margen. Tú defines:

- el margen sobre el precio de referencia,
- los montos mínimo y máximo por swap,
- la exposición máxima (XMR comprometido al mismo tiempo),
- el número de swaps simultáneos.

## Reglas de seguridad (navegador y servidor)

- No envía XMR sin un depósito válido en la cadena.
- Nunca cobra si no bloqueó el XMR.
- No intenta cobrar en los últimos minutos antes de t1.
- Simula cada transacción antes de enviarla.
- Si el taker reembolsa, recupera el XMR automáticamente.

## Riesgos para el maker

- **Volatilidad:** el precio puede moverse entre la cotización y el cobro.
- **Disponibilidad:** si cierras la pestaña (o tu servidor se cae) entre t0 y t1, no cobrarás; el taker reembolsará y deberás volver para recuperar tu XMR.
- **Respaldo:** tu respaldo (o la base de datos del daemon) contiene las mitades de llave de cada swap; sin él no puedes recuperar el XMR.
- **Regulación:** operar como maker puede tener implicaciones legales en tu país. Infórmate antes.

Nada de esto garantiza ganancias. La guía para correr tu propio servidor está en [maker/README.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/maker/README.md).
