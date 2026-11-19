/**
 * Pestaña «Cambiar» (etapa C): intercambios entre las wallets de la cuenta a través de Trocador.
 *
 * Con cuenta, lo que se compra llega SIEMPRE a la wallet interna de esa moneda (el servidor lo exige
 * con una dirección firmada por la cuenta); solo si la moneda no tiene wallet interna se escribe una
 * dirección propia. Si se paga desde una wallet interna, la app firma y envía el depósito al exchange
 * después de que el usuario revisa y confirma. Solo existe con PUBLIC_P2P_WALLETS=on.
 */
import type { TrocadorCoin, TrocadorQuote, TrocadorRates, TrocadorTrade } from "../app/api";
import { COINS, iconEl } from "../app/coins";
import { API_URL, NETWORKS, type EvmNetwork } from "../app/config";
import { xmrLib } from "../app/libs";
import { signed } from "./api";
import { signAddress } from "./pay";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { autoDeposit, DECIMALS, isFinal, planSwap, upsertSwap, type Internal, type Leg, type SwapPlan, type SwapRecord } from "./swap";
import { ot, statusLabel } from "./official";
import { clock, h, icon, nowS, type Child } from "./ui";
import { balances, prepareEvm, publicClient, sendEvm, type Asset } from "./wallet-evm";
import { copyButton, evmError, kv, persistXmr, startXmr, xmrError, xmrReady, XMR_EXPLORER } from "./wallet-view";
import { evmAddress, evmKey, formatAmount, parseAmount } from "./wallets";

/** API del exchange. En pruebas locales, PUBLIC_SWAP_API_URL=same usa el mismo servidor que sirve la app. */
const SWAP_API = (() => {
  const v = import.meta.env.PUBLIC_SWAP_API_URL as string | undefined;
  return v === "same" ? location.origin : v || API_URL;
})();

async function call<T>(path: string): Promise<T> {
  const r = await fetch(SWAP_API + path);
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `error ${r.status}`);
  return body;
}

const NAME: Record<Internal, string> = { xmr: "XMR", usdt: "USDT", usdc: "USDC", eth: "ETH" };
const INTERNAL_NET: Record<Internal, string> = { xmr: "Monero", usdt: "Arbitrum One", usdc: "Arbitrum One", eth: "Arbitrum One" };

/** Un lado del cambio: una wallet de la cuenta u otra moneda de la lista de Trocador. */
type Choice = { internal: Internal } | { other: TrocadorCoin };
const isInt = (c: Choice): c is { internal: Internal } => "internal" in c;
const ticker = (c: Choice) => (isInt(c) ? NAME[c.internal] : c.other.ticker.toUpperCase());
const network = (c: Choice) => (isInt(c) ? INTERNAL_NET[c.internal] : c.other.network);
const coinIcon = (c: Choice, size: number) => (isInt(c) ? iconEl(c.internal, undefined, SWAP_API, size) : iconEl(c.other.ticker, c.other.img, SWAP_API, size));
const clean = (s: string) => s.trim().replace(",", ".");
/** Dirección de otra moneda (mismo criterio que el exchange principal): 0x… con 40 hex, o texto razonable que no sea de Monero. */
const destOk = (a: string) => (a.startsWith("0x") ? /^0x[0-9a-fA-F]{40}$/.test(a) : /^[A-Za-z0-9:_.-]{10,128}$/.test(a) && !/^[48][1-9A-HJ-NP-Za-km-z]{94}([1-9A-HJ-NP-Za-km-z]{11})?$/.test(a));
/** Las cotizaciones de Trocador valen 10 minutos (igual que en el exchange principal). */
const QUOTE_TTL = 10 * 60_000;
/** Wallet interna de Arbitrum → activo de wallet-evm. */
export const evmAsset = (c: Internal): Asset => (c === "eth" ? "eth" : c === "usdc" ? "usdc" : "token");

