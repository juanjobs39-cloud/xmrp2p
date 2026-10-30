---
key: usdt-networks
lang: es
slug: usdt-trc20-vs-erc20-vs-l2
title: "USDT TRC-20 vs ERC-20 vs L2: cuál conviene"
description: "Diferencias entre USDT en Tron (TRC-20), Ethereum (ERC-20) y redes de capa 2 como Arbitrum: comisiones, velocidad, compatibilidad y riesgos."
published: 2026-10-24
updated: 2026-10-24
order: 3
related: [common-mistakes, swap-usdt-xmr]
---

**Respuesta corta:** es el mismo dólar digital de Tether, pero en redes distintas que no se mezclan. Para un swap conviene la red donde ya tienes tu USDT y donde el servicio esté activo. Las redes de capa 2 (como Arbitrum) suelen ser más baratas que Ethereum, y Tron es muy usada en Latinoamérica, pero las comisiones cambian con el tiempo: revísalas en tu wallet antes de enviar.

## Las diferencias clave

| | Tron (TRC-20) | Ethereum (ERC-20) | Arbitrum y otras L2 |
|---|---|---|---|
| Formato de dirección | Empieza con `T` | `0x…` | `0x…` (igual que Ethereum) |
| Moneda para comisiones | TRX (energía y ancho de banda) | ETH | ETH (en la L2) |
| Costo típico | Variable; depende de la energía disponible | Suele ser el más alto | Suele ser bajo |
| Wallets habituales | TronLink y otras | MetaMask y compatibles | MetaMask y compatibles |
| ¿Puede Tether congelar? | Sí | Sí | Sí |

> No damos cifras de comisiones porque cambian con la congestión y con decisiones de cada red. Tu wallet te muestra el costo exacto antes de firmar.

## ¿Son la misma moneda?

Sí en valor, no en red. Un USDT en Tron no se puede enviar directamente a una dirección en Ethereum: necesitas un exchange o un puente. Enviar por la red equivocada es uno de los [errores más comunes](/es/guias/errores-comunes-al-enviar-cripto/).

## ¿Cuál usa MoneroP2P?

- **Ahora:** Arbitrum One, cuyo USDT (USD₮0) permite autorizar el depósito con una firma, sin transacción extra de aprobación. El modo de práctica usa Arbitrum Sepolia (testnet).
- **En evaluación:** Tron. El contrato ya compila para Tron, pero falta probarlo en su testnet; Tron tiene particularidades (por ejemplo, su USDT devuelve un valor inesperado al transferir) que el contrato ya contempla.

## Cómo elegir

1. **¿Dónde está tu USDT hoy?** Moverlo de red cuesta comisiones y tiempo.
2. **¿Tienes la moneda de comisiones?** Sin ETH (o TRX) no podrás firmar.
3. **¿Qué soporta el servicio?** Usa solo redes activas en la app.
4. **¿Qué tan rápido lo necesitas?** Las L2 confirman en segundos; Monero tarda más en confirmar el XMR.

## Riesgo común a todas

Tether puede congelar direcciones en todas estas redes. MoneroP2P usa un contrato separado por cada swap para que una congelación no afecte a los demás, pero el riesgo existe. Lee el [aviso de riesgos](/es/aviso-de-riesgos/).
