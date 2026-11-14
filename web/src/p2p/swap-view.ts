/**
 * Pestaña «Cambiar» (etapa C): intercambios entre las wallets de la cuenta a través de Trocador.
 *
 * Con cuenta, lo que se compra llega SIEMPRE a la wallet interna de esa moneda (el servidor lo exige
 * con una dirección firmada por la cuenta); solo si la moneda no tiene wallet interna se escribe una
 * dirección propia. Si se paga desde una wallet interna, la app firma y envía el depósito al exchange
 * después de que el usuario revisa y confirma. Solo existe con PUBLIC_P2P_WALLETS=on.
 */
import type { TrocadorCoin, TrocadorQuote, TrocadorRates, TrocadorTrade } from "../app/api";
import { API_URL, NETWORKS, type EvmNetwork } from "../app/config";
import { xmrLib } from "../app/libs";
import { signed } from "./api";
import { signAddress } from "./pay";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { autoDeposit, DECIMALS, isFinal, planSwap, upsertSwap, type Internal, type Leg, type SwapPlan, type SwapRecord } from "./swap";
import { h, type Child } from "./ui";
import { balances, prepareEvm, publicClient, sendEvm } from "./wallet-evm";
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

const NAME: Record<Internal, string> = { xmr: "XMR", usdt: "USDT", eth: "ETH" };
const clean = (s: string) => s.trim().replace(",", ".");

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
  const legSelect = (id: string, value: string) =>
    h(
      "select",
      { id },
      (["xmr", "usdt", "eth"] as Internal[]).map((c) => h("option", { value: c, selected: c === value }, c === "xmr" ? t("XMR · tu wallet", "XMR · your wallet") : t(`${NAME[c]} (Arbitrum) · tu wallet`, `${NAME[c]} (Arbitrum) · your wallet`))),
      h("option", { value: "other" }, t("Otra moneda…", "Another coin…")),
    );
  const from = legSelect("p2p-s-from", "usdt");
  const to = legSelect("p2p-s-to", "xmr");
  const otherIn = h("input", { id: "p2p-s-other", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none", placeholder: "BTC · Mainnet" });
  otherIn.setAttribute("list", "p2p-s-coins");
  const coinList = h("datalist", { id: "p2p-s-coins" });
  const otherF = app.field(t("Qué moneda", "Which coin"), otherIn, t("Escribe para buscar y elige de la lista (moneda · red).", "Type to search and pick from the list (coin · network)."));
  const amt = h("input", { id: "p2p-s-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "0.00" });
  const max = h("button", { class: "p2p-link", type: "button" }, t("Todo", "Max"));
  const dest = h("input", { id: "p2p-s-dest", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none" });
  const destF = app.field(t("Tu dirección para recibir", "Your address to receive"), dest, t("Esta moneda todavía no tiene wallet en la plataforma: se envía a la dirección que pongas. Revisa que sea de esa red.", "This coin has no wallet on the platform yet: it is sent to the address you enter. Check that it is on that network."));
  const memo = h("input", { id: "p2p-s-memo", type: "text", autocomplete: "off", spellcheck: false });
  const memoF = app.field(t("Memo o tag", "Memo or tag"), memo, t("Esta moneda lo necesita para acreditar el pago.", "This coin needs it to credit the payment."));
  const refund = h("input", { id: "p2p-s-refund", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none" });
  const refundF = app.field(t("Dirección de reembolso (opcional)", "Refund address (optional)"), refund, t("De la moneda que envías, por si el exchange tiene que devolverla.", "Of the coin you send, in case the exchange has to return it."));
  const quoteBtn = h("button", { class: "btn", type: "button" }, t("Ver cotizaciones", "Get quotes"));
  const formMsg = h("div");
  const stage = h("div");
  const hint = h("p", {}, h("small", { class: "muted" }));

  let coins: TrocadorCoin[] | null = null;
  const loadCoins = async () => {
    if (coins) return;
    coins = await call<TrocadorCoin[]>("/v1/trocador/coins?v=2");
    coinList.replaceChildren(...coins.map((c) => h("option", { value: `${c.ticker.toUpperCase()} · ${c.network}` }, c.name)));
  };
  const otherCoin = (): TrocadorCoin | null => {
    const m = /^\s*(\S+)\s*·\s*(.+?)\s*$/.exec(otherIn.value);
    return (m && coins?.find((c) => c.ticker.toLowerCase() === m[1]!.toLowerCase() && c.network.toLowerCase() === m[2]!.toLowerCase())) || null;
  };
  const leg = (sel: HTMLSelectElement): Leg | null => {
    if (sel.value !== "other") return { kind: "internal", coin: sel.value as Internal };
    const c = otherCoin();
    return c ? { kind: "other", ticker: c.ticker, network: c.network, memo: c.memo } : null;
  };
  const currentPlan = (): SwapPlan => {
    const a = leg(from);
    const b = leg(to);
    if (!a || !b) throw new Error(t("Elige la otra moneda de la lista (moneda · red).", "Pick the other coin from the list (coin · network)."));
    const p = planSwap(a, b);
    if (p === "same") throw new Error(t("Elige dos monedas distintas.", "Pick two different coins."));
    if (p === "need_xmr") throw new Error(t("Por ahora uno de los dos lados debe ser Monero (XMR).", "For now one of the two sides must be Monero (XMR)."));
    return p;
  };
  const labels = (p: SwapPlan) => {
    const other = p.network === "Arbitrum" && (p.ticker === "usdt" || p.ticker === "eth") ? `${p.ticker.toUpperCase()} (Arbitrum)` : `${p.ticker.toUpperCase()} (${p.network})`;
    return p.side === "buy" ? { from: other, to: "XMR" } : { from: "XMR", to: other };
  };

  const sync = (changed?: HTMLSelectElement) => {
    // Uno de los dos lados es siempre Monero: al mover uno, el otro se acomoda.
    if (changed) {
      const other = changed === from ? to : from;
      if (changed.value !== "xmr") other.value = "xmr";
      else if (other.value === "xmr") other.value = "usdt";
    }
    const isOther = from.value === "other" || to.value === "other";
    otherF.hidden = !isOther;
    if (isOther) void loadCoins().catch((e) => formMsg.replaceChildren(app.error(e)));
    const c = otherCoin();
    destF.hidden = to.value !== "other";
    memoF.hidden = !(to.value === "other" && c?.memo);
    refundF.hidden = from.value !== "other";
    max.hidden = from.value === "other";
    hint.firstElementChild!.textContent =
      to.value === "other"
        ? ""
        : t(`Lo que compres llega a tu wallet de ${to.value === "xmr" ? "Monero" : "Arbitrum"} de la plataforma. Para sacarlo a otra wallet, envíalo después desde la pestaña Wallet.`, `What you buy arrives in your platform ${to.value === "xmr" ? "Monero" : "Arbitrum"} wallet. To move it to another wallet, send it afterwards from the Wallet tab.`);
    stage.replaceChildren();
  };
  from.onchange = () => sync(from);
  to.onchange = () => sync(to);
  otherIn.oninput = () => sync();
  amt.oninput = () => stage.replaceChildren();

  /** Monto máximo que se puede cambiar desde una wallet interna, dejando lo necesario para la comisión de red. */
  async function maxAmount(coin: Internal): Promise<string> {
    if (coin === "usdt") return formatAmount((await balances(pub, net, evm)).token, DECIMALS.usdt);
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
        amt.value = await maxAmount(from.value as Internal);
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
        if (!plan.receiveIn && !/^[A-Za-z0-9:_.-]{10,128}$/.test(address)) throw new Error(t("Escribe la dirección donde quieres recibir.", "Enter the address where you want to receive."));
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
      const pick = h("button", { class: "btn small " + (i ? "secondary" : ""), type: "button" }, t("Elegir", "Choose"));
      pick.onclick = () => void app.busy(pick, () => review(plan, amount, rates, q), stage);
      return h(
        "li",
        {},
        h("span", {}, h("strong", {}, `${q.amount_to} ${l.to}`), h("small", { class: "muted" }, ` · ${q.provider} · KYC ${q.kycrating} · ${q.fixed ? t("precio fijo", "fixed rate") : t("precio flotante", "floating rate")}${q.eta ? ` · ~${Math.round(q.eta)} min` : ""}`)),
        pick,
      );
    });
    stage.replaceChildren(
      h("h4", {}, t(`Cotizaciones para ${amount} ${l.from}`, `Quotes for ${amount} ${l.from}`)),
      h("ul", { class: "p2p-quotes" }, rows),
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
      const p = await prepareEvm(pub, net, evm, pay === "eth" ? "eth" : "token", evm, parseAmount(amount, DECIMALS[pay])).catch((e) => Promise.reject(evmError(app, e)));
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
      h(
        "p",
        { class: "notice warn" },
        t(
          "El cambio lo hace ese exchange, no MoneroP2P: mientras dura, lo que envías está en sus manos. Si el precio es flotante, el monto final puede variar. Un envío no se puede deshacer.",
          "The swap is done by that exchange, not MoneroP2P: while it lasts, what you send is in their hands. With a floating rate the final amount may vary. A transfer cannot be undone.",
        ),
      ),
      h("p", { class: "row wrap" }, go, back),
      msg,
    );
  }

  async function confirm(plan: SwapPlan, amount: string, rates: TrocadorRates, q: TrocadorQuote, receive: string) {
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
    const rec: SwapRecord = { id: trade.trade_id, at: Math.floor(Date.now() / 1000), from: l.from, to: l.to, amount_from: amount, amount_to: trade.amount_to || q.amount_to, provider: trade.provider || q.provider, status: trade.status, ...(pay ? { pay } : {}) };
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
      const p = await prepareEvm(pub, net, evm, d.coin === "eth" ? "eth" : "token", d.to, d.amount).catch((e) => Promise.reject(evmError(app, e)));
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
          h("p", { class: "notice " + (trade.status === "finished" ? "ok" : isFinal(trade.status) ? "danger" : "") }, statusText(trade.status, rec)),
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
    };
    const poll = async () => {
      if (!document.contains(box)) return;
      const trade = await call<TrocadorTrade>(`/v1/trocador/trades/${encodeURIComponent(rec.id)}`);
      draw(trade);
      if (!isFinal(trade.status) && location.hash.startsWith("#/cambiar")) app.timer = setTimeout(() => void poll().catch(() => {}), 20_000);
    };
    if (known) {
      draw(known, depositError);
      if (!isFinal(known.status)) app.timer = setTimeout(() => void poll().catch(() => {}), 20_000);
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
            const open = h("button", { class: "btn secondary small", type: "button" }, t("Ver", "View"));
            open.onclick = () => void app.busy(open, () => showTrade(r), history);
            return h("li", {}, h("span", {}, h("strong", {}, `${r.amount_from} ${r.from} → ${r.to}`), h("small", { class: "muted" }, ` · ${new Date(r.at * 1000).toLocaleDateString(app.lang)} · ${r.provider} · ${r.status ?? "?"}`)), open);
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
      "section",
      { class: "card p2p-box" },
      h("div", { class: "p2p-grid" }, app.field(t("Envías", "You send"), from), app.field(t("Recibes", "You get"), to)),
      otherF,
      coinList,
      app.field(t("Monto que envías", "Amount you send"), h("div", { class: "p2p-suffix" }, amt, max)),
      destF,
      memoF,
      refundF,
      hint,
      h("p", {}, quoteBtn),
      formMsg,
      stage,
    ),
    active,
    history,
  );
  sync();
  drawHistory();
  // Si hay un cambio sin terminar, se retoma al entrar.
  const pending = (v.swaps ?? []).find((r) => !isFinal(r.status) && Date.now() / 1000 - r.at < 86_400);
  if (pending) void showTrade(pending).catch(() => {});
}
