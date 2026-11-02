# Plan: pestaña «P2P Fiat» (XMR ↔ dinero fiat, estilo Binance P2P)

Estado: **plan aprobado en lo principal** — escrow **multisig 2 de 3** con el árbitro en **Cloudflare Containers**. Primero solo en la beta (beta.monerop2p.app), sin KYC.

## 1. Qué es

Un mercado donde las personas publican **anuncios** para comprar o vender Monero a cambio de dinero fiat (transferencia, depósito, efectivo, etc.). El dinero fiat **nunca pasa por la plataforma**: va directo de comprador a vendedor. El Monero queda en **depósito de garantía (escrow)** mientras dura la orden. Si hay una queja, el administrador revisa las pruebas y decide quién se queda con el XMR.

- Comisión: **0.5 %** del XMR de cada orden completada, la paga **quien vende Monero** (sale del escrow al liberar). Configurable desde el panel. Si la orden se cancela, no hay comisión.
- Sin cuentas con correo y sin KYC: cada usuario es una **llave generada en su navegador**, con un apodo y una reputación pública.

## 2. El escrow: multisig 2 de 3 (decidido)

Binance guarda el cripto en su propia wallet. Monero no tiene contratos inteligentes, así que hay dos maneras de hacer un escrow:

| | **A. Multisig 2 de 3 (recomendado)** | B. Wallet de la plataforma (como Binance) |
|---|---|---|
| Quién tiene llaves | Vendedor, comprador y **árbitro (tú)**, una cada uno | Solo la plataforma |
| Para mover el XMR | Se necesitan **2 de las 3** firmas | La plataforma sola |
| Si hackean el servidor | No pueden robar: el árbitro solo tiene 1 de 3 llaves | Se roban **todo** lo depositado |
| Tú como custodio | No guardas fondos de nadie | Guardas el dinero de todos |
| Quejas | Tú decides y firmas junto con el ganador | Tú decides y mueves los fondos |
| Dificultad | Alta (lo usa Haveno, el exchange P2P de Monero) | Media |
| Encaja con la marca «sin custodia» | Sí | No |

**Decisión: A (multisig 2 de 3).** Funciona igual que Binance para el usuario (depositar, pagar, liberar, apelar), pero ni tú ni un atacante pueden mover el dinero solos.

### Cómo se firma en cada caso (multisig)

- **Orden normal:** el vendedor confirma que recibió el fiat y presiona «Liberar». Su firma más la del árbitro, que firma sola de forma automática, envían el XMR al comprador y la comisión a la plataforma. El comprador no tiene que firmar nada.
- **Cancelación o tiempo agotado:** firma del vendedor más la del árbitro, que firma solo si el comprador canceló o se le acabó el tiempo **antes** de marcar «Ya pagué» → el XMR regresa al vendedor, sin comisión. El comprador no firma nada.
- **Queja:** tú decides en el panel de administrador. Firman tu llave de árbitro y la del ganador.
- **Regla de seguridad del árbitro:** solo co-firma transacciones que paguen a las direcciones guardadas al crear la orden (pago del comprador, reembolso del vendedor y comisión). Las decisiones de queja van **firmadas con tu llave de administrador**. Así, aunque alguien tomara el servidor, no podría desviar fondos.

### Dónde vive el árbitro: Cloudflare Containers (decidido)

Las firmas multisig de Monero necesitan monero-ts corriendo en Node, y un Worker normal no puede hacerlo. Por eso el árbitro corre en un **Cloudflare Container** (imagen Docker con Node + monero-ts), administrado por Cloudflare junto al resto de la plataforma:

- **Se despierta cuando hace falta.** Lo despierta el Worker: cuando se crea una orden (para armar el multisig), cuando hay que firmar y, cada pocos minutos, para revisar depósitos pendientes. Se duerme solo tras unos minutos sin trabajo (por defecto, 10), y solo se cobra el tiempo que está prendido.
- **No guarda nada en disco** (el disco se borra al apagarse):
  - la **semilla del árbitro** va como **secreto de Cloudflare** (`ARBITER_SEED`), igual que la llave de Trocador; nunca en el repositorio ni en el chat;
  - el **estado multisig de cada orden** se guarda **cifrado** en el Durable Object de la orden (o en R2) y se carga al despertar.
