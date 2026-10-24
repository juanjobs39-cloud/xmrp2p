//! Mitades de llave de cada parte del swap y verificación de la contraparte.

use crate::{dleq, DleqProof, Error};
use curve25519_dalek_ng::{
    constants::ED25519_BASEPOINT_TABLE,
    edwards::{CompressedEdwardsY, EdwardsPoint},
    scalar::Scalar as ScalarQ,
};
use monero_ed25519::Scalar as MoneroScalar;
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use sigma_fun::secp256k1::fun::Point as PointP;
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

/// Mitad de llave de una parte. Se borra de la memoria al soltarse.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct SwapKeys {
    /// Mitad de la llave de gasto (escalar ed25519 de 252 bits, little-endian).
    spend: [u8; 32],
    /// Mitad de la llave de vista: Hs(spend), como en una wallet estándar de Monero.
    view: [u8; 32],
}

/// Lo que cada parte envía a la otra. **Contiene la llave de vista privada** (necesaria para
/// que la contraparte vea el XMR bloqueado), pero nunca la de gasto.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PublicMessage {
    /// Llave pública de gasto ed25519 (hex, 32 bytes comprimidos).
    pub spend_public_ed25519: String,
    /// Misma llave en secp256k1 (hex, 33 bytes comprimidos).
    pub public_secp256k1: String,
    /// keccak256(x || y) de la llave secp256k1: el commitment que guarda el contrato.
    pub contract_commitment: String,
    /// Mitad privada de la llave de vista (hex, 32 bytes).
    pub view_private: String,
    /// Prueba DLEQ (hex, binario versionado).
    pub dleq_proof: String,
}

impl SwapKeys {
    /// Genera una mitad nueva con el generador del sistema operativo / `crypto.getRandomValues`.
    pub fn generate() -> Self {
        loop {
            let mut b = Zeroizing::new([0u8; 32]);
            OsRng.fill_bytes(b.as_mut());
            b[31] &= 0x0f; // < 2^252: válido en ed25519 y en secp256k1, y lo que exige la DLEQ
            if let Ok(k) = Self::from_spend_bytes(*b) {
                return k;
            }
        }
    }

    /// Reconstruye la mitad desde la llave de gasto (archivo de recuperación).
    pub fn from_spend_bytes(spend: [u8; 32]) -> Result<Self, Error> {
        let s = ScalarQ::from_canonical_bytes(spend).ok_or(Error::InvalidScalar)?;
        if s == ScalarQ::zero() || spend[31] & 0xf0 != 0 {
            return Err(Error::InvalidScalar);
        }
        let view = <[u8; 32]>::from(MoneroScalar::hash(spend));
        Ok(Self { spend, view })
    }

    pub fn from_spend_hex(h: &str) -> Result<Self, Error> {
        Self::from_spend_bytes(parse32(h, "llave de gasto")?)
    }

    pub(crate) fn spend_scalar(&self) -> ScalarQ {
        ScalarQ::from_canonical_bytes(self.spend).expect("la mitad ya fue validada")
    }

    pub(crate) fn view_bytes(&self) -> [u8; 32] {
        self.view
    }

    pub fn spend_public(&self) -> EdwardsPoint {
        &self.spend_scalar() * &ED25519_BASEPOINT_TABLE
    }

    /// Llave de gasto en hex little-endian (formato Monero). Solo para el archivo de recuperación.
    pub fn spend_private_hex(&self) -> Zeroizing<String> {
        Zeroizing::new(hex::encode(self.spend))
    }

    /// Secreto como `bytes32` big-endian: lo que se pasa a `claim`/`refund` del contrato.
    pub fn contract_secret(&self) -> Zeroizing<String> {
        let mut be = Zeroizing::new(self.spend);
        be.reverse();
        Zeroizing::new(format!("0x{}", hex::encode(*be)))
    }

    /// Mensaje para la contraparte, con la prueba DLEQ (~0,35 s en el navegador).
    pub fn public_message(&self) -> PublicMessage {
        let (proof, secp, ed) =
            dleq::prove(&self.spend_scalar()).expect("la mitad ya fue validada");
        PublicMessage {
            spend_public_ed25519: hex::encode(ed.compress().to_bytes()),
            public_secp256k1: hex::encode(secp.to_bytes()),
            contract_commitment: format!("0x{}", hex::encode(contract_commitment(&secp))),
            view_private: hex::encode(self.view),
            dleq_proof: hex::encode(proof.0),
        }
    }
}

/// Mitad pública de la contraparte, ya verificada.
#[derive(Clone, Debug)]
pub struct Counterparty {
    pub(crate) spend_public: EdwardsPoint,
    pub(crate) view_private: [u8; 32],
    /// keccak256(x || y) de su llave secp256k1, para comparar con el contrato.
    pub contract_commitment: [u8; 32],
}

impl Counterparty {
    /// Verifica todo lo que la contraparte afirma: puntos válidos, DLEQ, commitment del contrato
    /// y que la llave de vista sea un escalar canónico.
    pub fn verify(msg: &PublicMessage) -> Result<Self, Error> {
        let ed_bytes = parse32(&msg.spend_public_ed25519, "llave pública ed25519")?;
        let spend_public = CompressedEdwardsY(ed_bytes)
            .decompress()
            .filter(|p| p.is_torsion_free() && !p.is_small_order())
            .ok_or(Error::InvalidEd25519Point)?;

        let secp_bytes: [u8; 33] = hex::decode(&msg.public_secp256k1)
            .map_err(|_| Error::Hex("llave pública secp256k1"))?
            .try_into()
            .map_err(|_| Error::Length("llave pública secp256k1"))?;
        let secp = PointP::from_bytes(secp_bytes).ok_or(Error::InvalidSecp256k1Point)?;

        let proof = DleqProof(hex::decode(&msg.dleq_proof).map_err(|_| Error::Hex("prueba DLEQ"))?);
        dleq::verify(&proof, &secp, &spend_public)?;

        let commitment = contract_commitment(&secp);
        if parse32(&msg.contract_commitment, "commitment")? != commitment {
            return Err(Error::InvalidDleq);
        }

        let view_private = parse32(&msg.view_private, "llave de vista")?;
        ScalarQ::from_canonical_bytes(view_private).ok_or(Error::ViewKeyMismatch)?;

        Ok(Self {
            spend_public,
            view_private,
            contract_commitment: commitment,
        })
    }
}

/// keccak256(x || y) de una llave secp256k1 (formato de dirección de Ethereum sin truncar).
pub(crate) fn contract_commitment(p: &PointP) -> [u8; 32] {
    let unc = p.to_bytes_uncompressed();
    Keccak256::digest(&unc[1..]).into()
}

pub(crate) fn parse32(h: &str, what: &'static str) -> Result<[u8; 32], Error> {
    let h = h.strip_prefix("0x").unwrap_or(h);
    hex::decode(h)
        .map_err(|_| Error::Hex(what))?
        .try_into()
        .map_err(|_| Error::Length(what))
}
