---
key: what-is-monero
lang: es
slug: que-es-monero
title: Qué es Monero y en qué se diferencia de Bitcoin
description: "Monero (XMR) es una criptomoneda privada por defecto: oculta remitente, destinatario y monto. Diferencias con Bitcoin en privacidad, emisión y uso."
published: 2026-10-24
updated: 2026-10-24
order: 5
related: [monero-wallet, atomic-swap]
---

**Respuesta corta:** Monero (XMR) es una criptomoneda que oculta por defecto quién envía, quién recibe y cuánto. En Bitcoin, en cambio, todas las direcciones y montos son públicos y cualquiera puede seguir el rastro de los fondos. Monero existe desde 2014 y es de código abierto.

## Diferencias principales

| | Monero (XMR) | Bitcoin (BTC) |
|---|---|---|
| Remitente | Oculto (firmas en anillo) | Público |
| Destinatario | Oculto (direcciones de un solo uso) | Público |
| Monto | Oculto (RingCT) | Público |
| Privacidad | Siempre activa | Opcional y limitada |
| Tiempo entre bloques | Unos 2 minutos | Unos 10 minutos |
| Emisión | Emisión de cola permanente y pequeña desde 2022 | Tope de 21 millones |
| Contratos inteligentes | No | Scripts limitados |

## Cómo logra la privacidad

- **Firmas en anillo:** tu transacción se mezcla con otras salidas de la cadena, de modo que no se sabe cuál es la real.
- **Direcciones ocultas (stealth):** cada pago va a una dirección de un solo uso; tu dirección pública no aparece en la cadena.
- **RingCT:** los montos están cifrados, pero la red verifica que no se crea dinero de la nada.

## Fungibilidad

Como el historial no es visible, cada XMR es intercambiable por otro. En monedas transparentes, algunas unidades pueden ser rechazadas por su historial.

## Llave de vista

Monero permite compartir una **llave de vista**, que muestra los pagos recibidos sin permitir gastar. xmrp2p la usa para que el comprador verifique que el XMR llegó a la dirección compartida.

## Lo que debes saber

- Algunos exchanges centralizados han retirado Monero en ciertas jurisdicciones. Por eso los métodos sin intermediarios, como los atomic swaps, son relevantes.
- La privacidad no te exime de cumplir las leyes de tu país.

Sigue con: [cómo crear una wallet de Monero](/es/guias/como-crear-una-wallet-de-monero/).
