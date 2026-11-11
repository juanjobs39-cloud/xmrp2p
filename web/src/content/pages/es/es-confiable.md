---
key: trust
lang: es
title: "¿MoneroP2P es confiable y seguro? Cómo comprobarlo tú mismo"
description: "Lo que puedes verificar por tu cuenta antes de confiar en MoneroP2P: contrato, código, comisiones y límites. Y lo que aún le falta, como una auditoría externa."
updated: 2026-11-10
faq:
  - q: "¿MoneroP2P es confiable?"
    a: "MoneroP2P es una plataforma de código abierto y sin custodia que funciona con dinero real desde el 26 de octubre de 2026. Su contrato no tiene funciones de administrador y su código está verificado en Sourcify, así que lo principal se puede comprobar en fuentes públicas. Es un proyecto joven y aún sin auditoría externa; por eso cada atomic swap tiene un tope de 100 USDT."
  - q: "¿MoneroP2P puede quedarse con mis fondos?"
    a: "En un atomic swap, no: el USDT está en un contrato sin funciones de administrador, pausa ni actualización, y el XMR está en una dirección que necesita las dos mitades de la llave. En P2P Fiat el XMR queda en un escrow multifirma 2 de 3 que nadie, tampoco MoneroP2P, puede mover solo. Los exchanges instantáneos vía Trocador son distintos: el exchange que elijas custodia las monedas durante el cambio."
  - q: "¿MoneroP2P tiene auditoría?"
    a: "Todavía no de una firma externa. El contrato pasó verificación automática con Halmos (7/7 propiedades probadas), Aderyn (0 hallazgos altos) y Slither (sin hallazgos medios ni altos), y el informe y las corridas son públicos. Mientras no haya auditoría externa, el contrato limita cada swap a 100 USDT."
---

**Respuesta corta:** MoneroP2P es una plataforma de código abierto y sin custodia que funciona con dinero real desde el 26 de octubre de 2026. No tienes que creernos: cada afirmación de abajo se puede comprobar en fuentes públicas. También es un proyecto joven y sin auditoría externa todavía, por eso los límites son bajos a propósito.

## Lo que puedes verificar tú mismo

| Afirmación | Cómo comprobarla |
|---|---|
| Nadie custodia tu USDT en un atomic swap | El contrato no tiene funciones de administrador, pausa ni actualización. Lee su código verificado en [Sourcify](https://repo.sourcify.dev/42161/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) (coincidencia exacta) o en [Arbiscan](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535). |
| El contrato fue revisado | Halmos probó 7 de 7 propiedades, Aderyn encontró 0 hallazgos altos y Slither ninguno medio ni alto. Mira el [informe](https://github.com/juanjobs39-cloud/xmrp2p/blob/main/docs/AUDITORIA-GRATUITA.md) y las [corridas públicas](https://github.com/juanjobs39-cloud/xmrp2p/actions/workflows/auditoria.yml). |
| Los límites y la comisión no se pueden subir | El máximo de 100 USDT por swap y el tope de comisión de 1 % son constantes del contrato. La comisión actual es 0.5 % y la paga el maker. |
| El sitio corre el código publicado | Todo el código está en [GitHub](https://github.com/juanjobs39-cloud/xmrp2p) con licencia AGPL-3.0. Cada versión publica [SHA256SUMS](/SHA256SUMS) para comparar los archivos que cargas con tu propio build. |
| P2P Fiat no puede mover tu XMR solo | Cada orden usa un multifirma 2 de 3 de Monero: comprador, vendedor y árbitro tienen una llave cada uno y hacen falta dos. Mira [cómo funciona P2P Fiat](https://fiat.monerop2p.app/es/como-funciona/). |
| Tus llaves se quedan contigo | Las llaves se generan en tu navegador. La app de swaps no tiene cuentas, y sus páginas aplican una política de seguridad de contenido estricta que puedes leer en el código de la página. |
| Ha funcionado con fondos reales | El primer swap en la red principal se completó el 26 de octubre de 2026. Cada swap crea su propio contrato desde la fábrica, visible en Arbiscan. |

## Límites y lo que todavía no tenemos

- **Sin auditoría externa.** Las revisiones de arriba son herramientas automáticas, no el análisis de una firma auditora. Por eso el contrato limita cada swap a 100 USDT.
- **Proyecto joven.** Se lanzó en octubre de 2026. El volumen es pequeño y P2P Fiat tiene pocos anuncios en algunas monedas.
- **Los exchanges instantáneos sí custodian.** Los cambios desde BTC, ETH y otras monedas pasan por exchanges de terceros vía Trocador: el exchange que elijas tiene las monedas unos minutos, y la cotización incluye un margen de 1 % para MoneroP2P.
- **P2P Fiat protege el XMR, no el pago bancario.** El pago en dinero ocurre fuera de la plataforma. Los métodos reversibles, como PayPal o tarjetas, tienen más riesgo, y las apelaciones las resuelve el árbitro, que operamos nosotros.
- **Tú eres responsable de tus llaves.** Si pierdes tu archivo de recuperación o la contraseña de tu cuenta, no podemos restaurarlos.
- **Sin garantía de empresa.** No hay seguro de depósitos ni línea de atención. Lee el [aviso de riesgos](/es/aviso-de-riesgos/).

## Quién está detrás y cómo contactarnos

MoneroP2P es un proyecto independiente de código abierto. El protocolo se basa en los atomic swaps de AthanorLabs. Puedes escribirnos desde [la página de contacto](/es/contacto/) y reportar vulnerabilidades en privado desde la pestaña Security del repositorio. Nunca te pediremos tu semilla, tu archivo de recuperación ni un pago para «desbloquear» un swap.

## Antes de usarlo

1. Prueba el modo de práctica con fondos de prueba: agrega `?red=prueba` a la [app de swaps](/es/app/).
2. Empieza con un monto pequeño.
3. Lee [cómo funciona](/es/como-funciona/) y la [página de seguridad](/es/seguridad/).
4. Nunca operes fuera de la plataforma, aunque te lo pidan.
