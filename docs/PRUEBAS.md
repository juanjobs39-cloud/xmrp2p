# Pruebas de extremo a extremo (Fase 7)

> Última actualización: 24 de octubre de 2026. Estado: **plan listo y pruebas locales hechas; faltan las corridas en testnet**, que necesitan fondos de faucet (paso manual del dueño).

**Resumen:** todas las piezas se probaron por separado y varias juntas (contrato real + daemon del maker en anvil; backend real + cliente del maker; app + núcleo cripto + monero-ts contra stagenet). Lo que falta es un swap completo en Arbitrum Sepolia con Monero stagenet y los casos de falla en vivo.

## 1. Lo que ya está probado

| Prueba | Dónde | Resultado |
|---|---|---|
| Contrato con USDT simulado (3 comportamientos), fuzz e invariantes | `contracts/` | ✅ 117 pruebas |
| Contrato con **USDT real** en forks de Arbitrum One (USD₮0, incluido `permit`) y Ethereum | `contracts/test/Fork.t.sol` | ✅ |
| Núcleo cripto: swap completo, ataques a la DLEQ, vectores idénticos a monero-ts | `crypto-wasm/` | ✅ 14 pruebas + vectores |
| Secretos de Rust verificados por el contrato | `contracts/test/CrossVectors.t.sol` | ✅ 22 vectores |
| **Maker real contra contratos reales** (anvil): swap, reclamo tras t0, reembolso del taker y recuperación del XMR, depósitos inválidos, expiración, reinicio sin doble envío, corte antes de t1 | `maker/tests/test_integration.py` | ✅ 11 pruebas |
| Backend en miniflare: libro de órdenes firmado, canal, rechazo de llaves, MCP | `workers/` | ✅ 19 pruebas |
| **Backend real (`wrangler dev`) + cliente real del maker**: oferta firmada → swap → eventos en ambos sentidos | manual | ✅ |
| Worker proxy **desplegado** en Cloudflare hacia nodos stagenet | `research/worker-proxy` | ✅ |
| App: decisión del taker (barrido exhaustivo) y archivo de recuperación | `web/test/` | ✅ 13 pruebas |
| App en navegador bajo CSP: núcleo cripto + verificación del WASM + monero-ts → proxy → stagenet (`getHeight`, `check_tx_key`) | manual | ✅ |

## 2. Preparación para testnet (pasos del dueño)

1. **Cuenta de testnet EVM** (solo para pruebas): crea un keystore con `cast wallet import testnet-deployer --interactive`.
2. **ETH de Arbitrum Sepolia** desde un faucet (algunos piden iniciar sesión o resolver un captcha; hazlo tú).
3. **Wallet de Monero stagenet** (Feather o Monero GUI en modo stagenet) y XMR de stagenet de un faucet.
4. Desplegar: `contracts/` (fábrica + TestUSDT), `workers/` (con tu aprobación) y configurar `web/.env` y `maker/maker.toml`.
5. Correr `monero-wallet-rpc --stagenet` para el maker.

## 3. Casos a ejecutar

| # | Caso | Cómo provocarlo | Resultado esperado |
|---|---|---|---|
| E1 | Swap exitoso | Flujo normal | El taker recibe el XMR; el maker cobra USDT − comisión; `withdrawFee` envía la comisión |
| E2 | El taker cierra la pestaña antes de que se bloquee el XMR | Cerrar tras depositar; reabrir con el archivo | La app reanuda; si se acerca t0 sin XMR, pide reembolsar |
| E3 | El taker cierra la pestaña tras confirmar | Cerrar tras `setReady`; reabrir días después | La app barre el XMR con el secreto del evento `Claimed` |
| E4 | El maker se cae antes de bloquear | Detener el daemon tras el depósito | La app pide reembolsar antes de t0; el reembolso funciona |
| E5 | El maker se cae tras bloquear | Detener el daemon tras `xmr_locked` | El taker confirma; el maker cobra al volver (antes de t1) o el taker reembolsa desde t1 y el maker recupera el XMR |
| E6 | Plazos vencidos | Swap con t0 corto sin acciones | Exactamente una parte puede actuar en cada momento |
| E7 | Nodo de Monero caído | Apuntar a un nodo inexistente | La app reintenta y, si se acerca t0 sin verificar, pide reembolsar |
| E8 | Conexión perdida a mitad del swap | Cortar la red del navegador | Al volver, la app sigue desde el estado del contrato |
| E9 | El maker envía menos XMR | Modificar el daemon de prueba | La app nunca ofrece `setReady`; pide reembolsar |
| E10 | `tx_key` malformado | Modificar el daemon de prueba | La app lo rechaza sin romper monero-ts |

Registrar en cada caso: hashes de transacciones, tiempos, capturas y cualquier desviación.

## 4. Resultados en testnet

*(pendiente)*
