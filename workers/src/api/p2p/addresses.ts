/**
 * Recibir por apodo: cada cuenta publica sus direcciones públicas firmadas con su propia llave.
 *
 *   PUT    /v1/p2p/me/addresses          {addresses: [{asset, address, at, sig}]}   (firmada)
 *   DELETE /v1/p2p/me/addresses/:asset                                              (firmada)
 *   GET    /v1/p2p/pay/:apodo            → {user, network, addresses}               (pública)
 *
 * El servidor comprueba la firma al guardar, pero quien envía NO confía en eso: la vuelve a verificar
 * en su navegador (web/src/p2p/pay.ts). El mensaje firmado es el mismo en ambos lados.
 */
import { getAddress, isAddress, verifyMessage } from "viem";
import { HttpError, json, readJson } from "../env";
import { activeUser, now, signer, xmrNetwork, type P2PEnv, type User } from "./common";

const ASSETS = ["xmr", "evm"] as const;
type Asset = (typeof ASSETS)[number];

/** Igual que addressMessage() de web/src/p2p/pay.ts. */
export function addressMessage(user: string, network: string, asset: string, address: string, at: number): string {
  return ["MoneroP2P receive-by-nickname v1", `user: ${user.toLowerCase()}`, `network: ${network}`, `asset: ${asset}`, `address: ${address}`, `at: ${at}`].join("\n");
}

/** Una firma no puede venir del futuro ni ser más vieja que un día (reloj del usuario desajustado aparte). */
const MAX_AGE_S = 86400;
const MAX_AHEAD_S = 600;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function validAddress(env: P2PEnv, asset: Asset, address: string): boolean {
  if (asset === "evm") return /^0x[0-9a-fA-F]{40}$/.test(address) && isAddress(address);
  // Monero: dirección estándar o subdirección (95 caracteres) de la red de este despliegue.
  const prefixes = xmrNetwork(env) === "mainnet" ? ["4", "8"] : ["5", "7"];
  return address.length === 95 && BASE58.test(address) && prefixes.includes(address[0]!);
}

export async function putAddresses(req: Request, env: P2PEnv, path: string): Promise<Response> {
  const { raw, data } = await readJson<Record<string, unknown>>(req);
  const user = (await activeUser(env, await signer(req, env, path, raw))).id;
  const list = data.addresses;
  if (!Array.isArray(list) || !list.length || list.length > ASSETS.length) throw new HttpError(400, "addresses: lista de 1 a 2 direcciones");
  const network = xmrNetwork(env);
  const t = now();
  const rows: { asset: Asset; address: string; at: number; sig: string }[] = [];
  for (const x of list as Record<string, unknown>[]) {
    const asset = x?.asset as Asset;
    const address = typeof x?.address === "string" ? x.address : "";
    const at = x?.at;
    const sig = typeof x?.sig === "string" ? x.sig : "";
    if (!ASSETS.includes(asset)) throw new HttpError(400, "asset debe ser xmr o evm");
    if (rows.some((r) => r.asset === asset)) throw new HttpError(400, `asset repetido: ${asset}`);
    if (!validAddress(env, asset, address)) throw new HttpError(400, `dirección inválida para ${asset} en ${network}`);
    if (typeof at !== "number" || !Number.isInteger(at) || at > t + MAX_AHEAD_S || at < t - MAX_AGE_S) throw new HttpError(400, "at fuera de rango");
    if (!/^0x[0-9a-fA-F]{130}$/.test(sig)) throw new HttpError(400, "sig inválida");
    const ok = await verifyMessage({ address: getAddress(user), message: addressMessage(user, network, asset, address, at), signature: sig as `0x${string}` }).catch(() => false);
    if (!ok) throw new HttpError(400, `la firma de ${asset} no es de esta cuenta`);
    rows.push({ asset, address, at, sig });
  }
  // Un registro más viejo que el ya publicado no lo reemplaza (nadie puede reponer una dirección anterior).
  await env.DB.batch(
    rows.map((r) =>
      env.DB.prepare(
        "INSERT INTO p2p_addresses (user_id, asset, address, at, sig) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, asset) DO UPDATE SET address = excluded.address, at = excluded.at, sig = excluded.sig WHERE excluded.at >= p2p_addresses.at",
      ).bind(user, r.asset, r.address, r.at, r.sig),
    ),
  );
  return json({ addresses: await addressesOf(env, user) });
}

export async function deleteAddress(req: Request, env: P2PEnv, path: string, asset: string): Promise<Response> {
  const { raw } = await readJson<Record<string, unknown>>(req);
  const user = (await activeUser(env, await signer(req, env, path, raw))).id;
  if (!ASSETS.includes(asset as Asset)) throw new HttpError(400, "asset debe ser xmr o evm");
  await env.DB.prepare("DELETE FROM p2p_addresses WHERE user_id = ? AND asset = ?").bind(user, asset).run();
  return json({ addresses: await addressesOf(env, user) });
}

async function addressesOf(env: P2PEnv, user: string) {
  const r = await env.DB.prepare("SELECT asset, address, at, sig FROM p2p_addresses WHERE user_id = ? ORDER BY asset").bind(user).all<{ asset: string; address: string; at: number; sig: string }>();
  return r.results;
}

/** Pública: a quién pertenece un apodo y qué direcciones publicó. Sin reputación ni actividad. */
export async function getPay(env: P2PEnv, nickname: string): Promise<Response> {
  const u = await env.DB.prepare("SELECT * FROM p2p_users WHERE nickname = ? COLLATE NOCASE").bind(nickname).first<User>();
  if (!u || u.banned) throw new HttpError(404, "no hay ningún usuario con ese apodo");
  return json({ user: { id: u.id, nickname: u.nickname }, network: xmrNetwork(env), addresses: await addressesOf(env, u.id) }, 200, { "cache-control": "no-store" });
}
