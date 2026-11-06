# MoneroP2P Wallet

Wallet de Monero sin custodia en forma de extensión de navegador (Manifest V3) para Chrome, Brave, Edge, Opera y Firefox. Página pública: https://monerop2p.app/es/wallet/

**Estado:** versión 0.2.0, fase 2 (Monero + USDT/ETH en Arbitrum).

## Qué hace

- Crea o restaura una wallet con la semilla estándar de Monero de 25 palabras. Es compatible con Cake Wallet, Feather y la wallet oficial.
- **Recibir:** una subdirección nueva para cada cobro, con su QR.
- **Enviar:** primero prepara la transacción sin transmitirla. Muestra la comisión exacta, pide confirmación y solo entonces la transmite.
- **Historial:** con las confirmaciones de cada movimiento.
- **Explorar:** abre el exchange (monerop2p.app/app, con `?to=<subdirección>`) y P2P Fiat (fiat.monerop2p.app).
- **Arbitrum (USDT y ETH):** cuenta derivada de la misma semilla, con saldo, recibir (QR) y enviar con la comisión de red estimada antes de confirmar. La wallet de stagenet usa Arbitrum Sepolia.
- **Sitios de MoneroP2P:** en monerop2p.app y fiat.monerop2p.app la extensión se anuncia como wallet (EIP-6963) y expone `window.moneroP2P`. El swap y P2P Fiat la usan sin MetaMask y sin copiar y pegar direcciones.
- **Ajustes:**
  - bloqueo automático;
  - nodo propio, que pide permiso solo para ese origen;
  - idioma (es/en);
  - mostrar la semilla, pidiendo la contraseña;
  - exportar la llave privada de Arbitrum, pidiendo la contraseña;
  - ver y desconectar sitios conectados;
  - borrar la wallet del equipo.

## Comisión

Cada envío de XMR en la red principal agrega una comisión de MoneroP2P del **0.25 %** como una salida más de la misma transacción, a la dirección `8AfP2xg6…L7eyr` (ver `src/core/fee.ts`). La pantalla de confirmación la muestra en una línea aparte, antes de firmar, y la página /wallet la documenta.

- Montos con comisión menor a 0.00001 XMR no la pagan.
- No se cobra al enviar a una dirección propia de la wallet ni en stagenet.
- **Privacidad:** la salida extra hace que la transacción tenga 3 salidas en lugar de 2. Es una huella visible en la cadena (no revela montos ni direcciones).

## Cuenta de Arbitrum

La llave es `HKDF-SHA256(llave privada de gasto de Monero, salt "MoneroP2P Wallet EVM", info "arbitrum/v1")` (ver `src/core/evm.ts`). No es BIP-44: restaurar la semilla de 25 palabras aquí da siempre la misma cuenta, y en otras wallets se usa exportando la llave privada desde Ajustes. Se guarda cifrada con la llave de la bóveda (IndexedDB, propósito `evm`).

| Red de Monero | Red EVM | Token |
|---|---|---|
| Principal | Arbitrum One (42161) | USD₮0 `0xFd08…Fcbb9` |
| Stagenet | Arbitrum Sepolia (421614) | tUSDT de prueba |

Los envíos en Arbitrum no pagan comisión de MoneroP2P, solo la de la red.

## Proveedor para sitios

- **Dónde:** los content scripts solo se cargan en `https://monerop2p.app/*` y `https://fiat.monerop2p.app/*`, nunca en `<all_urls>`. El fondo vuelve a comprobar el origen real del remitente.
- **Partes:**
  - `src/inpage.ts`, en el mundo de la página: proveedor EIP-1193 anunciado por EIP-6963 (`rdns: app.monerop2p.wallet`; no toca `window.ethereum`) y `window.moneroP2P`.
  - `src/content.ts`: puente por `postMessage` y un puerto al fondo.
  - `src/background.ts`: enruta las solicitudes y no tiene llaves.
