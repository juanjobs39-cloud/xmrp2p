"""Maker real contra contratos reales en anvil, con núcleo cripto real y wallet de Monero simulada."""

from __future__ import annotations

import os
from decimal import Decimal

import pytest

from xmrp2p_maker.engine import Engine, RejectedRequest
from xmrp2p_maker.evm import Evm
from xmrp2p_maker.store import ABORTED, CLAIMED, EXPIRED, NEGOTIATED, RECOVERED, RECOVERING_XMR, XMR_LOCKED, Store

from .conftest import FIXED_PRICES, FakeWallet, maker_config

pytestmark = pytest.mark.integration


@pytest.fixture
def env(chain, crypto, tmp_path):
    usdt = chain.deploy("TestUSDT")
    fee_to = chain.new_account().address
    factory = chain.deploy("SwapFactory", (usdt.address, 50, fee_to, 10**6, 10 * 60, 2 * 24 * 3600))
    maker_acct = chain.new_account()
    taker = chain.new_account()
    chain.send(taker, usdt.functions.faucet(10_000 * 10**6))
    os.environ["MAKER_EVM_PRIVATE_KEY"] = maker_acct.key.hex()
    cfg = maker_config(tmp_path, factory.address, usdt.address)
    evm = Evm(chain.url, factory.address, maker_acct.key.hex(), usdt.address, 50)
    wallet = FakeWallet()
    notes: list = []
    engine = Engine(cfg, Store(cfg.db_path), crypto, evm, wallet, notify=lambda *a: notes.append(a), price_fetch=FIXED_PRICES)
    return dict(chain=chain, usdt=usdt, factory=factory, maker=maker_acct, taker=taker, fee_to=fee_to,
                engine=engine, wallet=wallet, crypto=crypto, notes=notes, evm=evm)


def _negotiate(e, usdt="100"):
    taker_keys = e["crypto"].generate()
    reply = e["engine"].take(Decimal(usdt), taker_keys["message"])
    return taker_keys, reply


def _deposit(e, reply, d0=3600, d1=2 * 3600, amount=None, salt=b"\x01" * 32):
    c, taker, f = e["chain"], e["taker"], e["factory"]
    amount = amount if amount is not None else reply["usdt_atomic"]
    c.send(taker, e["usdt"].functions.approve(f.address, amount))
    c.send(taker, f.functions.newSwap(reply["claimer"], reply["claim_commitment"], reply["refund_commitment"], d0, d1, amount, salt))
    return c.contract("SwapEscrow", f.functions.predictEscrow(taker.address, salt).call())


def test_swap_completo_con_ready(env):
    e = env
    taker_keys, reply = _negotiate(e)
    escrow = _deposit(e, reply)
    e["engine"].tick()
    s = e["engine"].store.get(reply["swap_id"])
    assert s.state == XMR_LOCKED
    # El XMR fue a la dirección compartida, que el taker calcula igual por su lado.
    taker_view = e["crypto"].shared(taker_keys["spend_private"], reply["maker_message"], "stagenet")
    assert e["wallet"].sent == [(taker_view["address"], reply["xmr_atomic"], s["xmr_txid"])]
    assert any(n[1] == "xmr_locked" for n in e["notes"])

    e["chain"].send(e["taker"], escrow.functions.setReady())
    e["engine"].tick()
    s = e["engine"].store.get(reply["swap_id"])
    assert s.state == CLAIMED
    fee = reply["usdt_atomic"] * 50 // 10_000
    assert e["evm"].token_balance(e["maker"].address) == reply["usdt_atomic"] - fee

    # El taker reconstruye la llave completa del XMR con el secreto del evento Claimed.
    revealed = e["evm"].revealed_secret(escrow.address, 0)
    w = e["crypto"].recover(taker_keys["spend_private"], reply["maker_message"], revealed.secret, "stagenet")
    assert w["address"] == taker_view["address"]


def test_sin_ready_reclama_tras_t0_solo_con_xmr_confirmado(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply)
    e["engine"].tick()
    e["chain"].warp(3600 + 5)
    e["wallet"].conf = 3
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == XMR_LOCKED  # 3 < 10 confirmaciones
    e["wallet"].conf = 10
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == CLAIMED


def test_reembolso_del_taker_y_recuperacion_del_xmr(env):
    e = env
    taker_keys, reply = _negotiate(e)
    escrow = _deposit(e, reply)
    e["engine"].tick()  # XMR bloqueado
    e["chain"].send(e["taker"], escrow.functions.refund(taker_keys["contract_secret"], e["taker"].address))
    e["wallet"].sweep_locked = True
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == RECOVERING_XMR  # reintenta cuando se desbloquee
    e["wallet"].sweep_locked = False
    e["engine"].tick()
    s = e["engine"].store.get(reply["swap_id"])
    assert s.state == RECOVERED
    (sweep,) = e["wallet"].sweeps
    assert sweep["address"] == s["shared_address"]
    assert len(sweep["spend"]) == 64


def test_deposito_con_monto_distinto_se_aborta_sin_enviar_xmr(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply, amount=reply["usdt_atomic"] - 1)
    e["engine"].tick()
    s = e["engine"].store.get(reply["swap_id"])
    assert s.state == ABORTED and e["wallet"].sent == []


def test_t0_demasiado_cerca_se_aborta(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply, d0=20 * 60)  # menos que min_time_to_t0 (45 min)
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == ABORTED
    assert e["wallet"].sent == []


def test_ventana_de_reclamo_corta_se_aborta(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply, d1=30 * 60)
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == ABORTED


def test_sin_deposito_expira(env):
    e = env
    _, reply = _negotiate(e)
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == NEGOTIATED
    e["chain"].warp(16 * 60)
    e["engine"].tick()
    assert e["engine"].store.get(reply["swap_id"]).state == EXPIRED


def test_no_envia_xmr_dos_veces_tras_reinicio(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply)
    # Simula un reinicio justo después de enviar: el XMR ya salió pero el estado no se guardó.
    s = e["engine"].store.get(reply["swap_id"])
    e["wallet"].transfer(s["shared_address"], reply["xmr_atomic"])
    e["engine"].tick()
    assert len(e["wallet"].sent) == 1
    assert e["engine"].store.get(reply["swap_id"]).state == XMR_LOCKED


def test_no_reclama_cerca_de_t1(env):
    e = env
    _, reply = _negotiate(e)
    _deposit(e, reply)
    e["engine"].tick()
    e["wallet"].conf = 0  # XMR sin confirmar: no reclama entre t0 y el corte
    e["chain"].warp(3600 + 2 * 3600 - 10 * 60)  # dentro de los 15 min previos a t1
    e["wallet"].conf = 10
    e["engine"].tick()
    s = e["engine"].store.get(reply["swap_id"])
    assert s.state == XMR_LOCKED and s.get("past_cutoff") is True


def test_rechazos(env):
    e = env
    with pytest.raises(RejectedRequest, match="límites"):
        _negotiate(e, usdt="5000")
    bad = e["crypto"].generate()["message"]
    bad["dleq_proof"] = bad["dleq_proof"][:-4] + "0000"
    with pytest.raises(RejectedRequest, match="inválido"):
        e["engine"].take(Decimal("50"), bad)
    for _ in range(3):
        _negotiate(e, usdt="10")
    with pytest.raises(RejectedRequest, match="ocupado"):
        _negotiate(e, usdt="10")


def test_limite_de_exposicion(env):
    e = env
    e["wallet"].balance = 10**12 // 10  # 0,1 XMR disponible
    with pytest.raises(RejectedRequest, match="XMR disponible"):
        _negotiate(e, usdt="100")
