"""Línea de comandos del maker.

  python -m xmrp2p_maker --config maker.toml quote 50
  python -m xmrp2p_maker --config maker.toml take 50 taker-message.json
  python -m xmrp2p_maker --config maker.toml status
  python -m xmrp2p_maker --config maker.toml run

`take` es manual mientras no exista el canal de la Fase 4 (Durable Objects).
"""

from __future__ import annotations

import argparse
import json
import logging
from decimal import Decimal

from . import config as cfgmod
from .crypto import Crypto
from .engine import Engine, run_forever
from .evm import Evm
from .monero import WalletRpc
from .store import Store


def build(path: str) -> Engine:
    cfg = cfgmod.load(path)
    evm = Evm(cfg.evm_rpc, cfg.factory, cfg.evm_private_key, cfg.token, cfg.fee_bps)
    wallet = WalletRpc(cfg.monero_wallet_rpc, cfg.monero_main_wallet, cfg.monero_main_wallet_password, cfg.monero_rpc_auth)
    return Engine(cfg, Store(cfg.db_path), Crypto(cfg.crypto_bin), evm, wallet)


def main() -> None:
    ap = argparse.ArgumentParser(prog="xmrp2p-maker")
    ap.add_argument("--config", required=True)
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)
    q = sub.add_parser("quote")
    q.add_argument("usdt", type=Decimal)
    t = sub.add_parser("take")
    t.add_argument("usdt", type=Decimal)
    t.add_argument("taker_message")
    sub.add_parser("status")
    sub.add_parser("run")
    a = ap.parse_args()
    logging.basicConfig(level=logging.DEBUG if a.verbose else logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if a.cmd == "quote":
        cfg = cfgmod.load(a.config)
        from . import pricing

        qq = pricing.quote(a.usdt, cfg.price, cfg.limits)
        print(json.dumps({"usdt": str(qq.usdt_amount), "xmr": str(qq.xmr_amount), "price": str(qq.maker_price), "sources": qq.sources}, indent=2))
        return
    engine = build(a.config)
    if a.cmd == "take":
        with open(a.taker_message, encoding="utf-8") as f:
            print(json.dumps(engine.take(a.usdt, json.load(f)), indent=2))
    elif a.cmd == "status":
        for s in engine.store.active():
            print(s.id, s.state, s.get("escrow", "-"), s.get("xmr_txid", "-"))
    elif a.cmd == "run":
        run_forever(engine, engine.cfg.poll_seconds)


if __name__ == "__main__":
    main()
