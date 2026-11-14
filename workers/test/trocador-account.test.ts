import { env as baseEnv } from "cloudflare:workers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/api/index";
import { signedMessage } from "../src/api/auth";
import { addressMessage } from "../src/api/p2p/addresses";
import { internalAsset } from "../src/api/trocador";

const XMR = "4" + "B".repeat(94);
const OTHER_XMR = "8" + "C".repeat(94);
const env = { ...(baseEnv as object), TROCADOR_API_KEY: "k-test", TROCADOR_WEBHOOK_KEY: "wh-test", TROCADOR_LIMITER: undefined } as never;
const PATH = "/v1/trocador/trades";
let ip = 0;

function mockTrocador() {
  const seen: URL[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const u = new URL(String(input instanceof Request ? input.url : input));
    seen.push(u);
    if (u.pathname === "/coins")
      return Response.json([
        { name: "Bitcoin", ticker: "btc", network: "Mainnet", memo: false, minimum: 0.0001, maximum: 20 },
        { name: "Ethereum (Arbitrum One)", ticker: "eth", network: "Arbitrum", memo: false, minimum: 0.002, maximum: 600 },
      ]);
    if (u.pathname === "/validateaddress") return Response.json({ result: true });
    if (u.pathname === "/new_trade")
      return Response.json({ trade_id: "trAcc" + seen.length, ticker_from: u.searchParams.get("ticker_from"), network_from: u.searchParams.get("network_from"), provider: "P", status: "waiting", amount_from: u.searchParams.get("amount_from"), amount_to: "1", address_provider: "depositAddress0001", fixed: "False" });
    return new Response("{}", { status: 404 });
  });
  return seen;
}

type Acct = ReturnType<typeof privateKeyToAccount>;
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Prueba de que la cuenta declara esa dirección como suya (mismo mensaje que «recibir por apodo»). */
async function proof(k: Acct, asset: "xmr" | "evm", address: string, at = Math.floor(Date.now() / 1000)) {
  return { at, sig: await k.signMessage({ message: addressMessage(k.address, "mainnet", asset, address, at) }) };
}

/** Crea un intercambio; con `k`, firmado por esa cuenta. */
async function create(body: object, k?: Acct, tamper?: (raw: string) => string) {
  const raw = JSON.stringify({ rate_id: "rate1", provider: "P", fixed: false, amount: "50", ...body, nonce: crypto.randomUUID() });
  const headers = new Headers({ "content-type": "application/json", "cf-connecting-ip": `10.9.0.${++ip}` });
  if (k) {
    const ts = String(Math.floor(Date.now() / 1000));
    headers.set("x-maker-address", k.address);
    headers.set("x-timestamp", ts);
    headers.set("x-signature", await k.signMessage({ message: await signedMessage("POST", PATH, k.address, ts, raw) }));
  }
  return worker.fetch(new Request("https://api.test" + PATH, { method: "POST", headers, body: tamper ? tamper(raw) : raw }) as never, env);
}

describe("intercambio con cuenta: lo comprado llega a una wallet de la cuenta", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sabe qué monedas tienen wallet interna", () => {
    expect(internalAsset("buy", { ticker: "btc", network: "Mainnet" })).toBe("xmr");
    expect(internalAsset("sell", { ticker: "usdt", network: "Arbitrum" })).toBe("evm");
    expect(internalAsset("sell", { ticker: "eth", network: "Arbitrum" })).toBe("evm");
    expect(internalAsset("sell", { ticker: "usdt", network: "TRC20" })).toBeNull();
    expect(internalAsset("sell", { ticker: "btc", network: "Mainnet" })).toBeNull();
  });

  it("sin cuenta sigue aceptando cualquier dirección, como siempre", async () => {
    mockTrocador();
    expect((await create({ address: XMR })).status).toBe(200);
  });

  it("con cuenta acepta el XMR en la dirección que la cuenta firmó", async () => {
    const seen = mockTrocador();
    const k = privateKeyToAccount(generatePrivateKey());
    const r = await create({ address: XMR, proof: await proof(k, "xmr", XMR) }, k);
    expect(r.status).toBe(200);
    expect(seen.find((u) => u.pathname === "/new_trade")!.searchParams.get("address")).toBe(XMR);
  });

  it("con cuenta rechaza un destino sin prueba, con prueba de otra dirección o de otra cuenta", async () => {
    const seen = mockTrocador();
    const k = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const noProof = await create({ address: XMR }, k);
    expect(noProof.status).toBe(400);
    expect(((await noProof.json()) as { error: string }).error).toContain("wallet de la plataforma");
    expect((await create({ address: OTHER_XMR, proof: await proof(k, "xmr", XMR) }, k)).status).toBe(400);
    expect((await create({ address: XMR, proof: await proof(other, "xmr", XMR) }, k)).status).toBe(400);
    // Una prueba firmada para la wallet tipo Ethereum no vale para Monero.
    expect((await create({ address: XMR, proof: await proof(k, "evm", XMR) }, k)).status).toBe(400);
    // Ni una prueba vieja (más de un día).
    expect((await create({ address: XMR, proof: await proof(k, "xmr", XMR, Math.floor(Date.now() / 1000) - 90_000) }, k)).status).toBe(400);
    expect(seen.some((u) => u.pathname === "/new_trade")).toBe(false);
  });

  it("al vender XMR por USDT o ETH de Arbitrum exige la wallet tipo Ethereum de la cuenta", async () => {
    mockTrocador();
    const k = privateKeyToAccount(generatePrivateKey());
    const mine = k.address;
    const foreign = privateKeyToAccount(generatePrivateKey()).address;
    expect((await create({ side: "sell", amount: "0.5", ticker: "usdt", network: "Arbitrum", address: mine, proof: await proof(k, "evm", mine) }, k)).status).toBe(200);
    expect((await create({ side: "sell", amount: "0.5", ticker: "eth", network: "Arbitrum", address: mine, proof: await proof(k, "evm", mine) }, k)).status).toBe(200);
    expect((await create({ side: "sell", amount: "0.5", ticker: "usdt", network: "Arbitrum", address: foreign, proof: await proof(k, "evm", mine) }, k)).status).toBe(400);
    expect((await create({ side: "sell", amount: "0.5", ticker: "usdt", network: "Arbitrum", address: foreign }, k)).status).toBe(400);
  });

  it("si la moneda no tiene wallet interna, con cuenta el destino es libre", async () => {
    mockTrocador();
    const k = privateKeyToAccount(generatePrivateKey());
    expect((await create({ side: "sell", amount: "0.5", ticker: "btc", network: "Mainnet", address: "bc1qmyownaddress0000000000" }, k)).status).toBe(200);
  });

  it("rechaza una petición con la firma de la cuenta rota o el cuerpo cambiado", async () => {
    const seen = mockTrocador();
    const k = privateKeyToAccount(generatePrivateKey());
    const p = await proof(k, "xmr", XMR);
    const r = await create({ address: XMR, proof: p }, k, (raw) => raw.replace('"amount":"50"', '"amount":"51"'));
    expect(r.status).toBe(401);
    expect(seen.some((u) => u.pathname === "/new_trade")).toBe(false);
  });
});
