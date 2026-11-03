-- P2P Fiat: tiempo promedio de depósito del vendedor y pausa automática de anuncios.
ALTER TABLE p2p_users ADD COLUMN deposit_secs INTEGER NOT NULL DEFAULT 0;   -- suma de tiempos (orden abierta → depósito visto)
ALTER TABLE p2p_users ADD COLUMN deposits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p2p_ads ADD COLUMN paused_reason TEXT;                           -- 'missed_deposits' si la plataforma lo pausó
