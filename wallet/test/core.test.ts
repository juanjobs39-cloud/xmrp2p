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

import { FEE_ADDRESS, feeFor, splitAll } from "../src/core/fee";
describe("comisión de envío", () => {
  it("cobra 0.25 % y nada en montos diminutos", () => {
    expect(feeFor(1_000_000_000_000n)).toBe(2_500_000_000n); // 1 XMR → 0.0025
    expect(feeFor(1_000_000_000n)).toBe(0n); // 0.001 XMR → 0.0000025 < mínimo
  });
  it("reparte el saldo en enviar todo", () => {
    const { dest, fee } = splitAll(1_002_500_000_000n);
    expect(dest + fee).toBe(1_002_500_000_000n);
    expect(fee).toBe(feeFor(dest));
  });
  it("la dirección de comisiones es de la red principal y válida", () => {
    expect(parseAddress(FEE_ADDRESS.mainnet!).network).toBe("mainnet");
    expect(FEE_ADDRESS.stagenet).toBeNull();
  });
});

import { privateKeyToAccount } from "viem/accounts";
import { deriveEvmKey, formatUnitsShort, isEvmAddress, parseUnitsStrict } from "../src/core/evm";
describe("cuenta de Arbitrum", () => {
  it("HKDF-SHA256 coincide con un cálculo independiente (Python hmac)", () => {
    expect(deriveEvmKey("01".repeat(32))).toBe("0xa61ddfd475dc3bce1aeca696abe29b41bf64db96ed5abe674f48d258e35b97f5");
  });
  it("misma semilla, misma cuenta; otra semilla, otra cuenta", async () => {
    const mk = async () => {
      const w = await moneroTs.createWalletKeys({ networkType: moneroTs.MoneroNetworkType.STAGENET, language: "English" });
      const seed = await w.getSeed();
      const k = await w.getPrivateSpendKey();
      await w.close();
      return { seed, k };
    };
    const a = await mk();
    const again = await moneroTs.createWalletKeys({ networkType: moneroTs.MoneroNetworkType.STAGENET, seed: a.seed });
    const k2 = await again.getPrivateSpendKey();
    await again.close();
    expect(deriveEvmKey(k2)).toBe(deriveEvmKey(a.k));
    const b = await mk();
    const acct = privateKeyToAccount(deriveEvmKey(a.k));
    expect(isEvmAddress(acct.address)).toBe(true);
    expect(privateKeyToAccount(deriveEvmKey(b.k)).address).not.toBe(acct.address);
  }, 60_000);
  it("rechaza llaves mal formadas", () => {
    expect(() => deriveEvmKey("zz")).toThrow();
  });
  it("unidades", () => {
    expect(parseUnitsStrict("1.5", 6)).toBe(1_500_000n);
    expect(parseUnitsStrict("0,25", 6)).toBe(250_000n);
    expect(() => parseUnitsStrict("1.1234567", 6)).toThrow();
    expect(() => parseUnitsStrict("0", 6)).toThrow();
    expect(formatUnitsShort(1_500_000n, 6)).toBe("1.5");
    expect(formatUnitsShort(10n ** 18n, 18)).toBe("1");
  });
});

import { allowedOrigin, checkPiconero, checkTx, checkTypedData } from "../src/core/provider";
describe("reglas del proveedor", () => {
  const me = "0x1111111111111111111111111111111111111111";
  it("solo los sitios de MoneroP2P", () => {
    expect(allowedOrigin("https://monerop2p.app")).toBe(true);
    expect(allowedOrigin("https://fiat.monerop2p.app")).toBe(true);
    expect(allowedOrigin("https://monerop2p.app.evil.com")).toBe(false);
    expect(allowedOrigin("http://monerop2p.app")).toBe(false);
  });
  it("valida transacciones", () => {
    const to = "0x2222222222222222222222222222222222222222";
    expect(checkTx({ from: me, to, data: "0xabcd", value: "0x0" }, me).to).toBe(to);
    expect(() => checkTx({ from: to, to }, me)).toThrow(/from/);
    expect(() => checkTx({ from: me, data: "0x60" }, me)).toThrow(/contratos/);
    expect(() => checkTx({ from: me, to, data: "0xabc" }, me)).toThrow();
    expect(() => checkTx({ from: me, to, value: "1000" }, me)).toThrow();
  });
  it("valida datos tipados y su red", () => {
    const d = { types: { Permit: [] }, domain: { chainId: 42161 }, primaryType: "Permit", message: {} };
    expect(checkTypedData([me, JSON.stringify(d)], me, 42161).data.primaryType).toBe("Permit");
    expect(() => checkTypedData([me, JSON.stringify(d)], me, 421614)).toThrow();
    expect(() => checkTypedData(["0x3333333333333333333333333333333333333333", d], me, 42161)).toThrow();
  });
  it("montos de XMR en piconero", () => {
    expect(checkPiconero("1000")).toBe(1000n);
    expect(() => checkPiconero("0")).toThrow();
    expect(() => checkPiconero(1000)).toThrow();
    expect(() => checkPiconero("-5")).toThrow();
  });
});
