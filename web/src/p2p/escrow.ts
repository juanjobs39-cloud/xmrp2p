/**
 * Motor del escrow 2 de 3 en el navegador. En cada pasada mira el estado de la orden y los mensajes
 * del protocolo, y da el siguiente paso que le toca a esta parte:
 *   setup      → rondas del multisig (mismo código que el árbitro) y anuncio de la dirección
 *   releasing  → (vendedor) arma el pago al comprador + comisión y lo manda al árbitro para la 2.ª firma
 *   refunding  → (vendedor) arma el reembolso a su dirección
 *   resolving  → (ganador de la queja) arma el pago a su favor
 * Las llaves de la wallet del escrow se guardan en la bóveda del usuario (que es su respaldo).
 */
import { xmrLib } from "../app/libs";
import type { OrderView, P2PConfig, RoomMessage } from "./api";
import { b64, unb64, type EscrowState, type P2PVault } from "./identity";

const NETWORK_FEE_RESERVE = 100_000_000n; // 0.0001 XMR, igual que el backend y el árbitro

export const toPico = (xmr: string): bigint => {
  const [i, f = ""] = xmr.split(".");
  return BigInt(i!) * 1_000_000_000_000n + BigInt((f + "000000000000").slice(0, 12));
};

/** Último elemento que cumple (Array.findLast sin depender de ES2023). */
function lastIndex<T>(a: T[], f: (x: T) => boolean): number {
  for (let i = a.length - 1; i >= 0; i--) if (f(a[i]!)) return i;
  return -1;
}
const findLast = <T>(a: T[], f: (x: T) => boolean): T | undefined => a[lastIndex(a, f)];

type Proto = { step: string; round?: number; hex?: string; address?: string; reason?: string; n?: string; for?: string };

export interface EscrowCtx {
  vault: P2PVault;
  save(): Promise<void>;
  post(data: Proto): Promise<void>;
  cfg: P2PConfig;
  node: string;
}

export type EscrowNote =
  | { kind: "info"; text: string }
  | { kind: "deposit"; address: string }
  | { kind: "mismatch" }
  | { kind: "rejected"; reason: string }
  | null;

export class EscrowDriver {
  private openMode: "offline" | "node" | null = null;
  private busy = false;

  constructor(private id: string, private ctx: EscrowCtx) {}

  private get st(): EscrowState | undefined {
    return this.ctx.vault.escrows[this.id];
  }

  private async persist() {
    const xmr = await xmrLib();
    // Solo las llaves (unos KB, con el estado del multisig): la caché sincronizada pesa decenas de MB.
    const { keysData } = await xmr.escrowData(this.id);
    this.st!.keys = b64(keysData);
    await this.ctx.save();
  }

  private async ensureOpen(mode: "offline" | "node") {
    if (this.openMode === mode || (this.openMode === "node" && mode === "offline")) return;
    const xmr = await xmrLib();
    const st = this.st!;
    await xmr.escrowOpen({
      id: this.id,
      network: this.ctx.cfg.xmr_network,
      password: st.password,
      keysData: unb64(st.keys!),
      node: mode === "node" ? this.ctx.node : undefined,
      restoreHeight: st.restoreHeight,
    });
    this.openMode = mode;
  }

  async close() {
    if (this.openMode) await (await xmrLib()).escrowClose(this.id);
    this.openMode = null;
  }

  /** Una pasada. Devuelve un aviso para mostrar en la página (o null). */
  async step(o: OrderView, messages: RoomMessage[]): Promise<EscrowNote> {
    if (this.busy) return null;
    this.busy = true;
    try {
      return await this.run(o, messages.filter((m) => m.body.type === "protocol" && m.body.data) as (RoomMessage & { body: { data: Proto } })[]);
    } finally {
      this.busy = false;
    }
  }

