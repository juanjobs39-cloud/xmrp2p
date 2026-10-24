from __future__ import annotations

from decimal import Decimal

import pytest

from xmrp2p_maker import pricing
from xmrp2p_maker.config import Limits, PriceConfig
from xmrp2p_maker.crypto import CryptoError
from xmrp2p_maker.store import CLAIMED, NEGOTIATED, XMR_LOCKED, Store

CFG = PriceConfig(sources=("a", "b", "c"), margin_bps=100, max_divergence_bps=200, min_sources=2)
LIM = Limits(min_usdt=Decimal("10"), max_usdt=Decimal("1000"))


def test_cotizacion_usa_mediana_y_margen():
    q = pricing.quote(Decimal("303"), CFG, LIM, {"a": lambda: Decimal("300"), "b": lambda: Decimal("302"), "c": lambda: Decimal("301")}, now=0)
    assert q.reference_price == Decimal("301")
    assert q.maker_price == Decimal("304.01")
    assert q.xmr_amount == Decimal("0.996677740863")  # truncado a piconero, a favor del maker
    assert q.xmr_atomic == 996677740863 and q.usdt_atomic == 303_000_000


def test_cotizacion_tolera_una_fuente_caida():
    def boom():
        raise RuntimeError("caída")
    q = pricing.quote(Decimal("100"), CFG, LIM, {"a": lambda: Decimal("300"), "b": boom, "c": lambda: Decimal("300")})
    assert set(q.sources) == {"a", "c"}


def test_cotizacion_rechaza_pocas_fuentes_o_divergencia():
    with pytest.raises(pricing.PriceError, match="fuentes respondieron"):
        pricing.quote(Decimal("100"), CFG, LIM, {"a": lambda: Decimal("300")})
    with pytest.raises(pricing.PriceError, match="divergentes"):
        pricing.quote(Decimal("100"), CFG, LIM, {"a": lambda: Decimal("300"), "b": lambda: Decimal("300"), "c": lambda: Decimal("330")})
    with pytest.raises(pricing.PriceError, match="límites"):
        pricing.quote(Decimal("5"), CFG, LIM, {"a": lambda: Decimal("300")})


def test_store_transiciones_atomicas(tmp_path):
    st = Store(tmp_path / "s.db")
    s = st.create(NEGOTIATED, {"xmr_atomic": 1})
    st.transition(s.id, NEGOTIATED, XMR_LOCKED, "x", escrow="0xabc")
    with pytest.raises(RuntimeError, match="transición inválida"):
        st.transition(s.id, NEGOTIATED, CLAIMED)
    assert st.get(s.id).state == XMR_LOCKED and st.get(s.id)["escrow"] == "0xabc"
    # Persistencia: otra conexión ve el mismo estado (reinicio del daemon).
    assert Store(tmp_path / "s.db").get(s.id).state == XMR_LOCKED
    st.transition(s.id, XMR_LOCKED, CLAIMED)
    assert list(st.active()) == []


def test_puente_cripto(crypto):
    a, b = crypto.generate(), crypto.generate()
    assert crypto.verify(b["message"]) == b["message"]["contract_commitment"]
    sa = crypto.shared(a["spend_private"], b["message"], "stagenet")
    sb = crypto.shared(b["spend_private"], a["message"], "stagenet")
    assert sa == sb
    w = crypto.recover(a["spend_private"], b["message"], b["contract_secret"], "stagenet")
    assert w["address"] == sa["address"]
    with pytest.raises(CryptoError, match="no corresponde"):
        crypto.recover(a["spend_private"], b["message"], a["contract_secret"], "stagenet")
    assert crypto.restore(a["spend_private"])["message"]["contract_commitment"] == a["message"]["contract_commitment"]


def test_config_bloquea_mainnet(tmp_path):
    p = tmp_path / "m.toml"
    p.write_text(
        '[maker]\nevm_rpc="x"\nfactory="0x0"\ntoken="0x0"\nfee_bps=50\nmonero_network="mainnet"\n'
        'monero_wallet_rpc="x"\ncrypto_bin="x"\n',
        encoding="utf-8",
    )
    from xmrp2p_maker import config

    with pytest.raises(ValueError, match="mainnet"):
        config.load(p)


def test_firma_del_canal_recupera_la_direccion():
    import secrets

    from eth_account import Account
    from eth_account.messages import encode_defunct

    from xmrp2p_maker.channel import sign_headers, signed_message

    key = "0x" + secrets.token_hex(32)
    h = sign_headers(key, "PUT", "/v1/offers", '{"a":1}', ts=123)
    msg = signed_message("PUT", "/v1/offers", h["x-maker-address"], "123", '{"a":1}')
    assert msg.startswith("xmrp2p|PUT|/v1/offers|0x") and msg.count("|") == 5
    assert Account.recover_message(encode_defunct(text=msg), signature=h["x-signature"]) == h["x-maker-address"]


def test_store_desde_varios_hilos(tmp_path):
    import threading

    st = Store(tmp_path / "t.db")
    errors = []

    def worker():
        try:
            for _ in range(20):
                s = st.create(NEGOTIATED, {"xmr_atomic": 1})
                st.transition(s.id, NEGOTIATED, XMR_LOCKED)
                list(st.active())
        except Exception as e:  # pragma: no cover
            errors.append(e)

    ts = [threading.Thread(target=worker) for _ in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert errors == [] and len(list(st.active())) == 80
