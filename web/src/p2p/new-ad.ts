/**
 * Publicar anuncio en 3 pasos: (1) tipo, moneda y precio desde el promedio del mercado; (2) montos y métodos de
 * pago; (3) condiciones, dirección y revisión con vista previa.
 */
import { get, type Method } from "./api";
import { KINDS, type P2PApp } from "./p2p-app";
import { fmtFiat, fmtXmr, h, kids, pct } from "./ui";

interface Market {
  price: number;
  rate: number;
  sources: string[];
  at: number;
}

const SOURCE_NAMES: Record<string, string> = { kraken: "Kraken", kucoin: "KuCoin", mexc: "MEXC", htx: "HTX", coingecko: "CoinGecko" };

export async function newAdView(app: P2PApp) {
  const t = app.t;
  const out = h("div");
  let step = 1;
  let mkt: Market | null = null;
  let side: "sell" | "buy" = "sell";
  let ptype: "float" | "fixed" = "float";
  const chosen: (Method & { details?: string })[] = [];

  // ---------- Paso 1: tipo, moneda y precio ----------
  const segBtn = (label: string, on: boolean, cls: string, f: () => void) => h("button", { type: "button", class: "p2p-seg-btn" + (on ? ` on ${cls}` : ""), onclick: f }, label);
  const sideSeg = h("div", { class: "p2p-seg" });
  const renderSide = () =>
    sideSeg.replaceChildren(
      segBtn(t("Quiero vender XMR", "I want to sell XMR"), side === "sell", "sell", () => ((side = "sell"), renderSide(), renderChosen(), syncAddr(), preview())),
      segBtn(t("Quiero comprar XMR", "I want to buy XMR"), side === "buy", "buy", () => ((side = "buy"), renderSide(), renderChosen(), syncAddr(), preview())),
    );
  const fiat = app.fiatSelect(app.lang === "es" ? "MXN" : "USD", "na-fiat");
  const mktCard = h("div", { class: "p2p-mkt" }, h("small", {}, t("Cargando precio de mercado…", "Loading market price…")));

  const typeSeg = h("div", { class: "p2p-seg small" });
  const renderType = () =>
    typeSeg.replaceChildren(
      segBtn(t("Mercado ± %", "Market ± %"), ptype === "float", "accent", () => ((ptype = "float"), renderType(), syncType(), preview())),
      segBtn(t("Precio fijo", "Fixed price"), ptype === "fixed", "accent", () => ((ptype = "fixed"), renderType(), syncType(), preview())),
    );
  const margin = h("input", { id: "na-margin", type: "text", inputMode: "decimal", value: "0", class: "p2p-margin-in" });
  const slider = h("input", { id: "na-slider", type: "range", min: "-20", max: "20", step: "0.25", value: "0", "aria-label": t("Margen", "Margin") });
  const bump = (d: number) => {
    const v = Math.max(-20, Math.min(20, Math.round((Number(margin.value.replace(",", ".")) + d) * 100) / 100 || 0));
    margin.value = String(v);
    slider.value = String(v);
    preview();
  };
  margin.oninput = () => ((slider.value = margin.value.replace(",", ".")), preview());
  slider.oninput = () => ((margin.value = slider.value), preview());
  const floatBox = h(
    "div",
    { class: "p2p-margin" },
    h("label", { for: "na-margin" }, t("Margen sobre el precio de mercado", "Margin over the market price")),
    h(
      "div",
      { class: "p2p-stepper" },
      h("button", { type: "button", class: "btn secondary", "aria-label": "−0.25%", onclick: () => bump(-0.25) }, "−"),
      h("div", { class: "p2p-suffix" }, margin, h("span", {}, "%")),
      h("button", { type: "button", class: "btn secondary", "aria-label": "+0.25%", onclick: () => bump(0.25) }, "+"),
    ),
    slider,
    h("div", { class: "p2p-range-lbl" }, h("small", {}, "−20%"), h("small", {}, "0"), h("small", {}, "+20%")),
    h("small", { class: "muted" }, t("Tu precio se mueve solo con el mercado.", "Your price moves with the market automatically.")),
  );
  const fixed = h("input", { id: "na-price", type: "text", inputMode: "decimal" });
  fixed.oninput = () => preview();
  const useMkt = h("button", { type: "button", class: "p2p-link", onclick: () => mkt && ((fixed.value = mkt.price.toFixed(2)), preview()) }, t("Usar precio de mercado", "Use market price"));
  const fixedBox = h("div", { class: "field app" }, h("label", { for: "na-price" }, t("Tu precio por XMR", "Your price per XMR")), h("div", { class: "p2p-suffix" }, fixed, h("span", { class: "na-fiat-lbl" }, fiat.value)), useMkt);
  const syncType = () => ((floatBox.hidden = ptype !== "float"), (fixedBox.hidden = ptype !== "fixed"));
  const yourPrice = h("div", { class: "p2p-yours" });

  const price = (): number | null => {
    if (ptype === "fixed") {
      const n = Number(fixed.value.replace(",", "."));
      return n > 0 ? n : null;
    }
    if (!mkt) return null;
    return Math.round(mkt.price * (1 + (Number(margin.value.replace(",", ".")) || 0) / 100) * 100) / 100;
  };

  const loadMarket = async () => {
    const p = await get<Market>(`/v1/p2p/price?fiat=${fiat.value}`).catch(() => null);
    mkt = p;
    for (const el of document.querySelectorAll(".na-fiat-lbl")) el.textContent = fiat.value;
    if (!p) {
      mktCard.replaceChildren(h("small", { class: "danger" }, t("No hay precio de mercado para esta moneda ahora; usa precio fijo.", "No market price for this currency right now; use a fixed price.")));
    } else {
      if (!fixed.value) fixed.value = p.price.toFixed(2);
      mktCard.replaceChildren(
        h("small", {}, t("Precio promedio de mercado", "Average market price")),
        h("strong", {}, `1 XMR ≈ ${fmtFiat(p.price, app.lang)} ${fiat.value}`),
        h("small", { class: "muted" }, `${t("Mediana de", "Median of")} ${p.sources.map((s) => SOURCE_NAMES[s] ?? s).join(", ")} · ${new Date(p.at * 1000).toLocaleTimeString(app.lang, { hour: "2-digit", minute: "2-digit" })}`),
      );
    }
    preview();
  };

  // ---------- Paso 2: montos y métodos ----------
  const amount = h("input", { id: "na-amount", type: "text", inputMode: "decimal", placeholder: "1.5" });
  const min = h("input", { id: "na-min", type: "text", inputMode: "decimal", placeholder: "100" });
  const max = h("input", { id: "na-max", type: "text", inputMode: "decimal", placeholder: "5000" });
  const amountHint = h("small", { class: "muted" });
  const capHint = h("small", { class: "muted" });
  for (const el of [amount, min, max]) el.oninput = () => preview();
  const methodsBox = h("div", { class: "p2p-methods" });
  const suggested = h("div", { class: "p2p-tags" });
  const renderChosen = () =>
    methodsBox.replaceChildren(
      ...chosen.map((m, i) => {
        const det = h("textarea", { id: `na-det-${i}`, rows: 2, maxLength: 500, value: m.details ?? app.saved(fiat.value, m.name)?.details ?? "", placeholder: t("Titular, CLABE / cuenta / correo…", "Holder, account / IBAN / email…") });
        det.oninput = () => (m.details = det.value);
        m.details = det.value;
        return h(
          "div",
          { class: "p2p-chosen" },
          h("div", { class: "row between" }, app.methodTag(m), h("button", { class: "p2p-x", type: "button", "aria-label": t("Quitar", "Remove"), onclick: () => (chosen.splice(i, 1), renderChosen(), preview()) }, "✕")),
          side === "sell" ? app.field(t("Tus datos para recibir el pago (se envían cifrados solo al comprador)", "Your details to get paid (sent encrypted only to the buyer)"), det) : null,
        );
      }),
    );
  const loadMethods = async () => {
    const r = await get<{ suggested: Method[] }>(`/v1/p2p/methods?fiat=${fiat.value}`);
    suggested.replaceChildren(
      ...r.suggested.map((m) =>
        h(
          "button",
          { type: "button", class: "p2p-tag btn-tag" + (m.reversible ? " rev" : ""), onclick: () => chosen.length < 5 && !chosen.some((c) => c.name === m.name) && (chosen.push({ ...m }), renderChosen(), preview()) },
          `+ ${m.name}${m.country ? ` (${m.country})` : ""}${m.reversible ? " ⚠" : ""}`,
        ),
      ),
    );
  };
  const kind = h("select", { id: "na-kind" }, KINDS.map((k) => h("option", { value: k }, app.kindName(k))));
  const cname = h("input", { id: "na-cname", type: "text", maxLength: 40, placeholder: t("Banco, app o PayPal…", "Bank, app or PayPal…") });
  const ccountry = h("input", { id: "na-ccountry", type: "text", maxLength: 2, placeholder: t("país", "country") });
  const cadd = h("button", { class: "btn secondary", type: "button" }, t("Agregar", "Add"));
  cadd.onclick = () => {
    const name = cname.value.trim();
    if (name.length < 2 || chosen.length >= 5) return;
    chosen.push({ kind: kind.value, name, country: ccountry.value.toUpperCase() || undefined, reversible: kind.value === "card" || /paypal|revolut|mercado ?pago|venmo|cash ?app|card|tarjeta/i.test(name) });
    cname.value = "";
    renderChosen();
    preview();
  };

  // ---------- Paso 3: condiciones y revisión ----------
  const windowMin = h("select", { id: "na-window" }, [15, 30, 45, 60, 120].map((n) => h("option", { value: String(n), selected: n === 30 }, `${n} min`)));
  const terms = h("textarea", { id: "na-terms", rows: 3, maxLength: 1000, placeholder: t("Ej.: solo transferencias desde una cuenta a tu nombre.", "E.g. only transfers from an account in your name.") });
  terms.oninput = () => preview();
  const minRev = h("input", { id: "na-minrev", type: "text", inputMode: "numeric", value: "0" });
  const country = h("input", { id: "na-country", type: "text", maxLength: 2, placeholder: t("opcional", "optional") });
  const addr = h("input", { id: "na-addr", type: "text", spellcheck: false, autocomplete: "off" });
  const addrF = app.field("", addr, app.cfg.xmr_network === "stagenet" ? t("Red de prueba: dirección de stagenet (empieza con 5 o 7).", "Test network: stagenet address (starts with 5 or 7).") : undefined);
  const syncAddr = () =>
    (addrF.querySelector("label")!.textContent =
      side === "sell" ? t("Tu dirección de Monero para reembolsos (si una orden se cancela)", "Your Monero address for refunds (if an order is cancelled)") : t("Tu dirección de Monero (donde recibes el XMR)", "Your Monero address (where you get the XMR)"));
  const previewBox = h("div", { class: "p2p-preview" });

  /** Recalcula «Tu precio», avisos, ayudas de montos y la vista previa. */
  function preview() {
    const p = price();
    const delta = p && mkt ? ((p - mkt.price) / mkt.price) * 100 : null;
    const far = delta !== null ? Math.abs(delta) : 0;
    yourPrice.replaceChildren(...kids(
      h("small", {}, t("Tu precio", "Your price")),
      h("strong", {}, p ? `${fmtFiat(p, app.lang)} ${fiat.value}/XMR` : "—"),
      delta !== null ? h("span", { class: "p2p-delta" + (delta > 0.05 ? " up" : delta < -0.05 ? " down" : "") }, `${pct(delta)} ${t("vs mercado", "vs market")}`) : null,
      far > 15
        ? h("p", { class: "notice danger" }, t("Tu precio está muy lejos del mercado: casi nadie tomará el anuncio.", "Your price is very far from the market: almost nobody will take the ad."))
        : far > 5
          ? h("p", { class: "notice warn" }, t("Tu precio se aleja más de 5% del mercado: tu anuncio quedará al fondo de la lista.", "Your price is more than 5% away from the market: your ad will sit at the bottom of the list."))
          : null,
    ));
    const capFiat = mkt ? app.cfg.cap_usd * mkt.rate : null;
    capHint.textContent = capFiat ? t(`Tope por orden: ${app.cfg.cap_usd} USD ≈ ${fmtFiat(Math.floor(capFiat), app.lang)} ${fiat.value}`, `Cap per order: ${app.cfg.cap_usd} USD ≈ ${fmtFiat(Math.floor(capFiat), app.lang)} ${fiat.value}`) : "";
    const a = Number(amount.value.replace(",", "."));
    const mx = Number(max.value.replace(",", "."));
    amountHint.textContent = [
      a > 0 && p ? t(`≈ ${fmtFiat(a * p, app.lang)} ${fiat.value} en total`, `≈ ${fmtFiat(a * p, app.lang)} ${fiat.value} in total`) : "",
      mx > 0 && p ? t(`Máximo por orden ≈ ${fmtXmr(mx / p)} XMR`, `Max per order ≈ ${fmtXmr(mx / p)} XMR`) : "",
      side === "sell" && a > 0 ? t(`Cada orden se bloquea en escrow con +${app.cfg.fee_bps / 100}% de comisión.`, `Each order is locked in escrow with a +${app.cfg.fee_bps / 100}% fee.`) : "",
    ]
      .filter(Boolean)
      .join(" · ");
    // Vista previa como en el mercado.
    previewBox.replaceChildren(...kids(
      h("small", { class: "muted" }, t("Así verán tu anuncio", "This is how people will see your ad")),
      h(
        "div",
        { class: "p2p-row" },
        h("div", { class: "p2p-cell user" }, app.me ? app.userLine(app.me) : h("span", {}, "—")),
        h("div", { class: "p2p-cell price" }, h("span", { class: "p2p-price" }, p ? fmtFiat(p, app.lang) : "—", h("small", {}, ` ${fiat.value}`)), delta !== null ? h("small", { class: "p2p-delta" }, `${pct(delta)}`) : null),
        h(
          "div",
          { class: "p2p-cell limits" },
          h("span", {}, h("small", { class: "muted" }, t("Disponible", "Available") + " "), a > 0 ? `${fmtXmr(a)} XMR` : "—"),
          h("span", {}, h("small", { class: "muted" }, t("Límite", "Limit") + " "), `${min.value || "—"} – ${max.value || "—"} ${fiat.value}`),
        ),
        h("div", { class: "p2p-cell methods" }, h("div", { class: "p2p-tags" }, chosen.map((m) => app.methodTag(m)))),
        h("div", { class: "p2p-cell act" }, h("span", { class: "btn " + (side === "sell" ? "buy" : "sell") }, side === "sell" ? t("Comprar XMR", "Buy XMR") : t("Vender XMR", "Sell XMR"))),
      ),
      terms.value.trim() ? h("p", { class: "p2p-terms" }, h("small", {}, terms.value.trim())) : null,
    ));
  }

  // ---------- Pasos y navegación ----------
  const steps = h("ol", { class: "p2p-steps" });
  const pane1 = h(
    "section",
    { class: "card p2p-form" },
    h("h3", {}, t("1. Tipo y precio", "1. Type and price")),
    sideSeg,
    h("div", { class: "p2p-grid" }, app.field(t("Moneda", "Currency"), fiat)),
    mktCard,
    h("div", { class: "field app" }, h("label", {}, t("Tipo de precio", "Price type")), typeSeg),
    floatBox,
    fixedBox,
    yourPrice,
  );
  const pane2 = h(
    "section",
    { class: "card p2p-form" },
    h("h3", {}, t("2. Montos y métodos de pago", "2. Amounts and payment methods")),
    h("div", { class: "field app" }, h("label", { for: "na-amount" }, t("Cantidad total de XMR del anuncio", "Total XMR in the ad")), h("div", { class: "p2p-suffix" }, amount, h("span", {}, "XMR")), amountHint),
    h(
      "div",
      { class: "p2p-grid" },
      h("div", { class: "field app" }, h("label", { for: "na-min" }, t("Mínimo por orden", "Minimum per order")), h("div", { class: "p2p-suffix" }, min, h("span", { class: "na-fiat-lbl" }, fiat.value))),
      h("div", { class: "field app" }, h("label", { for: "na-max" }, t("Máximo por orden", "Maximum per order")), h("div", { class: "p2p-suffix" }, max, h("span", { class: "na-fiat-lbl" }, fiat.value)), capHint),
    ),
    h("h4", {}, t("Métodos de pago (hasta 5)", "Payment methods (up to 5)")),
    h("small", { class: "muted" }, t("Sugeridos para tu moneda:", "Suggested for your currency:")),
    suggested,
    h("details", { class: "p2p-more" }, h("summary", {}, t("Agregar otro método", "Add another method")), h("div", { class: "p2p-grid" }, app.field(t("Tipo", "Type"), kind), app.field(t("Nombre", "Name"), cname), app.field(t("País", "Country"), ccountry), h("div", { class: "field app" }, h("label", {}, " "), cadd))),
    methodsBox,
    h("p", { class: "notice warn" }, t("⚠ PayPal, tarjetas y similares se pueden revertir después de que liberas. Úsalos solo con gente con historial.", "⚠ PayPal, cards and similar can be reversed after you release. Use them only with people who have a track record.")),
  );
  const pane3 = h(
    "section",
    { class: "card p2p-form" },
    h("h3", {}, t("3. Condiciones y revisión", "3. Terms and review")),
    h("div", { class: "p2p-grid" }, app.field(t("Tiempo para pagar", "Time to pay"), windowMin), app.field(t("Órdenes mínimas para métodos reversibles", "Minimum orders for reversible methods"), minRev), app.field(t("País (opcional)", "Country (optional)"), country)),
    app.field(t("Condiciones (opcional)", "Terms (optional)"), terms),
    addrF,
    previewBox,
    h("p", { class: "p2p-escrow-note" }, "🔒 ", side === "sell" ? t("No bloqueas XMR al publicar. Cuando alguien abra una orden, tu navegador arma el escrow 2 de 3 y depositas: deja la app abierta mientras tu anuncio esté activo.", "You don't lock XMR when posting. When someone opens an order, your browser sets up the 2-of-3 escrow and you deposit: keep the app open while your ad is active.") : t("Cuando un vendedor tome tu anuncio, él bloquea el XMR en el escrow antes de que pagues.", "When a seller takes your ad, they lock the XMR in escrow before you pay.")),
  );
  const back = h("button", { class: "btn secondary", type: "button" }, t("Atrás", "Back"));
  const next = h("button", { class: "btn", type: "button" }, t("Siguiente", "Next"));
  const publish = h("button", { class: "btn big", type: "button" }, t("Publicar anuncio", "Post ad"));

  const check = (s: number) => {
    if (s === 1 && !price()) throw new Error(t("Escribe un precio válido.", "Enter a valid price."));
    if (s === 2) {
      if (!(Number(amount.value.replace(",", ".")) > 0)) throw new Error(t("Escribe la cantidad de XMR.", "Enter the XMR amount."));
      const a = Number(min.value.replace(",", "."));
      const b = Number(max.value.replace(",", "."));
      if (!(a > 0) || !(b > 0)) throw new Error(t("Escribe el mínimo y el máximo por orden.", "Enter the minimum and maximum per order."));
      if (a > b) throw new Error(t("El mínimo no puede ser mayor que el máximo.", "The minimum cannot be greater than the maximum."));
      if (!chosen.length) throw new Error(t("Agrega al menos un método de pago.", "Add at least one payment method."));
      if (side === "sell" && chosen.some((m) => !m.details?.trim())) throw new Error(t("Escribe tus datos de pago para cada método.", "Enter your payment details for each method."));
    }
  };
  const render = () => {
    const names = [t("Tipo y precio", "Type & price"), t("Montos y métodos", "Amounts & methods"), t("Revisión", "Review")];
    steps.replaceChildren(...names.map((n, i) => h("li", { class: i + 1 < step ? "done" : i + 1 === step ? "now" : "" }, n)));
    pane1.hidden = step !== 1;
    pane2.hidden = step !== 2;
    pane3.hidden = step !== 3;
    back.hidden = step === 1;
    next.hidden = step === 3;
    publish.hidden = step !== 3;
    preview();
  };
  back.onclick = () => ((step = Math.max(1, step - 1)), out.replaceChildren(), render());
  next.onclick = () => {
    out.replaceChildren();
    try {
      check(step);
      step++;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      out.replaceChildren(app.error(e));
    }
  };
  publish.onclick = () =>
    void app.busy(
      publish,
      async () => {
        if (!app.me) throw new Error(t("Primero elige un apodo en Cuenta.", "First choose a nickname in Account."));
        check(1);
        check(2);
        app.askNotify();
        await app.req("POST", "/v1/p2p/ads", {
          side,
          fiat: fiat.value,
          country: country.value.toUpperCase() || null,
          price_type: ptype,
          ...(ptype === "float" ? { margin_pct: Number(margin.value.replace(",", ".")) || 0 } : { price: fixed.value.trim().replace(",", ".") }),
          min_fiat: min.value.trim().replace(",", "."),
          max_fiat: max.value.trim().replace(",", "."),
          amount_xmr: amount.value.trim().replace(",", "."),
          methods: chosen.map(({ details: _d, ...m }) => m),
          pay_window_min: Number(windowMin.value),
          terms: terms.value,
          min_orders_reversible: Number(minRev.value) || 0,
          xmr_address: addr.value.trim(),
        });
        if (side === "sell") {
          for (const m of chosen) app.remember({ fiat: fiat.value, kind: m.kind, name: m.name, country: m.country ?? undefined, details: m.details!.trim() });
          await app.saveV();
        }
        location.hash = "#/anuncios";
      },
      out,
    );
  fiat.onchange = () => ((chosen.length = 0), (fixed.value = ""), renderChosen(), void loadMarket(), void loadMethods());

  app.show(h("div", { class: "row between wrap" }, h("h2", {}, t("Publicar anuncio", "Post an ad"))), steps, out, pane1, pane2, pane3, h("p", { class: "row wrap p2p-nav-btns" }, back, next, publish));
  renderSide();
  renderType();
  syncType();
  syncAddr();
  render();
  await Promise.all([loadMarket(), loadMethods()]);
  // El precio de mercado se refresca cada minuto mientras sigas en esta pantalla.
  const iv = setInterval(() => (location.hash.startsWith("#/nuevo") ? void loadMarket() : clearInterval(iv)), 60_000);
}
