//! # xmrp2p-crypto
//!
//! Núcleo criptográfico de los atomic swaps USDT ↔ XMR de xmrp2p. Corre en el navegador
//! (WebAssembly) y en el daemon del maker (nativo). **Las llaves privadas nunca salen de aquí**
//! salvo cuando el propio usuario las pide para su archivo de recuperación o para barrer el XMR.
//!
//! Flujo (ver `docs/ARQUITECTURA.md`):
//! 1. Cada parte genera su mitad: [`SwapKeys::generate`].
//! 2. Envía [`SwapKeys::public_message`] (llaves públicas + DLEQ + llave de vista privada).
//! 3. Verifica la de la contraparte: [`Counterparty::verify`].
//! 4. Ambos calculan la dirección compartida: [`shared_address`].
//! 5. Al ver en el contrato el secreto revelado por la otra parte: [`recover_shared_wallet`].
//!
//! Este crate **no implementa primitivas criptográficas**: usa `sigma_fun` (DLEQ),
//! `monero-ed25519` / `monero-address` (monero-oxide) y `secp256kfun`.

mod dleq;
mod error;
mod keys;
mod shared;

#[cfg(feature = "wasm")]
mod wasm;

pub use dleq::{prove, verify, DleqProof};
pub use error::Error;
pub use keys::{Counterparty, PublicMessage, SwapKeys};
pub use shared::{recover_shared_wallet, shared_address, standard_address, Network, SharedWallet};
