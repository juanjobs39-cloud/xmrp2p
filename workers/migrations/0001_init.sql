-- Libro de órdenes de xmrp2p. Una oferta por maker y red (se actualiza con upsert).
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  maker TEXT NOT NULL,          -- dirección EVM del maker (minúsculas); firma cada escritura
  network TEXT NOT NULL,        -- p. ej. arbitrum_sepolia
  price TEXT NOT NULL,          -- USDT por XMR (decimal en texto, ya con el margen del maker)
  min_usdt TEXT NOT NULL,
  max_usdt TEXT NOT NULL,
  max_xmr TEXT NOT NULL,        -- XMR disponible para esta oferta
  expires_at INTEGER NOT NULL,  -- epoch s; el maker la renueva mientras está en línea
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS offers_maker_network ON offers (maker, network);
CREATE INDEX IF NOT EXISTS offers_network_expiry ON offers (network, expires_at);
