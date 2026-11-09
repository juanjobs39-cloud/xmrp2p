/**
 * Worker de la beta de P2P Fiat (separado de la API de producción): misma API (/v1/p2p/*), su propia base
 * de datos, las páginas del sitio como archivos estáticos y el árbitro en un Cloudflare Container.
 * Cada minuto el cron despierta al árbitro; el contenedor se duerme solo cuando no hay tareas.
 */
import { Container, getContainer } from "@cloudflare/containers";
import api, { MakerInbox, P2POrderRoom, SwapRoom } from "./api/index";
import { p2pEnabled, sweepOrders } from "./api/p2p/index";
import { setupWebhook } from "./api/p2p/telegram";
import type { P2PEnv } from "./api/p2p/common";
import type { Env } from "./api/env";

export { MakerInbox, P2POrderRoom, SwapRoom };

type BetaEnv = Env &
  P2PEnv & {
    ARBITER: DurableObjectNamespace<ArbiterContainer>;
    ARBITER_STATE_KEY?: string;
    MONERO_NODE: string;
    PUBLIC_API_URL: string;
  };

export class ArbiterContainer extends Container<BetaEnv> {
  defaultPort = 8080;
  sleepAfter = "15m";
  enableInternet = true;

  constructor(ctx: DurableObjectState<{}>, env: BetaEnv) {
    super(ctx, env);
    this.envVars = {
      API_URL: env.PUBLIC_API_URL,
      P2P_ARBITER_TOKEN: env.P2P_ARBITER_TOKEN ?? "",
      ARBITER_STATE_KEY: env.ARBITER_STATE_KEY ?? "",
      ARBITER_FEE_ADDRESS: env.P2P_FEE_ADDRESS ?? "",
      MONERO_NODE: env.MONERO_NODE,
      XMR_NETWORK: env.P2P_XMR_NETWORK === "mainnet" ? "mainnet" : "stagenet",
    };
  }

  override onError(error: unknown) {
    console.error("árbitro:", error);
    throw error;
  }
}

/** Despierta al árbitro (una sola instancia) para que revise sus tareas. */
async function wakeArbiter(env: BetaEnv) {
  if (!env.P2P_ARBITER_TOKEN || !env.ARBITER_STATE_KEY) return console.log("árbitro sin secretos: no se despierta");
  const r = await getContainer(env.ARBITER, "arbiter").fetch(
    new Request("http://arbiter/tick", { method: "POST", headers: { authorization: `Bearer ${env.P2P_ARBITER_TOKEN}` } }),
  );
  if (r.status !== 202) console.log("árbitro respondió", r.status, await r.text());
}

export default {
  fetch: (req: Request, env: BetaEnv) => api.fetch(req, env),
  async scheduled(_e: ScheduledController, env: BetaEnv, ctx: ExecutionContext) {
    ctx.waitUntil(wakeArbiter(env).catch((e) => console.error("despertar árbitro:", e)));
    if (p2pEnabled(env)) ctx.waitUntil(sweepOrders(env).then((n) => n && console.log("p2p timeouts", n)));
    if (p2pEnabled(env)) ctx.waitUntil(setupWebhook(env).catch((e) => console.error("webhook de telegram:", e)));
  },
} satisfies ExportedHandler<BetaEnv>;
