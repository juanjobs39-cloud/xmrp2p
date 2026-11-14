/**
 * Wallets de la cuenta (etapa A del plan de cuenta única): Monero y la cuenta tipo Ethereum en
 * Arbitrum, derivadas de la semilla maestra de la bóveda. Las llaves no salen del navegador.
 *
 * Recibir, ver saldos e historial, enviar con pantalla de confirmación y exportar llaves.
 * Solo existe con PUBLIC_P2P_WALLETS=on.
 */
import { NETWORKS, type EvmNetwork } from "../app/config";
import { xmrLib, type UserTx, type UserWalletInfo } from "../app/libs";
import { ApiError, get } from "./api";
import { chargeable, feePercentLabel, withdrawRule, type FeeRule } from "./fee";
import { addSeed, loadXmrCache, openVault, saveXmrCache } from "./identity";
import { checkContact, isNickInput, parseNick, parsePayQuery, payQuery, signAddress, verifyAddress, type AddressRecord, type ContactCheck, type PayAsset } from "./pay";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { h, icon, type Child } from "./ui";
import { balances, prepareEvm, publicClient, sendEvm, TOKEN_DECIMALS, WalletError, type Asset, type PreparedEvm } from "./wallet-evm";
import { evmAddress, evmKey, formatAmount, moneroSpendKey, parseAmount } from "./wallets";

export const WALLETS_ON = (import.meta.env.PUBLIC_P2P_WALLETS as string | undefined) === "on";

/** Altura aproximada de cada red cuando salieron las wallets: una cuenta restaurada con sus 12 palabras escanea desde aquí. */
export const XMR_SINCE: Record<string, number> = { mainnet: 3_805_000, stagenet: 2_249_000 };

const XMR_DECIMALS = 12;
export const XMR_EXPLORER: Record<string, string> = { mainnet: "https://xmrchain.net/tx/", stagenet: "https://stagenet.xmrchain.net/tx/" };

// ------------------------------------------------------------------ estado de la wallet de Monero (una por pestaña)

export interface XmrState {
  owner: string; // llave de la cuenta: si cambia de cuenta se vuelve a abrir
  address?: string;
  info?: UserWalletInfo;
  txs: UserTx[];
  pct: number;
  synced: boolean;
  error?: string;
  onUpdate?: () => void;
}
let X: XmrState | null = null;

const randomHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Abre y sincroniza la wallet de Monero de la cuenta (una sola vez por sesión). */
export function startXmr(app: P2PApp): XmrState {
  const v = app.vault!;
  if (X && X.owner === v.key) return X;
  const st: XmrState = { owner: v.key, txs: [], pct: 0, synced: false };
  X = st;
  const net = v.network;
  const ping = () => {
    st.onUpdate?.();
    app.drawStrip();
  };
  void (async () => {
    try {
      const xmr = await xmrLib();
      const keys = await xmr.walletKeys({ network: net, spendKey: moneroSpendKey(v.seed!) });
      st.address = keys.address;
      ping();

      let dirty = false;
      if (!v.xmrPass) {
        v.xmrPass = randomHex(24);
        dirty = true;
      }
      if (v.xmrHeight === undefined) {
        try {
          v.xmrHeight = Math.max(0, Number(await xmr.daemonHeight(app.node)) - 5);
        } catch {
          v.xmrHeight = XMR_SINCE[net] ?? 0;
        }
        dirty = true;
      }
      if (dirty) await app.saveV();

      const cache = await loadXmrCache(net);
      const mine = cache && cache.address === keys.address ? cache : undefined;
      st.info = await xmr.userOpen({ node: app.node, network: net, password: v.xmrPass, seed: keys.seed, restoreHeight: v.xmrHeight, keysData: mine?.keysData, cacheData: mine?.cacheData });
      ping();

      const refresh = async () => {
        if (X !== st) return;
        st.info = await xmr.userInfo();
        st.txs = await xmr.userTxs();
        ping();
      };
      await xmr.userSync(
        (pct) => {
          st.pct = pct;
          ping();
        },
        () => void refresh().catch(() => {}),
      );
      st.synced = true;
      await refresh();
      await saveXmrCache(net, { address: keys.address, ...(await xmr.userData()) });
    } catch (e) {
      st.error = e instanceof Error ? e.message : String(e);
      ping();
    }
  })();
  return st;
}

/** La wallet de Monero de esta cuenta si ya se abrió en esta pestaña (no la abre). */
export function xmrPeek(app: P2PApp): XmrState | null {
  return X && app.vault && X.owner === app.vault.key ? X : null;
}

/** Espera a que la wallet de Monero de la cuenta tenga dirección (y, si se pide, a que termine de sincronizar). */
export function xmrReady(st: XmrState, synced: boolean, onWait?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (st.error) return reject(new Error(st.error));
      if (st.address && (!synced || st.synced)) return resolve();
      onWait?.(st.pct);
      st.onUpdate = check;
    };
    check();
  });
}

/** Guarda el caché tras un envío, para que al volver a entrar no se escanee de nuevo. */
export async function persistXmr(net: string): Promise<void> {
  const xmr = await xmrLib();
  if (X?.address && xmr.userIsOpen()) await saveXmrCache(net, { address: X.address, ...(await xmr.userData()) });
}

// ------------------------------------------------------------------ piezas de interfaz

export function copyButton(app: P2PApp, text: string): HTMLButtonElement {
  const b = h("button", { class: "btn secondary small", type: "button" }, app.t("Copiar", "Copy"));
  b.onclick = () => void navigator.clipboard?.writeText(text).then(() => (b.textContent = app.t("¡Copiado!", "Copied!")));
  return b;
}

const amountLine = (amount: string, symbol: string, sub?: string) =>
  h("p", { class: "p2p-wallet-amt" }, h("strong", {}, amount), " ", h("span", {}, symbol), sub ? h("small", { class: "muted" }, ` · ${sub}`) : null);

