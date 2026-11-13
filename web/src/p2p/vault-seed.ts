/**
 * Creación de la bóveda de la cuenta y su semilla maestra. Sin DOM, sin IndexedDB y sin red, para
 * poder probarlo con `npm test` (identity.ts lo reexporta y agrega el guardado cifrado).
 */
import { generatePrivateKey } from "viem/accounts";
import type { P2PVault } from "./identity";
import { cleanSeed, identityKey, newSeed } from "./wallets.ts";

/** Cuenta nueva. Con `withSeed` (wallets activas) la llave de la cuenta sale de la semilla. */
export function newVault(network: P2PVault["network"], withSeed = false): P2PVault {
  if (withSeed) return vaultFromSeed(network, newSeed());
  return { v: 1, kind: "p2p", network, created_at: Date.now(), methods: [], escrows: {}, key: generatePrivateKey() };
}

/** Cuenta a partir de una semilla (nueva, o escrita por el usuario para recuperar su cuenta). */
export function vaultFromSeed(network: P2PVault["network"], seed: string, xmrHeight?: number): P2PVault {
  const clean = cleanSeed(seed);
  return { v: 1, kind: "p2p", network, created_at: Date.now(), methods: [], escrows: {}, key: identityKey(clean), seed: clean, keyFromSeed: true, ...(xmrHeight !== undefined ? { xmrHeight } : {}) };
}

/**
 * Agrega la semilla maestra a una cuenta que no la tenía. No cambia su llave ni su apodo, y si ya
 * tiene semilla no hace nada: reemplazarla dejaría sin acceso a los fondos de la anterior.
 */
export function addSeed(v: P2PVault, xmrHeight?: number): void {
  if (v.seed) return;
  v.seed = newSeed();
  v.keyFromSeed = false;
  if (xmrHeight !== undefined) v.xmrHeight = xmrHeight;
}
