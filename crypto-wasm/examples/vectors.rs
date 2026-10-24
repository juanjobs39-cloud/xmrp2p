//! Genera vectores para pruebas cruzadas con otras implementaciones:
//!   cargo run --release --example vectors > tests/vectors/vectors.json
//! - `standard`: mitad suelta → dirección estándar (comparar con monero-ts / wallet oficial).
//! - `swaps`: dos mitades → dirección compartida, llave completa y secretos del contrato.

use serde_json::json;
use xmrp2p_crypto::{
    recover_shared_wallet, shared_address, standard_address, Counterparty, Network, SwapKeys,
};

fn main() {
    let mut standard = vec![];
    for _ in 0..6 {
        let k = SwapKeys::generate();
        let m = k.public_message();
        standard.push(json!({
            "spend_private": *k.spend_private_hex(),
            "view_private": m.view_private,
            "spend_public": m.spend_public_ed25519,
            "address_mainnet": standard_address(&k, Network::Mainnet),
            "address_stagenet": standard_address(&k, Network::Stagenet),
            "contract_secret": *k.contract_secret(),
            "contract_commitment": m.contract_commitment,
        }));
    }
    let mut swaps = vec![];
    for _ in 0..4 {
        let (t, mk) = (SwapKeys::generate(), SwapKeys::generate());
        let (tm, mm) = (t.public_message(), mk.public_message());
        let cp = Counterparty::verify(&mm).unwrap();
        let shared = shared_address(&t, &cp, Network::Stagenet);
        let full =
            recover_shared_wallet(&t, &cp, &mk.contract_secret(), Network::Stagenet).unwrap();
        swaps.push(json!({
            "taker_spend": *t.spend_private_hex(),
            "maker_spend": *mk.spend_private_hex(),
            "taker_commitment": tm.contract_commitment,
            "maker_commitment": mm.contract_commitment,
            "taker_contract_secret": *t.contract_secret(),
            "maker_contract_secret": *mk.contract_secret(),
            "shared_address_stagenet": shared.address,
            "shared_view_private": shared.private_view_key,
            "shared_spend_private": full.private_spend_key,
        }));
    }
    println!(
        "{}",
        serde_json::to_string_pretty(&json!({ "standard": standard, "swaps": swaps })).unwrap()
    );
}
