---
key: account-wallet
lang: es
slug: wallet-de-monero-y-usdt-sin-custodia-en-tu-cuenta
title: "Wallet de Monero y USDT sin custodia en tu cuenta de MoneroP2P"
description: "Tu cuenta de MoneroP2P ahora trae wallet de Monero (XMR), USDT y ETH en Arbitrum: sin KYC, sin custodia, con envíos por @apodo y 12 palabras de respaldo."
published: 2026-11-15
keywords:
  - wallet de Monero sin custodia
  - wallet de Monero web
  - wallet de Monero y USDT
  - wallet XMR sin KYC
  - enviar Monero por apodo
  - guardar Monero en el navegador
  - wallet USDT Arbitrum sin registro
  - cambiar USDT por Monero desde wallet
  - cuenta MoneroP2P
mentions:
  - name: MoneroP2P Fiat
    url: https://fiat.monerop2p.app/es/
    description: "Mercado P2P para comprar y vender Monero (XMR) con moneda local, con escrow multisig 2 de 3 y sin KYC. Cada cuenta incluye una wallet sin custodia de Monero, USDT y ETH en Arbitrum."
  - name: MoneroP2P
    url: https://monerop2p.app/es/app/
    description: "Exchange sin cuenta para cambiar USDT, BTC, ETH y otras cripto por Monero (XMR)."
howto:
  name: "Cómo crear tu wallet de Monero y USDT en MoneroP2P"
  totalTime: PT5M
  steps:
    - name: "Abre la app y toca «Crear cuenta»"
      text: "Entra a fiat.monerop2p.app/es/app/. Arriba verás la franja de cuenta con el botón «Crear cuenta». No pide correo, teléfono ni identificación."
    - name: "Elige un apodo y una contraseña"
      text: "El apodo es público; la contraseña (mínimo 10 caracteres) cifra tu cuenta en el navegador. No se puede recuperar si la olvidas."
    - name: "Guarda tu respaldo"
      text: "Descarga el archivo de respaldo cifrado y guárdalo fuera del dispositivo. Con él y tu contraseña recuperas la cuenta en otro teléfono o computadora."
    - name: "Copia tu dirección para recibir"
      text: "En «Wallet» verás tu dirección de Monero y tu dirección de Arbitrum (la misma para USDT y ETH), cada una con su código QR."
    - name: "Envía, cobra o cambia"
      text: "Envía a una dirección o a otro usuario por @apodo, crea un enlace de cobro, o toca «Cambiar monedas» para pasar de USDT a XMR sin copiar direcciones."
faq:
  - q: "¿MoneroP2P guarda mis fondos o mis llaves?"
    a: "No. Las llaves se crean en tu navegador a partir de una semilla de 12 palabras y se guardan cifradas con tu contraseña. El servidor nunca las recibe, así que MoneroP2P no puede ver, mover ni congelar tus fondos, y tampoco recuperarlos si pierdes el respaldo y la contraseña."
  - q: "¿Qué monedas tiene la wallet de la cuenta?"
    a: "Monero (XMR) en su red principal, y USDT y ETH en Arbitrum One. La dirección de Arbitrum es una cuenta tipo Ethereum estándar: la misma sirve para USDT y para ETH."
  - q: "¿Cuánto cuesta usar la wallet?"
    a: "Crear la cuenta, recibir y enviar a otro usuario por @apodo no pagan comisión de la plataforma. Retirar a una dirección externa paga 0.5 %, que aparece en su propia línea antes de confirmar. No se cobra en retiros muy chicos (menos de unos 0.002 XMR, 10 USDT o 0.004 ETH), ni al depositar al escrow de una orden o al depósito de un cambio. La comisión de la red se paga aparte."
  - q: "¿Cómo recupero mi wallet si pierdo el teléfono?"
    a: "Con el archivo de respaldo y tu contraseña, o con las 12 palabras de la cuenta. Las 12 palabras recuperan el apodo y las wallets; las llaves de los escrows de órdenes abiertas solo están en el archivo de respaldo, por eso conviene descargarlo de nuevo después de cada orden."
  - q: "¿Puedo sacar mis llaves y usar otra wallet?"
    a: "Sí. En Wallet → Más opciones puedes exportar las 12 palabras de la cuenta, la semilla de Monero de 25 palabras (para Cake Wallet, Feather o la wallet oficial) y la llave privada de Arbitrum (para MetaMask y similares)."
  - q: "¿Es obligatorio tener cuenta para cambiar cripto por Monero?"
    a: "No. El exchange sin cuenta sigue igual en monerop2p.app. La cuenta es opcional: sirve para que lo que cambias llegue a tu wallet sin copiar direcciones."
  - q: "¿Qué tan privado es enviar por @apodo?"
    a: "Si activas «Recibir por apodo», tu dirección queda ligada a tu apodo y cualquiera puede consultarla. En Monero eso no revela lo que recibes; en Arbitrum sí, porque esa red es pública. Está apagado hasta que tú lo enciendes."
