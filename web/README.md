# web — sitio público y app del swap (Fases 5 y 6)

> ⚠️ **Solo testnet, sin auditoría.**

**Qué hay aquí:** un sitio estático en Astro 5, en español (`/es/`, idioma por defecto) e inglés (`/en/`). Las páginas de contenido **no cargan JavaScript**. La app del swap vive solo en `/es/app/` y `/en/app/`.

## Contenido y SEO

| Qué | Dónde |
|---|---|
| Inicio, Cómo funciona, Seguridad, Conviértete en maker, Acerca de, Contacto, Términos, Privacidad, Aviso de riesgos | `src/pages/[lang]/index.astro`, `src/content/pages/` |
| 8 guías en ES y EN, con fecha visible, aviso de comisión y guías relacionadas | `src/content/guides/` |
| 17 preguntas frecuentes por idioma (`FAQPage`) y glosario (`DefinedTermSet`) | `src/content/faq.json`, `src/content/glossary.json` |
| JSON-LD: Organization, WebSite, BreadcrumbList, Article, HowTo, FAQPage, SoftwareApplication | `src/layouts/Base.astro`, `src/pages/[...path].astro` |
| `sitemap.xml` con hreflang, `robots.txt` con bots de IA comentados, `llms.txt`, `llms-full.txt` | `src/pages/*.ts` |
| Versión Markdown de cada guía (`/es/guias/<slug>.md`) | `src/pages/[lang]/[section]/[slug].md.ts` |
| IndexNow: archivo de llave y script de aviso | `src/pages/[key].txt.ts`, `scripts/indexnow.mjs` |
| 404 útil | `src/pages/404.astro` |

Cómo agregar contenido: [docs/CONTENIDO.md](../docs/CONTENIDO.md). Pasos tras publicar: [docs/PUBLICAR.md](../docs/PUBLICAR.md).

## App del swap

| Módulo | Qué hace |
|---|---|
| `src/app/decide.ts` | Decide la siguiente acción del taker. Si el XMR no está verificado cerca de t0, exige reembolsar (riesgo 1) |
| `src/app/recovery.ts` | Archivo de recuperación cifrado (PBKDF2-SHA-256 600 000 + AES-256-GCM) |
| `src/app/evm.ts` | Wallet de navegador (EIP-1193), depósito con `permit` o `approve`, `setReady`, `refund` simulado antes de enviar |
| `src/app/api.ts` | Cliente del backend de Cloudflare |
| `src/app/monero-entry.js` | monero-ts: verificación del bloqueo con `check_tx_key` (segundos) y barrido del XMR |
| `src/app/app.ts` | Flujo: llaves → verificación del maker → archivo de recuperación → depósito → seguimiento automático |

### Seguridad del frontend

- **CSP estricta** en la app: `script-src 'self' 'wasm-unsafe-eval'` + el hash del import map; sin `unsafe-inline` ni `unsafe-eval`.
- **SRI** (sha384) en todos los scripts y estilos; **import map con `integrity`** para el núcleo cripto y monero-ts; el **WASM criptográfico** se verifica por hash antes de ejecutarse.
- **Sin scripts de terceros**, sin analítica, sin cookies.
- **`_headers`** para Cloudflare Pages (HSTS, `X-Frame-Options`, `Referrer-Policy`, etc.).
- **`dist/SHA256SUMS`** para comparar lo publicado con un build propio, y **copia para IPFS** con rutas relativas (`npm run build:ipfs`).

## Comandos

```bash
npm ci --legacy-peer-deps
npm test               # 13 pruebas (decisión del taker y archivo de recuperación)
npm run build          # requiere crypto-wasm/pkg (wasm-pack build --release --target web --out-dir pkg)
npm run build:ipfs     # dist-ipfs/ con rutas relativas
npx html-validate "dist/**/*.html"
npx linkinator dist --recurse --skip "^https?://(?!localhost)"
npx lhci autorun       # Lighthouse ≥ 95 en las 4 categorías
```

Configuración: copia `.env.example` a `.env`.

## Resultados (24-oct-2026)

| Comprobación | Resultado |
|---|---|
| Build | ✅ 42 páginas |
| `html-validate` | ✅ sin errores |
| Enlaces internos | ✅ 0 rotos |
| Pruebas de la app | ✅ 13/13 |
| Navegador: núcleo cripto bajo CSP + verificación del WASM | ✅ |
| Navegador: monero-ts bajo CSP → proxy → stagenet (`getHeight`, `check_tx_key`) | ✅ (el `check_tx_key` positivo requiere una transacción real: Fase 7) |

## Notas

- Astro 5.18 (no 7.x): Astro 7 exige Node ≥ 22.23 y esta PC tiene 22.17.
- monero-ts se empaqueta aparte con esbuild (`scripts/build-monero.mjs`) porque está pensado para webpack.
- Un `tx_key` malformado aborta el módulo WASM de monero-ts; la app valida el formato antes de usarlo.
