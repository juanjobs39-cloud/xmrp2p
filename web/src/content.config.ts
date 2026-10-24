import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";

const lang = z.enum(["es", "en"]);

/** Páginas institucionales y de producto. `key` las une entre idiomas (ver src/site.ts → ROUTES). */
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    key: z.string(),
    lang,
    title: z.string(),
    description: z.string().max(170),
    updated: z.coerce.date(),
  }),
});

/** Guías. Misma `key` en ambos idiomas; `slug` propio de cada idioma. */
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    key: z.string(),
    lang,
    slug: z.string(),
    title: z.string(),
    description: z.string().max(170),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    order: z.number(),
    related: z.array(z.string()).default([]),
    howto: z
      .object({
        name: z.string(),
        totalTime: z.string().optional(),
        steps: z.array(z.object({ name: z.string(), text: z.string() })),
      })
      .optional(),
  }),
});

const faq = defineCollection({
  loader: file("./src/content/faq.json"),
  schema: z.object({ lang, items: z.array(z.object({ q: z.string(), a: z.string() })).min(15) }),
});

const glossary = defineCollection({
  loader: file("./src/content/glossary.json"),
  schema: z.object({ lang, items: z.array(z.object({ term: z.string(), def: z.string() })) }),
});

export const collections = { pages, guides, faq, glossary };
