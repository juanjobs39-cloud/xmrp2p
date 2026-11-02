-- P2P Fiat (beta): mercado de XMR ↔ dinero fiat con escrow multisig 2 de 3 (comprador, vendedor y árbitro).
-- El dinero fiat nunca pasa por la plataforma. Sin KYC: cada usuario es una llave generada en su navegador.
-- Los datos de pago y el chat llegan cifrados desde el navegador; aquí solo se guarda el texto cifrado.

CREATE TABLE IF NOT EXISTS p2p_users (
  id TEXT PRIMARY KEY,                 -- dirección (0x…) de la llave del usuario
  nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  enc_pubkey TEXT NOT NULL,            -- llave pública para cifrarle mensajes y datos de pago
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  banned INTEGER NOT NULL DEFAULT 0,
  orders_done INTEGER NOT NULL DEFAULT 0,      -- órdenes completadas (liberadas o ganadas en queja)
  orders_total INTEGER NOT NULL DEFAULT 0,     -- órdenes que llegaron a un final
  release_secs INTEGER NOT NULL DEFAULT 0,     -- suma de tiempos de liberación (como vendedor)
  releases INTEGER NOT NULL DEFAULT 0,
  positive INTEGER NOT NULL DEFAULT 0,
  negative INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS p2p_ads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('sell', 'buy')),   -- el anunciante vende o compra XMR
  fiat TEXT NOT NULL,
  country TEXT,                         -- ISO 3166 (opcional)
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'float')),
  price TEXT,                           -- fiat por XMR (precio fijo)
  margin_pct REAL,                      -- % sobre el precio de mercado (precio variable)
  min_fiat TEXT NOT NULL,
  max_fiat TEXT NOT NULL,
  remaining_pico TEXT NOT NULL,         -- XMR disponible (anuncio de venta) o buscado (de compra), en piconeros
  methods TEXT NOT NULL,                -- JSON: [{kind, name, country?, reversible}]
  pay_window_min INTEGER NOT NULL,
  terms TEXT NOT NULL DEFAULT '',
  min_orders_reversible INTEGER NOT NULL DEFAULT 0,
  xmr_address TEXT NOT NULL,            -- venta: reembolso del vendedor si se cancela; compra: donde recibe el XMR
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'closed', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS p2p_ads_list ON p2p_ads (status, side, fiat);
CREATE INDEX IF NOT EXISTS p2p_ads_user ON p2p_ads (user_id);

CREATE TABLE IF NOT EXISTS p2p_orders (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL,
  maker TEXT NOT NULL,                  -- dueño del anuncio
  buyer TEXT NOT NULL,
  seller TEXT NOT NULL,
  fiat TEXT NOT NULL,
  method TEXT NOT NULL,                 -- JSON del método elegido
  price TEXT NOT NULL,                  -- fiat por XMR, fijado al crear la orden
  fiat_amount TEXT NOT NULL,
  xmr_pico TEXT NOT NULL,               -- XMR que recibe el comprador
  fee_pico TEXT NOT NULL,               -- comisión (la paga el vendedor, además del monto)
  usd_value REAL NOT NULL,
  status TEXT NOT NULL,
  pay_window_min INTEGER NOT NULL,
  deadline_at INTEGER,                  -- fin del paso actual (segundos)
  buyer_address TEXT NOT NULL,          -- XMR del comprador
  seller_refund_address TEXT NOT NULL,  -- XMR de reembolso del vendedor
  multisig_address TEXT,
  deposit_txid TEXT,
  payout_txid TEXT,
  enc_payment TEXT,                     -- datos de pago cifrados para el comprador (y el administrador)
  release_auth TEXT,                    -- firma del vendedor que autoriza liberar (la verifica el árbitro)
  cancel_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER,
  funded_at INTEGER,
  closed_at INTEGER
);
CREATE INDEX IF NOT EXISTS p2p_orders_buyer ON p2p_orders (buyer, created_at);
CREATE INDEX IF NOT EXISTS p2p_orders_seller ON p2p_orders (seller, created_at);
CREATE INDEX IF NOT EXISTS p2p_orders_status ON p2p_orders (status, deadline_at);

CREATE TABLE IF NOT EXISTS p2p_disputes (
  order_id TEXT PRIMARY KEY,
  opened_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  opened_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  winner TEXT CHECK (winner IN ('buyer', 'seller')),
  note TEXT,
  decision_auth TEXT,                   -- firma del administrador (la verifica el árbitro)
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS p2p_feedback (
  order_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  positive INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (order_id, from_user)
);
CREATE INDEX IF NOT EXISTS p2p_feedback_to ON p2p_feedback (to_user, created_at);

CREATE TABLE IF NOT EXISTS p2p_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO p2p_settings (key, value) VALUES
  ('fee_bps', '50'),                    -- 0.5 % que paga el vendedor
  ('cap_usd', '1000'),                  -- tope por orden (equivalente en USD)
  ('deposit_window_min', '30'),         -- tiempo para armar el escrow y depositar
  ('dispute_after_min', '15'),          -- minutos tras «Ya pagué» para poder abrir queja
  ('blocked_methods', '[]');            -- nombres de métodos bloqueados por el administrador

-- Firmas ya usadas (evita repetir una petición firmada). Se purgan a los 10 minutos.
CREATE TABLE IF NOT EXISTS p2p_nonces (
  sig_hash TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);
