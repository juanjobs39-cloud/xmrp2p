import { DurableObject } from "cloudflare:workers";
import type { Env } from "../api/env";

const TICKET_TTL_MS = 60_000;

type Pending ={ resolve: (v: { ok: boolean; result?: unknown; error?: string }) => void; timer: ReturnType<typeof setTimeout> };

/**
 * Buzón de un maker (uno por dirección EVM). El daemon del maker mantiene un WebSocket abierto
 * (autenticado por firma en el Worker). Por aquí recibe las solicitudes de swap y envía los
 * eventos del protocolo hacia la sala de cada swap.
 *
 * Mensajes del maker: {type:"reply", request_id, ok, result|error}
 *                     {type:"event", room_id, event, data}
 *                     {type:"ping"}
 */
export class MakerInbox extends DurableObject<Env> {
  private pending = new Map<string, Pending>();

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/ticket" && req.method === "POST") {
      // Ticket de un solo uso para abrir el WebSocket desde un navegador (que no puede firmar cabeceras).
      const maker = req.headers.get("x-verified-maker");
      if (!maker) return new Response("sin autenticar", { status: 401 });
      const ticket = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
      await this.ctx.storage.put(`ticket:${ticket}`, { maker, exp: Date.now() + TICKET_TTL_MS });
      return Response.json({ ticket, expires_in: TICKET_TTL_MS / 1000 });
    }
    if (url.pathname === "/connect") {
      let maker = req.headers.get("x-verified-maker");
      const ticket = url.searchParams.get("ticket");
      if (!maker && ticket && /^[0-9a-f]{48}$/.test(ticket)) {
        const t = await this.ctx.storage.get<{ maker: string; exp: number }>(`ticket:${ticket}`);
        await this.ctx.storage.delete(`ticket:${ticket}`);
        if (t && t.exp > Date.now()) maker = t.maker;
      }
      if (!maker) return new Response("sin autenticar", { status: 401 });
      const pair = new WebSocketPair();
      // Una sola conexión activa por maker: la nueva reemplaza a la anterior.
      for (const old of this.ctx.getWebSockets()) old.close(4000, "reemplazada por una conexión nueva");
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment({ maker });
      await this.ctx.storage.put("maker", maker);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (url.pathname === "/take" && req.method === "POST") {
      return this.take(await req.text());
    }
    if (url.pathname === "/deliver" && req.method === "POST") {
      // Mensaje del taker reenviado por la sala.
      const ws = this.ctx.getWebSockets()[0];
      if (!ws) return new Response("maker desconectado", { status: 503 });
      ws.send(await req.text());
      return new Response("ok");
    }
    if (url.pathname === "/online") {
      return Response.json({ online: this.ctx.getWebSockets().length > 0 });
    }
    return new Response("no encontrado", { status: 404 });
  }

  private async take(body: string): Promise<Response> {
    const ws = this.ctx.getWebSockets()[0];
    if (!ws) return Response.json({ ok: false, error: "el maker no está en línea" }, { status: 503 });
    const requestId = crypto.randomUUID();
    const timeoutMs = Number(this.env.TAKE_TIMEOUT_MS ?? "20000");
    const result = await new Promise<{ ok: boolean; result?: unknown; error?: string }>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        // Avisar al maker para que descarte esa negociación: el taker ya no la espera.
        try {
          ws.send(JSON.stringify({ type: "take_expired", request_id: requestId }));
        } catch {
          /* desconectado */
        }
        resolve({ ok: false, error: "el maker no respondió a tiempo" });
      }, timeoutMs);
      this.pending.set(requestId, { resolve, timer });
      ws.send(JSON.stringify({ type: "take", request_id: requestId, ...JSON.parse(body) }));
    });
    const timedOut = !result.ok && result.error === "el maker no respondió a tiempo";
    return Response.json(result, { status: timedOut ? 504 : 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string" || message.length > 256 * 1024) {
      ws.send(JSON.stringify({ type: "error", error: "mensaje inválido o demasiado grande" }));
      return;
    }
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "JSON inválido" }));
      return;
    }
    if (m.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
    } else if (m.type === "reply" && typeof m.request_id === "string") {
      const p = this.pending.get(m.request_id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(m.request_id);
        p.resolve({ ok: m.ok === true, result: m.result, error: typeof m.error === "string" ? m.error : undefined });
      }
    } else if (m.type === "event" && typeof m.room_id === "string" && typeof m.event === "string") {
      const { maker } = ws.deserializeAttachment() as { maker: string };
      const room = this.env.SWAP_ROOM.get(this.env.SWAP_ROOM.idFromName(m.room_id));
      const r = await room.fetch("https://room/append", {
        method: "POST",
        headers: { "x-from-maker": maker },
        body: JSON.stringify({ from: "maker", event: m.event, data: m.data ?? {} }),
      });
      if (!r.ok) ws.send(JSON.stringify({ type: "error", room_id: m.room_id, error: await r.text() }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, "cerrado");
    } catch {
      /* ya cerrado */
    }
  }
}
