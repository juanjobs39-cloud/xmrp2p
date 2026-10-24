//! Simula el intercambio de llaves de un swap completo entre taker y maker.

use xmrp2p_crypto::{
    recover_shared_wallet, shared_address, Counterparty, Error, Network, PublicMessage, SwapKeys,
};

struct Party {
    keys: SwapKeys,
    msg: PublicMessage,
}

fn party() -> Party {
    let keys = SwapKeys::generate();
    let msg = keys.public_message();
    Party { keys, msg }
}

#[test]
fn ambas_partes_obtienen_la_misma_direccion_compartida() {
    let (taker, maker) = (party(), party());
    let cp_of_taker = Counterparty::verify(&maker.msg).unwrap();
    let cp_of_maker = Counterparty::verify(&taker.msg).unwrap();
    let a = shared_address(&taker.keys, &cp_of_taker, Network::Stagenet);
    let b = shared_address(&maker.keys, &cp_of_maker, Network::Stagenet);
    assert_eq!(a.address, b.address);
    assert_eq!(a.private_view_key, b.private_view_key);
    assert!(
        a.address.starts_with('5'),
        "stagenet empieza con 5: {}",
        a.address
    );
    assert!(a.private_spend_key.is_none());
}

#[test]
fn claim_del_maker_le_da_el_xmr_al_taker() {
    let (taker, maker) = (party(), party());
    let cp = Counterparty::verify(&maker.msg).unwrap();
    // El maker reveló su secreto en `claim`; el taker lo lee del evento.
    let revealed = maker.keys.contract_secret();
    let w = recover_shared_wallet(&taker.keys, &cp, &revealed, Network::Stagenet).unwrap();
    let expected = shared_address(&taker.keys, &cp, Network::Stagenet);
    assert_eq!(w.address, expected.address);
    assert_eq!(w.private_spend_key.as_ref().unwrap().len(), 64);
}

#[test]
fn refund_del_taker_le_devuelve_el_xmr_al_maker() {
    let (taker, maker) = (party(), party());
    let cp = Counterparty::verify(&taker.msg).unwrap();
    let revealed = taker.keys.contract_secret();
    let w = recover_shared_wallet(&maker.keys, &cp, &revealed, Network::Mainnet).unwrap();
    assert!(w.address.starts_with('4'));
}

#[test]
fn ambas_reconstrucciones_dan_la_misma_llave() {
    let (taker, maker) = (party(), party());
    let a = recover_shared_wallet(
        &taker.keys,
        &Counterparty::verify(&maker.msg).unwrap(),
        &maker.keys.contract_secret(),
        Network::Stagenet,
    )
    .unwrap();
    let b = recover_shared_wallet(
        &maker.keys,
        &Counterparty::verify(&taker.msg).unwrap(),
        &taker.keys.contract_secret(),
        Network::Stagenet,
    )
    .unwrap();
    assert_eq!(a.private_spend_key, b.private_spend_key);
}

#[test]
fn secreto_revelado_falso_se_rechaza() {
    let (taker, maker, other) = (party(), party(), party());
    let cp = Counterparty::verify(&maker.msg).unwrap();
    let err = recover_shared_wallet(
        &taker.keys,
        &cp,
        &other.keys.contract_secret(),
        Network::Stagenet,
    )
    .err()
    .unwrap();
    assert_eq!(err, Error::RevealedSecretMismatch);
}

#[test]
fn prueba_dleq_ajena_se_rechaza() {
    let (a, b) = (party(), party());
    let mut forged = a.msg.clone();
    forged.dleq_proof = b.msg.dleq_proof.clone();
    assert_eq!(
        Counterparty::verify(&forged).err(),
        Some(Error::InvalidDleq)
    );
}

#[test]
fn llave_secp256k1_cambiada_se_rechaza() {
    // Ataque: mostrar en el contrato una llave distinta de la de Monero.
    let (a, b) = (party(), party());
    let mut forged = a.msg.clone();
    forged.public_secp256k1 = b.msg.public_secp256k1.clone();
    forged.contract_commitment = b.msg.contract_commitment.clone();
    assert_eq!(
        Counterparty::verify(&forged).err(),
        Some(Error::InvalidDleq)
    );
}

#[test]
fn commitment_que_no_corresponde_se_rechaza() {
    let (a, b) = (party(), party());
    let mut forged = a.msg.clone();
    forged.contract_commitment = b.msg.contract_commitment.clone();
    assert!(Counterparty::verify(&forged).is_err());
}

#[test]
fn prueba_corrupta_o_vacia_se_rechaza() {
    let a = party();
    let mut m = a.msg.clone();
    m.dleq_proof = String::new();
    assert_eq!(Counterparty::verify(&m).err(), Some(Error::DleqEncoding));
    let mut m = a.msg.clone();
    m.dleq_proof.replace_range(0..2, "02"); // versión desconocida
    assert_eq!(Counterparty::verify(&m).err(), Some(Error::DleqEncoding));
    let mut m = a.msg.clone();
    let mid = m.dleq_proof.len() / 2;
    let c = if &m.dleq_proof[mid..mid + 1] == "0" {
        "1"
    } else {
        "0"
    };
    m.dleq_proof.replace_range(mid..mid + 1, c);
    assert!(Counterparty::verify(&m).is_err());
}

#[test]
fn punto_ed25519_de_orden_pequeno_se_rechaza() {
    let a = party();
    let mut m = a.msg.clone();
    // Identidad (orden pequeño): 0x01 seguido de ceros.
    m.spend_public_ed25519 = format!("01{}", "00".repeat(31));
    assert_eq!(
        Counterparty::verify(&m).err(),
        Some(Error::InvalidEd25519Point)
    );
}

#[test]
fn llave_de_vista_no_canonica_se_rechaza() {
    let a = party();
    let mut m = a.msg.clone();
    m.view_private = "ff".repeat(32);
    assert_eq!(Counterparty::verify(&m).err(), Some(Error::ViewKeyMismatch));
}

#[test]
fn restaurar_desde_la_llave_de_gasto() {
    let a = party();
    let restored = SwapKeys::from_spend_hex(&a.keys.spend_private_hex()).unwrap();
    let m = restored.public_message();
    assert_eq!(m.spend_public_ed25519, a.msg.spend_public_ed25519);
    assert_eq!(m.view_private, a.msg.view_private);
    assert_eq!(m.contract_commitment, a.msg.contract_commitment);
    assert_eq!(restored.contract_secret(), a.keys.contract_secret());
}

#[test]
fn llaves_de_mas_de_252_bits_se_rechazan() {
    let mut big = [0u8; 32];
    big[0] = 1;
    big[31] = 0x10;
    assert_eq!(
        SwapKeys::from_spend_bytes(big).err(),
        Some(Error::InvalidScalar)
    );
    assert_eq!(
        SwapKeys::from_spend_bytes([0u8; 32]).err(),
        Some(Error::InvalidScalar)
    );
}

#[test]
fn tamano_del_mensaje() {
    let a = party();
    let json = serde_json::to_string(&a.msg).unwrap();
    println!(
        "prueba DLEQ binaria: {} bytes; mensaje JSON: {} bytes",
        a.msg.dleq_proof.len() / 2,
        json.len()
    );
    assert!(json.len() < 200_000);
}
