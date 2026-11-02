import { DurableObject } from "cloudflare:workers";
import type { Env } from "../api/env";

type From = "system" | "buyer" | "seller" | "admin" | "arbiter";

interface Message {
  seq: number;
  at: number;
  from: From;
  body: Record<string, unknown>;
}

const MAX_MESSAGES = 1000;
const MAX_BYTES = 9000;
/** Los mensajes del protocolo multisig (transacciones armadas) pesan más que el chat. */
const MAX_PROTOCOL_BYTES = 120_000;

/**
 * Sala de una orden P2P Fiat: chat cifrado (el servidor solo ve texto cifrado), cambios de estado y
 * mensajes del protocolo multisig. Solo la llama el Worker, que ya verificó quién escribe.
 */
export class P2POrderRoom extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    switch (url.pathname) {
      case "/init": {
        if (await this.ctx.storage.get("seq")) return new Response("ya inicializada", { status: 409 });
        await this.ctx.storage.put("seq", 0);
        return new Response("ok");
      }
      case "/append": {
        const from = req.headers.get("x-from") as From;
        const raw = await req.text();
        const max = raw.startsWith('{"type":"protocol"') ? MAX_PROTOCOL_BYTES : MAX_BYTES;
        if (raw.length > max) return new Response("mensaje demasiado grande", { status: 413 });
        const seq = ((await this.ctx.storage.get<number>("seq")) ?? 0) + 1;
        if (seq > MAX_MESSAGES) return new Response("la orden alcanzó el máximo de mensajes", { status: 429 });
        const msg: Message = { seq, at: Date.now(), from, body: JSON.parse(raw) as Record<string, unknown> };
        await this.ctx.storage.put({ seq, [`m:${String(seq).padStart(5, "0")}`]: msg });
        for (const ws of this.ctx.getWebSockets()) {
          try {
            ws.send(JSON.stringify(msg));
          } catch {
            /* conexión cerrada */
          }
        }
        return Response.json(msg);
      }
      case "/messages": {
        const after = Number(url.searchParams.get("after") ?? "0");
        const all = await this.ctx.storage.list<Message>({ prefix: "m:" });
        return Response.json({ messages: [...all.values()].filter((m) => m.seq > after) });
      }
      case "/state": {
        // Estado del árbitro para esta orden (wallet multisig), cifrado por el propio árbitro.
        if (req.method === "PUT") {
          await this.ctx.storage.put("arbiter_state", await req.text());
          return new Response("ok");
        }
        const s = await this.ctx.storage.get<string>("arbiter_state");
        return s ? new Response(s, { headers: { "content-type": "application/json" } }) : new Response("sin estado", { status: 404 });
      }
      case "/ws": {
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
    }
    return new Response("no encontrado", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket): Promise<void> {
    ws.send(JSON.stringify({ type: "error", error: "escribe por POST /messages" }));
  }
}
