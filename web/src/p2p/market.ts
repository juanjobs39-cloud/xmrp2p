/** Mercado: anuncios de compra y venta con filtros, y el panel para abrir una orden. */
import { MONERO } from "../app/config";
import { get, type Ad, type Method, type OrderView, type PublicUser } from "./api";
import type { P2PApp } from "./p2p-app";
import { fmtFiat, fmtWait, fmtXmr, h, kids, offPlatformWarning, pct, skeleton } from "./ui";

type MarketAd = Ad & { user: PublicUser };

export async function marketView(app: P2PApp) {
  const t = app.t;
  const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const wantBuy = sp.get("lado") !== "vender";
  const fiat = app.fiatSelect(sp.get("fiat") ?? (app.lang === "es" ? "MXN" : "USD"), "p2p-fiat");
  const amount = h("input", { id: "p2p-amount", type: "text", inputMode: "decimal", placeholder: t("Cualquier monto", "Any amount"), value: sp.get("monto") ?? "" });
  const method = h("select", { id: "p2p-method" }, h("option", { value: "" }, t("Todos los métodos", "All methods")));
  const country = h("input", { id: "p2p-country", type: "text", maxLength: 2, placeholder: t("Todos", "All"), value: sp.get("pais") ?? "" });
  const online = h("input", { id: "p2p-online", type: "checkbox", checked: sp.get("todos") !== "1" });
  const list = h("div", { class: "p2p-table", role: "table" }, skeleton(4));
  const strip = h("div", { class: "p2p-strip" });

  const go = (buy = wantBuy) => {
    const q = new URLSearchParams({ lado: buy ? "comprar" : "vender", fiat: fiat.value });
    if (country.value.trim()) q.set("pais", country.value.trim().toUpperCase());
    if (method.value) q.set("metodo", method.value);
    if (amount.value.trim()) q.set("monto", amount.value.trim());
    if (!online.checked) q.set("todos", "1");
    location.hash = `#/?${q}`;
  };
  const tab = (buy: boolean, label: string) =>
    h("button", { type: "button", role: "tab", "aria-selected": String(buy === wantBuy), class: "p2p-seg-btn" + (buy === wantBuy ? (buy ? " on buy" : " on sell") : ""), onclick: () => go(buy) }, label);
  for (const el of [country, amount]) el.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && go());
  fiat.onchange = () => go();
  method.onchange = () => go();
  online.onchange = () => go();

  app.show(
    h(
      "div",
      { class: "p2p-toolbar" },
      h("div", { class: "p2p-seg", role: "tablist" }, tab(true, t("Comprar XMR", "Buy XMR")), tab(false, t("Vender XMR", "Sell XMR"))),
      h(
        "div",
        { class: "p2p-filters" },
        app.field(t("Moneda", "Currency"), fiat),
        h("div", { class: "field app" }, h("label", { for: "p2p-amount" }, t("Monto", "Amount")), h("div", { class: "p2p-suffix" }, amount, h("span", {}, fiat.value)), ),
        app.field(t("Método de pago", "Payment method"), method),
        app.field(t("País", "Country"), country),
        h("div", { class: "field app" }, h("label", {}, " "), h("button", { class: "btn", type: "button", onclick: () => go() }, t("Buscar", "Search"))),
      ),
      h("label", { class: "p2p-check" }, online, " ", t("Solo anunciantes en línea", "Online advertisers only")),
    ),
    strip,
    list,
  );

  // Métodos sugeridos para la moneda (para el filtro).
  void get<{ suggested: Method[] }>(`/v1/p2p/methods?fiat=${fiat.value}`).then(
    (r) => {
      const cur = sp.get("metodo") ?? "";
      const names = [...new Set([...r.suggested.map((m) => m.name), ...(cur ? [cur] : [])])];
      method.append(...names.map((n) => h("option", { value: n, selected: n === cur }, n)));
    },
    () => {},
  );

  const q = new URLSearchParams({ side: wantBuy ? "sell" : "buy", fiat: fiat.value });
  if (country.value.trim()) q.set("country", country.value.trim().toUpperCase());
  if (sp.get("metodo")) q.set("method", sp.get("metodo")!);
  if (amount.value.trim()) q.set("amount", amount.value.trim());
  if (online.checked) q.set("online", "1");
  const r = await get<{ market_price: number | null; ads: MarketAd[] }>(`/v1/p2p/ads?${q}`);

  strip.replaceChildren(
    r.market_price
      ? h(
          "span",
          {},
          h("small", {}, t("Precio de mercado", "Market price")),
          h("strong", {}, `1 XMR ≈ ${fmtFiat(r.market_price, app.lang)} ${fiat.value}`),
          h("small", { class: "muted" }, t("Mediana de varios exchanges", "Median of several exchanges")),
        )
      : h("small", {}, t("Precio de mercado no disponible ahora.", "Market price unavailable right now.")),
    h("small", { class: "muted" }, `${r.ads.length} ${t("anuncios", "ads")}`),
  );

  if (!r.ads.length) {
    list.replaceChildren(
      h(
        "div",
        { class: "p2p-empty" },
        h("p", { class: "p2p-empty-ico", "aria-hidden": "true" }, "⇄"),
        h("p", {}, h("strong", {}, t("No hay anuncios con estos filtros.", "No ads match these filters."))),
        h("p", {}, online.checked ? t("Prueba a ver también anunciantes desconectados o cambia el monto.", "Try including offline advertisers or change the amount.") : t("¡Publica el primero!", "Post the first one!")),
        h("p", { class: "row wrap center" }, h("a", { class: "btn", href: "#/nuevo" }, t("Publicar anuncio", "Post an ad"))),
      ),
    );
    return;
  }
  list.replaceChildren(
    h(
      "div",
      { class: "p2p-thead", role: "row" },
      h("span", { role: "columnheader" }, t("Anunciante", "Advertiser")),
      h("span", { role: "columnheader" }, t("Precio", "Price")),
      h("span", { role: "columnheader" }, t("Disponible / Límites", "Available / Limits")),
      h("span", { role: "columnheader" }, t("Métodos de pago", "Payment methods")),
      h("span", { role: "columnheader" }, ""),
    ),
    ...r.ads.map((ad) => adRow(app, ad, wantBuy, r.market_price)),
  );
}