- **Se conecta a un nodo público de Monero** para ver depósitos y enviar transacciones, como la app.
- **Requisito:** plan pagado de Workers (~5 USD/mes).
- **Si alguien tomara la cuenta de Cloudflare**, solo tendría 1 de las 3 llaves de cada orden: no puede mover fondos.
- **Plan B:** si en stagenet el contenedor da problemas (por ejemplo, lo que tarda en despertar), el mismo programa se pasa a un VPS sin cambiar el resto del diseño.
- Antes de construir se confirma el estado actual del servicio (estable o beta) y sus límites.

## 3. Cómo funciona una orden (igual que Binance)

```
Anuncio ──▶ Orden creada ──▶ Escrow listo ──▶ Vendedor deposita XMR ──▶ 10 confirmaciones (~20 min)
   ──▶ Comprador paga el fiat y marca «Ya pagué» ──▶ Vendedor confirma y «Libera» ──▶ XMR al comprador
                                     └──▶ Queja (cualquiera, pasado un tiempo) ──▶ Tú decides
```

Estados: `creada → escrow_listo → esperando_deposito → confirmando → esperando_pago → pagada → liberada`, y además `cancelada`, `en_queja`, `resuelta_comprador` o `resuelta_vendedor`.

Reglas, como en Binance:
- El comprador puede cancelar **antes** de marcar «Ya pagué». Después, ya no.
- Si el comprador no marca «Ya pagué» a tiempo (15–30 min, lo define el anuncio), la orden se cancela sola y el XMR regresa al vendedor.
- El vendedor **no puede cancelar** una orden marcada como pagada: solo liberar o abrir queja.
- La queja se puede abrir pasados unos minutos desde «Ya pagué» (por ejemplo, 15) si el vendedor no ha liberado.
- Los tiempos agotados los revisa la tarea programada que ya existe (cada 5 minutos).

**Diferencia con Binance:** antes de que el comprador pague hay que esperar unos 20 minutos, mientras el depósito del vendedor se confirma en la red de Monero. Haveno funciona igual. Más adelante se puede ofrecer «anuncios con XMR ya depositado» para quitar esa espera.

## 4. Pantallas de la beta

### Pestaña «P2P Fiat» (`/en/p2p/`, solo en beta)
- **Comprar / Vender** arriba, como Binance.
- **Filtros:** **selector de moneda fiat** con buscador (como el de criptomonedas de la app), **país**, método de pago y monto.
- **Lista de anuncios:** apodo, órdenes completadas, % de órdenes terminadas, tiempo promedio de liberación, precio, límites (mín–máx), métodos de pago y botón «Comprar XMR» / «Vender XMR».
- **Precio:** fijo, o variable como % sobre el precio de mercado (con la API de precio que ya existe, `/v1/price`).

### Selector de moneda fiat
- Mismo estilo que el selector de criptomonedas actual: lista con bandera o símbolo, y buscador.
- Primero las más usadas: **MXN, USD, EUR**, COP, ARS, BRL, CLP, PEN, GBP, CAD; después **todas las monedas del mundo** (lista ISO 4217), buscables por código o nombre.
- Se recuerda la última moneda elegida, y la primera vez se sugiere según el país del visitante.

### Métodos de pago: sugeridos + libres
- **Sugeridos por moneda**, para elegir con un clic:
  - MXN: SPEI, depósito en OXXO, efectivo en persona;
  - USD: transferencia bancaria, Zelle, efectivo en persona;
  - EUR: SEPA, Revolut, Wise, efectivo en persona;
  - otros: PayPal, Mercado Pago, Pix (BRL), Nequi (COP), etc.
