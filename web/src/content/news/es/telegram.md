---
key: telegram-bot
lang: es
slug: comprar-monero-por-telegram-bot
title: "Comprar y vender Monero por Telegram: bot con alertas y sin KYC"
description: "El bot de MoneroP2P abre el mercado P2P y el exchange dentro de Telegram, avisa de tus órdenes y manda alertas de anuncios nuevos. Sin KYC y sin custodia."
published: 2026-11-11
keywords:
  - comprar Monero por Telegram
  - bot de Telegram Monero
  - vender XMR Telegram
  - bot XMR sin KYC
  - alertas de precio Monero Telegram
  - Mini App Monero
  - comprar XMR P2P
  - cambiar Bitcoin por Monero Telegram
  - MoneroP2PFiatBot
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/es/
    description: "Mercado P2P para comprar y vender Monero (XMR) con moneda local, con escrow multisig 2 de 3 en la red de Monero y sin KYC."
  - name: MoneroP2P
    url: https://monerop2p.app/es/app/
    description: "Exchange sin cuenta para cambiar USDT, BTC, ETH y otras cripto por Monero (XMR), con atomic swap sin custodia para USDT en Arbitrum."
howto:
  name: "Cómo comprar Monero desde Telegram con el bot de MoneroP2P"
  totalTime: PT45M
  steps:
    - name: "Abre el bot oficial"
      text: "Busca @MoneroP2PFiatBot en Telegram, o entra desde el enlace del sitio, y toca Iniciar. Comprueba que el usuario sea exactamente ese."
    - name: "Abre el mercado dentro de Telegram"
      text: "Toca el botón «P2P». El mercado se abre como Mini App sin salir de Telegram. Crea tu cuenta con un apodo y una contraseña: no pide correo ni identificación."
    - name: "Elige un anuncio"
      text: "Filtra por moneda y método de pago y compara precio, límites y reputación del vendedor."
    - name: "Espera el escrow"
      text: "El vendedor deposita el XMR en un escrow multisig 2 de 3 que se firma en tu celular. El bot te avisa cuando cambia el estado de la orden."
    - name: "Paga y recibe"
      text: "Con el XMR ya bloqueado, paga por el método acordado y marca «Ya pagué». El vendedor confirma y el escrow envía el Monero a tu wallet."
faq:
  - q: "¿Se puede comprar Monero por Telegram?"
    a: "Sí. El bot @MoneroP2PFiatBot abre el mercado P2P Fiat de MoneroP2P dentro de Telegram como Mini App: eliges un anuncio, el XMR queda en un escrow multisig 2 de 3 y pagas con transferencia, app de pagos o efectivo. No pide KYC ni correo."
  - q: "¿El bot de MoneroP2P guarda mis fondos o mis llaves?"
    a: "No. El bot solo abre la plataforma y manda avisos. Tu cuenta y el escrow se firman en tu dispositivo; el bot nunca ve llaves, contraseñas ni datos de pago, y no puede mover XMR."
  - q: "¿Qué datos ve Telegram?"
    a: "Telegram sabe que hablas con el bot y ve el texto de los avisos. Por eso los avisos no llevan montos, direcciones ni datos de pago, y las apps borran de la URL los datos que Telegram agrega y no cargan scripts de telegram.org."
  - q: "¿Necesito cuenta para recibir alertas de anuncios nuevos?"
    a: "No. Con /alertas eliges si quieres ver anuncios de compra, de venta o ambos, y en qué monedas. No hace falta crear cuenta ni conectar nada."
  - q: "¿Cómo apago los avisos?"
    a: "Envía /stop al bot. Borra la conexión con tu cuenta y tus alertas. Bloquear el bot hace lo mismo."
  - q: "Alguien me escribió por Telegram para venderme Monero, ¿es el bot?"
    a: "No. El bot oficial nunca inicia conversaciones para ofrecer tratos, no chatea por la otra parte y nunca pide pagos, semillas ni contraseñas. Si una persona te escribe por Telegram para cerrar una compra o pedirte un pago fuera de una orden, es una estafa."
  - q: "¿En qué idiomas funciona el bot?"
    a: "En español e inglés, según el idioma de tu Telegram. El sitio de P2P Fiat está además en portugués y ruso, y el exchange en 10 idiomas."
---