function receiveBox(app: P2PApp, name: string, address: string): Child[] {
  const qrBox = h("div", { class: "p2p-wallet-qr", hidden: true }, qrSvg(address, app.t(`Código QR de tu dirección de ${name}`, `QR code of your ${name} address`)));
  const qr = h("button", { class: "btn secondary small", type: "button" }, "QR");
  qr.onclick = () => (qrBox.hidden = !qrBox.hidden);
  return [h("p", { class: "p2p-sub" }, app.t("Tu dirección para recibir", "Your address to receive")), h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, address), copyButton(app, address), qr), qrBox];
}

/** Pestañas dentro de una tarjeta (Recibir / Enviar / …): lo importante a la vista, sin plegar. */
function tabs(items: [key: string, label: string, panel: HTMLElement][], first: string): { el: HTMLElement; select: (key: string) => void } {
  const bar = h("div", { class: "p2p-seg small p2p-wtabs", role: "tablist" });
  const btns = items.map(([key, label]) => h("button", { class: "p2p-seg-btn", type: "button", role: "tab", onclick: () => select(key) }, label));
  const select = (key: string) =>
    items.forEach(([k, , panel], i) => {
      const on = k === key;
      panel.hidden = !on;
      btns[i]!.classList.toggle("on", on);
      btns[i]!.setAttribute("aria-selected", String(on));
    });
  bar.append(...btns);
  select(first);
  return { el: h("div", { class: "p2p-wtab-box" }, bar, ...items.map(([, , panel]) => panel)), select };
}

/** Resumen para «Mi cuenta»: saldos de las wallets y las tres acciones de siempre. */
export function accountSummary(app: P2PApp): HTMLElement {
  const t = app.t;
  const v = app.vault!;
  if (!v.seed)
    return h(
      "div",
      { class: "p2p-sum" },
      h("p", {}, t("Tu cuenta todavía no tiene wallets. Créalas para recibir, enviar y pagar el escrow desde aquí.", "Your account has no wallets yet. Create them to receive, send and fund the escrow from here.")),
      h("p", {}, h("a", { class: "btn", href: "#/wallet" }, t("Crear mis wallets", "Create my wallets"))),
    );
  const real = v.network === "mainnet";
  const net: EvmNetwork = NETWORKS[real ? "arbitrum_one" : "arbitrum_sepolia"]!;
  const cell = (symbol: string) => {
    const amt = h("strong", {}, "…");
    return { amt, el: h("div", { class: "p2p-bal" }, h("small", {}, symbol), amt) };
  };
  const xmr = cell("XMR");
  const usdt = cell(net.tokenSymbol);
  const eth = cell("ETH");
  const note = h("small", { class: "muted" });
  const st = startXmr(app);
  const draw = () => {
    if (!document.contains(xmr.amt)) return void (st.onUpdate = undefined);
    if (st.error) return void (note.textContent = st.error);
    if (!st.info) return void (note.textContent = t("Abriendo tu wallet de Monero…", "Opening your Monero wallet…"));
    xmr.amt.textContent = formatAmount(BigInt(st.info.balance), XMR_DECIMALS, 6);
    note.textContent = st.synced ? "" : t(`Sincronizando Monero… ${Math.floor(st.pct * 100)} %`, `Syncing Monero… ${Math.floor(st.pct * 100)}%`);
  };
  st.onUpdate = draw;
  queueMicrotask(draw);
  void balances(publicClient(net), net, evmAddress(v.seed))
    .then((b) => {
      usdt.amt.textContent = formatAmount(b.token, TOKEN_DECIMALS, 2) || "0";
      eth.amt.textContent = formatAmount(b.eth, 18, 6);
    })
    .catch(() => (usdt.amt.textContent = eth.amt.textContent = "—"));
  const act = (href: string, ico: Parameters<typeof icon>[0], label: string, cls = "secondary") => h("a", { class: "btn " + cls, href }, h("span", { class: "p2p-ico", "aria-hidden": "true" }, icon(ico)), label);
  return h(
    "div",
    { class: "p2p-sum" },
    h("div", { class: "p2p-bals" }, xmr.el, usdt.el, eth.el),
    note,
    h("div", { class: "p2p-acts" }, act("#/wallet", "receive", t("Recibir", "Receive"), ""), act("#/wallet?ver=enviar", "send", t("Enviar", "Send")), act("#/cambiar", "swap", t("Cambiar", "Swap"))),
  );
}

export const kv = (rows: [string, Child][]) => h("dl", { class: "p2p-kv" }, rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));

/** Texto para los errores con código de la cuenta de Arbitrum. */
export function evmError(app: P2PApp, e: unknown): Error {
  if (!(e instanceof WalletError)) return e instanceof Error ? e : new Error(String(e));
  const msg = {
    insufficient: app.t("No tienes saldo suficiente para ese envío y su comisión de red.", "You do not have enough balance for that transfer and its network fee."),
    need_gas: app.t("Necesitas un poco de ETH en Arbitrum para pagar la comisión de red.", "You need a little ETH on Arbitrum to pay the network fee."),
    bad_address: app.t("Esa no es una dirección válida de Arbitrum (empieza con 0x y tiene 42 caracteres).", "That is not a valid Arbitrum address (it starts with 0x and has 42 characters)."),
    bad_amount: app.t("Escribe un monto mayor que cero.", "Enter an amount greater than zero."),
  }[e.code];
  return new Error(msg);
}

/** Mensajes de monero-ts más comunes, en palabras del usuario. */
export function xmrError(app: P2PApp, e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e);
  if (/not enough|unlocked/i.test(m)) return new Error(app.t("No tienes suficiente XMR disponible. Los fondos recién recibidos tardan unos 20 minutos (10 confirmaciones) en poder gastarse.", "You do not have enough spendable XMR. Newly received funds take about 20 minutes (10 confirmations) to become spendable."));
  return e instanceof Error ? e : new Error(m);
}

