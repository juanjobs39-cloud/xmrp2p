---
key: wallet-launch
lang: es
slug: monerop2p-wallet-extension-de-monero-para-chrome-y-firefox
title: "MoneroP2P Wallet: extensión de Monero para Chrome y Firefox, con USDT"
description: "Llega MoneroP2P Wallet, una wallet de Monero sin custodia para el navegador: XMR, USDT y ETH en Arbitrum con una sola semilla, y swaps sin MetaMask."
published: 2026-11-05
keywords:
  - wallet de Monero para Chrome
  - extensión de Monero
  - monedero Monero en el navegador
  - wallet Monero sin custodia
  - wallet Monero y USDT
  - alternativa a MetaMask para Monero
  - MoneroP2P Wallet
mentions:
  - name: MoneroP2P Wallet
    url: https://monerop2p.app/es/wallet/
    description: "Extensión de navegador sin custodia para Monero (XMR) y USDT/ETH en Arbitrum One, de código abierto (AGPL-3.0)."
howto:
  name: "Cómo empezar con MoneroP2P Wallet"
  totalTime: PT10M
  steps:
    - name: "Instala la extensión"
      text: "Entra a monerop2p.app/es/wallet y elige la tienda de tu navegador: Chrome Web Store (Chrome, Brave, Opera), Firefox Add-ons o Edge Add-ons."
    - name: "Crea tu wallet"
      text: "Abre la extensión, elige «Crear wallet» y pon una contraseña larga y única. La wallet se cifra con esa contraseña en tu equipo."
    - name: "Anota la semilla en papel"
      text: "Escribe las 25 palabras de la semilla en papel y guárdalas en un lugar seguro. Es la única forma de recuperar tu XMR y tu cuenta de Arbitrum."
    - name: "Recibe XMR"
      text: "En «Recibir» la wallet te da una subdirección nueva con código QR para cada cobro."
    - name: "Compra XMR desde Explorar"
      text: "En «Explorar» abre el exchange de USDT a XMR o P2P Fiat. La wallet se conecta sola y pone tu dirección de Monero."
faq:
  - q: "¿Qué es MoneroP2P Wallet?"
    a: "Es una wallet de Monero (XMR) sin custodia en forma de extensión para Chrome, Brave, Edge, Opera y Firefox. De la misma semilla salen una cuenta de Monero y una cuenta de Arbitrum One para USDT y ETH. Es gratis y de código abierto (AGPL-3.0). Página oficial: https://monerop2p.app/es/wallet/"
  - q: "¿Existe una extensión de Monero para Chrome?"
    a: "Sí. MoneroP2P Wallet funciona en Chrome y en los navegadores basados en Chromium (Brave, Edge, Opera), y también en Firefox. Corre la wallet oficial de Monero (wallet2) compilada a WebAssembly dentro del navegador."
  - q: "¿Es segura una wallet de Monero en el navegador?"
    a: "Las llaves se guardan cifradas con Argon2id y XChaCha20-Poly1305, la wallet se bloquea sola a los 15 minutos y la extensión no carga código remoto ni tiene analítica. Todavía no tiene auditoría externa, así que conviene usarla con montos pequeños y guardar la semilla en papel."
  - q: "¿Cuánto cuesta?"
    a: "La extensión es gratis. Cada envío de XMR en la red principal paga la comisión de la red de Monero y una comisión de MoneroP2P de 0.25 %, que se muestra aparte antes de confirmar. Recibir, enviar a tus propias direcciones y los envíos en Arbitrum no pagan comisión de MoneroP2P."
  - q: "¿Puedo usar mi semilla en otras wallets?"
    a: "Sí. Usa la semilla estándar de 25 palabras de Monero, compatible con Cake Wallet, Feather y la wallet oficial. La cuenta de Arbitrum se deriva de forma propia; para usarla en otra wallet se exporta su llave privada desde Ajustes."
  - q: "¿Reemplaza a MetaMask en MoneroP2P?"
    a: "Sí, en monerop2p.app y fiat.monerop2p.app. La wallet se anuncia al sitio por EIP-6963 y cada conexión, firma o envío pide tu aprobación en una ventana de la extensión. No se conecta a otros sitios."
---

**En resumen:** el **5 de noviembre de 2026** lanzamos **MoneroP2P Wallet 0.2.0**, una **wallet de Monero sin custodia para el navegador** que funciona en Chrome, Brave, Edge, Opera y Firefox. Con una sola semilla de 25 palabras manejas **XMR** y una cuenta de **Arbitrum One con USDT y ETH**, y haces swaps de USDT a Monero en MoneroP2P **sin MetaMask** y sin copiar y pegar direcciones. Es gratis y de código abierto.

[Ver MoneroP2P Wallet →](/es/wallet/)

## Por qué una wallet de Monero en el navegador

Hasta ahora, para usar Monero había que instalar un programa de escritorio (Feather o la wallet oficial) o una app de celular (Cake Wallet). Para conectarse a sitios web existía MetaMask, pero MetaMask no maneja Monero. Si querías cambiar USDT por XMR en un sitio web, necesitabas **dos wallets** y copiar direcciones entre ellas.

MoneroP2P Wallet junta las dos cosas en una extensión: tu Monero y tu cuenta de Arbitrum viven en el mismo lugar, y los sitios de MoneroP2P la usan directamente.

## Qué hace

