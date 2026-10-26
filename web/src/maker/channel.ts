/**
 * Conexión del maker en el navegador con el backend (mismo protocolo que `maker/xmrp2p_maker/channel.py`):
 * ofertas firmadas (EIP-191) y buzón por WebSocket. El navegador no puede firmar cabeceras de un
 * WebSocket, así que pide antes un ticket de un solo uso (`POST /v1/makers/ws-ticket`).
 */
import type { PrivateKeyAccount } from "viem/accounts";

export interface TakeRequest {
  type: "take";
  request_id: string;
  room_id: string;
  network: string;
  usdt: string;
  taker_message: Record<string, unknown>;
}

async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class MakerChannel {
  private ws: WebSocket | null = null;
  private stopped = true;
  private backoff = 1000;
  private ping: ReturnType<typeof setInterval> | null = null;
  onTake: (m: TakeRequest) => Promise<unknown> = async () => {
    throw new Error("sin manejador");
  };
  onState: (online: boolean, detail?: string) => void = () => {};
  /** El backend dejó de esperar la respuesta a esta solicitud (el taker recibió un error). */
  onExpired: (requestId: string) => void = () => {};

  constructor(private api: string, private account: PrivateKeyAccount, private network: string) {}

  /** Petición firmada: xmrp2p|MÉTODO|ruta|dirección|ts|sha256(cuerpo). */
  private async signed(method: string, path: string, body: string): Promise<Response> {
    const ts = String(Math.floor(Date.now() / 1000));
    const msg = `xmrp2p|${method}|${path}|${this.account.address.toLowerCase()}|${ts}|${await sha256Hex(body)}`;
    const sig = await this.account.signMessage({ message: msg });
    return fetch(this.api + path, {
      method,
      headers: { "content-type": "application/json", "x-maker-address": this.account.address, "x-timestamp": ts, "x-signature": sig },
      body: body || undefined,
    });
  }

  async publishOffer(o: { price: string; min_usdt: string; max_usdt: string; max_xmr: string; ttl: number }): Promise<void> {
    const body = JSON.stringify({ network: this.network, ...o });
    const r = await this.signed("PUT", "/v1/offers", body);
    if (!r.ok) throw new Error(`no se pudo publicar la oferta: ${((await r.json().catch(() => ({}))) as { error?: string }).error ?? r.status}`);
  }

  async withdrawOffer(): Promise<void> {
    await this.signed("DELETE", "/v1/offers", JSON.stringify({ network: this.network })).catch(() => undefined);
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.ping) clearInterval(this.ping);
    this.ws?.close(1000, "maker en pausa");
    this.ws = null;
    this.onState(false);
  }

  get online(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  sendEvent(roomId: string, event: string, data: unknown): boolean {
    if (!this.online) return false;
    this.ws!.send(JSON.stringify({ type: "event", room_id: roomId, event, data }));
    return true;
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      const r = await this.signed("POST", "/v1/makers/ws-ticket", "");
      if (!r.ok) throw new Error(`ticket rechazado (${r.status})`);
      const { ticket } = (await r.json()) as { ticket: string };
      const url = `${this.api.replace(/^http/, "ws")}/v1/makers/inbox?maker=${this.account.address.toLowerCase()}&ticket=${ticket}`;
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        this.backoff = 1000;
        this.onState(true);
        if (this.ping) clearInterval(this.ping);
        this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "ping" })), 30_000);
      };
      ws.onmessage = (e) => void this.handle(ws, String(e.data));
      ws.onclose = (e) => {
        if (this.ping) clearInterval(this.ping);
        if (this.ws === ws) this.ws = null;
        this.onState(false, e.reason || undefined);
        this.retry();
      };
    } catch (e) {
      this.onState(false, (e as Error).message);
      this.retry();
    }
  }

  private retry(): void {
    if (this.stopped) return;
    setTimeout(() => void this.connect(), this.backoff);
    this.backoff = Math.min(this.backoff * 2, 60_000);
  }

  private async handle(ws: WebSocket, raw: string): Promise<void> {
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.type === "take_expired" && typeof m.request_id === "string") {
      this.onExpired(m.request_id);
      return;
    }
    if (m.type !== "take") return;
    const req = m as unknown as TakeRequest;
    try {
      const result = await this.onTake(req);
      ws.send(JSON.stringify({ type: "reply", request_id: req.request_id, ok: true, result }));
    } catch (e) {
      ws.send(JSON.stringify({ type: "reply", request_id: req.request_id, ok: false, error: (e as Error).message }));
    }
  }
}
