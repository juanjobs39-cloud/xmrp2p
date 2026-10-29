import { verifyMaker } from "./auth";
import { assertUsdtCap, decimal, Env, HttpError, json, randomId, readJson, requireNetwork } from "./env";

export interface Offer {
  id: string;
  maker: string;
  network: string;
  price: string; // USDT por XMR (con margen del maker)
  min_usdt: string;
  max_usdt: string;
  max_xmr: string;
  expires_at: number;
  updated_at: number;
}

const now = () => Math.floor(Date.now() / 1000);

export async function listOffers(env: Env, network: string): Promise<Offer[]> {
  const r = await env.DB.prepare(
    "SELECT id, maker, network, price, min_usdt, max_usdt, max_xmr, expires_at, updated_at FROM offers" +
      " WHERE network = ? AND expires_at > ? ORDER BY CAST(price AS REAL) ASC LIMIT 100",
  )
    .bind(network, now())
    .all<Offer>();
  return r.results;
}

export async function getOffer(env: Env, id: string): Promise<Offer | null> {
  return env.DB.prepare("SELECT * FROM offers WHERE id = ? AND expires_at > ?").bind(id, now()).first<Offer>();
}

/** Cotización indicativa: la mejor oferta que admite el monto. La definitiva la da el maker al tomarla. */
/**
 * Mejor oferta para un monto en USDT o en XMR (para agregadores como Trocador). Las ofertas vienen
 * ordenadas por precio (USDT por XMR) de menor a mayor: la primera que cubre el monto es la mejor.
 * Devuelve también los límites disponibles y el enlace para continuar el swap en la app.
 */
export async function bestQuote(env: Env, network: string, amount: { usdt?: string; xmr?: string }, ref?: string | null) {
  const offers = await listOffers(env, network);
  const limits = offers.length
    ? { min_usdt: String(Math.min(...offers.map((o) => Number(o.min_usdt)))), max_usdt: String(Math.max(...offers.map((o) => Number(o.max_usdt)))) }
    : null;
  const fits = (o: Offer, usdt: number) => usdt >= Number(o.min_usdt) && usdt <= Number(o.max_usdt) && usdt / Number(o.price) <= Number(o.max_xmr);
  let best: Offer | undefined;
  let usdt = 0;
  for (const o of offers) {
    const u = amount.usdt !== undefined ? Number(amount.usdt) : Math.ceil(Number(amount.xmr) * Number(o.price) * 1e6) / 1e6;
    if (fits(o, u)) {
      best = o;
      usdt = u;
      break;
    }
  }
  if (!best) return { quote: null, limits };
  const xmr = Math.floor((usdt / Number(best.price)) * 1e12) / 1e12;
  const site = env.SITE_URL ?? "https://monerop2p.app";
  const q = new URLSearchParams({ usdt: String(usdt), offer: best.id });
  if (network !== "arbitrum_one") q.set("red", "prueba");
  if (ref && /^[a-zA-Z0-9_-]{1,32}$/.test(ref)) q.set("ref", ref);
  return {
    quote: {
      network,
      usdt: String(usdt),
      xmr: xmr.toFixed(12),
      price: best.price,
      offer_id: best.id,
      maker: best.maker,
      expires_at: best.expires_at,
      indicative: true,
      // El comprador paga solo el gas de la red; la comisión de MoneroP2P (0,5 %) la paga el maker.
      buyer_fee: "network gas only",
      eta_minutes: 45,
      app_url: `${site}/en/app/?${q.toString()}`,
    },
    limits,
  };
}

export async function handleOffers(req: Request, env: Env, url: URL): Promise<Response> {
  if (req.method === "GET") {
    const network = requireNetwork(env, url.searchParams.get("network"));
    return json({ network, offers: await listOffers(env, network) });
  }
  if (req.method === "PUT") {
    const { raw, data } = await readJson<Record<string, unknown>>(req);
    const maker = await verifyMaker(req, url.pathname, raw);
    const network = requireNetwork(env, typeof data.network === "string" ? data.network : null);
    const price = decimal(data.price, "price");
    const min = decimal(data.min_usdt, "min_usdt");
    const max = decimal(data.max_usdt, "max_usdt");
    const maxXmr = decimal(data.max_xmr, "max_xmr");
    if (Number(min) > Number(max)) throw new HttpError(400, "min_usdt mayor que max_usdt");
    assertUsdtCap(network, max, "max_usdt");
    const ttl = Math.min(Number(data.ttl ?? env.MAX_OFFER_TTL), Number(env.MAX_OFFER_TTL));
    if (!(ttl > 0)) throw new HttpError(400, "ttl inválido");
    const t = now();
    const existing = await env.DB.prepare("SELECT id FROM offers WHERE maker = ? AND network = ?")
      .bind(maker, network)
      .first<{ id: string }>();
    const id = existing?.id ?? randomId(12);
    await env.DB.prepare(
      "INSERT INTO offers (id, maker, network, price, min_usdt, max_usdt, max_xmr, expires_at, created_at, updated_at)" +
        " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)" +
        " ON CONFLICT(maker, network) DO UPDATE SET price=?4, min_usdt=?5, max_usdt=?6, max_xmr=?7, expires_at=?8, updated_at=?9",
    )
      .bind(id, maker, network, price, min, max, maxXmr, t + ttl, t)
      .run();
    return json({ id, maker, network, expires_at: t + ttl });
  }
  if (req.method === "DELETE") {
    const { raw, data } = await readJson<Record<string, unknown>>(req);
    const maker = await verifyMaker(req, url.pathname, raw);
    const network = requireNetwork(env, typeof data.network === "string" ? data.network : null);
    await env.DB.prepare("DELETE FROM offers WHERE maker = ? AND network = ?").bind(maker, network).run();
    return json({ deleted: true });
  }
  throw new HttpError(405, "método no permitido");
}
