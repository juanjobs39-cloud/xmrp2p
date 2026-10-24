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
    description: "Lista las redes donde xmrp2p acepta swaps USDT → XMR ahora mismo.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "list_offers",
    title: "Ofertas de makers",
    description: "Ofertas vigentes de makers (precio en USDT por XMR, montos mínimo y máximo) en una red.",
    inputSchema: {
      type: "object",
      properties: { network: { type: "string", description: "Red, p. ej. arbitrum_sepolia" } },
      required: ["network"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_quote",
    title: "Cotización USDT → XMR",
    description:
      "Cotización indicativa: cuánto XMR se recibiría por un monto de USDT con la mejor oferta vigente. " +
      "La cotización definitiva la da el maker al iniciar el swap. Esta herramienta no ejecuta swaps.",
    inputSchema: {
      type: "object",
      properties: {
        network: { type: "string" },
        usdt: { type: "string", description: "Monto en USDT, p. ej. \"100\"" },
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
    const q = await bestQuote(env, network, usdt);
    return q ? text(q) : { isError: true, content: [{ type: "text", text: "No hay ofertas para ese monto" }] };
  }
  throw new HttpError(404, "herramienta desconocida");
}

async function handleOne(env: Env, m: RpcReq) {
  switch (m.method) {
    case "initialize":
      return ok(m.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "xmrp2p", title: "xmrp2p (solo lectura)", version: "0.1.0" },
        instructions:
          "Consulta ofertas y cotizaciones USDT → XMR de xmrp2p. Solo lectura: no puede ejecutar swaps ni mover fondos. " +
          "Las cotizaciones son indicativas; testnet únicamente mientras no exista auditoría.",
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
