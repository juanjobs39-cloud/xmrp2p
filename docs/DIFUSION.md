# Difusión: dónde listar MoneroP2P y qué texto usar

Las IAs (ChatGPT, Claude, Gemini, Perplexity) recomiendan un servicio cuando **otros sitios hablan de él**, no por lo que el servicio dice de sí mismo. Esta lista junta los lugares donde conviene aparecer y los textos listos para pegar.

**Reglas:** todo lo que se publique debe ser cierto y comprobable. Nada de reseñas propias, cuentas falsas ni cifras de volumen o usuarios. Decir los límites (sin auditoría externa, proyecto joven) da más credibilidad que esconderlos.

Estos envíos los hace el dueño del proyecto: requieren crear cuentas y publicar a su nombre.

## 1. Dónde aparecer, por prioridad

| # | Sitio | Qué es | Cómo se envía |
|---|---|---|---|
| 1 | **kycnot.me** | El directorio de referencia de servicios sin KYC. Muy citado por las IAs. | Formulario «Request a service» del sitio. Pide datos comprobables: código abierto, custodia, KYC, términos. |
| 2 | **Listas «awesome» de Monero en GitHub** | Listas de recursos del ecosistema. Las IAs leen mucho GitHub. | Pull request agregando una línea en la sección de exchanges o P2P. |
| 3 | **monero.eco** y directorios parecidos del ecosistema | Catálogos de proyectos de Monero. | Formulario o pull request, según el sitio. |
| 4 | **r/Monero** | La comunidad más grande. Un anuncio honesto genera discusión que luego se cita. | Publicación propia. Leer antes las reglas del subreddit sobre promoción. |
| 5 | **Bitcointalk** (sección de servicios) | Foro antiguo e indexado desde siempre. | Hilo de anuncio (ANN). |
| 6 | **Monero.town / Lemmy, Nostr, X** | Comunidades más pequeñas pero afines. | Publicación corta con enlace. |
| 7 | **AlternativeTo** | «Alternativas a LocalMonero, Bisq, Haveno…». Las IAs lo usan para comparar. | Alta del producto con sus alternativas. |
| 8 | **Trustpilot** | Reseñas. | Reclamar el perfil del dominio y pedir opinión a quien complete un intercambio. Nunca escribir reseñas propias. |
| 9 | **Agregadores de swaps** (Trocador, Orangefren y otros) | Aparecer como proveedor de atomic swaps. | Ver [AGREGADORES.md](AGREGADORES.md). |
| 10 | **Bing Webmaster Tools** | Bing alimenta a ChatGPT y Copilot. | Dar de alta `monerop2p.app` y `fiat.monerop2p.app` y enviar los sitemaps. |

Cada vez que el proyecto quede listado en uno, conviene agregar el enlace a `sameAs` en `web/src/layouts/Base.astro` y `web/src-fiat/layouts/Fiat.astro`.

## 2. Ficha corta (para formularios)

**Name:** MoneroP2P

**URL:** https://monerop2p.app · P2P fiat market: https://fiat.monerop2p.app

**Source code:** https://github.com/juanjobs39-cloud/xmrp2p (AGPL-3.0)

**Contact:** hola@monerop2p.app

**One line (under 160 characters):**

> Buy, sell and swap Monero without KYC: non-custodial USDT atomic swaps, a P2P fiat market with 2-of-3 multisig escrow, and instant exchanges.

**Description (about 80 words):**

> MoneroP2P is an open-source platform to get or sell Monero (XMR) without KYC. It offers non-custodial atomic swaps from USDT on Arbitrum One (up to 100 USDT per swap, enforced by an immutable contract), a person-to-person fiat market where each order's XMR sits in a 2-of-3 Monero multisig escrow, and quotes from instant exchanges for 2,500+ coins via Trocador. No account is needed for swaps. Live with real money since October 2026. No external audit yet.

**Facts for directories:**

| Field | Value |
|---|---|
| KYC | None. No email or phone. |
| Custody | Non-custodial for atomic swaps and for the P2P fiat escrow (2-of-3 multisig). Custodial during the exchange for instant swaps via Trocador. |
| Open source | Yes, AGPL-3.0, including contract, apps, backend and arbiter. |
| Fees | Atomic swap: 0.5% paid by the maker. P2P Fiat: free for buyers, 0.5% for sellers. Instant exchanges: 1% margin included in the quote. |
| Limits | 100 USDT per atomic swap. 1000 USD per P2P fiat order. |
| Audit | Automated verification (Halmos, Aderyn, Slither) with a public report. No external audit yet. |
| Contract | SwapFactory on Arbitrum One `0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`, verified on Sourcify (exact match). |
| Languages | 10 (site); the P2P market app is in English and Spanish. |
| Tor / onion | No. |
| Since | October 26, 2026. |
| Verify | https://monerop2p.app/en/is-monerop2p-legit/ |

