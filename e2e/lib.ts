/**
 * Piezas del taker automatizado. Reutiliza la lógica de la app (decide.ts, recovery.ts, ABIs de
 * evm.ts) y sustituye MetaMask por una cuenta local de prueba (solo testnet).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { ESCROW_ABI, FACTORY_ABI } from "../web/src/app/abi.ts";
import type { ChainView, Stage } from "../web/src/app/decide.ts";

const require = createRequire(import.meta.url);
export const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SECRETS = join(ROOT, "e2e", ".secrets");

export interface Cfg {
  api: string;
  rpc: string;
  factory: Address;
  token: Address;
  node: string; // nodo Monero (proxy en la raíz del host)
  network: "stagenet";
  takerXmrAddress: string;
}

export const cfg: Cfg = JSON.parse(readFileSync(join(ROOT, "e2e", "config.json"), "utf8"));

/** Descifra un keystore de Foundry (la llave solo vive en memoria). */
export function loadKey(name: string): Hex {
  const pw = readFileSync(join(SECRETS, `${name}.password`), "utf8").trim();
  const out = execFileSync(join(process.env.USERPROFILE ?? "", ".foundry", "bin", "cast.exe"), [
    "wallet", "decrypt-keystore", name, "-k", SECRETS, "--unsafe-password", pw,
  ]).toString();
  const m = /0x[0-9a-fA-F]{64}/.exec(out);
  if (!m) throw new Error(`no se pudo descifrar ${name}`);
  return m[0] as Hex;
}

// ------------------------------------------------------------------ núcleo cripto (Rust → WASM para Node)
export interface Keys {
  spend_private: string;
  contract_secret: Hex;
  message: Record<string, string>;
}
const crypto = require(join(ROOT, "crypto-wasm", "pkg-node", "xmrp2p_crypto.js")) as {
  generateKeys(): string;
  restoreKeys(s: string): string;
  verifyCounterparty(m: string): string;
  sharedAddress(own: string, cp: string, net: string): string;
  recoverWallet(own: string, cp: string, secret: string, net: string): string;
};
export const core = {
  generate: (): Keys => JSON.parse(crypto.generateKeys()),
  verify: (m: unknown) => crypto.verifyCounterparty(JSON.stringify(m)),
  shared: (own: string, m: unknown) => JSON.parse(crypto.sharedAddress(own, JSON.stringify(m), cfg.network)) as { address: string; private_view_key: string },
  recover: (own: string, m: unknown, secret: string) =>
    JSON.parse(crypto.recoverWallet(own, JSON.stringify(m), secret, cfg.network)) as { address: string; private_view_key: string; private_spend_key: string },
};

// ------------------------------------------------------------------ API del backend
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(cfg.api + path, init);
  const b = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(`${path}: ${b.error ?? r.status}`);
  return b;
}
export const api = {
  offers: () => call<{ offers: { id: string; price: string; min_usdt: string; max_usdt: string }[] }>(`/v1/offers?network=arbitrum_sepolia`),
  createSwap: (offer_id: string, usdt: string, taker_message: unknown) =>
    call<{ room_id: string; room_token: string; maker_reply: any }>("/v1/swaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id, usdt, taker_message }),
    }),
  events: (room: string, token: string, after: number) =>
    call<{ messages: { seq: number; from: string; event: string; data: any }[] }>(`/v1/swaps/${room}/events?after=${after}`, {
      headers: { "x-room-token": token },
    }),
  message: (room: string, token: string, event: string, data: unknown) =>
    call(`/v1/swaps/${room}/messages`, { method: "POST", headers: { "x-room-token": token, "content-type": "application/json" }, body: JSON.stringify({ event, data }) }),
};

// ------------------------------------------------------------------ EVM con cuenta local
const TOKEN_ABI = [
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "eip712Domain", stateMutability: "view", inputs: [],
    outputs: [{ type: "bytes1" }, { type: "string" }, { type: "string" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }, { type: "uint256[]" }],
  },
] as const;
const STAGES: Stage[] = ["UNINITIALIZED", "PENDING", "READY", "COMPLETED"];

export class Chain {
  pub = createPublicClient({ chain: arbitrumSepolia, transport: http(cfg.rpc) });
  account;
  wallet;
  constructor(key: Hex) {
    this.account = privateKeyToAccount(key);
    this.wallet = createWalletClient({ account: this.account, chain: arbitrumSepolia, transport: http(cfg.rpc) });
  }

  private queue: Promise<unknown> = Promise.resolve();

