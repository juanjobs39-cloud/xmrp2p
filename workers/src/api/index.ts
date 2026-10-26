import { verifyMaker } from "./auth";
import { activeNetworks, blockedRegion, clientIp, Env, HttpError, json, requireNetwork, decimal } from "./env";
import { handleMcp } from "./mcp";
import { bestQuote, handleOffers } from "./offers";
import { openapi } from "./openapi";
import { referencePrice } from "./price";
import { createSwap, roomRequest } from "./swaps";

export { MakerInbox } from "../do/MakerInbox";
export { SwapRoom } from "../do/SwapRoom";

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  const allow = allowed.includes("*") ? "*" : origin && allowed.includes(origin) ? origin : "";
  return allow
    ? {
        "access-control-allow-origin": allow,
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, x-room-token, x-maker-address, x-timestamp, x-signature, mcp-protocol-version",
        "access-control-max-age": "86400",
      }
    : {};
}

async function limit(env: Env, req: Request, write: boolean): Promise<void> {
  const l = write ? env.WRITE_LIMITER : env.READ_LIMITER;
  if (!l) return;
  const { success } = await l.limit({ key: clientIp(req) });
  if (!success) throw new HttpError(429, "demasiadas peticiones; intenta en un minuto");
}

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;
  const write = req.method !== "GET" && req.method !== "HEAD";

  if (p === "/v1/health") return json({ ok: true, networks: [...activeNetworks(env)], testnet_only: true });

  const country = blockedRegion(req, env);
  if (country) throw new HttpError(451, `el servicio no está disponible en tu región (${country})`);
  await limit(env, req, write);

  if (p === "/openapi.json") return json(openapi);
  if (p === "/v1/networks") return json({ networks: [...activeNetworks(env)] });
  if (p === "/v1/offers") return handleOffers(req, env, url);
  if (p === "/v1/quote" && req.method === "GET") {
    const network = requireNetwork(env, url.searchParams.get("network"));
    const q = await bestQuote(env, network, decimal(url.searchParams.get("usdt"), "usdt"));
    return q ? json(q) : json({ error: "no hay ofertas para ese monto" }, 404);
  }
  if (p === "/v1/swaps" && req.method === "POST") return createSwap(req, env);
  const room = /^\/v1\/swaps\/([^/]+)\/(events|messages|ws)$/.exec(p);
  if (room) return roomRequest(req, env, room[1]!, room[2]!);
  if (p === "/v1/price" && req.method === "GET") return json(await referencePrice());
  if (p === "/v1/makers/ws-ticket" && req.method === "POST") {
    const body = await req.text();
    const maker = await verifyMaker(req, p, body);
    const inbox = env.MAKER_INBOX.get(env.MAKER_INBOX.idFromName(maker));
    return inbox.fetch("https://inbox/ticket", { method: "POST", headers: { "x-verified-maker": maker } });
  }
  if (p === "/v1/makers/inbox" && req.headers.get("upgrade") === "websocket") {
    const headers = new Headers(req.headers);
    headers.delete("x-verified-maker");
    const ticket = url.searchParams.get("ticket");
    const viaTicket = !req.headers.get("x-signature") && ticket;
    // Daemon: la firma cubre GET /v1/makers/inbox con cuerpo vacío. Navegador: ?maker=…&ticket=… (un solo uso).
    const maker = viaTicket ? (url.searchParams.get("maker") ?? "").toLowerCase() : await verifyMaker(req, p, "");
    if (viaTicket && !/^0x[0-9a-f]{40}$/.test(maker)) throw new HttpError(400, "parámetro maker inválido");
    if (!viaTicket) headers.set("x-verified-maker", maker);
    const inbox = env.MAKER_INBOX.get(env.MAKER_INBOX.idFromName(maker));
    return inbox.fetch(`https://inbox/connect${viaTicket ? `?ticket=${encodeURIComponent(ticket!)}` : ""}`, { headers });
  }
  if (p === "/mcp") return handleMcp(req, env);
  throw new HttpError(404, "ruta no encontrada");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res: Response;
    try {
      res = await route(req, env);
    } catch (e) {
      res = e instanceof HttpError ? json({ error: e.message }, e.status) : json({ error: "error interno" }, 500);
      if (!(e instanceof HttpError)) console.error(e);
    }
    if (res.status === 101) return res; // WebSocket
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    out.headers.set("x-content-type-options", "nosniff");
    return out;
  },
} satisfies ExportedHandler<Env>;
