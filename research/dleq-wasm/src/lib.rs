//! Fase 0 — investigación. NO es código de producción.
//!
//! Envuelve la prueba DLEQ secp256k1/ed25519 de `sigma_fun` (la misma que usa
//! eigenwallet en producción) para medir si compila a WASM, cuánto pesa y si
//! la llave secp256k1 resultante es la que el contrato verifica con `ecrecover`.

use curve25519_dalek::{edwards::CompressedEdwardsY, scalar::Scalar as ScalarQ};
use rand_chacha::ChaCha20Rng;
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sha3::Keccak256;
use sigma_fun::{
    ext::dl_secp256k1_ed25519_eq::{CrossCurveDLEQ, CrossCurveDLEQProof},
    secp256k1::fun::{marker::*, Point as PointP},
    HashTranscript,
};
use wasm_bindgen::prelude::*;

type Dleq = CrossCurveDLEQ<HashTranscript<Sha256, ChaCha20Rng>>;

/// Punto H de Pedersen de Monero (comprimido).
const MONERO_H: [u8; 32] = [
    0x8b, 0x65, 0x59, 0x70, 0x15, 0x37, 0x99, 0xaf, 0x2a, 0xea, 0xdc, 0x9f, 0xf1, 0xad, 0xd0, 0xea,
    0x6c, 0x72, 0x51, 0xd5, 0x41, 0x54, 0xcf, 0xa9, 0x2c, 0x17, 0x3a, 0x0d, 0xd3, 0x9c, 0x1f, 0x94,
];

/// Mismos puntos H que eigenwallet: NUMS de BIP-341 en secp256k1 y H de Monero en ed25519.
fn proof_system() -> Dleq {
    let g = sigma_fun::secp256k1::fun::G.normalize().to_bytes_uncompressed();
    let x: [u8; 32] = Sha256::digest(g).into();
    let hp = PointP::<EvenY>::from_xonly_bytes(x)
        .expect("x válido")
        .normalize();
    let hq = CompressedEdwardsY(MONERO_H).decompress().expect("H de Monero");
    Dleq::new(hp, hq)
}

/// Escalar ed25519 de 252 bits (lo que exige la prueba).
fn random_secret() -> ScalarQ {
    loop {
        let mut b = [0u8; 32];
        OsRng.fill_bytes(&mut b);
        b[31] &= 0x0f; // < 2^252
        let s = ScalarQ::from_bytes_mod_order(b);
        if s != ScalarQ::zero() && s.as_bytes()[31] & 0b0001_0000 == 0 {
            return s;
        }
    }
}

/// keccak256(x || y) de la llave secp256k1: el "commitment" que guarda el contrato.
fn eth_commitment(p: &PointP) -> [u8; 32] {
    let unc = p.to_bytes_uncompressed(); // 0x04 || x || y
    Keccak256::digest(&unc[1..]).into()
}

#[derive(Serialize, Deserialize)]
pub struct ProveOutput {
    /// Secreto como bytes32 big-endian (lo que recibe `claim`/`refund` en Solidity).
    pub secret_be_hex: String,
    /// Secreto little-endian (formato de llave de gasto de Monero).
    pub secret_le_hex: String,
    pub secp256k1_pub_hex: String,
    pub ed25519_pub_hex: String,
    pub eth_commitment_hex: String,
    pub proof_json: String,
}

pub fn prove_native() -> ProveOutput {
    let secret = random_secret();
    let (proof, (p, q)) = proof_system().prove(&secret, &mut OsRng);
    let mut be = secret.to_bytes();
    be.reverse();
    ProveOutput {
        secret_be_hex: hex::encode(be),
        secret_le_hex: hex::encode(secret.to_bytes()),
        secp256k1_pub_hex: hex::encode(p.to_bytes()),
        ed25519_pub_hex: hex::encode(q.compress().to_bytes()),
        eth_commitment_hex: hex::encode(eth_commitment(&p)),
        proof_json: serde_json::to_string(&proof).expect("serializa"),
    }
}

pub fn verify_native(proof_json: &str, secp_hex: &str, ed_hex: &str) -> bool {
    let Ok(proof) = serde_json::from_str::<CrossCurveDLEQProof>(proof_json) else {
        return false;
    };
    let Some(p) = hex::decode(secp_hex)
        .ok()
        .and_then(|b| <[u8; 33]>::try_from(b).ok())
        .and_then(PointP::from_bytes)
    else {
        return false;
    };
    let Some(q) = hex::decode(ed_hex)
        .ok()
        .and_then(|b| <[u8; 32]>::try_from(b).ok())
        .and_then(|b| CompressedEdwardsY(b).decompress())
    else {
        return false;
    };
    proof_system().verify(&proof, (p, q))
}

#[wasm_bindgen]
pub fn prove() -> String {
    serde_json::to_string(&prove_native()).expect("serializa")
}

#[wasm_bindgen]
pub fn verify(proof_json: &str, secp_hex: &str, ed_hex: &str) -> bool {
    verify_native(proof_json, secp_hex, ed_hex)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prueba_valida_verifica() {
        let o = prove_native();
        assert!(verify_native(&o.proof_json, &o.secp256k1_pub_hex, &o.ed25519_pub_hex));
        println!("tamaño de la prueba (JSON): {} bytes", o.proof_json.len());
    }

    #[test]
    fn prueba_con_otra_llave_falla() {
        let a = prove_native();
        let b = prove_native();
        assert!(!verify_native(&a.proof_json, &b.secp256k1_pub_hex, &a.ed25519_pub_hex));
        assert!(!verify_native(&a.proof_json, &a.secp256k1_pub_hex, &b.ed25519_pub_hex));
    }

    /// Imprime un vector para la prueba cruzada con el contrato (ver research/contract-compat).
    #[test]
    fn vector_para_contrato() {
        let o = prove_native();
        println!("VECTOR secret_be=0x{} commitment=0x{}", o.secret_be_hex, o.eth_commitment_hex);
    }
}
