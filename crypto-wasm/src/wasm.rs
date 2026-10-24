//! API para JavaScript (wasm-bindgen). Entradas y salidas en JSON o hex; los errores se lanzan
//! como excepciones de JS con el mensaje en español.

use crate::{Counterparty, Error, Network, PublicMessage, SwapKeys};
use serde::Serialize;
use wasm_bindgen::prelude::*;

fn js(e: Error) -> JsError {
    JsError::new(&e.to_string())
}

fn parse_msg(json: &str) -> Result<PublicMessage, JsError> {
    serde_json::from_str(json).map_err(|e| js(Error::Json(e.to_string())))
}

fn net(n: &str) -> Result<Network, JsError> {
    n.parse().map_err(js)
}

#[derive(Serialize)]
struct Generated<'a> {
    /// Guardar en el archivo de recuperación ANTES de depositar. Nunca enviarlo a nadie.
    spend_private: &'a str,
    /// bytes32 big-endian para `refund` (taker) o `claim` (maker).
    contract_secret: &'a str,
    /// Mensaje público para la contraparte.
    message: PublicMessage,
}

/// Genera una mitad de llave nueva con su mensaje público y prueba DLEQ.
#[wasm_bindgen(js_name = generateKeys)]
pub fn generate_keys() -> String {
    let k = SwapKeys::generate();
    let spend = k.spend_private_hex();
    let secret = k.contract_secret();
    serde_json::to_string(&Generated {
        spend_private: &spend,
        contract_secret: &secret,
        message: k.public_message(),
    })
    .expect("serializa")
}

/// Rehace el mensaje público a partir de la llave de gasto (al reanudar desde el archivo de recuperación).
#[wasm_bindgen(js_name = restoreKeys)]
pub fn restore_keys(spend_private_hex: &str) -> Result<String, JsError> {
    let k = SwapKeys::from_spend_hex(spend_private_hex).map_err(js)?;
    let spend = k.spend_private_hex();
    let secret = k.contract_secret();
    Ok(serde_json::to_string(&Generated {
        spend_private: &spend,
        contract_secret: &secret,
        message: k.public_message(),
    })
    .expect("serializa"))
}

/// Verifica el mensaje de la contraparte. Devuelve su commitment para compararlo con el contrato.
#[wasm_bindgen(js_name = verifyCounterparty)]
pub fn verify_counterparty(message_json: &str) -> Result<String, JsError> {
    let cp = Counterparty::verify(&parse_msg(message_json)?).map_err(js)?;
    Ok(format!("0x{}", hex::encode(cp.contract_commitment)))
}

/// Dirección compartida y llave de vista compartida (para verificar el bloqueo del XMR).
#[wasm_bindgen(js_name = sharedAddress)]
pub fn shared_address(
    own_spend_hex: &str,
    counterparty_json: &str,
    network: &str,
) -> Result<String, JsError> {
    let own = SwapKeys::from_spend_hex(own_spend_hex).map_err(js)?;
    let cp = Counterparty::verify(&parse_msg(counterparty_json)?).map_err(js)?;
    Ok(serde_json::to_string(&crate::shared_address(&own, &cp, net(network)?)).expect("serializa"))
}

/// Llave de gasto completa a partir del secreto revelado por la contraparte en el contrato.
#[wasm_bindgen(js_name = recoverWallet)]
pub fn recover_wallet(
    own_spend_hex: &str,
    counterparty_json: &str,
    revealed_secret_be: &str,
    network: &str,
) -> Result<String, JsError> {
    let own = SwapKeys::from_spend_hex(own_spend_hex).map_err(js)?;
    let cp = Counterparty::verify(&parse_msg(counterparty_json)?).map_err(js)?;
    let w =
        crate::recover_shared_wallet(&own, &cp, revealed_secret_be, net(network)?).map_err(js)?;
    Ok(serde_json::to_string(&w).expect("serializa"))
}

/// Dirección estándar de una mitad (solo para pruebas cruzadas con otras wallets).
#[wasm_bindgen(js_name = standardAddress)]
pub fn standard_address(spend_private_hex: &str, network: &str) -> Result<String, JsError> {
    let k = SwapKeys::from_spend_hex(spend_private_hex).map_err(js)?;
    Ok(crate::standard_address(&k, net(network)?))
}