function adRow(app: P2PApp, ad: MarketAd, wantBuy: boolean, market: number | null): HTMLElement {
  const t = app.t;
  const own = !!app.acct && ad.user_id.toLowerCase() === app.acct.address.toLowerCase();
  const on = app.isOn(ad.user);
  // Fuera de línea pero acepta solicitudes: la orden lo espera.
  const canReq = !on && !!ad.request_window_h;
  const delta = market && ad.price ? ((ad.price - market) / market) * 100 : null;
  const take = h(
    "button",
    { class: "btn " + (wantBuy ? "buy" : "sell"), type: "button", disabled: !on && !own && !canReq },
    own ? t("Tu anuncio", "Your ad") : canReq ? t("Enviar solicitud", "Send request") : !on ? t("Desconectado", "Offline") : wantBuy ? t("Comprar XMR", "Buy XMR") : t("Vender XMR", "Sell XMR"),
  );
  take.onclick = () => {
    if (own) return void (location.hash = "#/anuncios");
    if (!app.vault) return void (location.hash = "#/cuenta");
    takeSheet(app, ad, wantBuy, market);
  };
  return h(
    "article",
    { class: "p2p-row" + (on ? "" : " off"), role: "row" },
    h("div", { class: "p2p-cell user", role: "cell" }, app.userLine(ad.user)),
    h(
      "div",
      { class: "p2p-cell price", role: "cell" },
      h("span", { class: "p2p-price" }, fmtFiat(ad.price!, app.lang), h("small", {}, ` ${ad.fiat}`)),
      delta !== null ? h("small", { class: "p2p-delta" + (delta > 0.05 ? " up" : delta < -0.05 ? " down" : "") }, `${pct(delta)} ${t("vs mercado", "vs market")}`) : null,
    ),
    h(
      "div",
      { class: "p2p-cell limits", role: "cell" },
      h("span", {}, h("small", { class: "muted" }, t("Disponible", "Available") + " "), `${fmtXmr(ad.available_xmr)} XMR`),
      h("span", {}, h("small", { class: "muted" }, t("Límite", "Limit") + " "), `${fmtFiat(ad.min_fiat, app.lang)} – ${fmtFiat(ad.max_fiat, app.lang)} ${ad.fiat}`),
      h("span", {}, h("small", { class: "muted" }, t("Pagar en", "Pay within") + " "), `${ad.pay_window_min} min`),
    ),
    h("div", { class: "p2p-cell methods", role: "cell" }, h("div", { class: "p2p-tags" }, ad.methods.map((m) => app.methodTag(m)))),
    h("div", { class: "p2p-cell act", role: "cell" }, take, canReq ? h("small", { class: "muted p2p-reply" }, replyHint(app, ad)) : null),
  );
}

