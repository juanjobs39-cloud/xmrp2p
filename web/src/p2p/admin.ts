import { get, type Method, type P2PConfig, type PublicUser, type RoomMessage } from "./api";
import { encPublic, open, seal } from "./identity";
import type { P2PApp } from "./p2p-app";
import { fmtXmr, h, nowS, statusTone, type Child } from "./ui";

export async function adminView(app: P2PApp, arg?: string) {
  if (!app.isAdmin) {
    app.show(h("p", { class: "notice danger" }, app.t("Esta cuenta no es la de administrador.", "This account is not the administrator.")));
    return;
  }
  if (arg) return adminOrder(app, arg);
  const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const tab = sp.get("ver") ?? "quejas";
  const tabs = h(
    "div",
    { class: "p2p-tabs" },
    [["quejas", app.t("Apelaciones", "Appeals")], ["ordenes", app.t("Órdenes", "Orders")], ["ajustes", app.t("Ajustes", "Settings")]].map(([k, l]) =>
      h("a", { class: "p2p-tab" + (k === tab ? " on admin" : ""), href: `#/admin?ver=${k}` }, l),
    ),
  );
  const stats = await app.req<{
    last_24h: { status: string; n: number }[];
    completed: { orders: number; usd: number; fees_xmr: string };
    open_disputes: number;
    users: number;
    arbiter_seen: number | null;
  }>("GET", "/v1/p2p/admin/stats");
  const arbOk = stats.arbiter_seen !== null && nowS() - stats.arbiter_seen < 180;
  const tile = (label: string, value: string | number, warn = false) => h("div", { class: "card p2p-tile" + (warn ? " warn" : "") }, h("small", {}, label), h("strong", {}, String(value)));
  const head = h(
    "div",
    { class: "p2p-tiles" },
    tile(app.t("Apelaciones abiertas", "Open appeals"), stats.open_disputes, stats.open_disputes > 0),
    tile(app.t("Órdenes 24 h", "Orders 24 h"), stats.last_24h.reduce((a, x) => a + x.n, 0)),
    tile(app.t("Completadas", "Completed"), `${stats.completed.orders} · ${Math.round(stats.completed.usd).toLocaleString(app.lang)} USD`),
    tile(app.t("Comisiones cobradas", "Fees earned"), `${fmtXmr(stats.completed.fees_xmr)} XMR`),
    tile(app.t("Usuarios", "Users"), stats.users),
    tile(app.t("Árbitro", "Arbiter"), arbOk ? `✔ ${app.ago(stats.arbiter_seen)}` : `✖ ${app.ago(stats.arbiter_seen)}`, !arbOk),
  );
  const body = h("div");
  app.show(h("h2", {}, app.t("Panel de administrador", "Admin panel")), head, tabs, body);
  if (tab === "ajustes") return adminSettings(app, body);
  if (tab === "ordenes") return adminOrders(app, body);

  const resolved = sp.get("estado") === "resueltas";
  const r = await app.req<{ disputes: { order_id: string; opened_by: string; reason: string; fiat: string; fiat_amount: string; xmr: string; waiting_min: number; winner: string | null; method: string }[] }>(
    "GET",
    `/v1/p2p/admin/disputes${resolved ? "?status=resolved" : ""}`,
  );
  body.replaceChildren(
    h("p", {}, h("a", { href: resolved ? "#/admin?ver=quejas" : "#/admin?ver=quejas&estado=resueltas" }, resolved ? app.t("Ver abiertas", "Show open") : app.t("Ver resueltas", "Show resolved"))),
    r.disputes.length
      ? h(
          "div",
          { class: "p2p-list" },
          r.disputes.map((d) =>
            h(
              "a",
              { class: "card p2p-orow", href: `#/admin/${d.order_id}` },
              h("strong", {}, `${d.fiat_amount} ${d.fiat}`),
              h("span", {}, `${fmtXmr(d.xmr)} XMR · ${(JSON.parse(d.method) as Method).name} · ${app.t("abrió", "opened by")} ${d.opened_by === "buyer" ? app.t("comprador", "buyer") : app.t("vendedor", "seller")}: «${d.reason.slice(0, 80)}»`),
              h("span", { class: "badge" }, resolved ? (d.winner === "buyer" ? app.t("Comprador", "Buyer") : app.t("Vendedor", "Seller")) : `${d.waiting_min} min`),
              h("small", {}, d.order_id.slice(0, 8)),
            ),
          ),
        )
      : h("p", { class: "notice ok" }, resolved ? app.t("Aún no hay apelaciones resueltas.", "No resolved appeals yet.") : app.t("No hay apelaciones abiertas. 🎉", "No open appeals. 🎉")),
  );
}