- **Método libre:** el vendedor puede crear el suyo eligiendo **país**, **moneda** y **tipo** (banco, billetera digital como PayPal, efectivo, tarjeta de regalo u otro), y escribir el **nombre** del banco o servicio (por ejemplo «BBVA México», «Banorte», «PayPal»).
- Cada método guarda los datos que se le muestran al comprador (titular, CLABE o cuenta, correo de PayPal, etc.). Se cifran y solo los ve el comprador de esa orden.
- Los métodos **reversibles** (PayPal, tarjetas, algunas billeteras) sí se permiten, pero llevan una **etiqueta de riesgo** visible para el vendedor (ver punto 8).
- Desde el panel puedes ocultar o bloquear un método si da problemas.

### Crear anuncio
Tipo (compro o vendo XMR), **moneda fiat (selector)**, **país**, precio fijo o margen, cantidad total, límites por orden, **métodos de pago (sugeridos o libres)**, tiempo para pagar y condiciones.

### Pantalla de la orden
- Pasos con **temporizador**.
- **Datos de pago del vendedor**, visibles solo para el comprador de esa orden y cifrados.
- Botones «Ya pagué» / «Liberar» / «Cancelar» / «Apelar».
- **Chat cifrado** con adjuntos (comprobantes). Cada mensaje se cifra para comprador, vendedor y la llave de administrador, para que puedas leerlo **solo si hay queja**.
- Calificación al terminar (👍/👎 y comentario).

### Perfil
Apodo, reputación, métodos de pago guardados (cifrados en el navegador), respaldo y recuperación de la llave, y respaldo del estado de las wallets multisig.

### Avisos
Notificaciones del navegador (Web Push, sin cuenta) cuando cambia una orden o llega un mensaje. Más adelante, opcional, avisos por Telegram.

## 5. Panel de administrador (solo para ti)

Ruta separada (por ejemplo `admin.monerop2p.app`) protegida dos veces:
1. **Cloudflare Access** (gratis), con tu correo y código.
2. Cada acción va **firmada con tu llave de administrador** desde el navegador. El servidor y el árbitro rechazan lo que no esté firmado.

Funciones:
- **Quejas:** lista con prioridad y tiempo de espera; detalle con el chat descifrado, comprobantes, línea de tiempo de la orden y reputación de ambos.
- **Decidir:** «Liberar al comprador» o «Devolver al vendedor», con nota → el árbitro firma.
- **Usuarios y anuncios:** suspender o bloquear, y ocultar anuncios.
- **Ajustes:** % de comisión, monedas fiat y métodos de pago permitidos, límites de la beta y tiempos.
- **Números:** órdenes del día, volumen, comisiones ganadas y quejas abiertas.
- **Estado del árbitro:** en línea o no, saldo de comisiones y cola de firmas.

## 6. Qué se construye (técnico)

**Backend (`workers/`):**
- Migración `0004_p2p_fiat.sql` con las tablas `p2p_users`, `p2p_ads`, `p2p_orders`, `p2p_disputes`, `p2p_feedback`, `p2p_payment_methods` (sugeridos y libres: país, moneda, tipo, nombre, reversible sí/no) y `p2p_settings` (comisión 0.5 %, límites).
- Lista de monedas fiat (ISO 4217) y precio XMR en cada moneda a partir de la API de precio actual.
- Rutas `/v1/p2p/*`, con cada escritura firmada por la llave del usuario, igual que hoy con los makers.
- Un Durable Object `P2POrderRoom` por orden para el chat, los estados en tiempo real y el canal con el árbitro.
- **R2** para los comprobantes cifrados.
- Límites por IP y por usuario; tiempos agotados en la tarea programada.

**Árbitro (`arbiter/`, nuevo — Cloudflare Container):**
- Imagen Docker con Node + monero-ts, declarada en `wrangler.toml` y controlada desde un Durable Object `Arbiter`.
- Crea su parte del multisig de cada orden, revisa depósitos y co-firma según las reglas del punto 2.
- Verifica las firmas del vendedor (liberar) y del administrador (quejas) antes de firmar.
- Semilla en el secreto `ARBITER_SEED`; estado multisig cifrado fuera del contenedor.

