// Proveedor que ve la página (mundo MAIN). Solo se inyecta en monerop2p.app y fiat.monerop2p.app.
// No tiene llaves ni acceso a la extensión: pasa cada solicitud al content script por postMessage
// y la extensión decide (y pide aprobación al usuario cuando hace falta).
const TAG = "monerop2p-wallet";
const ICON =
  "data:image/svg+xml;base64," +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#b7410e"/><text x="32" y="44" font-family="Arial" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">m</text></svg>');

let seq = 0;
const waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: unknown) => void }>();

window.addEventListener("message", (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data as { tag?: string; dir?: string; id?: number; result?: unknown; error?: { code: number; message: string } };
  if (!d || d.tag !== TAG || d.dir !== "res" || typeof d.id !== "number") return;
  const w = waiting.get(d.id);
  if (!w) return;
  waiting.delete(d.id);
  if (d.error) w.fail(Object.assign(new Error(d.error.message), { code: d.error.code }));
  else w.ok(d.result);
});

function call(method: string, params?: unknown): Promise<unknown> {
  const id = ++seq;
  return new Promise((ok, fail) => {
    waiting.set(id, { ok, fail });
    window.postMessage({ tag: TAG, dir: "req", id, method, params }, location.origin);
  });
}

type Listener = (...a: unknown[]) => void;
const listeners = new Map<string, Set<Listener>>();

const provider = Object.freeze({
  isMoneroP2P: true,
  request(args: { method: string; params?: unknown }) {
    if (!args || typeof args.method !== "string") return Promise.reject(Object.assign(new Error("invalid request"), { code: -32600 }));
    return call(args.method, args.params);
  },
  on(ev: string, f: Listener) {
    if (!listeners.has(ev)) listeners.set(ev, new Set());
    listeners.get(ev)!.add(f);
    return provider;
  },
  removeListener(ev: string, f: Listener) {
    listeners.get(ev)?.delete(f);
    return provider;
  },
});

// API de Monero para los sitios de MoneroP2P.
const moneroP2P = Object.freeze({
  version: 1,
  /** "mainnet" o "stagenet", o null si aún no hay wallet. No requiere aprobación. */
  getNetwork: () => call("moneroP2P_network") as Promise<"mainnet" | "stagenet" | null>,
  /** Subdirección nueva para recibir XMR. Pide aprobación al usuario. */
  getAddress: () => call("moneroP2P_getAddress") as Promise<string>,
  /** Envía XMR (monto en piconero, en texto). Siempre muestra la confirmación con comisiones. */
  requestTransfer: (p: { address: string; amount: string }) => call("moneroP2P_requestTransfer", [p]) as Promise<{ txid: string }>,
  ethereum: provider,
});

Object.defineProperty(window, "moneroP2P", { value: moneroP2P, configurable: false, writable: false });

// EIP-6963: el sitio pide la lista de wallets y nosotros nos anunciamos (no tocamos window.ethereum).
const info = Object.freeze({ uuid: crypto.randomUUID(), name: "MoneroP2P Wallet", icon: ICON, rdns: "app.monerop2p.wallet" });
function announce() {
  window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
}
window.addEventListener("eip6963:requestProvider", announce);
announce();

export {};
