/**
 * Fase 7: corre los casos E1–E10 de docs/PRUEBAS.md en paralelo contra Arbitrum Sepolia + Monero
 * stagenet, con el maker real y el backend desplegado. El taker usa la MISMA lógica de decisión que la app.
 *
 *   node --experimental-strip-types run.ts                 # todos
 *   node --experimental-strip-types run.ts E1 E9           # algunos
 *   node --experimental-strip-types run.ts --resume <arch> # reanudar un caso desde su archivo de recuperación
 *
 * Robustez (lección de la primera corrida): igual que la app, el estado se guarda cifrado en disco en
 * cada paso (e2e/.secrets/recovery/) y cualquier error de red se reintenta en el siguiente ciclo.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Address, Hex } from "viem";
import { decide, type XmrCheck } from "../web/src/app/decide.ts";
import { decryptRecovery, encryptRecovery, type RecoveryFile } from "../web/src/app/recovery.ts";
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

/** Estado persistente de un caso (lo que la app guarda en el archivo de recuperación). */
interface State {
  caseId: string;
  keys: Keys;
  reply: any;
  room: { id: string; token: string };
  shared: string;
  salt: Hex;
  restoreHeight: number;
  escrow?: Address;
  block?: number;
  lock?: { txid: string; tx_key: string };
  lastSeq: number;
  readyTx?: Hex;
}

const POLICY = { minConfirmations: 10, refundMarginS: 10 * 60 };
const PASS = "contraseña de prueba e2e";
const MAX_CASE_MS = 4 * 3600_000;
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(ROOT, "e2e", "results", runId);
const recDir = join(ROOT, "e2e", ".secrets", "recovery");
mkdirSync(outDir, { recursive: true });
mkdirSync(recDir, { recursive: true });

const log = (id: string, msg: string) => console.log(`${new Date().toISOString().slice(11, 19)} [${id}] ${msg}`);

async function save(path: string, st: State) {
  const f = await encryptRecovery(st, PASS, { network: "arbitrum_sepolia", escrow: st.escrow, shared_address: st.shared });
  writeFileSync(path, JSON.stringify(f));
}

/** Reintenta una operación de red con espera creciente (cortes de internet de la PC). */
async function retry<T>(what: string, id: string, fn: () => Promise<T>, tries = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw e;
      log(id, `reintento ${i} de "${what}": ${String((e as Error).message).slice(0, 80)}`);
      await sleep(Math.min(60_000, 5_000 * i));
    }
  }
}

async function negotiate(c: Case, chain: Chain, path: string): Promise<State> {
  // Esperar hasta 15 min a que el maker publique una oferta (la renueva cada 5 min).
  const offer = await retry("ofertas", c.id, async () => {
    // E2E_MAKER=0x… elige un maker concreto (p. ej. el maker en el navegador).
    const want = process.env.E2E_MAKER?.toLowerCase();
    const o = (await api.offers()).offers.find((x) => !want || x.maker.toLowerCase() === want);
    if (!o) throw new Error("no hay ofertas todavía");
    return o;
  }, 18);
  const keys = core.generate();
  // El maker puede rechazar mientras su XMR de cambio está bloqueado (~20 min): reintentar con paciencia.
  const r = await retry("crear swap", c.id, () => api.createSwap(offer.id, String(c.usdt), keys.message), 30);
  const reply = r.maker_reply;
  // Igual que app.ts: verificar todo lo que afirma el maker antes de depositar.
  if (core.verify(reply.maker_message).toLowerCase() !== reply.claim_commitment.toLowerCase()) throw new Error("DLEQ/commitment del maker no coincide");
  if (reply.refund_commitment.toLowerCase() !== keys.message.contract_commitment!.toLowerCase()) throw new Error("refund_commitment ajeno");
  const shared = core.shared(keys.spend_private, reply.maker_message);
  if (shared.address !== reply.shared_address) throw new Error("dirección compartida distinta");
  const st: State = {
    caseId: c.id, keys, reply, room: { id: r.room_id, token: r.room_token }, shared: shared.address,
    salt: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as Hex,
    restoreHeight: (await retry("altura", c.id, () => daemonHeight())) - 10, lastSeq: 0,
  };
  await save(path, st); // "descargar el archivo de recuperación" ANTES de depositar
  return st;
}

