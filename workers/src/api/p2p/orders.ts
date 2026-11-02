import { HttpError, json, randomId, readJson } from "../env";
import { adPrice, getAd } from "./ads";
import { xmrPrice, type Method } from "./catalog";
import { activeUser, fiatAmount, fromPico, getUser, now, PICO, publicUser, requireXmrAddress, settings, signer, text, type P2PEnv } from "./common";

/**
 * Estados de una orden:
 *   setup → awaiting_deposit → confirming → awaiting_payment → paid → releasing → released
 * y además: cancelled (sin depósito), refunding → refunded (con depósito),
 * disputed → resolving → resolved_buyer | resolved_seller.
 */
export type Status =
  | "setup"
  | "awaiting_deposit"
  | "confirming"
  | "awaiting_payment"
  | "paid"
  | "releasing"
  | "released"
  | "cancelled"
  | "refunding"
  | "refunded"
  | "disputed"
  | "resolving"
  | "resolved_buyer"
  | "resolved_seller";

export const FINAL: Status[] = ["released", "cancelled", "refunded", "resolved_buyer", "resolved_seller"];
const NO_DEPOSIT: Status[] = ["setup", "awaiting_deposit"];

/** Reserva para la comisión de red de la transacción de salida del escrow (0.0001 XMR). */
export const NETWORK_FEE_RESERVE_PICO = 100_000_000n;

/** Órdenes abiertas como máximo por usuario (evita que alguien bloquee anuncios ajenos). */
const MAX_OPEN_ORDERS = 3;

export interface Order {
  id: string;
  ad_id: string;
  maker: string;
  buyer: string;
  seller: string;
  fiat: string;
  method: string;
  price: string;
  fiat_amount: string;
  xmr_pico: string;
  fee_pico: string;
  usd_value: number;
  status: Status;
  pay_window_min: number;
  deadline_at: number | null;
  buyer_address: string;
  seller_refund_address: string;
  multisig_address: string | null;
  deposit_txid: string | null;
  payout_txid: string | null;
  enc_payment: string | null;
  release_auth: string | null;
  cancel_reason: string | null;
  created_at: number;
  updated_at: number;
  paid_at: number | null;
  funded_at: number | null;
  closed_at: number | null;
}

export type Role = "buyer" | "seller" | "admin";

export async function getOrder(env: P2PEnv, id: string): Promise<Order> {
  const o = await env.DB.prepare("SELECT * FROM p2p_orders WHERE id = ?").bind(id).first<Order>();
  if (!o) throw new HttpError(404, "orden no encontrada");
  return o;
}

export function roleOf(env: P2PEnv, o: Order, user: string): Role {
  if (user === o.buyer) return "buyer";
  if (user === o.seller) return "seller";
  if (env.P2P_ADMIN_ADDRESS && user === env.P2P_ADMIN_ADDRESS.toLowerCase()) return "admin";
  throw new HttpError(403, "no participas en esta orden");
}

export function depositRequired(o: Pick<Order, "xmr_pico" | "fee_pico">): bigint {
  return BigInt(o.xmr_pico) + BigInt(o.fee_pico) + NETWORK_FEE_RESERVE_PICO;
}

/** Agrega un evento a la sala de la orden (chat y línea de tiempo). */
export async function roomEvent(env: P2PEnv, orderId: string, from: "system" | "buyer" | "seller" | "admin" | "arbiter", body: Record<string, unknown>) {
  const room = env.P2P_ORDER_ROOM.get(env.P2P_ORDER_ROOM.idFromName(orderId));
  await room.fetch("https://room/append", { method: "POST", headers: { "x-from": from }, body: JSON.stringify(body) });
}

/** Cambia el estado solo si sigue en uno de los esperados (evita carreras entre peticiones). */
export async function transition(env: P2PEnv, o: Order, from: Status[], to: Status, set: Record<string, unknown> = {}): Promise<Order> {
  const fields = { ...set, status: to, updated_at: now() };
  const keys = Object.keys(fields);
  const r = await env.DB.prepare(
    `UPDATE p2p_orders SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ? AND status IN (${from.map(() => "?").join(", ")})`,
  )
    .bind(...keys.map((k) => fields[k as keyof typeof fields]), o.id, ...from)
    .run();
  if (!r.meta.changes) throw new HttpError(409, `la orden ya no está en ${from.join(" / ")}`);
  await roomEvent(env, o.id, "system", { type: "status", status: to, ...(set.cancel_reason ? { reason: set.cancel_reason } : {}) });
  return getOrder(env, o.id);
}

