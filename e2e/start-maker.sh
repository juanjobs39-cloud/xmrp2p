#!/usr/bin/env bash
# Arranca el daemon del maker para la Fase 7 (testnet). Lee los secretos de e2e/.secrets/
# (ignorado por Git) y activa las fallas de prueba por monto (11–14 USDT).
set -euo pipefail
cd "$(dirname "$0")/.."
S=e2e/.secrets
export PATH="$HOME/.foundry/bin:$PATH"
MAKER_EVM_PRIVATE_KEY="$(cast wallet decrypt-keystore maker -k "$S" --unsafe-password "$(cat "$S/maker.password")" | grep -o '0x[0-9a-fA-F]\{64\}')"
export MAKER_EVM_PRIVATE_KEY
export MONERO_WALLET_RPC_USER=maker
MONERO_WALLET_RPC_PASSWORD="$(cat "$S/rpc_maker.password")"
MONERO_MAIN_WALLET_PASSWORD="$(cat "$S/wallet_maker.password")"
export MONERO_WALLET_RPC_PASSWORD MONERO_MAIN_WALLET_PASSWORD
export XMRP2P_TEST_FAULTS=1
exec maker/.venv/Scripts/python -m xmrp2p_maker --config "$S/maker.toml" run