async function runCase(c: Case, chain: Chain, resumeFrom?: string) {
  const ev: { t: string; e: string; d?: unknown }[] = [];
  const note = (e: string, d?: unknown) => {
    ev.push({ t: new Date().toISOString(), e, d });
    log(c.id, d ? `${e} ${JSON.stringify(d)}` : e);
  };
  const started = Date.now();
  const path = resumeFrom ?? join(recDir, `${runId}-${c.id}.json`);
  const finish = (outcome: string) => {
    const res = { id: c.id, title: c.title, expect: c.expect, outcome, ok: outcome === c.expect, minutes: Math.round((Date.now() - started) / 60000), recovery: path, events: ev };
    writeFileSync(join(outDir, `${c.id}.json`), JSON.stringify(res, null, 1));
    return res;
  };
  try {
    let st: State | null;
    if (resumeFrom) {
      st = await decryptRecovery<State>(JSON.parse(readFileSync(resumeFrom, "utf8")) as RecoveryFile, PASS);
      note("reanudado desde archivo", { escrow: st.escrow });
    } else {
      st = await negotiate(c, chain, path);
      note("negociado", { xmr: st.reply.xmr_atomic / 1e12, shared: st.shared.slice(0, 12) });
    }
    if (!st.escrow) {
      const dep = await retry("depósito", c.id, () =>
        chain.deposit({
          claimer: st!.reply.claimer, claimCommitment: st!.reply.claim_commitment, refundCommitment: st!.keys.message.contract_commitment as Hex,
          d0: Math.max(45 * 60, st!.reply.min_duration0 + 10 * 60), d1: Math.max(30 * 60, st!.reply.min_duration1),
          amount: BigInt(st!.reply.usdt_atomic), salt: st!.salt,
        }),
      );
      Object.assign(st, { escrow: dep.escrow, block: dep.block });
      await save(path, st);
      note("depositado", { escrow: dep.escrow, tx: dep.hash });
    }

    let closedUntil = c.closeAfterDepositMin && !resumeFrom ? Date.now() + c.closeAfterDepositMin * 60_000 : 0;
    if (closedUntil) {
      st = null; // "se cerró la pestaña": solo queda el archivo en disco
      note("pestaña cerrada");
    }
    let apiDownUntil = c.apiOutageMin && !resumeFrom ? Date.now() + c.apiOutageMin * 60_000 : 0;
    let check: XmrCheck | undefined;

    while (Date.now() - started < MAX_CASE_MS) {
      await sleep(20_000);
      if (closedUntil && Date.now() < closedUntil) continue;
      try {
        if (!st) {
          st = await decryptRecovery<State>(JSON.parse(readFileSync(path, "utf8")) as RecoveryFile, PASS);
          closedUntil = 0;
          note("reanudado con el archivo de recuperación");
        }
        if (!(apiDownUntil && Date.now() < apiDownUntil)) {
          if (apiDownUntil) {
            note("conexión recuperada");
            apiDownUntil = 0;
          }
          for (const m of (await api.events(st.room.id, st.room.token, st.lastSeq)).messages) {
            st.lastSeq = Math.max(st.lastSeq, m.seq);
            if (m.from === "maker" && m.event === "xmr_locked") {
              // Misma validación que app.ts: un tx_key malformado aborta monero-ts.
              const okKey = /^[0-9a-f]{64}$/.test(m.data?.tx_key ?? "") && parseInt(m.data.tx_key.slice(62, 64), 16) <= 0x10;
              if (okKey && /^[0-9a-f]{64}$/.test(m.data?.txid ?? "")) st.lock = { txid: m.data.txid, tx_key: m.data.tx_key };
              else note("datos de bloqueo inválidos rechazados", { tx_key: String(m.data?.tx_key).slice(0, 8) });
            }
          }
          await save(path, st);
        }
        const view = await chain.view(st.escrow!, st.block!);
        if (st.lock && view.stage === "PENDING" && view.now < view.t0) {
          try {
            check = await verifyLock({ txid: st.lock.txid, txKey: st.lock.tx_key, address: st.shared, node: c.badNode ? "http://127.0.0.1:9" : undefined });
          } catch (e) {
            note("verificación falló", String((e as Error).message).slice(0, 80));
          }
        }
        const action = decide(view, check, { expectedXmr: BigInt(st.reply.xmr_atomic), ...POLICY });
        if (c.neverReady && (action.kind === "set_ready" || (action.kind === "refund_now" && view.now < view.t0))) continue;

        if (action.kind === "set_ready") {
          st.readyTx = await chain.setReady(st.escrow!);
          await save(path, st);
          note("setReady", { tx: st.readyTx, received: String(check?.received), conf: check?.confirmations });
          await api.message(st.room.id, st.room.token, "ready", {}).catch(() => undefined);
          if (c.closeAfterReadyMin) {
            st = null;
            closedUntil = Date.now() + c.closeAfterReadyMin * 60_000;
            note("pestaña cerrada tras confirmar");
          }
        } else if (action.kind === "refund_now") {
          note("reembolso", { tx: await chain.refund(st.escrow!, st.keys.contract_secret), motivo: action.reason });
        } else if (action.kind === "done_refunded") {
          note("FIN: reembolsado");
          return finish("refund");
        } else if (action.kind === "sweep") {
          const w = core.recover(st.keys.spend_private, st.reply.maker_message, action.makerSecret);
          if (w.address !== st.shared) throw new Error("llave reconstruida no corresponde");
          const s = await sweep({ address: w.address, viewKey: w.private_view_key, spendKey: w.private_spend_key, restoreHeight: st.restoreHeight, destination: cfg.takerXmrAddress });
          if (s.txids.length) {
            note("FIN: XMR barrido a la wallet del taker", { txids: s.txids, piconero: String(s.unlocked) });
            return finish("xmr");
          }
          note("XMR aún bloqueado; reintento", { balance: String(s.balance) });
        } else if (action.kind === "error") {
          note("estado inesperado", action.reason);
        }
      } catch (e) {
        // Como la app: los errores de red no terminan el caso; se reintenta en el siguiente ciclo.
        note("error transitorio; reintento", String((e as Error).message).slice(0, 100));
      }
    }
    return finish("timeout");
  } catch (e) {
    note("ERROR", String((e as Error).message));
    return finish("error");
  }
}

