/**
 * Encuentra la wallet del navegador. Con varias extensiones instaladas, `window.ethereum` puede no
 * ser MetaMask y las solicitudes se quedan esperando sin abrir ninguna ventana (hallazgo de la beta).
 * Por eso se pide la lista de wallets (EIP-6963) y se prefiere MoneroP2P Wallet y luego MetaMask.
 */
export interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export async function findProvider(): Promise<Eip1193 | null> {
  const found: { info: { rdns: string; name: string }; provider: Eip1193 }[] = [];
  const on = (e: Event) => found.push((e as CustomEvent).detail);
  window.addEventListener("eip6963:announceProvider", on);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((r) => setTimeout(r, 300));
  window.removeEventListener("eip6963:announceProvider", on);
  // MoneroP2P Wallet primero (si está instalada, es la que el usuario eligió para este sitio); luego MetaMask.
  const mm = found.find((p) => p.info?.rdns === "app.monerop2p.wallet") ?? found.find((p) => p.info?.rdns === "io.metamask") ?? found[0];
  if (mm) console.info("[wallet] usando", mm.info?.name, "de", found.map((p) => p.info?.name).join(", "));
  return mm?.provider ?? (globalThis as { ethereum?: Eip1193 }).ethereum ?? null;
}

/** Espera una respuesta de la wallet con límite de tiempo (la ventana pudo no abrirse). */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<never>((_, rej) => (timer = setTimeout(() => rej(new Error(message)), ms)))]).finally(() =>
    clearTimeout(timer),
  );
}

/** API que inyecta la extensión MoneroP2P Wallet en monerop2p.app y fiat.monerop2p.app. */
export interface MoneroP2PWallet {
  version: number;
  getNetwork(): Promise<"mainnet" | "stagenet" | null>;
  getAddress(): Promise<string>;
  requestTransfer(p: { address: string; amount: string }): Promise<{ txid: string }>;
}

export function moneroWallet(): MoneroP2PWallet | null {
  return (globalThis as { moneroP2P?: MoneroP2PWallet }).moneroP2P ?? null;
}

/**
 * Botón «Usar MoneroP2P Wallet» junto a un campo de dirección de Monero. Solo aparece si la extensión
 * está instalada y su red coincide con la del sitio; al hacer clic, la wallet pide aprobación y llena el campo.
 */
export async function walletAddressButton(input: HTMLInputElement, network: "mainnet" | "stagenet", label: string, onError: (m: string) => void): Promise<HTMLButtonElement | null> {
  const w = moneroWallet();
  if (!w) return null;
  const net = await w.getNetwork().catch(() => null);
  if (net !== network) return null;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn secondary small wallet-fill";
  b.textContent = label;
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      input.value = await w.getAddress();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
      if ((e as { code?: number }).code !== 4001) onError(e instanceof Error ? e.message : String(e));
    } finally {
      b.disabled = false;
    }
  });
  return b;
}
