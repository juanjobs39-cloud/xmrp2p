/**
 * Wallets de la cuenta (etapa A del plan de cuenta única): Monero y la cuenta tipo Ethereum en
 * Arbitrum, derivadas de la semilla maestra de la bóveda. Las llaves no salen del navegador.
 *
 * Esta primera entrega muestra direcciones, saldos de Arbitrum y permite exportar llaves. Enviar y
 * el saldo de Monero llegan en la siguiente. Por eso la vista solo existe con PUBLIC_P2P_WALLETS=on.
 */
import { createPublicClient, formatUnits, http, parseAbi } from "viem";
import { NETWORKS } from "../app/config";
import { xmrLib } from "../app/libs";
import { addSeed, openVault } from "./identity";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { h, icon, type Child } from "./ui";
import { evmAddress, evmKey, moneroSpendKey } from "./wallets";

export const WALLETS_ON = (import.meta.env.PUBLIC_P2P_WALLETS as string | undefined) === "on";

const ERC20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

function copyButton(app: P2PApp, text: string): HTMLButtonElement {
  const b = h("button", { class: "btn secondary small", type: "button" }, app.t("Copiar", "Copy"));
  b.onclick = () => void navigator.clipboard?.writeText(text).then(() => (b.textContent = app.t("¡Copiado!", "Copied!")));
  return b;
}

/** Tarjeta de una wallet: nombre, red, dirección con copiar y QR, y sus saldos. */
function walletCard(app: P2PApp, o: { name: string; network: string; address: string; balances: Child[]; note?: string }): HTMLElement {
  const qrBox = h("div", { class: "p2p-wallet-qr", hidden: true }, qrSvg(o.address, app.t(`Código QR de tu dirección de ${o.name}`, `QR code of your ${o.name} address`)));
  const qr = h("button", { class: "btn secondary small", type: "button" }, "QR");
  qr.onclick = () => (qrBox.hidden = !qrBox.hidden);
  return h(
    "section",
    { class: "card p2p-wallet" },
    h("header", { class: "p2p-wallet-head" }, h("h3", {}, o.name), h("span", { class: "badge muted" }, o.network)),
    h("div", { class: "p2p-wallet-bal" }, o.balances),
    h("p", { class: "p2p-sub" }, app.t("Tu dirección para recibir", "Your address to receive")),
    h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, o.address), copyButton(app, o.address), qr),
    qrBox,
    o.note ? h("p", {}, h("small", { class: "muted" }, o.note)) : null,
  );
}

const balance = (amount: string, symbol: string) => h("p", { class: "p2p-wallet-amt" }, h("strong", {}, amount), " ", h("span", {}, symbol));

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
            height = Math.max(0, (await (await xmrLib()).daemonHeight(app.node)) - 5);
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

  // ---------------------------------------------------------------- wallets
  const seed = v.seed;
  const net = NETWORKS[app.cfg.xmr_network === "mainnet" ? "arbitrum_one" : "arbitrum_sepolia"]!;
  const evm = evmAddress(seed);

  const eth = balance("…", "ETH");
  const usdt = balance("…", net.tokenSymbol);
  const evmCard = walletCard(app, {
    name: "Arbitrum",
    network: net.name,
    address: evm,
    balances: [usdt, eth],
    note: t("Es una cuenta tipo Ethereum estándar: la misma dirección sirve para USDT y ETH en Arbitrum. Envía solo por la red Arbitrum.", "It is a standard Ethereum-type account: the same address works for USDT and ETH on Arbitrum. Send only over the Arbitrum network."),
  });
  const xmrSlot = h("div", {}, h("div", { class: "p2p-skel-list" }, h("div", { class: "p2p-skel" })));

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
          secret(t("Semilla de la cuenta (12 palabras)", "Account seed (12 words)"), seed, t("Recupera todas tus wallets en MoneroP2P.", "Recovers all your wallets on MoneroP2P.")),
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
    h("p", { class: "notice warn" }, t("Primera versión: ya puedes recibir y ver tus saldos de Arbitrum. Enviar y el saldo de Monero llegan en la siguiente; mientras tanto, para mover fondos exporta la llave.", "First version: you can already receive and see your Arbitrum balances. Sending and the Monero balance arrive in the next one; meanwhile, export the key to move funds.")),
    h("div", { class: "p2p-wallets" }, xmrSlot, evmCard),
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

  // Saldos de Arbitrum: dos lecturas a un nodo público, sin enviar nada más que la dirección.
  const client = createPublicClient({ transport: http(net.rpc) });
  void Promise.all([client.getBalance({ address: evm }), client.readContract({ address: net.token, abi: ERC20, functionName: "balanceOf", args: [evm] })])
    .then(([wei, tok]) => {
      eth.replaceChildren(h("strong", {}, Number(formatUnits(wei, 18)).toFixed(6).replace(/\.?0+$/, "") || "0"), " ", h("span", {}, "ETH"));
      usdt.replaceChildren(h("strong", {}, Number(formatUnits(tok, 6)).toFixed(2)), " ", h("span", {}, net.tokenSymbol));
    })
    .catch(() => {
      eth.replaceChildren(h("small", { class: "muted" }, t("No se pudo consultar el saldo.", "Could not load the balance.")));
      usdt.replaceChildren();
    });

  // Monero: la dirección sale de la llave de gasto, sin conexión (carga el motor de Monero).
  try {
    const monero = await (await xmrLib()).walletKeys({ network: v.network, spendKey: moneroSpendKey(seed) });
    xmrSlot.replaceChildren(
      walletCard(app, {
        name: "Monero",
        network: v.network === "mainnet" ? "Mainnet" : "Stagenet",
        address: monero.address,
        balances: [h("p", {}, h("small", { class: "muted" }, t("El saldo aparecerá cuando la wallet pueda sincronizar (siguiente versión).", "The balance will appear once the wallet can sync (next version).")))],
      }),
    );
  } catch (e) {
    xmrSlot.replaceChildren(app.error(e));
  }
}
