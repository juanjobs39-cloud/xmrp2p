-- Exchange (Trocador) desde Telegram: avisos del intercambio en el chat del bot.

-- Código opaco que el bot crea al abrir el exchange (solo en xmrp2p-fiat). Liga el código al chat, vence
-- a las 48 h y admite 10 avisos como mucho.
CREATE TABLE IF NOT EXISTS p2p_tg_swap_tokens (
  token TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'es',
  expires_at INTEGER NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);

-- Código de aviso guardado con el intercambio (en la base de la API). Se borra con el intercambio.
ALTER TABLE trocador_trades ADD COLUMN notify TEXT;