const args = process.argv.slice(2);
const chain = new Chain(loadKey("taker"));
let jobs: Promise<any>[];
if (args[0] === "--resume") {
  const file = args[1]!;
  if (!existsSync(file)) throw new Error(`no existe ${file}`);
  const id = /-(E\d+)\.json$/.exec(file)?.[1] ?? "E?";
  jobs = [runCase(CASES.find((c) => c.id === id) ?? CASES[0]!, chain, file)];
} else {
  const selected = CASES.filter((c) => !args.length || args.includes(c.id));
  const need = BigInt(selected.reduce((a, c) => a + c.usdt, 0)) * 1_000_000n;
  if ((await chain.tokenBalance(chain.account.address)) < need) {
    console.log("pidiendo TestUSDT al faucet del token…");
    await chain.faucet(1_000n * 1_000_000n);
  }
  console.log(`Corriendo ${selected.map((c) => c.id).join(", ")} · resultados en ${outDir}`);
  // Escalonar el inicio para no saturar al maker ni al nodo.
  jobs = selected.map((c, i) => sleep(i * 45_000).then(() => runCase(c, chain)));
}
const results = await Promise.all(jobs);
console.table(results.map((r) => ({ caso: r.id, esperado: r.expect, resultado: r.outcome, ok: r.ok ? "✅" : "❌", min: r.minutes })));
writeFileSync(join(outDir, "resumen.json"), JSON.stringify(results.map(({ events, ...r }) => r), null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
