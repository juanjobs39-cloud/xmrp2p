# Cómo agregar contenido manteniendo el SEO

> Última actualización: 24 de octubre de 2026.

**Resumen:** cada guía es un archivo Markdown en `web/src/content/guides/<idioma>/` con un bloque de datos al inicio. Escribe la respuesta primero, usa tablas y pasos, no inventes datos y crea siempre la versión en el otro idioma con la misma `key`.

## 1. Crear una guía

Archivo: `web/src/content/guides/es/<nombre>.md`

```markdown
---
key: mi-guia                      # igual en ES y EN: une las dos versiones (hreflang)
lang: es
slug: como-hacer-algo             # URL: /es/guias/como-hacer-algo/
title: Cómo hacer algo con Monero  # ≤ 60 caracteres idealmente
description: "Respuesta en una frase con la palabra clave principal."   # ≤ 160 caracteres
published: 2026-11-01
updated: 2026-11-01               # cámbiala en cada revisión: se muestra y va al sitemap
order: 9                          # posición en el índice
related: [swap-usdt-xmr, monero-wallet]   # keys de guías relacionadas
howto:                            # opcional: solo si la guía es un paso a paso
  name: Hacer algo
  totalTime: PT10M
  steps:
    - name: Primer paso
      text: Qué hacer exactamente.
---

**Respuesta corta:** responde la pregunta del título en 2 o 3 frases.

## Primera sección
...
```

Luego crea `web/src/content/guides/en/<name>.md` con la **misma `key`** y su propio `slug` en inglés.

El sistema genera automáticamente:

- la página `/es/guias/<slug>/` con migas de pan, fecha visible, aviso de comisión, guías relacionadas y JSON-LD `Article` (+ `HowTo` si hay `howto`),
- la versión Markdown en `/es/guias/<slug>.md`,
- la entrada en `sitemap.xml` con `hreflang`, en `llms.txt` y en `llms-full.txt`.

## 2. Reglas de redacción

1. **Respuesta primero.** El primer párrafo responde la pregunta del título. Los asistentes de IA citan ese párrafo.
2. **Una pregunta por sección** (`##`), formulada como la buscaría alguien.
3. **Tablas** para comparar, **listas numeradas** para pasos.
4. **No inventes datos.** Nada de tasas, comisiones, volúmenes, estadísticas, reseñas ni testimonios. Si un dato cambia (comisiones de red, precios), explica dónde consultarlo.
5. **Sin promesas de ganancias.**
6. **Enlaza** al menos 2 guías relacionadas con texto descriptivo (no "clic aquí").
7. **Fechas:** actualiza `updated` cada vez que cambies el contenido.
8. **Nada importante detrás de JavaScript**, pestañas o acordeones: el contenido debe estar en el HTML.

## 3. Preguntas frecuentes y glosario

- `web/src/content/faq.json`: mínimo 15 preguntas por idioma (lo valida el esquema). Generan `FAQPage`.
- `web/src/content/glossary.json`: generan `DefinedTermSet`.

## 4. Páginas institucionales

`web/src/content/pages/<idioma>/*.md`, con `key` igual a una entrada de `ROUTES` en `web/src/site.ts`. Para una página nueva, añade primero la ruta en `ROUTES`.

## 5. Comprobar antes de publicar

```bash
cd web
npm run build
npx html-validate "dist/**/*.html"
npx linkinator dist --recurse --skip "^https?://"
npx lhci autorun          # Lighthouse ≥ 95 en rendimiento, accesibilidad, buenas prácticas y SEO
```

Después de publicar, avisa a los buscadores con IndexNow (`docs/PUBLICAR.md`, paso 4).
