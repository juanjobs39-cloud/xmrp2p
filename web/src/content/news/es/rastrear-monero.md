---
key: monero-traceable
lang: es
slug: se-puede-rastrear-monero-xmr-vs-bitcoin-y-zcash
title: "¿Se puede rastrear Monero? XMR vs Bitcoin y Zcash en 2026"
description: "Qué oculta Monero, qué no, y en qué se diferencia de Bitcoin y Zcash. Además, qué cambia con FCMP++ y cómo usar XMR con más privacidad en 2026."
published: 2026-11-06
keywords:
  - se puede rastrear Monero
  - Monero es anónimo
  - Monero vs Bitcoin privacidad
  - Monero vs Zcash
  - criptomoneda más privada
  - FCMP++ Monero
  - cómo funciona la privacidad de Monero
  - firmas de anillo Monero
howto:
  name: "Cómo usar Monero con más privacidad"
  totalTime: PT20M
  steps:
    - name: "Usa una wallet sin custodia"
      text: "Guarda tu XMR en una wallet donde solo tú tienes la semilla, como MoneroP2P Wallet, Feather o Cake Wallet. Un exchange sabe quién eres y qué retiras."
    - name: "Recibe cada pago en una subdirección nueva"
      text: "Genera una subdirección distinta para cada pago o para cada persona. Así nadie puede relacionar tus cobros entre sí."
    - name: "Conéctate a un nodo de confianza"
      text: "Usa tu propio nodo o uno en el que confíes. El nodo ve tu dirección IP cuando envías una transacción."
    - name: "Compra sin KYC"
      text: "Compra XMR por P2P o con un atomic swap, sin entregar tu identidad a un exchange que ligue tu nombre con tus retiros."
    - name: "No muevas todo de golpe"
      text: "Evita mover el monto exacto que acabas de comprar justo después de recibirlo. Los patrones de tiempo y monto son las pistas que más se usan para adivinar."
faq:
  - q: "¿Se puede rastrear Monero?"
    a: "No de la forma en que se rastrea Bitcoin. En la blockchain de Monero no se ven el remitente, el destinatario ni el monto, porque usa direcciones ocultas, firmas de anillo y RingCT. Lo que sí puede filtrar información es lo que pasa fuera de la blockchain: un exchange con KYC, un nodo que registra tu IP o patrones de tiempo y montos."
  - q: "¿Monero es 100 % anónimo?"
    a: "Ninguna tecnología es 100 % anónima. Monero oculta por defecto quién envía, quién recibe y cuánto, pero las firmas de anillo esconden al remitente entre 16 posibles, y con análisis estadístico se puede estimar cuál es el real en algunos casos. La mejora FCMP++ busca eliminar esa debilidad."
  - q: "¿Qué es FCMP++?"
    a: "Full-Chain Membership Proofs (pruebas de pertenencia a toda la cadena). Reemplaza las firmas de anillo de 16 miembros: en lugar de esconder tu salida entre 16, la esconde entre todas las salidas de la blockchain. A noviembre de 2026 todavía no está activa en la red principal; un borrador no oficial de los desarrolladores apunta a marzo de 2027."
  - q: "¿Qué es más privado, Monero o Zcash?"
    a: "Zcash tiene criptografía muy fuerte (zk-SNARKs) cuando usas direcciones protegidas, pero la privacidad es opcional y también existen direcciones transparentes como las de Bitcoin. En Monero todas las transacciones son privadas, así que no destacas por usarlas. Por eso Monero suele considerarse más privado en la práctica."
  - q: "¿Bitcoin es anónimo?"
    a: "No. Bitcoin es seudónimo: todas las transacciones, direcciones y montos son públicos para siempre. Empresas de análisis de cadena relacionan direcciones con personas a partir de exchanges con KYC y patrones de uso."
  - q: "¿Es legal usar Monero?"
    a: "En la mayoría de los países tener y usar Monero es legal. Lo que se ha restringido es que los exchanges regulados lo ofrezcan; en la Unión Europea esa prohibición aplica desde julio de 2027. Revisa las leyes de tu país."
---

