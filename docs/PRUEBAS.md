# Pruebas de extremo a extremo (Fase 7)

> Última actualización: 26 de octubre de 2026. Estado: **10 de 10 casos superados en testnet** (Arbitrum Sepolia + Monero stagenet). Falta la prueba manual con MetaMask.

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

## 4. Resultados en testnet (25–26 de octubre de 2026)

Entorno: contrato en Arbitrum Sepolia (`docs/DESPLIEGUES.md`), backend en `api.monerop2p.app` y `nodo.monerop2p.app`, maker real (`maker/`) con `monero-wallet-rpc` v0.18.5.4 en stagenet, y el taker automatizado `e2e/run.ts`, que usa la misma lógica de decisión que la app. Montos de 5 a 14 tUSDT (el XMR estaba en ~600 USD).

| Caso | Qué prueba | Esperado | Resultado | Evidencia |
|---|---|---|---|---|
| E1 | Swap exitoso | XMR al taker | ✅ | barrido `a4bcb45e…` |
| E2 | Cierra la pestaña antes del bloqueo | XMR al taker | ✅ reanudado con el archivo | barrido `9d20131b…` |
| E3 | Cierra la pestaña tras confirmar | XMR al taker | ✅ reanudado con el archivo | barrido `e222e192…` |
| E4 | Maker cae antes de bloquear | reembolso | ✅ reembolso antes de t0 | [`0x4d86c3…`](https://sepolia.arbiscan.io/tx/0x4d86c38b5cad8285d878f08ba0177ae36ddbcd17a94d1aff839b522e64121c68) |
| E5 | Maker cobra tarde (t0 + 5 min) | XMR al taker | ✅ | — |
| E6 | El taker no confirma; el maker cobra tras t0 | XMR al taker | ✅ | — |
| E7 | Nodo de Monero caído | reembolso | ✅ y el maker recuperó su XMR | [`0x250b2d…`](https://sepolia.arbiscan.io/tx/0x250b2d1c5258da9d1e271c9dd605b3b91a54c4d37cb5723f054f501008ca94fe) |
| E8 | Conexión perdida con el backend (10 min) | XMR al taker | ✅ | barrido `5380b406…` |
| E9 | El maker envía la mitad del XMR | reembolso | ✅ nunca confirmó; el maker recuperó su XMR | [`0x17e5d8…`](https://sepolia.arbiscan.io/tx/0x17e5d89d8c3dac1440143cf188872159afb9de76f25514128b970ca1585d1a68) |
| E10 | `tx_key` malformado | reembolso | ✅ datos rechazados sin romper monero-ts | [`0xec27c4…`](https://sepolia.arbiscan.io/tx/0xec27c4e694ce6f90b0ac6d8d6ceae111229d9bc9b92ba3afbf8ac40d3f050da7) |

Los registros completos de cada caso están en `e2e/results/`.

### Tiempos medidos

| Tramo | Tiempo |
|---|---|
| Depósito en Arbitrum Sepolia | segundos |
| El maker bloquea el XMR tras ver el depósito | ~20–40 s |
| Verificación del XMR con `check_tx_key` | ~5 s por intento |
| Depósito → XMR verificado con 10 confirmaciones → `setReady` | **17–19 min** |
| Swap completo (hasta el barrido del XMR) | **~30–45 min** |

### Problemas encontrados y corregidos

| # | Problema | Dónde | Corrección |
|---|---|---|---|
| 1 | El archivo de recuperación fallaba con datos reales (>100 KB: la prueba DLEQ del maker) | app | base64 por bloques + prueba de regresión |
| 2 | El proxy bloqueaba los nombres antiguos de rutas que usa wallet2 (`/gettransactions`, `/sendrawtransaction`…) | proxy | lista ampliada; sin esto la app no podía verificar ni recibir el XMR |
| 3 | El proxy bloqueaba nombres antiguos de métodos JSON (`getblockheadersrange`…) | proxy | lista ampliada; el proxy registra los métodos rechazados |
| 4 | El maker contaba dos veces el XMR ya enviado (rechazaba swaps y retiraba su oferta con saldo suficiente) | maker | `pending_send_atomic` + prueba de regresión |
| 5 | La recuperación del XMR fallaba en el segundo intento (*Wallet already exists*) | maker | reabre la wallet de recuperación existente |
| 6 | `monero-wallet-rpc` tiene una sola wallet abierta: un barrido podía cruzarse con otras operaciones | maker | acceso serializado y reapertura de la wallet principal al arrancar |
| 7 | Un barrido enviado que fallaba después se reintentaba para siempre | app y taker de prueba | se detecta la dirección vacía con salida y se da por hecho |
| 8 | El taker de prueba guardaba el archivo solo en memoria y no reintentaba ante cortes de red | e2e | estado cifrado en disco, reintentos y `--resume` |

### Lecciones

- **El archivo de recuperación salvó los casos E1, E2, E3, E5 y E6.** En la primera corrida, sin archivo en disco, un corte de internet dejó XMR de prueba atrapado en direcciones compartidas (~0,07 XMR de stagenet). La app real ya obligaba a descargarlo; ahora el taker de prueba también lo hace.
- **El riesgo principal (taker ausente antes de t0) se comportó como estaba diseñado:** en todos los casos sin XMR verificado (E4, E7, E9, E10) se reembolsó antes de t0.
- **Monero condiciona la experiencia:** ~20 min de confirmaciones y ~20 min de bloqueo del cambio del maker tras cada envío, lo que limita cuántos swaps simultáneos puede atender un maker con pocas salidas.

### Pendiente

- Prueba manual con MetaMask en https://monerop2p.app/es/app/ (guía en `docs/PRUEBA-MANUAL.md`).