**En resumen:** ya puedes **comprar y vender Monero (XMR) sin salir de Telegram**. El bot oficial [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) abre el [mercado P2P Fiat](https://fiat.monerop2p.app/es/) y el [exchange](/es/app/) como Mini App, te avisa cuando una orden avanza y te manda **alertas de anuncios nuevos** en tu moneda. **Sin KYC y sin custodia:** el escrow se firma en tu celular y el bot nunca toca tus fondos.

[Abrir el bot en Telegram →](https://t.me/MoneroP2PFiatBot)

## ¿Qué hace el bot?

| Comando | Qué hace | ¿Necesita cuenta? |
|---|---|---|
| Botón **P2P** | Abre el mercado para comprar o vender XMR con moneda local | Sí, se crea en segundos |
| `/alertas` | Te avisa de anuncios nuevos de compra, de venta o ambos, en las monedas que elijas | No |
| `/swap` | Abre el exchange para cambiar BTC, USDT, ETH y otras cripto por XMR, y te avisa cuando el intercambio avanza | No |
| `/ordenes` | Lista tus órdenes abiertas con un botón para abrir cada una | Sí |
| `/stop` | Apaga los avisos y borra tus alertas | No |

Además, si vendes y aceptas solicitudes fuera de línea, el bot te deja **aceptar o rechazar una solicitud desde el mensaje**, sin abrir la web.

## ¿Cómo compro Monero desde Telegram?

1. Abre [@MoneroP2PFiatBot](https://t.me/MoneroP2PFiatBot) y toca **Iniciar**.
2. Toca **P2P**. El mercado se abre dentro de Telegram. Crea tu cuenta con un apodo y una contraseña.
3. Elige tu moneda y método de pago y toma un anuncio.
4. El vendedor deposita el XMR en un **escrow multisig 2 de 3**. Tras 10 confirmaciones (unos 20 minutos) se abren el chat cifrado y sus datos de pago.
5. Paga, marca **«Ya pagué»** y espera a que el vendedor libere. El XMR llega a tu wallet.

Es el mismo mercado que en la web, con las mismas reglas. Los detalles están en [cómo funciona P2P Fiat](https://fiat.monerop2p.app/es/como-funciona/).

## ¿Cómo recibo alertas de anuncios nuevos?

Envía `/alertas` y elige con los botones qué quieres ver. También puedes escribir las monedas directamente, por ejemplo `/alertas MXN COP`.

- **Qué trae cada alerta:** precio, límites, métodos de pago y un botón que abre el mercado ya filtrado.
- **Qué no trae:** las condiciones del anuncio ni forma alguna de contactar al anunciante por fuera.
- **Cuándo llega:** 15 minutos después de publicado el anuncio, y solo si sigue activo.
- **Sin saturar:** como mucho una alerta por anunciante cada 6 horas.
- **Filtro contra estafas:** nunca se alertan anuncios que piden seguir por WhatsApp, Telegram o teléfono.

## ¿Puedo cambiar Bitcoin o USDT por Monero desde Telegram?

Sí. `/swap` abre el [exchange](/es/app/) dentro de Telegram: comparas cotizaciones para pasar de BTC, USDT, ETH y más de 2,500 monedas a XMR, o para [vender XMR](/es/novedades/vender-monero-por-usdt-o-bitcoin/). Si quieres, el bot te avisa cuando el intercambio cambia de estado: depósito detectado, enviando, completado, vencido o reembolsado.

Esos avisos usan un código que sirve para un solo chat, manda 10 avisos como máximo y vence a las 48 horas. No llevan montos ni direcciones.

## ¿Es seguro comprar Monero por Telegram?

Depende de con quién hables. Hay tres situaciones muy distintas:

| | Web de MoneroP2P | Bot oficial | Alguien que te escribe por Telegram |
|---|---|---|---|
| Quién guarda el XMR | Escrow multisig 2 de 3 | El mismo escrow | Nadie: confías en un desconocido |
| Te pide pagar por adelantado | No | No | Casi siempre |
| Chat con la otra parte | Cifrado, dentro de la orden | El mismo, dentro de la orden | Privado, sin respaldo |
| Si hay un problema | Apelación con soporte | Apelación con soporte | No hay a quién reclamar |

**El bot no es un chat con el vendedor.** Solo abre la plataforma y avisa. Por eso la regla de siempre sigue en pie: **nunca cierres un trato por mensajes privados de Telegram**. Si alguien te escribe para ofrecerte XMR, pedirte un pago fuera de una orden o «ayudarte» con tu cuenta, es una estafa.

Para reconocer al bot oficial:

- El usuario es exactamente **@MoneroP2PFiatBot**. Desconfía de nombres parecidos.
- **Nunca** pide tu semilla, tu contraseña, tu archivo de respaldo ni un pago.
- **Nunca** te escribe primero para ofrecer un trato.

Más reglas en [seguridad y estafas comunes](https://fiat.monerop2p.app/es/seguridad/).

## ¿Qué datos ve Telegram?

Telegram no es una app privada como Monero, así que el bot está hecho para darle lo mínimo:

- **Los avisos no llevan montos, direcciones ni datos de pago.** Solo dicen que algo cambió y traen un botón para abrir la orden.
- **Las llaves no salen de tu dispositivo.** Tu cuenta y el escrow se firman en tu celular; el bot nunca las ve.
- **Sin scripts de Telegram.** Las apps no cargan código de telegram.org y borran de la URL los datos que Telegram agrega al abrirlas.
- **Lo que Telegram sí sabe:** que usas el bot y cuándo recibes avisos. Si eso te importa, usa la web y activa los avisos del navegador.

El detalle está en la [política de privacidad](/es/privacidad/).

## Lo que no hace

- **No guarda fondos ni llaves**, y no puede mover XMR.
- **No sustituye las reglas del mercado:** el pago en dinero sigue ocurriendo fuera de la plataforma y el escrow protege el XMR, no la transferencia bancaria.
- **No habla todos los idiomas:** el bot responde en español e inglés.
- **No garantiza que haya anuncios en tu moneda.** El mercado es joven; las alertas sirven justo para enterarte cuando aparezca uno.

Qué se puede comprobar de la plataforma y qué límites tiene: [¿MoneroP2P es confiable?](/es/es-confiable/)

## Empezar

[Abrir @MoneroP2PFiatBot →](https://t.me/MoneroP2PFiatBot) · [Ver el mercado en la web →](https://fiat.monerop2p.app/es/app/) · [Cambiar cripto por XMR →](/es/app/)

¿Vienes de LocalMonero? Lee [alternativas a LocalMonero en 2026](/es/novedades/alternativas-a-localmonero-2026/).
