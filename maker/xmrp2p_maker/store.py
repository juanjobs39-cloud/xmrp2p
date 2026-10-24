"""Estado persistente de cada swap (SQLite). Permite reanudar tras un reinicio.

⚠️ La base guarda la mitad de llave de gasto del maker de cada swap (necesaria para recuperar
el XMR si el taker reembolsa). Guárdala en un disco cifrado y con permisos solo para el usuario
del daemon.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from functools import wraps
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

# Estados del swap desde el punto de vista del maker.
NEGOTIATED = "NEGOTIATED"  # llaves intercambiadas, esperando el depósito del taker
LOCKING_XMR = "LOCKING_XMR"  # depósito validado; se está enviando el XMR
XMR_LOCKED = "XMR_LOCKED"  # XMR enviado a la dirección compartida
CLAIMING = "CLAIMING"  # se envió `claim`
CLAIMED = "CLAIMED"  # final feliz: USDT cobrado
RECOVERING_XMR = "RECOVERING_XMR"  # el taker reembolsó; barriendo el XMR de vuelta
RECOVERED = "RECOVERED"  # final: XMR recuperado
EXPIRED = "EXPIRED"  # final: el taker nunca depositó
ABORTED = "ABORTED"  # final: depósito inválido; no se envió XMR
NEEDS_OPERATOR = "NEEDS_OPERATOR"  # situación anómala: requiere intervención manual

FINAL = {CLAIMED, RECOVERED, EXPIRED, ABORTED}
ACTIVE_WITH_XMR = {LOCKING_XMR, XMR_LOCKED, CLAIMING, RECOVERING_XMR}


@dataclass
class Swap:
    id: str
    state: str
    created_at: float
    updated_at: float
    data: dict[str, Any] = field(default_factory=dict)

    def __getitem__(self, k: str) -> Any:
        return self.data[k]

    def get(self, k: str, default: Any = None) -> Any:
        return self.data.get(k, default)


def _locked(fn):
    """El bucle principal y el hilo del buzón comparten la conexión: se serializa el acceso."""

    @wraps(fn)
    def inner(self, *a, **k):
        with self._lock:
            return fn(self, *a, **k)

    return inner


class Store:
    def __init__(self, path: str | Path):
        self.path = str(path)
        self._lock = threading.RLock()
        new = self.path == ":memory:" or not os.path.exists(self.path)
        self.db = sqlite3.connect(self.path, isolation_level=None, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS swaps (id TEXT PRIMARY KEY, state TEXT NOT NULL,"
            " created_at REAL NOT NULL, updated_at REAL NOT NULL, data TEXT NOT NULL)"
        )
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS events (swap_id TEXT NOT NULL, at REAL NOT NULL,"
            " state TEXT NOT NULL, note TEXT NOT NULL)"
        )
        if new and self.path != ":memory:":
            try:
                os.chmod(self.path, 0o600)
            except OSError:  # pragma: no cover - Windows
                pass

    @_locked
    def create(self, state: str, data: dict[str, Any]) -> Swap:
        now = time.time()
        sid = uuid.uuid4().hex
        self.db.execute(
            "INSERT INTO swaps VALUES (?,?,?,?,?)", (sid, state, now, now, json.dumps(data))
        )
        self._log(sid, state, "creado")
        return Swap(sid, state, now, now, data)

    @_locked
    def get(self, sid: str) -> Swap:
        row = self.db.execute("SELECT * FROM swaps WHERE id=?", (sid,)).fetchone()
        if not row:
            raise KeyError(sid)
        return Swap(row[0], row[1], row[2], row[3], json.loads(row[4]))

    @_locked
    def transition(self, sid: str, frm: str | set[str], to: str, note: str = "", **fields: Any) -> Swap:
        """Cambia de estado solo si el estado actual es `frm` (evita carreras y dobles envíos)."""
        allowed = {frm} if isinstance(frm, str) else set(frm)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            cur = self.get(sid)
            if cur.state not in allowed:
                raise RuntimeError(f"transición inválida {cur.state} → {to} en {sid}")
            cur.data.update(fields)
            now = time.time()
            self.db.execute(
                "UPDATE swaps SET state=?, updated_at=?, data=? WHERE id=?",
                (to, now, json.dumps(cur.data), sid),
            )
            self.db.execute("INSERT INTO events VALUES (?,?,?,?)", (sid, now, to, note))
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            raise
        return Swap(sid, to, cur.created_at, now, cur.data)

    @_locked
    def update(self, sid: str, **fields: Any) -> Swap:
        cur = self.get(sid)
        return self.transition(sid, cur.state, cur.state, "datos", **fields)

    @_locked
    def active(self) -> Iterator[Swap]:
        q = "SELECT * FROM swaps WHERE state NOT IN (%s) ORDER BY created_at" % ",".join("?" * len(FINAL))
        rows = self.db.execute(q, tuple(FINAL)).fetchall()
        return iter([Swap(r[0], r[1], r[2], r[3], json.loads(r[4])) for r in rows])

    @_locked
    def events(self, sid: str) -> list[tuple[str, str]]:
        return [(r[0], r[1]) for r in self.db.execute(
            "SELECT state, note FROM events WHERE swap_id=? ORDER BY at", (sid,)
        )]

    def _log(self, sid: str, state: str, note: str) -> None:
        self.db.execute("INSERT INTO events VALUES (?,?,?,?)", (sid, time.time(), state, note))
