-- Intercambios por Trocador. Los proveedores exigen conservar IP, idioma y navegador del usuario para
-- responder solicitudes de autoridades que Trocador nos reenvíe (ver la política de privacidad).
-- Solo se llenan en intercambios por Trocador; los swaps de MoneroP2P no guardan estos datos.
CREATE TABLE IF NOT EXISTS trocador_trades (
  trade_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip TEXT NOT NULL,
  country TEXT,
  lang TEXT,
  user_agent TEXT,
  provider TEXT NOT NULL,
  amount_from TEXT NOT NULL,
  amount_to TEXT,
  status TEXT NOT NULL,
  -- Datos públicos del intercambio (dirección de depósito, montos, estado) para mostrarlos al usuario.
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS trocador_trades_created ON trocador_trades (created_at);
