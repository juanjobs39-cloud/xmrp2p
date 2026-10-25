import type { APIRoute } from "astro";

// Permite explícitamente a buscadores y asistentes de IA. Cada bloque explica para qué sirve.
const BOTS: [string, string][] = [
  ["Googlebot", "Google: indexa el sitio para la Búsqueda de Google"],
  ["Google-Extended", "Google: permite usar el contenido en Gemini y otros modelos de Google"],
  ["Bingbot", "Bing: indexa para Bing y para las respuestas de Microsoft Copilot"],
  ["OAI-SearchBot", "OpenAI: indexa para las búsquedas de ChatGPT"],
  ["ChatGPT-User", "OpenAI: visitas que hace ChatGPT cuando un usuario le pide abrir una página"],
  ["GPTBot", "OpenAI: rastreo para entrenar modelos"],
  ["Claude-SearchBot", "Anthropic: indexa para las búsquedas de Claude"],
  ["Claude-User", "Anthropic: visitas que hace Claude cuando un usuario se lo pide"],
  ["ClaudeBot", "Anthropic: rastreo para entrenar modelos"],
  ["PerplexityBot", "Perplexity: indexa para sus respuestas"],
  ["Perplexity-User", "Perplexity: visitas a pedido de un usuario"],
  ["Applebot", "Apple: Siri y Spotlight"],
  ["Applebot-Extended", "Apple: permite usar el contenido en Apple Intelligence"],
  ["DuckAssistBot", "DuckDuckGo: respuestas de DuckAssist"],
  ["meta-externalagent", "Meta: rastreo para sus productos de IA"],
  ["MistralAI-User", "Mistral: visitas de Le Chat a pedido de un usuario"],
];

export const GET: APIRoute = ({ site }) => {
  const blocks = BOTS.map(([ua, why]) => `# ${why}\nUser-agent: ${ua}\nAllow: /\n`).join("\n");
  const body = `# robots.txt de MoneroP2P: el contenido es público y puede citarse.\n\n${blocks}\n# Cualquier otro rastreador\nUser-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site).href}\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
