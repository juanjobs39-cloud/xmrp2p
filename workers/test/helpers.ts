import { SELF } from "cloudflare:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { signedMessage } from "../src/api/auth";

export const BASE = "https://api.xmrp2p.test";

export function newMaker() {
  return privateKeyToAccount(generatePrivateKey());
}

export type Maker = ReturnType<typeof newMaker>;

/** Petición firmada por un maker (mismo formato que usa el daemon de Python). */
export async function signed(maker: Maker, method: string, path: string, body: unknown, tsOffset = 0, extra: Record<string, string> = {}) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000) + tsOffset);
  const sig = await maker.signMessage({ message: await signedMessage(method, path, maker.address, ts, raw) });
  return SELF.fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-maker-address": maker.address, "x-timestamp": ts, "x-signature": sig, ...extra },
    body: raw || undefined,
  });
}

export async function publishOffer(maker: Maker, overrides: Record<string, unknown> = {}) {
  const r = await signed(maker, "PUT", "/v1/offers", {
    network: "arbitrum_sepolia",
    price: "300.5",
    min_usdt: "10",
    max_usdt: "1000",
    max_xmr: "5",
    ...overrides,
  });
  return { r, body: (await r.json()) as Record<string, unknown> };
}

/** Abre el WebSocket del buzón del maker. */
export async function connectInbox(maker: Maker) {
  const path = "/v1/makers/inbox";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await maker.signMessage({ message: await signedMessage("GET", path, maker.address, ts, "") });
  const r = await SELF.fetch(BASE + path, {
    headers: { upgrade: "websocket", "x-maker-address": maker.address, "x-timestamp": ts, "x-signature": sig },
  });
  const ws = r.webSocket;
  if (!ws) throw new Error(`sin WebSocket: ${r.status} ${await r.text()}`);
  ws.accept();
  const inbox: Record<string, unknown>[] = [];
  const waiters: ((m: Record<string, unknown>) => void)[] = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data as string) as Record<string, unknown>;
    const w = waiters.shift();
    if (w) w(m);
    else inbox.push(m);
  });
  const next = () =>
    new Promise<Record<string, unknown>>((res) => {
      const m = inbox.shift();
      if (m) res(m);
      else waiters.push(res);
    });
  return { ws, next };
}

export const TAKER_MESSAGE = {
  spend_public_ed25519: "aa".repeat(32),
  public_secp256k1: "02" + "bb".repeat(32),
  contract_commitment: "0x" + "cc".repeat(32),
  view_private: "dd".repeat(32),
  dleq_proof: "01ab",
};
