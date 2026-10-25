# Registro de despliegues (solo testnet)

> Ningún despliegue en mainnet. Cada entrada indica red, fecha, direcciones y commit.

## Backend en Cloudflare — 25-oct-2026

| Recurso | Valor |
|---|---|
| API | https://xmrp2p-api.xmrp2p.workers.dev |
| Proxy de nodos Monero (stagenet) | https://xmrp2p-node-proxy.xmrp2p.workers.dev |
| Base D1 | `xmrp2p-orderbook` (`c0f6152c-7e12-4f4a-a22d-bed94dd28b4c`) |
| Redes activas | `arbitrum_sepolia` |

Verificado: `/v1/health`, `/v1/offers`, `/openapi.json`, `/mcp` (3 herramientas) y el proxy (`get_block_count` en stagenet).

## Cuentas de prueba (Fase 7)

| Uso | Dirección |
|---|---|
| Maker / despliegue (Arbitrum Sepolia) | `0x133b11BE0770dD1D0a8925fC42eDbc092F1aCe36` |
| Taker automatizado | `0x3dfa0B48456dC4fB502A0bE16aD0DFcE7eDe9B05` |
| Receptor de comisión | `0xaB7814b9A688a2C4dC95c8fD9d39BE4491c172FC` |
| Wallet del maker (stagenet) | `55mw4mKiAGxPDYcxnf8whtacNhaLhTyibEFRYYBBy8R5Prib1XDChYKE1oCb5ZQAWke3uwXtuxdDPGCc9hiYcjZq1KHqQpV` |
| Wallet destino del taker (stagenet) | `55YhSq37sMoGt8zZN5xjEcDXnF4KkMfsSDHurH39DVyTSQvdgZqfYnMGaTcJYJrpaGCSR5nWRzMx8c1SgAUcQRBiDfyvYsq` |

Fondeo: 0,101 ETH de Ethereum Sepolia (faucet) → 0,09 ETH puenteados a Arbitrum Sepolia por el Inbox oficial `0xaAe29B0366299461418F5324a79Afc425BE5ae21` (tx `0x33c1d101e7c01cc3e80a0958e157a297a0f14884b9799224f01579a0e6655354`).

## Contratos en Arbitrum Sepolia — 25-oct-2026

| Contrato | Dirección |
|---|---|
| TestUSDT (`tUSDT`, sin valor, con `faucet`) | [`0x7c08fD8C4E1774f685EA03e6c50Ee9a6B20C8064`](https://sepolia.arbiscan.io/address/0x7c08fD8C4E1774f685EA03e6c50Ee9a6B20C8064) |
| SwapFactory | [`0x89b330882Ea2a18aF6FE507e5832bB15ccA5542e`](https://sepolia.arbiscan.io/address/0x89b330882Ea2a18aF6FE507e5832bB15ccA5542e) |
| SwapEscrow (implementación) | [`0xaE106Bb4f201013588d8a2cB3F61d5e05aB345D3`](https://sepolia.arbiscan.io/address/0xaE106Bb4f201013588d8a2cB3F61d5e05aB345D3) |

Parámetros: comisión 50 bps (0,5 %) → `0xaB78…72FC`; monto mínimo 1 tUSDT; plazos entre 5 min y 2 días. Desplegado con `contracts/script/Deploy.s.sol` desde el commit actual de `main`. Verificado en cadena: `TOKEN()`, `FEE_BPS()`, `MIN_DURATION()`.
