# MoneroP2P Wallet

Wallet de Monero sin custodia en forma de extensión de navegador (Manifest V3) para Chrome, Brave, Edge, Opera y Firefox. Página pública: https://monerop2p.app/es/wallet/

**Estado:** beta 0.1.0, fase 1 (solo Monero). Sin auditoría externa todavía.

## Qué hace

- Crea o restaura una wallet con la semilla estándar de Monero de 25 palabras. Es compatible con Cake Wallet, Feather y la wallet oficial.
- **Recibir:** una subdirección nueva para cada cobro, con su QR.
- **Enviar:** primero prepara la transacción sin transmitirla. Muestra la comisión exacta, pide confirmación y solo entonces la transmite.
- **Historial:** con las confirmaciones de cada movimiento.
- **Explorar:** abre el exchange (monerop2p.app/app, con `?to=<subdirección>`) y P2P Fiat (fiat.monerop2p.app).
- **Ajustes:**
  - bloqueo automático;
  - nodo propio, que pide permiso solo para ese origen;
  - idioma (es/en);
  - mostrar la semilla, pidiendo la contraseña;
  - borrar la wallet del equipo.

## Seguridad

| Capa | Detalle |
|---|---|
| Bóveda | Argon2id (64 MiB, t=3, `hash-wasm`) + XChaCha20-Poly1305 (`@noble/ciphers`). Cada blob lleva su propósito como dato autenticado (AAD). |
| Sesión | La llave derivada vive en `chrome.storage.session`, que está solo en memoria y es inaccesible para content scripts. El bloqueo automático (`chrome.alarms`) la borra. |
| Caché de wallet2 | Puede pesar decenas de MB. Va cifrado con la misma llave en IndexedDB (`src/core/blobstore.ts`). |
| Código | Sin código remoto. La CSP es `script-src 'self' 'wasm-unsafe-eval'; object-src 'none'`. No hay content scripts ni permisos de pestañas en la fase 1. |
| Red | `host_permissions` solo para `nodo-xmr.monerop2p.app` y `nodo.monerop2p.app` (stagenet). Un nodo propio se pide en tiempo de ejecución (`optional_host_permissions`). |
| Envíos | Valida la dirección por su cuenta (base58 de Monero + Keccak + red). Avisa si una dirección se parece a una reciente sin ser igual (envenenamiento). |
| Paquete | Build reproducible: `.zip` determinista con `SHA256SUMS`. |

La lógica que no depende de la interfaz está en `src/core/` (bóveda, direcciones, montos, almacenamiento), lista para reutilizarse en la app de celular.

## Desarrollo

```bash
npm ci --legacy-peer-deps
npm test            # pruebas del núcleo (vitest)
npm run typecheck
npm run build       # dist/chromium y dist/firefox
npm run test:ext    # extensión real en Edge (stagenet): crear, bloquear, desbloquear, Explorar
npm run package     # release/*.zip + SHA256SUMS
```

Para cargarla a mano:
- **Chrome o Edge:** `chrome://extensions`, activa el modo desarrollador, "Cargar descomprimida" y elige `dist/chromium`.
- **Firefox:** `about:debugging`, "Cargar complemento temporal" y elige `dist/firefox/manifest.json`.

Para probar en **stagenet** (sin valor), elige "Opciones avanzadas", luego "Red" y "Stagenet" al crear la wallet.

### Notas de rendimiento

- **Primera sincronización** de una wallet nueva: wallet2 descarga los hashes de todos los bloques. Tarda unos 100 s en stagenet y algo más en la red principal.
- **Aperturas siguientes:** usan el caché cifrado. El saldo guardado aparece en ~1 s y la wallet queda al día en ~10 s.
- **Restaurar sin fecha:** escanea toda la cadena y puede tardar horas. La interfaz pide la fecha aproximada para evitarlo.

## Verificar un paquete

```bash
git checkout <tag>
cd wallet && npm ci --legacy-peer-deps && npm run build && npm run package
cat release/SHA256SUMS   # debe coincidir con el publicado
```

## Publicación en tiendas (la hace el dueño del proyecto)

1. **Cuentas:**
   - Chrome Web Store: pago único de 5 USD;
   - Firefox Add-ons: gratis;
   - Edge Add-ons: gratis.
2. **Qué subir:** `release/monerop2p-wallet-<v>-chromium.zip` a Chrome y Edge, y `-firefox.zip` a Firefox.
3. **Política de privacidad:** https://monerop2p.app/es/privacidad/ (sección "Extensión MoneroP2P Wallet").
4. **Justificación de permisos:**
   - `storage`: bóveda cifrada.
   - `unlimitedStorage`: caché cifrado de wallet2.
   - `alarms`: bloqueo automático.
   - `host_permissions`: nodo de Monero.
5. **Firefox:** AMO pide el código fuente porque el paquete está minificado. Sube un .zip del repositorio con estas instrucciones. Las advertencias de `eval`/`innerHTML` de `web-ext lint` vienen del código Emscripten de monero-ts; la CSP de la extensión las bloquea.
6. **Al publicar:** pon los enlaces de cada tienda en `WALLET` de `web/src/site.ts`. La página /wallet cambia sola "Próximamente" por el botón.

## Próximas fases

- **Fase 2:**
  - cuenta EVM (USDT y ETH en Arbitrum One) derivada de la misma semilla;
  - proveedor EIP-1193/EIP-6963 con aprobación por sitio;
  - API `window.moneroP2P` para que el swap y P2P Fiat reciban la dirección sin copiar y pegar.
- **Fase 3:** Ledger, Tor, libreta de contactos, auditoría externa y app de celular.