export async function adminOrders(app: P2PApp, body: HTMLElement) {
  const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const states = ["", "open", "setup", "awaiting_deposit", "confirming", "awaiting_payment", "paid", "disputed", "releasing", "refunding", "resolving", "released", "cancelled", "refunded", "resolved_buyer", "resolved_seller"];
  const cur = sp.get("estado") ?? "open";
  const status = h(
    "select",
    { id: "adm-status" },
    states.map((s) => h("option", { value: s, selected: s === cur }, s === "" ? app.t("Todas", "All") : s === "open" ? app.t("En curso", "In progress") : app.statusName(s))),
  );
  const q = h("input", { id: "adm-q", type: "text", placeholder: app.t("ID de orden o de usuario (0x…)", "Order or user ID (0x…)"), value: sp.get("q") ?? "" });
  const go = () => (location.hash = `#/admin?${new URLSearchParams({ ver: "ordenes", estado: status.value, q: q.value.trim() })}`);
  status.onchange = go;
  q.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && go());
  const qs = new URLSearchParams();
  if (cur) qs.set("status", cur);
  if (q.value.trim()) qs.set("q", q.value.trim().toLowerCase());
  const r = await app.req<{ orders: { id: string; status: string; fiat: string; fiat_amount: string; xmr: string; created_at: number }[] }>("GET", `/v1/p2p/admin/orders?${qs}`);
  body.replaceChildren(
    h(
      "div",
      { class: "p2p-filters" },
      app.field(app.t("Estado", "Status"), status),
      app.field(app.t("Buscar", "Search"), q),
      h("div", { class: "field app" }, h("label", {}, " "), h("button", { class: "btn", type: "button", onclick: go }, app.t("Buscar", "Search"))),
    ),
    r.orders.length
      ? h(
          "div",
          { class: "p2p-list" },
          r.orders.map((o) =>
            h(
              "a",
              { class: "card p2p-orow", href: `#/admin/${o.id}` },
              h("strong", {}, `${o.fiat_amount} ${o.fiat}`),
              h("span", {}, `${fmtXmr(o.xmr)} XMR · ${o.id.slice(0, 8)}`),
              h("span", { class: "badge " + statusTone(o.status) }, app.statusName(o.status)),
              h("small", {}, app.ago(o.created_at)),
            ),
          ),
        )
      : h("p", {}, app.t("Sin órdenes con estos filtros.", "No orders match these filters.")),
  );
}

