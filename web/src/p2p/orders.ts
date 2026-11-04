import { get, type Ad, type OrderView, type PublicUser, type RoomMessage } from "./api";
import { EscrowDriver, type EscrowNote } from "./escrow";
import { open, seal } from "./identity";
import type { P2PApp } from "./p2p-app";
import { clock, fmtFiat, fmtXmr, h, kids, nowS, statusTone, type Child } from "./ui";

export async function myAdsView(app: P2PApp) {
  const t = app.t;
  const r = await app.req<{ ads: Ad[] }>("GET", "/v1/p2p/my/ads");
  const out = h("div");
  const autoPaused = r.ads.filter((a) => a.status === "paused" && a.paused_reason === "missed_deposits");
  const statusLabel: Record<string, string> = { active: t("Activo", "Active"), paused: t("En pausa", "Paused"), hidden: t("Oculto por soporte", "Hidden by support") };
  const row = (ad: Ad) => {
    const set = (status: string, label: string, cls = "secondary") => {
      const b = h("button", { class: `btn ${cls} small`, type: "button" }, label);
      b.onclick = () => {
        if (status === "closed" && !confirm(t("¿Cerrar el anuncio? No se puede reabrir.", "Close the ad? It cannot be reopened."))) return;
        void app.busy(b, async () => (await app.req("PATCH", `/v1/p2p/ads/${ad.id}`, { status }), app.route()), out);
      };
      return b;
    };
    return h(
      "article",
      { class: "p2p-row mine", role: "row" },
      h("div", { class: "p2p-cell user", role: "cell" }, h("span", { class: "p2p-pill " + (ad.side === "sell" ? "sell" : "buy") }, ad.side === "sell" ? t("Vendes", "Selling") : t("Compras", "Buying")), h("small", { class: "muted" }, ` ${ad.fiat}`)),
      h(
        "div",
        { class: "p2p-cell price", role: "cell" },
        h("span", { class: "p2p-price" }, ad.price ? fmtFiat(ad.price, app.lang) : "—", h("small", {}, ` ${ad.fiat}`)),
        h("small", { class: "muted" }, ad.price_type === "float" ? `${t("Mercado", "Market")} ${(ad.margin_pct ?? 0) > 0 ? "+" : ""}${ad.margin_pct ?? 0}%` : t("Precio fijo", "Fixed price")),
      ),
      h(
        "div",
        { class: "p2p-cell limits", role: "cell" },
        h("span", {}, h("small", { class: "muted" }, t("Disponible", "Available") + " "), `${fmtXmr(ad.available_xmr)} XMR`),
        h("span", {}, h("small", { class: "muted" }, t("Límite", "Limit") + " "), `${fmtFiat(ad.min_fiat, app.lang)} – ${fmtFiat(ad.max_fiat, app.lang)} ${ad.fiat}`),
      ),
      h("div", { class: "p2p-cell methods", role: "cell" }, h("div", { class: "p2p-tags" }, ad.methods.map((m) => app.methodTag(m)))),
      h(
        "div",
        { class: "p2p-cell act", role: "cell" },
        h("span", { class: "badge " + (ad.status === "active" ? "ok" : ad.status === "hidden" ? "danger" : "warn") }, statusLabel[ad.status] ?? ad.status),
        ad.status === "hidden" ? null : h("div", { class: "row wrap" }, ad.status === "active" ? set("paused", t("Pausar", "Pause")) : set("active", t("Activar", "Activate"), ""), set("closed", t("Cerrar", "Close"))),
      ),
    );
  };
  app.show(
    h("div", { class: "row between wrap" }, h("h2", {}, t("Mis anuncios", "My ads")), h("a", { class: "btn", href: "#/nuevo" }, "＋ " + t("Nuevo anuncio", "New ad"))),
    out,
    autoPaused.length
      ? h(
          "p",
          { class: "notice warn" },
          t(
            "Pausamos tus anuncios de venta porque dejaste vencer 2 depósitos en las últimas 24 horas. Cuando vuelvas a estar disponible, actívalos; recuerda dejar la app abierta para depositar a tiempo.",
            "We paused your sell ads because you let 2 deposits expire in the last 24 hours. When you are available again, activate them; remember to keep the app open to deposit in time.",
          ),
        )
      : null,
    r.ads.length
      ? h("div", { class: "p2p-table", role: "table" }, r.ads.map(row))
      : h("div", { class: "p2p-empty" }, h("p", { class: "p2p-empty-ico", "aria-hidden": "true" }, "▤"), h("p", {}, t("Aún no tienes anuncios.", "You have no ads yet.")), h("p", {}, h("a", { class: "btn", href: "#/nuevo" }, t("Publicar mi primer anuncio", "Post my first ad")))),
    r.ads.some((a) => a.side === "sell" && a.status === "active")
      ? h("p", { class: "p2p-escrow-note" }, "🔔 ", t("Mientras tengas anuncios de venta activos, deja esta app abierta: te avisamos con sonido y notificación cuando alguien abra una orden.", "While you have active sell ads, keep this app open: we alert you with a sound and a notification when someone opens an order."))
      : null,
  );
}

