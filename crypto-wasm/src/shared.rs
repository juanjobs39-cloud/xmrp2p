//! Dirección compartida del swap y reconstrucción de la llave completa.

use crate::{keys::parse32, Counterparty, Error, SwapKeys};
use curve25519_dalek_ng::{
    constants::ED25519_BASEPOINT_TABLE, edwards::EdwardsPoint, scalar::Scalar as ScalarQ,
};
use monero_address::{AddressType, MoneroAddress, Network as MoneroNetwork};
use monero_ed25519::Point as MoneroPoint;
use serde::Serialize;
use zeroize::Zeroizing;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Network {
    Mainnet,
    Stagenet,
    Testnet,
}

impl std::str::FromStr for Network {
    type Err = Error;
    fn from_str(s: &str) -> Result<Self, Error> {
        match s {
            "mainnet" => Ok(Self::Mainnet),
            "stagenet" => Ok(Self::Stagenet),
            "testnet" => Ok(Self::Testnet),
            other => Err(Error::Network(other.into())),
        }
    }
}

impl From<Network> for MoneroNetwork {
    fn from(n: Network) -> Self {
        match n {
            Network::Mainnet => MoneroNetwork::Mainnet,
            Network::Stagenet => MoneroNetwork::Stagenet,
            Network::Testnet => MoneroNetwork::Testnet,
        }
    }
}

/// Datos para importar la wallet compartida en monero-ts (o cualquier wallet) y barrer el XMR.
#[derive(Serialize)]
pub struct SharedWallet {
    pub address: String,
    /// Llave de vista compartida v_a + v_b (hex). Basta para *ver* el XMR bloqueado.
    pub private_view_key: String,
    /// Llave de gasto completa s_a + s_b (hex). Solo existe tras la revelación en el contrato.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_spend_key: Option<String>,
}

impl Drop for SharedWallet {
    fn drop(&mut self) {
        use zeroize::Zeroize;
        if let Some(k) = self.private_spend_key.as_mut() {
            k.zeroize();
        }
        self.private_view_key.zeroize();
    }
}

fn to_monero_point(p: EdwardsPoint) -> MoneroPoint {
    let bytes = p.compress().to_bytes();
    let p4 = curve25519_dalek::edwards::CompressedEdwardsY(bytes)
        .decompress()
        .expect("un punto válido sigue siéndolo entre versiones de dalek");
    MoneroPoint::from(p4)
}

fn address(net: Network, spend: EdwardsPoint, view_priv: &ScalarQ) -> String {
    let view_pub = view_priv * &ED25519_BASEPOINT_TABLE;
    MoneroAddress::new(
        net.into(),
        AddressType::Legacy,
        to_monero_point(spend),
        to_monero_point(view_pub),
    )
    .to_string()
}

fn shared_view(own: &SwapKeys, cp: &Counterparty) -> ScalarQ {
    ScalarQ::from_bytes_mod_order(own.view_bytes()) + ScalarQ::from_bytes_mod_order(cp.view_private)
}

/// Dirección donde el maker bloquea el XMR (gasto P_a + P_b, vista v_a + v_b) y su llave de vista.
/// Ambas partes obtienen exactamente la misma.
pub fn shared_address(own: &SwapKeys, cp: &Counterparty, net: Network) -> SharedWallet {
    let view = shared_view(own, cp);
    SharedWallet {
        address: address(net, own.spend_public() + cp.spend_public, &view),
        private_view_key: hex::encode(view.to_bytes()),
        private_spend_key: None,
    }
}

/// Con el secreto que la contraparte reveló en el contrato (`bytes32` big-endian del evento
/// `Claimed` o `Refunded`), reconstruye la llave de gasto completa del XMR.
pub fn recover_shared_wallet(
    own: &SwapKeys,
    cp: &Counterparty,
    revealed_secret_be: &str,
    net: Network,
) -> Result<SharedWallet, Error> {
    let mut le = Zeroizing::new(parse32(revealed_secret_be, "secreto revelado")?);
    le.reverse();
    let theirs = Zeroizing::new(ScalarQ::from_canonical_bytes(*le).ok_or(Error::InvalidScalar)?);
    if &*theirs * &ED25519_BASEPOINT_TABLE != cp.spend_public {
        return Err(Error::RevealedSecretMismatch);
    }
    let full = Zeroizing::new(own.spend_scalar() + *theirs);
    let shared_public = own.spend_public() + cp.spend_public;
    if &*full * &ED25519_BASEPOINT_TABLE != shared_public {
        return Err(Error::SharedKeyMismatch);
    }
    let view = shared_view(own, cp);
    Ok(SharedWallet {
        address: address(net, shared_public, &view),
        private_view_key: hex::encode(view.to_bytes()),
        private_spend_key: Some(hex::encode(full.to_bytes())),
    })
}

/// Dirección estándar de una sola llave (para vectores cruzados con otras wallets).
pub fn standard_address(keys: &SwapKeys, net: Network) -> String {
    address(
        net,
        keys.spend_public(),
        &ScalarQ::from_bytes_mod_order(keys.view_bytes()),
    )
}
