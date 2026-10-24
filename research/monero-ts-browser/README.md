# research/monero-ts-browser — wallet de Monero en el navegador

**Pregunta:** ¿funciona `monero-ts` en el navegador contra nodos públicos de stagenet, y qué pasa con CORS?

## Resultados (23-oct-2026, monero-ts 0.11.20, Chromium del panel de Claude)

| Paso | Resultado | Tiempo |
|---|---|---|
| Conexión **directa** a `stagenet.xmr-tw.org:38081` | ❌ `Network Error` (CORS) | 2,3 s |
| Conexión vía proxy Worker (`/fetch/xmr-tw`) → `getHeight` | ✅ 2 235 772 | 0,5 s |
| Generar llaves stagenet en WASM (`createWalletKeys`) | ✅ | 0,13–2,5 s (primera carga del WASM) |
| Wallet **de solo vista** nueva con `restoreHeight = altura − 200`, `sync()` | ✅ sincroniza hasta 2 235 773 | **226 s** |

La sincronización hizo **169 peticiones `gethashes.bin`** + 2 `getblocks.bin` + 4 `json_rpc`. Aunque se le da una altura de restauración, libwallet descarga la cadena completa de hashes de bloques desde el génesis antes de escanear.

## Tamaños

| Archivo | Bytes | gzip -9 |
|---|---|---|
| `monero.js` de monero-ts (WASM incrustado en base64) | 2,6 MB | 1,77 MB |
| `monero.worker.js` | 3,67 MB | 2,10 MB |
| Bundle de esta prueba (monero-ts + polyfills) | 4,27 MB | 2,05 MB |

Todo cabe en el límite de 25 MiB por archivo de Cloudflare Pages, pero es pesado para un celular con datos móviles.

## Problemas de integración encontrados

1. **monero-ts está pensado para webpack.** Con esbuild hubo que: poner un polyfill de `assert`, `process` y `Buffer`; dejar vacíos los módulos de Node (`fs`, `path`, …) y crear un stub de `http.Agent` (monero-ts siempre crea uno).
2. **La wallet completa ignora la ruta del URI del nodo** → el proxy debe servir cada nodo en la raíz de un host.
3. **226 s de sincronización** para una wallet nueva es demasiado para el flujo del taker, que debe verificar el bloqueo de XMR antes de t0.

## Conclusiones para el diseño

- monero-ts **funciona** en el navegador para lo que necesita el taker (llaves, wallet de solo vista, sincronizar, ver saldo) siempre que haya un proxy con CORS.
- Para la verificación del bloqueo de XMR conviene evaluar en la Fase 2 un **escáner propio en Rust/WASM con `monero-oxide`** (el que usa eigenwallet). Pediría solo los bloques desde la altura de restauración (`getblocks_by_height.bin`) y sería mucho más liviano. Alternativa intermedia: que el maker envíe el ID de la transacción de bloqueo y el taker la verifique con `get_transactions` + su llave de vista (segundos, no minutos).
- Ninguna de estas librerías cambia el modelo de confianza: el escaneo y las llaves se quedan en el navegador.

## Cómo reproducir

```bash
npm install
npx esbuild app.js --bundle --format=esm --platform=browser --outfile=bundle.js \
  --define:global=globalThis --inject:./shims.js \
  --alias:http=./httpstub.js --alias:https=./httpstub.js \
  --alias:fs=./empty.js --alias:path=./empty.js --alias:crypto=./empty.js  # (y demás módulos de Node)
cp node_modules/monero-ts/dist/monero.worker.js .
# en otra terminal: (cd ../worker-proxy && npx wrangler dev --port 8787)
python -m http.server 8765 --directory ..   # abrir http://localhost:8765/monero-ts-browser/
```
