-- P2P Fiat: alertas de anuncios nuevos por Telegram (opcionales, sin cuenta P2P). Se aplica solo en xmrp2p-fiat.

-- Chats suscritos: solo el chat_id, el idioma y los filtros elegidos.
-- want: «buy» = quiere comprar XMR (anuncios de venta), «sell» = quiere vender XMR (anuncios de compra), «both».
-- fiats: monedas separadas por comas; vacío = todas.
CREATE TABLE IF NOT EXISTS p2p_tg_alerts (
  chat_id TEXT PRIMARY KEY,
  lang TEXT NOT NULL DEFAULT 'es',
  want TEXT NOT NULL DEFAULT 'both' CHECK (want IN ('buy', 'sell', 'both')),
  fiats TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Anuncios ya avisados (para no repetir y limitar a 1 aviso cada 6 h por anunciante).
CREATE TABLE IF NOT EXISTS p2p_tg_alert_log (
  ad_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS p2p_tg_alert_log_user ON p2p_tg_alert_log (user_id, sent_at);