export async function ordersView(app: P2PApp) {
  const t = app.t;
  const r = await app.req<{ orders: { id: string; role: string; status: string; fiat: string; fiat_amount: string; xmr: string; price: string; created_at: number }[] }>("GET", "/v1/p2p/my/orders");
  const open = r.orders.filter((o) => !FINAL.includes(o.status));
  const done = r.orders.filter((o) => FINAL.includes(o.status));
  const rows = (list: typeof r.orders) =>
    h(
      "div",
      { class: "p2p-table orders", role: "table" },
      list.map((o) =>
        h(
          "a",
          { class: "p2p-row link", role: "row", href: `#/orden/${o.id}` },
          h("div", { class: "p2p-cell", role: "cell" }, h("span", { class: "p2p-pill " + (o.role === "buyer" ? "buy" : "sell") }, o.role === "buyer" ? t("Compra", "Buy") : t("Venta", "Sell"))),
          h("div", { class: "p2p-cell", role: "cell" }, h("strong", {}, `${fmtXmr(o.xmr)} XMR`), h("small", { class: "muted" }, `${fmtFiat(o.fiat_amount, app.lang)} ${o.fiat} · ${fmtFiat(o.price, app.lang)} ${o.fiat}/XMR`)),
          h("div", { class: "p2p-cell", role: "cell" }, h("span", { class: "badge " + statusTone(o.status) }, app.statusName(o.status))),
          h("div", { class: "p2p-cell muted", role: "cell" }, h("small", {}, new Date(o.created_at * 1000).toLocaleString(app.lang, { dateStyle: "medium", timeStyle: "short" }))),
          h("div", { class: "p2p-cell act", role: "cell" }, h("span", { class: "p2p-chev", "aria-hidden": "true" }, "›")),
        ),
      ),
    );
  app.show(
    h("h2", {}, t("Mis órdenes", "My orders")),
    ...(r.orders.length
      ? [
          h("h3", { class: "p2p-sub" }, `${t("En curso", "In progress")} (${open.length})`),
          open.length ? rows(open) : h("p", { class: "muted" }, t("No tienes órdenes en curso.", "You have no orders in progress.")),
          ...(done.length ? [h("h3", { class: "p2p-sub" }, `${t("Terminadas", "Finished")} (${done.length})`), rows(done)] : []),
        ]
      : [h("div", { class: "p2p-empty" }, h("p", { class: "p2p-empty-ico", "aria-hidden": "true" }, "☰"), h("p", {}, t("Aún no tienes órdenes.", "You have no orders yet.")), h("p", {}, h("a", { class: "btn", href: "#/" }, t("Ir al mercado", "Go to the market"))))]),
  );
}

const FINAL = ["released", "cancelled", "refunded", "resolved_buyer", "resolved_seller"];

