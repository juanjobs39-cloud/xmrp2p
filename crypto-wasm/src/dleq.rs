//! Prueba DLEQ entre secp256k1 y ed25519 (envoltorio fino de `sigma_fun`).
//!
//! Demuestra que la llave pública ed25519 (Monero) y la secp256k1 (contrato) tienen el
//! mismo secreto de 252 bits, sin revelarlo. Usa los mismos puntos H que eigenwallet:
//! H = lift_x(SHA-256(G sin comprimir)) en secp256k1 (NUMS de BIP-341) y H de Pedersen de Monero.

use crate::Error;
use curve25519_dalek_ng::{
    edwards::{CompressedEdwardsY, EdwardsPoint},
    scalar::Scalar as ScalarQ,
};
use rand_chacha::ChaCha20Rng;
use rand_core::OsRng;
use sha2::{Digest, Sha256};
use sigma_fun::{
    ext::dl_secp256k1_ed25519_eq::{CrossCurveDLEQ, CrossCurveDLEQProof},
    secp256k1::fun::{marker::*, Point as PointP},
    HashTranscript,
};
use std::sync::OnceLock;

type System = CrossCurveDLEQ<HashTranscript<Sha256, ChaCha20Rng>>;

/// H de Pedersen de Monero (comprimido).
const MONERO_H: [u8; 32] = [
    0x8b, 0x65, 0x59, 0x70, 0x15, 0x37, 0x99, 0xaf, 0x2a, 0xea, 0xdc, 0x9f, 0xf1, 0xad, 0xd0, 0xea,
    0x6c, 0x72, 0x51, 0xd5, 0x41, 0x54, 0xcf, 0xa9, 0x2c, 0x17, 0x3a, 0x0d, 0xd3, 0x9c, 0x1f, 0x94,
];

/// Versión del formato binario de la prueba (primer byte). Cambiarlo rompe compatibilidad.
const PROOF_FORMAT_V1: u8 = 1;

fn system() -> &'static System {
    static S: OnceLock<System> = OnceLock::new();
    S.get_or_init(|| {
        let g = sigma_fun::secp256k1::fun::G
            .normalize()
            .to_bytes_uncompressed();
        let x: [u8; 32] = Sha256::digest(g).into();
        let hp = PointP::<EvenY>::from_xonly_bytes(x)
            .expect("SHA-256(G) es una coordenada x válida")
            .normalize();
        let hq = CompressedEdwardsY(MONERO_H)
            .decompress()
            .expect("H de Monero es un punto válido");
        System::new(hp, hq)
    })
}

/// Prueba DLEQ serializada en binario compacto (`postcard`), con un byte de versión al inicio.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DleqProof(pub Vec<u8>);

impl DleqProof {
    fn decode(&self) -> Result<CrossCurveDLEQProof, Error> {
        match self.0.split_first() {
            Some((&PROOF_FORMAT_V1, rest)) => {
                postcard::from_bytes(rest).map_err(|_| Error::DleqEncoding)
            }
            _ => Err(Error::DleqEncoding),
        }
    }
}

/// Genera la prueba para `secret` y devuelve (prueba, llave secp256k1, llave ed25519).
pub fn prove(secret: &ScalarQ) -> Result<(DleqProof, PointP, EdwardsPoint), Error> {
    if *secret == ScalarQ::zero() || secret.as_bytes()[31] & 0xf0 != 0 {
        return Err(Error::InvalidScalar);
    }
    let (proof, (p, q)) = system().prove(secret, &mut OsRng);
    let mut bytes = vec![PROOF_FORMAT_V1];
    bytes.extend(postcard::to_allocvec(&proof).expect("serializar la prueba no falla"));
    Ok((DleqProof(bytes), p, q))
}

/// Verifica que `secp` y `ed` comparten secreto. Rechaza puntos ed25519 con componente de torsión.
pub fn verify(proof: &DleqProof, secp: &PointP, ed: &EdwardsPoint) -> Result<(), Error> {
    let decoded = proof.decode()?;
    if system().verify(&decoded, (*secp, *ed)) {
        Ok(())
    } else {
        Err(Error::InvalidDleq)
    }
}
