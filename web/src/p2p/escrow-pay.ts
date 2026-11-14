/**
 * Depositar al escrow de una orden desde la wallet de Monero de la cuenta (etapa C): un botón en la
 * tarjeta de depósito que sincroniza la wallet, muestra monto y comisión de red y, tras confirmar,
 * firma y transmite. La dirección es la que calculó este navegador para el escrow.
 */
import { xmrLib } from "../app/libs";
import type { P2PApp } from "./p2p-app";
import { h } from "./ui";
import { kv, persistXmr, startXmr, WALLETS_ON, xmrError, xmrReady, XMR_EXPLORER } from "./wallet-view";
import { formatAmount, parseAmount } from "./wallets";

/** La orden se redibuja cada pocos segundos: el botón (con su estado) se crea una vez por orden y se reutiliza. */
const widgets = new Map<string, HTMLElement>();

export function accountDeposit(app: P2PApp, orderId: string, address: string, xmr: string): HTMLElement | null {
  const v = app.vault;
  if (!WALLETS_ON || !v?.seed) return null;
  const key = `${v.key}|${orderId}|${address}|${xmr}`;
  const old = widgets.get(key);
  if (old) return old;

  const t = app.t;
  const box = h("div", { class: "p2p-wallet-pay" });
  widgets.set(key, box);
  const explorer = (tx: string) => h("a", { href: (XMR_EXPLORER[v.network] ?? "") + tx, target: "_blank", rel: "noopener noreferrer" }, tx.slice(0, 12) + "…");
  const sent = (tx: string) =>
    box.replaceChildren(h("p", { class: "notice ok" }, t("Depósito enviado desde tu wallet: ", "Deposit sent from your wallet: "), explorer(tx), t(". El escrow lo confirma en unos 20 minutos (10 confirmaciones); no deposites otra vez.", ". The escrow confirms it in about 20 minutes (10 confirmations); do not deposit again.")));

  const done = v.escrows[orderId]?.depositTx;
  if (done) {
    sent(done);
    return box;
  }

  let amount: bigint;
  try {
    amount = parseAmount(xmr, 12);
  } catch {
    return null;
  }
  const start = h("button", { class: "btn primary small", type: "button" }, t("Depositar desde mi wallet de MoneroP2P", "Deposit from my MoneroP2P wallet"));
  const msg = h("div", { role: "status" });
  const initial = () => box.replaceChildren(start, msg);

  start.onclick = () =>
    void app.busy(
      start,
      async () => {
        const st = startXmr(app);
        await xmrReady(st, true, (pct) => msg.replaceChildren(h("small", { class: "muted" }, t(`Sincronizando tu wallet de Monero… ${Math.floor(pct * 100)} %`, `Syncing your Monero wallet… ${Math.floor(pct * 100)}%`))));
        msg.replaceChildren();
        const lib = await xmrLib();
        const info = await lib.userInfo();
        if (BigInt(info.unlocked) < amount && BigInt(info.balance) >= amount)
          throw new Error(
            t(
              `Tu wallet ya tiene ${formatAmount(BigInt(info.balance), 12, 6)} XMR, pero todavía se están confirmando (unos 20 minutos desde que llegaron). Vuelve a tocar el botón en unos minutos o deposita desde otra wallet.`,
              `Your wallet already has ${formatAmount(BigInt(info.balance), 12, 6)} XMR, but it is still confirming (about 20 minutes after it arrived). Tap the button again in a few minutes or deposit from another wallet.`,
            ),
          );
        if (BigInt(info.unlocked) < amount)
          throw new Error(
            t(
              `Tu wallet tiene ${formatAmount(BigInt(info.unlocked), 12, 6)} XMR disponibles y el depósito es de ${xmr} XMR. Recibe más en la pestaña Wallet o deposita desde otra wallet.`,
              `Your wallet has ${formatAmount(BigInt(info.unlocked), 12, 6)} XMR spendable and the deposit is ${xmr} XMR. Receive more in the Wallet tab or deposit from another wallet.`,
            ),
          );
        const p = await lib.userPrepare(address, String(amount)).catch((e) => Promise.reject(xmrError(app, e)));
        const go = h("button", { class: "btn small", type: "button" }, t("Confirmar depósito", "Confirm deposit"));
        const back = h("button", { class: "btn secondary small", type: "button", onclick: initial }, t("Cancelar", "Cancel"));
        const err = h("div");
        go.onclick = () =>
          void app.busy(
            go,
            async () => {
              back.disabled = true;
              // Por si se depositó desde otra pestaña mientras tanto.
              if (v.escrows[orderId]?.depositTx) return void sent(v.escrows[orderId]!.depositTx!);
              await lib.userRelay(p.metadata).catch((e) => {
                back.disabled = false;
                throw xmrError(app, e);
              });
              const e = v.escrows[orderId];
              if (e) e.depositTx = p.txid;
              await app.saveV();
              sent(p.txid);
              void persistXmr(v.network).catch(() => {});
            },
            err,
          );
        box.replaceChildren(
          kv([
            [t("Al escrow", "To the escrow"), h("strong", {}, `${formatAmount(BigInt(p.amount), 12)} XMR`)],
            [t("Comisión de red", "Network fee"), `${formatAmount(BigInt(p.fee), 12)} XMR`],
            [t("Total que sale", "Total leaving"), `${formatAmount(BigInt(p.amount) + BigInt(p.fee), 12)} XMR`],
          ]),
          h("p", { class: "row wrap" }, go, back),
          err,
        );
      },
      msg,
    );
  initial();
  return box;
}
