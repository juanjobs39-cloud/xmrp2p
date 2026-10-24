import { getAddress, isAddress, verifyMessage } from "viem";
import { HttpError, sha256Hex } from "./env";

/** Diferencia máxima aceptada entre la hora del maker y la del Worker. */
export const MAX_SKEW_S = 300;

/**
 * Mensaje que firma el maker (EIP-191, `personal_sign`) en cada escritura:
 *   xmrp2p|<MÉTODO>|<ruta>|<dirección en minúsculas>|<timestamp>|<sha256 del cuerpo>
 * Así nadie puede publicar ni retirar ofertas en nombre de otro maker.
 */
export async function signedMessage(method: string, path: string, address: string, ts: string, body: string): Promise<string> {
  return `xmrp2p|${method.toUpperCase()}|${path}|${address.toLowerCase()}|${ts}|${await sha256Hex(body)}`;
}

/** Verifica las cabeceras X-Maker-Address, X-Timestamp y X-Signature. Devuelve la dirección en minúsculas. */
export async function verifyMaker(req: Request, path: string, body: string, nowS = Math.floor(Date.now() / 1000)): Promise<string> {
  const address = req.headers.get("x-maker-address") ?? "";
  const ts = req.headers.get("x-timestamp") ?? "";
  const signature = req.headers.get("x-signature") ?? "";
  if (!isAddress(address)) throw new HttpError(401, "falta o es inválida X-Maker-Address");
  if (!/^\d+$/.test(ts) || Math.abs(nowS - Number(ts)) > MAX_SKEW_S) throw new HttpError(401, "X-Timestamp fuera de rango");
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) throw new HttpError(401, "falta o es inválida X-Signature");
  const message = await signedMessage(req.method, path, address, ts, body);
  const ok = await verifyMessage({ address: getAddress(address), message, signature: signature as `0x${string}` });
  if (!ok) throw new HttpError(401, "firma inválida");
  return address.toLowerCase();
}
