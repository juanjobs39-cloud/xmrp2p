import { DurableObject } from "cloudflare:workers";
import { assertNoPrivateKeys, HttpError, type Env } from "../api/env";

interface Meta {
  room_id: string;
  maker: string;
  taker_token_hash: string;
  network: string;
  created_at: number;
}

interface Message {
  seq: number;
  at: number;
  from: "maker" | "taker";
  event: string;
  data: unknown;
}

const MAX_MESSAGES = 200;
const ROOM_TTL_MS = 3 * 24 * 3600 * 1000; // la sala se borra sola a los 3 días

/**
 * Sala de un swap: guarda y reenvía los mensajes del protocolo entre taker y maker.
 * Solo transporta mensajes públicos del protocolo (nunca llaves de gasto completas).
 * El taker se autentica con el token que recibió al crear el swap; el maker, vía su buzón.
 */
export class SwapRoom extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    try {
      return await this.route(req);
    } catch (e) {
      if (e instanceof HttpError) return new Response(e.message, { status: e.status });
      throw e;
    }
  }

  private async route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const meta = await this.ctx.storage.get<Meta>("meta");
    switch (url.pathname) {
      case "/init": {
        if (meta) return new Response("ya inicializada", { status: 409 });
        const m = (await req.json()) as Omit<Meta, "created_at">;
        await this.ctx.storage.put("meta", { ...m, created_at: Date.now() } satisfies Meta);
        await this.ctx.storage.put("seq", 0);
        await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
        return new Response("ok");
      }
      case "/append": {
        if (!meta) return new Response("sala inexistente", { status: 404 });
        const fromMaker = req.headers.get("x-from-maker");
        if (fromMaker !== null && fromMaker !== meta.maker) return new Response("no eres el maker de esta sala", { status: 403 });
        const body = (await req.json()) as { event: string; data: unknown };
        assertNoPrivateKeys(body.data);
        const msg = await this.append("maker", body.event, body.data);
        this.broadcast(msg);
        return Response.json(msg);
      }
      case "/taker-message": {
        if (!meta) return new Response("sala inexistente", { status: 404 });
        this.requireTaker(req, meta);
        const body = (await req.json()) as { event?: unknown; data?: unknown };
        if (typeof body.event !== "string" || body.event.length > 64) return new Response("event inválido", { status: 400 });
        assertNoPrivateKeys(body.data);
        const msg = await this.append("taker", body.event, body.data ?? {});
        const inbox = this.env.MAKER_INBOX.get(this.env.MAKER_INBOX.idFromName(meta.maker));
        await inbox.fetch("https://inbox/deliver", {
          method: "POST",
          body: JSON.stringify({ type: "taker_message", room_id: meta.room_id, ...msg }),
        });
        return Response.json(msg);
      }
      case "/events": {
        if (!meta) return new Response("sala inexistente", { status: 404 });
        this.requireTaker(req, meta);
        const after = Number(url.searchParams.get("after") ?? "0");
        return Response.json({ messages: await this.messagesAfter(after) });
      }
      case "/ws": {
        if (!meta) return new Response("sala inexistente", { status: 404 });
        this.requireTaker(req, meta);
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
    }
    return new Response("no encontrado", { status: 404 });
  }

  private requireTaker(req: Request, meta: Meta): void {
    if (req.headers.get("x-token-hash") !== meta.taker_token_hash) throw new HttpError(403, "token de sala inválido");
  }

  private async append(from: "maker" | "taker", event: string, data: unknown): Promise<Message> {
    const seq = ((await this.ctx.storage.get<number>("seq")) ?? 0) + 1;
    if (seq > MAX_MESSAGES) throw new HttpError(429, "la sala alcanzó el máximo de mensajes");
    const msg: Message = { seq, at: Date.now(), from, event, data };
    await this.ctx.storage.put({ seq, [`m:${String(seq).padStart(4, "0")}`]: msg });
    return msg;
  }

  private async messagesAfter(after: number): Promise<Message[]> {
    const all = await this.ctx.storage.list<Message>({ prefix: "m:" });
    return [...all.values()].filter((m) => m.seq > after);
  }

  private broadcast(msg: Message): void {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        /* conexión cerrada */
      }
    }
  }

  async webSocketMessage(ws: WebSocket): Promise<void> {
    // El taker escribe por POST /messages; el WebSocket es solo para recibir.
    ws.send(JSON.stringify({ type: "error", error: "usa POST /messages para escribir" }));
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
