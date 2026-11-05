import moneroTs from "monero-ts";
import { describe, expect, it } from "vitest";
import { formatXmr, parseXmr } from "../src/core/amount";
import { isValidAddress, lookalikeOf, parseAddress } from "../src/core/monero-address";
import { createVault, deriveKey, newKdf, open, openJson, passwordScore, seal, sealJson, unlockVault } from "../src/core/vault";

// Parámetros bajos SOLO para que las pruebas sean rápidas; la extensión usa DEFAULT_KDF.
const FAST = { name: "argon2id" as const, m: 19456, t: 2, p: 1 };

describe("bóveda", () => {
  it("cifra y descifra con la contraseña correcta", async () => {
    const { file, key } = await createVault("contraseña larga 123", { seed: "abc" }, FAST);
    expect(file.vault.ct).not.toContain("abc");
    const r = await unlockVault<{ seed: string }>("contraseña larga 123", file);
    expect(r.secret.seed).toBe("abc");
    expect(Array.from(r.key)).toEqual(Array.from(key));
  });

  it("falla con contraseña incorrecta", async () => {
    const { file } = await createVault("contraseña larga 123", { seed: "abc" }, FAST);
    await expect(unlockVault("otra contraseña 456", file)).rejects.toThrow("Contraseña incorrecta");
  });

  it("rechaza contraseñas cortas", async () => {
    await expect(createVault("corta", {}, FAST)).rejects.toThrow();
  });

  it("detecta blobs modificados y de otro propósito", async () => {
    const key = await deriveKey("contraseña larga 123", newKdf(FAST));
    const s = seal(key, "cache", new Uint8Array([1, 2, 3]));
    expect(Array.from(open(key, "cache", s))).toEqual([1, 2, 3]);
    expect(() => open(key, "vault", { ...s, purpose: "vault" })).toThrow();
    const ct = atob(s.ct);
    const tampered = btoa(String.fromCharCode(ct.charCodeAt(0) ^ 1) + ct.slice(1));
    expect(() => open(key, "cache", { ...s, ct: tampered })).toThrow();
    expect(openJson(key, "x", sealJson(key, "x", { a: 1 }))).toEqual({ a: 1 });
  });

  it("rechaza parámetros de KDF debilitados", async () => {
    await expect(deriveKey("x", { name: "argon2id", m: 1024, t: 1, p: 1, salt: "AAAA" })).rejects.toThrow();
  });

  it("puntúa contraseñas", () => {
    expect(passwordScore("1234567890")).toBe(0);
    expect(passwordScore("Caballo-Bateria-9-Grapa")).toBe(4);
  });
});

describe("direcciones Monero", () => {
  it("valida direcciones reales de cada red y tipo", async () => {
    for (const [net, type] of [
      ["mainnet", moneroTs.MoneroNetworkType.MAINNET],
      ["stagenet", moneroTs.MoneroNetworkType.STAGENET],
    ] as const) {
      const w = await moneroTs.createWalletKeys({ networkType: type, language: "English" });
      const primary = await w.getPrimaryAddress();
      const sub = await w.getAddress(0, 1);
      const integrated = (await moneroTs.MoneroUtils.getIntegratedAddress(type, primary)).getIntegratedAddress();
      expect(parseAddress(primary)).toEqual({ network: net, kind: "standard" });
      expect(parseAddress(sub)).toEqual({ network: net, kind: "subaddress" });
      expect(parseAddress(integrated)).toEqual({ network: net, kind: "integrated" });
      expect(isValidAddress(primary, net)).toBe(true);
      expect(isValidAddress(primary, net === "mainnet" ? "stagenet" : "mainnet")).toBe(false);
      // Un carácter cambiado rompe el checksum.
      const i = 40;
      const swapped = primary.slice(0, i) + (primary[i] === "A" ? "B" : "A") + primary.slice(i + 1);
      expect(isValidAddress(swapped, net)).toBe(false);
    }
  }, 60_000);

  it("rechaza basura", () => {
    expect(isValidAddress("", "mainnet")).toBe(false);
    expect(isValidAddress("0x63261e0810aad5a0367a286fb963405436fc8847", "mainnet")).toBe(false);
    expect(isValidAddress("4".repeat(95), "mainnet")).toBe(false);
  });

  it("detecta direcciones parecidas", () => {
    const real = "8AbCdEf" + "x".repeat(81) + "ZyXwVu1";
    const fake = "8AbCdEf" + "y".repeat(81) + "ZyXwVu1";
    expect(lookalikeOf(fake, [real])).toBe(real);
    expect(lookalikeOf(real, [real])).toBeNull();
    expect(lookalikeOf("4" + "z".repeat(94), [real])).toBeNull();
  });
});

describe("montos", () => {
  it("convierte XMR a piconero y de vuelta", () => {
    expect(parseXmr("1.5")).toBe(1_500_000_000_000n);
    expect(parseXmr("0,000000000001")).toBe(1n);
    expect(parseXmr(".25")).toBe(250_000_000_000n);
    expect(formatXmr(1_500_000_000_000n)).toBe("1.5");
    expect(formatXmr(123_456_789_012_345n, 4)).toBe("123.4567");
    expect(formatXmr(0n)).toBe("0");
  });
  it("rechaza montos inválidos", () => {
    for (const s of ["", ".", "abc", "1.0000000000001", "-1", "0", "1e5"]) expect(() => parseXmr(s)).toThrow();
  });
});

import { pack, unpack } from "../src/core/blobstore";
describe("empaquetado del caché", () => {
  it("empaqueta y desempaqueta partes binarias", () => {
    const parts = [new Uint8Array([1, 2, 3]), new Uint8Array(0), new Uint8Array(1000).fill(7)];
    const out = unpack(pack(parts));
    expect(out.map((p) => Array.from(p))).toEqual(parts.map((p) => Array.from(p)));
    expect(() => unpack(new Uint8Array([0, 0, 0, 1, 0, 0, 0, 9, 1]))).toThrow();
  });
});