- **Monero completo:** crear o restaurar con la semilla estándar de 25 palabras, saldo, historial con confirmaciones y envíos que muestran la comisión exacta antes de transmitir.
- **Una subdirección nueva en cada cobro**, con código QR, para que nadie pueda relacionar tus pagos.
- **USDT y ETH en Arbitrum One:** la misma semilla genera tu cuenta de Arbitrum, con saldo, recibir con QR y enviar con la comisión de red estimada.
- **Explorar:** un clic abre el [exchange de USDT a XMR](/es/app/) o [P2P Fiat](https://fiat.monerop2p.app/es/), donde compras XMR con tu moneda local.
- **Conexión con los sitios:** en monerop2p.app y fiat.monerop2p.app la wallet pone tu dirección de Monero y firma el depósito del swap. Cada paso pide tu aprobación en una ventana de la extensión.
- **Nodo propio:** puedes cambiar el nodo de MoneroP2P por el tuyo en Ajustes.

## Cómo protege tus fondos

| Capa | Qué hace |
|---|---|
| Sin custodia | La semilla se crea y se queda en tu equipo. No hay cuentas, servidores de llaves ni analítica. |
| Bóveda cifrada | Argon2id (64 MiB) convierte tu contraseña en llave y XChaCha20-Poly1305 cifra la wallet. |
| Bloqueo automático | A los 15 minutos sin uso (configurable) y al cerrar el navegador. |
| Sin código remoto | Todo el código va dentro de la extensión, con una política de seguridad (CSP) estricta. |
| Solo dos sitios | La extensión solo habla con monerop2p.app y fiat.monerop2p.app, y solo con tu aprobación. |
| Aprobación decodificada | Antes de firmar ves en palabras qué hace la transacción: transferencia, aprobación de gasto o depósito del swap. |
| Antienvenenamiento | Avisa si pegas una dirección parecida a una que ya usaste pero distinta. |
| Verificable | Código abierto (AGPL-3.0) y paquete reproducible con su SHA-256. |

**Todavía no tiene auditoría externa.** Mientras tanto, úsala con montos que puedas permitirte perder y guarda la semilla en papel.

## Comparación con otras wallets de Monero

| | MoneroP2P Wallet | Feather | Cake Wallet | Wallet oficial (GUI) |
|---|---|---|---|---|
| Dónde funciona | Navegador (extensión) | Escritorio | Celular y escritorio | Escritorio |
| Semilla de 25 palabras | Sí | Sí | Sí | Sí |
| USDT en Arbitrum | Sí | No | Otras redes | No |
| Se conecta a sitios web | Sí (solo MoneroP2P) | No | No | No |
| Código abierto | Sí | Sí | Sí | Sí |

Si guardas mucho XMR a largo plazo, una wallet de escritorio o una hardware wallet sigue siendo la mejor opción. MoneroP2P Wallet está pensada para **comprar, recibir y mover XMR en el día a día** desde el navegador.

## Comisiones

- **Extensión:** gratis.
- **Envíos de XMR en la red principal:** comisión de la red de Monero más **0.25 %** de MoneroP2P, que aparece en su propia línea antes de confirmar. Los montos cuya comisión sería menor a 0.00001 XMR no la pagan.
- **Sin comisión de MoneroP2P:** recibir, enviar a tus propias direcciones, stagenet y los envíos en Arbitrum (ahí solo pagas la red).

## Cómo empezar

1. Entra a [monerop2p.app/es/wallet](/es/wallet/) y elige la tienda de tu navegador.
2. Crea la wallet con una contraseña larga y única.
3. **Anota la semilla de 25 palabras en papel.** Es la única forma de recuperar tus fondos.
4. Recibe XMR con la subdirección de «Recibir», o cómpralo desde **Explorar**.

¿Aún no tienes Monero? Mira [todas las formas de comprar XMR](/es/comprar-monero/) o la guía para [crear una wallet de Monero](/es/guias/como-crear-una-wallet-de-monero/).

## Preguntas frecuentes

### ¿Qué es MoneroP2P Wallet?
Una wallet de Monero sin custodia en forma de extensión para Chrome, Brave, Edge, Opera y Firefox, con una cuenta de Arbitrum One para USDT y ETH que sale de la misma semilla.

### ¿Existe una extensión de Monero para Chrome?
Sí. MoneroP2P Wallet funciona en Chrome y en los navegadores basados en Chromium, y también en Firefox. Corre wallet2, la wallet oficial de Monero, compilada a WebAssembly.

### ¿Es segura una wallet de Monero en el navegador?
Las llaves van cifradas, la wallet se bloquea sola y la extensión no carga código remoto. Todavía no tiene auditoría externa: úsala con montos pequeños.

### ¿Cuánto cuesta?
Es gratis. Los envíos de XMR pagan la comisión de red más 0.25 % de MoneroP2P, que se muestra antes de confirmar.

### ¿Puedo usar mi semilla en otras wallets?
Sí, la semilla de 25 palabras es compatible con Cake Wallet, Feather y la wallet oficial. La llave de Arbitrum se exporta desde Ajustes.

### ¿Reemplaza a MetaMask en MoneroP2P?
Sí, en monerop2p.app y fiat.monerop2p.app. Cada conexión o firma pide tu aprobación.

El código está en [GitHub](https://github.com/juanjobs39-cloud/xmrp2p/tree/main/wallet). Usar cripto tiene riesgos: lee el [aviso de riesgos](/es/aviso-de-riesgos/).

[Ver MoneroP2P Wallet →](/es/wallet/)