/** Devuelve al anuncio el XMR que la orden tenía apartado. */
async function restoreAd(env: P2PEnv, o: Order) {
  await env.DB.prepare("UPDATE p2p_ads SET remaining_pico = CAST(CAST(remaining_pico AS INTEGER) + ? AS TEXT), updated_at = ? WHERE id = ?")
    .bind(o.xmr_pico, now(), o.ad_id)
    .run();
}

/** Estadísticas de reputación al terminar una orden. */
export async function applyStats(env: P2PEnv, o: Order, outcome: Status, blame?: "buyer" | "seller") {
  const q: D1PreparedStatement[] = [];
  const add = (user: string, done: number) =>
    q.push(env.DB.prepare("UPDATE p2p_users SET orders_done = orders_done + ?, orders_total = orders_total + 1 WHERE id = ?").bind(done, user));
  if (outcome === "released") {
    add(o.buyer, 1);
    add(o.seller, 1);
    if (o.paid_at)
      q.push(env.DB.prepare("UPDATE p2p_users SET release_secs = release_secs + ?, releases = releases + 1 WHERE id = ?").bind(Math.max(0, now() - o.paid_at), o.seller));
  } else if (outcome === "resolved_buyer") {
    add(o.buyer, 1);
    add(o.seller, 0);
  } else if (outcome === "resolved_seller") {
    add(o.seller, 1);
    add(o.buyer, 0);
  } else if (blame) {
    add(blame === "buyer" ? o.buyer : o.seller, 0);
  }
  if (q.length) await env.DB.batch(q);
}

/** Vista de la orden para una de las partes (o el administrador). */
async function view(env: P2PEnv, o: Order, role: Role) {
  const s = await settings(env);
  const other = role === "buyer" ? o.seller : o.buyer;
  const [buyer, seller, counterpart, dispute] = await Promise.all([
    getUser(env, o.buyer),
    getUser(env, o.seller),
    getUser(env, other),
    env.DB.prepare("SELECT opened_by, reason, opened_at, status, winner, note, resolved_at FROM p2p_disputes WHERE order_id = ?").bind(o.id).first(),
  ]);
  return {
    id: o.id,
    ad_id: o.ad_id,
    role,
    status: o.status,
    fiat: o.fiat,
    method: JSON.parse(o.method) as Method,
    price: o.price,
    fiat_amount: o.fiat_amount,
    xmr: fromPico(o.xmr_pico),
    fee_xmr: fromPico(o.fee_pico),
    deposit_required_xmr: fromPico(depositRequired(o)),
    buyer: buyer && publicUser(buyer),
    seller: seller && publicUser(seller),
    counterpart: counterpart && publicUser(counterpart),
    buyer_address: o.buyer_address,
    seller_refund_address: role === "buyer" ? undefined : o.seller_refund_address,
    multisig_address: o.multisig_address,
    deposit_txid: o.deposit_txid,
    payout_txid: o.payout_txid,
    enc_payment: role === "seller" ? undefined : o.enc_payment,
    pay_window_min: o.pay_window_min,
    deadline_at: o.deadline_at,
    dispute_available_at: o.paid_at ? o.paid_at + Number(s.dispute_after_min ?? 15) * 60 : null,
    cancel_reason: o.cancel_reason,
    created_at: o.created_at,
    paid_at: o.paid_at,
    funded_at: o.funded_at,
    closed_at: o.closed_at,
    dispute,
  };
}

/**
 * POST /v1/p2p/orders — abre una orden sobre un anuncio.
 * Cuerpo: {ad_id, fiat_amount, method_index, xmr_address}. Si el anuncio es de venta, quien abre es el
 * comprador y xmr_address es donde recibe; si es de compra, quien abre es el vendedor y es su reembolso.
 */
