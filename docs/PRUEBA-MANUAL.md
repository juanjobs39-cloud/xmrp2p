# Prueba manual con MetaMask (Fase 7)

> Duración: unos 45 minutos. **Solo testnet: nada de esto tiene valor real.** Usa una cuenta de MetaMask **nueva**, no la que tenga fondos reales.

**Resumen:** agregas Arbitrum Sepolia a MetaMask, pides ETH de prueba, abres la app local, pides TestUSDT gratis, haces un swap y compruebas que el XMR de stagenet llega a tu wallet de prueba.

## 1. Preparar MetaMask (una vez)

1. En MetaMask: *Agregar cuenta* → crea una cuenta nueva llamada "xmrp2p prueba".
2. *Redes* → *Agregar red* → busca **Arbitrum Sepolia** (o agrégala a mano):
   - RPC: `https://sepolia-rollup.arbitrum.io/rpc`
   - Chain ID: `421614`
   - Moneda: ETH · Explorador: `https://sepolia.arbiscan.io`
3. Pide ETH de Arbitrum Sepolia para esa cuenta (como hiciste para el maker).

## 2. Wallet de Monero stagenet para recibir

Cualquiera de estas sirve:
- **Feather Wallet** → al crear la wallet elige *Stagenet*.
- O usa la dirección de prueba que te pase Claude (la wallet "taker" del entorno de pruebas).

Copia tu dirección: en stagenet empieza con `5`.

## 3. Hacer el swap

1. Claude te dará la dirección local de la app (por ejemplo `http://localhost:8767/es/app/`). Ábrela en el navegador donde tienes MetaMask.
2. Si tu cuenta no tiene TestUSDT, usa el botón o el enlace de faucet que te indicará Claude (el token tiene una función `faucet` gratuita).
3. En la app:
   1. Elige la oferta, escribe **15** USDT y tu dirección de stagenet.
   2. Escribe una contraseña (mínimo 10 caracteres) y el nodo que aparece por defecto.
   3. **Pedir el swap** → **Descargar archivo de recuperación** (guárdalo).
   4. **Conectar wallet y depositar** → MetaMask te pedirá **firmar** (permit) y luego **confirmar la transacción**.
4. Espera en la pestaña (no la cierres). Verás:
   - "Esperando y verificando el XMR del maker" (unos 20–25 min por las confirmaciones de Monero).
   - Botón **Confirmar (setReady)** → confírmalo en MetaMask.
   - "Esperando que el maker cobre…" y luego "Enviando el XMR a tu dirección…".
5. Al terminar verás "¡Listo! Tu XMR fue enviado (tx …)". En tu wallet de stagenet aparecerá tras unas confirmaciones.

## 4. Qué anotar y enviarle a Claude

- ¿Algún mensaje confuso o paso donde no supiste qué hacer?
- Capturas de pantalla de errores, si hubo.
- El hash de tu depósito (lo muestra MetaMask) y el tiempo total.

## Si algo falla

- **Cerraste la pestaña:** vuelve a abrir la app → *Reanudar* → sube el archivo y escribe la contraseña.
- **La app pide reembolsar:** hazlo; es el comportamiento correcto si el XMR no se verificó a tiempo.
