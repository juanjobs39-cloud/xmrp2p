---
key: swap-costs
lang: es
slug: cuanto-cuesta-cambiar-usdt-a-monero
title: Cuánto cuesta realmente cambiar USDT a Monero
description: "Qué pagas al cambiar USDT por XMR: margen del precio, comisión, gas y comisión de red. Cómo calcular el costo total y comparar opciones con un solo número."
published: 2026-10-30
updated: 2026-10-30
order: 10
related: [buy-xmr-no-kyc, swap-usdt-xmr, usdt-networks]
---

**Respuesta corta:** el costo total de cambiar USDT por Monero tiene cuatro partes: el **margen del precio** (cuánto XMR te dan frente al precio de mercado), la **comisión del servicio**, el **gas** de la red del USDT y la **comisión de la red de Monero**. Para comparar opciones no hace falta sumar todo: basta con ver **cuánto XMR recibes por la misma cantidad de USDT**. El que te da más XMR es el más barato.

## Las cuatro partes del costo

| Parte | Qué es | Cuánto suele ser |
|---|---|---|
| Margen del precio | La diferencia entre el precio de mercado y el precio que te ofrecen | Es la parte más grande; depende del vendedor |
| Comisión del servicio | Lo que cobra la plataforma o el exchange | Varía; a veces ya está dentro del precio |
| Gas | Lo que cobra la red del USDT por tus transacciones | En Arbitrum, normalmente centavos de dólar |
| Comisión de red de Monero | Lo que cobra Monero por enviarte el XMR | Normalmente una fracción de centavo |

Muchas veces el margen y la comisión ya vienen **dentro de la cotización**, así que no los ves por separado. Por eso la cifra que importa es el XMR final.

## Cómo calcular el costo real

1. Busca el **precio de referencia** de XMR en USDT en un sitio de precios.
2. Divide lo que envías entre ese precio: es el XMR que recibirías sin ningún costo.
3. Compara con lo que te ofrecen. La diferencia, en porcentaje, es tu costo total.

**Ejemplo con números inventados**, solo para ilustrar el cálculo: si el XMR vale 300 USDT y envías 50 USDT, sin costos recibirías 0,1667 XMR.

| Opción | Recibes | Costo total |
|---|---|---|
| A | 0,1625 XMR | 2,5 % |
| B | 0,1640 XMR | 1,6 % |

La opción B es más barata aunque su "comisión" anunciada fuera más alta: lo que cuenta es el XMR que llega a tu wallet.

## Cuánto cuesta en MoneroP2P

- **Comisión de la plataforma: 0,5 %**, que paga el maker al cobrar su USDT. El precio que publica cada maker ya incluye su margen; la app te muestra el XMR exacto **antes** de depositar.
- **Gas en Arbitrum One:** pagas el depósito y la confirmación (y el reembolso, si hiciera falta). Tu wallet te muestra el costo exacto antes de firmar.
- **Comisión de la red de Monero:** se descuenta al enviarte el XMR.
- **Los reembolsos no pagan comisión** de la plataforma; solo el gas.

En la vista simple de la [app](/es/app/) escribes cuánto USDT envías y ves todas las cotizaciones ordenadas por XMR recibido, así que la comparación ya está hecha.

## Costos que no se ven a primera vista

- **Mover tu USDT de red.** Si tu USDT está en Tron o Ethereum y el servicio usa Arbitrum, cambiarlo de red cuesta comisiones y tiempo. A veces sale más caro que el propio swap. [Diferencias entre redes](/es/guias/usdt-trc20-vs-erc20-vs-l2/).
- **Tasa variable o fija.** En los exchanges instantáneos, la tasa **variable** puede cambiar mientras llega tu depósito; la **fija** te garantiza el monto pero suele dar menos XMR.
- **Montos pequeños.** El gas y la comisión de red son casi fijos, así que pesan más en cambios chicos.
- **Tiempo.** Un swap que tarda una hora te expone a que el precio se mueva. En MoneroP2P el monto de XMR queda fijado al pedir el swap.

## Consejos para pagar menos

- Compara siempre por **XMR recibido**, no por la comisión anunciada.
- Cambia desde la **red donde ya tienes tu USDT**, si el servicio la admite.
- Evita montos muy pequeños si puedes juntar uno más grande (sin pasar de 100 USDT por swap en MoneroP2P).
- Ten un poco de **ETH en Arbitrum** para el gas, para no tener que comprarlo con prisa.

Si todavía no sabes qué opción usar, empieza por [cómo comprar Monero sin KYC](/es/guias/como-comprar-monero-sin-kyc/).
