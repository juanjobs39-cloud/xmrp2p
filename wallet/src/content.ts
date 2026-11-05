// Puente (mundo aislado) entre la página y el fondo de la extensión. No decide nada:
// el fondo sabe el origen real por el remitente del puerto, no por lo que diga la página.
const TAG = "monerop2p-wallet";

let port: chrome.runtime.Port | null = null;
const pending = new Set<number>();
let beat: ReturnType<typeof setInterval> | undefined;

function reply(id: number, body: { result?: unknown; error?: { code: number; message: string } }) {
  pending.delete(id);
  if (!pending.size) clearInterval(beat), (beat = undefined);
  window.postMessage({ tag: TAG, dir: "res", id, ...body }, location.origin);
}

function getPort(): chrome.runtime.Port {
  if (port) return port;
  const p = chrome.runtime.connect({ name: "provider" });
  p.onMessage.addListener((m: { id: number; result?: unknown; error?: { code: number; message: string } }) => {
    if (typeof m?.id === "number" && pending.has(m.id)) reply(m.id, m);
  });
  p.onDisconnect.addListener(() => {
    port = null;
    // El fondo se reinició: las solicitudes en curso ya no tendrán respuesta.
    for (const id of [...pending]) reply(id, { error: { code: 4900, message: "La wallet se reinició. Intenta de nuevo." } });
  });
  port = p;
  return p;
}

window.addEventListener("message", (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data as { tag?: string; dir?: string; id?: number; method?: unknown; params?: unknown };
  if (!d || d.tag !== TAG || d.dir !== "req" || typeof d.id !== "number" || typeof d.method !== "string") return;
  pending.add(d.id);
  // Mientras hay solicitudes esperando al usuario, un latido mantiene vivo al service worker.
  beat ??= setInterval(() => port?.postMessage({ type: "ping" }), 20_000);
  try {
    getPort().postMessage({ type: "rpc", id: d.id, method: d.method, params: d.params ?? null });
  } catch {
    reply(d.id, { error: { code: 4900, message: "La wallet no está disponible." } });
  }
});

export {};
