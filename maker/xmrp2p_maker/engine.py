"""Máquina de estados del maker.

Reglas de seguridad (las más importantes primero):
1. Nunca enviar XMR sin un depósito válido en la cadena (monto, commitments, plazos).
2. Nunca reclamar si no bloqueamos XMR: reclamar sin bloquear sería robar al taker.
3. Sin READY, reclamar solo tras t0 y con el XMR ya confirmado.
4. Nunca enviar `claim` cerca de t1: si la tx fallara, `s_b` quedaría público y el taker podría
   llevarse el XMR y además reembolsar el USDT.
5. Simular `claim` antes de enviarlo.
6. Idempotencia: antes de enviar XMR, comprobar si ya se envió (reinicios).
"""

from __future__ import annotations

import logging
import os
import time
from decimal import Decimal
from typing import Any, Callable

from . import pricing
from .config import MakerConfig
from .crypto import Crypto
from .monero import MoneroError, MoneroWallet
from .store import (
    ABORTED,
    ACTIVE_WITH_XMR,
    CLAIMED,
    CLAIMING,
    EXPIRED,
    LOCKING_XMR,
    NEGOTIATED,
    RECOVERED,
    RECOVERING_XMR,
    XMR_LOCKED,
    Store,
    Swap,
)

log = logging.getLogger("xmrp2p.maker")

Notify = Callable[[str, str, dict[str, Any]], None]


# Fallas de prueba (Fase 7). Solo con XMRP2P_TEST_FAULTS=1 y nunca en mainnet. El taker de prueba
# elige la falla con el monto en USDT para poder correr varios casos a la vez sobre el mismo maker.
TEST_FAULTS_BY_USDT = {11: "short_xmr", 12: "bad_tx_key", 13: "no_lock", 14: "late_claim"}


class RejectedRequest(Exception):
    """El maker rechaza la solicitud del taker (límites, precio, mensaje inválido…)."""


