# Security policy

MoneroP2P handles other people's funds. We take every report seriously.

## Current status

MoneroP2P is **live with real money** on Arbitrum One + Monero, with a **maximum of 100 USDT per swap enforced by the contract**. A testnet practice mode is also available.

- The contract has been verified with Halmos (7/7 properties proven), Aderyn (0 high findings) and Slither (no medium or high findings), and its source is published on Sourcify. Report: [docs/AUDITORIA-GRATUITA.md](docs/AUDITORIA-GRATUITA.md).
- **It has not had an external audit yet.** The 100 USDT cap limits what a single swap can put at risk.

## Official addresses

Only these are official. Anything else claiming to be MoneroP2P is not.

| What | Address |
|---|---|
| Website | `https://monerop2p.app` |
| API | `https://api.monerop2p.app` |
| Monero node proxies | `https://nodo-xmr.monerop2p.app` (mainnet), `https://nodo.monerop2p.app` (stagenet) |
| SwapFactory (Arbitrum One) | [`0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535`](https://arbiscan.io/address/0x88fc05Cb07C5b69fbed1F7B1c1F784Cd26e99535) |
| SwapEscrow implementation (Arbitrum One) | [`0xea627C04432e9959eAF15Fe7EE25DE7588bdA341`](https://arbiscan.io/address/0xea627C04432e9959eAF15Fe7EE25DE7588bdA341) |
| USDT token used | USD₮0 `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |

MoneroP2P **never** asks for your seed phrase, private keys or recovery file, and never holds funds. Nobody from the project will contact you to "help" with a swap.

## How to report a vulnerability

- **Do not open a public issue.**
- Use GitHub's private reporting: **Security → Report a vulnerability** in this repository.

Please include the affected component (contract, WASM core, buyer app, in-browser maker, maker daemon, workers), steps to reproduce, estimated impact and, if you can, a suggested fix.

## What to expect

- Acknowledgement as soon as possible.
- Coordinated disclosure: please do not publish details until a fix is available.
- Critical issues in the contract are handled first. The contract is immutable (no admin, no pause), so a fix means deploying a new factory and moving the site to it.

## Scope

| Component | In scope |
|---|---|
| Contracts in `contracts/` (deployed on Arbitrum One) | Yes (highest priority) |
| Cryptographic core `crypto-wasm/` | Yes |
| Buyer app and in-browser maker in `web/` (incl. CSP, SRI, script injection) | Yes |
| Backend `workers/` (API, swap channel, node proxy, monitor) | Yes |
| Maker daemon `maker/` | Yes |
| `research/` folder | No (throwaway research code) |

---

### Resumen en español

MoneroP2P funciona **con dinero real** en Arbitrum One + Monero, con un **máximo de 100 USDT por swap** que impone el contrato. El contrato está verificado con Halmos, Aderyn y Slither, pero **todavía no tiene auditoría externa**. Las únicas direcciones oficiales son las de la tabla de arriba. MoneroP2P **nunca** te pide tu semilla, tus llaves ni tu archivo de recuperación. Para reportar una vulnerabilidad usa **Security → Report a vulnerability** en este repositorio y **no abras un issue público**.
