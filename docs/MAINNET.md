# Mainnet: beta con dinero real y lista para la versión completa

## Decisión del dueño (26 de octubre de 2026)

> «NECESITO QUE YA FUNCIONE, DESPUES VEMOS LO DEMAS TOPE 100 USDT POR COMPRA QUE QUEDE LIBRE PARA REGISTRO DE MARKERS»

El dueño no tiene capital para la auditoría externa y decidió lanzar **una beta con dinero real sin auditoría**, con estas condiciones:

| Condición | Cómo se cumple |
|---|---|
| Solo Arbitrum One + Monero mainnet | `Deploy.s.sol` bloquea las demás redes principales |
| Tope de 100 USDT por swap | `MAX_AMOUNT` inmutable en la fábrica (el contrato revierte con `AmountTooHigh`), y también en la API, la web y los dos makers |
| Makers libres | Cualquiera publica ofertas firmadas, sin registro |
| Avisos claros | Insignia «Dinero real · beta» y aviso de «sin auditoría externa» en la portada, la app y el maker |
| Práctica separada | Testnet sigue disponible; bóvedas del maker separadas por red |

**Revisión gratuita hecha en lugar de la auditoría (26-oct):**
- 122 pruebas en verde, más una corrida larga: 20 000 casos por prueba de fuzz y 100 000 llamadas en las invariantes.
- Fork contra USD₮0 real en verde.
- Slither sin hallazgos nuevos.

**La auditoría externa sigue pendiente:** antes de subir el tope o abrir otras redes, completar la lista de abajo.

## Desplegar la fábrica en Arbitrum One (lo corre el dueño)

La llave con dinero real **nunca** la maneja nadie más. Necesitas ~0,003 ETH en Arbitrum One en la cuenta que despliega.

```bash
# 1. Importar tu cuenta a Foundry (te pide la llave privada y una contraseña; queda cifrada en tu PC)
cast wallet import mainnet-deployer --interactive

# 2. Desplegar (cambia FEE_RECIPIENT por tu dirección que cobra la comisión)
cd contracts
FEE_RECIPIENT=0xTU_DIRECCION TOKEN=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 MAX_AMOUNT=100000000 FEE_BPS=50 I_ACCEPT_MAINNET=yes forge script script/Deploy.s.sol --rpc-url https://arb1.arbitrum.io/rpc --account mainnet-deployer --broadcast
```

Con wallet de hardware: cambia `--account mainnet-deployer` por `--ledger`. Pasa la dirección `SwapFactory` que imprime y yo activo el resto: backend, web, proxy de Monero mainnet y alertas.

---

# Lista obligatoria para la versión completa (sin tope)

> Para subir el tope o abrir otras redes, **todas** las casillas deben estar marcadas y el dueño debe aprobarlo por escrito.

## Seguridad

- [ ] Auditoría externa del contrato terminada, hallazgos corregidos y reporte publicado.
- [ ] Revisión externa de `crypto-wasm` y de la DLEQ (`sigma_fun`).
- [ ] El commit desplegado es exactamente el auditado (hash anotado aquí).
- [ ] Slither sin hallazgos nuevos sin justificar.
- [ ] Pruebas en fork contra el USDT real de cada red, en verde.
- [ ] Decisión tomada y documentada sobre el riesgo 1 (taker ausente antes de `t0`).
- [ ] Programa de reporte de vulnerabilidades activo (`SECURITY.md`).

## Pruebas de extremo a extremo (Fase 7)

- [ ] Swaps completos en testnet con Monero stagenet (éxito, reembolso antes de t0, reembolso tras t1).
- [ ] Casos de falla: taker cierra la pestaña, maker caído, nodo caído, conexión perdida, plazos vencidos.
- [ ] Recuperación con el archivo descargable probada en otro navegador.
- [ ] Resultados en `docs/PRUEBAS.md`.

## Configuración

- [ ] `FEE_BPS` y `FEE_RECIPIENT` definitivos (el receptor es una wallet que controla el dueño, idealmente multifirma).
- [ ] Monto mínimo, plazos y límites por trade revisados.
- [ ] Bloqueo de regiones configurado según asesoría legal.
- [ ] Nodos de Monero mainnet y proxy configurados; el usuario puede elegir su nodo.

## Frontend

- [ ] CSP estricta, SRI y sin scripts de terceros.
- [ ] Build reproducible y copia en IPFS con su CID publicado.
- [ ] Avisos de riesgo visibles; el archivo de recuperación se descarga antes de depositar.

## Legal

- [ ] Consulta con un abogado sobre operar el sitio y cobrar comisión en los países objetivo.
- [ ] Términos de uso, privacidad y aviso de riesgos publicados.

## Lanzamiento

- [ ] Límites bajos por trade al inicio (beta), con el dueño como único maker.
- [ ] Monitoreo de eventos del contrato y alertas.
- [ ] Aprobación explícita del dueño: ______ (fecha y firma)
