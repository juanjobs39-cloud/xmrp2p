// Arma un escrow 2 de 3 con tres wallets de stagenet nuevas (sin red ni fondos) y comprueba que las
// tres llegan a la misma dirección. Las semillas se generan en cada corrida y se descartan.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import moneroTs from "monero-ts";
import { advance, MAX_ROUNDS, prepare } from "../src/multisig.mjs";

const newWallet = async () =>
  moneroTs.createWalletFull({ networkType: moneroTs.MoneroNetworkType.STAGENET, password: "x" + crypto.randomUUID(), server: undefined });

test("escrow 2 de 3: comprador, vendedor y árbitro llegan a la misma dirección", { timeout: 240_000 }, async () => {
  const names = ["buyer", "seller", "arbiter"];
  const wallets = await Promise.all(names.map(newWallet));
  const pw = await Promise.all(wallets.map(() => "")); // la contraseña no se usa más allá de la wallet en memoria
  try {
    let hexes = await Promise.all(wallets.map(prepare));
    let done = [false, false, false];
    let addresses = [];
    let rounds = 0;
    for (let round = 1; round <= MAX_ROUNDS && !done.every(Boolean); round++) {
      rounds = round;
      const results = await Promise.all(
        wallets.map((w, i) => (done[i] ? null : advance(w, round, hexes.filter((_, j) => j !== i), pw[i]))),
      );
      results.forEach((r, i) => {
        if (!r) return;
        if (r.done) {
          done[i] = true;
          addresses[i] = r.address;
        }
        if (r.hex) hexes[i] = r.hex;
      });
    }
    assert.ok(done.every(Boolean), "no todas las wallets quedaron listas");
    assert.equal(new Set(addresses).size, 1, "las direcciones no coinciden");
    assert.match(addresses[0], /^5/, "debe ser una dirección de stagenet");
    for (const w of wallets) {
      const info = await w.getMultisigInfo();
      assert.equal(info.getThreshold(), 2);
      assert.equal(info.getNumParticipants(), 3);
    }
    console.log(`escrow listo en ${rounds} rondas: ${addresses[0].slice(0, 12)}…`);
  } finally {
    await Promise.all(wallets.map((w) => w.close()));
  }
});

// monero-ts deja hilos de trabajo abiertos: se cierra el proceso al terminar para que la prueba no quede colgada.
after(() => setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref());
