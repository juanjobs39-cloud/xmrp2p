/**
 * Carga perezosa del núcleo cripto (WASM propio, verificado) y de monero-ts (empaquetado aparte).
 * La usan la app del taker y la del maker.
 */

export type Crypto = {
  generateKeys(): string;
  verifyCounterparty(msg: string): string;
  sharedAddress(own: string, cp: string, net: string): string;
  recoverWallet(own: string, cp: string, secret: string, net: string): string;
};

// ?v= con la versión que fija el build (scripts/postbuild.mjs): debe coincidir con las claves del import map.
const vendorVersion = () => document.querySelector('meta[name="xmrp2p-vendor-version"]')?.getAttribute("content");
const vendor = (p: string) => {
  const v = vendorVersion();
  return new URL(`../../vendor/${p}${v ? `?v=${v}` : ""}`, location.href).href;
};

let crypto_: Crypto | null = null;
export async function cryptoLib(): Promise<Crypto> {
  if (!crypto_) {
    // El JS lo verifica el import map (integrity); el WASM lo verificamos aquí antes de ejecutarlo.
    const m = await import(/* @vite-ignore */ vendor("crypto/xmrp2p_crypto.js"));
    const bytes = await (await fetch(vendor("crypto/xmrp2p_crypto_bg.wasm"))).arrayBuffer();
    const expected = document.querySelector('meta[name="xmrp2p-wasm-integrity"]')?.getAttribute("content");
    if (expected) {
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-384", bytes));
      const got = "sha384-" + btoa(String.fromCharCode(...digest));
      if (got !== expected) throw new Error("El núcleo criptográfico no coincide con el publicado. No continúes.");
    }
    await m.default({ module_or_path: bytes });
    crypto_ = m as unknown as Crypto;
  }
  return crypto_;
}

export interface MakerWalletInfo {
  address: string;
  height: number;
  balance: string;
  unlocked: string;
}

export type Xmr = {
  init(worker: string): void;
  verifyLock(a: { node: string; network: string; txid: string; txKey: string; address: string }): Promise<{ received: string; confirmations: number; inPool: boolean }>;
  sweep(a: Record<string, unknown>): Promise<{ txids: string[]; alreadySwept?: boolean }>;
  daemonHeight(node: string): Promise<number>;
  // Wallet del maker (una por pestaña).
  makerOpen(a: { node: string; network: string; password: string; seed?: string; restoreHeight?: number; keysData?: Uint8Array; cacheData?: Uint8Array }): Promise<MakerWalletInfo & { seed: string; restoreHeight: number }>;
  makerSync(onProgress?: (pct: number) => void): Promise<MakerWalletInfo>;
  makerData(): Promise<{ keysData: Uint8Array; cacheData: Uint8Array }>;
  makerPrepare(address: string, amount: string): Promise<{ txid: string; txKey: string; metadata: string }>;
  makerRelay(metadata: string): Promise<string>;
  makerConfirmations(txid: string): Promise<number | null>;
  makerSweepTo(address: string): Promise<string[]>;
  makerClose(): Promise<void>;
};

let xmr_: Xmr | null = null;
export async function xmrLib(): Promise<Xmr> {
  if (!xmr_) {
    xmr_ = (await import(/* @vite-ignore */ vendor("xmr/xmr.js"))) as Xmr;
    xmr_.init(vendor("xmr/monero.worker.js"));
  }
  return xmr_;
}
