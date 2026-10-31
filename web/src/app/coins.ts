/**
 * Monedas que el usuario puede enviar para recibir XMR. USDT en Arbitrum One va por los makers de
 * MoneroP2P (sin custodia); las demás, por exchanges instantáneos vía Trocador.
 * Ticker y red con los nombres de Trocador. Estas son las populares; el buscador agrega el resto (/v1/trocador/coins).
 */
export interface Coin {
  ticker: string;
  network: string;
  /** Texto del selector, p. ej. «USDT · Arbitrum One». */
  label: string;
  /** Red compatible con EVM: la dirección de reembolso es 0x… (solo en las populares). */
  evm?: boolean;
  /** URL del ícono en el sitio de origen (monedas que no son populares). */
  img?: string;
}

export const COINS: Coin[] = [
  { ticker: "usdt", network: "Arbitrum", label: "USDT · Arbitrum One", evm: true },
  { ticker: "btc", network: "Mainnet", label: "BTC · Bitcoin", evm: false },
  { ticker: "btc", network: "Lightning", label: "BTC · Lightning", evm: false },
  { ticker: "eth", network: "ERC20", label: "ETH · Ethereum", evm: true },
  { ticker: "eth", network: "Arbitrum", label: "ETH · Arbitrum One", evm: true },
  { ticker: "eth", network: "base", label: "ETH · Base", evm: true },
  { ticker: "usdt", network: "TRC20", label: "USDT · Tron (TRC20)", evm: false },
  { ticker: "usdt", network: "ERC20", label: "USDT · Ethereum (ERC20)", evm: true },
  { ticker: "usdt", network: "BEP20", label: "USDT · BNB Chain (BEP20)", evm: true },
  { ticker: "usdt", network: "SOL", label: "USDT · Solana", evm: false },
  { ticker: "usdc", network: "ERC20", label: "USDC · Ethereum", evm: true },
  { ticker: "usdc", network: "Arbitrum", label: "USDC · Arbitrum One", evm: true },
  { ticker: "usdc", network: "base", label: "USDC · Base", evm: true },
  { ticker: "usdc", network: "SOL", label: "USDC · Solana", evm: false },
  { ticker: "sol", network: "Mainnet", label: "SOL · Solana", evm: false },
  { ticker: "bnb", network: "BEP20", label: "BNB · BNB Chain", evm: true },
  { ticker: "ltc", network: "Mainnet", label: "LTC · Litecoin", evm: false },
  { ticker: "trx", network: "Mainnet", label: "TRX · Tron", evm: false },
  { ticker: "doge", network: "Mainnet", label: "DOGE · Dogecoin", evm: false },
  { ticker: "bch", network: "Mainnet", label: "BCH · Bitcoin Cash", evm: false },
  { ticker: "dash", network: "Mainnet", label: "DASH · Dash", evm: false },
  { ticker: "dai", network: "ERC20", label: "DAI · Ethereum", evm: true },
];

export const coinId = (c: Pick<Coin, "ticker" | "network">): string => `${c.ticker}|${c.network}`;
export const DEFAULT_COIN = coinId(COINS[0]!);
export const coinById = (id: string): Coin => COINS.find((c) => coinId(c) === id) ?? COINS[0]!;
/** Nombre de la red para el texto de depósito («Arbitrum One», «Bitcoin»…). */
export const networkName = (c: Coin): string => c.label.split(" · ")[1] ?? c.network;

/** Íconos guardados en el propio sitio (public/coins). */
const LOCAL_ICONS = new Set(["btc", "eth", "usdt", "usdc", "sol", "bnb", "ltc", "trx", "doge", "bch", "dash", "dai", "xmr"]);

/** Ícono como elemento: local, a través de nuestra API, o un círculo con la inicial si no hay. */
export function iconEl(ticker: string, remote: string | undefined, apiUrl: string, size = 22): HTMLElement {
  const t = ticker.toLowerCase();
  const src = LOCAL_ICONS.has(t) ? `/coins/${t}.svg` : remote && apiUrl ? `${apiUrl}/v1/trocador/img?u=${encodeURIComponent(remote)}` : "";
  const fallback = () => {
    const s = document.createElement("span");
    s.className = "coin-ico coin-ico-txt";
    s.textContent = t.slice(0, 1).toUpperCase();
    s.style.setProperty("--s", `${size}px`);
    return s;
  };
  if (!src) return fallback();
  const img = document.createElement("img");
  img.className = "coin-ico";
  img.src = src;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => img.replaceWith(fallback()), { once: true });
  return img;
}
