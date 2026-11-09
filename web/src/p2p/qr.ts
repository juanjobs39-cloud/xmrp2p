/** Código QR en SVG (sin innerHTML ni imágenes externas), para escanear el depósito con otra wallet. */
import qrcode from "qrcode-generator";

export function qrSvg(text: string, label: string): SVGSVGElement {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  const pad = 4;
  const size = n + pad * 2;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "p2p-qr");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  svg.setAttribute("shape-rendering", "crispEdges");
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("width", String(size));
  bg.setAttribute("height", String(size));
  bg.setAttribute("fill", "#fff");
  svg.append(bg);
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + pad} ${r + pad}h1v1h-1z`;
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(path);
  return svg;
}

/** URI estándar de Monero: las wallets la abren con la dirección y el monto ya puestos. */
export const moneroUri = (address: string, xmr: string) => `monero:${address}?tx_amount=${encodeURIComponent(xmr)}`;