---

**En resumen:** cada cuenta de [MoneroP2P Fiat](https://fiat.monerop2p.app/es/) ahora incluye una **wallet sin custodia de Monero (XMR), USDT y ETH en Arbitrum**. Se crea en tu navegador con un apodo y una contraseña, **sin correo ni KYC**; las llaves nunca salen de tu dispositivo. Puedes recibir, enviar a una dirección o a otro usuario por **@apodo**, pagar el escrow de una orden P2P y cambiar entre tus monedas sin copiar direcciones.

[Crear mi cuenta y mi wallet →](https://fiat.monerop2p.app/es/app/#/cuenta)

## ¿Qué trae la wallet de la cuenta?

| Función | Cómo funciona |
|---|---|
| **Recibir** | Una dirección de Monero y una de Arbitrum (USDT y ETH), con código QR. |
| **Enviar** | A una dirección o a un @apodo. Siempre hay una pantalla de revisión con el monto, las comisiones y el total antes de confirmar. |
| **Enviar por @apodo** | Escribes `@apodo` en lugar de una dirección larga. Sin comisión de la plataforma. |
| **Cobrar con enlace** | Creas un enlace o QR con moneda y monto; quien lo abre con su cuenta solo revisa y confirma. |
| **Cambiar** | Pasas de USDT a XMR (y al revés) entre tus propias wallets: el depósito sale solo y lo que compras llega a tu wallet. |
| **Pagar el escrow** | Si vendes XMR en el mercado P2P, depositas al escrow desde tu wallet con un botón. |
| **Historial** | Movimientos de Monero con confirmaciones y enlace al explorador. |
| **Exportar llaves** | 12 palabras de la cuenta, semilla de Monero de 25 palabras y llave privada de Arbitrum. |

## ¿Quién guarda mis llaves?

Tú. La cuenta nace de una **semilla de 12 palabras** que se genera en tu navegador. De ella salen la llave de tu cuenta, tu wallet de Monero y tu cuenta de Arbitrum. Todo se guarda **cifrado con tu contraseña** en el navegador y en tu archivo de respaldo.

- El servidor nunca recibe tu contraseña, tu semilla ni tus llaves.
- MoneroP2P **no puede mover ni congelar** tus fondos.
- Por lo mismo, **nadie puede recuperarlos** si pierdes el respaldo y la contraseña. Guarda el respaldo fuera del dispositivo.

Para ver o exportar tus llaves la app vuelve a pedir tu contraseña, así que alguien que encuentre la pestaña abierta no puede verlas.

## ¿Cómo envío Monero o USDT a otro usuario por @apodo?

1. En «Wallet», abre la pestaña **Enviar** de Monero o de Arbitrum.
2. Escribe `@apodo` como destino y el monto.
3. Revisa y confirma.

La dirección de cada usuario va **firmada con la llave de su cuenta**, y tu navegador comprueba esa firma antes de enviar. Así, ni el servidor ni quien lo comprometiera puede cambiar la dirección de alguien por otra. La app recuerda a quién ya le enviaste y **bloquea el envío si ese apodo pasa a ser de otra cuenta**.

Recibir por apodo está apagado hasta que lo activas en Wallet → Más opciones.

## ¿Cuánto cuesta?

| Operación | Comisión de MoneroP2P |
|---|---|
| Crear cuenta y recibir | 0 |
| Enviar a otro usuario por @apodo | 0 |
| Depositar al escrow de una orden P2P | 0 |
| Depósito de un cambio | 0 |
| Retirar a una dirección externa | **0.5 %** |
| Retiros muy chicos (menos de unos 0.002 XMR, 10 USDT o 0.004 ETH) | 0 |

La comisión se muestra **en su propia línea** en la pantalla de revisión, junto con el total que sale de tu wallet. La comisión de la red (Monero o Arbitrum) se paga aparte; para enviar USDT necesitas un poco de ETH en Arbitrum.

## ¿Necesito cuenta para cambiar cripto por Monero?

No. El [exchange sin cuenta](/es/app/) sigue igual: eliges las monedas, pones tu dirección y envías el depósito desde tu propia wallet.

Con cuenta es más cómodo: en «Cambiar monedas» eliges de qué wallet sale y a cuál llega, y la app envía el depósito después de una pantalla de revisión. Esos cambios pasan por **exchanges instantáneos** elegidos con el comparador (solo con calificación A o B de KYC): durante los minutos que dura el cambio, el exchange tiene las monedas. La wallet es sin custodia; el cambio, no.

## Lo que debes saber antes de usarla

- **Es nueva.** Empieza con montos chicos hasta que le tengas confianza.
- **La wallet de Monero sincroniza en tu navegador.** La primera vez puede tardar unos minutos.
- **Lo recién recibido en Monero tarda unos 20 minutos** (10 confirmaciones) en poder gastarse.
- **Arbitrum es una red pública:** quien conozca tu dirección puede ver lo que recibes ahí. Monero no.
- **Usa solo la red Arbitrum** para USDT y ETH. Si envías por otra red, los fondos se pierden.

¿Prefieres una wallet instalada en el navegador? Mira [MoneroP2P Wallet, la extensión para Chrome y Firefox](/es/novedades/monerop2p-wallet-extension-de-monero-para-chrome-y-firefox/) o la comparativa de [las mejores wallets de Monero en 2026](/es/novedades/mejores-wallets-de-monero-2026/).

## Preguntas frecuentes

### ¿MoneroP2P guarda mis fondos o mis llaves?
No. Las llaves se crean y se quedan en tu navegador, cifradas con tu contraseña.

### ¿Qué monedas tiene la wallet?
Monero (XMR), y USDT y ETH en Arbitrum One.

### ¿Cuánto cuesta usarla?
Recibir y enviar por @apodo no pagan comisión de la plataforma. Retirar a una dirección externa paga 0.5 %, visible antes de confirmar.

### ¿Cómo la recupero si pierdo el teléfono?
Con el archivo de respaldo y tu contraseña, o con las 12 palabras de la cuenta.

### ¿Puedo llevarme mis llaves a otra wallet?
Sí: exportas las 12 palabras, la semilla de Monero de 25 palabras y la llave privada de Arbitrum.

### ¿Es obligatorio tener cuenta para cambiar cripto por Monero?
No. El [exchange sin cuenta](/es/app/) sigue disponible.

Usar cripto tiene riesgos: lee el [aviso de riesgos](/es/aviso-de-riesgos/).

[Crear mi cuenta y mi wallet →](https://fiat.monerop2p.app/es/app/#/cuenta) · [Comprar Monero con moneda local →](https://fiat.monerop2p.app/es/app/)

¿Usas Telegram? El mercado también se abre ahí, con avisos de tus órdenes: [comprar y vender Monero por Telegram](/es/novedades/comprar-monero-por-telegram-bot/).
