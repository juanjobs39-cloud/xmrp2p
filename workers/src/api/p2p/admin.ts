import { HttpError, json, readJson } from "../env";
import { fromPico, getUser, now, publicUser, settings, signer, text, toPico, type P2PEnv } from "./common";
import { applyStats, depositRequired, FINAL, getOrder, roomEvent, transition, type Order, type Status } from "./orders";

// ---------- Administrador (tú): cada petición va firmada con la llave de P2P_ADMIN_ADDRESS ----------

async function requireAdmin(req: Request, env: P2PEnv, path: string, body: string): Promise<string> {
  if (!env.P2P_ADMIN_ADDRESS) throw new HttpError(404, "panel de administrador desactivado");
  const user = await signer(req, env, path, body);
  if (user !== env.P2P_ADMIN_ADDRESS.toLowerCase()) throw new HttpError(403, "no eres el administrador");
  return user;
}

async function roomMessages(env: P2PEnv, orderId: string) {
  const room = env.P2P_ORDER_ROOM.get(env.P2P_ORDER_ROOM.idFromName(orderId));
  return ((await (await room.fetch("https://room/messages?after=0")).json()) as { messages: unknown[] }).messages;
}

export async function handleAdmin(req: Request, env: P2PEnv, url: URL): Promise<Response> {
  const p = url.pathname;
  const isGet = req.method === "GET";
  const { raw, data } = isGet ? { raw: "", data: {} as Record<string, unknown> } : await readJson<Record<string, unknown>>(req);
  await requireAdmin(req, env, p, raw);
  const t = now();

  if (p === "/v1/p2p/admin/disputes" && isGet) {
    const status = url.searchParams.get("status") === "resolved" ? "resolved" : "open";
    const r = await env.DB.prepare(
      "SELECT d.*, o.fiat, o.fiat_amount, o.xmr_pico, o.usd_value, o.method, o.buyer, o.seller, o.status AS order_status, o.paid_at" +
        " FROM p2p_disputes d JOIN p2p_orders o ON o.id = d.order_id WHERE d.status = ? ORDER BY d.opened_at ASC LIMIT 200",
    )
      .bind(status)
      .all<Record<string, unknown> & { xmr_pico: string }>();
    return json({ disputes: r.results.map((d) => ({ ...d, xmr: fromPico(d.xmr_pico), waiting_min: Math.round((t - Number(d.opened_at)) / 60) })) });
  }

  if (p === "/v1/p2p/admin/stats" && isGet) {
    const day = t - 86400;
    const [orders, volume, open, s] = await Promise.all([
      env.DB.prepare("SELECT status, COUNT(*) AS n FROM p2p_orders WHERE created_at > ? GROUP BY status").bind(day).all(),
      env.DB.prepare(
        "SELECT COUNT(*) AS n, COALESCE(SUM(usd_value), 0) AS usd, COALESCE(SUM(CASE WHEN status IN ('released', 'resolved_buyer') THEN CAST(fee_pico AS INTEGER) ELSE 0 END), 0) AS fees" +
          " FROM p2p_orders WHERE status IN ('released', 'resolved_buyer', 'resolved_seller')",
      ).first<{ n: number; usd: number; fees: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM p2p_disputes WHERE status = 'open'").first<{ n: number }>(),
      settings(env),
    ]);
    const users = await env.DB.prepare("SELECT COUNT(*) AS n FROM p2p_users").first<{ n: number }>();
    return json({
      last_24h: orders.results,
      completed: { orders: volume?.n ?? 0, usd: volume?.usd ?? 0, fees_xmr: fromPico(BigInt(volume?.fees ?? 0)) },
      open_disputes: open?.n ?? 0,
      users: users?.n ?? 0,
      arbiter_seen: s.arbiter_seen ? Number(s.arbiter_seen) : null,
    });
  }

  if (p === "/v1/p2p/admin/settings") {
    if (isGet) return json(await settings(env));
    if (req.method !== "PUT") throw new HttpError(405, "usa GET o PUT");
    const allowed: Record<string, (v: unknown) => string> = {
      fee_bps: (v) => intIn(v, 0, 300, "fee_bps"),
      cap_usd: (v) => intIn(v, 10, 100000, "cap_usd"),
      deposit_window_min: (v) => intIn(v, 10, 240, "deposit_window_min"),
      dispute_after_min: (v) => intIn(v, 0, 240, "dispute_after_min"),
      blocked_methods: (v) => {
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x.length > 40)) throw new HttpError(400, "blocked_methods inválido");
        return JSON.stringify(v);
      },
    };
    const q = Object.entries(data).filter(([k]) => k !== "nonce").map(([k, v]) => {
      const f = allowed[k];
      if (!f) throw new HttpError(400, `ajuste desconocido: ${k}`);
      return env.DB.prepare("INSERT INTO p2p_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, f(v));
    });
    if (q.length) await env.DB.batch(q);
    return json(await settings(env));
  }

  // Lista de órdenes: ?status=… (o "open" para las que siguen en curso) y ?q= (id de orden o de usuario).
  if (p === "/v1/p2p/admin/orders" && isGet) {
    const st = url.searchParams.get("status") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const where: string[] = [];
    const args: unknown[] = [];
    if (st === "open") where.push(`status NOT IN (${FINAL.map(() => "?").join(", ")})`), args.push(...FINAL);
    else if (st) where.push("status = ?"), args.push(st);
    if (q) where.push("(id = ? OR buyer = ? OR seller = ?)"), args.push(q, q, q);
    const r = await env.DB.prepare(
      `SELECT id, status, fiat, fiat_amount, xmr_pico, usd_value, buyer, seller, created_at, updated_at FROM p2p_orders${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(...args)
      .all<Record<string, unknown> & { xmr_pico: string }>();
    return json({ orders: r.results.map(({ xmr_pico, ...o }) => ({ ...o, xmr: fromPico(xmr_pico) })) });
  }

  const ord = /^\/v1\/p2p\/admin\/orders\/([0-9a-f]{32})(?:\/(resolve|message))?$/.exec(p);
  if (ord) {
    const o = await getOrder(env, ord[1]!);
    if (!ord[2] && isGet) {
      const [buyer, seller, dispute, messages] = await Promise.all([
        getUser(env, o.buyer),
        getUser(env, o.seller),
        env.DB.prepare("SELECT * FROM p2p_disputes WHERE order_id = ?").bind(o.id).first(),
        roomMessages(env, o.id),
      ]);
      return json({
        order: { ...o, xmr: fromPico(o.xmr_pico), fee_xmr: fromPico(o.fee_pico), deposit_required_xmr: fromPico(depositRequired(o)), release_auth: undefined },
        buyer: buyer && publicUser(buyer),
        seller: seller && publicUser(seller),
        dispute,
        messages,
      });
    }
    if (ord[2] === "resolve" && req.method === "POST") {
      const winner = data.winner;
      if (winner !== "buyer" && winner !== "seller") throw new HttpError(400, "winner debe ser buyer o seller");
      const note = text(data.note, "note", 1000);
      // La firma de esta petición es la autorización que el árbitro verifica antes de co-firmar con el ganador.
      const auth = JSON.stringify({ method: req.method, path: p, address: env.P2P_ADMIN_ADDRESS!.toLowerCase(), ts: req.headers.get("x-timestamp"), signature: req.headers.get("x-signature"), body: raw });
      const r = await env.DB.prepare("UPDATE p2p_disputes SET status = 'resolved', winner = ?, note = ?, decision_auth = ?, resolved_at = ? WHERE order_id = ? AND status = 'open'")
        .bind(winner, note, auth, t, o.id)
        .run();
      if (!r.meta.changes) throw new HttpError(409, "la queja ya está resuelta o no existe");
      const updated = await transition(env, o, ["disputed"], "resolving");
      await roomEvent(env, o.id, "admin", { type: "decision", winner, note });
      return json({ order_id: updated.id, status: updated.status, winner });
    }
    if (ord[2] === "message" && req.method === "POST") {
      const ciphertext = text(data.ciphertext, "ciphertext", 8000, 1);
      await roomEvent(env, o.id, "admin", { type: "message", ciphertext });
      return json({ ok: true });
    }
  }

  const usr = /^\/v1\/p2p\/admin\/users\/(0x[0-9a-f]{40})\/ban$/.exec(p);
  if (usr && req.method === "POST") {
    const banned = data.banned !== false;
    await env.DB.batch([
      env.DB.prepare("UPDATE p2p_users SET banned = ? WHERE id = ?").bind(banned ? 1 : 0, usr[1]),
      ...(banned ? [env.DB.prepare("UPDATE p2p_ads SET status = 'paused', updated_at = ? WHERE user_id = ? AND status = 'active'").bind(t, usr[1])] : []),
    ]);
    return json({ id: usr[1], banned });
  }

  const ad = /^\/v1\/p2p\/admin\/ads\/([0-9a-f]{32})\/hide$/.exec(p);
  if (ad && req.method === "POST") {
    const hidden = data.hidden !== false;
    const r = await env.DB.prepare("UPDATE p2p_ads SET status = ?, updated_at = ? WHERE id = ? AND status != 'closed'").bind(hidden ? "hidden" : "paused", t, ad[1]).run();
    if (!r.meta.changes) throw new HttpError(404, "anuncio no encontrado o cerrado");
    return json({ id: ad[1], hidden });
  }

  throw new HttpError(404, "ruta de administrador no encontrada");
}

function intIn(v: unknown, min: number, max: number, field: string): string {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${field} debe estar entre ${min} y ${max}`);
  return String(n);
}

// ---------- Árbitro (Cloudflare Container): se autentica con el token secreto P2P_ARBITER_TOKEN ----------

async function requireArbiter(req: Request, env: P2PEnv): Promise<void> {
  const token = env.P2P_ARBITER_TOKEN;
  if (!token) throw new HttpError(404, "árbitro desactivado");
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = new TextEncoder().encode(got);
  const b = new TextEncoder().encode(token);
  if (a.length !== b.length || !crypto.subtle.timingSafeEqual(a, b)) throw new HttpError(401, "token del árbitro inválido");
  await env.DB.prepare("INSERT INTO p2p_settings (key, value) VALUES ('arbiter_seen', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(now())).run();
}

/** Lo que el árbitro tiene que hacer: armar escrows, vigilar depósitos y firmar salidas. */
async function tasks(env: P2PEnv) {
  const r = await env.DB.prepare(
    "SELECT o.*, d.winner, d.decision_auth FROM p2p_orders o LEFT JOIN p2p_disputes d ON d.order_id = o.id" +
      " WHERE o.status IN ('setup', 'awaiting_deposit', 'confirming', 'releasing', 'refunding', 'resolving') ORDER BY o.updated_at ASC LIMIT 200",
  ).all<Order & { winner: string | null; decision_auth: string | null }>();
  return r.results.map((o) => {
    const base = { order_id: o.id, status: o.status, buyer: o.buyer, seller: o.seller, multisig_address: o.multisig_address };
    const amounts = { xmr_pico: o.xmr_pico, fee_pico: o.fee_pico, deposit_required_pico: depositRequired(o).toString() };
    switch (o.status) {
      case "setup":
        return { ...base, task: "setup_escrow" };
      case "awaiting_deposit":
      case "confirming":
        return { ...base, task: "watch_deposit", deposit_txid: o.deposit_txid, ...amounts };
      case "releasing":
        // Pagar al comprador (más la comisión), autorizado por la firma del vendedor.
        return { ...base, task: "release", to: o.buyer_address, refund_to: o.seller_refund_address, ...amounts, authorization: JSON.parse(o.release_auth ?? "null") };
      case "refunding":
        // Devolver al vendedor (sin comisión): el comprador canceló, se agotó el tiempo o el depósito llegó tarde.
        return { ...base, task: "refund", to: o.seller_refund_address, reason: o.cancel_reason, ...amounts };
      case "resolving":
        return {
          ...base,
          task: "resolve",
          winner: o.winner,
          to: o.winner === "buyer" ? o.buyer_address : o.seller_refund_address,
          refund_to: o.seller_refund_address,
          ...amounts,
          authorization: JSON.parse(o.decision_auth ?? "null"),
        };
      default:
        return { ...base, task: "none" };
    }
  });
}

export async function handleArbiter(req: Request, env: P2PEnv, url: URL): Promise<Response> {
  await requireArbiter(req, env);
  const p = url.pathname;
  if (p === "/v1/p2p/arbiter/tasks" && req.method === "GET")
    return json({ tasks: await tasks(env), at: now(), admin_address: env.P2P_ADMIN_ADDRESS?.toLowerCase() || null, fee_address: env.P2P_FEE_ADDRESS || null });

  // Mensajes de la orden (protocolo multisig) y estado cifrado del árbitro (el contenedor no tiene disco).
  const room = /^\/v1\/p2p\/arbiter\/orders\/([0-9a-f]{32})\/(messages|state)$/.exec(p);
  if (room) {
    await getOrder(env, room[1]!);
    const stub = env.P2P_ORDER_ROOM.get(env.P2P_ORDER_ROOM.idFromName(room[1]!));
    if (room[2] === "messages" && req.method === "GET") {
      const after = Number(url.searchParams.get("after") ?? "0");
      return stub.fetch(`https://room/messages?after=${Number.isFinite(after) ? after : 0}`);
    }
    if (room[2] === "state" && req.method === "GET") return stub.fetch("https://room/state");
    if (room[2] === "state" && req.method === "PUT") {
      const raw = await req.text();
      if (raw.length > 1_900_000) throw new HttpError(413, "estado demasiado grande");
      return stub.fetch("https://room/state", { method: "PUT", body: raw });
    }
  }

  const m = /^\/v1\/p2p\/arbiter\/orders\/([0-9a-f]{32})\/(escrow|deposit|confirmed|payout|message)$/.exec(p);
  if (!m || req.method !== "POST") throw new HttpError(404, "ruta del árbitro no encontrada");
  const { data } = await readJson<Record<string, unknown>>(req);
  let o = await getOrder(env, m[1]!);
  const t = now();
  const txid = (v: unknown) => {
    if (typeof v !== "string" || !/^[0-9a-f]{64}$/.test(v)) throw new HttpError(400, "txid inválido");
    return v;
  };

  switch (m[2]) {
    case "escrow": {
      // Escrow 2 de 3 listo: ya se puede depositar.
      const addr = typeof data.multisig_address === "string" ? data.multisig_address : "";
      if (!/^[1-9A-HJ-NP-Za-km-z]{95}$/.test(addr)) throw new HttpError(400, "multisig_address inválida");
      o = await transition(env, o, ["setup"], "awaiting_deposit", { multisig_address: addr });
      break;
    }
    case "deposit": {
      const id = txid(data.txid);
      if (o.status === "cancelled") {
        // Depósito que llegó después de cancelar: se devuelve al vendedor.
        o = await transition(env, o, ["cancelled"], "refunding", { deposit_txid: id, cancel_reason: "late_deposit", closed_at: null });
      } else {
        o = await transition(env, o, ["awaiting_deposit"], "confirming", { deposit_txid: id, deadline_at: null });
      }
      break;
    }
    case "confirmed": {
      // 10 confirmaciones: el comprador ya puede pagar. Si el depósito no alcanza, se devuelve.
      const amount = typeof data.amount_xmr === "string" && /^\d{1,6}(\.\d{1,12})?$/.test(data.amount_xmr) ? toPico(data.amount_xmr) : null;
      if (amount === null) throw new HttpError(400, "amount_xmr inválido");
      if (amount < depositRequired(o)) {
        o = await transition(env, o, ["confirming"], "refunding", { cancel_reason: "underfunded" });
        await env.DB.prepare("UPDATE p2p_ads SET remaining_pico = CAST(CAST(remaining_pico AS INTEGER) + ? AS TEXT), updated_at = ? WHERE id = ?").bind(o.xmr_pico, t, o.ad_id).run();
        await applyStats(env, o, "refunding", "seller");
      } else {
        o = await transition(env, o, ["confirming"], "awaiting_payment", { funded_at: t, deadline_at: t + o.pay_window_min * 60 });
      }
      break;
    }
    case "payout": {
      const id = txid(data.txid);
      const next = o.status === "releasing" ? "released" : o.status === "refunding" ? "refunded" : o.status === "resolving" ? null : undefined;
      if (next === undefined) throw new HttpError(409, "la orden no espera un pago de salida");
      let to: Status | null = next;
      if (to === null) {
        const d = await env.DB.prepare("SELECT winner FROM p2p_disputes WHERE order_id = ?").bind(o.id).first<{ winner: string }>();
        to = d?.winner === "buyer" ? "resolved_buyer" : "resolved_seller";
      }
      o = await transition(env, o, [o.status], to, { payout_txid: id, closed_at: t });
      if (to !== "refunded") await applyStats(env, o, to);
      break;
    }
    case "message": {
      // Mensajes del protocolo multisig entre el árbitro y los navegadores (fase 2).
      if (FINAL.includes(o.status)) throw new HttpError(409, "la orden ya terminó");
      await roomEvent(env, o.id, "arbiter", { type: "protocol", data: data.data ?? null });
      break;
    }
  }
  return json({ order_id: o.id, status: o.status });
}
