---
key: how
lang: es
title: Cómo funciona un swap de USDT a Monero en xmrp2p
description: "Un atomic swap cambia tu USDT por XMR sin intermediarios: un contrato retiene el USDT y solo lo libera cuando ya puedes tomar el XMR. Explicación simple y técnica."
updated: 2026-10-24
---

**Respuesta corta:** tu USDT queda en un contrato inteligente que solo puede pagarle al vendedor si este revela un secreto. Ese mismo secreto es la mitad que te falta para abrir la dirección de Monero donde el vendedor dejó el XMR. Por eso el intercambio es "atómico": o se completan las dos partes, o ninguna. Si algo falla, el contrato te devuelve el USDT.

## Para principiantes

Piensa en una caja fuerte con dos cerraduras:

1. **Tú y el vendedor (el "maker") crean juntos una dirección de Monero** de la que cada uno tiene solo media llave. Nadie puede mover lo que haya ahí sin las dos mitades.
2. **Tú depositas el USDT en un contrato.** El contrato sabe cómo comprobar la media llave del maker, pero no la conoce.
3. **El maker deposita el XMR** en la dirección compartida. La app comprueba que llegó el monto correcto.
4. **Confirmas** en el contrato que todo está bien.
5. **El maker cobra el USDT**, y para hacerlo tiene que entregar su media llave al contrato, que la publica en la cadena.
6. **La app toma esa media llave**, la junta con la tuya y envía el XMR a tu dirección.

Si el maker nunca deposita el XMR, no confirmas y recuperas tu USDT con un reembolso.

## Qué necesitas

| Necesitas | Para qué |
|---|---|
| Una wallet de navegador (MetaMask o compatible) con USDT | Depositar en el contrato |
| Un poco de la moneda de la red (por ejemplo ETH en Arbitrum) | Pagar el gas de las transacciones |
| Una dirección de Monero | Recibir el XMR ([cómo crear una wallet](/es/guias/como-crear-una-wallet-de-monero/)) |
| Un archivo de recuperación con contraseña | Reanudar si cierras la pestaña |

## Los dos plazos (t0 y t1)

El contrato tiene dos momentos clave:

| Momento | Qué puedes hacer tú | Qué puede hacer el maker |
|---|---|---|
| Antes de **t0**, sin haber confirmado | Confirmar o reembolsar | Nada |
| Después de confirmar, o entre **t0** y **t1** | Esperar | Cobrar (y así revelar su secreto) |
| Desde **t1** | Reembolsar | Nada |

**Importante:** si no confirmas ni reembolsas antes de t0, el contrato deja que el maker cobre aunque no haya depositado el XMR. Por eso la app te pide reembolsar automáticamente si el XMR no está verificado cuando se acerca t0, y por eso debes guardar el archivo de recuperación.

## Explicación técnica

- **Mitades de llave.** Cada parte genera un escalar `s` de 252 bits. La llave pública de gasto de Monero de la dirección compartida es `S_taker + S_maker` (ed25519); la llave de vista es `v_taker + v_maker`.
- **Prueba DLEQ.** Cada parte demuestra, sin revelarlo, que el mismo `s` está detrás de su llave ed25519 (Monero) y de una llave secp256k1, que es la que verifica el contrato. Usamos la construcción de `sigma_fun`, la misma de eigenwallet.
- **Contrato.** Un escrow por swap (clon EIP-1167) guarda `keccak(s_maker·G)` y `keccak(s_taker·G)`. `claim(s_maker)` y `refund(s_taker)` comprueban el secreto con un truco de `ecrecover`. Las ventanas de ambos nunca se solapan.
- **Verificación del XMR.** El maker envía el ID de su transacción y la llave de la transacción; la app comprueba el pago con `check_tx_key` sin sincronizar toda la wallet.
- **Barrido.** Al ver el secreto del maker en el evento `Claimed`, la app calcula `s_taker + s_maker` y envía el XMR a tu dirección.

El diseño completo está en el [documento de arquitectura](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/ARQUITECTURA.md) y se basa en el protocolo de AthanorLabs.
