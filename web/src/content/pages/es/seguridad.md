---
key: security
lang: es
title: Seguridad de xmrp2p
description: "Por qué nadie custodia tus fondos, cómo funcionan los reembolsos, qué riesgos existen y cómo verificar el código. Estado: testnet, sin auditoría."
updated: 2026-10-24
---

**Respuesta corta:** en xmrp2p nadie custodia fondos. Tu USDT está en un contrato que solo libera el dinero según reglas públicas, y el XMR está en una dirección que nadie puede mover sin las dos mitades de la llave. Aun así, el software es experimental y **no tiene auditoría todavía**: úsalo solo en testnet.

## Por qué nadie custodia tus fondos

- **El USDT** queda en un contrato propio de tu swap. No tiene funciones de administrador: ni nosotros ni el maker podemos sacarlo fuera de las reglas de `claim` y `refund`.
- **El XMR** queda en una dirección compartida. El maker no puede recuperarlo sin tu mitad de llave, y tú no puedes tomarlo sin la suya.
- **Tus llaves** se generan en tu navegador y nunca se envían a nuestros servidores. El backend rechaza cualquier mensaje que contenga una llave privada completa.

## Cómo funcionan los reembolsos

| Situación | Qué pasa |
|---|---|
| El maker no deposita el XMR | Reembolsas antes de t0 (la app te lo pide) |
| El maker deposita menos XMR | No confirmas y reembolsas antes de t0 |
| Confirmaste y el maker no cobra | Desde t1 reembolsas |
| Cerraste la pestaña | Vuelves con tu [archivo de recuperación](/es/guias/que-hacer-si-cerraste-la-pestana/) |

## Riesgos que debes conocer

1. **Plazos.** Si no reembolsas a tiempo cuando el XMR no llegó, puedes perder el USDT. La app te avisa, pero necesita estar abierta o que vuelvas con el archivo.
2. **Archivo de recuperación.** Sin él y sin la contraseña no puedes reclamar el XMR ni reembolsar. No lo podemos recuperar por ti.
3. **Congelación de USDT.** Tether puede congelar direcciones. Por eso cada swap usa un contrato separado, pero el riesgo existe.
4. **Software sin auditar.** Puede tener errores. Antes de operar con dinero real, el contrato y el núcleo criptográfico pasarán una auditoría externa.
5. **Privacidad.** El proxy de nodos de Monero ve qué consulta tu navegador. Puedes usar tu propio nodo.

## Cómo protegemos la app

- **Política de seguridad de contenido (CSP)** estricta: la app solo ejecuta código propio.
- **Integridad de subrecursos (SRI)** en scripts y estilos, e integridad del núcleo criptográfico verificada antes de usarlo.
- **Sin scripts de terceros**, sin analítica y sin cookies.
- **Builds verificables:** publicamos `SHA256SUMS` de cada archivo y una copia en IPFS.

## Auditorías

Todavía no hay auditoría externa. El alcance preparado está en [docs/AUDITORIA.md](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA.md). Cuando exista, publicaremos el informe aquí.

## Código fuente y reportes

El código es abierto (AGPL-3.0): [github.com/juanjobs39-cloud/xmrp2p](https://github.com/juanjobs39-cloud/xmrp2p). Para reportar una vulnerabilidad, usa el reporte privado de GitHub descrito en `SECURITY.md`.
