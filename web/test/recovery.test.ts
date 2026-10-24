import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptRecovery, encryptRecovery } from "../src/app/recovery.ts";

const state = { spend_private: "11".repeat(32), escrow: "0xabc", network: "arbitrum_sepolia" };

test("cifra y descifra el archivo de recuperación", async () => {
  const f = await encryptRecovery(state, "una frase larga y segura", { network: "arbitrum_sepolia" });
  assert.equal(f.format, "xmrp2p-recovery");
  assert.equal(f.kdf.iterations, 600_000);
  assert.ok(!JSON.stringify(f).includes(state.spend_private), "la llave no debe aparecer en claro");
  assert.deepEqual(await decryptRecovery(f, "una frase larga y segura"), state);
});

test("contraseña incorrecta o archivo alterado → error", async () => {
  const f = await encryptRecovery(state, "una frase larga y segura", { network: "x" });
  await assert.rejects(decryptRecovery(f, "otra frase distinta!!"), /contraseña incorrecta/);
  const tampered = { ...f, cipher: { ...f.cipher, data: f.cipher.data.replace(/^./, (c) => (c === "A" ? "B" : "A")) } };
  await assert.rejects(decryptRecovery(tampered, "una frase larga y segura"), /contraseña incorrecta|dañado/);
});

test("exige una contraseña de al menos 10 caracteres", async () => {
  await assert.rejects(encryptRecovery(state, "corta", { network: "x" }), /al menos 10/);
});
