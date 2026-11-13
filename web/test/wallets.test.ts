import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSeed, evmAddress, evmKey, identityKey, moneroSpendKey, newSeed, scReduce32 } from "../src/p2p/wallets.ts";

// Semilla de prueba pública de BIP-39 (nunca usarla con fondos).
const TEST = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

test("la cuenta tipo Ethereum es la estándar de BIP-44 (igual que MetaMask)", () => {
  assert.equal(evmAddress(TEST), "0x9858EfFD232B4033E47d90003D41EC34EcaEda94");
  assert.equal(evmKey(TEST), "0x1ab42cc412b618bdea3a599e3c9bae199ebf030895b039e9db1e30dafb12b727");
});

test("la llave de la cuenta es distinta de la que guarda fondos", () => {
  assert.notEqual(identityKey(TEST), evmKey(TEST));
  assert.match(identityKey(TEST), /^0x[0-9a-f]{64}$/);
});

test("la derivación es determinista y no depende de espacios ni mayúsculas", () => {
  const sloppy = "  " + TEST.toUpperCase().replace(/ /g, "   ") + "\n";
  assert.equal(evmAddress(sloppy), evmAddress(TEST));
  assert.equal(moneroSpendKey(sloppy), moneroSpendKey(TEST));
  assert.equal(identityKey(sloppy), identityKey(TEST));
});

test("la llave de Monero es un escalar válido (menor que ℓ) y estable", () => {
  const k = moneroSpendKey(TEST);
  assert.match(k, /^[0-9a-f]{64}$/);
  // little-endian → número
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(parseInt(k.slice(i * 2, i * 2 + 2), 16));
  const L = 2n ** 252n + 27742317777372353535851937790883648493n;
  assert.ok(n > 0n && n < L);
  assert.equal(moneroSpendKey(TEST), k);
});

test("scReduce32 reduce módulo ℓ y deja igual lo que ya es menor", () => {
  const one = new Uint8Array(32);
  one[0] = 1;
  assert.deepEqual(scReduce32(one), one);
  // ℓ en little-endian se reduce a 0
  const L = 2n ** 252n + 27742317777372353535851937790883648493n;
  const l = new Uint8Array(32);
  let n = L;
  for (let i = 0; i < 32; i++) {
    l[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  assert.deepEqual(scReduce32(l), new Uint8Array(32));
  // 0xff…ff es mayor que ℓ: el resultado debe ser menor
  const r = scReduce32(new Uint8Array(32).fill(255));
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(r[i]!);
  assert.ok(v < L);
  assert.throws(() => scReduce32(new Uint8Array(31)));
});

test("semillas nuevas: 12 palabras válidas y distintas cada vez", () => {
  const a = newSeed();
  const b = newSeed();
  assert.equal(a.split(" ").length, 12);
  assert.notEqual(a, b);
  assert.equal(cleanSeed(a), a);
});

test("rechaza semillas mal escritas", () => {
  assert.throws(() => cleanSeed("abandon abandon"), /12 palabras/);
  assert.throws(() => cleanSeed(TEST.replace("about", "abouty")), /palabra desconocida/);
});

import { formatAmount, parseAmount } from "../src/p2p/wallets.ts";

test("montos: de texto a unidades mínimas sin redondear nunca", () => {
  assert.equal(parseAmount("1.5", 12), 1_500_000_000_000n);
  assert.equal(parseAmount("0,25", 6), 250_000n);
  assert.equal(parseAmount(" 10 ", 6), 10_000_000n);
  assert.equal(parseAmount("0.000000000001", 12), 1n);
  for (const bad of ["", "0", "0.0", "-1", "1e3", "1.2.3", "abc", "1.0000001"]) assert.throws(() => parseAmount(bad, 6), Error, bad);
});

test("montos: de unidades mínimas a texto, truncando", () => {
  assert.equal(formatAmount(1_500_000_000_000n, 12), "1.5");
  assert.equal(formatAmount(1n, 12), "0.000000000001");
  assert.equal(formatAmount(1_999_999n, 6, 2), "1.99");
  assert.equal(formatAmount(0n, 18, 6), "0");
  assert.equal(formatAmount(parseAmount("123.456789", 6), 6), "123.456789");
});
