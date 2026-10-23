# xmrp2p

Plataforma P2P sin custodia para intercambiar **USDT ↔ Monero (XMR)** mediante *atomic swaps* que corren en el navegador del usuario. Nadie custodia fondos: ni la plataforma ni los makers. La infraestructura vive en Cloudflare (Pages, Workers, D1, Durable Objects).

> ⚠️ **Estado: Fase 0 (investigación y diseño).** No hay nada desplegado en mainnet ni listo para usar con dinero real. Nada se lanzará en mainnet sin auditoría externa del contrato.

## Cómo funciona (resumen)

- **Taker** (tiene USDT, quiere XMR): entra a la web, elige una oferta, conecta MetaMask o TronLink, escribe su dirección de Monero y firma el depósito. No instala nada.
- **Maker** (tiene XMR): corre un daemon que publica ofertas y responde swaps automáticamente.
- **Protocolo**: llaves de Monero divididas en dos mitades, prueba DLEQ entre secp256k1 y ed25519 y un contrato con dos plazos (reembolso y reclamo), basado en el protocolo de [AthanorLabs](https://github.com/AthanorLabs/atomic-swap).

Detalles en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Estructura del monorepo

| Carpeta | Contenido | Fase |
|---|---|---|
| `contracts/` | Contrato de escrow en Solidity (Foundry) | 1 |
| `crypto-wasm/` | Núcleo criptográfico en Rust → WebAssembly | 2 |
| `maker/` | Daemon del maker | 3 |
| `workers/` | Backend en Cloudflare Workers (libro de órdenes, mensajería, proxy) | 4 |
| `web/` | Sitio público (Astro) y app del swap | 5–6 |
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
