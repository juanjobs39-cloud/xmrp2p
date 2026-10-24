---
key: swap-usdt-xmr
lang: es
slug: como-cambiar-usdt-a-monero-sin-intermediarios
title: Cómo cambiar USDT a Monero sin intermediarios
description: "Paso a paso para cambiar USDT por XMR con un atomic swap desde el navegador, sin cuenta y sin que nadie custodie tus fondos."
published: 2026-10-24
updated: 2026-10-24
order: 1
related: [atomic-swap, monero-wallet, closed-tab, common-mistakes]
howto:
  name: Cambiar USDT por Monero con un atomic swap
  totalTime: PT1H
  steps:
    - name: Prepara tu wallet de Monero
      text: Crea una wallet de Monero y copia tu dirección de recepción. En la versión de prueba debe ser una dirección de stagenet.
    - name: Abre la app y elige una oferta
      text: Elige la oferta de un maker, escribe el monto de USDT y tu dirección de Monero.
    - name: Crea la contraseña y descarga el archivo de recuperación
      text: Elige una contraseña de al menos 10 caracteres y descarga el archivo cifrado. Es obligatorio antes de depositar.
    - name: Deposita el USDT
      text: Conecta tu wallet (MetaMask o compatible) y firma el depósito en el contrato.
    - name: Espera y confirma
      text: La app verifica el XMR que bloquea el maker. Cuando esté verificado, confirma con setReady.
    - name: Recibe el XMR
      text: Cuando el maker cobra, la app junta las dos mitades de la llave y envía el XMR a tu dirección.
---

**Respuesta corta:** abre la app, elige una oferta, escribe tu dirección de Monero, descarga tu archivo de recuperación, deposita el USDT desde tu wallet y espera. La app verifica el XMR, te pide confirmar y al final envía el XMR a tu dirección. Si algo falla, te pide reembolsar el USDT. Todo el proceso suele tardar entre 30 y 60 minutos.

> En este momento xmrp2p solo funciona en **testnet** (Arbitrum Sepolia y Monero stagenet). Los pasos son los mismos que tendrá la versión real.

## Antes de empezar

| Necesitas | Dónde conseguirlo |
|---|---|
| Wallet de navegador con USDT | MetaMask o una wallet compatible con redes EVM |
| Algo de ETH en la misma red | Para pagar el gas de 2 o 3 transacciones |
| Dirección de Monero | [Cómo crear una wallet de Monero](/es/guias/como-crear-una-wallet-de-monero/) |
| 30 a 60 minutos con la pestaña abierta | O tu archivo de recuperación para volver después |

## Paso a paso

### Paso 1: Elige una oferta

En la app verás las ofertas de los makers: precio en USDT por XMR y montos mínimo y máximo. El precio lo fija cada maker y cambia con el mercado; la app te muestra la cantidad exacta de XMR antes de depositar.

### Paso 2: Escribe tu dirección y una contraseña

- **Dirección de Monero:** donde recibirás el XMR. Revísala dos veces; los envíos son irreversibles.
- **Contraseña:** protege tu archivo de recuperación. Si la olvidas, nadie puede recuperarla.

### Paso 3: Descarga el archivo de recuperación

La app no te deja depositar sin descargarlo. Contiene tu mitad de la llave, cifrada. Con él puedes reanudar el swap desde cualquier navegador ([qué hacer si cerraste la pestaña](/es/guias/que-hacer-si-cerraste-la-pestana/)).

### Paso 4: Deposita el USDT

Conecta tu wallet. Si el token lo permite, firmarás una autorización y el depósito en una sola transacción; si no, primero aprobarás el monto. El USDT queda en un contrato que solo se libera según las reglas del swap.

### Paso 5: Espera la verificación y confirma

El maker bloquea el XMR en una dirección compartida y envía la prueba de pago. La app comprueba el monto y las confirmaciones de la red de Monero. Cuando todo está bien, aparece el botón **Confirmar**. Al confirmar, el maker ya puede cobrar.

Si el XMR no llega o el monto es menor, la app te pide **reembolsar** antes del plazo t0. Hazlo: después de ese plazo ya no podrás reembolsar hasta el plazo final.

### Paso 6: Recibe tu XMR

Cuando el maker cobra el USDT, revela su mitad de la llave. La app la combina con la tuya y envía el XMR a tu dirección. Tu wallet lo mostrará después de unas confirmaciones.

## Costos

- **Comisión de la plataforma:** un porcentaje del USDT, cobrado por el contrato al completarse el swap, con tope de 1 %.
- **Gas** en la red del USDT para depositar y confirmar (y reembolsar si hace falta).
- **Comisión de red de Monero** al enviar el XMR a tu dirección.
- **Margen del maker**, ya incluido en su precio.

Las comisiones de red cambian según la congestión; consúltalas en tu wallet antes de firmar.

## Si algo sale mal

| Problema | Qué hacer |
|---|---|
| El maker no respondió | No depositaste nada: elige otra oferta |
| Cerraste la pestaña | Vuelve a la app y usa tu archivo de recuperación |
| El XMR no llega | Espera; si se acerca t0, la app te pedirá reembolsar |
| Te quedaste sin gas | Consigue un poco de ETH en la red y vuelve a intentarlo |

Antes de usar el servicio, lee el [aviso de riesgos](/es/aviso-de-riesgos/).
