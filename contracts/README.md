# contracts — escrow de atomic swaps USDT ↔ XMR (Fase 1)

> **Desplegado en Arbitrum One** ([`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535), verificado en Sourcify) con `MAX_AMOUNT` = 100 USDT por swap. Verificado con Halmos (7/7), Aderyn y Slither ([informe](../docs/AUDITORIA-GRATUITA.md)); sin auditoría externa todavía. El script de despliegue solo acepta Arbitrum One con `I_ACCEPT_MAINNET=yes`, USD₮0, tope ≤ 100 USDT y comisión ≤ 0,5 %; las demás redes principales siguen bloqueadas.

**Qué es:** una fábrica (`SwapFactory`) que crea un escrow aislado (`SwapEscrow`, clon EIP-1167) por cada swap. El taker deposita USDT; el maker lo cobra revelando su secreto de Monero, o el taker lo recupera revelando el suyo. Sin administrador, sin pausa, sin actualizaciones.

## Contratos

| Archivo | Qué hace |
|---|---|
| `src/SwapFactory.sol` | Crea el clon, lo inicializa y mueve el USDT del taker al clon. `newSwapWithPermit` evita el `approve` aparte (EIP-2612). Parámetros inmutables: token, comisión, receptor, monto mínimo, límites de plazos. |
| `src/SwapEscrow.sol` | Un swap: `setReady`, `claim(secreto, destino)`, `refund(secreto, destino)`, `withdrawFee`. |
| `src/lib/Secp256k1.sol` | Verifica `Q = s·G` con `ecrecover` (truco de V. Buterin, usado por AthanorLabs). |
| `src/lib/SafeTokenTransfer.sol` | Transferencias verificadas por diferencia de saldo: tolera USDT estándar, el de Ethereum (sin retorno) y el de Tron (`false` aunque transfiere). Rechaza tokens con comisión por transferencia. |
| `src/testnet/TestUSDT.sol` | Token de prueba **sin valor** (6 decimales, permit, faucet de 10 000). Solo testnet. |

## Reglas de los plazos

| Momento | Taker (`owner`) | Maker (`claimer`) |
|---|---|---|
| Antes de `t0`, PENDING | `setReady` o `refund` | — |
| Antes de `t0`, READY | — | `claim` |
| Entre `t0` y `t1` | — | `claim` |
| Desde `t1` | `refund` | — |

En todo momento **exactamente una** parte puede cerrar el swap: nunca las dos (no hay carrera) ni ninguna (no hay bloqueo). Lo comprueba `testFuzz_ventanasNoSeSolapan`.

## Decisiones (⚠️ las marcadas como *provisional* esperan revisión del dueño)

| # | Decisión | Estado |
|---|---|---|
| C1 | Comisión con tope **constante** `MAX_FEE_BPS = 100` (1 %) y valor fijo por fábrica | Firme |
| C2 | Comisión **pull**: queda en el escrow y `withdrawFee()` (cualquiera puede llamarlo) la envía al receptor. Si Tether congela al receptor, los reclamos siguen funcionando | Firme |
| C3 | `claim` y `refund` aceptan una **dirección de destino**: si Tether congela la dirección del maker o del taker, puede cobrar en otra sin revelar su secreto en una transacción fallida | Firme |
| C4 | **Un solo token por fábrica**, fijado al desplegar (evita tokens maliciosos) | Firme |
| C5 | Monto mínimo y límites de plazos inmutables por fábrica. Valores de testnet: 1 USDT, plazos entre 10 min y 2 días | *Provisional* |
| C6 | **Riesgo 1** (el maker puede reclamar tras `t0` si el taker no aparece): se mantiene la semántica de AthanorLabs. Mitigación en la app (t0 corto, no dejar continuar sin la pestaña abierta, archivo de recuperación) | *Provisional*: falta tu decisión (A1). Una fianza del maker requeriría otro contrato y otra auditoría |
| C7 | Comisión de ejemplo 0,5 % (`FEE_BPS = 50`) | *Provisional*: la fijas tú en `config/xmrp2p.example.toml` |
| C8 | `claimer != owner` y `claimCommitment != refundCommitment` se validan en la fábrica | Firme |
| C9 | solc 0.8.30, EVM `shanghai`, OpenZeppelin v5.4.0 (submódulos fijados) | Firme |

## Pruebas

```bash
forge test                                   # 117 pruebas (unitarias ×3 modos de USDT, fuzz, invariantes, reentrada, permit, vectores de Rust)
FORK_TESTS=true forge test --match-contract Fork   # contra USDT real en forks de Arbitrum One y Ethereum
forge coverage --report summary --no-match-contract Fork
```

Resultados (24-oct-2026):

| Suite | Resultado |
|---|---|
| Unitarias + fuzz (35 × USDT estándar, de Ethereum y de Tron) | ✅ 105/105 |
| Invariantes (256 corridas × 64 llamadas): conservación de fondos, saldo por escrow, comisión ≤ tope, `t0 < t1` | ✅ |
| Reentrada con un token malicioso | ✅ no se cobra dos veces |
| Vectores cruzados: 8 secretos generados en Rust (`sigma_fun`) abren su commitment | ✅ |
| Permit (incluido permit adelantado desde el mempool) | ✅ |
| **Fork Arbitrum One con USD₮0 real**: swap, reembolso y `newSwapWithPermit` | ✅ `permit` funciona → pregunta A4 resuelta |
| **Fork Ethereum con USDT real** (sin retorno): swap y reembolso | ✅ |
| Cobertura de `src/` de producción | 100 % de líneas |

Gas (EVM, aproximado): `newSwap` ≈ 254 k · `setReady` ≈ 8 k · `claim` ≈ 83 k · `refund` ≈ 43 k · `withdrawFee` ≈ 49 k.

### Tron (TVM)

- ✅ Compila con el solc oficial de Tron `tv_0.8.30` (checksum verificado).
- ✅ Mainnet y Nile tienen activados ShangHai, Cancun, Osaka y Prague (`getchainparameters`, 24-oct-2026), así que el bytecode `shanghai` no usa opcodes prohibidos.
- ⏳ Falta un despliegue real en **Nile** para confirmar `ecrecover`, los clones (CREATE2 con prefijo `0x41`) y USDT-TRC20. Requiere una cuenta de Nile con TRX de prueba del faucet (lo debe pedir el dueño).

## Slither 0.11.6 (17 avisos, triage)

| Detector | Dónde | Veredicto |
|---|---|---|
| `missing-zero-check` | `initialize` (owner, claimer) | Falso positivo: la fábrica valida `claimer != 0` y `owner = msg.sender` |
| `reentrancy-events` | `newSwap` emite tras `initialize` | Benigno: el clon es código propio recién creado |
| `timestamp` | comparaciones con `t0`/`t1` | Inherente al diseño; los plazos son de minutos u horas, no de segundos |
| `naming-convention` | inmutables en MAYÚSCULAS, parámetros con `_` | Estilo; intencional |

## Desplegar en testnet

1. Crear un keystore de Foundry (la llave **nunca** va al repo): `cast wallet import testnet-deployer --interactive`.
2. Conseguir ETH de Arbitrum Sepolia en un faucet (paso manual del dueño).
3. Desplegar:

```bash
export FEE_RECIPIENT=0x...      # tu dirección de comisión de testnet
forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --account testnet-deployer --broadcast
```

Sin `TOKEN`, el script despliega `TestUSDT`. Probado el 24-oct-2026 contra un fork local de Arbitrum Sepolia: ✅. También se probó que en Arbitrum One revierte con `MainnetNotAllowed(42161)`.

4. Anotar las direcciones en `config/xmrp2p.toml` (`redes.arbitrum_sepolia.token_usdt` y `fabrica_swaps`).