class Engine:
    def __init__(
        self,
        cfg: MakerConfig,
        store: Store,
        crypto: Crypto,
        evm: Any,
        wallet: MoneroWallet,
        notify: Notify | None = None,
        price_fetch: dict[str, Callable[[], Decimal]] | None = None,
        clock: Callable[[], float] = time.time,
    ):
        self.cfg, self.store, self.crypto, self.evm, self.wallet = cfg, store, crypto, evm, wallet
        self.notify = notify or (lambda sid, ev, data: None)
        self.price_fetch = price_fetch
        self.clock = clock

    def _fault(self, s: Swap) -> str | None:
        if os.environ.get("XMRP2P_TEST_FAULTS") != "1":
            return None
        if self.cfg.monero_network == "mainnet":
            raise RuntimeError("las fallas de prueba están prohibidas en mainnet")
        usdt = int(s["usdt_atomic"]) // 1_000_000
        if int(s["usdt_atomic"]) % 1_000_000:
            return None
        return TEST_FAULTS_BY_USDT.get(usdt)

    # ------------------------------------------------------------------ negociación

    def quote(self, usdt: Decimal) -> pricing.Quote:
        return pricing.quote(usdt, self.cfg.price, self.cfg.limits, self.price_fetch, now=self.clock())

    def exposure_atomic(self) -> int:
        return sum(
            int(s["xmr_atomic"]) for s in self.store.active() if s.state in ACTIVE_WITH_XMR | {NEGOTIATED}
        )

    def take(self, usdt: Decimal, taker_message: dict[str, Any]) -> dict[str, Any]:
        """El taker pide un swap. Devuelve lo que necesita para depositar."""
        active = list(self.store.active())
        if len(active) >= self.cfg.limits.max_concurrent:
            raise RejectedRequest("el maker está ocupado; intenta más tarde")
        try:
            q = self.quote(usdt)
        except pricing.PriceError as e:
            raise RejectedRequest(str(e)) from e
        max_exp = int(self.cfg.limits.max_exposure_xmr * pricing.PICONERO)
        exposure = self.exposure_atomic() + q.xmr_atomic
        if exposure > max_exp:
            raise RejectedRequest("se superaría el límite de exposición del maker")
        if self.wallet.unlocked_balance() < exposure:
            raise RejectedRequest("el maker no tiene XMR disponible suficiente")
        try:
            taker_commitment = self.crypto.verify(taker_message)
        except Exception as e:
            raise RejectedRequest(f"mensaje del taker inválido: {e}") from e

        keys = self.crypto.generate()
        shared = self.crypto.shared(keys["spend_private"], taker_message, self.cfg.monero_network)
        now_chain = self.evm.now()
        swap = self.store.create(
            NEGOTIATED,
            {
                "usdt_atomic": q.usdt_atomic,
                "xmr_atomic": q.xmr_atomic,
                "price": str(q.maker_price),
                "taker_message": taker_message,
                "taker_commitment": taker_commitment,
                "maker_spend": keys["spend_private"],
                "maker_secret": keys["contract_secret"],
                "maker_commitment": keys["message"]["contract_commitment"],
                "shared_address": shared["address"],
                "shared_view_key": shared["private_view_key"],
                "from_block": max(0, self.evm.block_number() - 5),
                "deposit_deadline": now_chain + self.cfg.safety.deposit_timeout,
                "xmr_restore_height": self.wallet.height(),
            },
        )
        log.info("swap %s negociado: %s USDT → %s XMR", swap.id, usdt, q.xmr_amount)
        return {
            "swap_id": swap.id,
            "maker_message": keys["message"],
            "claimer": self.evm.address,
            "claim_commitment": keys["message"]["contract_commitment"],
            "refund_commitment": taker_commitment,
            "usdt_atomic": q.usdt_atomic,
            "xmr_atomic": q.xmr_atomic,
            "shared_address": shared["address"],
            "deposit_deadline": swap["deposit_deadline"],
            "min_duration0": self.cfg.safety.min_time_to_t0,
            "min_duration1": self.cfg.safety.min_claim_window,
        }

    # ------------------------------------------------------------------ bucle

    def tick(self) -> None:
        for s in list(self.store.active()):
            try:
                self.step(s)
            except Exception:  # se reintenta en el próximo ciclo
                log.exception("error en swap %s (%s)", s.id, s.state)

    def step(self, s: Swap) -> None:
        handler = {
            NEGOTIATED: self._negotiated,
            LOCKING_XMR: self._locking,
            XMR_LOCKED: self._locked,
            CLAIMING: self._locked,
            RECOVERING_XMR: self._recovering,
        }.get(s.state)
        if handler:
            handler(s)

    # NEGOTIATED → LOCKING_XMR | ABORTED | EXPIRED
    def _negotiated(self, s: Swap) -> None:
        escrow = self.evm.find_deposit(s["maker_commitment"], s["taker_commitment"], s["from_block"])
        now = self.evm.now()
        if escrow is None:
            if now > s["deposit_deadline"]:
                self.store.transition(s.id, NEGOTIATED, EXPIRED, "el taker no depositó a tiempo")
            return
        info = self.evm.escrow_info(escrow)
        problem = self._validate_deposit(s, info, now)
        if problem:
            # No se envía XMR. El taker recupera su USDT con `refund` (antes de t0 o desde t1).
            self.store.transition(s.id, NEGOTIATED, ABORTED, problem, escrow=escrow)
            self.notify(s.id, "aborted", {"reason": problem})
            log.warning("swap %s abortado: %s", s.id, problem)
            return
        self.store.transition(
            s.id, NEGOTIATED, LOCKING_XMR, "depósito válido", escrow=escrow, t0=info.t0, t1=info.t1
        )
        self._locking(self.store.get(s.id))

    def _validate_deposit(self, s: Swap, info: Any, now: int) -> str | None:
        sf = self.cfg.safety
        if info.claimer.lower() != self.evm.address.lower():
            return "el escrow no nos tiene como claimer"
        if info.stage != "PENDING":
            return f"escrow en estado {info.stage}"
        if info.amount != s["usdt_atomic"]:
            return f"monto depositado {info.amount} ≠ acordado {s['usdt_atomic']}"
        if info.claim_commitment.lower() != s["maker_commitment"].lower():
            return "claimCommitment no es el nuestro"
        if info.refund_commitment.lower() != s["taker_commitment"].lower():
            return "refundCommitment no es el del taker verificado"
        if info.t0 - now < sf.min_time_to_t0:
            return f"t0 demasiado cerca ({info.t0 - now} s)"
        if info.t1 - info.t0 < sf.min_claim_window:
            return f"ventana de reclamo demasiado corta ({info.t1 - info.t0} s)"
        return None

    # LOCKING_XMR → XMR_LOCKED
    def _locking(self, s: Swap) -> None:
        now = self.evm.now()
        if s["t0"] - now < self.cfg.safety.min_time_to_t0 // 2 and not s.get("xmr_txid"):
            # Demasiado tarde para que el taker verifique antes de t0. No enviamos y NUNCA reclamamos.
            self.store.transition(s.id, LOCKING_XMR, ABORTED, "se acercó t0 antes de poder bloquear XMR")
            self.notify(s.id, "aborted", {"reason": "el maker no bloqueó XMR a tiempo; reembolsa tu USDT"})
            return
        fault = self._fault(s)
        if fault == "no_lock":
            # Simula un maker que se cae antes de bloquear: no envía XMR y nunca reclamará.
            self.store.transition(s.id, LOCKING_XMR, ABORTED, "PRUEBA: maker caído antes de bloquear")
            return
        sent = self.wallet.find_outgoing(s["shared_address"])
        if sent is None:
            amount = int(s["xmr_atomic"]) // 2 if fault == "short_xmr" else int(s["xmr_atomic"])
            sent = self.wallet.transfer(s["shared_address"], amount)
        self.store.transition(s.id, LOCKING_XMR, XMR_LOCKED, "XMR enviado", xmr_txid=sent.txid, xmr_tx_key=sent.tx_key)
        tx_key = "ff" * 32 if fault == "bad_tx_key" else sent.tx_key
        self.notify(
            s.id,
            "xmr_locked",
            {"txid": sent.txid, "tx_key": tx_key, "xmr_atomic": int(s["xmr_atomic"]), "shared_address": s["shared_address"]},
        )
        log.info("swap %s: XMR bloqueado en %s (tx %s)", s.id, s["shared_address"], sent.txid)

    # XMR_LOCKED / CLAIMING → CLAIMED | RECOVERING_XMR
    def _locked(self, s: Swap) -> None:
        rev = self.evm.revealed_secret(s["escrow"], s["from_block"])
        if rev and rev.kind == "Refunded":
            self.store.transition(
                s.id, {XMR_LOCKED, CLAIMING}, RECOVERING_XMR, "el taker reembolsó", taker_secret=rev.secret
            )
            self._recovering(self.store.get(s.id))
            return
        if rev and rev.kind == "Claimed":
            self.store.transition(s.id, {XMR_LOCKED, CLAIMING}, CLAIMED, "reclamado", claim_tx=rev.tx_hash)
            return

        info = self.evm.escrow_info(s["escrow"])
        now = self.evm.now()
        if now >= info.t1 - self.cfg.safety.claim_cutoff_before_t1:
            # Demasiado cerca de t1 para arriesgar un claim. Esperamos el refund del taker y recuperamos el XMR.
            if not s.get("past_cutoff"):
                self.store.update(s.id, past_cutoff=True)
                log.error("swap %s: pasó el corte de reclamo sin cobrar; se espera el refund", s.id)
            return
        if self._fault(s) == "late_claim" and now < info.t0 + 5 * 60:
            return  # PRUEBA: maker caído hasta 5 min después de t0
        if self._fault(s) in ("short_xmr", "bad_tx_key") and info.stage != "READY":
            return  # PRUEBA: un maker deshonesto no debe poder cobrar; aquí no lo intenta sin READY
        if info.stage == "READY":
            pass  # el taker ya verificó el XMR
        elif now >= info.t0:
            conf = self.wallet.confirmations(s["xmr_txid"])
            if conf < self.cfg.safety.xmr_confirmations:
                return  # sin READY solo reclamamos con nuestro XMR confirmado
        else:
            return  # esperando READY o t0

        payout = self.cfg.payout_address or self.evm.address
        if s.state == XMR_LOCKED:
            self.store.transition(s.id, XMR_LOCKED, CLAIMING, "enviando claim")
        tx = self.evm.claim(s["escrow"], s["maker_secret"], payout)
        self.store.transition(s.id, CLAIMING, CLAIMED, "USDT cobrado", claim_tx=tx)
        self.notify(s.id, "claimed", {"tx": tx})
        log.info("swap %s: USDT cobrado (tx %s)", s.id, tx)

    # RECOVERING_XMR → RECOVERED
    def _recovering(self, s: Swap) -> None:
        w = self.crypto.recover(s["maker_spend"], s["taker_message"], s["taker_secret"], self.cfg.monero_network)
        if w["address"] != s["shared_address"]:
            raise RuntimeError("la llave reconstruida no corresponde a la dirección compartida")
        try:
            txid = self.wallet.sweep_from_keys(
                w["address"], w["private_spend_key"], w["private_view_key"], int(s["xmr_restore_height"])
            )
        except MoneroError as e:
            log.info("swap %s: barrido pendiente (%s)", s.id, e)
            return
        self.store.transition(s.id, RECOVERING_XMR, RECOVERED, "XMR recuperado", sweep_tx=txid)
        log.info("swap %s: XMR recuperado (tx %s)", s.id, txid)


def run_forever(engine: Engine, poll_seconds: int) -> None:  # pragma: no cover
    while True:
        engine.tick()
        time.sleep(poll_seconds)
