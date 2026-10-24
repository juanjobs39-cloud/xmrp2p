"""Configuración del maker. Se lee de un TOML; los secretos vienen de variables de entorno."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

if sys.version_info >= (3, 11):
    import tomllib
else:  # pragma: no cover
    import tomli as tomllib


@dataclass(frozen=True)
class PriceConfig:
    sources: tuple[str, ...] = ("kraken", "coingecko", "kucoin")
    margin_bps: int = 150  # spread del maker sobre el precio de referencia
    max_divergence_bps: int = 200  # las fuentes no pueden diferir más que esto de la mediana
    min_sources: int = 2
    quote_ttl_seconds: int = 120


@dataclass(frozen=True)
class Limits:
    min_usdt: Decimal = Decimal("10")
    max_usdt: Decimal = Decimal("1000")
    max_exposure_xmr: Decimal = Decimal("5")  # XMR bloqueado en swaps abiertos, como máximo
    max_concurrent: int = 3


@dataclass(frozen=True)
class Safety:
    # Tiempo mínimo entre ver el depósito y t0: bloquear XMR + confirmaciones + margen.
    min_time_to_t0: int = 45 * 60
    # Ventana mínima entre t0 y t1 para poder reclamar.
    min_claim_window: int = 60 * 60
    # Nunca enviar `claim` a menos de este tiempo de t1: una tx fallida revelaría s_b.
    claim_cutoff_before_t1: int = 15 * 60
    # Si el taker no deposita en este tiempo, la negociación expira.
    deposit_timeout: int = 15 * 60
    xmr_confirmations: int = 10


@dataclass(frozen=True)
class MakerConfig:
    evm_rpc: str
    factory: str
    token: str
    fee_bps: int
    monero_network: str
    monero_wallet_rpc: str
    monero_main_wallet: str
    db_path: Path
    crypto_bin: Path
    payout_address: str | None = None
    poll_seconds: int = 15
    price: PriceConfig = field(default_factory=PriceConfig)
    limits: Limits = field(default_factory=Limits)
    safety: Safety = field(default_factory=Safety)

    # Secretos: solo desde el entorno, nunca desde el archivo.
    @property
    def evm_private_key(self) -> str:
        key = os.environ.get("MAKER_EVM_PRIVATE_KEY", "")
        if not key:
            raise RuntimeError("Falta MAKER_EVM_PRIVATE_KEY (llave de la cuenta del maker; solo testnet)")
        return key

    @property
    def monero_rpc_auth(self) -> tuple[str, str] | None:
        user = os.environ.get("MONERO_WALLET_RPC_USER")
        return (user, os.environ.get("MONERO_WALLET_RPC_PASSWORD", "")) if user else None

    @property
    def monero_main_wallet_password(self) -> str:
        return os.environ.get("MONERO_MAIN_WALLET_PASSWORD", "")

    def validate(self) -> None:
        if self.monero_network == "mainnet":
            raise ValueError("mainnet está bloqueado hasta la auditoría (docs/MAINNET.md)")
        if self.monero_network not in ("stagenet", "testnet"):
            raise ValueError(f"red de Monero desconocida: {self.monero_network}")
        if not 0 <= self.fee_bps <= 100:
            raise ValueError("fee_bps fuera del tope del contrato (0–100)")
        if self.limits.min_usdt <= 0 or self.limits.max_usdt < self.limits.min_usdt:
            raise ValueError("límites de monto inválidos")
        if self.safety.claim_cutoff_before_t1 >= self.safety.min_claim_window:
            raise ValueError("claim_cutoff_before_t1 debe ser menor que min_claim_window")


def load(path: str | Path) -> MakerConfig:
    path = Path(path)
    raw = tomllib.loads(path.read_text(encoding="utf-8"))
    m = raw["maker"]
    base = path.parent

    def dec(d: dict, k: str, default: Decimal) -> Decimal:
        return Decimal(str(d[k])) if k in d else default

    p, lim, s = m.get("price", {}), m.get("limits", {}), m.get("safety", {})
    cfg = MakerConfig(
        evm_rpc=m["evm_rpc"],
        factory=m["factory"],
        token=m["token"],
        fee_bps=int(m["fee_bps"]),
        monero_network=m.get("monero_network", "stagenet"),
        monero_wallet_rpc=m["monero_wallet_rpc"],
        monero_main_wallet=m.get("monero_main_wallet", "maker"),
        db_path=(base / m.get("db_path", "maker.sqlite3")).resolve(),
        crypto_bin=(base / m["crypto_bin"]).resolve(),
        payout_address=m.get("payout_address") or None,
        poll_seconds=int(m.get("poll_seconds", 15)),
        price=PriceConfig(
            sources=tuple(p.get("sources", PriceConfig.sources)),
            margin_bps=int(p.get("margin_bps", PriceConfig.margin_bps)),
            max_divergence_bps=int(p.get("max_divergence_bps", PriceConfig.max_divergence_bps)),
            min_sources=int(p.get("min_sources", PriceConfig.min_sources)),
            quote_ttl_seconds=int(p.get("quote_ttl_seconds", PriceConfig.quote_ttl_seconds)),
        ),
        limits=Limits(
            min_usdt=dec(lim, "min_usdt", Limits.min_usdt),
            max_usdt=dec(lim, "max_usdt", Limits.max_usdt),
            max_exposure_xmr=dec(lim, "max_exposure_xmr", Limits.max_exposure_xmr),
            max_concurrent=int(lim.get("max_concurrent", Limits.max_concurrent)),
        ),
        safety=Safety(**{k: int(v) for k, v in s.items()}),
    )
    cfg.validate()
    return cfg
