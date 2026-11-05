---
key: privacy
lang: es
title: Política de privacidad
description: "Qué datos procesa MoneroP2P (casi ninguno), qué es público en las cadenas, qué ve el proxy de nodos y cómo reducir lo que se expone."
updated: 2026-11-05
---

**Respuesta corta:** no tenemos cuentas, no usamos cookies ni analítica y no guardamos tus llaves. Algunos datos son públicos por naturaleza (las transacciones en la cadena del USDT) y nuestros servidores procesan datos técnicos mínimos para funcionar. La excepción son los intercambios instantáneos vía Trocador, explicados abajo.

## Lo que NO recogemos

- Nombre, correo, teléfono ni documentos de identidad.
- Cookies de seguimiento ni analítica de terceros.
- Llaves privadas, frases semilla ni el contenido de tu archivo de recuperación.

## Lo que procesan nuestros servidores (Cloudflare)

| Dato | Para qué | Cuánto se guarda |
|---|---|---|
| Dirección IP | Límites de abuso y bloqueo por región | No la almacenamos en los swaps de MoneroP2P; Cloudflare puede registrarla según su política |
| Mensajes públicos del protocolo (llaves públicas, prueba DLEQ, llave de vista) | Que el maker y tú puedan completar el swap | La sala se borra sola a los 3 días |
| Ofertas de makers | Mostrar el libro de órdenes | Mientras la oferta está vigente |

## Intercambios instantáneos vía Trocador

Cuando ningún maker de MoneroP2P cubre tu monto, la app puede mostrar cotizaciones de exchanges instantáneos a través de [Trocador](https://trocador.app). Esa opción funciona distinto:

- El intercambio lo hace el exchange que elijas, no MoneroP2P, y tú envías tu USDT a la dirección de ese exchange. Es un servicio con custodia, con sus propios términos y calificación KYC.
- Nuestro servidor pide las cotizaciones y crea el intercambio por ti. Los exchanges listados en Trocador exigen que, al **crear** un intercambio, guardemos tu **dirección IP, el idioma de tu navegador y los datos de tu navegador o dispositivo (user agent)** ligados al ID del intercambio, para responder solicitudes de autoridades que Trocador nos reenvíe.
- Guardamos estos datos **por tiempo indefinido**, como recomienda Trocador, porque esas solicitudes pueden llegar mucho después del intercambio. No se usan para nada más y no se comparten salvo para responder una solicitud así.
- Solo ver las cotizaciones no guarda nada. Los swaps con makers de MoneroP2P nunca guardan estos datos.
- Para evitarlo, usa un maker de MoneroP2P o entra directo a Trocador (entonces Trocador guarda tus datos según sus propios términos). Tor o una VPN reducen lo que revela tu IP.

## Lo que es público en las cadenas

- Tu depósito de USDT, la dirección de tu wallet EVM y los eventos del contrato son públicos en la red del USDT.
- En Monero, las transacciones son privadas por diseño, pero la llave de vista compartida del swap permite a ambas partes ver la dirección compartida.

## Proxy de nodos de Monero

Si usas nuestro proxy, este ve qué consultas hace tu navegador (por ejemplo, qué transacción verificas). Para evitarlo, usa tu propio nodo.

## Almacenamiento en tu navegador

La app guarda en tu navegador una copia **cifrada** del swap en curso, con la misma contraseña que tu archivo de recuperación. Puedes borrarla limpiando los datos del sitio.

## Extensión MoneroP2P Wallet

La extensión **no recoge ni envía datos personales**: no tiene cuentas, analítica ni telemetría. Tu semilla, tus llaves y tu historial se guardan **cifrados solo en tu navegador** (Argon2id y XChaCha20-Poly1305) y nunca salen de él. Para sincronizar, la extensión se conecta al nodo de Monero que elijas (por defecto, nuestro proxy, descrito arriba); ese nodo ve las consultas a la cadena y las transacciones ya firmadas que envías, no tus llaves. Al desinstalar la extensión se borran todos sus datos.

Para la cuenta de Arbitrum, la extensión consulta el RPC público de Arbitrum (arb1.arbitrum.io; sepolia-rollup.arbitrum.io en pruebas), que ve tu dirección pública de Arbitrum y las transacciones firmadas, nunca tus llaves. En monerop2p.app y fiat.monerop2p.app solo comparte tu cuenta o una dirección de Monero con el sitio si tú lo apruebas, y puedes desconectarlo en Ajustes.

## Contacto

[EMAIL_CONTACTO]
