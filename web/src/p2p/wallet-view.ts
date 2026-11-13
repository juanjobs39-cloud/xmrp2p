/**
 * Wallets de la cuenta (etapa A del plan de cuenta única): Monero y la cuenta tipo Ethereum en
 * Arbitrum, derivadas de la semilla maestra de la bóveda. Las llaves no salen del navegador.
 *
 * Recibir, ver saldos e historial, enviar con pantalla de confirmación y exportar llaves.
 * Solo existe con PUBLIC_P2P_WALLETS=on.
 */
import { NETWORKS, type EvmNetwork } from "../app/config";
import { xmrLib, type UserTx, type UserWalletInfo } from "../app/libs";
import { addSeed, loadXmrCache, openVault, saveXmrCache } from "./identity";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { h, icon, type Child } from "./ui";
import { balances, prepareEvm, publicClient, sendEvm, TOKEN_DECIMALS, WalletError, type Asset, type PreparedEvm } from "./wallet-evm";
import { evmAddress, evmKey, formatAmount, moneroSpendKey, parseAmount } from "./wallets";

export const WALLETS_ON = (import.meta.env.PUBLIC_P2P_WALLETS as string | undefined) === "on";

/** Altura aproximada de cada red cuando salieron las wallets: una cuenta restaurada con sus 12 palabras escanea desde aquí. */
export const XMR_SINCE: Record<string, number> = { mainnet: 3_805_000, stagenet: 2_249_000 };

const XMR_DECIMALS = 12;
const XMR_EXPLORER: Record<string, string> = { mainnet: "https://xmrchain.net/tx/", stagenet: "https://stagenet.xmrchain.net/tx/" };

// ------------------------------------------------------------------ estado de la wallet de Monero (una por pestaña)