// ------------------------------------------------------------------ enviar por apodo

interface PayInfo {
  user: { id: string; nickname: string };
  network: string;
  addresses: AddressRecord[];
}

/** Destino de un envío: una dirección escrita a mano, o la de un usuario resuelta y verificada. */
interface Dest {
  address: string;
  nick?: string;
  id?: string;
  status?: ContactCheck;
}

const ASSET_NAME: Record<PayAsset, string> = { xmr: "Monero", evm: "Arbitrum (USDT / ETH)" };

/**
 * Convierte lo que el usuario escribió en «destino» en una dirección. Si es @apodo, pide sus
 * direcciones, VERIFICA la firma contra la llave de esa cuenta y compara con el contacto guardado.
 */
async function resolveDest(app: P2PApp, text: string, asset: PayAsset): Promise<Dest> {
  const t = app.t;
  const v = app.vault!;
  if (!isNickInput(text)) return { address: text.trim() };
  const nick = parseNick(text);
  if (!nick) throw new Error(t("Ese apodo no es válido (3–20 letras, números, punto o guion).", "That nickname is not valid (3–20 letters, numbers, dot or dash)."));
  if (app.me && nick.toLowerCase() === app.me.nickname.toLowerCase()) throw new Error(t("Ese es tu propio apodo.", "That is your own nickname."));
  let r: PayInfo;
  try {
    r = await get<PayInfo>(`/v1/p2p/pay/${encodeURIComponent(nick)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new Error(t(`No hay ningún usuario con el apodo @${nick}.`, `There is no user with the nickname @${nick}.`));
    throw e;
  }
  if (r.network !== v.network) throw new Error(t("Ese usuario está en otra red.", "That user is on another network."));
  const rec = r.addresses.find((a) => a.asset === asset);
  if (!rec) throw new Error(t(`@${r.user.nickname} no recibe ${ASSET_NAME[asset]} por apodo. Pídele su dirección.`, `@${r.user.nickname} does not receive ${ASSET_NAME[asset]} by nickname. Ask them for their address.`));
  if (!(await verifyAddress(r.user.id, v.network, rec)))
    throw new Error(t(`La dirección de @${r.user.nickname} no pasó la verificación de firma. No envíes nada y avísanos.`, `The address of @${r.user.nickname} failed signature verification. Do not send anything and let us know.`));
  const status = checkContact(v.contacts, r.user.nickname, r.user.id);
  if (status === "changed")
    throw new Error(
      t(
        `Cuidado: el apodo @${r.user.nickname} ahora pertenece a OTRA cuenta, distinta de la que tienes guardada. Puede ser que esa persona cambió de apodo y alguien más lo tomó. Confirma con ella por otro medio; si de verdad es la misma persona, borra el contacto en «Contactos» y vuelve a intentar.`,
        `Careful: the nickname @${r.user.nickname} now belongs to a DIFFERENT account from the one you have saved. That person may have changed nickname and someone else took it. Confirm with them through another channel; if it really is the same person, delete the contact under “Contacts” and try again.`,
      ),
    );
  return { address: rec.address, nick: r.user.nickname, id: r.user.id, status };
}

/** Renglón «Para» de la pantalla de revisión cuando el destino es un usuario. */
function destRows(app: P2PApp, d: Dest): [string, Child][] {
  if (!d.nick) return [];
  const note =
    d.status === "known"
      ? h("small", { class: "p2p-on" }, " · " + app.t("contacto verificado", "verified contact"))
      : h("small", { class: "p2p-warn" }, " · " + app.t("primera vez: comprueba que sea la persona correcta", "first time: check it is the right person"));
  return [[app.t("Para", "To"), h("span", {}, h("strong", {}, "@" + d.nick), note)]];
}

/** Tras el primer envío a un usuario, se guarda la llave de su cuenta para reconocerlo después. */
async function rememberContact(app: P2PApp, d: Dest): Promise<void> {
  const v = app.vault!;
  if (!d.nick || !d.id || d.status !== "new") return;
  v.contacts = { ...(v.contacts ?? {}), [d.nick.toLowerCase()]: { id: d.id.toLowerCase(), nickname: d.nick, since: Math.floor(Date.now() / 1000) } };
  await app.saveV();
}

/** Tarjeta «Recibir por apodo»: publica (o retira) las direcciones firmadas de la cuenta. */
function nickCard(app: P2PApp, evm: string, st: XmrState): { el: HTMLElement; refresh: () => void } {
  const t = app.t;
  const v = app.vault!;
  const body = h("div");
  const card = h("section", { class: "card p2p-box" }, h("h3", {}, t("Recibir por apodo", "Receive by nickname")), body);
  if (!app.me) {
    body.append(h("p", { class: "notice warn" }, t("Primero elige un apodo en «Mi cuenta».", "First choose a nickname under “My account”.")));
    return { el: card, refresh: () => {} };
  }
  const nick = app.me.nickname;
  const draw = async () => {
    let published: AddressRecord[] = [];
    try {
      published = (await get<PayInfo>(`/v1/p2p/pay/${encodeURIComponent(nick)}`)).addresses;
    } catch (e) {
      return void body.replaceChildren(app.error(e));
    }
    const mine: Record<PayAsset, string | undefined> = { xmr: st.address, evm };
    const out = h("div");
    const row = (asset: PayAsset) => {
      const rec = published.find((a) => a.asset === asset);
      const current = mine[asset];
      const on = !!rec && rec.address === current;
      const btn = h("button", { class: "btn small " + (on ? "secondary" : ""), type: "button" }, on ? t("Dejar de recibir", "Stop receiving") : rec ? t("Actualizar dirección", "Update address") : t("Activar", "Turn on"));
      btn.onclick = () =>
        void app.busy(
          btn,
          async () => {
            if (on) await app.req("DELETE", `/v1/p2p/me/addresses/${asset}`, {});
            else {
              if (!current) throw new Error(t("Espera a que tu wallet de Monero termine de abrir.", "Wait for your Monero wallet to finish opening."));
              await app.req("PUT", "/v1/p2p/me/addresses", { addresses: [await signAddress(app.acct!, v.network, asset, current)] });
            }
            await draw();
          },
          out,
        );
      return h("div", { class: "p2p-nick-row" }, h("span", {}, h("strong", {}, ASSET_NAME[asset]), h("small", { class: on ? "p2p-on" : "muted" }, " · " + (on ? t("activo", "on") : rec ? t("publicada otra dirección", "another address is published") : t("apagado", "off")))), btn);
    };
    body.replaceChildren(
      h("p", {}, t(`Otros usuarios pueden enviarte escribiendo @${nick} en lugar de tu dirección. Sin comisión de la plataforma.`, `Other users can send to you by typing @${nick} instead of your address. No platform fee.`)),
      row("xmr"),
      row("evm"),
      out,
      h(
        "p",
        {},
        h(
          "small",
          { class: "muted" },
          t(
            "Privacidad: tu dirección queda ligada a tu apodo y cualquiera puede consultarla. En Arbitrum, quien conozca tu apodo puede ver en la cadena lo que recibes ahí; en Monero no. Va firmada con tu cuenta, así que nadie puede cambiarla por otra.",
            "Privacy: your address becomes linked to your nickname and anyone can look it up. On Arbitrum, whoever knows your nickname can see on-chain what you receive there; on Monero they cannot. It is signed with your account, so nobody can swap it for another.",
          ),
        ),
      ),
    );
  };
  body.append(h("small", { class: "muted" }, "…"));
  void draw();
  // La dirección de Monero tarda un momento en estar lista: la vista vuelve a dibujar esta tarjeta
  // cuando llega (sin temporizadores: el navegador los frena con la pestaña en segundo plano).
  return { el: card, refresh: () => void draw() };
}

/** Tarjeta «Cobrar»: arma un enlace (y QR) que abre la app de quien paga con el envío ya lleno. */
function requestCard(app: P2PApp, tokenSymbol: string): HTMLElement | null {
  const t = app.t;
  if (!app.me) return null;
  const coin = h("select", { id: "p2p-r-coin" }, h("option", { value: "usdt" }, tokenSymbol), h("option", { value: "xmr" }, "XMR"), h("option", { value: "eth" }, "ETH"));
  const amt = h("input", { id: "p2p-r-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: t("opcional", "optional") });
  const out = h("div");
  const make = h("button", { class: "btn secondary", type: "button" }, t("Crear enlace de cobro", "Create payment link"));
  make.onclick = () => {
    const amount = amt.value.trim().replace(",", ".");
    if (amount && !/^\d{1,12}(\.\d{1,12})?$/.test(amount)) return void out.replaceChildren(app.error(new Error(t("Escribe un monto válido o déjalo vacío.", "Enter a valid amount or leave it empty."))));
    const link = `${location.origin}${location.pathname}#/wallet${payQuery({ to: app.me!.nickname, coin: coin.value as "xmr" | "usdt" | "eth", ...(amount ? { amount } : {}) })}`;
    out.replaceChildren(h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, link), copyButton(app, link)), h("div", { class: "p2p-wallet-qr" }, qrSvg(link, t("Código QR del enlace de cobro", "QR code of the payment link"))));
  };
  return h(
    "section",
    { class: "card p2p-box" },
    h("h3", {}, t("Cobrar", "Request a payment")),
    h("p", {}, h("small", { class: "muted" }, t("Comparte el enlace o el QR. A quien lo abra con su cuenta le aparece el envío a tu apodo ya lleno; solo revisa y confirma.", "Share the link or the QR. Whoever opens it with their account sees the transfer to your nickname already filled in; they only review and confirm."))),
    h("div", { class: "p2p-grid" }, app.field(t("Moneda", "Coin"), coin), app.field(t("Monto", "Amount"), amt)),
    h("p", {}, make),
    out,
  );
}

