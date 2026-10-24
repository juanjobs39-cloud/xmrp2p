# Pasos manuales después de publicar

> Última actualización: 24 de octubre de 2026. Todo esto lo haces tú con tus cuentas; nada se automatiza en tu nombre.

**Resumen:** configura el dominio y los valores del sitio, construye, sube a Cloudflare Pages, avisa a los buscadores (Search Console, Bing, IndexNow), prueba los datos estructurados, pide aparecer en directorios y publica la copia en IPFS.

## 0. Antes de construir

1. Llena `config/xmrp2p.example.toml` (copia a `config/xmrp2p.toml`) y `web/.env` a partir de `web/.env.example`:
   - `PUBLIC_SITE_URL=https://<tu dominio>`
   - `PUBLIC_CONTACT_EMAIL`, `PUBLIC_BRAND`
   - `PUBLIC_API_URL` y `PUBLIC_MONERO_NODE` (tras desplegar `workers/`)
   - direcciones de la fábrica y del token (tras desplegar `contracts/` en testnet)
   - `INDEXNOW_KEY`: una cadena aleatoria de 32 caracteres (`openssl rand -hex 16`)
2. Reemplaza `public/og.png` por una imagen con tu marca (1200×630).

```bash
cd crypto-wasm && wasm-pack build --release --target web --out-dir pkg && cd ..
cd web && npm ci --legacy-peer-deps && npm run build
```

## 1. Publicar en Cloudflare Pages

1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Upload assets* (o conecta el repositorio con `web/` como raíz, comando `npm run build`, salida `dist`).
2. Añade tu dominio en *Custom domains*.
3. Verifica que `/_headers` se aplica: en las respuestas deben aparecer `X-Content-Type-Options: nosniff` y `Strict-Transport-Security`.

## 2. Google Search Console

1. Entra a [search.google.com/search-console](https://search.google.com/search-console) y añade la propiedad de **dominio** (verificación por registro DNS TXT en Cloudflare).
2. En *Sitemaps*, envía `https://<dominio>/sitemap.xml`.
3. Usa *Inspección de URL* en `/es/` y `/en/` y pide la indexación.

## 3. Bing Webmaster Tools

1. Entra a [bing.com/webmasters](https://www.bing.com/webmasters). Puedes importar el sitio desde Search Console.
2. Envía el sitemap `https://<dominio>/sitemap.xml`.
3. Bing alimenta también las respuestas de Copilot.

## 4. IndexNow

1. Con `INDEXNOW_KEY` en `web/.env`, el build genera `/<llave>.txt`. Comprueba que abre en el navegador.
2. Después de cada publicación:

```bash
cd web
INDEXNOW_KEY=<llave> PUBLIC_SITE_URL=https://<dominio> node scripts/indexnow.mjs --dry-run   # revisa
INDEXNOW_KEY=<llave> PUBLIC_SITE_URL=https://<dominio> node scripts/indexnow.mjs             # envía
```

El script envía solo las URL nuevas o con `lastmod` cambiado y guarda el estado en `web/.indexnow-cache.json`. Usa `--all` la primera vez si quieres enviar todo.

## 5. Probar los datos estructurados

1. [Prueba de resultados enriquecidos de Google](https://search.google.com/test/rich-results): prueba `/es/preguntas-frecuentes/` (FAQPage), una guía con pasos (Article + HowTo) y `/es/app/` (SoftwareApplication).
2. [Schema Markup Validator](https://validator.schema.org/) para ver todos los tipos (Organization, WebSite, BreadcrumbList, DefinedTermSet).
3. Revisa `robots.txt`, `llms.txt`, `llms-full.txt` y una guía en `.md` (por ejemplo `/es/guias/que-es-un-atomic-swap.md`).

## 6. Directorios

Pide aparecer cuando el servicio funcione en mainnet (antes, márcalo como testnet):

- **kycnot.me**: sigue las instrucciones de su sitio para solicitar el listado (suelen pedir enlace, descripción, si hay KYC y el código fuente).
- Otros directorios de servicios sin KYC y de herramientas de Monero.
- Comunidades: r/Monero, foros de Monero (respeta sus reglas sobre promoción).

No inventes reseñas ni testimonios.

## 7. Copia en IPFS

```bash
cd web
npm run build:ipfs                 # genera dist-ipfs/ con rutas relativas
ipfs add -r --cid-version=1 dist-ipfs
```

1. Anota el CID que imprime la última línea.
2. Fíjalo (*pin*) en tu nodo o en un servicio de pinning.
3. Publica el CID en el README y en la página de seguridad, junto con `SHA256SUMS`.
4. Comprueba la copia en una pasarela: `https://<CID>.ipfs.dweb.link/es/`.
5. Opcional: un registro DNSLink (`_dnslink.<dominio>` TXT `dnslink=/ipfs/<CID>`).

## 8. Verificación del build (para usuarios avanzados)

Cualquiera puede reconstruir el sitio desde el commit publicado y comparar `dist/SHA256SUMS` con el del sitio en producción.
