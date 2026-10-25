/**
 * Fase 7: corre los casos E1–E10 de docs/PRUEBAS.md en paralelo contra Arbitrum Sepolia + Monero
 * stagenet, con el maker real y el backend desplegado. El taker usa la MISMA lógica de decisión que la app.
 *
 *   node --experimental-strip-types run.ts            # todos
 *   node --experimental-strip-types run.ts E1 E9      # algunos
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hex } from "viem";
import { decide, type XmrCheck } from "../web/src/app/decide.ts";
import { decryptRecovery, encryptRecovery } from "../web/src/app/recovery.ts";
import { api, cfg, Chain, core, daemonHeight, loadKey, ROOT, sleep, sweep, verifyLock, type Keys } from "./lib.ts";

interface Case {
  id: string;
  title: string;
  usdt: number; // 11–14 activan fallas de prueba en el maker (ver maker/xmrp2p_maker/engine.py)
  expect: "xmr" | "refund";
  closeAfterDepositMin?: number; // E2: "cierra la pestaña" tras depositar
  closeAfterReadyMin?: number; // E3: "cierra la pestaña" tras confirmar
  neverReady?: boolean; // E6: el taker no aparece; el maker cobra tras t0
  badNode?: boolean; // E7: nodo de Monero caído
  apiOutageMin?: number; // E8: conexión perdida con el backend
}

const CASES: Case[] = [
  { id: "E1", title: "Swap exitoso", usdt: 5, expect: "xmr" },
  { id: "E2", title: "Cierra la pestaña antes del bloqueo", usdt: 6, expect: "xmr", closeAfterDepositMin: 15 },
  { id: "E3", title: "Cierra la pestaña tras confirmar", usdt: 7, expect: "xmr", closeAfterReadyMin: 20 },
  { id: "E4", title: "Maker cae antes de bloquear", usdt: 13, expect: "refund" },
  { id: "E5", title: "Maker cae tras bloquear y cobra tarde", usdt: 14, expect: "xmr" },
  { id: "E6", title: "Plazos: el taker no confirma; el maker cobra tras t0", usdt: 8, expect: "xmr", neverReady: true },
  { id: "E7", title: "Nodo de Monero caído", usdt: 9, expect: "refund", badNode: true },
  { id: "E8", title: "Conexión perdida con el backend", usdt: 10, expect: "xmr", apiOutageMin: 10 },
  { id: "E9", title: "El maker envía menos XMR", usdt: 11, expect: "refund" },
  { id: "E10", title: "tx_key malformado", usdt: 12, expect: "refund" },
];

const POLICY = { minConfirmations: 10, refundMarginS: 10 * 60 };
const PASS = "contraseña de prueba e2e";
const outDir = join(ROOT, "e2e", "results", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(outDir, { recursive: true });

function log(c: Case, msg: string) {
  console.log(`${new Date().toISOString().slice(11, 19)} [${c.id}] ${msg}`);
}

async function runCase(c: Case, chain: Chain) {
  const ev: { t: string; e: string; d?: unknown }[] = [];
  const note = (e: string, d?: unknown) => {
    ev.push({ t: new Date().toISOString(), e, d });
    log(c, d ? `${e} ${JSON.stringify(d)}` : e);
  };
  const started = Date.now();
  try {
    // 1. Negociar (igual que app.ts: verificar todo lo que afirma el maker)
    const { offers } = await api.offers();
    const offer = offers[0];
    if (!offer) throw new Error("no hay ofertas");
    let keys: Keys | null = core.generate();
    const r = await api.createSwap(offer.id, String(c.usdt), keys.message);
    const reply = r.maker_reply;
    if (core.verify(reply.maker_message).toLowerCase() !== reply.claim_commitment.toLowerCase()) throw new Error("DLEQ/commitment del maker no coincide");
    if (reply.refund_commitment.toLowerCase() !== keys.message.contract_commitment!.toLowerCase()) throw new Error("refund_commitment ajeno");
    const shared = core.shared(keys.spend_private, reply.maker_message);
    if (shared.address !== reply.shared_address) throw new Error("dirección compartida distinta");
    note("negociado", { xmr: reply.xmr_atomic / 1e12, shared: shared.address.slice(0, 12) });

    const restoreHeight = (await daemonHeight()) - 10;
    const salt = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as Hex;
    // Archivo de recuperación (lo que la app obliga a descargar antes de depositar)
    let recovery = await encryptRecovery({ keys, reply, salt, restoreHeight }, PASS, { network: "arbitrum_sepolia" });

    // 2. Depósito con permit
    const dep = await chain.deposit({
      claimer: reply.claimer, claimCommitment: reply.claim_commitment, refundCommitment: keys.message.contract_commitment as Hex,
      d0: Math.max(45 * 60, reply.min_duration0 + 10 * 60), d1: Math.max(30 * 60, reply.min_duration1),
      amount: BigInt(reply.usdt_atomic), salt,
    });
    note("depositado", { escrow: dep.escrow, tx: dep.hash });

    let closedUntil = c.closeAfterDepositMin ? Date.now() + c.closeAfterDepositMin * 60_000 : 0;
    if (closedUntil) {
      keys = null; // "se cerró la pestaña": se pierde el estado en memoria
      note("pestaña cerrada");
    }
    let apiDownUntil = c.apiOutageMin ? Date.now() + c.apiOutageMin * 60_000 : 0;
    let lastSeq = 0;
    let lock: { txid: string; tx_key: string } | null = null;
    let check: XmrCheck | undefined;
    let readyAt = 0;

    for (;;) {
      await sleep(20_000);
      if (closedUntil && Date.now() < closedUntil) continue;
      if (!keys) {
        const st = await decryptRecovery<{ keys: Keys }>(recovery, PASS);
        keys = st.keys;
        closedUntil = 0;
        note("reanudado con el archivo de recuperación");
      }
      if (!(apiDownUntil && Date.now() < apiDownUntil)) {
        if (apiDownUntil) {
          note("conexión recuperada");
          apiDownUntil = 0;
        }
        for (const m of (await api.events(r.room_id, r.room_token, lastSeq)).messages) {
          lastSeq = Math.max(lastSeq, m.seq);
          if (m.from === "maker" && m.event === "xmr_locked") {
            const okKey = /^[0-9a-f]{64}$/.test(m.data?.tx_key ?? "") && parseInt(m.data.tx_key.slice(62, 64), 16) <= 0x10;
            if (okKey && /^[0-9a-f]{64}$/.test(m.data?.txid ?? "")) lock = { txid: m.data.txid, tx_key: m.data.tx_key };
            else note("datos de bloqueo inválidos rechazados", { tx_key: String(m.data?.tx_key).slice(0, 8) });
          }
        }
      }
      const view = await chain.view(dep.escrow, dep.block);
      if (lock && view.stage === "PENDING" && view.now < view.t0) {
        try {
          check = await verifyLock({ txid: lock.txid, txKey: lock.tx_key, address: shared.address, node: c.badNode ? "http://127.0.0.1:9" : undefined });
        } catch (e) {
          note("verificación falló", String((e as Error).message).slice(0, 80));
        }
      }
      const action = decide(view, check, { expectedXmr: BigInt(reply.xmr_atomic), ...POLICY });
      if (c.neverReady && action.kind === "set_ready") continue; // el taker "no aparece"
      if (c.neverReady && action.kind === "refund_now" && view.now < view.t0) continue;

      if (action.kind === "set_ready") {
        note("setReady", { tx: await chain.setReady(dep.escrow), received: String(check?.received), conf: check?.confirmations });
        readyAt = Date.now();
        await api.message(r.room_id, r.room_token, "ready", {}).catch(() => undefined);
        if (c.closeAfterReadyMin) {
          keys = null;
          closedUntil = readyAt + c.closeAfterReadyMin * 60_000;
          note("pestaña cerrada tras confirmar");
        }
      } else if (action.kind === "refund_now") {
        note("reembolso", { tx: await chain.refund(dep.escrow, keys.contract_secret), motivo: action.reason });
      } else if (action.kind === "done_refunded") {
        note("FIN: reembolsado");
        return finish("refund");
      } else if (action.kind === "sweep") {
        const w = core.recover(keys.spend_private, reply.maker_message, action.makerSecret);
        if (w.address !== shared.address) throw new Error("llave reconstruida no corresponde");
        const s = await sweep({ address: w.address, viewKey: w.private_view_key, spendKey: w.private_spend_key, restoreHeight, destination: cfg.takerXmrAddress });
        if (s.txids.length) {
          note("FIN: XMR barrido a la wallet del taker", { txids: s.txids, piconero: String(s.unlocked) });
          return finish("xmr");
        }
        note("XMR aún bloqueado; reintento", { balance: String(s.balance) });
      } else if (action.kind === "error") {
        throw new Error(action.reason);
      }
    }

    function finish(outcome: "xmr" | "refund") {
      const res = { id: c.id, title: c.title, expect: c.expect, outcome, ok: outcome === c.expect, minutes: Math.round((Date.now() - started) / 60000), events: ev };
      writeFileSync(join(outDir, `${c.id}.json`), JSON.stringify(res, null, 1));
      void recovery;
      return res;
    }
  } catch (e) {
    note("ERROR", String((e as Error).message));
    const res = { id: c.id, title: c.title, expect: c.expect, outcome: "error", ok: false, minutes: Math.round((Date.now() - started) / 60000), events: ev };
    writeFileSync(join(outDir, `${c.id}.json`), JSON.stringify(res, null, 1));
    return res;
  }
}

const only = process.argv.slice(2);
const selected = CASES.filter((c) => !only.length || only.includes(c.id));
const chain = new Chain(loadKey("taker"));
const need = BigInt(selected.reduce((a, c) => a + c.usdt, 0)) * 1_000_000n;
if ((await chain.tokenBalance(chain.account.address)) < need) {
  console.log("pidiendo TestUSDT al faucet del token…");
  await chain.faucet(1_000n * 1_000_000n);
}
console.log(`Corriendo ${selected.map((c) => c.id).join(", ")} · resultados en ${outDir}`);
// Escalonar el inicio para no saturar al maker ni al nodo.
const results = await Promise.all(selected.map((c, i) => sleep(i * 45_000).then(() => runCase(c, chain))));
console.table(results.map((r) => ({ caso: r.id, esperado: r.expect, resultado: r.outcome, ok: r.ok ? "✅" : "❌", min: r.minutes })));
writeFileSync(join(outDir, "resumen.json"), JSON.stringify(results.map(({ events, ...r }) => r), null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