/** Tarjeta «Contactos»: a quién ya se le envió, con opción de olvidarlo. */
function contactsCard(app: P2PApp): HTMLElement | null {
  const t = app.t;
  const v = app.vault!;
  const list = Object.entries(v.contacts ?? {});
  if (!list.length) return null;
  const ul = h(
    "ul",
    { class: "p2p-contacts" },
    list.map(([key, c]) => {
      const forget = h("button", { class: "p2p-link", type: "button" }, t("Olvidar", "Forget"));
      const li = h("li", {}, h("span", {}, h("strong", {}, "@" + c.nickname), h("small", { class: "muted" }, ` · ${c.id.slice(0, 8)}…${c.id.slice(-4)}`)), forget);
      forget.onclick = () => {
        const { [key]: _gone, ...rest } = v.contacts ?? {};
        v.contacts = rest;
        void app.saveV().then(() => li.remove());
      };
      return li;
    }),
  );
  return h(
    "section",
    { class: "card p2p-box" },
    h("h3", {}, t("Contactos", "Contacts")),
    h("p", {}, h("small", { class: "muted" }, t("Usuarios a los que ya enviaste. La app recuerda la llave de su cuenta y te avisa si el apodo pasa a ser de otra persona.", "Users you have already sent to. The app remembers their account key and warns you if the nickname becomes someone else's."))),
    ul,
  );
}

// ------------------------------------------------------------------ comisión de retiro

const feeLabel = (app: P2PApp, rule: FeeRule) => app.t(`Comisión de MoneroP2P (${feePercentLabel(rule)})`, `MoneroP2P fee (${feePercentLabel(rule)})`);