export async function createOrder(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const taker = await signer(req, env, path, raw);
  const takerUser = await activeUser(env, taker);
  const ad = await getAd(env, String(data.ad_id ?? ""));
  if (ad.status !== "active") throw new HttpError(409, "el anuncio no está activo");
  if (ad.user_id === taker) throw new HttpError(400, "no puedes abrir una orden en tu propio anuncio");
  const maker = await getUser(env, ad.user_id);
  if (!maker || maker.banned) throw new HttpError(409, "el anunciante no está disponible");
  const open = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM p2p_orders WHERE (buyer = ? OR seller = ?) AND status NOT IN (${FINAL.map(() => "?").join(", ")})`,
  )
    .bind(taker, taker, ...FINAL)
    .first<{ n: number }>();
  if ((open?.n ?? 0) >= MAX_OPEN_ORDERS) throw new HttpError(429, `máximo ${MAX_OPEN_ORDERS} órdenes abiertas a la vez`);

  const fiat = fiatAmount(data.fiat_amount, "fiat_amount");
  if (Number(fiat) < Number(ad.min_fiat) || Number(fiat) > Number(ad.max_fiat))
    throw new HttpError(400, `el monto debe estar entre ${ad.min_fiat} y ${ad.max_fiat} ${ad.fiat}`);
  const methods = JSON.parse(ad.methods) as Method[];
  const idx = Number(data.method_index ?? 0);
  const method = methods[idx];
  if (!Number.isInteger(idx) || !method) throw new HttpError(400, "method_index inválido");
  const s = await settings(env);
  if ((JSON.parse(s.blocked_methods ?? "[]") as string[]).some((b) => b.toLowerCase() === method.name.toLowerCase()))
    throw new HttpError(400, `el método «${method.name}» no está permitido`);

  const takerIsBuyer = ad.side === "sell";
  // Métodos reversibles: el anunciante vendedor puede exigir un historial mínimo al comprador.
  if (takerIsBuyer && method.reversible && takerUser.orders_done < ad.min_orders_reversible)
    throw new HttpError(403, `para pagar con ${method.name} este anunciante pide al menos ${ad.min_orders_reversible} órdenes completadas`);

  const mkt = await xmrPrice(ad.fiat);
  const price = adPrice(ad, mkt.price);
  if (!price || price <= 0) throw new HttpError(503, "no hay precio de mercado para este anuncio");
  // XMR = fiat / precio, en piconeros y redondeado hacia abajo (cuentas en centavos para no perder precisión).
  const xmrPico = (BigInt(Math.round(Number(fiat) * 100)) * PICO) / BigInt(Math.round(price * 100));
  if (xmrPico <= 0n) throw new HttpError(400, "monto demasiado pequeño");
  const usdValue = (Number(xmrPico) / 1e12) * mkt.usd;
  const cap = Number(s.cap_usd ?? 1000);
  if (usdValue > cap) throw new HttpError(400, `el tope por orden es el equivalente a ${cap} USD`);
  const feePico = (xmrPico * BigInt(s.fee_bps ?? 50) + 9_999n) / 10_000n;

  const address = requireXmrAddress(env, data.xmr_address, "xmr_address");
  const buyer = takerIsBuyer ? taker : ad.user_id;
  const seller = takerIsBuyer ? ad.user_id : taker;
  const t = now();
  const o: Order = {
    id: randomId(),
    ad_id: ad.id,
    maker: ad.user_id,
    buyer,
    seller,
    fiat: ad.fiat,
    method: JSON.stringify(method),
    price: price.toFixed(2),
    fiat_amount: fiat,
    xmr_pico: xmrPico.toString(),
    fee_pico: feePico.toString(),
    usd_value: Math.round(usdValue * 100) / 100,
    status: "setup",
    pay_window_min: ad.pay_window_min,
    deadline_at: t + Number(s.deposit_window_min ?? 30) * 60,
    buyer_address: takerIsBuyer ? address : ad.xmr_address,
    seller_refund_address: takerIsBuyer ? ad.xmr_address : address,
    multisig_address: null,
    deposit_txid: null,
    payout_txid: null,
    enc_payment: null,
    release_auth: null,
    cancel_reason: null,
    created_at: t,
    updated_at: t,
    paid_at: null,
    funded_at: null,
    closed_at: null,
  };
  // Aparta el XMR del anuncio (solo si alcanza) y crea la orden en la misma transacción.
  const [reserve] = await env.DB.batch([
    env.DB.prepare(
      "UPDATE p2p_ads SET remaining_pico = CAST(CAST(remaining_pico AS INTEGER) - ? AS TEXT), updated_at = ? WHERE id = ? AND status = 'active' AND CAST(remaining_pico AS INTEGER) >= ?",
    ).bind(o.xmr_pico, t, ad.id, o.xmr_pico),
  ]);
  if (!reserve!.meta.changes) throw new HttpError(409, "el anuncio ya no tiene suficiente XMR");
  try {
    await env.DB.prepare(
      "INSERT INTO p2p_orders (id, ad_id, maker, buyer, seller, fiat, method, price, fiat_amount, xmr_pico, fee_pico, usd_value, status, pay_window_min, deadline_at, buyer_address, seller_refund_address, created_at, updated_at)" +
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(o.id, o.ad_id, o.maker, o.buyer, o.seller, o.fiat, o.method, o.price, o.fiat_amount, o.xmr_pico, o.fee_pico, o.usd_value, o.status, o.pay_window_min, o.deadline_at, o.buyer_address, o.seller_refund_address, o.created_at, o.updated_at)
      .run();
  } catch (e) {
    await restoreAd(env, o);
    throw e;
  }
  const room = env.P2P_ORDER_ROOM.get(env.P2P_ORDER_ROOM.idFromName(o.id));
  await room.fetch("https://room/init", { method: "POST", body: JSON.stringify({ order_id: o.id }) });
  await roomEvent(env, o.id, "system", { type: "status", status: "setup" });
  return json(await view(env, o, takerIsBuyer ? "buyer" : "seller"), 201);
}

/** GET /v1/p2p/orders/:id */
export async function getOrderView(req: Request, env: P2PEnv, path: string, id: string): Promise<Response> {
  const user = await signer(req, env, path, "");
  const o = await getOrder(env, id);
  return json(await view(env, o, roleOf(env, o, user)));
}

/** GET /v1/p2p/my/orders[?open=1] */
export async function myOrders(req: Request, env: P2PEnv, path: string, url: URL): Promise<Response> {
  const user = await signer(req, env, path, "");
  const onlyOpen = url.searchParams.get("open") === "1";
  const r = await env.DB.prepare(
    `SELECT * FROM p2p_orders WHERE (buyer = ? OR seller = ?)${onlyOpen ? ` AND status NOT IN (${FINAL.map(() => "?").join(", ")})` : ""} ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(user, user, ...(onlyOpen ? FINAL : []))
    .all<Order>();
  return json({
    orders: r.results.map((o) => ({
      id: o.id,
      role: o.buyer === user ? "buyer" : "seller",
      status: o.status,
      fiat: o.fiat,
      fiat_amount: o.fiat_amount,
      xmr: fromPico(o.xmr_pico),
      price: o.price,
      deadline_at: o.deadline_at,
      created_at: o.created_at,
    })),
  });
}

