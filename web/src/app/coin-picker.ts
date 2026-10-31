/**
 * Selector de moneda con buscador (fuera del cuadro de cantidad). Muestra primero las populares;
 * al escribir busca en la lista completa de Trocador, que se pide al servidor la primera vez que
 * se abre el selector (el servidor la guarda un día: no cuesta peticiones extra a Trocador).
 */
import { api } from "./api";
import { API_URL } from "./config";
import { COINS, coinId, iconEl, type Coin } from "./coins";

const POPULAR = new Set(COINS.map(coinId));
let full: Coin[] | null = null;
let loading = false;

function rank(c: Coin, s: string): number {
  const t = c.ticker.toLowerCase();
  return (t === s ? 0 : t.startsWith(s) ? 1 : 2) * 10 + (POPULAR.has(coinId(c)) ? 0 : 1);
}

export function mountCoinPicker(onPick: (c: Coin) => void): void {
  const box = document.querySelector<HTMLElement>(".coin-pick");
  const btn = document.getElementById("coin-btn") as HTMLButtonElement | null;
  const panel = document.getElementById("coin-panel");
  const search = document.getElementById("coin-search") as HTMLInputElement | null;
  const list = document.getElementById("coin-list");
  const hint = document.getElementById("coin-hint");
  if (!box || !btn || !panel || !search || !list || !hint) return;
  const none = list.dataset.none ?? "No match";

  const render = (q: string) => {
    const s = q.trim().toLowerCase();
    const items = !s
      ? COINS
      : (full ?? COINS)
          .filter((c) => c.ticker.toLowerCase().includes(s) || c.label.toLowerCase().includes(s) || c.network.toLowerCase().includes(s))
          .sort((a, b) => rank(a, s) - rank(b, s))
          .slice(0, 60);
    hint.hidden = !!s;
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "meta";
      li.textContent = none;
      list.replaceChildren(li);
      return;
    }
    list.replaceChildren(
      ...items.map((c) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "coin-opt";
        const tk = document.createElement("strong");
        tk.textContent = c.ticker.toUpperCase();
        const nm = document.createElement("span");
        nm.textContent = c.label.split(" · ")[1] ?? c.network;
        b.append(iconEl(c.ticker, c.img, API_URL), tk, nm);
        b.addEventListener("click", () => {
          onPick(c);
          close();
          btn.focus();
        });
        li.append(b);
        return li;
      }),
    );
  };

  const close = () => {
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    search.value = "";
    render("");
    search.focus();
    if (full || loading) return;
    loading = true;
    api.trocadorCoins().then(
      (cs) => {
        full = [
          ...COINS,
          ...cs.filter((c) => !POPULAR.has(coinId(c))).map((c) => ({ ticker: c.ticker, network: c.network, label: `${c.ticker.toUpperCase()} · ${c.name}`, img: c.img || undefined, memo: c.memo })),
        ];
        if (!panel.hidden && search.value) render(search.value);
      },
      () => (loading = false),
    );
  };

  btn.addEventListener("click", () => (panel.hidden ? open() : close()));
  search.addEventListener("input", () => render(search.value));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      btn.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      list.querySelector<HTMLButtonElement>("button")?.click();
    }
  });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !(e.target as Element).closest(".coin-pick")) close();
  });
}
