/**
 * Recibir por apodo: cada cuenta publica sus direcciones FIRMADAS con la llave de la cuenta. Quien
 * envía verifica la firma en su navegador, así el servidor (o quien lo comprometa) no puede cambiar
 * la dirección de nadie por otra. Además, la app recuerda la llave de cada contacto: si un apodo
 * pasa a ser de otra cuenta, avisa antes de enviar.
 *
 * Sin DOM ni red: se prueba con `npm test`. El servidor arma el mismo mensaje en
 * workers/src/api/p2p/addresses.ts; si cambia aquí, cambia allá.
 */
import { recoverMessageAddress } from "viem";

export type PayAsset = "xmr" | "evm";
export type PayNetwork = "mainnet" | "stagenet";

export interface AddressRecord {
  asset: PayAsset;
  address: string;
  /** Segundos Unix en que se firmó. Un registro más viejo que el publicado se rechaza. */
  at: number;
  sig: `0x${string}`;
}

/** Texto exacto que firma la cuenta. Incluye usuario y red para que una firma no sirva en otro contexto. */
export function addressMessage(user: string, network: PayNetwork, asset: PayAsset, address: string, at: number): string {
  return ["MoneroP2P receive-by-nickname v1", `user: ${user.toLowerCase()}`, `network: ${network}`, `asset: ${asset}`, `address: ${address}`, `at: ${at}`].join("\n");
}

interface Signer {
  address: `0x${string}`;
  signMessage(a: { message: string }): Promise<`0x${string}`>;
}

export async function signAddress(acct: Signer, network: PayNetwork, asset: PayAsset, address: string, at = Math.floor(Date.now() / 1000)): Promise<AddressRecord> {
  return { asset, address, at, sig: await acct.signMessage({ message: addressMessage(acct.address, network, asset, address, at) }) };
}

/** ¿Este registro lo firmó de verdad la cuenta `user`? Nunca lanza: una firma rota es simplemente inválida. */
export async function verifyAddress(user: string, network: PayNetwork, r: AddressRecord): Promise<boolean> {
  try {
    if (!/^0x[0-9a-fA-F]{130}$/.test(r.sig) || !Number.isInteger(r.at)) return false;
    const who = await recoverMessageAddress({ message: addressMessage(user, network, r.asset, r.address, r.at), signature: r.sig });
    return who.toLowerCase() === user.toLowerCase();
  } catch {
    return false;
  }
}

/** "@Satoshi_mx" o "satoshi_mx" → "satoshi_mx" (o null si no tiene forma de apodo). */
export function parseNick(text: string): string | null {
  const s = text.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_.-]{3,20}$/.test(s) ? s : null;
}

/** ¿El texto del campo «destino» es un apodo (empieza con @) y no una dirección? */
export const isNickInput = (text: string) => text.trim().startsWith("@");

// ---------------------------------------------------------------- contactos (se guardan en la bóveda)

export interface Contact {
  /** Llave de la cuenta (0x…) a la que se le envió la primera vez. */
  id: string;
  nickname: string;
  since: number;
}

export type ContactCheck = "known" | "new" | "changed";

/** Compara la cuenta que hoy tiene ese apodo con la que el usuario ya conocía. */
export function checkContact(contacts: Record<string, Contact> | undefined, nickname: string, id: string): ContactCheck {
  const c = contacts?.[nickname.toLowerCase()];
  if (!c) return "new";
  return c.id.toLowerCase() === id.toLowerCase() ? "known" : "changed";
}

// ---------------------------------------------------------------- enlace de cobro

export interface PayRequest {
  to: string; // apodo, sin @
  coin?: "xmr" | "usdt" | "eth";
  amount?: string;
}

/** Parte del enlace que va después de #/wallet: ?to=@apodo&coin=usdt&amount=50 */
export function payQuery(r: PayRequest): string {
  const q = new URLSearchParams({ to: "@" + r.to });
  if (r.coin) q.set("coin", r.coin);
  if (r.amount) q.set("amount", r.amount);
  return "?" + q.toString().replace(/%40/g, "@");
}

/** Lee un enlace de cobro; ignora lo que no tenga la forma esperada (es texto que escribió otra persona). */
export function parsePayQuery(query: string): PayRequest | null {
  const q = new URLSearchParams(query.replace(/^\?/, ""));
  const to = parseNick(q.get("to") ?? "");
  if (!to) return null;
  const coin = q.get("coin");
  const amount = q.get("amount") ?? "";
  return {
    to,
    ...(coin === "xmr" || coin === "usdt" || coin === "eth" ? { coin } : {}),
    ...(/^\d{1,12}([.,]\d{1,12})?$/.test(amount) ? { amount: amount.replace(",", ".") } : {}),
  };
}
