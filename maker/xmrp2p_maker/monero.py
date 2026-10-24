"""Cliente mínimo de `monero-wallet-rpc` (la wallet del maker corre en su propia máquina)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import requests


class MoneroError(Exception):
    pass


@dataclass(frozen=True)
class SentTransfer:
    txid: str
    amount: int
    fee: int


class MoneroWallet(Protocol):
    def unlocked_balance(self) -> int: ...
    def find_outgoing(self, address: str) -> SentTransfer | None: ...
    def transfer(self, address: str, amount: int) -> SentTransfer: ...
    def confirmations(self, txid: str) -> int: ...
    def sweep_from_keys(self, address: str, spend_key: str, view_key: str, restore_height: int) -> str: ...
    def height(self) -> int: ...


class WalletRpc:
    """Implementación real contra `monero-wallet-rpc --rpc-bind-port … --wallet-dir …`."""

    def __init__(self, url: str, main_wallet: str, main_password: str, auth: tuple[str, str] | None = None):
        self.url = url
        self.main_wallet = main_wallet
        self.main_password = main_password
        self.session = requests.Session()
        if auth:
            self.session.auth = requests.auth.HTTPDigestAuth(*auth)

    def _rpc(self, method: str, **params: Any) -> dict[str, Any]:
        r = self.session.post(
            self.url, json={"jsonrpc": "2.0", "id": "0", "method": method, "params": params}, timeout=120
        )
        r.raise_for_status()
        j = r.json()
        if "error" in j:
            raise MoneroError(f"{method}: {j['error'].get('message')}")
        return j.get("result", {})

    def height(self) -> int:
        return int(self._rpc("get_height")["height"])

    def unlocked_balance(self) -> int:
        return int(self._rpc("get_balance", account_index=0)["unlocked_balance"])

    def find_outgoing(self, address: str) -> SentTransfer | None:
        """Idempotencia: ¿ya enviamos a esta dirección? (evita pagar dos veces tras un reinicio)."""
        res = self._rpc("get_transfers", out=True, pending=True, pool=True)
        for kind in ("out", "pending", "pool"):
            for t in res.get(kind, []):
                for d in t.get("destinations", []):
                    if d.get("address") == address:
                        return SentTransfer(t["txid"], int(d["amount"]), int(t.get("fee", 0)))
        return None

    def transfer(self, address: str, amount: int) -> SentTransfer:
        r = self._rpc(
            "transfer", destinations=[{"amount": amount, "address": address}], priority=0, get_tx_key=True
        )
        return SentTransfer(r["tx_hash"], amount, int(r.get("fee", 0)))

    def confirmations(self, txid: str) -> int:
        r = self._rpc("get_transfer_by_txid", txid=txid)
        return int(r.get("transfer", {}).get("confirmations", 0))

    def sweep_from_keys(self, address: str, spend_key: str, view_key: str, restore_height: int) -> str:
        """Abre la wallet compartida con la llave completa, barre todo a la wallet principal y vuelve a abrirla."""
        main_addr = self._rpc("get_address", account_index=0)["address"]
        name = f"recover-{address[:12]}"
        try:
            self._rpc(
                "generate_from_keys",
                filename=name,
                address=address,
                spendkey=spend_key,
                viewkey=view_key,
                restore_height=restore_height,
                password="",
                autosave_current=True,
            )
            self._rpc("refresh", start_height=restore_height)
            r = self._rpc("sweep_all", address=main_addr, account_index=0)
            txids = r.get("tx_hash_list", [])
            if not txids:
                raise MoneroError("sweep_all no generó transacciones (¿salidas aún bloqueadas?)")
            return txids[0]
        finally:
            self._rpc("open_wallet", filename=self.main_wallet, password=self.main_password)