/** POST /v1/p2p/orders/:id/:action — acciones de las partes. */
export async function orderAction(req: Request, env: P2PEnv, path: string, id: string, action: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = await signer(req, env, path, raw);
  await activeUser(env, user);
  let o = await getOrder(env, id);
  const role = roleOf(env, o, user);
  if (role === "admin") throw new HttpError(403, "el administrador usa las rutas /v1/p2p/admin");
  const s = await settings(env);
  const t = now();

  switch (action) {
    case "cancel": {
      // Comprador: hasta antes de «Ya pagué». Vendedor: solo antes de depositar.
      if (role === "seller" && !NO_DEPOSIT.includes(o.status)) throw new HttpError(409, "el vendedor solo puede cancelar antes de depositar");
      const allowed: Status[] = role === "buyer" ? ["setup", "awaiting_deposit", "confirming", "awaiting_payment"] : NO_DEPOSIT;
      if (!allowed.includes(o.status)) throw new HttpError(409, "esta orden ya no se puede cancelar");
      const reason = `cancelled_by_${role}`;
      if (NO_DEPOSIT.includes(o.status)) o = await transition(env, o, NO_DEPOSIT, "cancelled", { cancel_reason: reason, closed_at: t, deadline_at: null });
      else o = await transition(env, o, ["confirming", "awaiting_payment"], "refunding", { cancel_reason: reason, deadline_at: null });
      await restoreAd(env, o);
      await applyStats(env, o, o.status, role as "buyer" | "seller");
      break;
    }
    case "paid": {
      if (role !== "buyer") throw new HttpError(403, "solo el comprador marca «Ya pagué»");
      if (o.status !== "awaiting_payment") throw new HttpError(409, "todavía no se puede marcar como pagada");
      if (o.deadline_at && t > o.deadline_at) throw new HttpError(409, "se acabó el tiempo para pagar");
      o = await transition(env, o, ["awaiting_payment"], "paid", { paid_at: t, deadline_at: null });
      break;
    }
    case "release": {
      if (role !== "seller") throw new HttpError(403, "solo el vendedor libera");
      if (!["awaiting_payment", "paid", "disputed"].includes(o.status)) throw new HttpError(409, "esta orden no se puede liberar ahora");
      // La firma de esta misma petición es la autorización que el árbitro verifica antes de co-firmar.
      const auth = JSON.stringify({
        method: req.method,
        path,
        address: user,
        ts: req.headers.get("x-timestamp"),
        signature: req.headers.get("x-signature"),
        body: raw,
      });
      const wasDisputed = o.status === "disputed";
      o = await transition(env, o, ["awaiting_payment", "paid", "disputed"], "releasing", { release_auth: auth, deadline_at: null, paid_at: o.paid_at ?? t });
      if (wasDisputed)
        await env.DB.prepare("UPDATE p2p_disputes SET status = 'resolved', winner = 'buyer', note = 'el vendedor liberó', resolved_at = ? WHERE order_id = ?").bind(t, o.id).run();
      break;
    }
    case "dispute": {
      if (o.status !== "paid") throw new HttpError(409, "solo se puede apelar una orden marcada como pagada");
      const at = (o.paid_at ?? t) + Number(s.dispute_after_min ?? 15) * 60;
      if (t < at) throw new HttpError(409, `podrás apelar en ${Math.ceil((at - t) / 60)} min`);
      const reason = text(data.reason, "reason", 1000, 5);
      o = await transition(env, o, ["paid"], "disputed");
      await env.DB.prepare("INSERT INTO p2p_disputes (order_id, opened_by, reason, opened_at, status) VALUES (?, ?, ?, ?, 'open')").bind(o.id, role, reason, t).run();
      break;
    }
    case "payment-details": {
      // Datos de pago del vendedor, cifrados en su navegador para el comprador y el administrador.
      if (role !== "seller") throw new HttpError(403, "solo el vendedor envía sus datos de pago");
      if (FINAL.includes(o.status)) throw new HttpError(409, "la orden ya terminó");
      const enc = text(data.enc_payment, "enc_payment", 8000, 10);
      await env.DB.prepare("UPDATE p2p_orders SET enc_payment = ?, updated_at = ? WHERE id = ?").bind(enc, t, o.id).run();
      await roomEvent(env, o.id, "system", { type: "payment_details" });
      o = await getOrder(env, o.id);
      break;
    }
    case "feedback": {
      if (!["released", "resolved_buyer", "resolved_seller"].includes(o.status)) throw new HttpError(409, "solo se califica una orden terminada");
      const positive = data.positive === true ? 1 : data.positive === false ? 0 : null;
      if (positive === null) throw new HttpError(400, "positive debe ser true o false");
      const comment = text(data.comment, "comment", 300);
      const to = role === "buyer" ? o.seller : o.buyer;
      const r = await env.DB.prepare("INSERT OR IGNORE INTO p2p_feedback (order_id, from_user, to_user, positive, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(o.id, user, to, positive, comment, t)
        .run();
      if (!r.meta.changes) throw new HttpError(409, "ya calificaste esta orden");
      await env.DB.prepare(`UPDATE p2p_users SET ${positive ? "positive = positive + 1" : "negative = negative + 1"} WHERE id = ?`).bind(to).run();
      break;
    }
    default:
      throw new HttpError(404, "acción desconocida");
  }
  return json(await view(env, o, role));
}

/** Tiempos agotados (tarea programada cada 5 minutos). */
export async function sweepOrders(env: P2PEnv): Promise<number> {
  const t = now();
  const due = await env.DB.prepare(
    "SELECT * FROM p2p_orders WHERE deadline_at IS NOT NULL AND deadline_at < ? AND status IN ('setup', 'awaiting_deposit', 'awaiting_payment') LIMIT 100",
  )
    .bind(t)
    .all<Order>();
  let n = 0;
  for (const o of due.results) {
    try {
      if (NO_DEPOSIT.includes(o.status)) {
        // Nadie depositó a tiempo: se cancela; cuenta en contra del vendedor.
        const c = await transition(env, o, NO_DEPOSIT, "cancelled", { cancel_reason: "timeout_deposit", closed_at: t, deadline_at: null });
        await restoreAd(env, c);
        await applyStats(env, c, "cancelled", "seller");
      } else {
        // El comprador no marcó «Ya pagué» a tiempo: el XMR regresa al vendedor.
        const c = await transition(env, o, ["awaiting_payment"], "refunding", { cancel_reason: "timeout_payment", deadline_at: null });
        await restoreAd(env, c);
        await applyStats(env, c, "refunding", "buyer");
      }
      n++;
    } catch (e) {
      if (!(e instanceof HttpError)) throw e; // otra petición ya la movió
    }
  }
  await env.DB.prepare("DELETE FROM p2p_nonces WHERE at < ?").bind(t - 600).run();
  return n;
}
