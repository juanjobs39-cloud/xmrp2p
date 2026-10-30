---
key: real-money-launch
lang: es
slug: monerop2p-ya-funciona-con-dinero-real
title: MoneroP2P ya funciona con dinero real
description: "Desde el 26 de octubre de 2026 puedes cambiar USDT por Monero con dinero real en Arbitrum One, sin custodia, sin cuenta y con un máximo de 100 USDT por swap."
published: 2026-10-30
---

**En resumen:** desde el **26 de octubre de 2026** MoneroP2P funciona con dinero real. Puedes cambiar USDT (USD₮0 en Arbitrum One) por Monero mediante un atomic swap que corre en tu navegador, sin cuenta y sin que nadie guarde tus fondos. Cada swap tiene un máximo de **100 USDT**, fijado en el propio contrato.

## Qué cambió

Hasta ahora la plataforma solo funcionaba en redes de prueba. El primer swap con dinero real se completó de principio a fin el 26 de octubre: el comprador depositó USDT, el maker bloqueó el XMR, el comprador confirmó y recibió su Monero, y el contrato pagó al maker. Desde entonces el modo real es el predeterminado del sitio.

El modo de práctica en testnet sigue disponible para quien quiera probar sin riesgo.

## Cómo protegemos tu dinero

- **Nadie custodia fondos.** Tu USDT queda en un contrato dedicado a tu swap, sin funciones de administrador. Solo puede pagar al maker cuando tú ya puedes tomar el XMR, o devolverte el USDT si algo falla.
- **Contrato verificado.** Pasó verificación simbólica con **Halmos** (7 de 7 propiedades demostradas para cualquier entrada) y análisis estático con **Aderyn** (0 hallazgos altos) y **Slither** (sin hallazgos medios ni altos). Su código está verificado en **Sourcify**: [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535).
- **Tope de 100 USDT por swap.** Todavía no hay auditoría externa, así que limitamos lo que un solo swap pone en riesgo. El tope está en el contrato y nadie lo puede subir sin desplegar uno nuevo.
- **Código abierto** (AGPL-3.0) en [GitHub](https://github.com/juanjobs39-cloud/xmrp2p), con sumas SHA-256 de cada archivo del sitio para que verifiques lo que cargas.

## Cuánto cuesta

La comisión de la plataforma es del **0,5 %** y la paga el maker al cobrar. Tú solo pagas el gas de Arbitrum para depositar y confirmar, y la comisión de la red de Monero al recibir. El precio de cada maker ya incluye su margen; la app te muestra el XMR exacto antes de depositar.

## Otras novedades de estas semanas

- **Vista simple:** escribes cuánto USDT envías, presionas «Intercambiar» y ves todas las cotizaciones ordenadas por lo que recibes.
- **Más de 100 USDT o sin makers disponibles:** la app te muestra cotizaciones de exchanges instantáneos a través de Trocador. Esa opción funciona distinto (el exchange custodia el intercambio); lo explicamos en la [política de privacidad](/es/privacidad/).
- **Ser maker desde el navegador**, sin instalar nada: la pestaña abierta funciona como tu servidor. [Cómo ser maker](/es/conviertete-en-maker/).
- **10 idiomas:** español, inglés, portugués, ruso, ucraniano, chino, japonés, coreano, hindi y persa.

## Lo que sigue

- Una auditoría externa del contrato, que permitiría subir el tope por swap.
- Más makers para que siempre haya ofertas.
- Evaluar otras redes de USDT, como Tron.

[Abrir la app →](/es/app/) · Antes de usarla, lee el [aviso de riesgos](/es/aviso-de-riesgos/).
