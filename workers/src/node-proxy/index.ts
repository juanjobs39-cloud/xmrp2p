/**
 * Proxy hacia nodos de Monero (Fase 0 probó que `fetch()` llega a los puertos 38081/38089).
 * - Lista cerrada de nodos por host (no es un proxy abierto).
 * - Lista cerrada de rutas y métodos RPC de lectura + envío de transacciones firmadas.
 * - Añade CORS para que la wallet del navegador pueda usarlo.
 * Privacidad: el proxy ve qué consulta cada IP. La app debe dejar elegir un nodo propio.
 */
interface Env {
  NODES: string;
  BLOCKED_REGIONS: string;
  PROXY_LIMITER?: RateLimit;
}

// wallet2 (monero-ts y monero-wallet-rpc) usa los nombres antiguos de varias rutas
// (/gettransactions, /sendrawtransaction, /getheight…): se aceptan ambos (hallazgo de la Fase 7).
export const ALLOWED_PATHS = new Set([
  "/json_rpc", "/get_height", "/getheight", "/get_info", "/getinfo", "/get_transactions", "/gettransactions",
  "/get_outs.bin", "/get_outs", "/getblocks.bin", "/getblocks_by_height.bin", "/gethashes.bin", "/get_o_indexes.bin",
  "/send_raw_transaction", "/sendrawtransaction", "/is_key_image_spent", "/get_transaction_pool_hashes.bin",
  "/get_transaction_pool_hashes", "/get_output_distribution.bin", "/get_fee_estimate",
]);
export const ALLOWED_JSON_METHODS = new Set([
  "get_info", "get_block_count", "get_last_block_header", "get_block_header_by_height", "get_block_headers_range",
  "get_block", "get_fee_estimate", "get_version", "hard_fork_info", "get_output_distribution",
  "get_output_histogram", "get_txpool_backlog",
]);
const MAX_BODY = 512 * 1024;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", ...cors } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    const country = (req as Request & { cf?: { country?: string } }).cf?.country?.toUpperCase();
    const blocked = env.BLOCKED_REGIONS.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (country && blocked.includes(country)) return fail(451, "no disponible en tu región");

    const nodes = JSON.parse(env.NODES) as Record<string, string>;
    const upstream = nodes[url.hostname] ?? nodes["*"];
    if (!upstream) return fail(404, "nodo no configurado para este host");
    if (!ALLOWED_PATHS.has(url.pathname)) return fail(403, "ruta RPC no permitida");
    if (req.method !== "POST" && req.method !== "GET") return fail(405, "método no permitido");

    if (env.PROXY_LIMITER) {
      const { success } = await env.PROXY_LIMITER.limit({ key: req.headers.get("cf-connecting-ip") ?? "local" });
      if (!success) return fail(429, "demasiadas peticiones");
    }

    const body = req.method === "POST" ? await req.arrayBuffer() : null;
    if (body && body.byteLength > MAX_BODY) return fail(413, "cuerpo demasiado grande");
    if (url.pathname === "/json_rpc") {
      try {
        const j = JSON.parse(new TextDecoder().decode(body ?? new ArrayBuffer(0))) as { method?: string };
        if (!j.method || !ALLOWED_JSON_METHODS.has(j.method)) return fail(403, `método ${j.method} no permitido`);
      } catch {
        return fail(400, "JSON inválido");
      }
    }
    try {
      const r = await fetch(upstream + url.pathname, {
        method: req.method,
        body,
        headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
      });
      return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "", ...cors } });
    } catch (e) {
      return fail(502, `nodo no disponible: ${(e as Error).message}`);
    }
  },
} satisfies ExportedHandler<Env>;
