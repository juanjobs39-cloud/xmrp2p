"""Puente con el núcleo criptográfico en Rust (`crypto-wasm`, binario `xmrp2p-crypto-cli`).

El maker NO implementa criptografía: llama al mismo código que usa el navegador del taker.
Los secretos viajan por stdin, nunca como argumentos del proceso.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any


class CryptoError(Exception):
    pass


class Crypto:
    def __init__(self, binary: str | Path, timeout: float = 30.0):
        self.binary = str(binary)
        self.timeout = timeout

    def _call(self, req: dict[str, Any]) -> dict[str, Any]:
        try:
            p = subprocess.run(
                [self.binary],
                input=json.dumps(req).encode(),
                capture_output=True,
                timeout=self.timeout,
                check=False,
            )
        except FileNotFoundError as e:
            raise CryptoError(f"no se encontró {self.binary}: compila crypto-wasm") from e
        try:
            out = json.loads(p.stdout.decode() or "{}")
        except json.JSONDecodeError as e:
            raise CryptoError(f"respuesta inválida del núcleo cripto: {p.stderr.decode()[:200]}") from e
        if not out.get("ok"):
            raise CryptoError(out.get("error", "error desconocido"))
        return out["result"]

    def generate(self) -> dict[str, Any]:
        """→ {spend_private, contract_secret, message}"""
        return self._call({"cmd": "generate"})

    def restore(self, own_spend: str) -> dict[str, Any]:
        return self._call({"cmd": "restore", "own_spend": own_spend})

    def verify(self, counterparty: dict[str, Any]) -> str:
        """Verifica DLEQ y commitment de la contraparte. → su commitment (0x…)."""
        return self._call({"cmd": "verify", "counterparty": counterparty})["contract_commitment"]

    def shared(self, own_spend: str, counterparty: dict[str, Any], network: str) -> dict[str, Any]:
        """→ {address, private_view_key}"""
        return self._call(
            {"cmd": "shared", "own_spend": own_spend, "counterparty": counterparty, "network": network}
        )

    def recover(
        self, own_spend: str, counterparty: dict[str, Any], revealed_secret: str, network: str
    ) -> dict[str, Any]:
        """→ {address, private_view_key, private_spend_key}"""
        return self._call(
            {
                "cmd": "recover",
                "own_spend": own_spend,
                "counterparty": counterparty,
                "revealed_secret": revealed_secret,
                "network": network,
            }
        )
