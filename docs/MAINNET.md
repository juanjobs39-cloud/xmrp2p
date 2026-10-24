# Lista obligatoria antes de mainnet

> Nada se despliega en una red principal hasta que **todas** las casillas estén marcadas y el dueño lo apruebe por escrito.

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