  /** Serializa las transacciones de la cuenta: los casos corren en paralelo y comparten nonce. */
  write(address: Address, abi: any, functionName: string, args: unknown[] = []): Promise<Hex> {
    const run = this.queue.then(() => this.writeNow(address, abi, functionName, args));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async writeNow(address: Address, abi: any, functionName: string, args: unknown[]): Promise<Hex> {
    const { request } = await this.pub.simulateContract({ account: this.account, address, abi, functionName, args } as any);
    const hash = await this.wallet.writeContract(request as any);
    const r = await this.pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${functionName} revirtió (${hash})`);
    return hash;
  }

  tokenBalance(a: Address) {
    return this.pub.readContract({ address: cfg.token, abi: TOKEN_ABI, functionName: "balanceOf", args: [a] });
  }

  faucet(amount: bigint) {
    return this.write(cfg.token, TOKEN_ABI, "faucet", [amount]);
  }

  /** Depósito con permit (EIP-2612), igual que la app. */
  async deposit(p: { claimer: Address; claimCommitment: Hex; refundCommitment: Hex; d0: number; d1: number; amount: bigint; salt: Hex }) {
    const escrow = await this.pub.readContract({ address: cfg.factory, abi: FACTORY_ABI, functionName: "predictEscrow", args: [this.account.address, p.salt] });
    // Idempotente (como la app): si un intento anterior ya depositó con este salt, no repetir.
    const code = await this.pub.getCode({ address: escrow });
    if (code && code !== "0x") {
      const now = Number(await this.pub.getBlockNumber());
      return { escrow, hash: "0x" as Hex, block: Math.max(0, now - 100_000) };
    }
    const d = await this.pub.readContract({ address: cfg.token, abi: TOKEN_ABI, functionName: "eip712Domain" });
    const nonce = await this.pub.readContract({ address: cfg.token, abi: TOKEN_ABI, functionName: "nonces", args: [this.account.address] });
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    const sig = await this.account.signTypedData({
      domain: { name: d[1], version: d[2], chainId: arbitrumSepolia.id, verifyingContract: cfg.token },
      types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
      primaryType: "Permit",
      message: { owner: this.account.address, spender: cfg.factory, value: p.amount, nonce, deadline },
    });
    const r = `0x${sig.slice(2, 66)}` as Hex, s = `0x${sig.slice(66, 130)}` as Hex, v = parseInt(sig.slice(130, 132), 16);
    const hash = await this.write(cfg.factory, FACTORY_ABI, "newSwapWithPermit", [
      p.claimer, p.claimCommitment, p.refundCommitment, BigInt(p.d0), BigInt(p.d1), p.amount, p.salt, deadline, v, r, s,
    ]);
    const rc = await this.pub.getTransactionReceipt({ hash });
    return { escrow, hash, block: Number(rc.blockNumber) };
  }

  async view(escrow: Address, fromBlock: number): Promise<ChainView> {
    const read = (fn: string) => this.pub.readContract({ address: escrow, abi: ESCROW_ABI, functionName: fn as never }) as Promise<any>;
    const [stage, t0, t1, block] = await Promise.all([read("stage"), read("t0"), read("t1"), this.pub.getBlock()]);
    const v: ChainView = { now: Number(block.timestamp), t0: Number(t0), t1: Number(t1), stage: STAGES[stage]! };
    if (v.stage === "COMPLETED") {
      for (const l of await this.pub.getContractEvents({ address: escrow, abi: ESCROW_ABI, fromBlock: BigInt(fromBlock) })) {
        if (l.eventName === "Claimed" || l.eventName === "Refunded") v.revealed = { kind: l.eventName, secret: (l.args as any).secret };
      }
    }
    return v;
  }

  setReady(escrow: Address) {
    return this.write(escrow, ESCROW_ABI, "setReady");
  }

  refund(escrow: Address, secret: Hex) {
    return this.write(escrow, ESCROW_ABI, "refund", [secret, this.account.address]);
  }
}

// ------------------------------------------------------------------ Monero (monero-ts en Node, mismas funciones que la app)
let moneroTs: any;
async function mt() {
  moneroTs ??= (await import("monero-ts")).default;
  return moneroTs;
}

export async function daemonHeight(node = cfg.node): Promise<number> {
  const m = await mt();
  const d = await m.connectToDaemonRpc({ uri: node, proxyToWorker: false });
  return d.getHeight();
}

export async function verifyLock(p: { node?: string; txid: string; txKey: string; address: string }) {
  const m = await mt();
  const w = await m.createWalletFull({ networkType: m.MoneroNetworkType.STAGENET, server: { uri: p.node ?? cfg.node }, password: "e2e", proxyToWorker: false });
  try {
    const c = await w.checkTxKey(p.txid, p.txKey, p.address);
    return { received: BigInt(c.getReceivedAmount() ?? 0), confirmations: Number(c.getNumConfirmations() ?? 0) };
  } finally {
    await w.close();
  }
}

export async function sweep(p: { address: string; viewKey: string; spendKey: string; restoreHeight: number; destination: string }) {
  const m = await mt();
  const w = await m.createWalletFull({
    networkType: m.MoneroNetworkType.STAGENET, server: { uri: cfg.node }, password: "e2e", proxyToWorker: false,
    primaryAddress: p.address, privateViewKey: p.viewKey, privateSpendKey: p.spendKey, restoreHeight: p.restoreHeight,
  });
  try {
    await w.sync();
    const bal = BigInt(await w.getBalance());
    const unlocked = BigInt(await w.getUnlockedBalance());
    // Un intento anterior pudo haber enviado el barrido y fallar después (hallazgo de la Fase 7):
    // si la dirección compartida ya está vacía y tiene una salida, el barrido está hecho.
    if (bal === 0n) {
      const out = (await w.getTxs()).filter((t: any) => BigInt(t.getOutgoingAmount() ?? 0n) > 0n);
      if (out.length) return { txids: out.map((t: any) => t.getHash()) as string[], balance: 0n, unlocked: 0n, alreadySwept: true };
    }
    if (unlocked === 0n) return { txids: [] as string[], balance: bal, unlocked };
    const txs = await w.sweepUnlocked({ address: p.destination, relay: true });
    return { txids: txs.map((t: any) => t.getHash()) as string[], balance: bal, unlocked };
  } finally {
    await w.close();
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
