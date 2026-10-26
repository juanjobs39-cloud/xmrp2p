/**
 * Diagnóstico de un caso: reconstruye la llave completa desde el archivo de recuperación y lista lo
 * que la wallet compartida ve en stagenet (entradas, salidas gastadas y saldo).
 *   node --experimental-strip-types diagnose.ts <archivo-de-recuperación>
 */
import { readFileSync } from "node:fs";
import { decryptRecovery, type RecoveryFile } from "../web/src/app/recovery.ts";
import { Chain, cfg, core, loadKey } from "./lib.ts";

const file = process.argv[2]!;
const st = await decryptRecovery<any>(JSON.parse(readFileSync(file, "utf8")) as RecoveryFile, "contraseña de prueba e2e");
const chain = new Chain(loadKey("taker"));
const view = await chain.view(st.escrow, Math.max(0, st.block ?? 0));
console.log("escrow", st.escrow, "estado", view.stage, "revelado", view.revealed?.kind);
if (!view.revealed) process.exit(0);
const w = core.recover(st.keys.spend_private, st.reply.maker_message, view.revealed.secret);
const m = (await import("monero-ts")).default;
const wallet = await m.createWalletFull({
  networkType: m.MoneroNetworkType.STAGENET, server: { uri: cfg.node }, password: "d", proxyToWorker: false,
  primaryAddress: w.address, privateViewKey: w.private_view_key, privateSpendKey: w.private_spend_key, restoreHeight: st.restoreHeight - 50,
});
await wallet.sync();
console.log("altura wallet", await wallet.getHeight(), "restore", st.restoreHeight, "bloqueo", st.lock?.txid?.slice(0, 16));
for (const tx of await wallet.getTxs()) {
  console.log("tx", tx.getHash().slice(0, 16), "entrante", String(tx.getIncomingAmount() ?? 0n), "saliente", String(tx.getOutgoingAmount() ?? 0n), "conf", tx.getNumConfirmations(), "confirmada", tx.getIsConfirmed());
}
for (const o of await wallet.getOutputs({ isSpent: undefined } as any)) {
  console.log("salida", String(o.getAmount()), "gastada", o.getIsSpent(), "desbloqueada", o.getIsUnlocked?.());
}
console.log("saldo", String(await wallet.getBalance()), "desbloqueado", String(await wallet.getUnlockedBalance()));
await wallet.close();
process.exit(0);
