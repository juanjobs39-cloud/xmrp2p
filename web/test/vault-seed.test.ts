import assert from "node:assert/strict";
import { test } from "node:test";
import { addSeed, newVault, vaultFromSeed } from "../src/p2p/vault-seed.ts";
import { privateKeyToAccount } from "viem/accounts";
import { evmAddress, identityKey } from "../src/p2p/wallets.ts";
const account = (v: { key: `0x${string}` }) => privateKeyToAccount(v.key);

const TEST = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

test("cuenta vieja: agregar la semilla no cambia su identidad", () => {
  const v = newVault("stagenet"); // como se creaban antes de las wallets: llave al azar, sin semilla
  assert.equal(v.seed, undefined);
  const key = v.key;
  const id = account(v).address;

  addSeed(v, 2_249_000);
  assert.equal(v.key, key, "la llave de la cuenta no cambia");
  assert.equal(account(v).address, id, "el usuario sigue siendo el mismo");
  assert.equal(v.seed!.split(" ").length, 12);
  assert.equal(v.keyFromSeed, false, "sus 12 palabras no bastan para recuperar la cuenta");
  assert.equal(v.xmrHeight, 2_249_000);
  assert.notEqual(identityKey(v.seed!), key);
});

test("agregar la semilla dos veces no la reemplaza (no se pierden fondos)", () => {
  const v = newVault("stagenet");
  addSeed(v, 100);
  const seed = v.seed;
  const wallet = evmAddress(seed!);
  addSeed(v, 999);
  assert.equal(v.seed, seed);
  assert.equal(v.xmrHeight, 100);
  assert.equal(evmAddress(v.seed!), wallet);
});

test("cuenta nueva con wallets: la llave sale de la semilla", () => {
  const v = newVault("mainnet", true);
  assert.equal(v.keyFromSeed, true);
  assert.equal(v.key, identityKey(v.seed!));
  assert.deepEqual(v.methods, []);
  assert.deepEqual(v.escrows, {});
});

test("recuperar con 12 palabras da siempre la misma cuenta", () => {
  const a = vaultFromSeed("mainnet", TEST, 3_805_000);
  const b = vaultFromSeed("mainnet", "  " + TEST.toUpperCase() + " ");
  assert.equal(a.key, b.key);
  assert.equal(a.seed, TEST);
  assert.equal(a.xmrHeight, 3_805_000);
  assert.equal(b.xmrHeight, undefined);
  assert.throws(() => vaultFromSeed("mainnet", "no son doce palabras"));
});
