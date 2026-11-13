-- Recibir por apodo: direcciones públicas que cada cuenta publica para que otros usuarios le envíen.
-- Cada fila va FIRMADA por la llave de la cuenta (sig): quien envía verifica la firma en su navegador,
-- así ni el servidor ni quien lo comprometa puede cambiar la dirección de alguien por otra.
-- Solo hay direcciones públicas: aquí nunca se guardan semillas ni llaves privadas.
CREATE TABLE IF NOT EXISTS p2p_addresses (
  user_id TEXT NOT NULL,              -- p2p_users.id (0x… de la llave de la cuenta)
  asset TEXT NOT NULL CHECK (asset IN ('xmr', 'evm')),
  address TEXT NOT NULL,
  at INTEGER NOT NULL,                -- segundos Unix en que el usuario la firmó
  sig TEXT NOT NULL,                  -- firma de la cuenta sobre (usuario, red, moneda, dirección, at)
  PRIMARY KEY (user_id, asset)
);
