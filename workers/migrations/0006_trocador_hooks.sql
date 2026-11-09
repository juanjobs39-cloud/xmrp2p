-- Registro de los avisos (webhooks) de Trocador por intercambio: "estado@segundos;…" (máx. 500 caracteres).
-- Sirve para saber si Trocador avisa en cada paso (confirming, sending) o solo al final.
ALTER TABLE trocador_trades ADD COLUMN hooks TEXT;
