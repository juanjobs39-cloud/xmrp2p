# xmrp2p

Plataforma P2P sin custodia para intercambiar **USDT ↔ Monero (XMR)** mediante *atomic swaps* que corren en el navegador del usuario. Nadie custodia fondos: ni la plataforma ni los makers. La infraestructura vive en Cloudflare (Pages, Workers, D1, Durable Objects).

> ⚠️ **Estado: Fases 0–6 implementadas y probadas en entornos locales y de prueba. Sin auditoría. Nada desplegado.** Falta la Fase 7 (pruebas de extremo a extremo en testnet con fondos de faucet). Nada se lanzará en mainnet sin auditoría externa.

## Cómo funciona (resumen)

- **Taker** (tiene USDT, quiere XMR): entra a la web, elige una oferta, conecta MetaMask o TronLink, escribe su dirección de Monero y firma el depósito. No instala nada.
- **Maker** (tiene XMR): corre un daemon que publica ofertas y responde swaps automáticamente.
- **Protocolo**: llaves de Monero divididas en dos mitades, prueba DLEQ entre secp256k1 y ed25519 y un contrato con dos plazos (reembolso y reclamo), basado en el protocolo de [AthanorLabs](https://github.com/AthanorLabs/atomic-swap).

Detalles en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Publicación: [docs/PUBLICAR.md](docs/PUBLICAR.md) · Contenido: [docs/CONTENIDO.md](docs/CONTENIDO.md) · Auditoría: [docs/AUDITORIA.md](docs/AUDITORIA.md) · Mainnet: [docs/MAINNET.md](docs/MAINNET.md).

## Estructura del monorepo

| Carpeta | Contenido | Fase |
|---|---|---|
| `contracts/` | Contrato de escrow en Solidity (Foundry) — [README](contracts/README.md) | 1 ✅ |
| `crypto-wasm/` | Núcleo criptográfico en Rust → WebAssembly — [README](crypto-wasm/README.md) | 2 ✅ |
| `maker/` | Daemon del maker — [README](maker/README.md) | 3 ✅ |
| `workers/` | Backend en Cloudflare: libro de órdenes, canal, proxy, API y MCP — [README](workers/README.md) | 4 ✅ (local) |
| `web/` | Sitio público (Astro) y app del swap — [README](web/README.md) | 5–6 ✅ |
| `docs/` | Arquitectura, publicación, auditoría, mainnet | todas |
| `research/` | Pruebas desechables de la Fase 0 | 0 |
| `config/` | Configuración central (`xmrp2p.example.toml`) | todas |

## Configuración

```bash
cp config/xmrp2p.example.toml config/xmrp2p.toml
cp .env.example .env
```

Ambos archivos copiados están en `.gitignore`. **Nunca subas llaves privadas, mnemónicos ni archivos de recuperación**, ni siquiera de testnet.

## Seguridad

Para reportar vulnerabilidades lee [SECURITY.md](SECURITY.md).

## Licencia

[AGPL-3.0](LICENSE). Si modificas este software y lo ofreces como servicio en red, debes publicar tu código fuente.
