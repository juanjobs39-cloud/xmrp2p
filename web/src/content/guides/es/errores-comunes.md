---
key: common-mistakes
lang: es
slug: errores-comunes-al-enviar-cripto
title: Errores comunes al enviar cripto (y cómo evitarlos)
description: "Red equivocada, memo o tag faltante, montos mínimos, falta de gas, direcciones envenenadas y autorizaciones ilimitadas: cómo evitar perder fondos."
published: 2026-10-24
updated: 2026-10-24
order: 7
related: [usdt-networks, monero-wallet, swap-usdt-xmr]
---

**Respuesta corta:** los errores que más dinero cuestan son enviar por la red equivocada, olvidar el memo o tag que pide un exchange, enviar menos del monto mínimo, quedarse sin gas y copiar una dirección falsa. Revisa red, dirección completa y monto antes de firmar: las transacciones no se pueden revertir.

## Error 1: Enviar por la red equivocada

El mismo token existe en varias redes (por ejemplo, USDT en Tron, Ethereum y Arbitrum). Si envías por una red que el destino no soporta, los fondos pueden perderse o requerir un rescate costoso.

**Cómo evitarlo:** confirma la red con quien recibe. En la app de xmrp2p solo aparecen redes activas.

## Error 2: Olvidar el memo, tag o payment ID

Algunos exchanges comparten una sola dirección entre muchos clientes y te identifican con un memo o tag. Sin él, el depósito puede quedar sin asignar.

**Cómo evitarlo:** si el exchange muestra un memo o tag, inclúyelo siempre. En Monero, los exchanges suelen darte una subdirección propia y no necesitas payment ID.

## Error 3: Enviar menos del mínimo

Exchanges y servicios tienen montos mínimos de depósito. Por debajo, el depósito puede no acreditarse. En xmrp2p cada oferta muestra su mínimo y su máximo.

## Error 4: Quedarse sin gas

Para mover USDT necesitas la moneda de la red (ETH, TRX…). Sin ella, no puedes depositar ni reembolsar.

**Cómo evitarlo:** antes de un swap, ten saldo para al menos 3 transacciones (depósito, confirmación y un posible reembolso).

## Error 5: Direcciones envenenadas y portapapeles

Los atacantes envían montos diminutos desde direcciones que se parecen a las tuyas para que las copies del historial. Algunos programas maliciosos cambian la dirección que copias.

**Cómo evitarlo:** copia la dirección desde su origen (no del historial) y compara el inicio **y** el final completos.

## Error 6: Autorizaciones ilimitadas

Algunas apps piden permiso para gastar una cantidad ilimitada de tus tokens. Si esa app se ve comprometida, puede vaciar tu saldo.

**Cómo evitarlo:** autoriza solo el monto necesario. xmrp2p autoriza exactamente el monto del swap.

## Error 7: Confiar en "soporte" que te escribe

Nadie legítimo te pedirá tu semilla, tu archivo de recuperación ni que envíes fondos para "desbloquear" algo.

## Lista rápida antes de firmar

- [ ] ¿La red es la correcta?
- [ ] ¿La dirección coincide completa?
- [ ] ¿El monto supera el mínimo?
- [ ] ¿Tengo gas suficiente?
- [ ] ¿Guardé mi archivo de recuperación (en xmrp2p)?
