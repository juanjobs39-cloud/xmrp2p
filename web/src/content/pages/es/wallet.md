---
key: wallet
lang: es
title: "MoneroP2P Wallet: wallet de Monero (XMR) sin custodia para tu navegador"
description: "Extensión gratuita para Chrome, Brave, Edge y Firefox. Tus llaves de Monero nunca salen de tu equipo; compra XMR con USDT o con tu moneda sin salir de la wallet."
updated: 2026-11-04
keywords:
  - wallet monero
  - wallet xmr
  - extensión monero chrome
  - monero wallet navegador
  - monero wallet firefox
  - wallet monero sin custodia
faq:
  - q: "¿MoneroP2P Wallet guarda mis llaves en un servidor?"
    a: "No. La semilla y las llaves se generan y se guardan cifradas solo en tu navegador. No hay cuentas, ni registro, ni analítica. El nodo de MoneroP2P solo recibe consultas de la cadena y transacciones ya firmadas."
  - q: "¿Qué pasa si pierdo mi equipo o desinstalo la extensión?"
    a: "Restauras la wallet con tu semilla de 25 palabras en MoneroP2P Wallet o en cualquier wallet de Monero compatible, como Cake Wallet, Feather o la wallet oficial."
  - q: "¿Es compatible con otras wallets de Monero?"
    a: "Sí. Usa la semilla estándar de 25 palabras de Monero, así que puedes importarla en otras wallets y al revés."
  - q: "¿Puedo usar mi propio nodo?"
    a: "Sí. En Ajustes puedes poner la URL de tu nodo (https, o http://127.0.0.1 para uno local)."
  - q: "¿Cuánto cuesta?"
    a: "Es gratis y de código abierto (AGPL-3.0). Solo pagas la comisión de la red de Monero al enviar."
---

**MoneroP2P Wallet** es una wallet de Monero (XMR) en forma de extensión para tu navegador. Tus llaves se crean y se quedan en tu equipo, cifradas con tu contraseña. Desde la misma wallet puedes comprar XMR con USDT o con tu moneda local en los servicios de MoneroP2P.

## Qué puedes hacer

- **Crear o restaurar** una wallet con la semilla estándar de 25 palabras de Monero.
- **Recibir** con una subdirección nueva en cada cobro, con código QR, para que nadie pueda relacionar tus pagos.
- **Enviar** con la comisión exacta antes de confirmar y un resumen claro del destino.
- **Explorar:** abre en un clic el [exchange de USDT a XMR](/es/app/) (con tu dirección ya puesta) y [P2P Fiat](https://fiat.monerop2p.app/es/app/) para comprar con transferencia, efectivo u otros métodos locales.

## Cómo te protege

| Protección | Qué hace |
|---|---|
| Sin custodia | La semilla nunca sale de tu equipo; nadie más puede mover tu XMR. |
| Cifrado fuerte | Tu contraseña se convierte en llave con Argon2id (64 MiB) y la wallet se cifra con XChaCha20-Poly1305. |
| Bloqueo automático | Se bloquea sola a los 15 minutos sin uso (configurable) y al cerrar el navegador. |
| Sin código remoto | Todo el código va dentro de la extensión, con una política de seguridad (CSP) estricta. |
| Antienvenenamiento | Te avisa si pegas una dirección que se parece a una que ya usaste pero no es igual. |
| Verificable | El paquete se compila de forma reproducible: cualquiera puede comprobar que coincide con el código. |

## Antes de empezar

1. Anota la semilla **en papel** y guárdala bien: es la única forma de recuperar tu dinero.
2. Usa una contraseña larga y única para la extensión.
3. Prueba primero con un monto pequeño.

¿Aún no tienes XMR? Mira [todas las formas de comprar Monero](/es/comprar-monero/).