export async function adminSettings(app: P2PApp, body: HTMLElement) {
  const s = await app.req<Record<string, string>>("GET", "/v1/p2p/admin/settings");
  const out = h("div");
  const num = (id: string, v: string) => h("input", { id, type: "text", inputMode: "decimal", value: v });
  const fee = num("adm-fee", String(Number(s.fee_bps ?? 50) / 100));
  const cap = num("adm-cap", s.cap_usd ?? "1000");
  const dep = num("adm-dep", s.deposit_window_min ?? "30");
  const dis = num("adm-dis", s.dispute_after_min ?? "15");
  const blocked = h("input", { id: "adm-blocked", type: "text", value: (JSON.parse(s.blocked_methods ?? "[]") as string[]).join(", "), placeholder: "Western Union, …" });
  const save = h("button", { class: "btn", type: "button" }, app.t("Guardar ajustes", "Save settings"));
  save.onclick = () =>
    void app.busy(
      save,
      async () => {
        await app.req("PUT", "/v1/p2p/admin/settings", {
          fee_bps: Math.round(Number(fee.value) * 100),
          cap_usd: Number(cap.value),
          deposit_window_min: Number(dep.value),
          dispute_after_min: Number(dis.value),
          blocked_methods: blocked.value.split(",").map((x) => x.trim()).filter(Boolean),
        });
        app.cfg = await get<P2PConfig>("/v1/p2p/config");
        out.replaceChildren(h("p", { class: "notice ok" }, app.t("Ajustes guardados.", "Settings saved.")));
      },
      out,
    );

  const uid = h("input", { id: "adm-uid", type: "text", placeholder: "0x…" });
  const ban = (banned: boolean) => {
    const b = h("button", { class: "btn secondary small", type: "button" }, banned ? app.t("Suspender", "Ban") : app.t("Quitar suspensión", "Unban"));
    b.onclick = () =>
      void app.busy(
        b,
        async () => {
          await app.req("POST", `/v1/p2p/admin/users/${uid.value.trim().toLowerCase()}/ban`, { banned });
          out.replaceChildren(h("p", { class: "notice ok" }, banned ? app.t("Usuario suspendido y sus anuncios en pausa.", "User banned and their ads paused.") : app.t("Suspensión retirada.", "Ban lifted.")));
        },
        out,
      );
    return b;
  };
  const adid = h("input", { id: "adm-adid", type: "text", placeholder: app.t("ID del anuncio", "Ad ID") });
  const hide = (hidden: boolean) => {
    const b = h("button", { class: "btn secondary small", type: "button" }, hidden ? app.t("Ocultar", "Hide") : app.t("Mostrar (queda en pausa)", "Unhide (stays paused)"));
    b.onclick = () =>
      void app.busy(
        b,
        async () => {
          await app.req("POST", `/v1/p2p/admin/ads/${adid.value.trim()}/hide`, { hidden });
          out.replaceChildren(h("p", { class: "notice ok" }, app.t("Listo.", "Done.")));
        },
        out,
      );
    return b;
  };
  body.replaceChildren(
    out,
    h(
      "section",
      { class: "card p2p-form" },
      h("h3", {}, app.t("Reglas del mercado", "Market rules")),
      h("div", { class: "p2p-grid" }, app.field(app.t("Comisión del vendedor (%)", "Seller fee (%)"), fee, "0 – 3"), app.field(app.t("Tope por orden (USD)", "Cap per order (USD)"), cap)),
      h("div", { class: "p2p-grid" }, app.field(app.t("Tiempo para depositar (min)", "Time to deposit (min)"), dep), app.field(app.t("Minutos antes de poder apelar", "Minutes before an appeal"), dis)),
      app.field(app.t("Métodos de pago bloqueados (separados por coma)", "Blocked payment methods (comma separated)"), blocked),
      h("p", {}, save),
    ),
    h(
      "section",
      { class: "card p2p-form" },
      h("h3", {}, app.t("Usuarios y anuncios", "Users and ads")),
      app.field(app.t("ID de usuario", "User ID"), uid),
      h("p", { class: "row wrap" }, ban(true), ban(false)),
      app.field(app.t("ID de anuncio", "Ad ID"), adid),
      h("p", { class: "row wrap" }, hide(true), hide(false)),
    ),
  );
}