  private async run(o: OrderView, msgs: (RoomMessage & { body: { data: Proto } })[]): Promise<EscrowNote> {
    const xmr = await xmrLib();
    const me = o.role;
    const other = me === "buyer" ? "seller" : "buyer";
    const last = (from: string, step: string, round?: number) =>
      findLast(msgs, (m) => m.from === from && m.body.data.step === step && (round === undefined || m.body.data.round === round))?.body.data;

    const rejected = last("arbiter", "rejected");

    if (o.status === "setup") {
      if (!this.st) {
        // Ronda 0: wallet nueva solo para esta orden.
        const password = crypto.randomUUID() + crypto.randomUUID();
        const hex = await xmr.escrowCreate({ id: this.id, network: this.ctx.cfg.xmr_network, password });
        this.openMode = "offline";
        const restoreHeight = await xmr.escrowSetHeight(this.id, this.ctx.node);
        this.ctx.vault.escrows[this.id] = { round: 0, done: false, password, restoreHeight };
        await this.persist();
        await this.ctx.post({ step: "kex", round: 0, hex });
        return { kind: "info", text: "kex" };
      }
      const st = this.st;
      if (!st.done) {
        const hexes = [last(other, "kex", st.round)?.hex, last("arbiter", "kex", st.round)?.hex];
        if (hexes.some((h) => !h)) return { kind: "info", text: "waiting" };
        await this.ensureOpen("offline");
        const r = await xmr.escrowAdvance(this.id, st.round + 1, hexes as string[], st.password);
        st.round += 1;
        if (r.done) {
          st.done = true;
          st.address = r.address;
        }
        await this.persist();
        if (r.hex) await this.ctx.post({ step: "kex", round: st.round, hex: r.hex });
        if (r.done) await this.ctx.post({ step: "address", address: r.address! });
      } else if (!last(me, "address")) {
        await this.ctx.post({ step: "address", address: st.address! });
      }
      return { kind: "info", text: "kex" };
    }

    // Desde aquí la dirección del escrow debe ser la que calculó ESTE navegador.
    const st = this.st;
    if (o.multisig_address && st?.address && o.multisig_address !== st.address) return { kind: "mismatch" };
    if (o.status === "awaiting_deposit" && me === "seller" && st?.address) return { kind: "deposit", address: st.address };

    const spender =
      o.status === "releasing" || o.status === "refunding" ? "seller" : o.status === "resolving" ? (o.dispute?.winner as "buyer" | "seller" | undefined) : null;
    if (!spender || spender !== me || !st?.done) return rejected ? { kind: "rejected", reason: String(rejected.reason) } : null;

    // Pago de salida: se arma con la ÚLTIMA exportación del árbitro (sus datos de firma solo valen para esa).
    const arbIdx = lastIndex(msgs, (m) => m.from === "arbiter" && m.body.data.step === "export");
    const arb = msgs[arbIdx];
    if (!arb?.body.data.n) return { kind: "info", text: "waiting_arbiter" };
    const posted = msgs.some((m) => m.from === me && m.body.data.step === "spend" && m.body.data.for === arb.body.data.n);
    if (st.spentFor === arb.body.data.n && posted) {
      const rej = lastIndex(msgs, (m) => m.from === "arbiter" && m.body.data.step === "rejected");
      return rej > arbIdx && rejected ? { kind: "rejected", reason: String(rejected.reason) } : { kind: "info", text: "waiting_signature" };
    }

    await this.ensureOpen("node");
    await xmr.escrowSync(this.id);
    await xmr.escrowImport(this.id, [arb.body.data.hex!]);
    const bal = await xmr.escrowSync(this.id);
    await this.ctx.post({ step: "export", hex: await xmr.escrowExport(this.id) });

    const toBuyer = o.status === "releasing" || (o.status === "resolving" && o.dispute?.winner === "buyer");
    let dests: { address: string; amount: string }[];
    if (toBuyer) {
      if (!this.ctx.cfg.fee_address) throw new Error("falta la dirección de cobro de la plataforma");
      dests = [{ address: o.buyer_address, amount: toPico(o.xmr).toString() }];
      if (toPico(o.fee_xmr) > 0n) dests.push({ address: this.ctx.cfg.fee_address, amount: toPico(o.fee_xmr).toString() });
    } else {
      const amount = BigInt(bal.unlocked || bal.balance) - NETWORK_FEE_RESERVE;
      if (amount <= 0n || !o.seller_refund_address) throw new Error("no hay saldo para reembolsar");
      dests = [{ address: o.seller_refund_address, amount: amount.toString() }];
    }
    const hex = await xmr.escrowSpend(this.id, dests);
    st.spentFor = arb.body.data.n;
    await this.ctx.save();
    await this.ctx.post({ step: "spend", hex, for: arb.body.data.n });
    return { kind: "info", text: "waiting_signature" };
  }
}
