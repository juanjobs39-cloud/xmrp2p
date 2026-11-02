// Estado del árbitro por orden (llaves y caché de la wallet multisig, ronda del armado, etc.),
// cifrado con AES-GCM antes de salir del árbitro. La llave sale de ARBITER_STATE_KEY (secreto).
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

export async function stateKey(secret) {
  if (!secret || secret.length < 32) throw new Error("ARBITER_STATE_KEY debe tener al menos 32 caracteres");
  const raw = await crypto.subtle.digest("SHA-256", enc.encode("xmrp2p-arbiter-state|" + secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Contraseña de la wallet de una orden: derivada del secreto, nunca se guarda. */
export async function walletPassword(secret, orderId) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode("wallet|" + orderId)));
  return Buffer.from(mac).toString("hex");
}

export async function seal(key, orderId, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(orderId) }, key, data));
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
}

export async function open(key, orderId, sealed) {
  const s = JSON.parse(sealed);
  if (s.v !== 1) throw new Error("versión de estado desconocida");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv), additionalData: enc.encode(orderId) }, key, unb64(s.ct));
  return JSON.parse(dec.decode(pt));
}

export { b64, unb64 };
