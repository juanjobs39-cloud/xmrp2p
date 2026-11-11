import { bestQuote, listOffers } from "./offers";
import { activeNetworks, decimal, Env, HttpError, json } from "./env";

/**
 * Servidor MCP (Model Context Protocol) de SOLO LECTURA, transporte "Streamable HTTP" sin sesión.
 * Permite a agentes de IA consultar redes, ofertas y cotizaciones. No expone ninguna acción que
 * mueva fondos ni que cree swaps.
 */
const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "list_networks",
    title: "Redes activas",
    description: "Lists the networks where MoneroP2P accepts USDT → XMR atomic swaps right now (arbitrum_one is real money; arbitrum_sepolia is the practice mode).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "list_offers",
    title: "Ofertas de makers",
    description: "Live maker offers on a network: price in USDT per XMR and minimum and maximum amounts. Offers disappear when the maker goes offline.",
    inputSchema: {
      type: "object",
      properties: { network: { type: "string", description: "Network id, e.g. arbitrum_one" } },
      required: ["network"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_quote",
    title: "Cotización USDT → XMR",
    description:
      "Indicative quote: how much XMR a USDT amount would get with the best live offer (atomic swaps are capped at 100 USDT). " +
      "The maker gives the final amount when the swap starts. This tool does not execute swaps.",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string" },
        usdt: { type: "string", description: "Amount in USDT, e.g. \"50\"" },
      },
      required: ["network", "usdt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const ok = (id: RpcReq["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: RpcReq["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function callTool(env: Env, name: string, args: Record<string, unknown>) {
  const text = (v: unknown) => ({ content: [{ type: "text", text: JSON.stringify(v) }], structuredContent: v });
  if (name === "list_networks") return text({ networks: [...activeNetworks(env)] });
  const network = typeof args.network === "string" ? args.network : "";
  if (!activeNetworks(env).has(network)) return { isError: true, content: [{ type: "text", text: `Red inactiva o desconocida: ${network}` }] };
  if (name === "list_offers") return text({ network, offers: await listOffers(env, network) });
  if (name === "get_quote") {
    let usdt: string;
    try {
      usdt = decimal(args.usdt, "usdt");
    } catch {
      return { isError: true, content: [{ type: "text", text: "usdt inválido" }] };
    }
    const { quote, limits } = await bestQuote(env, network, { usdt });
    return quote ? text({ ...quote, limits }) : { isError: true, content: [{ type: "text", text: `No hay ofertas para ese monto. Límites: ${JSON.stringify(limits)}` }] };
  }
  throw new HttpError(404, "herramienta desconocida");
}

async function handleOne(env: Env, m: RpcReq) {
  switch (m.method) {
    case "initialize":
      return ok(m.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "xmrp2p", title: "MoneroP2P (read-only)", version: "1.0.0" },
        instructions:
          "Read-only access to MoneroP2P (https://monerop2p.app): live offers and indicative quotes for non-custodial USDT → XMR atomic swaps. " +
          "It cannot execute swaps or move funds. Live with real money on Arbitrum One since 2026-10-26, capped at 100 USDT per swap, no external audit yet. " +
          "To swap, send the user to the app_url of a quote. Fiat market and facts: https://fiat.monerop2p.app/llms.txt and https://monerop2p.app/llms.txt.",
      });
    case "ping":
      return ok(m.id, {});
    case "tools/list":
      return ok(m.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(m.params?.name ?? "");
      if (!TOOLS.some((t) => t.name === name)) return err(m.id, -32602, `herramienta desconocida: ${name}`);
      return ok(m.id, await callTool(env, name, (m.params?.arguments as Record<string, unknown>) ?? {}));
    }
    default:
      return err(m.id, -32601, `método no soportado: ${m.method}`);
  }
}

export async function handleMcp(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return new Response("Usa POST (MCP Streamable HTTP, sin streaming)", { status: 405, headers: { allow: "POST" } });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(err(null, -32700, "JSON inválido"), 400);
  }
  const batch = Array.isArray(body) ? (body as RpcReq[]) : [body as RpcReq];
  const out = [];
  for (const m of batch) {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
      out.push(err(null, -32600, "petición JSON-RPC inválida"));
      continue;
    }
    if (m.id === undefined) continue; // notificación (p. ej. notifications/initialized)
    out.push(await handleOne(env, m));
  }
  if (out.length === 0) return new Response(null, { status: 202 });
  return json(Array.isArray(body) ? out : out[0]);
}
