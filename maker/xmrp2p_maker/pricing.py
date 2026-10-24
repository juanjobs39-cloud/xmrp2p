"""Cotización USDT → XMR a partir de varias fuentes públicas, con margen del maker.

Reglas: se piden todas las fuentes, se descartan las que fallan, se exige un mínimo de fuentes
y que ninguna se aleje de la mediana más de `max_divergence_bps`. Si no se cumple, no se cotiza.
"""

from __future__ import annotations

import statistics
import time
from dataclasses import dataclass
from decimal import ROUND_DOWN, Decimal
from typing import Callable

import requests

from .config import Limits, PriceConfig

PICONERO = Decimal(10) ** 12
USDT_UNIT = Decimal(10) ** 6


def _kraken(s: requests.Session) -> Decimal:
    r = s.get("https://api.kraken.com/0/public/Ticker", params={"pair": "XMRUSDT"}, timeout=10).json()
    if r.get("error"):
        raise ValueError(r["error"])
    (v,) = r["result"].values()
    return Decimal(v["c"][0])


def _coingecko(s: requests.Session) -> Decimal:
    r = s.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={"ids": "monero", "vs_currencies": "usd"},
        timeout=10,
    ).json()
    return Decimal(str(r["monero"]["usd"]))


def _kucoin(s: requests.Session) -> Decimal:
    r = s.get(
        "https://api.kucoin.com/api/v1/market/orderbook/level1", params={"symbol": "XMR-USDT"}, timeout=10
    ).json()
    return Decimal(r["data"]["price"])


SOURCES: dict[str, Callable[[requests.Session], Decimal]] = {
    "kraken": _kraken,
    "coingecko": _coingecko,
    "kucoin": _kucoin,
}


class PriceError(Exception):
    pass


@dataclass(frozen=True)
class Quote:
    usdt_amount: Decimal
    reference_price: Decimal  # USDT por XMR (mediana)
    maker_price: Decimal  # con margen
    xmr_amount: Decimal
    xmr_atomic: int
    usdt_atomic: int
    expires_at: float
    sources: dict[str, str]


def reference_price(cfg: PriceConfig, fetch: dict[str, Callable[[], Decimal]] | None = None) -> tuple[Decimal, dict[str, str]]:
    session = requests.Session()
    fetchers = fetch or {name: (lambda f=SOURCES[name]: f(session)) for name in cfg.sources}
    prices: dict[str, Decimal] = {}
    for name, f in fetchers.items():
        try:
            p = f()
            if p > 0:
                prices[name] = p
        except Exception:  # una fuente caída no detiene la cotización
            continue
    if len(prices) < cfg.min_sources:
        raise PriceError(f"solo {len(prices)} fuentes respondieron (mínimo {cfg.min_sources})")
    med = Decimal(statistics.median(prices.values()))
    limit = med * cfg.max_divergence_bps / Decimal(10_000)
    outliers = {k: v for k, v in prices.items() if abs(v - med) > limit}
    if outliers:
        raise PriceError(f"fuentes divergentes respecto de la mediana {med}: {outliers}")
    return med, {k: str(v) for k, v in prices.items()}


def quote(
    usdt_amount: Decimal,
    cfg: PriceConfig,
    limits: Limits,
    fetch: dict[str, Callable[[], Decimal]] | None = None,
    now: float | None = None,
) -> Quote:
    if usdt_amount < limits.min_usdt or usdt_amount > limits.max_usdt:
        raise PriceError(f"monto fuera de límites ({limits.min_usdt}–{limits.max_usdt} USDT)")
    ref, src = reference_price(cfg, fetch)
    maker_price = ref * (Decimal(10_000) + cfg.margin_bps) / Decimal(10_000)
    xmr = (usdt_amount / maker_price).quantize(Decimal(1) / PICONERO, rounding=ROUND_DOWN)
    return Quote(
        usdt_amount=usdt_amount,
        reference_price=ref,
        maker_price=maker_price,
        xmr_amount=xmr,
        xmr_atomic=int(xmr * PICONERO),
        usdt_atomic=int(usdt_amount * USDT_UNIT),
        expires_at=(now or time.time()) + cfg.quote_ttl_seconds,
        sources=src,
    )
