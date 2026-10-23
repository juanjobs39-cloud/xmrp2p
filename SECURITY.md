# Política de seguridad

xmrp2p maneja fondos de terceros. Tomamos en serio cualquier reporte.

## Cómo reportar una vulnerabilidad

- **No abras un issue público.**
- Usa el reporte privado de GitHub: pestaña **Security → Report a vulnerability** de este repositorio.
- Alternativa: escribe a `[EMAIL_CONTACTO]` (configurable en `config/xmrp2p.example.toml`).

Incluye: componente afectado (contrato, WASM, maker, workers, web), pasos para reproducir, impacto estimado y, si puedes, una propuesta de corrección.

## Qué esperar

- Confirmación de recibido en un plazo razonable.
- Coordinación de la divulgación: pedimos no publicar detalles hasta que haya una corrección disponible.

## Alcance

| Componente | En alcance |
|---|---|
| Contratos en `contracts/` | Sí (máxima prioridad) |
| Núcleo criptográfico `crypto-wasm/` | Sí |
| App del swap y web `web/` | Sí (incluye CSP, SRI, inyección de scripts) |
| Workers `workers/` | Sí |
| Daemon del maker `maker/` | Sí |
| Carpeta `research/` | No (código desechable de investigación) |

## Estado actual

El proyecto está en fase de investigación. **No existe ningún despliegue en mainnet.** Cualquier dirección que diga ser de xmrp2p en mainnet no es oficial.
