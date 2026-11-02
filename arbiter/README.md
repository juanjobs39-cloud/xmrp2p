# Árbitro de P2P Fiat

Tercera llave del escrow **multisig 2 de 3** de Monero (comprador, vendedor y árbitro). Nadie puede mover el XMR solo: hacen falta dos firmas.

| Pago | Quién arma la transacción | Segunda firma (árbitro) solo si… |
|---|---|---|
| Liberar al comprador | Vendedor | la orden está en `releasing` **y** la autorización lleva la firma del vendedor |
| Reembolso al vendedor | Vendedor | el comprador canceló o se le acabó el tiempo **antes** de «Ya pagué» (`refunding`) |
| Queja | El ganador | la decisión lleva **tu firma de administrador** y el ganador coincide |

Antes de firmar, el árbitro revisa siempre la transacción (`src/rules.mjs`):
- **Liberar o queja ganada por el comprador:**
  - al comprador, exactamente el monto de la orden;
  - a la plataforma, exactamente la comisión;
  - cualquier sobrante, solo al reembolso del vendedor.
- **Reembolso o queja ganada por el vendedor:** todo a la dirección de reembolso del vendedor.
- **En todos los casos:**
  - una sola transacción;
  - comisión de red de máximo 0.0001 XMR.
- **Dirección de cobro:** si la que reporta el backend no es igual a la del árbitro, no firma nada.

## Archivos

- `src/multisig.mjs`: armado del escrow por rondas, exportar e importar información, crear, describir y firmar. Lo usa también el navegador.
- `src/rules.mjs`: verificación de firmas y de transacciones (funciones puras).
- `src/arbiter.mjs`: atiende las tareas del backend (`/v1/p2p/arbiter/*`).
- `src/store.mjs`: estado de cada escrow cifrado con AES-GCM. El contenedor no tiene disco, así que el estado se guarda en la sala de la orden.
- `src/main.mjs`: arranque, en modo `loop` (local o VPS) o `server` (Cloudflare Containers: el Worker lo despierta con `POST /tick`).

## Variables

| Variable | Qué es | ¿Secreta? |
|---|---|---|
| `API_URL` | URL del backend | no |
| `P2P_ARBITER_TOKEN` | token compartido con el backend | **sí** |
| `ARBITER_STATE_KEY` | ≥ 32 caracteres; cifra el estado de las wallets de escrow | **sí** |
| `ARBITER_FEE_ADDRESS` | tu dirección de Monero para cobrar comisiones; debe ser igual a `P2P_FEE_ADDRESS` del backend | no |
| `MONERO_NODE` | nodo de Monero | no |
| `XMR_NETWORK` | `stagenet` o `mainnet` | no |
| `ARBITER_MODE` | `loop` o `server` | no |

Los secretos van como secretos de Cloudflare (`wrangler secret put …`) o variables de entorno. **Nunca en el repositorio.** Si se pierde `ARBITER_STATE_KEY`, el árbitro ya no puede firmar las órdenes abiertas. En ese caso, comprador y vendedor juntos todavía pueden mover el escrow.

## Pruebas

```bash
npm test                                    # reglas + armado del escrow 2 de 3 sin red
node test/e2e-setup.mjs                     # backend local + 3 partes: escrow listo (sin fondos)
node test/e2e-wallet.mjs <archivo>          # wallet de stagenet para la prueba con fondos
node test/e2e-funded.mjs <archivo>          # orden completa con XMR de stagenet (~25 min)
```
