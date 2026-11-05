// Proceso de fondo. Nunca tiene llaves: controla el bloqueo automático y enruta las solicitudes de los
// sitios de MoneroP2P. Todo lo que firma o revela algo abre una ventana de aprobación (una página de la
// propia extensión), que es la que descifra la llave con la sesión del usuario.
import { CHAINS, type Net } from "./core/evm";
import { allowedOrigin, checkPiconero, checkTx, checkTypedData, ERR, READ_METHODS, RpcError, type ApprovalKind, type PendingRequest } from "./core/provider";

const ALARM = "autolock";

async function minutes(): Promise<number> {
  const { settings } = await chrome.storage.local.get("settings");
  const m = Number((settings as { autolockMin?: number } | undefined)?.autolockMin ?? 15);
  return Number.isFinite(m) && m >= 1 && m <= 240 ? m : 15;
}

async function lock(): Promise<void> {
  await chrome.storage.session.remove(["sessionKey", "lastActive", "evmAddress"]);
  await chrome.alarms.clear(ALARM);
}

// ------------------------------------------------------------------ aprobaciones pendientes

interface Waiter {
  req: PendingRequest;
  resolve: (v: unknown) => void;
  reject: (e: RpcError) => void;
  windowId?: number;
}
const waiters = new Map<string, Waiter>();

/** Una sola ventana a la vez por sitio y tipo, para que un sitio no abra ventanas sin fin. */
function busyFor(origin: string, kind: ApprovalKind): boolean {
  for (const w of waiters.values()) if (w.req.origin === origin && w.req.kind === kind) return true;
  return false;
}

function approve(origin: string, kind: ApprovalKind, params: unknown): Promise<unknown> {
  if (busyFor(origin, kind)) return Promise.reject(new RpcError(-32002, "Ya hay una solicitud igual esperando en la wallet."));
  const id = crypto.randomUUID();
  const req: PendingRequest = { id, kind, origin, params, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const w: Waiter = { req, resolve, reject };
    waiters.set(id, w);
    void chrome.windows
      .create({ url: chrome.runtime.getURL(`popup.html?view=approve&id=${id}`), type: "popup", width: 400, height: 660, focused: true })
      .then((win) => (w.windowId = win?.id))
      .catch(() => {
        waiters.delete(id);
        reject(new RpcError(4900, "No se pudo abrir la ventana de la wallet."));
      });
  });
}

// Cerrar la ventana sin decidir equivale a rechazar.
chrome.windows.onRemoved.addListener((windowId) => {
  for (const [id, w] of waiters) {
    if (w.windowId === windowId) {
      waiters.delete(id);
      w.reject(ERR.rejected());
    }
  }
});

// ------------------------------------------------------------------ estado de la wallet

async function network(): Promise<Net | null> {
  const { network } = await chrome.storage.local.get("network");
  return network === "mainnet" || network === "stagenet" ? network : null;
}

async function chain() {
  return CHAINS[(await network()) ?? "mainnet"];
}

async function connected(origin: string): Promise<boolean> {
  const { sites } = await chrome.storage.local.get("sites");
  return !!(sites as Record<string, unknown> | undefined)?.[origin];
}

async function evmAddress(): Promise<string | null> {
  const { evmAddress } = await chrome.storage.session.get("evmAddress");
  return typeof evmAddress === "string" ? evmAddress : null;
}

/** Cuenta conectada para un sitio; si falta (bloqueada o sin aprobar), pide aprobación. */
async function needAccount(origin: string): Promise<string> {
  const a = await evmAddress();
  if (a && (await connected(origin))) return a;
  const r = (await approve(origin, "connect", null)) as string[];
  return r[0];
}

async function rpcRead(method: string, params: unknown): Promise<unknown> {
  const c = await chain();
  const res = await fetch(c.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: Array.isArray(params) ? params : [] }),
  });
  const j = (await res.json()) as { result?: unknown; error?: { code: number; message: string } };
  if (j.error) throw new RpcError(j.error.code ?? -32603, j.error.message ?? "error del RPC");
  return j.result;
}

