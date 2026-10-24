---
key: monero-wallet
lang: es
slug: como-crear-una-wallet-de-monero
title: Cómo crear una wallet de Monero
description: "Opciones de wallets de Monero para celular y escritorio, cómo crear una, guardar la semilla y obtener tu dirección. Incluye stagenet para pruebas."
published: 2026-10-24
updated: 2026-10-24
order: 4
related: [what-is-monero, swap-usdt-xmr, common-mistakes]
howto:
  name: Crear una wallet de Monero
  steps:
    - name: Elige una wallet
      text: Descarga una wallet desde su sitio oficial o desde la lista de getmonero.org.
    - name: Crea una wallet nueva
      text: Elige crear una wallet nueva y define una contraseña local.
    - name: Guarda la frase semilla
      text: Escribe la frase semilla en papel, en orden, y guárdala en un lugar seguro y sin conexión.
    - name: Copia tu dirección
      text: En la sección Recibir, copia tu dirección. Para probar xmrp2p usa una wallet de stagenet.
---

**Respuesta corta:** descarga una wallet de Monero desde su sitio oficial, crea una wallet nueva, escribe la frase semilla en papel y copia tu dirección en la sección "Recibir". Para probar xmrp2p necesitas una wallet en **stagenet** (la red de pruebas de Monero), que algunas wallets de escritorio permiten elegir.

## Opciones conocidas

| Wallet | Plataforma | Notas |
|---|---|---|
| Monero GUI y CLI (oficiales) | Windows, macOS, Linux | Del proyecto Monero; permiten stagenet |
| Feather Wallet | Windows, macOS, Linux | Ligera, para escritorio; permite stagenet |
| Cake Wallet | Android, iOS, escritorio | Muy usada en celular |
| Otras | Varias | Revisa la lista actualizada en getmonero.org |

> Descarga siempre desde el sitio oficial de cada wallet y verifica las firmas si el proyecto las publica. Desconfía de apps con nombres parecidos en las tiendas.

## Paso a paso

1. **Instala la wallet** desde su sitio oficial.
2. **Crea una wallet nueva.** Te pedirá una contraseña: protege el archivo en este dispositivo, no es tu semilla.
3. **Guarda la frase semilla.** Son palabras (25 en el formato clásico, 16 en el formato Polyseed que usan algunas wallets). Escríbelas en papel, en orden. Quien las tenga controla tus fondos.
4. **Anota la altura de restauración** si la wallet la muestra: acelera la recuperación.
5. **Copia tu dirección** desde "Recibir". Las direcciones principales de Monero en la red real empiezan con `4`; las subdirecciones, con `8`. En stagenet empiezan con `5` o `7`.

## Para probar xmrp2p (stagenet)

- En Monero GUI o Feather, elige **stagenet** al crear la wallet (en ajustes o al iniciar).
- El XMR de stagenet no tiene valor; se obtiene en faucets de stagenet.
- La app de xmrp2p rechaza direcciones que no sean de stagenet mientras estemos en pruebas.

## Buenas prácticas

- Nunca compartas tu semilla, ni con soporte técnico.
- Usa una dirección o subdirección nueva para cada swap si quieres más privacidad.
- Al recibir XMR, la red pide unas 10 confirmaciones (unos 20 minutos) antes de poder gastarlo.

Sigue con: [qué es Monero y en qué se diferencia de Bitcoin](/es/guias/que-es-monero/).
