// Escrow 2 de 3 de Monero (comprador, vendedor y árbitro) con monero-ts.
// Este módulo solo usa métodos de la wallet: lo usan el árbitro (Node) y, en la fase 3, el navegador.
//
// Armado del escrow, por rondas (cada parte publica su «hex» de la ronda en la sala de la orden):
//   ronda 0: prepareMultisig()                       → hex de preparación
//   ronda 1: makeMultisig(hex de los otros 2, 2)    → hex de intercambio
//   ronda 2…: exchangeMultisigKeys(hex de los otros) → hasta que la wallet queda lista
// Al final las tres wallets tienen la misma dirección: esa es la dirección del escrow.

export const THRESHOLD = 2;
export const PARTIES = 3;
/** Límite de rondas de intercambio (2 de 3 necesita pocas; esto solo evita bucles infinitos). */
export const MAX_ROUNDS = 6;

/** Ronda 0. */
export async function prepare(wallet) {
  return wallet.prepareMultisig();
}

/**
 * Avanza una ronda con el hex de los otros dos participantes.
 * → { done: true, address } cuando la wallet ya es multisig y está lista; si no, { done: false, hex }.
 */
export async function advance(wallet, round, othersHex, password) {
  if (!Array.isArray(othersHex) || othersHex.length !== PARTIES - 1) throw new Error("se necesitan los hex de los otros 2 participantes");
  if (round < 1 || round > MAX_ROUNDS) throw new Error("ronda fuera de rango");
  let hex;
  if (round === 1) {
    hex = await wallet.makeMultisig(othersHex, THRESHOLD, password);
  } else {
    const r = await wallet.exchangeMultisigKeys(othersHex, password);
    hex = r.getMultisigHex();
  }
  const info = await wallet.getMultisigInfo();
  if (info.getIsReady()) {
    if (info.getThreshold() !== THRESHOLD || info.getNumParticipants() !== PARTIES) throw new Error("el escrow no es 2 de 3");
    return { done: true, address: await wallet.getPrimaryAddress(), hex: hex || null };
  }
  if (!hex) throw new Error("la wallet no devolvió el hex de la siguiente ronda");
  return { done: false, hex };
}

// ---------- Gastar del escrow (2 firmas) ----------

/** Información de salidas para que la otra parte pueda firmar (se intercambia antes de cada gasto). */
export async function exportInfo(wallet) {
  return wallet.exportMultisigHex();
}

export async function importInfo(wallet, hexes) {
  return wallet.importMultisigHex(hexes);
}

/**
 * Crea la transacción de salida (sin enviarla) y la firma con la llave propia.
 * destinations: [{ address, amount: bigint }]. La comisión de red sale del sobrante del escrow.
 * → hex para que la segunda parte lo revise, firme y envíe.
 */
export async function createSpend(wallet, destinations) {
  const txs = await wallet.createTxs({
    accountIndex: 0,
    destinations: destinations.map((d) => ({ address: d.address, amount: BigInt(d.amount) })),
    relay: false,
  });
  const hex = txs[0]?.getTxSet()?.getMultisigTxHex();
  if (!hex) throw new Error("no se pudo crear la transacción multisig");
  return hex;
}

/** Lo que paga una transacción multisig (para verificarla antes de firmar). */
export async function describeSpend(wallet, multisigTxHex) {
  const set = await wallet.describeMultisigTxSet(multisigTxHex);
  const txs = set.getTxs() ?? [];
  const outputs = [];
  let fee = 0n;
  for (const tx of txs) {
    fee += BigInt(tx.getFee() ?? 0n);
    for (const d of tx.getOutgoingTransfer()?.getDestinations() ?? []) {
      outputs.push({ address: d.getAddress(), amount: BigInt(d.getAmount()) });
    }
  }
  return { txCount: txs.length, outputs, fee };
}

/** Segunda firma y envío a la red. → txids */
export async function signAndSubmit(wallet, multisigTxHex) {
  const signed = await wallet.signMultisigTxHex(multisigTxHex);
  const hex = signed.getSignedMultisigTxHex();
  if (!hex) throw new Error("no se pudo firmar la transacción multisig");
  return wallet.submitMultisigTxHex(hex);
}
