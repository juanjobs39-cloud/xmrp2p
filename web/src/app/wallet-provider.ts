/**
 * Encuentra la wallet del navegador. Con varias extensiones instaladas, `window.ethereum` puede no
 * ser MetaMask y las solicitudes se quedan esperando sin abrir ninguna ventana (hallazgo de la beta).
 * Por eso se pide la lista de wallets (EIP-6963) y se prefiere MetaMask por su identificador.
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
  const mm = found.find((p) => p.info?.rdns === "io.metamask") ?? found[0];
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