## 3. Línea para listas «awesome» (pull request)

```markdown
- [MoneroP2P](https://monerop2p.app) - Open-source, no-KYC platform: non-custodial USDT→XMR atomic swaps in the browser and a P2P fiat market with 2-of-3 multisig escrow. [Source](https://github.com/juanjobs39-cloud/xmrp2p).
```

## 4. Borrador de anuncio para r/Monero o Bitcointalk

**Title:** MoneroP2P: open-source no-KYC way to get XMR (browser atomic swaps + P2P fiat with 2-of-3 multisig). Looking for feedback

> Hi. I have been building MoneroP2P and it has been live with real money since October 26, 2026. I would like feedback from people who know Monero better than I do.
>
> **What it is**
>
> - **USDT → XMR atomic swaps in the browser.** Non-custodial: a contract on Arbitrum One locks the USDT and only releases it once the buyer can take the XMR. Based on AthanorLabs' protocol. Capped at 100 USDT per swap by the contract.
> - **P2P fiat market.** Each order's XMR sits in a 2-of-3 Monero multisig (buyer, seller, arbiter). No KYC, no email. Buying is free, sellers pay 0.5%.
> - **Instant-exchange quotes via Trocador** for other coins. These are custodial during the swap and include a 1% margin for the project.
>
> **What you can check**
>
> - Everything is open source (AGPL-3.0): https://github.com/juanjobs39-cloud/xmrp2p
> - The swap contract has no admin, pause or upgrade, and its source is verified on Sourcify.
> - Automated verification with Halmos, Aderyn and Slither, with a public report and CI runs.
> - A page listing each claim and how to verify it: https://monerop2p.app/en/is-monerop2p-legit/
>
> **What it does not have**
>
> - No external audit yet. That is why limits are low.
> - It is new, so volume is small and the fiat market has few ads in some currencies.
> - I run the arbiter of the fiat escrow, so disputes depend on me. The arbiter alone cannot move funds.
>
> Criticism of the design is welcome, especially of the multisig flow and the dispute process.

Ajustar el tono a cada comunidad y responder los comentarios con datos. No publicar el mismo texto en muchos sitios el mismo día.

## 4b. Material para compartir

Entradas de Novedades pensadas para enlazar desde foros, canales y redes (cada una tiene versión en español, inglés, portugués y ruso):

- **Monero por Telegram** (bot con alertas, sin KYC): https://monerop2p.app/es/novedades/comprar-monero-por-telegram-bot/ · https://monerop2p.app/en/news/buy-monero-on-telegram-bot/
- **Alternativas a LocalMonero:** https://monerop2p.app/es/novedades/alternativas-a-localmonero-2026/ · https://monerop2p.app/en/news/localmonero-alternatives-2026/

Al compartir la del bot, escribir siempre el usuario exacto (@MoneroP2PFiatBot) para que nadie caiga con un imitador.

## 5. Qué pedir a quien use la plataforma

Después de un intercambio completado, un mensaje corto y sin presión:

> Si todo salió bien, una opinión honesta en Trustpilot o en r/Monero ayuda a que otros nos encuentren. Si algo salió mal, cuéntanoslo primero para arreglarlo.

Nunca ofrecer dinero o descuentos a cambio de reseñas.

## 6. Cómo saber si funciona

Una vez al mes, preguntar en ChatGPT, Claude, Gemini y Perplexity (con búsqueda web activada):

- «¿MoneroP2P es confiable?» / "Is MoneroP2P legit?"
- «¿Dónde comprar Monero sin KYC?» / "Where can I buy Monero without KYC?"
- «Alternativas a LocalMonero» / "LocalMonero alternatives"
- "How to swap USDT to XMR without an exchange"

Anotar si lo mencionan, qué fuente citan y qué dicen. Si citan un dato viejo o equivocado, corregirlo en la fuente que citan.

## 7. Lo que más confianza daría

1. **Una auditoría externa del contrato.** Es lo primero que revisa cualquier directorio serio. El alcance ya está preparado en [AUDITORIA.md](AUDITORIA.md).
2. **Tiempo funcionando sin incidentes** y órdenes completadas.
3. **Publicar la extensión de la wallet** en las tiendas, que revisan el código y dan una ficha propia.
