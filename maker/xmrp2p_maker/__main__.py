"""Línea de comandos del maker.

  python -m xmrp2p_maker --config maker.toml quote 50
  python -m xmrp2p_maker --config maker.toml take 50 taker-message.json
  python -m xmrp2p_maker --config maker.toml status
  python -m xmrp2p_maker --config maker.toml run

Con `channel_api` configurado, `run` además publica la oferta y atiende el buzón en Cloudflare.
Sin él, `take` funciona en modo manual con el mensaje del taker en un archivo.
"""

from __future__ import annotations

import argparse
import json
import logging
import threading
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
        if engine.cfg.channel_api:
            start_channel(engine)
        run_forever(engine, engine.cfg.poll_seconds)


def start_channel(engine: Engine) -> None:
    """Publica la oferta periódicamente y atiende el buzón del maker en hilos aparte."""
    from . import pricing
    from .channel import Channel

    cfg = engine.cfg
    ch = Channel(cfg.channel_api, cfg.evm_private_key, cfg.evm_network)
    log = logging.getLogger("xmrp2p.maker")

    def notify(swap_id: str, event: str, data: dict) -> None:
        room = engine.store.get(swap_id).get("room_id")
        if room:
            ch.send_event(room, event, data)

    engine.notify = notify

    def on_take(m: dict) -> dict:
        if m.get("network") != cfg.evm_network:
            raise ValueError("red no soportada por este maker")
        reply = engine.take(Decimal(str(m["usdt"])), m["taker_message"])
        engine.store.update(reply["swap_id"], room_id=m["room_id"])
        return reply

    def refresh_offers() -> None:
        while True:
            try:
                q = engine.quote(cfg.limits.min_usdt)
                free = Decimal(engine.wallet.unlocked_balance() - engine.exposure_atomic()) / pricing.PICONERO
                max_xmr = min(free, cfg.limits.max_exposure_xmr)
                if max_xmr > 0:
                    ch.publish_offer(q.maker_price, cfg.limits.min_usdt, cfg.limits.max_usdt, max_xmr, ttl=cfg.offer_refresh_seconds * 2)
                else:
                    ch.withdraw_offer()
            except Exception as e:  # sin precio o sin red: se retira la oferta para no engañar a nadie
                log.warning("no se pudo publicar la oferta: %s", e)
                try:
                    ch.withdraw_offer()
                except Exception:
                    pass
            threading.Event().wait(cfg.offer_refresh_seconds)

    threading.Thread(target=ch.serve, args=(on_take,), daemon=True, name="buzon").start()
    threading.Thread(target=refresh_offers, daemon=True, name="ofertas").start()


if __name__ == "__main__":
    main()
