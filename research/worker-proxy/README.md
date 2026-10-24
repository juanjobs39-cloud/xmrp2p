# research/worker-proxy — proxy de Cloudflare Worker hacia nodos de Monero

**Preguntas:** ¿puede un navegador hablar directamente con nodos públicos de Monero? Si no, ¿sirve un Worker como proxy y qué restricciones de puertos tiene?

## Resultados (23-oct-2026)

### Nodos públicos de stagenet (sondeo con curl)

| Nodo | Responde | HTTPS | Cabeceras CORS |
|---|---|---|---|
| `stagenet.xmr-tw.org:38081` | ✅ altura 2 235 771 | ❌ | ❌ |
| `node.monerodevs.org:38089` | ✅ | ❌ | ❌ |
| `node2.monerodevs.org:38089` | ✅ | ❌ | ❌ |
| `xmr-lux.boldsuck.org:38081` | ✅ | ❌ | ❌ |
| `stagenet.community.rino.io:38081`, `stagenet.xmr.ditatompel.com`, `node.sethforprivacy.com:38089` | ❌ sin respuesta | — | — |

**Conclusión:** una página HTTPS no puede usar estos nodos directamente por dos razones: **contenido mixto** (HTTP desde HTTPS) y **CORS** (el preflight `OPTIONS` responde 200 sin `Access-Control-Allow-Origin`). En el navegador la llamada directa falla con `Network Error` (ver `research/monero-ts-browser`).

Si el usuario quiere usar **su propio nodo**, debe exponerlo con TLS y arrancar `monerod` con `--rpc-access-control-origins=https://<DOMINIO>` (y `--restricted-rpc`).

### Worker en local (`wrangler dev`, wrangler 4.152.0)

| Método | Puertos 38081 / 38089 | Latencia `get_info` |
|---|---|---|
| `fetch()` | ✅ 4/4 nodos | 110–200 ms |
| `connect()` (TCP, HTTP/1.1 a mano) | ✅ 4/4 nodos | 200–410 ms |

### Worker desplegado en producción (24-oct-2026, `xmrp2p.workers.dev`)

| Método | Puertos 38081 / 38089 | Latencia `get_info` |
|---|---|---|
| `fetch()` | ✅ 4/4 nodos (altura 2 235 831) | 87–427 ms |
| `connect()` (TCP) | ✅ 4/4 nodos | 169–545 ms |

También se verificó en producción:
- Preflight `OPTIONS` → `204` con `Access-Control-Allow-Origin` ✅
- `json_rpc` con método permitido (`get_block_count`) ✅; con método no permitido (`relay_tx`) → `403` ✅
- Nodo fuera de la lista → `400` ✅

**Conclusión:** en producción `fetch()` sí llega a puertos no estándar, así que el proxy de la Fase 4 puede usar `fetch()`; `connect()` queda como plan B. El Worker de prueba se borró al terminar (`wrangler delete`).

Notas operativas:
- En esta PC la variable de entorno `NODE_USE_SYSTEM_CA=1` hace que wrangler falle con `fetch failed`. Correr con `env -u NODE_USE_SYSTEM_CA npx wrangler ...`.
- La cuenta usa el subdominio `xmrp2p.workers.dev` de forma provisional; en producción irá en el dominio propio.

```bash
npx wrangler deploy
curl https://xmrp2p-research-proxy.xmrp2p.workers.dev/probe
npx wrangler delete
```

### Hallazgo: libwallet ignora la ruta de la URL

La wallet completa de monero-ts (C++ de Monero compilado a WASM) **descarta la ruta** del URI del nodo: con `http://proxy/fetch/xmr-tw` llama a `http://proxy/json_rpc`. Por eso el proxy debe exponer cada nodo **en la raíz de su propio host** (en producción: un subdominio o una ruta de Worker por nodo, p. ej. `xmr-tw.nodos.<DOMINIO>`).

## Diseño de seguridad del proxy (para la Fase 4)

- **Lista cerrada de nodos** (no es un proxy abierto).
- **Lista cerrada de rutas y métodos RPC** de solo lectura + `send_raw_transaction`.
- Límite de tamaño de cuerpo (512 KB en la prueba) y límite de peticiones por IP.
- El proxy ve qué bloques y transacciones consulta cada IP: es un **riesgo de privacidad** que se debe explicar al usuario, y la app debe permitir elegir su propio nodo.
- Consumo: la sincronización de una wallet nueva hace cientos de peticiones (ver `research/monero-ts-browser`); con el plan gratuito de Workers (100 000 peticiones/día) eso limita cuántos swaps por día puede atender el proxy.
