-- P2P Fiat: solicitudes de orden cuando el anunciante está fuera de línea, y avisos push.
-- Se aplica solo en xmrp2p-fiat (en xmrp2p-orderbook quedan pendientes a propósito las migraciones de P2P).

-- Horas que el anunciante da para responder una solicitud (1, 3, 6 o 12). NULL: no acepta solicitudes.
ALTER TABLE p2p_ads ADD COLUMN request_window_h INTEGER;
-- Cuándo el anunciante aceptó la solicitud (NULL si la orden se abrió con él en línea).
ALTER TABLE p2p_orders ADD COLUMN accepted_at INTEGER;
-- Tiempo de respuesta a solicitudes, para «suele responder en».
ALTER TABLE p2p_users ADD COLUMN accept_secs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p2p_users ADD COLUMN accepts INTEGER NOT NULL DEFAULT 0;

-- Suscripciones de Web Push. El aviso va vacío: solo se guarda la dirección que da el navegador.
CREATE TABLE IF NOT EXISTS p2p_push (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS p2p_push_user ON p2p_push (user_id, created_at);

-- Minutos para armar el escrow y depositar después de aceptar una solicitud.
INSERT OR IGNORE INTO p2p_settings (key, value) VALUES ('accept_setup_min', '60');