/** Aviso bajo el formulario de envío; nada en redes donde no se cobra. */
function feeNote(app: P2PApp, rule: FeeRule | null): HTMLElement | null {
  if (!rule) return null;
  return h(
    "p",
    {},
    h(
      "small",
      { class: "muted" },
      app.t(
        `Retirar a una dirección externa paga ${feePercentLabel(rule)} a MoneroP2P, visible antes de confirmar. Enviar a otro usuario por @apodo no paga comisión de la plataforma; los montos muy chicos tampoco.`,
        `Withdrawing to an external address pays ${feePercentLabel(rule)} to MoneroP2P, shown before you confirm. Sending to another user by @nickname pays no platform fee; neither do very small amounts.`,
      ),
    ),
  );
}

// ------------------------------------------------------------------ vista

export async function walletView(app: P2PApp): Promise<void> {
  const v = app.vault!;
  const out = h("div");
  const t = app.t;

  // ---------------------------------------------------------------- cuenta sin semilla todavía
  if (!v.seed) {
    const ok = h("input", { id: "p2p-w-ok", type: "checkbox" });
    const create = h("button", { class: "btn", type: "button" }, t("Crear mis wallets", "Create my wallets"));
    create.onclick = () =>
      void app.busy(
        create,
        async () => {
          if (!ok.checked) throw new Error(t("Marca la casilla para continuar.", "Tick the box to continue."));
          let height: number | undefined;
          try {
            height = Math.max(0, Number(await (await xmrLib()).daemonHeight(app.node)) - 5);
          } catch {
            // Sin nodo a la mano la wallet escaneará desde más atrás; no impide crearla.
          }
          addSeed(v, height);
          await app.saveV();
          await app.downloadBackup();
          await walletView(app);
        },
        out,
      );
    return app.show(
      out,
      h(
        "section",
        { class: "card p2p-box" },
        h("h2", {}, t("Tus wallets", "Your wallets")),
        h("p", {}, t("Tu cuenta puede tener wallets propias de Monero y de Arbitrum (USDT y ETH). Las llaves se crean en este navegador y se guardan cifradas con tu contraseña: MoneroP2P nunca las ve ni puede mover tus fondos.", "Your account can have its own Monero and Arbitrum (USDT and ETH) wallets. The keys are created in this browser and stored encrypted with your password: MoneroP2P never sees them and cannot move your funds.")),
        h("p", { class: "notice warn" }, t("Al crearlas se descarga un respaldo nuevo. Sin ese archivo y tu contraseña nadie puede recuperar los fondos, tampoco nosotros.", "Creating them downloads a new backup. Without that file and your password nobody can recover the funds, not even us.")),
        h("label", { class: "p2p-check" }, ok, " ", t("Entiendo que soy responsable de mi respaldo y mi contraseña.", "I understand I am responsible for my backup and my password.")),
        h("p", {}, create),
      ),
    );
  }

  const seed = v.seed;
  const real = v.network === "mainnet";
  const net: EvmNetwork = NETWORKS[real ? "arbitrum_one" : "arbitrum_sepolia"]!;

  // ---------------------------------------------------------------- Arbitrum
  const evm = evmAddress(seed);
  const pub = publicClient(net);
  const evmBal = h("div", { class: "p2p-wallet-bal" }, amountLine("…", net.tokenSymbol), amountLine("…", "ETH"));
  const loadEvm = () =>
    balances(pub, net, evm)
      .then((b) => evmBal.replaceChildren(amountLine(formatAmount(b.token, TOKEN_DECIMALS, 2) || "0", net.tokenSymbol), amountLine(formatAmount(b.eth, 18, 6), "ETH")))
      .catch(() => evmBal.replaceChildren(h("small", { class: "muted" }, t("No se pudo consultar el saldo.", "Could not load the balance."))));

  const evmSend = (() => {
    const box = h("div");
    const asset = h("select", { id: "p2p-e-asset" }, h("option", { value: "token" }, net.tokenSymbol), h("option", { value: "eth" }, "ETH"));
    const to = h("input", { id: "p2p-e-to", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none", placeholder: t("0x… o @apodo", "0x… or @nickname") });
    const amt = h("input", { id: "p2p-e-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "0.00" });
    let all = false;
    const max = h("button", { class: "p2p-link", type: "button" }, t("Todo", "Max"));
    max.onclick = () => {
      all = true;
      amt.value = t("todo", "all");
    };
    amt.oninput = () => (all = false);
    const review = h("button", { class: "btn", type: "button" }, t("Revisar envío", "Review transfer"));
    const formMsg = h("div");
    const form = h(
      "div",
      { class: "p2p-form" },
      app.field(t("Moneda", "Coin"), asset),
      app.field(t("Destino: dirección de Arbitrum o @apodo", "Destination: Arbitrum address or @nickname"), to),
      app.field(t("Monto", "Amount"), h("div", { class: "p2p-suffix" }, amt, max)),
      feeNote(app, withdrawRule("token", net.chainId)),
      h("p", {}, review),
      formMsg,
    );
    const symbol = (a: Asset) => (a === "eth" ? "ETH" : net.tokenSymbol);
    const evmRule = (a: Asset) => withdrawRule(a, net.chainId);
    const dec = (a: Asset) => (a === "eth" ? 18 : TOKEN_DECIMALS);

    const confirm = (p: PreparedEvm, d: Dest) => {
      const go = h("button", { class: "btn", type: "button" }, t("Confirmar y enviar", "Confirm and send"));
      const back = h("button", { class: "btn secondary", type: "button", onclick: () => box.replaceChildren(form) }, t("Cancelar", "Cancel"));
      const msg = h("div");
      go.onclick = () =>
        void app.busy(
          go,
          async () => {
            back.disabled = true;
            const hash = await sendEvm(net, evmKey(seed), p).catch((e) => {
              back.disabled = false;
              throw evmError(app, e);
            });
            box.replaceChildren(
              h("p", { class: "notice ok" }, t("Envío transmitido. La red lo confirma en unos segundos.", "Transfer broadcast. The network confirms it in a few seconds.")),
              h("p", {}, h("a", { href: `${net.explorer}/tx/${hash}`, target: "_blank", rel: "noopener noreferrer" }, t("Ver en el explorador", "View on the explorer"))),
              h("p", {}, h("button", { class: "btn secondary small", type: "button", onclick: () => box.replaceChildren(form) }, t("Hacer otro envío", "Send again"))),
            );
            to.value = amt.value = "";
            all = false;
            await rememberContact(app, d);
            void pub.waitForTransactionReceipt({ hash, timeout: 60_000 }).then(loadEvm, loadEvm);
          },
          msg,
        );
      box.replaceChildren(
        h("h4", {}, t("Revisa antes de enviar", "Review before sending")),
        kv([
          ...destRows(app, d),
          [d.nick ? t("Su dirección", "Their address") : t("Destino", "To"), h("code", { class: "p2p-addr" }, p.to)],
          [t("Red", "Network"), net.name],
          [t("Recibe", "Receives"), h("strong", {}, `${formatAmount(p.amount, dec(p.asset))} ${symbol(p.asset)}`)],
          ...(p.platformFee > 0n
            ? ([
                [feeLabel(app, evmRule(p.asset)!), `${formatAmount(p.platformFee, dec(p.asset))} ${symbol(p.asset)}`],
                [t("Total que sale", "Total leaving"), `${formatAmount(p.amount + p.platformFee, dec(p.asset))} ${symbol(p.asset)}`],
              ] as [string, Child][])
            : []),
          [t("Comisión de red (máx.)", "Network fee (max)"), `${formatAmount(p.fee, 18, 8)} ETH`],
        ]),
        p.platformFee > 0n ? h("p", {}, h("small", { class: "muted" }, t("La comisión de MoneroP2P sale en una segunda transferencia, justo después de tu envío.", "The MoneroP2P fee leaves in a second transfer, right after yours."))) : "",
        h("p", { class: "notice warn" }, t("Los envíos no se pueden deshacer. Comprueba que la dirección sea de la red Arbitrum: si la mandas a otra red, los fondos se pierden.", "Transfers cannot be undone. Check that the address is on the Arbitrum network: if you send to another network, the funds are lost.")),
        h("p", { class: "row wrap" }, go, back),
        msg,
      );
    };

    review.onclick = () =>
      void app.busy(
        review,
        async () => {
          const a = asset.value as Asset;
          let amount: bigint | "all";
          try {
            amount = all ? "all" : parseAmount(amt.value, dec(a));
          } catch {
            throw new Error(t("Escribe un monto válido.", "Enter a valid amount."));
          }
          const d = await resolveDest(app, to.value, "evm");
          confirm(await prepareEvm(pub, net, evm, a, d.address, amount, chargeable(evmRule(a), d, [evm])).catch((e) => Promise.reject(evmError(app, e))), d);
        },
        formMsg,
      );
    box.append(form);
    return box;
  })();

  const evmTabs = tabs(
    [
      [
        "recibir",
        t("Recibir", "Receive"),
        h(
          "div",
          {},
          ...receiveBox(app, "Arbitrum", evm),
          h("p", {}, h("small", { class: "muted" }, t("La misma dirección sirve para USDT y ETH. Envía y recibe solo por la red Arbitrum.", "The same address works for USDT and ETH. Send and receive only over the Arbitrum network."))),
        ),
      ],
      ["enviar", t("Enviar", "Send"), evmSend],
    ],
    "recibir",
  );
  const evmCard = h(
    "section",
    { class: "card p2p-wallet" },
    h("header", { class: "p2p-wallet-head" }, h("h3", {}, "Arbitrum"), h("span", { class: "badge muted" }, net.name)),
    evmBal,
    evmTabs.el,
  );
  void loadEvm();

  // ---------------------------------------------------------------- Monero
  const st = startXmr(app);
  const xmrBal = h("div", { class: "p2p-wallet-bal" });
  const xmrRecv = h("div");
  const xmrTxs = h("div");
  const xmrSendBox = h("div");

  let nick: ReturnType<typeof nickCard> | undefined;
  const drawXmr = () => {
    if (!document.contains(xmrBal)) return void (st.onUpdate = undefined);
    if (st.error) return xmrBal.replaceChildren(app.error(new Error(st.error)));
    if (st.address && !xmrRecv.querySelector("code")) {
      xmrRecv.replaceChildren(...(receiveBox(app, "Monero", st.address).filter(Boolean) as Node[]));
      nick?.refresh();
    }
    if (!xmrRecv.childElementCount) xmrRecv.replaceChildren(h("small", { class: "muted" }, t("Tu dirección aparece aquí en unos segundos…", "Your address shows here in a few seconds…")));
    if (!st.info) return xmrBal.replaceChildren(h("small", { class: "muted" }, t("Abriendo tu wallet de Monero…", "Opening your Monero wallet…")));
    const locked = BigInt(st.info.balance) - BigInt(st.info.unlocked);
    xmrBal.replaceChildren(
      amountLine(formatAmount(BigInt(st.info.balance), XMR_DECIMALS, 6), "XMR", locked > 0n ? t(`${formatAmount(BigInt(st.info.unlocked), XMR_DECIMALS, 6)} disponible`, `${formatAmount(BigInt(st.info.unlocked), XMR_DECIMALS, 6)} spendable`) : undefined),
      h("small", { class: st.synced ? "p2p-on" : "muted" }, st.synced ? t("Sincronizada", "Synced") : t(`Sincronizando con la red… ${Math.floor(st.pct * 100)} %`, `Syncing with the network… ${Math.floor(st.pct * 100)}%`)),
    );
    xmrTxs.replaceChildren(
      st.txs.length
        ? h(
            "ul",
            { class: "p2p-txs" },
            st.txs.slice(0, 20).map((x) =>
              h(
                "li",
                {},
                h("span", { class: x.incoming ? "p2p-in" : "p2p-out" }, `${x.incoming ? "+" : "−"}${formatAmount(BigInt(x.amount), XMR_DECIMALS, 6)} XMR`),
                h("small", { class: "muted" }, x.pending ? t("pendiente", "pending") : x.confirmations < 10 ? t(`${x.confirmations}/10 confirmaciones`, `${x.confirmations}/10 confirmations`) : new Date(x.timestamp * 1000).toLocaleDateString(app.lang)),
                h("a", { href: (XMR_EXPLORER[v.network] ?? "") + x.txid, target: "_blank", rel: "noopener noreferrer" }, x.txid.slice(0, 8) + "…"),
              ),
            ),
          )
        : st.synced
          ? h("small", { class: "muted" }, t("Aún no hay movimientos.", "No transactions yet."))
          : "",
    );
  };
  st.onUpdate = drawXmr;

  (() => {
    const to = h("input", { id: "p2p-x-to", type: "text", autocomplete: "off", spellcheck: false, autocapitalize: "none", placeholder: t(real ? "4… / 8… o @apodo" : "5… / 7… o @apodo", real ? "4… / 8… or @nickname" : "5… / 7… or @nickname") });
    const amt = h("input", { id: "p2p-x-amt", type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "0.00" });
    let all = false;
    const max = h("button", { class: "p2p-link", type: "button" }, t("Todo", "Max"));
    max.onclick = () => {
      all = true;
      amt.value = t("todo", "all");
    };
    amt.oninput = () => (all = false);
    const review = h("button", { class: "btn", type: "button" }, t("Revisar envío", "Review transfer"));
    const msg = h("div");
    const xmrRule = withdrawRule("xmr", v.network);
    const form = h("div", { class: "p2p-form" }, app.field(t("Destino: dirección de Monero o @apodo", "Destination: Monero address or @nickname"), to), app.field(t("Monto en XMR", "Amount in XMR"), h("div", { class: "p2p-suffix" }, amt, max)), feeNote(app, xmrRule), h("p", {}, review), msg);

    review.onclick = () =>
      void app.busy(
        review,
        async () => {
          if (!st.synced) throw new Error(t("Espera a que la wallet termine de sincronizar.", "Wait for the wallet to finish syncing."));
          const xmr = await xmrLib();
          const d = await resolveDest(app, to.value, "xmr");
          const address = d.address;
          if (!(await xmr.validAddress(address, v.network))) throw new Error(t("Esa no es una dirección válida de Monero para esta red.", "That is not a valid Monero address for this network."));
          let amount: string;
          try {
            amount = all ? "all" : String(parseAmount(amt.value, XMR_DECIMALS));
          } catch {
            throw new Error(t("Escribe un monto válido.", "Enter a valid amount."));
          }
          const rule = chargeable(xmrRule, d, st.address ? [st.address] : []);
          const p = await xmr.userPrepare(address, amount, rule ? { address: rule.address, bps: String(rule.bps), min: String(rule.min) } : undefined).catch((e) => Promise.reject(xmrError(app, e)));
          const pf = BigInt(p.platformFee || "0");
          const go = h("button", { class: "btn", type: "button" }, t("Confirmar y enviar", "Confirm and send"));
          const back = h("button", { class: "btn secondary", type: "button", onclick: () => xmrSendBox.replaceChildren(form) }, t("Cancelar", "Cancel"));
          const err = h("div");
          go.onclick = () =>
            void app.busy(
              go,
              async () => {
                back.disabled = true;
                await xmr.userRelay(p.metadata).catch((e) => {
                  back.disabled = false;
                  throw xmrError(app, e);
                });
                xmrSendBox.replaceChildren(
                  h("p", { class: "notice ok" }, t("Envío transmitido. Aparecerá en tu historial en unos segundos.", "Transfer broadcast. It will show in your history in a few seconds.")),
                  h("p", {}, h("a", { href: (XMR_EXPLORER[v.network] ?? "") + p.txid, target: "_blank", rel: "noopener noreferrer" }, t("Ver en el explorador", "View on the explorer"))),
                  h("p", {}, h("button", { class: "btn secondary small", type: "button", onclick: () => xmrSendBox.replaceChildren(form) }, t("Hacer otro envío", "Send again"))),
                );
                to.value = amt.value = "";
                all = false;
                await rememberContact(app, d);
                st.info = await xmr.userInfo();
                st.txs = await xmr.userTxs();
                drawXmr();
                app.drawStrip();
                await persistXmr(v.network);
              },
              err,
            );
          xmrSendBox.replaceChildren(
            h("h4", {}, t("Revisa antes de enviar", "Review before sending")),
            kv([
              ...destRows(app, d),
              [d.nick ? t("Su dirección", "Their address") : t("Destino", "To"), h("code", { class: "p2p-addr" }, p.address)],
              [t("Recibe", "Receives"), h("strong", {}, `${formatAmount(BigInt(p.amount), XMR_DECIMALS)} XMR`)],
              ...(pf > 0n && rule ? ([[feeLabel(app, rule), `${formatAmount(pf, XMR_DECIMALS)} XMR`]] as [string, Child][]) : []),
              [t("Comisión de red", "Network fee"), `${formatAmount(BigInt(p.fee), XMR_DECIMALS)} XMR`],
              [t("Total que sale", "Total leaving"), `${formatAmount(BigInt(p.amount) + BigInt(p.fee) + pf, XMR_DECIMALS)} XMR`],
            ]),
            h("p", { class: "notice warn" }, t("Los envíos de Monero no se pueden deshacer ni rastrear para recuperarlos. Revisa bien la dirección.", "Monero transfers cannot be undone or traced to recover them. Check the address carefully.")),
            h("p", { class: "row wrap" }, go, back),
            err,
          );
        },
        msg,
      );
    xmrSendBox.append(form);
  })();

  const xmrTabs = tabs(
    [
      ["recibir", t("Recibir", "Receive"), xmrRecv],
      ["enviar", t("Enviar", "Send"), xmrSendBox],
      ["movimientos", t("Movimientos", "History"), xmrTxs],
    ],
    "recibir",
  );
  const xmrCard = h(
    "section",
    { class: "card p2p-wallet" },
    h("header", { class: "p2p-wallet-head" }, h("h3", {}, "Monero"), h("span", { class: "badge muted" }, real ? "Mainnet" : "Stagenet")),
    xmrBal,
    xmrTabs.el,
  );

  // ---------------------------------------------------------------- exportar
  const pass = h("input", { id: "p2p-w-pass", type: "password", autocomplete: "current-password" });
  const secrets = h("div");
  const reveal = h("button", { class: "btn secondary", type: "button" }, t("Mostrar mis llaves", "Show my keys"));
  reveal.onclick = () =>
    void app.busy(
      reveal,
      async () => {
        // Volver a pedir la contraseña: quien encuentre la pestaña abierta no puede ver las llaves.
        await openVault(v.network, pass.value);
        pass.value = "";
        const monero = await (await xmrLib()).walletKeys({ network: v.network, spendKey: moneroSpendKey(seed) });
        const secret = (title: string, value: string, hint: string) =>
          h("div", { class: "p2p-secret" }, h("p", { class: "p2p-sub" }, title), h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, value), copyButton(app, value)), h("small", { class: "muted" }, hint));
        const hide = h("button", { class: "btn small", type: "button", onclick: () => secrets.replaceChildren() }, t("Ocultar", "Hide"));
        secrets.replaceChildren(
          h("p", { class: "notice danger" }, t("Quien vea estas palabras o llaves puede llevarse tus fondos. No las pegues en ningún sitio ni se las des a nadie: MoneroP2P nunca te las pedirá.", "Anyone who sees these words or keys can take your funds. Do not paste them anywhere or give them to anyone: MoneroP2P will never ask for them.")),
          secret(
            t("Semilla de la cuenta (12 palabras)", "Account seed (12 words)"),
            seed,
            v.keyFromSeed
              ? t("Recupera tu cuenta y todas tus wallets en MoneroP2P.", "Recovers your account and all your wallets on MoneroP2P.")
              : t("Recupera tus wallets. Tu cuenta es anterior a las wallets: para recuperar el apodo y las órdenes sigue haciendo falta el archivo de respaldo.", "Recovers your wallets. Your account predates the wallets: recovering the nickname and orders still needs the backup file."),
          ),
          secret(t("Llave privada de Arbitrum", "Arbitrum private key"), evmKey(seed), t("Se puede importar en MetaMask y otras wallets tipo Ethereum.", "Can be imported into MetaMask and other Ethereum-type wallets.")),
          secret(t("Semilla de Monero (25 palabras)", "Monero seed (25 words)"), monero.seed, t("Se puede restaurar en Cake Wallet, Feather o la wallet oficial.", "Can be restored in Cake Wallet, Feather or the official wallet.")),
          h("p", {}, hide),
        );
      },
      secrets,
    );

  // Lo que se usa de vez en cuando queda plegado.
  const more = h(
    "details",
    { class: "p2p-more p2p-adv" },
    h("summary", {}, t("Más opciones: recibir por apodo, cobrar con enlace, contactos y exportar llaves", "More options: receive by nickname, payment links, contacts and key export")),
    (nick = nickCard(app, evm, st)).el,
    requestCard(app, net.tokenSymbol),
    contactsCard(app),
    h(
      "section",
      { class: "card p2p-box" },
      h("h3", {}, t("Exportar semilla y llaves", "Export seed and keys")),
      h("p", {}, h("small", { class: "muted" }, t("Tus llaves son tuyas: puedes llevarlas a otra wallet cuando quieras.", "Your keys are yours: you can take them to another wallet whenever you want."))),
      app.field(t("Contraseña de tu cuenta", "Your account password"), pass),
      h("p", {}, reveal),
      secrets,
    ),
  );

  app.show(
    out,
    h(
      "div",
      { class: "row between wrap" },
      h("h2", {}, icon("wallet"), " ", t("Tu wallet", "Your wallet")),
      h("a", { class: "btn secondary small", href: "#/cambiar" }, icon("swap"), " ", t("Cambiar monedas", "Swap coins")),
    ),
    h("div", { class: "p2p-wallets" }, xmrCard, evmCard),
    h("p", {}, h("small", { class: "muted" }, t("Sin custodia: las llaves están cifradas en este navegador y en tu respaldo. MoneroP2P no puede ver ni mover estos fondos, ni recuperarlos si pierdes el respaldo y la contraseña.", "Non-custodial: the keys are encrypted in this browser and in your backup. MoneroP2P cannot see or move these funds, or recover them if you lose the backup and the password."))),
    more,
  );
  drawXmr();

  const ver = new URLSearchParams(location.hash.split("?")[1] ?? "").get("ver");
  if (ver === "enviar") xmrTabs.select("enviar");
  if (ver === "mas") {
    more.open = true;
    more.scrollIntoView({ block: "start" });
  }

  // Enlace de cobro (#/wallet?to=@apodo&coin=usdt&amount=50): deja el envío lleno; el usuario revisa y confirma.
  const ask = parsePayQuery(location.hash.split("?")[1] ?? "");
  if (ask) {
    const isXmr = ask.coin === "xmr";
    const card = isXmr ? xmrCard : evmCard;
    const set = (id: string, value: string) => ((document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = value);
    set(isXmr ? "p2p-x-to" : "p2p-e-to", "@" + ask.to);
    if (ask.amount) set(isXmr ? "p2p-x-amt" : "p2p-e-amt", ask.amount);
    if (!isXmr) set("p2p-e-asset", ask.coin === "eth" ? "eth" : "token");
    (isXmr ? xmrTabs : evmTabs).select("enviar");
    card.scrollIntoView({ block: "start" });
  }
}
