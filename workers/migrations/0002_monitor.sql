-- Monitoreo de la fábrica con dinero real (beta): escrows vistos y hasta qué bloque se leyó.
CREATE TABLE IF NOT EXISTS monitor_state (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monitor_escrows (
  escrow TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  claimer TEXT NOT NULL,
  amount TEXT NOT NULL,
  t0 INTEGER NOT NULL,
  t1 INTEGER NOT NULL,
  created_block INTEGER NOT NULL,
  -- open | claimed | refunded
  status TEXT NOT NULL DEFAULT 'open',
  overdue_alerted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS monitor_escrows_open ON monitor_escrows (status);
