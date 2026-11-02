// Arranque del árbitro.
//   ARBITER_MODE=loop    → revisa tareas cada POLL_SECONDS (para probar en tu computadora o en un VPS)
//   ARBITER_MODE=server  → espera que el Worker lo despierte con POST /tick (Cloudflare Containers)
//
// Variables (los secretos van como secretos de Cloudflare o variables de entorno, nunca en el repo):
//   API_URL                  https://api.monerop2p.app (o http://127.0.0.1:8787 en local)
//   P2P_ARBITER_TOKEN        secreto compartido con el backend
//   ARBITER_STATE_KEY        secreto (≥ 32 caracteres) que cifra el estado de las wallets de escrow
//   ARBITER_FEE_ADDRESS      dirección de Monero donde cobra la plataforma
//   MONERO_NODE              nodo de Monero (stagenet o mainnet)
//   XMR_NETWORK              stagenet | mainnet
import { createServer } from "node:http";
import { Arbiter, apiClient } from "./arbiter.mjs";

const env = process.env;
const need = (k) => {
  if (!env[k]) throw new Error(`falta la variable ${k}`);
  return env[k];
};

const network = env.XMR_NETWORK === "mainnet" ? "mainnet" : "stagenet";
const arbiter = await new Arbiter({
  api: apiClient(need("API_URL").replace(/\/$/, ""), need("P2P_ARBITER_TOKEN")),
  network,
  node: need("MONERO_NODE"),
  stateSecret: need("ARBITER_STATE_KEY"),
  feeAddress: need("ARBITER_FEE_ADDRESS"),
}).init();

let running = null;
/** Corre pasadas mientras haya tareas (máx. ~9 min por despertar), una a la vez. */
function work() {
  running ??= (async () => {
    const until = Date.now() + 9 * 60_000;
    try {
      while (Date.now() < until) {
        const pending = await arbiter.tick();
        if (!pending) break;
        await new Promise((r) => setTimeout(r, 15_000));
      }
    } catch (e) {
      console.error("tick:", e?.message ?? e);
    } finally {
      running = null;
    }
  })();
  return running;
}

if (env.ARBITER_MODE === "server") {
  const port = Number(env.PORT ?? 8080);
  createServer((req, res) => {
    if (req.url === "/health") return res.end("ok");
    if (req.url === "/tick" && req.method === "POST" && req.headers.authorization === `Bearer ${env.P2P_ARBITER_TOKEN}`) {
      void work();
      res.writeHead(202);
      return res.end("trabajando");
    }
    res.writeHead(404);
    res.end();
  }).listen(port, () => console.log(`árbitro (${network}) escuchando en :${port}`));
} else {
  const every = Number(env.POLL_SECONDS ?? 20) * 1000;
  console.log(`árbitro (${network}) revisando tareas cada ${every / 1000} s`);
  for (;;) {
    await work();
    await new Promise((r) => setTimeout(r, every));
  }
}
