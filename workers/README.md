# workers — backend de xmrp2p en Cloudflare (Fase 4)

> ⚠️ **Probado solo en local (miniflare / `wrangler dev`). No está desplegado.** Desplegarlo crea recursos públicos en tu cuenta de Cloudflare; hazlo solo cuando lo apruebes (pasos al final).

**Qué hay aquí:** dos Workers.

| Worker | Archivo | Qué hace |
|---|---|---|
| `xmrp2p-api` | `src/api/index.ts` | Libro de órdenes (D1), cotizaciones, canal de mensajes del swap (Durable Objects), OpenAPI y servidor MCP de solo lectura |
| `xmrp2p-node-proxy` | `src/node-proxy/index.ts` | Proxy opcional hacia nodos de Monero con CORS y listas cerradas |

Nadie custodia fondos ni llaves: el backend solo guarda ofertas públicas y reenvía mensajes públicos del protocolo.

## Rutas de `xmrp2p-api`

| Ruta | Quién | Qué |
|---|---|---|
| `GET /v1/health`, `GET /v1/networks` | cualquiera | estado y redes activas |
| `GET /v1/offers?network=` | cualquiera | ofertas vigentes, de menor a mayor precio |
| `PUT /v1/offers`, `DELETE /v1/offers` | maker (firmado) | publicar/renovar o retirar su oferta (una por red) |
| `GET /v1/quote?network=&usdt=` | cualquiera | cotización indicativa con la mejor oferta |
| `POST /v1/swaps` | taker | inicia un swap: el maker responde en vivo por su buzón; se crea una sala |
| `GET /v1/swaps/:sala/events`, `POST …/messages`, `GET …/ws` | taker (token de la sala) | mensajes del protocolo |
| `GET /v1/makers/inbox` (WebSocket) | maker (firmado) | buzón del maker |
| `GET /openapi.json` | cualquiera | especificación OpenAPI 3.1 |
| `POST /mcp` | agentes de IA | MCP (JSON-RPC, Streamable HTTP): `list_networks`, `list_offers`, `get_quote`. **Solo lectura** |

### Seguridad

- **Firma de makers (EIP-191)** en cada escritura: `xmrp2p|<MÉTODO>|<ruta>|<dirección>|<timestamp>|<sha256(cuerpo)>`, con ±5 min de tolerancia. Nadie puede publicar ni retirar ofertas en nombre de otro. Un vector cruzado comprueba que la firma del daemon de Python (eth_account) verifica en el Worker (viem).
- **El canal rechaza llaves privadas completas**: cualquier campo llamado `spend_private`, `private_spend`, `spend_key`, `mnemonic`, `seed` o `private_key`, a cualquier profundidad, devuelve 400. La llave de vista privada sí viaja (el protocolo la necesita).
- **Token de sala**: el taker no tiene cuenta; su único acceso es un token aleatorio de 192 bits (el Worker guarda solo su SHA-256).
- **Límites**: 30 escrituras y 300 lecturas por minuto por IP (Rate Limiting de Workers), cuerpos ≤ 256 KB, ≤ 200 mensajes por sala, salas que se borran solas a los 3 días, una oferta por maker y red, TTL máximo de 15 min.
- **Interruptores sin tocar código** (`wrangler.toml` → `[vars]`): `ACTIVE_NETWORKS` (redes activas) y `BLOCKED_REGIONS` (países bloqueados → 451).

## Pruebas

```bash
npm install --legacy-peer-deps   # npm 10.9 falla al resolver los peers de vitest-pool-workers sin esto
npm test                         # 19 pruebas en miniflare (workerd real)
npx tsc --noEmit
```

Resultados (24-oct-2026): ✅ 19/19. Cubren el libro de órdenes con firmas válidas, caducadas, de otro maker y con el cuerpo cambiado; las validaciones; la cotización; el MCP (incluido que no haya herramientas de escritura); el flujo completo del canal (solicitud → respuesta del maker → eventos → mensaje del taker); el rechazo de llaves privadas; un maker desconectado (409), uno que no responde (504) o que rechaza (409); la compatibilidad de firma Python → Worker; y el proxy (CORS, rutas y métodos prohibidos, regiones y nodo caído).

**Prueba de extremo a extremo** (manual, 24-oct-2026): `wrangler dev` + el cliente real del maker en Python (`maker/xmrp2p_maker/channel.py`): oferta firmada → cotización → swap creado con respuesta en vivo del maker por WebSocket → evento `xmr_locked` visto por el taker → mensaje del taker recibido por el maker → MCP → oferta retirada. ✅

## Notas

- `compatibility_date = "2026-08-20"`: es la más nueva que soporta el `workerd` incluido en las herramientas de prueba.
- En esta PC wrangler necesita `env -u NODE_USE_SYSTEM_CA` (si no, falla con `fetch failed`).

## Desplegar (solo cuando lo apruebes)

```bash
env -u NODE_USE_SYSTEM_CA npx wrangler d1 create xmrp2p-orderbook        # copiar el id en wrangler.toml
env -u NODE_USE_SYSTEM_CA npx wrangler d1 migrations apply xmrp2p-orderbook --remote
env -u NODE_USE_SYSTEM_CA npx wrangler deploy
env -u NODE_USE_SYSTEM_CA npx wrangler deploy -c wrangler.node-proxy.toml
```

Con el dominio propio: rutas `api.<DOMINIO>/*` para la API y un subdominio por nodo para el proxy (`xmr-tw.nodos.<DOMINIO>`), porque libwallet ignora la ruta de la URL del nodo.
