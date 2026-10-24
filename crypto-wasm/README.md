# crypto-wasm — núcleo criptográfico de xmrp2p (Fase 2)

> ⚠️ **Sin auditoría.** Entra en el alcance de `docs/AUDITORIA.md`.

**Qué hace:** genera la mitad de llave de Monero de cada parte, prueba (DLEQ) que esa misma llave es la que se compromete en el contrato, verifica a la contraparte, calcula la dirección compartida donde se bloquea el XMR y reconstruye la llave completa cuando la otra parte revela su secreto en el contrato. Corre en el navegador (WASM) y en el daemon del maker (Rust nativo).

**Las llaves privadas no salen del crate**, salvo cuando la app las pide para el archivo de recuperación o para barrer el XMR con monero-ts.

## Sin criptografía propia

| Necesidad | Librería |
|---|---|
| DLEQ secp256k1/ed25519 | `sigma_fun 0.9.0` (`ext::dl_secp256k1_ed25519_eq`), con los puntos H de eigenwallet |
| Escalares, puntos y `Hs` de Monero | `monero-ed25519 0.1.0` (monero-oxide) y `curve25519-dalek` |
| Direcciones de Monero | `monero-address 0.1.0` (monero-oxide) |
| Commitment del contrato | `sha3` (Keccak-256) |

Las versiones están fijadas con `=` para que un cambio de dependencia sea una decisión explícita.

## Esquema de llaves

- Cada parte elige `s` aleatorio de **252 bits** (válido en ed25519 y en secp256k1) y deriva `v = Hs(s)`, como una wallet estándar de Monero.
- Mensaje a la contraparte: `S = s·G` (ed25519), `Q = s·G` (secp256k1), `keccak(Q)` para el contrato, `v` (llave de vista privada) y la DLEQ.
- Dirección compartida: gasto `S_taker + S_maker`, vista `v_taker + v_maker`.
- Llave completa tras la revelación: `s_taker + s_maker` (el secreto del contrato es `s` en big-endian).

## API (JavaScript)

```js
import init, { generateKeys, restoreKeys, verifyCounterparty, sharedAddress, recoverWallet } from "./pkg/xmrp2p_crypto.js";
await init();
const mine = JSON.parse(generateKeys());          // { spend_private, contract_secret, message }
// enviar JSON.stringify(mine.message) a la contraparte; guardar mine.spend_private en el archivo de recuperación
verifyCounterparty(theirMessageJson);             // lanza error si la DLEQ o el commitment no cuadran
JSON.parse(sharedAddress(mine.spend_private, theirMessageJson, "stagenet"));   // { address, private_view_key }
JSON.parse(recoverWallet(mine.spend_private, theirMessageJson, revealedSecretFromContract, "stagenet"));
// → { address, private_view_key, private_spend_key }  para barrer el XMR con monero-ts
```

## Pruebas y resultados (24-oct-2026)

| Prueba | Resultado |
|---|---|
| `cargo test --release`: 14 pruebas (swap completo en ambos sentidos, DLEQ ajena, llave secp256k1 cambiada, commitment falso, prueba corrupta o de versión desconocida, punto de orden pequeño, vista no canónica, secreto revelado falso, restauración, escalares de más de 252 bits) | ✅ 14/14 |
| **Vectores cruzados con monero-ts** (`tests/cross`): 6 llaves estándar (dirección mainnet y stagenet, vista, gasto público) y 4 wallets compartidas reconstruidas, más control negativo | ✅ idénticos a monero-ts (wallet2 oficial de Monero) |
| **Vectores cruzados con el contrato** (`contracts/test/vectors/crypto-wasm.json`): 14 secretos abren su commitment con `mulVerify` | ✅ |
| Navegador (`www/test.html`, Chromium): init / generar / verificar / reconstruir | 269 / ~320 / 298 / 291 ms ✅ |
| WASM optimizado | 287 KB (162 KB gzip) |
| Prueba DLEQ binaria (`postcard`, versionada) | 56,6 KB (frente a 170 KB en JSON en la Fase 0) |

**No hay interoperabilidad con AthanorLabs a nivel de prueba DLEQ**: ellos usan `go-dleq` (otro formato). xmrp2p es un protocolo propio inspirado en el suyo; los vectores cruzados se hicieron contra monero-ts (direcciones y llaves de Monero) y contra el contrato (commitments secp256k1).

## Cómo reproducir

```bash
cargo test --release
cargo run --release --example vectors > tests/vectors/vectors.json
(cd tests/cross && npm install && npm test)               # compara con monero-ts
wasm-pack build --release --target web --out-dir pkg
python -m http.server 8766 --directory .                   # abrir http://localhost:8766/www/test.html
```

En Windows con el toolchain GNU, las pruebas no deben depender de `getrandom 0.3` (requiere `dlltool`); por eso no se usa `proptest`.