export async function adminOrder(app: P2PApp, id: string) {
  type AdminOrder = {
    id: string; status: string; fiat: string; fiat_amount: string; price: string; xmr: string; fee_xmr: string; method: string;
    buyer: string; seller: string; multisig_address: string | null; deposit_txid: string | null; payout_txid: string | null;
    enc_payment: string | null; created_at: number; paid_at: number | null; ad_id: string;
  };
  const r = await app.req<{
    order: AdminOrder;
    buyer: (PublicUser & { since?: number }) | null;
    seller: (PublicUser & { since?: number }) | null;
    dispute: { opened_by: string; reason: string; opened_at: number; status: string; winner: string | null; note: string | null } | null;
    messages: RoomMessage[];
  }>("GET", `/v1/p2p/admin/orders/${id}`);
  const o = r.order;
  const out = h("div");
  const method = JSON.parse(o.method) as Method;
  const pay = o.enc_payment ? await open(o.enc_payment, app.vault!).catch(() => null) : null;
  const lines = await Promise.all(
    r.messages
      .filter((m) => m.body.type !== "protocol")
      .map(async (m) => {
        const when = new Date(m.at).toLocaleString(app.lang);
        if (m.body.type === "message") {
          const who = m.from === "buyer" ? `${app.t("Comprador", "Buyer")} (${r.buyer?.nickname})` : m.from === "seller" ? `${app.t("Vendedor", "Seller")} (${r.seller?.nickname})` : app.t("Soporte", "Support");
          const txt = await open(m.body.ciphertext!, app.vault!).catch(() => app.t("[no cifrado para ti: el admin no tenía perfil cuando se escribió]", "[not encrypted for you: the admin had no profile when it was written]"));
          return h("div", { class: "p2p-msg " + (m.from === "admin" ? "mine" : "") }, h("small", {}, `${who} · ${when}`), h("div", {}, txt));
        }
        if (m.body.type === "status") return h("p", { class: "p2p-sys" }, `• ${app.statusName(m.body.status ?? "")} · ${when}`);
        if (m.body.type === "decision") return h("p", { class: "p2p-sys" }, `• ${app.t("Decisión", "Decision")}: ${m.body.winner} — ${m.body.note ?? ""}`);
        return h("p", { class: "p2p-sys" }, `• ${m.body.type} · ${when}`);
      }),
  );
  const rejected = r.messages.filter((m) => m.from === "arbiter" && m.body.type === "protocol" && (m.body.data as { step?: string } | undefined)?.step === "rejected");

  const input = h("textarea", { id: "adm-msg", rows: 2, maxLength: 2000, placeholder: app.t("Mensaje para las dos partes (cifrado)…", "Message to both parties (encrypted)…") });
  const send = h("button", { class: "btn small", type: "button" }, app.t("Enviar como soporte", "Send as support"));
  send.onclick = () =>
    void app.busy(
      send,
      async () => {
        if (!input.value.trim()) return;
        const to = [r.buyer?.enc_pubkey ?? "", r.seller?.enc_pubkey ?? "", await encPublic(app.vault!)];
        await app.req("POST", `/v1/p2p/admin/orders/${id}/message`, { ciphertext: await seal(input.value.trim(), to) });
        await app.route();
      },
      out,
    );

  const note = h("textarea", { id: "adm-note", rows: 2, maxLength: 1000, placeholder: app.t("Motivo de la decisión (lo ven las dos partes)", "Reason for the decision (both parties see it)") });
  const resolve = (winner: "buyer" | "seller", label: string, warn: string) => {
    const b = h("button", { class: `btn ${winner === "buyer" ? "buy" : "sell"}`, type: "button" }, label);
    b.onclick = () => {
      if (!confirm(warn)) return;
      void app.busy(b, async () => (await app.req("POST", `/v1/p2p/admin/orders/${id}/resolve`, { winner, note: note.value.trim() }), await app.route()), out);
    };
    return b;
  };
  const userBox = (role: string, u: (PublicUser & { since?: number }) | null, uid: string) =>
    h(
      "div",
      { class: "card" },
      h("h3", {}, role),
      app.userLine(u),
      h("p", {}, h("small", {}, `${app.t("Cuenta de hace", "Account age")} ${app.ago(u?.since)} · ${app.t("visto hace", "seen")} ${app.ago(u?.last_seen)}`)),
      h("p", {}, h("code", { class: "p2p-addr" }, uid)),
      u?.banned ? h("span", { class: "badge real" }, app.t("Suspendido", "Banned")) : null,
      h("p", {}, h("a", { href: `#/admin?${new URLSearchParams({ ver: "ordenes", estado: "", q: uid })}` }, app.t("Ver sus órdenes", "See their orders"))),
    );
  const dt = (label: string, value: Child) => [h("dt", {}, label), h("dd", {}, value ?? "—")];
  const code = (v: string | null) => (v ? h("code", { class: "p2p-addr" }, v) : "—");

  let decision: HTMLElement | null = null;
  if (r.dispute) {
    const d = r.dispute;
    decision = h(
      "section",
      { class: "card p2p-dispute" },
      h("h3", {}, `${app.t("Apelación de", "Appeal by")} ${d.opened_by === "buyer" ? app.t("el comprador", "the buyer") : app.t("el vendedor", "the seller")} · ${app.t("hace", "")} ${app.ago(d.opened_at)}`),
      h("p", {}, d.reason),
      d.status === "resolved"
        ? h("p", { class: "notice ok" }, `${app.t("Resuelta a favor de", "Resolved for")} ${d.winner === "buyer" ? app.t("el comprador", "the buyer") : app.t("el vendedor", "the seller")}: ${d.note ?? ""}`)
        : o.status === "disputed"
          ? h(
              "div",
              {},
              h("p", {}, h("small", {}, app.t("Revisa el chat y los comprobantes. Tu firma autoriza al árbitro a co-firmar el pago con quien gana; esa persona debe abrir su orden para cobrar.", "Check the chat and the proofs. Your signature lets the arbiter co-sign the payout with the winner; that person must open their order to collect."))),
              note,
              h(
                "p",
                { class: "row wrap" },
                resolve("buyer", app.t("Dar el XMR al comprador", "Give the XMR to the buyer"), app.t("¿Confirmas que el comprador SÍ pagó? El XMR va al comprador (la comisión a la plataforma). No se puede deshacer.", "Confirm the buyer DID pay? The XMR goes to the buyer (fee to the platform). This cannot be undone.")),
                resolve("seller", app.t("Devolver el XMR al vendedor", "Return the XMR to the seller"), app.t("¿Confirmas que el comprador NO pagó? Todo el XMR regresa al vendedor, sin comisión. No se puede deshacer.", "Confirm the buyer did NOT pay? All the XMR goes back to the seller, no fee. This cannot be undone.")),
              ),
            )
          : null,
    );
  }

  app.show(
    h("p", {}, h("a", { href: "#/admin" }, "← " + app.t("Panel", "Panel"))),
    out,
    h("div", { class: "row between wrap" }, h("h2", {}, `${o.fiat_amount} ${o.fiat} · ${fmtXmr(o.xmr)} XMR`), h("span", { class: "badge " + statusTone(o.status) }, app.statusName(o.status))),
    decision,
    rejected.length ? h("p", { class: "notice danger" }, `${app.t("El árbitro rechazó un pago", "The arbiter rejected a payment")}: ${String((rejected[rejected.length - 1]!.body.data as { reason?: string }).reason)}`) : null,
    h(
      "dl",
      { class: "p2p-dl" },
      dt("ID", h("code", {}, o.id)),
      dt(app.t("Precio", "Price"), `${o.price} ${o.fiat}/XMR`),
      dt(app.t("Método", "Method"), app.methodTag(method)),
      dt(app.t("Comisión", "Fee"), `${fmtXmr(o.fee_xmr)} XMR`),
      dt(app.t("Creada", "Created"), new Date(o.created_at * 1000).toLocaleString(app.lang)),
      dt(app.t("Marcada pagada", "Marked paid"), o.paid_at ? new Date(o.paid_at * 1000).toLocaleString(app.lang) : "—"),
      dt("Escrow", code(o.multisig_address)),
      dt(app.t("Depósito", "Deposit"), code(o.deposit_txid)),
      dt(app.t("Pago de salida", "Payout"), code(o.payout_txid)),
      dt(app.t("Anuncio", "Ad"), h("code", {}, o.ad_id)),
    ),
    h("div", { class: "p2p-grid" }, userBox(app.t("Comprador", "Buyer"), r.buyer, o.buyer), userBox(app.t("Vendedor", "Seller"), r.seller, o.seller)),
    h("section", { class: "card p2p-pay" }, h("h3", {}, app.t("Datos de pago que mandó el vendedor", "Payment details the seller sent")), pay ? h("pre", {}, pay) : h("p", {}, "—")),
    h("section", { class: "card p2p-chat" }, h("h3", {}, app.t("Chat de la orden", "Order chat")), h("div", { class: "p2p-chat-log" }, lines), h("div", { class: "row" }, input, send)),
  );
}