/** «Suele responder en ~2 h» (o el plazo máximo si todavía no hay historial). */
function replyHint(app: P2PApp, ad: MarketAd): string {
  const avg = ad.user.avg_accept_min;
  return avg != null ? app.t(`Suele responder en ~${fmtWait(avg)}`, `Usually replies in ~${fmtWait(avg)}`) : app.t(`Responde en máx. ${ad.request_window_h} h`, `Replies within ${ad.request_window_h} h`);
}

/** Panel lateral (hoja inferior en celular) con el resumen y el formulario para abrir la orden. */
function takeSheet(app: P2PApp, ad: MarketAd, wantBuy: boolean, market: number | null) {
  const t = app.t;
  const out = h("div");
  const amount = h("input", { id: "p2p-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: `${ad.min_fiat} – ${ad.max_fiat}` });
  const max = h("button", { class: "p2p-link", type: "button", onclick: () => ((amount.value = ad.max_fiat), amount.dispatchEvent(new Event("input"))) }, t("Máx.", "Max"));
  const est = h("div", { class: "p2p-est" });
  const fee = app.cfg.fee_bps / 10000;
  const update = () => {
    const n = Number(amount.value.replace(",", "."));
    if (!(n > 0) || !ad.price) return void est.replaceChildren(h("small", { class: "muted" }, t(`Entre ${ad.min_fiat} y ${ad.max_fiat} ${ad.fiat}`, `Between ${ad.min_fiat} and ${ad.max_fiat} ${ad.fiat}`)));
    const xmr = n / ad.price;
    const bad = n < Number(ad.min_fiat) || n > Number(ad.max_fiat);
    est.replaceChildren(...kids(
      h("span", {}, wantBuy ? t("Recibirás", "You get") : t("Venderás", "You sell")),
      h("strong", {}, `≈ ${fmtXmr(xmr)} XMR`),
      !wantBuy ? h("small", {}, t(`Depositarás ≈ ${fmtXmr(xmr * (1 + fee))} XMR (incluye ${app.cfg.fee_bps / 100}% de comisión) + una reserva para la red. Lo que sobre se te devuelve automáticamente.`, `You will deposit ≈ ${fmtXmr(xmr * (1 + fee))} XMR (includes the ${app.cfg.fee_bps / 100}% fee) + a network reserve. Anything left over is returned to you automatically.`)) : null,
      bad ? h("small", { class: "danger" }, t(`Fuera del límite (${ad.min_fiat} – ${ad.max_fiat} ${ad.fiat})`, `Outside the limit (${ad.min_fiat} – ${ad.max_fiat} ${ad.fiat})`)) : null,
    ));
  };
  amount.oninput = update;
  const method = h("select", { id: "p2p-m" }, ad.methods.map((m, i) => h("option", { value: String(i) }, m.name + (m.reversible ? " ⚠" : ""))));
  const addr = h("input", { id: "p2p-addr", type: "text", spellcheck: false, autocomplete: "off", placeholder: MONERO.addressPrefixes[0] + "…" });
  app.walletFill(addr);
  const isReq = !app.isOn(ad.user) && !!ad.request_window_h;
  const notifyMe = h("input", { id: "p2p-notify", type: "checkbox", checked: app.pushSupported() });
  const go = h("button", { class: "btn big " + (wantBuy ? "buy" : "sell"), type: "button" }, isReq ? t("Enviar solicitud", "Send request") : wantBuy ? t("Comprar XMR", "Buy XMR") : t("Vender XMR", "Sell XMR"));
  go.onclick = () =>
    void app.busy(
      go,
      async () => {
        if (!app.me) throw new Error(t("Primero elige un apodo en Cuenta.", "First choose a nickname in Account."));
        if (isReq && notifyMe.checked) await app.enablePush().catch(() => false);
        else app.askNotify();
        const o = await app.req<OrderView>("POST", "/v1/p2p/orders", { ad_id: ad.id, fiat_amount: amount.value.trim().replace(",", "."), method_index: Number(method.value), xmr_address: addr.value.trim() });
        close();
        location.hash = `#/orden/${o.id}`;
      },
      out,
    );

  const delta = market && ad.price ? ((ad.price - market) / market) * 100 : null;
  const sheet = h(
    "div",
    { class: "p2p-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "p2p-sheet-title" },
    h(
      "div",
      { class: "p2p-sheet-head" },
      h("h2", { id: "p2p-sheet-title" }, wantBuy ? t("Comprar XMR", "Buy XMR") : t("Vender XMR", "Sell XMR")),
      h("button", { class: "p2p-x", type: "button", "aria-label": t("Cerrar", "Close"), onclick: () => close() }, "✕"),
    ),
    app.userLine(ad.user),
    h(
      "dl",
      { class: "p2p-kv" },
      h("dt", {}, t("Precio", "Price")),
      h("dd", {}, h("strong", {}, `${fmtFiat(ad.price!, app.lang)} ${ad.fiat}/XMR`), delta !== null ? h("small", { class: "muted" }, ` (${pct(delta)})`) : null),
      h("dt", {}, t("Disponible", "Available")),
      h("dd", {}, `${fmtXmr(ad.available_xmr)} XMR`),
      h("dt", {}, t("Tiempo para pagar", "Time to pay")),
      h("dd", {}, `${ad.pay_window_min} min`),
    ),
    ad.terms ? h("div", { class: "p2p-terms" }, h("small", { class: "muted" }, t("Condiciones del anunciante", "Advertiser's terms")), h("p", {}, ad.terms)) : null,
    isReq
      ? h(
          "div",
          { class: "notice" },
          h(
            "p",
            {},
            t(
              `El anunciante está fuera de línea. Tu orden entra como solicitud: tiene hasta ${ad.request_window_h} h para aceptarla (${replyHint(app, ad).toLowerCase()}). No pagas nada hasta que el XMR esté en el escrow.`,
              `The advertiser is offline. Your order goes in as a request: they have up to ${ad.request_window_h} h to accept it (${replyHint(app, ad).toLowerCase()}). You pay nothing until the XMR is in escrow.`,
            ),
          ),
          h("p", {}, h("small", {}, t("Cuando acepte, vuelve a la orden: tu navegador también firma el escrow.", "When they accept, come back to the order: your browser also signs the escrow."))),
          app.pushSupported() ? h("label", { class: "p2p-check" }, notifyMe, " ", t("Avisarme cuando acepte (notificación del navegador)", "Notify me when they accept (browser notification)")) : null,
        )
      : null,
    offPlatformWarning(app.lang),
    out,
    h("div", { class: "field app" }, h("label", { for: "p2p-amt" }, `${wantBuy ? t("Vas a pagar", "You pay") : t("Vas a recibir", "You receive")} (${ad.fiat})`), h("div", { class: "p2p-suffix" }, amount, max, h("span", {}, ad.fiat))),
    est,
    app.field(t("Método de pago", "Payment method"), method),
    app.field(
      wantBuy ? t("Tu dirección de Monero (donde recibes el XMR)", "Your Monero address (where you get the XMR)") : t("Tu dirección de Monero para reembolsos", "Your Monero address for refunds"),
      addr,
      app.cfg.xmr_network === "stagenet" ? t("Red de prueba: dirección de stagenet (empieza con 5 o 7).", "Test network: stagenet address (starts with 5 or 7).") : undefined,
    ),
    h(
      "p",
      { class: "p2p-escrow-note" },
      h("span", { "aria-hidden": "true" }, "🔒 "),
      wantBuy
        ? t("El vendedor bloquea el XMR en un escrow 2 de 3 antes de que pagues. Pagas por fuera de la plataforma y él libera.", "The seller locks the XMR in a 2-of-3 escrow before you pay. You pay off-platform and they release.")
        : t(`Bloquearás el XMR (más ${app.cfg.fee_bps / 100}% de comisión) en un escrow 2 de 3. Libera solo cuando veas el dinero en tu cuenta.`, `You will lock the XMR (plus a ${app.cfg.fee_bps / 100}% fee) in a 2-of-3 escrow. Release only when you see the money in your account.`),
    ),
    go,
  );
  const back = h("div", { class: "p2p-backdrop", onclick: (e: Event) => e.target === back && close() }, sheet);
  const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
  function close() {
    back.remove();
    document.removeEventListener("keydown", esc);
    document.body.classList.remove("p2p-noscroll");
  }
  document.addEventListener("keydown", esc);
  document.body.classList.add("p2p-noscroll");
  document.body.append(back);
  update();
  amount.focus();
}
