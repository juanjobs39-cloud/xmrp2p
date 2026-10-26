#!/usr/bin/env bash
# Arranca el maker en tu PC (Linux, macOS o Git Bash en Windows) con reinicio automático.
# Uso:  ENV_FILE=~/.xmrp2p/maker.env CONFIG=~/.xmrp2p/maker.toml ./deploy/start-maker.sh
# Requiere que monero-wallet-rpc ya esté corriendo (ver README).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-$HOME/.xmrp2p/maker.env}"
CONFIG="${CONFIG:-$HOME/.xmrp2p/maker.toml}"
[ -f "$ENV_FILE" ] || { echo "No existe $ENV_FILE (copia deploy/maker.env.example)"; exit 1; }
[ -f "$CONFIG" ] || { echo "No existe $CONFIG (copia maker.example.toml)"; exit 1; }

# Cargar los secretos sin dejarlos en el historial de la terminal.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

PY=".venv/bin/python"
[ -x "$PY" ] || PY=".venv/Scripts/python"   # Git Bash en Windows

while true; do
  "$PY" -m xmrp2p_maker --config "$CONFIG" run || true
  echo "$(date '+%F %T') el maker terminó; reinicio en 15 s (Ctrl+C para salir)"
  sleep 15
done