**App web (`web/`):**
- Páginas `p2p/`, `p2p/order/`, `p2p/ad/` y `p2p/profile/`.
- Multisig en `monero-entry.js` (monero-ts ya está cargado): preparar, intercambiar llaves, importar y exportar información, y firmar.
- Llave del usuario y estado de las wallets guardados en el navegador (IndexedDB cifrado) con archivo de respaldo.

**Panel (`web/` o un sitio aparte):** `admin/`, solo en el sitio de administrador.

## 7. Fases

| Fase | Qué | Dónde se prueba |
|---|---|---|
| 0 | Decisiones del punto 9, diseño de pantallas | — |
| 1 | Backend: tablas, anuncios, órdenes, chat, reglas de tiempo | Pruebas automáticas |
| 2 | Árbitro en Cloudflare Container + multisig 2 de 3 de punta a punta | **Stagenet** (XMR de prueba) |
| 3 | Pantallas P2P Fiat + perfil + avisos | Beta con stagenet y «fiat de juguete» |
| 4 | Panel de administrador y flujo de quejas | Beta con stagenet |
| 5 | Pruebas completas con dos navegadores (comprar, vender, cancelar, tiempo agotado, queja ganada por cada lado) | Stagenet |
| 6 | **Beta con dinero real** con tope de 1,000 USD por orden | beta.monerop2p.app |
| 7 | Traducción a los 10 idiomas y paso al sitio principal, con tu visto bueno | monerop2p.app |

Es la función más grande hasta ahora: más que el swap de USDT y Trocador juntos.

## 8. Riesgos y cómo se cubren

- **Estafas típicas del P2P fiat** (comprobante falso, pago de un tercero, contracargos):
  - los métodos **reversibles** (PayPal, tarjetas, algunas billeteras) se permiten, pero con **etiqueta de riesgo** y aviso al vendedor: «El comprador puede revertir este pago después de que liberes»; en las quejas pesa ese riesgo;
  - el vendedor puede exigir en su anuncio un mínimo de órdenes completadas para métodos reversibles;
  - aviso fijo: «Libera solo cuando veas el dinero en tu banco».
- **Usuarios nuevos:** límite menor hasta tener X órdenes completadas.
- **Pérdida de la llave o del estado multisig de un usuario:** respaldo obligatorio al primer uso. Si el comprador pierde su estado, la queja se resuelve con la firma del vendedor más la tuya, y viceversa.
- **Multisig de Monero:** sigue marcado como «experimental» en Monero, aunque Haveno lo usa en producción. Por eso: stagenet primero, pruebas completas y una revisión de código antes de abrir con dinero real (con un tope de 1,000 USD por orden, un error costaría más que en el swap de USDT).
- **Árbitro caído o tardando en despertar:** las órdenes esperan hasta que vuelva, pero nadie pierde fondos. El panel avisa si el árbitro falla.
- **Secretos:** la semilla del árbitro va solo como secreto de Cloudflare, y tu llave de administrador solo en tu navegador o wallet. **Nunca** van al repositorio ni al chat.

## 9. Decisiones

Ya decididas:
- **Escrow:** multisig 2 de 3.
- **Árbitro:** Cloudflare Containers (plan pagado de Workers).
- **Comisión:** 0.5 %, la paga quien vende XMR.
- **Monedas:** selector con todas las monedas fiat (MXN, USD y EUR primero) y filtro por país.
- **Métodos de pago:** sugeridos por moneda + métodos libres (país, moneda, tipo de banco o billetera, incluido PayPal), con etiqueta de riesgo para los reversibles.
- **Tope por orden:** el equivalente a **1,000 USD** en XMR (calculado con el precio de mercado al crear la orden). Se puede cambiar desde el panel sin tocar código.

Todo decidido; lo siguiente es la fase 1 (backend).
