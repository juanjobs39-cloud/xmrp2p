import { describe, expect, it } from "vitest";
import { cleanAmount, findCoin, prune, stepOf, SWAP_COINS, type SwapRef } from "../src/core/swap";

describe("swaps (Trocador)", () => {
  it("acepta montos con punto o coma y rechaza el resto", () => {
    expect(cleanAmount(" 50 ")).toBe("50");
    expect(cleanAmount("0,25")).toBe("0.25");
    expect(cleanAmount("0")).toBeNull();
    expect(cleanAmount("-1")).toBeNull();
    expect(cleanAmount("1e5")).toBeNull();
    expect(cleanAmount("abc")).toBeNull();
  });

  it("barra de pasos según el estado", () => {
    expect(stepOf("waiting")).toBe(0);
    expect(stepOf("confirming")).toBe(1);
    expect(stepOf("SENDING")).toBe(2);
    expect(stepOf("finished")).toBe(4);
  });

  it("limpia la lista: terminados de más de 24 h y cualquiera de más de 7 días", () => {
    const now = 10 * 86_400_000;
    const r = (id: string, ageH: number, status: string): SwapRef => ({ id, side: "buy", ticker: "usdt", network: "Arbitrum", amount: "10", at: now - ageH * 3600_000, status });
    const out = prune([r("a", 1, "finished"), r("b", 25, "finished"), r("c", 25, "confirming"), r("d", 24 * 8, "waiting")], now);
    expect(out.map((x) => x.id)).toEqual(["a", "c"]);
  });

  it("solo USDT y ETH de Arbitrum se pagan desde la wallet", () => {
    expect(SWAP_COINS.filter((c) => c.arb).map((c) => `${c.ticker}.${c.network}`)).toEqual(["usdt.Arbitrum", "eth.Arbitrum"]);
    expect(findCoin("btc", "Mainnet")?.arb).toBeUndefined();
  });
});