- **Aprobaciones:** todo lo que revela o firma algo abre una ventana de aprobación (`popup.html?view=approve`). Esa ventana descifra la llave con la sesión, o pide la contraseña si la wallet está bloqueada. Cerrarla equivale a rechazar (error 4001).
- **Métodos:**
  - `eth_requestAccounts` y `eth_accounts`: el sitio tiene que estar conectado.
  - `eth_sendTransaction`: decodifica las llamadas conocidas (transfer/approve del token, depósito en la fábrica del swap, setReady/refund/claim del escrow) y avisa si el contrato es desconocido. No permite crear contratos.
  - `eth_signTypedData_v4`: solo con el `chainId` de la wallet; muestra los permisos (Permit) con monto, plazo y quién podrá gastar.
  - Lecturas (`eth_call`, `eth_getBalance`…): se reenvían al RPC público.
  - No soportados: `personal_sign`, `eth_sign` y cambiar de red.
- **`window.moneroP2P`:**
  - `getNetwork()`;
  - `getAddress()`: subdirección nueva, calculada sin abrir wallet2. El índice se guarda en `subNext` y la wallet registra esas subdirecciones al abrirse;
  - `requestTransfer({address, amount})`: monto en piconero. Muestra la misma confirmación que un envío normal, con comisiones.

## Seguridad

| Capa | Detalle |
|---|---|
| Bóveda | Argon2id (64 MiB, t=3, `hash-wasm`) + XChaCha20-Poly1305 (`@noble/ciphers`). Cada blob lleva su propósito como dato autenticado (AAD). |
| Sesión | La llave derivada vive en `chrome.storage.session`, que está solo en memoria y es inaccesible para content scripts. El bloqueo automático (`chrome.alarms`) la borra. |
| Caché de wallet2 | Puede pesar decenas de MB. Va cifrado con la misma llave en IndexedDB (`src/core/blobstore.ts`). |
| Código | Sin código remoto. La CSP es `script-src 'self' 'wasm-unsafe-eval'; object-src 'none'`. Content scripts solo en los dos sitios de MoneroP2P; sin permisos de pestañas. |
| Red | `host_permissions` solo para `nodo-xmr.monerop2p.app`, `nodo.monerop2p.app` (stagenet) y el RPC público de Arbitrum One y Sepolia. Un nodo propio se pide en tiempo de ejecución (`optional_host_permissions`). |
| Envíos | Valida la dirección por su cuenta (base58 de Monero + Keccak + red). Avisa si una dirección se parece a una reciente sin ser igual (envenenamiento). |
| Paquete | Build reproducible: `.zip` determinista con `SHA256SUMS`. |

La lógica que no depende de la interfaz está en `src/core/` (bóveda, direcciones, montos, almacenamiento), lista para reutilizarse en la app de celular.

## Desarrollo

```bash
npm ci --legacy-peer-deps
npm test            # pruebas del núcleo (vitest)
npm run typecheck
npm run build       # dist/chromium y dist/firefox
npm run test:ext    # extensión real en Edge (stagenet): crear, bloquear, desbloquear, Explorar, proveedor y aprobaciones
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
   - `host_permissions`: nodo de Monero y RPC de Arbitrum.
   - content scripts en monerop2p.app y fiat.monerop2p.app: conectar la wallet al swap y a P2P Fiat.
5. **Firefox:** AMO pide el código fuente porque el paquete está minificado. Sube un .zip del repositorio con estas instrucciones. Las advertencias de `eval`/`innerHTML` de `web-ext lint` vienen del código Emscripten de monero-ts; la CSP de la extensión las bloquea.
6. **Al publicar:** pon los enlaces de cada tienda en `WALLET` de `web/src/site.ts`. La página /wallet cambia sola "Próximamente" por el botón.

## Próximas fases

- **Fase 2 (hecha):** cuenta de Arbitrum, proveedor con aprobaciones y `window.moneroP2P`.
- **Fase 3:** Ledger, Tor, libreta de contactos, auditoría externa y app de celular.
