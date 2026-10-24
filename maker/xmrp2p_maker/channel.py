"""Conexión del maker con el backend de Cloudflare (Fase 4).

- Publica y renueva su oferta en el libro de órdenes (peticiones firmadas EIP-191).
- Mantiene abierto el WebSocket de su buzón: recibe solicitudes de swap, responde con
  `Engine.take` y envía los eventos del protocolo (XMR bloqueado, USDT cobrado…) a cada sala.

Formato de la firma (idéntico al del Worker, `workers/src/api/auth.ts`):
    xmrp2p|<MÉTODO>|<ruta>|<dirección en minúsculas>|<timestamp>|<sha256 del cuerpo>
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from decimal import Decimal
from typing import Any, Callable

import requests
from eth_account import Account
from eth_account.messages import encode_defunct

log = logging.getLogger("xmrp2p.channel")


def signed_message(method: str, path: str, address: str, ts: str, body: str) -> str:
    digest = hashlib.sha256(body.encode()).hexdigest()
    return f"xmrp2p|{method.upper()}|{path}|{address.lower()}|{ts}|{digest}"


def sign_headers(private_key: str, method: str, path: str, body: str, ts: int | None = None) -> dict[str, str]:
    acct = Account.from_key(private_key)
    t = str(ts if ts is not None else int(time.time()))
    sig = acct.sign_message(encode_defunct(text=signed_message(method, path, acct.address, t, body)))
    return {
        "x-maker-address": acct.address,
        "x-timestamp": t,
        "x-signature": "0x" + sig.signature.hex().removeprefix("0x"),
    }


class Channel:
    def __init__(self, api_url: str, private_key: str, network: str):
        self.api = api_url.rstrip("/")
        self.key = private_key
        self.network = network
        self.session = requests.Session()
        self._ws = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ libro de órdenes

    def publish_offer(self, price: Decimal, min_usdt: Decimal, max_usdt: Decimal, max_xmr: Decimal, ttl: int = 600) -> dict[str, Any]:
        body = json.dumps(
            {
                "network": self.network,
                "price": f"{price:.6f}",
                "min_usdt": str(min_usdt),
                "max_usdt": str(max_usdt),
                "max_xmr": f"{max_xmr:.6f}",
                "ttl": ttl,
            },
            separators=(",", ":"),
        )
        h = sign_headers(self.key, "PUT", "/v1/offers", body)
        r = self.session.put(self.api + "/v1/offers", data=body, headers={**h, "content-type": "application/json"}, timeout=20)
        r.raise_for_status()
        return r.json()

    def withdraw_offer(self) -> None:
        body = json.dumps({"network": self.network}, separators=(",", ":"))
        h = sign_headers(self.key, "DELETE", "/v1/offers", body)
        self.session.delete(self.api + "/v1/offers", data=body, headers={**h, "content-type": "application/json"}, timeout=20)

    # ------------------------------------------------------------------ buzón (WebSocket)

    def send_event(self, room_id: str, event: str, data: dict[str, Any]) -> None:
        with self._lock:
            if self._ws is None:
                log.warning("sin conexión: no se pudo enviar %s a la sala %s", event, room_id)
                return
            self._ws.send(json.dumps({"type": "event", "room_id": room_id, "event": event, "data": data}))

    def serve(self, on_take: Callable[[dict[str, Any]], dict[str, Any]], on_taker_message: Callable[[dict[str, Any]], None] | None = None, stop: threading.Event | None = None) -> None:
        """Bucle del buzón con reconexión. `on_take` recibe la solicitud y devuelve la respuesta (o lanza)."""
        from websockets.sync.client import connect

        stop = stop or threading.Event()
        backoff = 1.0
        ws_url = self.api.replace("https://", "wss://").replace("http://", "ws://") + "/v1/makers/inbox"
        while not stop.is_set():
            try:
                headers = sign_headers(self.key, "GET", "/v1/makers/inbox", "")
                with connect(ws_url, additional_headers=headers, max_size=512 * 1024, open_timeout=20) as ws:
                    with self._lock:
                        self._ws = ws
                    log.info("buzón conectado")
                    backoff = 1.0
                    last_ping = time.time()
                    while not stop.is_set():
                        if time.time() - last_ping > 30:
                            ws.send(json.dumps({"type": "ping"}))
                            last_ping = time.time()
                        try:
                            raw = ws.recv(timeout=5)
                        except TimeoutError:
                            continue
                        self._handle(ws, json.loads(raw), on_take, on_taker_message)
            except Exception as e:  # reconexión con espera creciente
                log.warning("buzón desconectado: %s; reintento en %.0f s", e, backoff)
            finally:
                with self._lock:
                    self._ws = None
            stop.wait(backoff)
            backoff = min(backoff * 2, 60)

    def _handle(self, ws, m: dict[str, Any], on_take, on_taker_message) -> None:
        if m.get("type") == "take":
            try:
                result = on_take(m)
                ws.send(json.dumps({"type": "reply", "request_id": m["request_id"], "ok": True, "result": result}))
            except Exception as e:
                ws.send(json.dumps({"type": "reply", "request_id": m["request_id"], "ok": False, "error": str(e)}))
        elif m.get("type") == "taker_message" and on_taker_message:
            on_taker_message(m)
        elif m.get("type") == "error":
            log.warning("el backend respondió: %s", m.get("error"))
