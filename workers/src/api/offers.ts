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
export async function bestQuote(env: Env, network: string, usdt: string) {
  const amount = Number(usdt);
  const offers = (await listOffers(env, network)).filter(
    (o) => amount >= Number(o.min_usdt) && amount <= Number(o.max_usdt) && amount / Number(o.price) <= Number(o.max_xmr),
  );
  const best = offers[0];
  if (!best) return null;
  const xmr = Math.floor((amount / Number(best.price)) * 1e12) / 1e12;
  return { network, usdt, offer_id: best.id, maker: best.maker, price: best.price, xmr: xmr.toFixed(12), indicative: true };
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
