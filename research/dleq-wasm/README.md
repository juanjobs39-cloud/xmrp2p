# research/dleq-wasm — DLEQ secp256k1/ed25519 en WebAssembly

**Pregunta:** ¿podemos usar una DLEQ entre curvas ya existente (sin escribir cripto propia), compilarla a WASM y correrla en el navegador?

**Respuesta: sí.** Con `sigma_fun 0.9` (`ext::dl_secp256k1_ed25519_eq`), la misma construcción que usa eigenwallet (antes COMIT xmr-btc-swap) en producción, con los mismos puntos H (NUMS de BIP-341 y H de Monero).

## Resultados (23-oct-2026, Windows 10, Rust 1.99.1, wasm-pack 0.15.0)

| Medida | Valor |
|---|---|
| Pruebas nativas (`cargo test --release`) | 3/3 OK (válida verifica, llave ajena falla, vector para el contrato) |
| `.wasm` optimizado (`opt-level=z`, LTO, wasm-opt) | 265 763 bytes (148 KB con gzip -9) |
| JS de enlace | 11,8 KB |
| Tamaño de la prueba serializada en JSON | ~170 KB |
| Navegador (panel de Claude, Chromium): init / prove / verify | 104 ms / 353 ms / 320 ms |
| Verificación con llave ajena | `false` (correcto) |

## Observaciones

- **Auditoría:** ninguna DLEQ entre curvas disponible está auditada formalmente. `sigma_fun` se declara experimental, pero lleva años en producción en eigenwallet. La DLEQ entre grupos de Serai está bajo la feature `experimental` y fuera de su auditoría de Cypher Stack (marzo 2023). `go-dleq` (AthanorLabs) no tiene auditoría conocida y está sin cambios desde marzo de 2023. → Debe entrar en el alcance de la auditoría externa.
- **Tamaño de la prueba:** 170 KB en JSON. Cabe en un mensaje WebSocket de Durable Objects, pero en Fase 2 conviene una serialización binaria compacta.
- **Escalar de 252 bits:** el secreto debe ser < 2^252 para valer en ambas curvas. Monero usa little-endian y Solidity big-endian; la función devuelve ambos.
- El vector que imprime `vector_para_contrato` se verifica en `research/contract-compat` con el truco de `ecrecover`.

## Cómo reproducir

```bash
cargo test --release -- --nocapture
wasm-pack build --release --target web --out-dir pkg
python -m http.server 8765 --directory ..   # abrir http://localhost:8765/dleq-wasm/
```
