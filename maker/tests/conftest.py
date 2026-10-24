from __future__ import annotations

import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import time
from decimal import Decimal
from pathlib import Path

import pytest
from eth_account import Account
from web3 import Web3

from xmrp2p_maker.config import Limits, MakerConfig, PriceConfig, Safety
from xmrp2p_maker.crypto import Crypto
from xmrp2p_maker.monero import MoneroError, SentTransfer

ROOT = Path(__file__).resolve().parents[2]
EXE = ".exe" if sys.platform == "win32" else ""
CRYPTO_BIN = ROOT / "crypto-wasm" / "target" / "release" / f"xmrp2p-crypto{EXE}"
CONTRACTS_OUT = ROOT / "contracts" / "out"


def _tool(name: str) -> str | None:
    p = shutil.which(name) or str(Path.home() / ".foundry" / "bin" / f"{name}{EXE}")
    return p if Path(p).exists() else None


@pytest.fixture(scope="session")
def crypto() -> Crypto:
    if not CRYPTO_BIN.exists():
        pytest.skip("compila crypto-wasm: cargo build --release --bin xmrp2p-crypto")
    return Crypto(CRYPTO_BIN)


class FakeWallet:
    """Wallet de Monero simulada: registra envíos y barridos."""

    def __init__(self, balance: int = 10**15):
        self.balance = balance
        self.sent: list[tuple[str, int, str]] = []
        self.sweeps: list[dict] = []
        self.conf = 0
        self.sweep_locked = False

    def height(self) -> int:
        return 1_000_000

    def unlocked_balance(self) -> int:
        return self.balance

    def find_outgoing(self, address: str):
        for a, amt, txid in self.sent:
            if a == address:
                return SentTransfer(txid, amt, 0)
        return None

    def transfer(self, address: str, amount: int) -> SentTransfer:
        txid = secrets.token_hex(32)
        self.sent.append((address, amount, txid))
        self.balance -= amount
        return SentTransfer(txid, amount, 0)

    def confirmations(self, txid: str) -> int:
        return self.conf

    def sweep_from_keys(self, address, spend_key, view_key, restore_height) -> str:
        if self.sweep_locked:
            raise MoneroError("salidas bloqueadas")
        self.sweeps.append({"address": address, "spend": spend_key, "view": view_key})
        return secrets.token_hex(32)


class Chain:
    """anvil local con TestUSDT y SwapFactory reales (compilados por Foundry)."""

    def __init__(self, port: int):
        self.w3 = Web3(Web3.HTTPProvider(f"http://127.0.0.1:{port}"))
        self.url = f"http://127.0.0.1:{port}"
        self.deployer = self.new_account()

    def new_account(self):
        acct = Account.create()
        self.w3.provider.make_request("anvil_setBalance", [acct.address, hex(10**20)])
        return acct

    def artifact(self, name: str):
        j = json.loads((CONTRACTS_OUT / f"{name}.sol" / f"{name}.json").read_text())
        return j["abi"], j["bytecode"]["object"]

    def send(self, acct, fn_or_tx):
        tx = fn_or_tx.build_transaction(
            {"from": acct.address, "nonce": self.w3.eth.get_transaction_count(acct.address), "chainId": self.w3.eth.chain_id}
        )
        h = self.w3.eth.send_raw_transaction(acct.sign_transaction(tx).raw_transaction)
        r = self.w3.eth.wait_for_transaction_receipt(h)
        assert r["status"] == 1, "tx revirtió"
        return r

    def deploy(self, name: str, *args):
        abi, bytecode = self.artifact(name)
        c = self.w3.eth.contract(abi=abi, bytecode=bytecode)
        r = self.send(self.deployer, c.constructor(*args))
        return self.w3.eth.contract(address=r["contractAddress"], abi=abi)

    def contract(self, name: str, address: str):
        return self.w3.eth.contract(address=address, abi=self.artifact(name)[0])

    def warp(self, seconds: int):
        self.w3.provider.make_request("evm_increaseTime", [seconds])
        self.w3.provider.make_request("evm_mine", [])

    def now(self) -> int:
        return self.w3.eth.get_block("latest")["timestamp"]


@pytest.fixture
def chain():
    anvil = _tool("anvil")
    if not anvil or not CONTRACTS_OUT.exists():
        pytest.skip("necesita anvil y contracts/out (forge build)")
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    proc = subprocess.Popen([anvil, "--port", str(port), "--silent"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                if Web3(Web3.HTTPProvider(f"http://127.0.0.1:{port}")).is_connected():
                    break
            except Exception:
                pass
            time.sleep(0.1)
        yield Chain(port)
    finally:
        proc.terminate()
        proc.wait(timeout=10)


SAFETY = Safety(min_time_to_t0=45 * 60, min_claim_window=60 * 60, claim_cutoff_before_t1=15 * 60, deposit_timeout=15 * 60, xmr_confirmations=10)


def maker_config(tmp_path: Path, factory: str, token: str, fee_bps: int = 50) -> MakerConfig:
    return MakerConfig(
        evm_rpc="",
        factory=factory,
        token=token,
        fee_bps=fee_bps,
        monero_network="stagenet",
        monero_wallet_rpc="",
        monero_main_wallet="maker",
        db_path=tmp_path / "maker.sqlite3",
        crypto_bin=CRYPTO_BIN,
        price=PriceConfig(sources=("a", "b", "c"), margin_bps=100, max_divergence_bps=200, min_sources=2),
        limits=Limits(min_usdt=Decimal("1"), max_usdt=Decimal("1000"), max_exposure_xmr=Decimal("10"), max_concurrent=3),
        safety=SAFETY,
    )


FIXED_PRICES = {"a": lambda: Decimal("300"), "b": lambda: Decimal("301"), "c": lambda: Decimal("299")}
