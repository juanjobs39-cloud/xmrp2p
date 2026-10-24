---
key: closed-tab
lang: es
slug: que-hacer-si-cerraste-la-pestana
title: Qué hacer si cerraste la pestaña a mitad de un swap
description: "Cómo reanudar un swap de xmrp2p con tu archivo de recuperación, qué pasa con los plazos t0 y t1 y cuándo debes reembolsar."
published: 2026-10-24
updated: 2026-10-24
order: 6
related: [swap-usdt-xmr, atomic-swap]
howto:
  name: Reanudar un swap con el archivo de recuperación
  totalTime: PT5M
  steps:
    - name: Abre la app
      text: Abre la app de xmrp2p en cualquier navegador, idealmente en el mismo dispositivo.
    - name: Elige Reanudar
      text: Pulsa "Reanudar" y sube tu archivo de recuperación (o úsalo desde este navegador si lo guardaste aquí).
    - name: Escribe tu contraseña
      text: Escribe la contraseña con la que cifraste el archivo.
    - name: Sigue la acción que indica la app
      text: La app lee el estado del contrato y te dice si debes confirmar, esperar, reembolsar o recibir el XMR.
---

**Respuesta corta:** vuelve a abrir la app, pulsa "Reanudar", sube tu archivo de recuperación y escribe tu contraseña. La app leerá el contrato y te dirá qué hacer. **Hazlo cuanto antes:** si el XMR no se verificó y se acerca el plazo t0, tendrás que reembolsar a tiempo.

## Qué pasa mientras la pestaña está cerrada

Nada se pierde de inmediato, pero el reloj del contrato sigue corriendo:

| Momento | Qué puede pasar | Qué haces al volver |
|---|---|---|
| Antes de t0 | El maker puede haber bloqueado el XMR | La app lo verifica; confirmas o reembolsas |
| Entre t0 y t1 | El maker puede cobrar (si bloqueó el XMR) | Si cobró, la app te envía el XMR |
| Después de t1 | Si el maker no cobró | Reembolsas tu USDT |

**El riesgo:** si no vuelves antes de t0 y el maker *no* bloqueó el XMR, el contrato le permite cobrar igual entre t0 y t1. Por eso es importante volver pronto o no cerrar la pestaña.

## Si el maker ya cobró

Al cobrar, el maker reveló su mitad de la llave en la cadena. Con tu archivo de recuperación la app reconstruye la llave completa y envía el XMR a tu dirección, aunque hayan pasado días. No hay plazo para esto.

## Si perdiste el archivo

- Si usas **el mismo navegador** y no borraste sus datos, la app guardó una copia cifrada: pulsa "Reanudar" y escribe tu contraseña sin subir archivo.
- Si perdiste el archivo **y** el navegador, no hay forma de recuperar tu mitad de la llave. Nosotros no la tenemos.

## Consejos

- Guarda el archivo en dos lugares (por ejemplo, tu computadora y una memoria USB).
- Usa una contraseña que puedas recordar.
- Si puedes, deja la pestaña abierta hasta que termine el swap.

Sigue con: [cómo cambiar USDT a Monero sin intermediarios](/es/guias/como-cambiar-usdt-a-monero-sin-intermediarios/).