export async function swapView(app: P2PApp): Promise<void> {
  const t = app.t;
  const v = app.vault!;
  const out = h("div");
  const title = h("h2", {}, t("Cambiar", "Swap"));

  if (!v.seed)
    return app.show(out, title, h("p", { class: "notice warn" }, t("Para cambiar entre tus wallets, primero créalas en la pestaña Wallet.", "To swap between your wallets, first create them in the Wallet tab."), " ", h("a", { href: "#/wallet" }, "Wallet")));
  if (v.network !== "mainnet")
    return app.show(out, title, h("p", { class: "notice warn" }, t("Los cambios usan exchanges reales a través de Trocador, que no tiene red de prueba. Aquí (red de prueba) no están disponibles.", "Swaps use real exchanges through Trocador, which has no test network. They are not available here (test network).")));

  const seed = v.seed;
  const net: EvmNetwork = NETWORKS.arbitrum_one!;
  const evm = evmAddress(seed);
  const pub = publicClient(net);
  const st = startXmr(app);

  // ---------------------------------------------------------------- formulario
  // Mismo formato que el exchange de monerop2p.app: selector con ícono, monto grande, invertir y cotizar.
  const sel: { from: Choice; to: Choice } = { from: { internal: "usdt" }, to: { internal: "xmr" } };
  const mine = (c: Choice) => (isInt(c) ? " · " + t("tu wallet", "your wallet") : "");

  let coins: TrocadorCoin[] | null = null;
  const loadCoins = async () => {
    coins ??= await call<TrocadorCoin[]>("/v1/trocador/coins?v=2");
  };

  const amt = h("input", { id: "p2p-s-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "50" });
  const max = h("button", { class: "p2p-link", type: "button" }, t("Todo", "Max"));
  const unit = h("span", { class: "quick-unit" });
  const dest = h("input", { id: "p2p-s-dest", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none" });
  const destF = app.field(t("Tu dirección para recibir", "Your address to receive"), dest, t("Esta moneda todavía no tiene wallet en la plataforma: se envía a la dirección que pongas. Revisa que sea de esa red.", "This coin has no wallet on the platform yet: it is sent to the address you enter. Check that it is on that network."));
  const memo = h("input", { id: "p2p-s-memo", type: "text", autocomplete: "off", spellcheck: false });
  const memoF = app.field(t("Memo o tag", "Memo or tag"), memo, t("Esta moneda lo necesita para acreditar el pago.", "This coin needs it to credit the payment."));
  const refund = h("input", { id: "p2p-s-refund", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none" });
  const refundF = app.field(t("Dirección de reembolso (opcional)", "Refund address (optional)"), refund, t("De la moneda que envías, por si el exchange tiene que devolverla.", "Of the coin you send, in case the exchange has to return it."));
  const quoteBtn = h("button", { class: "btn big", type: "button" }, t("Ver cotizaciones", "Get quotes"));
  const formMsg = h("div");
  const stage = h("div");
  const hint = h("p", { class: "meta" });

  /** Selector de moneda con ícono: primero tus wallets, luego el buscador con el resto. */
  function picker(side: "from" | "to") {
    const btn = h("button", { class: "coin-btn", type: "button", "aria-expanded": "false", "aria-label": side === "from" ? t("Moneda que envías", "Coin you send") : t("Moneda que recibes", "Coin you get") });
    const search = h("input", { class: "p2p-coin-search", type: "search", autocomplete: "off", spellcheck: false, placeholder: t("Busca otra moneda o red", "Search another coin or network") });
    const list = h("ul", { class: "coin-list" });
    const panel = h("div", { class: "coin-panel", hidden: true }, search, list);
    const wrap = h("div", { class: "coin-pick" }, btn, panel);
    const close = () => {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };
    const option = (c: Choice) => {
      const b = h("button", { class: "coin-opt", type: "button" }, coinIcon(c, 22), h("strong", {}, ticker(c)), h("span", {}, network(c) + mine(c)));
      b.onclick = () => {
        close();
        pick(side, c);
      };
      return h("li", {}, b);
    };
    const fill = () => {
      const q = search.value.trim().toLowerCase();
      // Las de la cuenta ya salen arriba; XMR siempre es una wallet propia.
      const outside = (c: TrocadorCoin) => c.ticker.toLowerCase() !== "xmr" && !(c.network === "Arbitrum" && ["usdt", "usdc", "eth"].includes(c.ticker.toLowerCase()));
      const all = (coins ?? []).filter(outside);
      const others = q
        ? all.filter((c) => `${c.ticker} ${c.name} ${c.network}`.toLowerCase().includes(q)).slice(0, 40)
        : COINS.map((k) => all.find((c) => c.ticker.toLowerCase() === k.ticker && c.network.toLowerCase() === k.network.toLowerCase())).filter((c): c is TrocadorCoin => !!c);
      list.replaceChildren(
        ...(q ? [] : [h("li", { class: "meta" }, t("Tus wallets", "Your wallets")), ...(["xmr", "usdt", "usdc", "eth"] as Internal[]).map((c) => option({ internal: c }))]),
        h("li", { class: "meta" }, !coins ? t("Cargando más monedas…", "Loading more coins…") : q ? (others.length ? t("Resultados", "Results") : t("Ninguna moneda coincide.", "No coin matches.")) : t("Otras monedas populares. Escribe para buscar entre más de 2 500.", "Other popular coins. Type to search 2,500+.")),
        ...others.map((c) => option({ other: c })),
      );
    };
    search.oninput = fill;
    btn.onclick = () => {
      const opening = panel.hidden;
      for (const other of pickers) other.close();
      if (!opening) return;
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      search.value = "";
      fill();
      void loadCoins().then(fill, (e) => formMsg.replaceChildren(app.error(e)));
    };
    const render = (c: Choice) => btn.replaceChildren(h("span", { class: "coin-sel" }, coinIcon(c, 22), h("strong", {}, ticker(c)), h("small", {}, network(c) + mine(c))), h("span", { class: "coin-caret", "aria-hidden": "true" }, icon("chevron")));
    return { wrap, render, close };
  }
  const pickers: ReturnType<typeof picker>[] = [];
  const pickFrom = picker("from");
  const pickTo = picker("to");
  pickers.push(pickFrom, pickTo);
  // Tocar fuera cierra el selector abierto; el aviso se quita solo al salir de esta pantalla.
  const outsideClick = (e: MouseEvent) => {
    if (!document.contains(pickFrom.wrap)) return document.removeEventListener("click", outsideClick);
    for (const pk of pickers) if (!pk.wrap.contains(e.target as Node)) pk.close();
  };
  document.addEventListener("click", outsideClick);

  const leg = (c: Choice): Leg => (isInt(c) ? { kind: "internal", coin: c.internal } : { kind: "other", ticker: c.other.ticker, network: c.other.network, memo: c.other.memo });
  const currentPlan = (): SwapPlan => {
    const p = planSwap(leg(sel.from), leg(sel.to));
    if (p === "same") throw new Error(t("Elige dos monedas distintas.", "Pick two different coins."));
    if (p === "need_xmr") throw new Error(t("Por ahora uno de los dos lados debe ser Monero (XMR).", "For now one of the two sides must be Monero (XMR)."));
    return p;
  };
  const labels = (p: SwapPlan) => {
    const other = p.network === "Arbitrum" && (p.ticker === "usdt" || p.ticker === "usdc" || p.ticker === "eth") ? `${p.ticker.toUpperCase()} (Arbitrum)` : `${p.ticker.toUpperCase()} (${p.network})`;
    return p.side === "buy" ? { from: other, to: "XMR" } : { from: "XMR", to: other };
  };

  const sync = () => {
    pickFrom.render(sel.from);
    pickTo.render(sel.to);
    unit.replaceChildren(h("span", { class: "unit-top" }, coinIcon(sel.from, 26), h("span", {}, ticker(sel.from))), " ", h("small", {}, network(sel.from)));
    const to = sel.to;
    destF.hidden = isInt(to);
    memoF.hidden = isInt(to) || !to.other.memo;
    refundF.hidden = isInt(sel.from);
    max.hidden = !isInt(sel.from);
    hint.textContent = isInt(to)
      ? t(`Lo que compres llega a tu wallet de ${to.internal === "xmr" ? "Monero" : "Arbitrum"}. Para sacarlo a otra wallet, envíalo después desde Wallet.`, `What you buy lands in your ${to.internal === "xmr" ? "Monero" : "Arbitrum"} wallet. To move it elsewhere, send it afterwards from Wallet.`)
      : "";
    hint.hidden = !isInt(to);
    stage.replaceChildren();
  };
  /** Uno de los dos lados es siempre Monero: al elegir uno, el otro se acomoda. */
  const isXmr = (c: Choice) => isInt(c) && c.internal === "xmr";
  function pick(side: "from" | "to", c: Choice) {
    const other = side === "from" ? "to" : "from";
    sel[side] = c;
    if (!isXmr(c)) sel[other] = { internal: "xmr" };
    else if (isXmr(sel[other])) sel[other] = { internal: "usdt" };
    sync();
  }
  const flip = h("button", { class: "quick-flip", type: "button", "aria-label": t("Invertir dirección", "Swap direction"), title: t("Invertir dirección", "Swap direction") }, icon("market"));
  flip.onclick = () => {
    [sel.from, sel.to] = [sel.to, sel.from];
    sync();
  };
  amt.oninput = () => stage.replaceChildren();

  /** Monto máximo que se puede cambiar desde una wallet interna, dejando lo necesario para la comisión de red. */
  async function maxAmount(coin: Internal): Promise<string> {
    if (coin === "usdt") return formatAmount((await balances(pub, net, evm)).token, DECIMALS.usdt);
    if (coin === "usdc") return formatAmount((await balances(pub, net, evm)).usdc, DECIMALS.usdc);
    if (coin === "eth") {
      const p = await prepareEvm(pub, net, evm, "eth", evm, "all").catch((e) => Promise.reject(evmError(app, e)));
      // Doble reserva: la comisión puede subir entre ahora y el depósito.
      const left = p.amount - p.fee;
      if (left <= 0n) throw new Error(t("No hay ETH suficiente para cambiar después de la comisión de red.", "There is not enough ETH to swap after the network fee."));
      return formatAmount(left, DECIMALS.eth);
    }
    await xmrReady(st, true, (pct) => formMsg.replaceChildren(h("small", { class: "muted" }, t(`Sincronizando tu wallet de Monero… ${Math.floor(pct * 100)} %`, `Syncing your Monero wallet… ${Math.floor(pct * 100)}%`))));
    formMsg.replaceChildren();
    const xmr = await xmrLib();
    const p = await xmr.userPrepare(st.address!, "all").catch((e) => Promise.reject(xmrError(app, e)));
    const left = BigInt(p.amount) - BigInt(p.fee);
    if (left <= 0n) throw new Error(t("No hay XMR suficiente para cambiar después de la comisión de red.", "There is not enough XMR to swap after the network fee."));
    return formatAmount(left, DECIMALS.xmr);
  }
  max.onclick = () =>
    void app.busy(
      max,
      async () => {
        if (isInt(sel.from)) amt.value = await maxAmount(sel.from.internal);
        stage.replaceChildren();
      },
      formMsg,
    );

  // ---------------------------------------------------------------- cotizar → revisar → confirmar
  quoteBtn.onclick = () =>
    void app.busy(
      quoteBtn,
      async () => {
        const plan = currentPlan();
        const amount = clean(amt.value);
        if (!/^\d{1,12}(\.\d{1,18})?$/.test(amount) || !(Number(amount) > 0)) throw new Error(t("Escribe un monto válido.", "Enter a valid amount."));
        const address = clean(dest.value);
        if (!plan.receiveIn && !destOk(address)) throw new Error(t(`Revisa la dirección: debe ser de ${plan.ticker.toUpperCase()} en la red ${plan.network}.`, `Check the address: it must be ${plan.ticker.toUpperCase()} on the ${plan.network} network.`));
        const own = clean(refund.value);
        if (!plan.payFrom && own && !destOk(own)) throw new Error(t("Revisa la dirección de reembolso.", "Check the refund address."));
        if (plan.memo && !memo.value.trim()) throw new Error(t("Esta moneda necesita memo o tag.", "This coin needs a memo or tag."));
        const rates = await call<TrocadorRates>(`/v1/trocador/rates?side=${plan.side}&amount=${encodeURIComponent(amount)}&ticker=${encodeURIComponent(plan.ticker)}&network=${encodeURIComponent(plan.network)}`);
        if (!rates.quotes.length) throw new Error(t("Ningún exchange cotizó ese monto. Prueba con otro monto.", "No exchange quoted that amount. Try another amount."));
        showQuotes(plan, amount, rates);
      },
      formMsg,
    );

  function showQuotes(plan: SwapPlan, amount: string, rates: TrocadorRates) {
    const l = labels(plan);
    const rows = rates.quotes.slice(0, 8).map((q, i) => {
      const choose = h("button", { class: "btn " + (i ? "secondary" : ""), type: "button" }, t("Elegir", "Choose"));
      choose.onclick = () => void app.busy(choose, () => review(plan, amount, rates, q), stage);
      const logo = iconEl(q.provider, q.logo, SWAP_API, 18);
      logo.classList.add("prov-logo");
      return h(
        "li",
        { class: "quick-item" + (i ? "" : " best") },
        h(
          "div",
          {},
          h("p", { class: "quick-amount" }, coinIcon(sel.to, 20), ` ${q.amount_to} ${ticker(sel.to)}`, i ? null : h("span", { class: "badge ok" }, t("Mejor precio", "Best rate"))),
          h("p", { class: "meta" }, logo, `${q.provider} · KYC ${q.kycrating} · ${q.fixed ? t("precio fijo", "fixed rate") : t("precio flotante", "floating rate")}${q.eta ? ` · ~${Math.round(q.eta)} min` : ""}`),
        ),
        choose,
      );
    });
    stage.replaceChildren(
      h("h4", {}, t(`Cotizaciones para ${amount} ${l.from}`, `Quotes for ${amount} ${l.from}`)),
      h("ul", { class: "quick-list" }, rows),
      h("p", {}, h("small", { class: "muted" }, t("La letra KYC es la calificación de Trocador: A casi nunca pide identificación; C o D pueden retener el cambio y pedirla. Solo se muestran exchanges con B o mejor.", "The KYC letter is Trocador's rating: A almost never asks for ID; C or D may hold the swap and ask for it. Only exchanges rated B or better are shown."))),
    );
  }

  async function review(plan: SwapPlan, amount: string, rates: TrocadorRates, q: TrocadorQuote) {
    const l = labels(plan);
    const pay = plan.payFrom;
    let feeRow: [string, Child][] = [];
    // Antes de crear nada en el exchange: que la wallet interna de verdad pueda pagar ese monto.
    if (pay === "xmr") {
      await xmrReady(st, true, (pct) => stage.replaceChildren(h("small", { class: "muted" }, t(`Sincronizando tu wallet de Monero… ${Math.floor(pct * 100)} %`, `Syncing your Monero wallet… ${Math.floor(pct * 100)}%`))));
      const p = await (await xmrLib()).userPrepare(st.address!, String(parseAmount(amount, DECIMALS.xmr))).catch((e) => Promise.reject(xmrError(app, e)));
      feeRow = [[t("Comisión de red (aprox.)", "Network fee (approx.)"), `${formatAmount(BigInt(p.fee), DECIMALS.xmr)} XMR`]];
    } else if (pay) {
      const p = await prepareEvm(pub, net, evm, evmAsset(pay), evm, parseAmount(amount, DECIMALS[pay])).catch((e) => Promise.reject(evmError(app, e)));
      feeRow = [[t("Comisión de red (máx.)", "Network fee (max)"), `${formatAmount(p.fee, 18, 8)} ETH`]];
    } else await xmrReady(st, false);

    const receive = plan.receiveIn === "xmr" ? st.address! : plan.receiveIn === "evm" ? evm : clean(dest.value);
    const go = h("button", { class: "btn", type: "button" }, pay ? t("Confirmar y enviar el depósito", "Confirm and send the deposit") : t("Crear el cambio", "Create the swap"));
    const back = h("button", { class: "btn secondary", type: "button", onclick: () => showQuotes(plan, amount, rates) }, t("Volver", "Back"));
    const msg = h("div");
    go.onclick = () =>
      void app.busy(
        go,
        async () => {
          back.disabled = true;
          try {
            await confirm(plan, amount, rates, q, receive);
          } catch (e) {
            back.disabled = false;
            // El exchange elegido no pudo crear el cambio: se vuelve a la lista sin él para elegir otro.
            const rest = rates.quotes.filter((x) => x.provider !== q.provider);
            if (e instanceof Error && /no pudo crear el cambio|could not be generated/i.test(e.message) && rest.length) {
              showQuotes(plan, amount, { ...rates, quotes: rest });
              stage.prepend(app.error(new Error(t(`${q.provider} no pudo crear el cambio en este momento. No se envió nada: elige otro exchange de la lista.`, `${q.provider} could not create the swap right now. Nothing was sent: pick another exchange from the list.`))));
              stage.scrollIntoView({ block: "start" });
              return;
            }
            throw e;
          }
        },
        msg,
      );
    stage.replaceChildren(
      h("h4", {}, t("Revisa antes de cambiar", "Review before swapping")),
      kv([
        [t("Envías", "You send"), h("span", {}, h("strong", {}, `${amount} ${l.from}`), h("small", { class: "muted" }, " · " + (pay ? t("desde tu wallet", "from your wallet") : t("desde tu wallet externa", "from your external wallet"))))],
        [t("Recibes (aprox.)", "You get (approx.)"), h("strong", {}, `${q.amount_to} ${l.to}`)],
        [plan.receiveIn ? t("En tu wallet", "In your wallet") : t("En tu dirección", "At your address"), h("code", { class: "p2p-addr" }, receive)],
        [t("Exchange", "Exchange"), `${q.provider} · KYC ${q.kycrating} · ${q.fixed ? t("precio fijo", "fixed rate") : t("precio flotante", "floating rate")}`],
        ...feeRow,
      ]),
      h("p", { class: "row wrap" }, go, back),
      msg,
    );
  }

  async function confirm(plan: SwapPlan, amount: string, rates: TrocadorRates, q: TrocadorQuote, receive: string) {
    if (Date.now() - rates.created_at > QUOTE_TTL) throw new Error(t("La cotización venció (duran 10 minutos). Pide cotizaciones otra vez.", "The quote expired (they last 10 minutes). Get quotes again."));
    const l = labels(plan);
    const pay = plan.payFrom;
    const proof = plan.receiveIn ? await signAddress(app.acct!, "mainnet", plan.receiveIn, receive) : null;
    const ownRefund = pay === "xmr" ? st.address! : pay ? evm : clean(refund.value);
    const trade = await signed<TrocadorTrade>(
      app.acct!,
      "POST",
      "/v1/trocador/trades",
      {
        rate_id: rates.rate_id,
        provider: q.provider,
        fixed: q.fixed,
        amount,
        ticker: plan.ticker,
        network: plan.network,
        side: plan.side,
        address: receive,
        ...(plan.memo ? { address_memo: memo.value.trim() } : {}),
        ...(ownRefund ? { refund: ownRefund } : {}),
        ...(proof ? { proof: { at: proof.at, sig: proof.sig } } : {}),
      },
      SWAP_API,
    );
    const rec: SwapRecord = { id: trade.trade_id, at: Math.floor(Date.now() / 1000), from: l.from, to: l.to, amount_from: amount, amount_to: trade.amount_to || q.amount_to, provider: trade.provider || q.provider, status: trade.status, ...(trade.expires_at ? { expires_at: trade.expires_at } : {}), ...(pay ? { pay } : {}) };
    v.swaps = upsertSwap(v.swaps, rec);
    await app.saveV();
    amt.value = "";
    let depositError: unknown;
    if (pay) {
      try {
        await deposit(rec, trade);
      } catch (e) {
        depositError = e;
      }
    }
    await showTrade(rec, trade, depositError);
    drawHistory();
  }

  /** Firma y envía el depósito desde la wallet interna. Solo si el intercambio pide lo mismo que se revisó. */
  async function deposit(rec: SwapRecord, trade: TrocadorTrade): Promise<void> {
    if (rec.deposit_tx) return;
    const d = autoDeposit(rec.pay, rec.amount_from, trade);
    if (typeof d === "string")
      throw new Error(
        {
          wrong_coin: t("El exchange pide otra moneda o red de la que revisaste: no se envió nada.", "The exchange asks for a different coin or network from the one you reviewed: nothing was sent."),
          wrong_amount: t("El exchange pide un monto distinto del que revisaste: no se envió nada.", "The exchange asks for a different amount from the one you reviewed: nothing was sent."),
          needs_memo: t("El exchange pide un memo para el depósito y tu wallet no puede ponerlo: no se envió nada.", "The exchange asks for a deposit memo and your wallet cannot add one: nothing was sent."),
          bad_address: t("La dirección de depósito que dio el exchange no es válida para esa red: no se envió nada.", "The deposit address given by the exchange is not valid for that network: nothing was sent."),
        }[d],
      );
    let tx: string;
    if (d.coin === "xmr") {
      const xmr = await xmrLib();
      if (!(await xmr.validAddress(d.to, "mainnet"))) throw new Error(t("La dirección de depósito que dio el exchange no es válida: no se envió nada.", "The deposit address given by the exchange is not valid: nothing was sent."));
      const p = await xmr.userPrepare(d.to, String(d.amount)).catch((e) => Promise.reject(xmrError(app, e)));
      await xmr.userRelay(p.metadata).catch((e) => Promise.reject(xmrError(app, e)));
      tx = p.txid;
      void persistXmr("mainnet").catch(() => {});
    } else {
      const p = await prepareEvm(pub, net, evm, evmAsset(d.coin), d.to, d.amount).catch((e) => Promise.reject(evmError(app, e)));
      tx = await sendEvm(net, evmKey(seed), p).catch((e) => Promise.reject(evmError(app, e)));
    }
    rec.deposit_tx = tx;
    v.swaps = upsertSwap(v.swaps, rec);
    await app.saveV();
  }

  // ---------------------------------------------------------------- seguimiento
  const statusText = (s: string, rec: SwapRecord): string =>
    ({
      new: rec.deposit_tx ? t("Depósito enviado; esperando que el exchange lo vea.", "Deposit sent; waiting for the exchange to see it.") : t("Esperando tu depósito.", "Waiting for your deposit."),
      waiting: rec.deposit_tx ? t("Depósito enviado; esperando que el exchange lo vea.", "Deposit sent; waiting for the exchange to see it.") : t("Esperando tu depósito.", "Waiting for your deposit."),
      confirming: t("El exchange vio tu depósito y espera las confirmaciones de la red.", "The exchange saw your deposit and is waiting for network confirmations."),
      sending: t(`El exchange está enviando tu ${rec.to}.`, `The exchange is sending your ${rec.to}.`),
      finished: t(`Listo: el exchange envió tu ${rec.to}.`, `Done: the exchange sent your ${rec.to}.`),
      failed: t("El exchange marcó el cambio como fallido. Escribe a su soporte con los datos de abajo.", "The exchange marked the swap as failed. Contact their support with the details below."),
      halted: t("El exchange detuvo el cambio (puede pedir verificación). Escribe a su soporte con los datos de abajo.", "The exchange halted the swap (it may ask for verification). Contact their support with the details below."),
      refunded: t("El exchange devolvió lo que enviaste a tu dirección de reembolso.", "The exchange returned what you sent to your refund address."),
      expired: t("El cambio venció sin recibir depósito. Si ya habías enviado, escribe al soporte del exchange.", "The swap expired without a deposit. If you had already sent, contact the exchange's support."),
      "paid partially": t("El exchange recibió menos de lo acordado. Escribe a su soporte con los datos de abajo.", "The exchange received less than agreed. Contact their support with the details below."),
    })[s] ?? s;

  const active = h("div");
  const STEP: Record<string, number> = { new: 0, waiting: 0, confirming: 1, sending: 2, finished: 4 };
  let clockIv: ReturnType<typeof setInterval> | undefined;
  async function showTrade(rec: SwapRecord, known?: TrocadorTrade, depositError?: unknown) {
    stage.replaceChildren();
    const box = h("section", { class: "card p2p-box", "data-swap": rec.id });
    active.replaceChildren(box);
    const draw = (trade: TrocadorTrade, err?: unknown) => {
      if (trade.status && trade.status !== rec.status) {
        rec.status = trade.status;
        if (trade.amount_to) rec.amount_to = trade.amount_to;
        v.swaps = upsertSwap(v.swaps, rec);
        void app.saveV().then(drawHistory);
      }
      const waiting = trade.status === "new" || trade.status === "waiting";
      if (trade.expires_at) rec.expires_at = trade.expires_at;
      // Barra de pasos y contador para depositar, como en el exchange principal.
      const at = STEP[trade.status];
      const steps =
        at === undefined
          ? null
          : h(
              "ol",
              { class: "p2p-steps" },
              ot("steps")
                .split("|")
                .map((label, k) => h("li", { class: at > k || trade.status === "finished" ? "done" : at === k ? "now" : "" }, label)),
            );
      const count = h("span", { class: "p2p-count" });
      const tick = () => {
        const dl = trade.expires_at ?? 0;
        if (!document.contains(count) || !waiting || !dl || rec.deposit_tx) return void (count.textContent = "");
        const left = dl - nowS();
        count.textContent = left > 0 ? `⏱ ${clock(left)} ${ot("toSend", rec.from.split(" ")[0]!)}` : ot("timeUp");
        count.classList.toggle("late", left < 300);
      };
      clearInterval(clockIv);
      clockIv = setInterval(() => (document.contains(box) ? tick() : clearInterval(clockIv)), 1000);
      const explorer = rec.deposit_tx ? (rec.pay === "xmr" ? XMR_EXPLORER.mainnet + rec.deposit_tx : `${net.explorer}/tx/${rec.deposit_tx}`) : "";
      const retry = h("button", { class: "btn small", type: "button" }, t("Depositar desde mi wallet", "Deposit from my wallet"));
      const retryMsg = h("div");
      retry.onclick = () =>
        void app.busy(
          retry,
          async () => {
            await deposit(rec, trade);
            draw(trade);
          },
          retryMsg,
        );
      const refresh = h("button", { class: "btn secondary small", type: "button" }, t("Actualizar", "Refresh"));
      refresh.onclick = () => void app.busy(refresh, poll, box);
      const memoD = (trade.address_provider_memo ?? "").trim();
      box.replaceChildren(
        ...([
          h("h3", {}, `${rec.amount_from} ${rec.from} → ${rec.to}`),
          steps,
          h("p", { class: "notice " + (trade.status === "finished" ? "ok" : isFinal(trade.status) ? "danger" : "") }, statusText(trade.status, rec)),
          count,
          err ? app.error(err) : null,
          rec.deposit_tx ? h("p", {}, t("Tu depósito: ", "Your deposit: "), h("a", { href: explorer, target: "_blank", rel: "noopener noreferrer" }, rec.deposit_tx.slice(0, 12) + "…")) : null,
          waiting && !rec.deposit_tx
            ? h(
                "div",
                {},
                h("p", {}, h("strong", {}, t(`Envía exactamente ${trade.amount_from} ${rec.from} a:`, `Send exactly ${trade.amount_from} ${rec.from} to:`))),
                h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, trade.address_provider), copyButton(app, trade.address_provider)),
                memoD && memoD !== "0" ? h("p", { class: "notice warn" }, t(`Con este memo o tag (obligatorio): ${memoD}`, `With this memo or tag (required): ${memoD}`)) : null,
                h("div", { class: "p2p-wallet-qr" }, qrSvg(trade.address_provider, t("Código QR de la dirección de depósito", "QR code of the deposit address"))),
                rec.pay ? h("p", {}, retry) : null,
                retryMsg,
              )
            : null,
          kv([
            [t("Recibes (aprox.)", "You get (approx.)"), `${trade.amount_to || rec.amount_to} ${rec.to}`],
            [t("Exchange", "Exchange"), trade.provider || rec.provider],
            [t("ID en Trocador", "Trocador ID"), h("code", {}, rec.id)],
            ...(trade.id_provider ? ([[t("ID en el exchange", "Exchange ID"), h("code", {}, trade.id_provider)]] as [string, Child][]) : []),
            ...(trade.hashout ? ([[t("Pago del exchange", "Exchange payout"), h("code", { class: "p2p-addr" }, trade.hashout)]] as [string, Child][]) : []),
          ]),
          h("p", { class: "row wrap" }, isFinal(trade.status) ? null : refresh),
        ].filter(Boolean) as Node[]),
      );
      tick();
    };
    const poll = async () => {
      if (!document.contains(box)) return;
      const trade = await call<TrocadorTrade>(`/v1/trocador/trades/${encodeURIComponent(rec.id)}`);
      draw(trade);
      if (!isFinal(trade.status) && location.hash.startsWith("#/cambiar")) app.timer = setTimeout(() => void poll().catch(() => {}), 15_000);
    };
    if (known) {
      draw(known, depositError);
      if (!isFinal(known.status)) app.timer = setTimeout(() => void poll().catch(() => {}), 15_000);
    } else {
      box.append(h("small", { class: "muted" }, "…"));
      await poll().catch((e) => box.replaceChildren(app.error(e)));
    }
    box.scrollIntoView({ block: "nearest" });
  }

  const history = h("div");
  function drawHistory() {
    const list = v.swaps ?? [];
    if (!list.length) return history.replaceChildren();
    history.replaceChildren(
      h(
        "section",
        { class: "card p2p-box" },
        h("h3", {}, t("Mis cambios", "My swaps")),
        h(
          "ul",
          { class: "p2p-quotes" },
          list.map((r) => {
            const open = r.official ? h("a", { class: "btn secondary small", href: `#/oficial/${r.id}` }, t("Ver", "View")) : h("button", { class: "btn secondary small", type: "button" }, t("Ver", "View"));
            if (!r.official) open.onclick = () => void app.busy(open as HTMLButtonElement, () => showTrade(r), history);
            return h("li", {}, h("span", {}, h("strong", {}, `${r.amount_from} ${r.from} → ${r.to}`), h("small", { class: "muted" }, ` · ${new Date(r.at * 1000).toLocaleDateString(app.lang)} · ${r.provider} · ${statusLabel(r.status)}`)), open);
          }),
        ),
      ),
    );
  }

  app.show(
    out,
    title,
    h("p", {}, h("small", { class: "muted" }, t("Cambia entre tus wallets sin custodia. El cambio lo ejecuta un exchange externo elegido a través de Trocador; MoneroP2P no toca los fondos.", "Swap between your non-custodial wallets. The swap is executed by an external exchange chosen through Trocador; MoneroP2P does not touch the funds."))),
    h(
      "div",
      { class: "quick-form p2p-swap" },
      h("label", { for: "p2p-s-amt" }, t("Envías", "You send")),
      pickFrom.wrap,
      h("div", { class: "quick-row" }, amt, max, unit),
      flip,
      h("label", {}, t("Recibes", "You get")),
      pickTo.wrap,
      destF,
      memoF,
      refundF,
      quoteBtn,
      hint,
      formMsg,
    ),
    stage,
    active,
    history,
  );
  sync();
  drawHistory();
  // Llegada desde la fila oficial del mercado: #/cambiar?coin=usdc|SOL&dir=buy (o sell).
  const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const want = sp.get("coin");
  if (want && want.includes("|")) {
    const [tk, nw] = want.toLowerCase().split("|");
    const side = sp.get("dir") === "sell" ? "to" : "from";
    if (nw === "arbitrum" && (tk === "usdc" || tk === "usdt" || tk === "eth")) pick(side, { internal: tk });
    else void loadCoins().then(
      () => {
        const c = coins?.find((x) => x.ticker.toLowerCase() === tk && x.network.toLowerCase() === nw);
        if (!c) return;
        pick(side, { other: c });
      },
      (e) => formMsg.replaceChildren(app.error(e)),
    );
  }
  // Si hay un cambio sin terminar, se retoma al entrar.
  const pending = (v.swaps ?? []).find((r) => !r.official && !isFinal(r.status) && nowS() - r.at < 86_400 && !(!r.deposit_tx && (r.status === "new" || r.status === "waiting") && r.expires_at && r.expires_at < nowS()));
  if (pending) void showTrade(pending).catch(() => {});
}
