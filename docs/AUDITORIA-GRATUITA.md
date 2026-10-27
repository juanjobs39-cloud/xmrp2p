# Revisión del contrato con herramientas gratuitas (27 de octubre de 2026)

> **No reemplaza una auditoría externa.** Es la revisión hecha para la beta con dinero real (tope de 100 USDT por swap, `docs/MAINNET.md`). Las herramientas automáticas no encuentran errores de diseño ni de lógica de negocio que no se les pida comprobar.

**Contrato revisado:** `contracts/src/` (SwapFactory, SwapEscrow, Secp256k1, SafeTokenTransfer). Es el mismo bytecode desplegado en Arbitrum One (`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`, verificado en Sourcify). El formato aplicado después (`forge fmt`) no cambia el bytecode (`bytecode_hash = "none"`, sin metadatos CBOR).

**Cómo repetirlo:** flujo «Auditoría (herramientas gratuitas)» en GitHub Actions (`.github/workflows/auditoria.yml`). Corre en Linux y guarda los reportes como artefactos.

## Resultado

| Herramienta | Qué hace | Resultado |
|---|---|---|
| **Halmos** (a16z), verificación simbólica | Prueba propiedades para **todas** las entradas posibles, no para una muestra | ✅ **7/7 propiedades probadas** |
| **Aderyn** v0.6.8 (Cyfrin), análisis estático | Busca patrones de riesgo conocidos | ✅ **0 altos**; 6 bajos, todos revisados (abajo) |
| **Slither** 0.11.6 (Trail of Bits), análisis estático | Ídem, otro motor | ✅ Sin medios ni altos; 6 bajos + 12 informativos, ya revisados en `contracts/README.md` |
| **Foundry**: pruebas, fuzz e invariantes | 122 pruebas; corrida larga con 20 000 casos por fuzz y 100 000 llamadas en invariantes | ✅ |
| **Fork contra USD₮0 real** | Swap completo y `permit` con el USDT real de Arbitrum One | ✅ |
| **Swap real en producción** (26-oct) | 10 USDT ↔ XMR con fondos del dueño | ✅ Comisión de 0,05 USDT retenida en el escrow |

## Propiedades probadas con Halmos (`contracts/test/halmos/EscrowProps.t.sol`)

| # | Propiedad | Para todo… |
|---|---|---|
| 0 | Cordura: con el secreto correcto el maker **sí** cobra (las demás no son vacías) | — |
| 1 | Ningún escrow puede recibir más de 100 USDT | monto |
| 2 | Solo el maker puede cobrar | quien llama, secreto, destino, momento, confirmado o no |
| 3 | Solo el taker puede reembolsar | quien llama, secreto, destino, momento |
| 4 | En cada momento **exactamente una** parte puede cerrar el swap: nunca las dos, nunca ninguna | momento, confirmado o no |
| 5 | Al cobrar, maker + comisión = monto; la comisión es 0,5 % y `withdrawFee` la entrega completa al receptor | monto entre 1 y 100 USDT |
| 6 | Tras cobrar, nadie puede volver a cobrar ni reembolsar | momento, secreto |

**Limitación conocida:** Halmos trata `ecrecover` como función desconocida. Para seguir las rutas de cobro y reembolso se fija su valor solo en los dos secretos de prueba (el mismo que da la EVM real, comprobado en `test/CrossVectors.t.sol`). Para cualquier otro secreto sigue siendo desconocido, que es el caso más difícil. La corrección criptográfica de la verificación del secreto la cubren las 22 pruebas de vectores cruzados con el núcleo en Rust.

## Hallazgos de Aderyn (todos bajos) y por qué no son un problema

| # | Hallazgo | Veredicto |
|---|---|---|
| L-1 | `ecrecover` maleable (`Secp256k1.sol:18`) | **No aplica.** No verifica firmas: se usa como multiplicación escalar con `v` y `r` fijos y `s'` calculado por el propio contrato a partir del secreto. Para pasar la verificación hay que conocer el escalar cuyo punto coincide con el commitment (logaritmo discreto). `(n − s)·G` da otra `y` y, por lo tanto, otra dirección |
| L-2 | Literal numérico grande (`10_000`) | Estilo |
| L-3 | `initialize` sin evento | Benigno: la fábrica emite `SwapCreated` en la misma transacción |
| L-4 | Direcciones sin chequeo de cero en `initialize` | Falso positivo: solo la fábrica llama `initialize` y valida `claimer != 0`; `owner = msg.sender` |
| L-5 | «Comentarios TODO» | Falso positivo: detecta la palabra en español «**Todos** los parámetros…» |
| L-6 | Operación ERC20 «insegura» | Intencional: `SafeTokenTransfer` es más estricto que SafeERC20 (acepta USDT sin retorno o con `false` de Tron, y exige que el saldo cambie exactamente el monto) |

## Lo que estas herramientas NO cubren

- El protocolo completo con Monero (la DLEQ, el barrido del XMR): lo cubren las pruebas del núcleo en Rust y las pruebas de punta a punta en testnet.
- Riesgos económicos o de diseño no expresados como propiedad.
- Errores del compilador, de la red Arbitrum o del emisor de USDT (congelaciones).

**Siguiente paso recomendado:** auditoría externa cuando haya fondos, o un concurso de auditoría. Hasta entonces se mantiene el tope de 100 USDT.
