/**
 * Monitoreo de la fábrica con dinero real (beta). Corre por cron cada 5 minutos:
 * - registra cada `SwapCreated` y avisa;
 * - detecta `Claimed` / `Refunded` en los escrows abiertos y avisa;
 * - avisa una vez si un escrow pasa `t1` sin cerrarse (el taker debe reembolsar).
 * Avisos por Telegram si están configurados TELEGRAM_BOT_TOKEN (secreto) y TELEGRAM_CHAT_ID.
 * Sin MONITOR_FACTORY no hace nada. Solo lee la cadena: no toca fondos.
 */
import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import type { Env } from "./env";

const SWAP_CREATED = parseAbiItem(
  "event SwapCreated(address indexed escrow, address indexed owner, address indexed claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 t0, uint64 t1, uint256 amount)",
);
const CLAIMED = parseAbiItem("event Claimed(bytes32 secret, address indexed to, uint256 amountToClaimer, uint256 fee)");
const REFUNDED = parseAbiItem("event Refunded(bytes32 secret, address indexed to, uint256 amount)");
/** Bloques por consulta (Arbitrum produce ~4 bloques por segundo). */
const SPAN = 20_000n;

export interface MonitorEnv extends Env {
  MONITOR_FACTORY?: string;
  MONITOR_RPC?: string;
  MONITOR_EXPLORER?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const usdt = (a: bigint | string) => (Number(a) / 1e6).toFixed(2);

export async function notify(env: MonitorEnv, text: string): Promise<void> {
  console.log(`[monitor] ${text}`);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  }).catch((e) => console.error("telegram", e));
}

async function getState(env: Env, k: string): Promise<string | null> {
  return ((await env.DB.prepare("SELECT v FROM monitor_state WHERE k = ?").bind(k).first<{ v: string }>()) ?? null)?.v ?? null;
}

async function setState(env: Env, k: string, v: string): Promise<void> {
  await env.DB.prepare("INSERT INTO monitor_state (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run();
}

export async function runMonitor(env: MonitorEnv): Promise<{ created: number; closed: number; overdue: number }> {
  const out = { created: 0, closed: 0, overdue: 0 };
  if (!env.MONITOR_FACTORY || !env.MONITOR_RPC) return out;
  const factory = env.MONITOR_FACTORY as Address;
  const explorer = env.MONITOR_EXPLORER ?? "https://arbiscan.io";
  const pub = createPublicClient({ transport: http(env.MONITOR_RPC) });
  const head = await pub.getBlockNumber();
  const block = await pub.getBlock({ blockNumber: head });
  const now = Number(block.timestamp);

  // 1. Swaps nuevos (desde el último bloque leído; la primera vez, los últimos ~SPAN bloques).
  let from = BigInt((await getState(env, "last_block")) ?? String(head > SPAN ? head - SPAN : 0n)) + 1n;
  while (from <= head) {
    const to = from + SPAN - 1n < head ? from + SPAN - 1n : head;
    const logs = await pub.getLogs({ address: factory, event: SWAP_CREATED, fromBlock: from, toBlock: to });
    for (const l of logs) {
      const a = l.args;
      const r = await env.DB.prepare(
        "INSERT OR IGNORE INTO monitor_escrows (escrow, owner, claimer, amount, t0, t1, created_block) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(a.escrow!.toLowerCase(), a.owner!.toLowerCase(), a.claimer!.toLowerCase(), a.amount!.toString(), Number(a.t0), Number(a.t1), Number(l.blockNumber))
        .run();
      if (r.meta.changes) {
        out.created++;
        await notify(env, `🟢 Nuevo swap: ${usdt(a.amount!)} USDT\nmaker ${a.claimer}\n${explorer}/address/${a.escrow}`);
      }
    }
    await setState(env, "last_block", to.toString());
    from = to + 1n;
  }

  // 2. Escrows abiertos: ¿se cerraron? ¿pasaron t1?
  const open = (await env.DB.prepare("SELECT escrow, amount, t1, created_block, overdue_alerted FROM monitor_escrows WHERE status = 'open'").all<{
    escrow: string; amount: string; t1: number; created_block: number; overdue_alerted: number;
  }>()).results;
  for (const e of open) {
    const addr = e.escrow as Address;
    const fromBlock = BigInt(e.created_block);
    const [claimed, refunded] = await Promise.all([
      pub.getLogs({ address: addr, event: CLAIMED, fromBlock }),
      pub.getLogs({ address: addr, event: REFUNDED, fromBlock }),
    ]);
    if (claimed.length || refunded.length) {
      const status = claimed.length ? "claimed" : "refunded";
      await env.DB.prepare("UPDATE monitor_escrows SET status = ? WHERE escrow = ?").bind(status, e.escrow).run();
      out.closed++;
      await notify(
        env,
        status === "claimed"
          ? `✅ Swap completado: ${usdt(e.amount)} USDT cobrados por el maker\n${explorer}/address/${e.escrow}`
          : `↩️ Swap reembolsado: ${usdt(e.amount)} USDT devueltos al taker\n${explorer}/address/${e.escrow}`,
      );
    } else if (now > e.t1 && !e.overdue_alerted) {
      await env.DB.prepare("UPDATE monitor_escrows SET overdue_alerted = 1 WHERE escrow = ?").bind(e.escrow).run();
      out.overdue++;
      await notify(env, `⚠️ Swap vencido sin cerrar (pasó t1): ${usdt(e.amount)} USDT. El taker debe reembolsar.\n${explorer}/address/${e.escrow}`);
    }
  }
  return out;
}
