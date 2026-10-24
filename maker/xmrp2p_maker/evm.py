"""Acceso a la fábrica y a los escrows en una red EVM (web3.py)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from importlib import resources
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.exceptions import ContractLogicError

STAGES = ["UNINITIALIZED", "PENDING", "READY", "COMPLETED"]


def abi(name: str) -> list[dict[str, Any]]:
    return json.loads(resources.files("xmrp2p_maker.abi").joinpath(f"{name}.json").read_text())


@dataclass(frozen=True)
class EscrowInfo:
    address: str
    stage: str
    owner: str
    claimer: str
    claim_commitment: str
    refund_commitment: str
    t0: int
    t1: int
    amount: int
    fee_owed: int


@dataclass(frozen=True)
class Revealed:
    kind: str  # "Claimed" | "Refunded"
    secret: str  # 0x… big-endian
    tx_hash: str


class EvmError(Exception):
    pass


class Evm:
    def __init__(self, rpc: str, factory: str, private_key: str, expected_token: str, expected_fee_bps: int):
        self.w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 30}))
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        self.factory = self.w3.eth.contract(address=Web3.to_checksum_address(factory), abi=abi("SwapFactory"))
        token = self.factory.functions.TOKEN().call()
        fee = self.factory.functions.FEE_BPS().call()
        # El maker se niega a operar con una fábrica distinta de la configurada.
        if token.lower() != expected_token.lower():
            raise EvmError(f"la fábrica usa el token {token}, no {expected_token}")
        if fee != expected_fee_bps:
            raise EvmError(f"la fábrica cobra {fee} bps, no {expected_fee_bps}")
        self.token = token
        self.fee_bps = fee

    # ------------------------------------------------------------------ lectura

    def now(self) -> int:
        """Hora de la cadena (el contrato usa block.timestamp, no el reloj local)."""
        return int(self.w3.eth.get_block("latest")["timestamp"])

    def block_number(self) -> int:
        return int(self.w3.eth.block_number)

    def _escrow(self, address: str):
        return self.w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi("SwapEscrow"))

    def escrow_info(self, address: str) -> EscrowInfo:
        e = self._escrow(address)
        f = e.functions
        return EscrowInfo(
            address=e.address,
            stage=STAGES[f.stage().call()],
            owner=f.owner().call(),
            claimer=f.claimer().call(),
            claim_commitment="0x" + f.claimCommitment().call().hex().removeprefix("0x"),
            refund_commitment="0x" + f.refundCommitment().call().hex().removeprefix("0x"),
            t0=f.t0().call(),
            t1=f.t1().call(),
            amount=f.amount().call(),
            fee_owed=f.feeOwed().call(),
        )

    def find_deposit(self, claim_commitment: str, refund_commitment: str, from_block: int) -> str | None:
        """Busca un `SwapCreated` de la fábrica con nuestros commitments y nosotros como claimer."""
        logs = self.factory.events.SwapCreated().get_logs(
            from_block=from_block, argument_filters={"claimer": self.address}
        )
        for log in logs:
            a = log["args"]
            if (
                "0x" + a["claimCommitment"].hex().removeprefix("0x") == claim_commitment.lower()
                and "0x" + a["refundCommitment"].hex().removeprefix("0x") == refund_commitment.lower()
            ):
                return a["escrow"]
        return None

    def revealed_secret(self, escrow: str, from_block: int) -> Revealed | None:
        """Lee el secreto revelado en `Claimed` o `Refunded` (si lo hubo)."""
        e = self._escrow(escrow)
        for kind in ("Refunded", "Claimed"):
            for log in getattr(e.events, kind)().get_logs(from_block=from_block):
                return Revealed(kind, "0x" + log["args"]["secret"].hex().removeprefix("0x"), log["transactionHash"].hex())
        return None

    # ------------------------------------------------------------------ escritura

    def simulate_claim(self, escrow: str, secret: str, to: str) -> None:
        """Simula `claim` sin enviarlo. Una tx fallida revelaría el secreto en la cadena."""
        try:
            self._escrow(escrow).functions.claim(secret, Web3.to_checksum_address(to)).call(
                {"from": self.address}
            )
        except ContractLogicError as e:
            raise EvmError(f"la simulación de claim falla: {e}") from e

    def claim(self, escrow: str, secret: str, to: str) -> str:
        self.simulate_claim(escrow, secret, to)
        fn = self._escrow(escrow).functions.claim(secret, Web3.to_checksum_address(to))
        tx = fn.build_transaction(
            {
                "from": self.address,
                "nonce": self.w3.eth.get_transaction_count(self.address, "pending"),
                "chainId": self.w3.eth.chain_id,
            }
        )
        signed = self.account.sign_transaction(tx)
        h = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(h, timeout=300)
        if receipt["status"] != 1:
            raise EvmError(f"claim revirtió: {h.hex()}")
        return h.hex()

    def token_balance(self, who: str) -> int:
        t = self.w3.eth.contract(address=self.token, abi=abi("TestUSDT"))
        return t.functions.balanceOf(Web3.to_checksum_address(who)).call()