**En resumen:** en la blockchain de **Monero (XMR) no se ven el remitente, el destinatario ni el monto** de ninguna transacción, así que **no se puede rastrear como Bitcoin**, donde todo es público. Monero logra esto con **direcciones ocultas, firmas de anillo de 16 miembros y RingCT**, y lo aplica a todas las transacciones por defecto, a diferencia de **Zcash**, donde la privacidad es opcional. Sus puntos débiles están fuera de la blockchain: **exchanges con KYC, tu IP y los patrones de uso**. La próxima mejora, **FCMP++**, todavía no está activa (borrador para **marzo de 2027**) y reforzará justo la parte más débil.

[Comprar Monero sin KYC →](/es/comprar-monero/)

## Monero vs Bitcoin vs Zcash: tabla comparativa

| | Monero (XMR) | Bitcoin (BTC) | Zcash (ZEC) |
|---|---|---|---|
| Privacidad por defecto | Sí, en todas las transacciones | No | No, es opcional |
| Remitente | Oculto (firma de anillo de 16) | Público | Oculto solo en direcciones protegidas |
| Destinatario | Oculto (direcciones ocultas) | Público | Oculto solo en direcciones protegidas |
| Monto | Oculto (RingCT) | Público | Oculto solo en direcciones protegidas |
| Origen IP al enviar | Protegido con Dandelion++ | Visible para los nodos | Visible para los nodos |
| Cómo se ve en un explorador | Solo datos cifrados | Todo el historial | Depende del tipo de dirección |
| Auditar tu propia wallet | Llave de visualización (view key) | Siempre público | Llave de visualización |
| Minería | RandomX (CPU) | SHA-256 (ASIC) | Equihash (ASIC) |
| Tiempo por bloque | ~2 minutos | ~10 minutos | ~75 segundos |

La diferencia clave es **por defecto**. Si una moneda permite elegir entre transacciones públicas y privadas, quien usa las privadas destaca. En Monero todas se ven igual, así que tu transacción se mezcla con todas las demás.

## Cómo oculta Monero cada dato

### Quién recibe: direcciones ocultas (stealth addresses)
Cada vez que alguien te paga, la wallet del que envía crea una **dirección de un solo uso** derivada de la tuya. En la blockchain nunca aparece tu dirección pública, así que nadie puede ver cuántos pagos recibiste. Encima puedes usar **subdirecciones**: una distinta para cada persona o cada pago.

### Quién envía: firmas de anillo
Cuando gastas XMR, tu transacción lo firma junto con **15 salidas de otras personas** tomadas de la blockchain (16 en total desde la actualización de agosto de 2022). Un observador sabe que una de las 16 es la real, pero no cuál. Una **key image** impide gastar dos veces la misma salida sin revelar cuál fue.

### Cuánto: RingCT
Desde enero de 2017 los montos están cifrados con **Ring Confidential Transactions**. La red comprueba que no se crean monedas de la nada sin ver las cantidades.

### Desde dónde: Dandelion++
Desde 2020 las transacciones primero pasan por varios nodos al azar antes de difundirse a toda la red. Eso dificulta saber qué IP la envió primero.

## Entonces, ¿se puede rastrear Monero?

En la blockchain, no como Bitcoin. Pero hay límites que conviene conocer:

- **Las firmas de anillo son probabilísticas.** Esconden al remitente entre 16, no entre todos. Con análisis estadístico (la edad de las salidas, gastos encadenados o un mismo actor que controla varios señuelos) se puede **estimar** cuál es la real en algunos casos. No es una prueba, pero reduce el anonimato.
- **El nodo ve tu IP.** Si usas el nodo de un tercero, ese nodo sabe desde qué IP enviaste. En 2024 se filtró un video de una empresa de análisis de cadena que decía relacionar transacciones de Monero usando **nodos maliciosos** que registraban IPs.
- **El KYC te delata fuera de la cadena.** Si compras XMR en un exchange que tiene tu identificación, el exchange sabe que retiraste tal monto a tal hora. Con eso puede adivinar hacia dónde fue.
- **Los patrones hablan.** Mover el monto exacto que acabas de recibir, siempre a la misma hora, hace más fácil adivinar.

