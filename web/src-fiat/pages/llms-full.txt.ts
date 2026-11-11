import type { APIRoute } from "astro";
import { COUNTRIES, FACTS, faq, MAIN_SITE, METHODS, methodById, REPO, ROUTES } from "../content";

/** llms-full.txt: el contenido de referencia de P2P Fiat en texto plano (preguntas, métodos y países), en inglés y español. */
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const parts: string[] = [
    `# MoneroP2P Fiat — full content

Source: ${site?.href}
Summary and public API: ${abs("/llms.txt")}
Status: live on Monero mainnet (real money). Open source (AGPL-3.0): ${REPO}. No external audit yet; orders are capped at ${FACTS.capUsd} USD.
What can be verified and the limits of the project: ${MAIN_SITE}/en/is-monerop2p-legit/
Last updated: ${new Date().toISOString().slice(0, 10)}
`,
  ];
  for (const lang of ["en", "es"] as const) {
    const en = lang === "en";
    parts.push(en ? "\n## Frequently asked questions\n" : "\n## Preguntas frecuentes\n", `URL: ${abs(ROUTES.faq[lang])}\n`);
    for (const x of faq(lang)) parts.push(`\n${en ? "Q" : "P"}: ${x.q}\n${en ? "A" : "R"}: ${x.a}\n`);

    parts.push(en ? "\n## Payment methods\n" : "\n## Métodos de pago\n");
    for (const m of METHODS) {
      const risk = m.reversible
        ? en ? "reversible after release: higher risk for the seller" : "reversible después de liberar: más riesgo para quien vende"
        : en ? "not reversible in normal use" : "no reversible en uso normal";
      parts.push(`\n### ${m.name}\nURL: ${abs(`/${lang}/${m.slug[lang]}/`)}\n${m.where[lang]} · ${risk}\n${m.intro[lang]}\n`);
    }

    parts.push(en ? "\n## Countries\n" : "\n## Países\n");
    for (const c of COUNTRIES) {
      const methods = c.methods.map((id) => methodById(id).name).join(", ");
      parts.push(`\n### ${c.name[lang].replace(/^the /, "")}\nURL: ${abs(`/${lang}/${c.slug[lang]}/`)}\n${en ? "Currency" : "Moneda"}: ${c.fiat} · ${en ? "Common methods" : "Métodos comunes"}: ${methods}\n${c.note[lang]}\n`);
    }
  }
  return new Response(parts.join(""), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