interface XmrState {
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
function startXmr(app: P2PApp): XmrState {
  const v = app.vault!;
  if (X && X.owner === v.key) return X;
  const st: XmrState = { owner: v.key, txs: [], pct: 0, synced: false };
  X = st;
  const net = v.network;
  void (async () => {
    try {
      const xmr = await xmrLib();
      const keys = await xmr.walletKeys({ network: net, spendKey: moneroSpendKey(v.seed!) });
      st.address = keys.address;
      st.onUpdate?.();

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
      st.onUpdate?.();

      const refresh = async () => {
        if (X !== st) return;
        st.info = await xmr.userInfo();
        st.txs = await xmr.userTxs();
        st.onUpdate?.();
      };
      await xmr.userSync(
        (pct) => {
          st.pct = pct;
          st.onUpdate?.();
        },
        () => void refresh().catch(() => {}),
      );
      st.synced = true;
      await refresh();
      await saveXmrCache(net, { address: keys.address, ...(await xmr.userData()) });
    } catch (e) {
      st.error = e instanceof Error ? e.message : String(e);
      st.onUpdate?.();
    }
  })();
  return st;
}

/** Guarda el caché tras un envío, para que al volver a entrar no se escanee de nuevo. */
async function persistXmr(net: string): Promise<void> {
  const xmr = await xmrLib();
  if (X?.address && xmr.userIsOpen()) await saveXmrCache(net, { address: X.address, ...(await xmr.userData()) });
}

// ------------------------------------------------------------------ piezas de interfaz

function copyButton(app: P2PApp, text: string): HTMLButtonElement {
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

const kv = (rows: [string, Child][]) => h("dl", { class: "p2p-kv" }, rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));

/** Texto para los errores con código de la cuenta de Arbitrum. */
function evmError(app: P2PApp, e: unknown): Error {
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
function xmrError(app: P2PApp, e: unknown): Error {
  const m = e instanceof Error ? e.message : String(e);
  if (/not enough|unlocked/i.test(m)) return new Error(app.t("No tienes suficiente XMR disponible. Los fondos recién recibidos tardan unos 20 minutos (10 confirmaciones) en poder gastarse.", "You do not have enough spendable XMR. Newly received funds take about 20 minutes (10 confirmations) to become spendable."));
  return e instanceof Error ? e : new Error(m);
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
    const to = h("input", { id: "p2p-e-to", type: "text", autocomplete: "off", spellcheck: false, placeholder: "0x…" });
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
      app.field(t("Dirección de destino (red Arbitrum)", "Destination address (Arbitrum network)"), to),
      app.field(t("Monto", "Amount"), h("div", { class: "p2p-suffix" }, amt, max)),
      h("p", {}, review),
      formMsg,
    );
    const symbol = (a: Asset) => (a === "eth" ? "ETH" : net.tokenSymbol);
    const dec = (a: Asset) => (a === "eth" ? 18 : TOKEN_DECIMALS);

    const confirm = (p: PreparedEvm) => {
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
            void pub.waitForTransactionReceipt({ hash, timeout: 60_000 }).then(loadEvm, loadEvm);
          },
          msg,
        );
      box.replaceChildren(
        h("h4", {}, t("Revisa antes de enviar", "Review before sending")),
        kv([
          [t("Destino", "To"), h("code", { class: "p2p-addr" }, p.to)],
          [t("Red", "Network"), net.name],
          [t("Recibe", "Receives"), h("strong", {}, `${formatAmount(p.amount, dec(p.asset))} ${symbol(p.asset)}`)],
          [t("Comisión de red (máx.)", "Network fee (max)"), `${formatAmount(p.fee, 18, 8)} ETH`],
        ]),
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
          confirm(await prepareEvm(pub, net, evm, a, to.value.trim(), amount).catch((e) => Promise.reject(evmError(app, e))));
        },
        formMsg,
      );
    box.append(form);
    return box;
  })();

  const evmCard = h(
    "section",
    { class: "card p2p-wallet" },
    h("header", { class: "p2p-wallet-head" }, h("h3", {}, "Arbitrum"), h("span", { class: "badge muted" }, net.name)),
    evmBal,
    ...receiveBox(app, "Arbitrum", evm),
    h("p", {}, h("small", { class: "muted" }, t("Cuenta tipo Ethereum estándar: la misma dirección sirve para USDT y ETH. Envía y recibe solo por la red Arbitrum.", "Standard Ethereum-type account: the same address works for USDT and ETH. Send and receive only over the Arbitrum network."))),
    h("details", { class: "p2p-more" }, h("summary", {}, t("Enviar", "Send")), evmSend),
  );
  void loadEvm();

  // ---------------------------------------------------------------- Monero
  const st = startXmr(app);
  const xmrBal = h("div", { class: "p2p-wallet-bal" });
  const xmrRecv = h("div");
  const xmrTxs = h("div");
  const xmrSendBox = h("div");

  const drawXmr = () => {
    if (!document.contains(xmrBal)) return void (st.onUpdate = undefined);
    if (st.error) return xmrBal.replaceChildren(app.error(new Error(st.error)));
    if (st.address && !xmrRecv.childElementCount) xmrRecv.replaceChildren(...(receiveBox(app, "Monero", st.address).filter(Boolean) as Node[]));
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
    const to = h("input", { id: "p2p-x-to", type: "text", autocomplete: "off", spellcheck: false, placeholder: real ? "4… / 8…" : "5… / 7…" });
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
    const form = h("div", { class: "p2p-form" }, app.field(t("Dirección de Monero de destino", "Destination Monero address"), to), app.field(t("Monto en XMR", "Amount in XMR"), h("div", { class: "p2p-suffix" }, amt, max)), h("p", {}, review), msg);

    review.onclick = () =>
      void app.busy(
        review,
        async () => {
          if (!st.synced) throw new Error(t("Espera a que la wallet termine de sincronizar.", "Wait for the wallet to finish syncing."));
          const xmr = await xmrLib();
          const address = to.value.trim();
          if (!(await xmr.validAddress(address, v.network))) throw new Error(t("Esa no es una dirección válida de Monero para esta red.", "That is not a valid Monero address for this network."));
          let amount: string;
          try {
            amount = all ? "all" : String(parseAmount(amt.value, XMR_DECIMALS));
          } catch {
            throw new Error(t("Escribe un monto válido.", "Enter a valid amount."));
          }
          const p = await xmr.userPrepare(address, amount).catch((e) => Promise.reject(xmrError(app, e)));
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
                st.info = await xmr.userInfo();
                st.txs = await xmr.userTxs();
                drawXmr();
                await persistXmr(v.network);
              },
              err,
            );
          xmrSendBox.replaceChildren(
            h("h4", {}, t("Revisa antes de enviar", "Review before sending")),
            kv([
              [t("Destino", "To"), h("code", { class: "p2p-addr" }, p.address)],
              [t("Recibe", "Receives"), h("strong", {}, `${formatAmount(BigInt(p.amount), XMR_DECIMALS)} XMR`)],
              [t("Comisión de red", "Network fee"), `${formatAmount(BigInt(p.fee), XMR_DECIMALS)} XMR`],
              [t("Total que sale", "Total leaving"), `${formatAmount(BigInt(p.amount) + BigInt(p.fee), XMR_DECIMALS)} XMR`],
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

  const xmrCard = h(
    "section",
    { class: "card p2p-wallet" },
    h("header", { class: "p2p-wallet-head" }, h("h3", {}, "Monero"), h("span", { class: "badge muted" }, real ? "Mainnet" : "Stagenet")),
    xmrBal,
    xmrRecv,
    h("details", { class: "p2p-more" }, h("summary", {}, t("Enviar", "Send")), xmrSendBox),
    h("details", { class: "p2p-more" }, h("summary", {}, t("Movimientos", "Transactions")), xmrTxs),
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

  app.show(
    out,
    h("h2", {}, icon("lock"), " ", t("Tus wallets", "Your wallets")),
    h("p", {}, h("small", { class: "muted" }, t("Sin custodia: las llaves están cifradas en este navegador y en tu respaldo. MoneroP2P no puede ver ni mover estos fondos, ni recuperarlos si pierdes el respaldo y la contraseña.", "Non-custodial: the keys are encrypted in this browser and in your backup. MoneroP2P cannot see or move these funds, or recover them if you lose the backup and the password."))),
    h("div", { class: "p2p-wallets" }, xmrCard, evmCard),
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
  drawXmr();
}