export async function orderView(app: P2PApp, id: string) {
  const messages: RoomMessage[] = [];
  let after = 0;
  let adminEnc: string | null | undefined;
  const plain = new Map<number, string>();
  let paymentText: string | null = null;
  let note: EscrowNote = null;
  let noteErr = "";
  const chatBox = h("div", { class: "p2p-chat-log", "aria-live": "polite" });
  const head = h("div");
  const actions = h("div");
  const escrowBox = h("div");
  const out = h("div");
  const input = h("textarea", { id: "p2p-msg", rows: 2, maxLength: 2000, placeholder: app.t("Escribe un mensaje (cifrado)…", "Write a message (encrypted)…") });
  const send = h("button", { class: "btn small", type: "button" }, app.t("Enviar", "Send"));
  const chatIn = h("div", { class: "p2p-chat-in" }, input, send);
  const chatLock = h(
    "p",
    { class: "p2p-chat-lock", hidden: true },
    app.t(
      "🔒 El chat se abre cuando el XMR del vendedor quede bloqueado en el escrow. Nunca pagues antes, aunque te lo pidan por otro medio.",
      "🔒 The chat opens once the seller's XMR is locked in the escrow. Never pay before that, even if someone asks you through another channel.",
    ),
  );
  let o!: OrderView;

  const recipients = () => [o.buyer?.enc_pubkey, o.seller?.enc_pubkey, adminEnc ?? ""].filter(Boolean) as string[];
  send.onclick = () =>
    void app.busy(
      send,
      async () => {
        const txt = input.value.trim();
        if (!txt) return;
        await app.req("POST", `/v1/p2p/orders/${id}/messages`, { ciphertext: await seal(txt, recipients()) });
        input.value = "";
        await tick(false);
      },
      out,
    );

  const driver = () => {
    let d = app.drivers.get(id);
    if (!d)
      app.drivers.set(
        id,
        (d = new EscrowDriver(id, {
          vault: app.vault!,
          save: () => app.saveV(),
          post: (data) => app.req("POST", `/v1/p2p/orders/${id}/messages`, { protocol: data }),
          cfg: app.cfg,
          node: app.node,
        })),
      );
    return d;
  };

  const render = () => {
    const me = o.role;
    const cp = o.counterpart;
    const t = app.t;
    const pay = `${fmtFiat(o.fiat_amount, app.lang)} ${o.fiat}`;
    // Qué toca hacer ahora (la frase grande de la orden).
    const nextStep: Record<string, string> = {
      setup: t("Armando el escrow 2 de 3… deja esta pestaña abierta.", "Setting up the 2-of-3 escrow… keep this tab open."),
      awaiting_deposit: me === "seller" ? t("Deposita el XMR en el escrow.", "Deposit the XMR into the escrow.") : t("Esperando que el vendedor deposite. Todavía no pagues.", "Waiting for the seller to deposit. Do not pay yet."),
      confirming: t("Depósito visto: esperando 10 confirmaciones (~20 min). Todavía no pagues.", "Deposit seen: waiting for 10 confirmations (~20 min). Do not pay yet."),
      awaiting_payment: me === "buyer" ? t(`El XMR ya está bloqueado. Paga ${pay} con ${o.method.name} y marca «Ya pagué».`, `The XMR is locked. Pay ${pay} with ${o.method.name} and mark “I have paid”.`) : t("El XMR está bloqueado. Esperando el pago del comprador.", "The XMR is locked. Waiting for the buyer's payment."),
      paid: me === "seller" ? t(`El comprador dice que pagó ${pay}. Revisa TU cuenta y libera.`, `The buyer says they paid ${pay}. Check YOUR account and release.`) : t("Esperando que el vendedor confirme tu pago y libere.", "Waiting for the seller to confirm your payment and release."),
      disputed: t("En apelación: soporte revisa el chat y los comprobantes.", "Under appeal: support is reviewing the chat and the proofs."),
      releasing: t("Enviando el XMR al comprador…", "Sending the XMR to the buyer…"),
      refunding: t("Devolviendo el XMR al vendedor…", "Returning the XMR to the seller…"),
      resolving: t("Pagando según la decisión de soporte…", "Paying out per support's decision…"),
    };
    const tone = statusTone(o.status);
    head.replaceChildren(
      ...kids(
        h(
          "div",
          { class: "p2p-order-head" },
          h("div", {}, h("span", { class: "p2p-pill " + (me === "buyer" ? "buy" : "sell") }, me === "buyer" ? t("Compra", "Buy") : t("Venta", "Sell")), h("h2", {}, `${fmtXmr(o.xmr)} XMR`), h("small", { class: "muted" }, `${pay} · ${fmtFiat(o.price, app.lang)} ${o.fiat}/XMR`)),
          h("span", { class: "badge big " + tone }, app.statusName(o.status)),
        ),
        app.steps(o),
        nextStep[o.status] ? h("div", { class: "p2p-next " + tone }, h("p", {}, nextStep[o.status]), h("span", { class: "p2p-count", "data-deadline": o.deadline_at ?? "" })) : null,
        h(
          "dl",
          { class: "card p2p-kv" },
          h("dt", {}, t("Monto", "Amount")),
          h("dd", {}, h("strong", {}, pay)),
          h("dt", {}, me === "buyer" ? t("Recibes", "You get") : t("Vendes", "You sell")),
          h("dd", {}, `${fmtXmr(o.xmr)} XMR`),
          h("dt", {}, t("Método", "Method")),
          h("dd", {}, app.methodTag(o.method)),
          me === "seller" ? [h("dt", {}, t(`Comisión (${app.cfg.fee_bps / 100}%)`, `Fee (${app.cfg.fee_bps / 100}%)`)), h("dd", {}, `${fmtXmr(o.fee_xmr)} XMR`)] : null,
          h("dt", {}, me === "buyer" ? t("Vendedor", "Seller") : t("Comprador", "Buyer")),
          h("dd", {}, app.userLine(cp)),
          h("dt", {}, t("Orden", "Order")),
          h("dd", {}, h("code", {}, o.id.slice(0, 12))),
          o.payout_txid ? [h("dt", {}, t("Tx del pago", "Payout tx")), h("dd", {}, h("code", { class: "p2p-addr" }, o.payout_txid))] : null,
        ),
      ),
    );
    tickClock();

    // Escrow y avisos
    const ek: Child[] = [];
    if (["setup", "awaiting_deposit", "releasing", "refunding", "resolving"].includes(o.status))
      ek.push(h("p", { class: "notice warn" }, app.t("Deja esta pestaña abierta: tu navegador firma su parte del escrow.", "Keep this tab open: your browser signs its part of the escrow.")));
    if (note?.kind === "deposit") {
      const depAddr = note.address;
      ek.push(
        h("div", { class: "card p2p-deposit" },
          h("p", {}, h("strong", {}, app.t(`Deposita exactamente ${o.deposit_required_xmr} XMR`, `Deposit exactly ${o.deposit_required_xmr} XMR`))),
          h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, note.address), h("button", { class: "btn secondary small", type: "button", onclick: (e: Event) => void navigator.clipboard?.writeText(depAddr).then(() => ((e.target as HTMLElement).textContent = app.t("¡Copiada!", "Copied!"))) }, app.t("Copiar", "Copy"))),
          h("small", {}, app.t("Incluye el XMR de la orden, la comisión y una pequeña reserva para la comisión de red. Si depositas de más, o sobra de la reserva, se te devuelve automáticamente a tu dirección de reembolso al cerrar la orden. Tu navegador calculó esta dirección.", "Includes the order XMR, the fee and a small reserve for the network fee. If you deposit more, or part of the reserve is left over, it is returned automatically to your refund address when the order closes. Your browser computed this address.")),
        ),
      );
    }
    if (note?.kind === "mismatch") ek.push(h("p", { class: "notice danger" }, app.t("¡La dirección del escrow no coincide con la que calculó tu navegador! No deposites y abre una apelación.", "The escrow address does not match the one your browser computed! Do not deposit; open an appeal.")));
    if (note?.kind === "rejected") ek.push(h("p", { class: "notice danger" }, `${app.t("El árbitro rechazó el pago", "The arbiter rejected the payment")}: ${note.reason}`));
    if (note?.kind === "info" && note.text === "waiting_signature") ek.push(h("p", { class: "notice" }, app.t("Pago armado; esperando la segunda firma del árbitro…", "Payment built; waiting for the arbiter's second signature…")));
    if (noteErr) ek.push(h("p", { class: "notice danger" }, noteErr));
    if (o.status === "confirming") ek.push(h("p", { class: "notice" }, app.t("Depósito visto. Esperando 10 confirmaciones (~20 min).", "Deposit seen. Waiting for 10 confirmations (~20 min).")));
    if (me === "buyer" && ["awaiting_payment", "paid", "disputed"].includes(o.status))
      ek.push(
        h("div", { class: "card p2p-pay" },
          h("h3", {}, app.t("Datos de pago del vendedor", "Seller's payment details")),
          paymentText ? h("pre", {}, paymentText) : h("p", {}, app.t("Esperando que el vendedor los envíe…", "Waiting for the seller to send them…")),
          o.status === "awaiting_payment" ? h("small", {}, app.t("Paga exactamente el monto, desde una cuenta a tu nombre, y sin escribir «Monero» ni «XMR» en el concepto.", "Pay the exact amount, from an account in your name, and do not write “Monero” or “XMR” in the reference.")) : null,
        ),
      );
    escrowBox.replaceChildren(...(ek.filter(Boolean) as Node[]));

    // Acciones
    const act: HTMLElement[] = [];
    const btn = (label: string, cls: string, f: () => Promise<unknown>, confirmText?: string) => {
      const b = h("button", { class: `btn ${cls}`, type: "button" }, label);
      b.onclick = () => {
        if (confirmText && !confirm(confirmText)) return;
        void app.busy(b, async () => (await f(), await tick(false)), out);
      };
      return b;
    };
    const post = (action: string, body: Record<string, unknown> = {}) => app.req<OrderView>("POST", `/v1/p2p/orders/${id}/${action}`, body);
    if (me === "buyer" && o.status === "awaiting_payment")
      act.push(btn(app.t("Ya pagué", "I have paid"), "buy", () => post("paid"), app.t("¿Ya hiciste el pago completo? Marcarlo sin pagar es fraude.", "Have you made the full payment? Marking it without paying is fraud.")));
    if (me === "seller" && ["awaiting_payment", "paid", "disputed"].includes(o.status))
      act.push(btn(app.t("Liberar XMR", "Release XMR"), "sell", () => post("release"), app.t("¿Ya ves el dinero en TU cuenta? Libera solo si lo recibiste. No se puede deshacer.", "Do you see the money in YOUR account? Release only if you received it. This cannot be undone.")));
    const canCancel = me === "buyer" ? ["setup", "awaiting_deposit", "confirming", "awaiting_payment"].includes(o.status) : ["setup", "awaiting_deposit"].includes(o.status);
    if (canCancel) act.push(btn(app.t("Cancelar orden", "Cancel order"), "secondary", () => post("cancel"), app.t("¿Cancelar la orden?", "Cancel the order?")));
    if (o.status === "paid") {
      if (o.dispute_available_at && nowS() < o.dispute_available_at)
        act.push(h("small", {}, app.t(`Podrás apelar en ${Math.ceil((o.dispute_available_at - nowS()) / 60)} min.`, `You can appeal in ${Math.ceil((o.dispute_available_at - nowS()) / 60)} min.`)));
      else {
        const reason = h("textarea", { id: "p2p-reason", rows: 2, maxLength: 1000, placeholder: app.t("Qué pasó (mín. 5 caracteres)", "What happened (min. 5 characters)") });
        act.push(h("details", { class: "p2p-appeal" }, h("summary", {}, app.t("Apelar", "Appeal")), reason, btn(app.t("Abrir apelación", "Open appeal"), "secondary", () => post("dispute", { reason: reason.value }))));
      }
    }
    if (o.dispute) act.push(h("p", { class: "notice warn" }, `${app.t("Apelación", "Appeal")}: ${o.dispute.reason}${o.dispute.note ? ` — ${app.t("Resolución", "Decision")}: ${o.dispute.note}` : ""}`));
    if (["released", "resolved_buyer", "resolved_seller"].includes(o.status)) {
      const c = h("input", { id: "p2p-fb", type: "text", maxLength: 300, placeholder: app.t("Comentario (opcional)", "Comment (optional)") });
      act.push(h("div", { class: "row wrap" }, c, btn("👍", "secondary small", () => post("feedback", { positive: true, comment: c.value })), btn("👎", "secondary small", () => post("feedback", { positive: false, comment: c.value }))));
    }
    actions.replaceChildren(...act);

    // Chat: cerrado hasta que el XMR está bloqueado (el servidor también lo exige).
    const locked = !o.funded_at;
    chatLock.hidden = !locked;
    chatIn.hidden = locked;
    input.disabled = send.disabled = locked;
    chatBox.replaceChildren(
      ...messages
        .filter((m) => m.body.type !== "protocol")
        .map((m) => {
          if (m.body.type === "status") return h("p", { class: "p2p-sys" }, `• ${app.statusName(m.body.status ?? "")}`);
          if (m.body.type === "decision") return h("p", { class: "p2p-sys" }, `• ${app.t("Soporte decidió a favor de", "Support decided for")} ${m.body.winner === "buyer" ? app.t("el comprador", "the buyer") : app.t("el vendedor", "the seller")}: ${m.body.note ?? ""}`);
          if (m.body.type === "payment_details") return h("p", { class: "p2p-sys" }, `• ${app.t("El vendedor envió sus datos de pago", "The seller sent the payment details")}`);
          if (m.body.type !== "message") return h("p", { class: "p2p-sys" }, `• ${m.body.type}`);
          const who = m.from === me ? app.t("Tú", "You") : m.from === "admin" ? app.t("Soporte", "Support") : cp?.nickname ?? m.from;
          return h("div", { class: "p2p-msg " + (m.from === me ? "mine" : m.from === "admin" ? "admin" : "") }, h("small", {}, who), h("div", {}, plain.get(m.seq) ?? app.t("[no se pudo descifrar]", "[could not decrypt]")));
        }),
    );
  };

  const tick = async (schedule = true) => {
    try {
      o = await app.req<OrderView>("GET", `/v1/p2p/orders/${id}`);
      const r = await app.req<{ messages: RoomMessage[] }>("GET", `/v1/p2p/orders/${id}/messages?after=${after}`);
      for (const m of r.messages) {
        messages.push(m);
        after = Math.max(after, m.seq);
        if (m.body.type === "message" && m.body.ciphertext) plain.set(m.seq, await open(m.body.ciphertext, app.vault!).catch(() => app.t("[no se pudo descifrar]", "[could not decrypt]")));
      }
      if (adminEnc === undefined)
        adminEnc = app.cfg.admin_address ? ((await get<PublicUser>(`/v1/p2p/users/${app.cfg.admin_address}`).catch(() => null))?.enc_pubkey ?? null) : null;
      if (o.role === "buyer" && o.enc_payment && !paymentText) paymentText = await open(o.enc_payment, app.vault!).catch(() => null);
      // Vendedor: manda sus datos de pago guardados (cifrados) en cuanto el depósito está confirmado.
      if (o.role === "seller" && ["awaiting_payment", "paid"].includes(o.status) && !messages.some((m) => m.body.type === "payment_details")) {
        const s = app.saved(o.fiat, o.method.name);
        if (s) await app.req("POST", `/v1/p2p/orders/${id}/payment-details`, { enc_payment: await seal(`${o.method.name}\n${s.details}`, recipients()) });
        else if (!actions.querySelector("#p2p-paydet")) noteErr = app.t(`No tienes guardados tus datos de ${o.method.name}: escríbelos en el chat para el comprador.`, `You have no saved details for ${o.method.name}: write them in the chat for the buyer.`);
      }
      if (app.vault!.escrows[id] || o.status === "setup") {
        try {
          note = await driver().step(o, messages);
          noteErr = "";
        } catch (e) {
          noteErr = `${app.t("Escrow", "Escrow")}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      if (["released", "cancelled", "refunded", "resolved_buyer", "resolved_seller"].includes(o.status) && app.drivers.has(id)) {
        await app.drivers.get(id)!.close();
        app.drivers.delete(id);
      }
      render();
    } catch (e) {
      out.replaceChildren(app.error(e));
    }
    if (schedule && location.hash === `#/orden/${id}`) app.timer = setTimeout(() => void tick(), o && ["setup", "releasing", "refunding", "resolving"].includes(o.status) ? 4000 : 8000);
  };

  /** Cuenta regresiva del paso actual (se actualiza cada segundo). */
  function tickClock() {
    const el = head.querySelector<HTMLElement>(".p2p-count");
    if (!el) return;
    const dl = Number(el.dataset.deadline || 0);
    const left = dl - nowS();
    if (!dl || !o || !["setup", "awaiting_deposit", "awaiting_payment"].includes(o.status)) return void (el.textContent = "");
    const label = o.status === "awaiting_payment" ? app.t("para pagar", "to pay") : app.t("para depositar", "to deposit");
    el.textContent = left > 0 ? `⏱ ${clock(left)} ${label}` : app.t("Tiempo agotado", "Time is up");
    el.classList.toggle("late", left < 300);
  }
  const clockIv = setInterval(() => (location.hash === `#/orden/${id}` ? tickClock() : clearInterval(clockIv)), 1000);

  app.show(
    out,
    head,
    h(
      "div",
      { class: "p2p-order" },
      h("div", { class: "p2p-order-main" }, escrowBox, h("div", { class: "p2p-actions" }, actions)),
      h(
        "section",
        { class: "card p2p-chat" },
        h("h3", {}, "💬 ", app.t("Chat", "Chat"), h("small", { class: "muted" }, " · " + app.t("cifrado de punta a punta", "end-to-end encrypted"))),
        chatBox,
        chatLock,
        chatIn,
        h("small", { class: "muted" }, app.t("Soporte también puede leer el chat, para resolver apelaciones.", "Support can also read the chat, to resolve appeals.")),
      ),
    ),
  );
  await tick();
}
