-- P2P Fiat: avisos por Telegram (opcionales). Se aplica solo en xmrp2p-fiat.

-- Cuenta P2P ↔ chat privado con el bot. Solo se guarda el chat_id y el idioma de los mensajes.
CREATE TABLE IF NOT EXISTS p2p_telegram (
  user_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'es',
  created_at INTEGER NOT NULL
);

-- Códigos de un solo uso para ligar (vencen a los 10 minutos).
CREATE TABLE IF NOT EXISTS p2p_telegram_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'es',
  expires_at INTEGER NOT NULL
);
