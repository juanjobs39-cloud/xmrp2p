# Alcance para la auditoría externa (borrador)

> Última actualización: 24 de octubre de 2026. Este documento se completa al terminar la Fase 2. Se envía a la firma auditora junto con el commit exacto a auditar.

**Resumen:** xmrp2p hace atomic swaps USDT ↔ XMR sin custodia. Se audita (1) el contrato de escrow y (2) el núcleo criptográfico que corre en el navegador. Un fallo en cualquiera de los dos puede hacer perder fondos de usuarios.

## 1. Componentes en alcance

| Componente | Ruta | Líneas aprox. | Lenguaje | Estado |
|---|---|---|---|---|
| Fábrica y escrow | `contracts/src/SwapFactory.sol`, `contracts/src/SwapEscrow.sol` | ~300 | Solidity 0.8.30 | Fase 1 lista |
| Librerías | `contracts/src/lib/Secp256k1.sol`, `contracts/src/lib/SafeTokenTransfer.sol` | ~60 | Solidity | Fase 1 lista |
| Núcleo cripto | `crypto-wasm/` (llaves, DLEQ, reconstrucción y barrido de Monero) | por definir | Rust → WASM | Fase 2 |
| Dependencia crítica | `sigma_fun` 0.9 `ext::dl_secp256k1_ed25519_eq` | — | Rust | **No auditada formalmente**; pedir revisión |

Fuera de alcance: `research/`, `src/testnet/TestUSDT.sol`, el sitio público.

## 2. Redes objetivo

- Arbitrum One (USD₮0 `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`)
- Tron (USDT-TRC20), compilado con el solc de Tron. Atención: `transfer` devuelve `false`.

## 3. Propiedades que el auditor debe confirmar

1. Solo el maker puede reclamar, y solo con el secreto que abre `claimCommitment`.
2. Solo el taker puede reembolsar, y solo con el secreto que abre `refundCommitment`.
3. En todo momento exactamente una parte puede cerrar el swap (ventanas disjuntas y sin huecos).
4. Nadie puede sacar del escrow más que `amount`; la comisión nunca supera `MAX_FEE_BPS`.
5. Una congelación del emisor sobre un escrow, el maker, el taker o el receptor de la comisión no afecta a otros swaps ni bloquea el reclamo del maker.
6. Los clones no se pueden reinicializar y la implementación no se puede usar como escrow.
7. `mulVerify` (truco de `ecrecover`) es correcto para escalares en `[1, n)`; comparar 160 bits es aceptable.
8. La prueba DLEQ garantiza que el mismo escalar de 252 bits está detrás de la llave ed25519 (Monero) y de la secp256k1 (contrato).
9. Las llaves privadas nunca salen del navegador del taker ni del daemon del maker.

## 4. Riesgos conocidos que no son bugs (del protocolo)

- Si el taker no aparece antes de `t0`, el maker puede reclamar aunque no haya bloqueado XMR (ver `docs/ARQUITECTURA.md`, riesgo 1).
- Calldata de una transacción fallida es pública: el maker debe simular `claim` antes de enviarlo.

## 5. Material para el auditor

- `docs/ARQUITECTURA.md` (protocolo, máquina de estados, decisiones, riesgos)
- `contracts/README.md` (decisiones C1–C9, pruebas, triage de Slither)
- Pruebas: `forge test`, `FORK_TESTS=true forge test --match-contract Fork`
- Referencia: protocolo de AthanorLabs (`docs/protocol.md`, paper `eth-xmr-atomic-swaps.pdf`)