Ninguno de estos límites rompe la criptografía de Monero; todos aprovechan información que tú dejas alrededor. Por eso la forma en que lo usas importa tanto como la moneda.

## FCMP++: lo que viene

**FCMP++ (Full-Chain Membership Proofs)** reemplaza las firmas de anillo. En lugar de esconder tu salida entre 16, la esconde **entre todas las salidas de la historia de Monero**, más de cien millones. Con eso desaparecen casi todos los ataques estadísticos contra los anillos. Llega junto con **Carrot**, un nuevo esquema de direcciones.

**Estado a noviembre de 2026:**
- En octubre de 2026 se está probando en **redes de prueba** (testnet y stressnet), no en la red principal.
- Un borrador de los desarrolladores, que ellos mismos llaman **no vinculante**, apunta a activarlo en la red principal alrededor de **marzo de 2027**.
- **No hay fecha oficial.** Revisa [getmonero.org](https://www.getmonero.org/) antes de fiarte de cualquier fecha.

Cuando llegue no tienes que hacer nada especial con tu XMR: basta con actualizar la wallet a una versión compatible.

## Cómo usar Monero con más privacidad

1. **Wallet sin custodia.** Usa una wallet donde solo tú tengas la semilla, como [MoneroP2P Wallet](/es/wallet/), Feather o Cake Wallet. Guía: [cómo crear una wallet de Monero](/es/guias/como-crear-una-wallet-de-monero/).
2. **Una subdirección nueva por pago.** MoneroP2P Wallet ya crea una distinta cada vez que abres «Recibir».
3. **Nodo de confianza.** Usa tu propio nodo si puedes; en MoneroP2P Wallet se cambia en Ajustes.
4. **Compra sin KYC.** Usa [P2P Fiat](https://fiat.monerop2p.app/es/) con tu moneda local o un [atomic swap de USDT a XMR](/es/guias/como-cambiar-usdt-a-monero-sin-intermediarios/). Más opciones en [cómo comprar Monero sin KYC](/es/guias/como-comprar-monero-sin-kyc/).
5. **Espera y no copies montos.** Deja pasar un tiempo antes de volver a mover lo que recibiste y no reenvíes la cifra exacta.

## Otras «monedas privadas» frente a Monero

- **Litecoin (MWEB):** privacidad opcional en una extensión aparte de la cadena; la mayoría de los usos siguen siendo públicos.
- **Dash:** su función de mezcla (CoinJoin) es opcional y los montos siguen visibles.
- **Bitcoin con CoinJoin:** mezclar ayuda, pero las salidas mezcladas son reconocibles y algunos exchanges las bloquean.

En todas, la privacidad es un extra que hay que activar. En Monero es la regla.

## Preguntas frecuentes

### ¿Se puede rastrear Monero?
No como Bitcoin: en la blockchain no se ven remitente, destinatario ni monto. Lo que puede delatarte está fuera de la cadena: KYC, tu IP y tus patrones.

### ¿Monero es 100 % anónimo?
Nada lo es. Las firmas de anillo esconden al remitente entre 16 y el análisis estadístico puede estimar el real en algunos casos. FCMP++ busca resolverlo.

### ¿Qué es FCMP++?
La mejora que esconde tu salida entre todas las de la blockchain en vez de entre 16. A noviembre de 2026 no está activa; el borrador apunta a marzo de 2027.

### ¿Qué es más privado, Monero o Zcash?
En la práctica, Monero, porque su privacidad es obligatoria. Zcash es muy fuerte con direcciones protegidas, pero también admite transacciones públicas.

### ¿Bitcoin es anónimo?
No. Es seudónimo y todo su historial es público.

### ¿Es legal usar Monero?
En la mayoría de los países sí. Lo que se restringe es que los exchanges regulados lo ofrezcan: lee [por qué deslistaron Monero](/es/novedades/monero-deslistado-donde-comprar-xmr-en-2026/).

Para entender lo básico, lee [qué es Monero y en qué se diferencia de Bitcoin](/es/guias/que-es-monero/). Usar cripto tiene riesgos: revisa el [aviso de riesgos](/es/aviso-de-riesgos/).

[Comprar Monero sin KYC →](/es/comprar-monero/)