async function handle(origin: string, method: string, params: unknown): Promise<unknown> {
  const c = await chain();
  switch (method) {
    case "eth_chainId":
      return `0x${c.id.toString(16)}`;
    case "net_version":
      return String(c.id);
    case "eth_accounts": {
      const a = await evmAddress();
      return a && (await connected(origin)) ? [a] : [];
    }
    case "eth_requestAccounts":
      return [await needAccount(origin)];
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain": {
      const id = Number((Array.isArray(params) ? (params[0] as { chainId?: string }) : undefined)?.chainId);
      if (id === c.id) return null;
      throw ERR.chain();
    }
    case "eth_sendTransaction": {
      const a = await needAccount(origin);
      const tx = checkTx(Array.isArray(params) ? params[0] : undefined, a);
      return approve(origin, "evm_tx", tx);
    }
    case "eth_signTypedData_v4": {
      const a = await needAccount(origin);
      const { data } = checkTypedData(params, a, c.id);
      return approve(origin, "typed_data", data);
    }
    case "moneroP2P_network":
      return network();
    case "moneroP2P_getAddress":
      if (!(await network())) throw new RpcError(4100, "Crea tu wallet primero.");
      return approve(origin, "xmr_address", null);
    case "moneroP2P_requestTransfer": {
      if (!(await network())) throw new RpcError(4100, "Crea tu wallet primero.");
      const p = (Array.isArray(params) ? params[0] : undefined) as { address?: unknown; amount?: unknown } | undefined;
      if (!p || typeof p.address !== "string" || p.address.length < 95 || p.address.length > 106) throw ERR.invalid("dirección inválida");
      const amount = checkPiconero(p.amount);
      return approve(origin, "xmr_transfer", { address: p.address, amount: amount.toString() });
    }
    default:
      if (READ_METHODS.has(method)) return rpcRead(method, params);
      throw ERR.unsupported(method);
  }
}

function originOf(sender: chrome.runtime.MessageSender): string | null {
  try {
    return sender.origin ?? (sender.url ? new URL(sender.url).origin : null);
  } catch {
    return null;
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "provider" || port.sender?.id !== chrome.runtime.id) return port.disconnect();
  const origin = originOf(port.sender);
  // Doble control: el manifiesto ya limita los content scripts a estos orígenes.
  if (!origin || !allowedOrigin(origin) || port.sender.frameId !== 0) return port.disconnect();
  let open = true;
  port.onDisconnect.addListener(() => (open = false));
  port.onMessage.addListener((m: { type?: string; id?: number; method?: string; params?: unknown }) => {
    if (m?.type !== "rpc" || typeof m.id !== "number" || typeof m.method !== "string") return;
    const id = m.id;
    handle(origin, m.method, m.params).then(
      (result) => open && port.postMessage({ id, result: result ?? null }),
      (e: unknown) => {
        const err = e instanceof RpcError ? e : new RpcError(-32603, e instanceof Error ? e.message : String(e));
        if (open) port.postMessage({ id, error: { code: err.code, message: err.message } });
      },
    );
  });
});

// ------------------------------------------------------------------ mensajes de nuestras páginas

type PageMsg =
  | { type: "touch" }
  | { type: "lock" }
  | { type: "getRequest"; id: string }
  | { type: "resolve"; id: string; result?: unknown; error?: { code: number; message: string } }
  | { type: "revokeSite"; origin: string };

// Solo nuestras propias páginas pueden hablar con el fondo por aquí; los content scripts usan el puerto.
chrome.runtime.onMessage.addListener((msg: PageMsg, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !sender.url || !sender.url.startsWith(chrome.runtime.getURL(""))) return;
  void (async () => {
    switch (msg?.type) {
      case "touch":
        await chrome.storage.session.set({ lastActive: Date.now() });
        await chrome.alarms.create(ALARM, { delayInMinutes: await minutes() });
        return reply({ ok: true });
      case "lock":
        await lock();
        return reply({ ok: true });
      case "getRequest":
        return reply({ req: waiters.get(msg.id)?.req ?? null });
      case "resolve": {
        const w = waiters.get(msg.id);
        if (!w) return reply({ ok: false });
        waiters.delete(msg.id);
        if (msg.error) w.reject(new RpcError(msg.error.code, msg.error.message));
        else {
          if (w.req.kind === "connect") {
            const { sites } = await chrome.storage.local.get("sites");
            await chrome.storage.local.set({ sites: { ...(sites as object | undefined), [w.req.origin]: { connectedAt: Date.now() } } });
          }
          w.resolve(msg.result);
        }
        return reply({ ok: true });
      }
      case "revokeSite": {
        const { sites } = await chrome.storage.local.get("sites");
        const next = { ...(sites as Record<string, unknown> | undefined) };
        delete next[msg.origin];
        await chrome.storage.local.set({ sites: next });
        return reply({ ok: true });
      }
      default:
        return reply({ ok: false });
    }
  })();
  return true;
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) void lock();
});

// Al abrir el navegador, empezar bloqueada (session ya se vacía, esto es por si acaso).
chrome.runtime.onStartup.addListener(() => void lock());

// Al instalar, abrir la bienvenida en una pestaña: crear la wallet y anotar la semilla es más
// cómodo y seguro en una página completa que en el popup (que se cierra al perder el foco).
chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === "install") void chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?view=tab") });
});
