# research/contract-compat — escrow por swap y comportamiento de USDT

**Preguntas:** ¿funciona un escrow aislado por swap (clones EIP-1167) con los comportamientos no estándar de USDT? ¿Verifica el contrato el secreto que genera `crypto-wasm`? ¿Es portable a Tron (TVM)?

> Prototipo de investigación. **No auditado, no desplegar con fondos reales.** El contrato de producción se escribe desde cero en la Fase 1 en `contracts/`.

## Resultados (23-oct-2026, Foundry 1.8.6, solc 0.8.30, EVM shanghai, OpenZeppelin v5.4.0)

`forge test`: **40/40 OK** (13 pruebas × 3 modos de USDT + 1 vector cruzado; fuzzing con 1000 corridas).

| Caso | Estándar | USDT Ethereum (sin retorno) | USDT Tron (`transfer` devuelve `false`) |
|---|---|---|---|
| Swap exitoso con READY + comisión | ✅ | ✅ | ✅ |
| Reembolso antes de t0 | ✅ | ✅ | ✅ |
| Reclamo automático tras t0 sin READY | ✅ | ✅ | ✅ |
| Sin reembolso entre t0 y t1 / tras READY | ✅ | ✅ | ✅ |
| Reembolso tras t1, reclamo tardío rechazado | ✅ | ✅ | ✅ |
| Secreto inválido, llamador equivocado, doble reclamo | ✅ | ✅ | ✅ |
| Lista negra de un escrow no afecta a otro | ✅ | ✅ | ✅ |
| Fuzz: comisión ≤ tope y no se pierde ningún centavo | ✅ | ✅ | ✅ |

**Vector cruzado:** un secreto y su commitment generados en Rust (`research/dleq-wasm`, sigma_fun + keccak) pasan `mulVerify` en Solidity. El formato es compatible de punta a punta.

## Decisiones que salen de aquí

1. **Transferencias por diferencia de saldo** (`SafeTokenTransfer`), no `SafeERC20`. `SafeERC20` revierte en Tron porque USDT-TRC20 devuelve `false` en `transfer` aunque transfiera (lo confirma la auditoría de OpenZeppelin de *Across Tron SpokePoolPeriphery*, agosto 2026).
2. **OpenZeppelin fijado a v5.4.0** y EVM `shanghai`. La rama principal de OZ ya usa `clz` (Osaka), que TVM no soporta.
3. **El tope de comisión es una constante** (`MAX_FEE_BPS = 100`) del escrow; la fábrica no puede superarlo.
4. **La implementación base no se puede inicializar** (constructor la deja en COMPLETED).

## Problemas detectados para la Fase 1

- **La lista negra del receptor de comisión bloquea todos los reclamos**: si Tether congela `feeRecipient`, `claim` revierte siempre, el maker no cobra y en t1 el taker reembolsa. Solución: la comisión se acumula en el escrow y se retira aparte (patrón *pull*).
- **Token arbitrario**: la fábrica acepta cualquier token. En producción debe ser una lista fija e inmutable por despliegue (USDT de esa red) para evitar tokens maliciosos con reentrada.
- **El commitment usa 160 bits** (como AthanorLabs): `ecrecover` devuelve una dirección y solo se comparan 20 bytes. Es el mismo nivel de seguridad que una dirección de Ethereum, pero hay que documentarlo para la auditoría.
- **Reclamo automático tras t0** (heredado del protocolo): si el taker no aparece antes de t0 y el maker no bloqueó XMR, el maker puede quedarse con el USDT. Ver riesgo principal en `docs/ARQUITECTURA.md`.

## Slither 0.11.6

8 resultados, ninguno crítico para el prototipo:
- `reentrancy` en `SafeTokenTransfer` (lectura de saldo tras llamada externa): el estado ya se marcó COMPLETED antes y el token debe ser de lista fija → se resuelve con la lista de tokens.
- `missing-zero-check` en `feeRecipient`: agregar validación.
- `timestamp`: es inherente al diseño de plazos; los plazos son de horas, no de segundos.
- `low-level-calls`: intencional (necesario para tolerar los tres comportamientos de USDT).

## Tron (TVM): revisión documental

| Punto | Estado |
|---|---|
| Compilador | Tron publica su propio solc (`tronprotocol/solidity`, hay 0.8.30 y 0.8.31). Hay que recompilar con él. |
| CREATE2 | Prefijo `0x41` en lugar de `0xff`: las direcciones predichas de los clones difieren. Calcularlas con la fórmula de Tron. |
| CREATE | Derivado del ID de la transacción, no del nonce. |
| Opcodes nuevos | Detrás de parámetros de red (PUSH0 requiere ShangHai; MCOPY/TSTORE requieren Cancun). Compilar para una EVM antigua o confirmar con `getchainparameters`. |
| `ecrecover` (0x01) | La documentación no indica diferencias, pero **no está confirmado empíricamente**. Se prueba desplegando en Nile en la Fase 1. |
| USDT | `transfer` devuelve `false`; `transferFrom` y `approve` son estándar. Cubierto por `SafeTokenTransfer`. |
| Costos | Se paga energía (TRX). Precio variable por gobernanza: consultar al usar. |

Conclusión: **compatible en principio**, con compilación propia y una prueba real en Nile pendiente. Recomendación: Arbitrum primero, Tron después.

## Cómo reproducir

```bash
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-git
forge test
python -m slither . --filter-paths "lib|test"
```
