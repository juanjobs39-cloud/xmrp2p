//! CLI del núcleo criptográfico para el daemon del maker (y otros lenguajes).
//!
//! Lee UNA petición JSON por la entrada estándar y escribe UNA respuesta JSON por la salida.
//! Los secretos van por stdin (no por argumentos), para que no aparezcan en la lista de procesos.
//!
//! Peticiones:
//!   {"cmd":"generate"}
//!   {"cmd":"restore","own_spend":"<hex>"}
//!   {"cmd":"verify","counterparty":{...PublicMessage}}
//!   {"cmd":"shared","own_spend":"<hex>","counterparty":{...},"network":"stagenet"}
//!   {"cmd":"recover","own_spend":"<hex>","counterparty":{...},"revealed_secret":"0x..","network":"stagenet"}
//! Respuesta: {"ok":true,"result":{...}} o {"ok":false,"error":"..."}

use serde::Deserialize;
use serde_json::{json, Value};
use std::io::Read;
use xmrp2p_crypto::{
    recover_shared_wallet, shared_address, Counterparty, Error, Network, PublicMessage, SwapKeys,
};
use zeroize::Zeroizing;

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase")]
enum Req {
    Generate,
    Restore {
        own_spend: Zeroizing<String>,
    },
    Verify {
        counterparty: PublicMessage,
    },
    Shared {
        own_spend: Zeroizing<String>,
        counterparty: PublicMessage,
        network: String,
    },
    Recover {
        own_spend: Zeroizing<String>,
        counterparty: PublicMessage,
        revealed_secret: String,
        network: String,
    },
}

fn keys_json(k: &SwapKeys) -> Value {
    json!({
        "spend_private": *k.spend_private_hex(),
        "contract_secret": *k.contract_secret(),
        "message": k.public_message(),
    })
}

fn run(input: &str) -> Result<Value, Error> {
    let req: Req = serde_json::from_str(input).map_err(|e| Error::Json(e.to_string()))?;
    Ok(match req {
        Req::Generate => keys_json(&SwapKeys::generate()),
        Req::Restore { own_spend } => keys_json(&SwapKeys::from_spend_hex(&own_spend)?),
        Req::Verify { counterparty } => {
            let cp = Counterparty::verify(&counterparty)?;
            json!({ "contract_commitment": format!("0x{}", hex::encode(cp.contract_commitment)) })
        }
        Req::Shared {
            own_spend,
            counterparty,
            network,
        } => {
            let own = SwapKeys::from_spend_hex(&own_spend)?;
            let cp = Counterparty::verify(&counterparty)?;
            let net: Network = network.parse()?;
            serde_json::to_value(shared_address(&own, &cp, net)).expect("serializa")
        }
        Req::Recover {
            own_spend,
            counterparty,
            revealed_secret,
            network,
        } => {
            let own = SwapKeys::from_spend_hex(&own_spend)?;
            let cp = Counterparty::verify(&counterparty)?;
            let net: Network = network.parse()?;
            let w = recover_shared_wallet(&own, &cp, &revealed_secret, net)?;
            serde_json::to_value(&w).expect("serializa")
        }
    })
}

fn main() {
    let mut input = Zeroizing::new(String::new());
    if std::io::stdin().read_to_string(&mut input).is_err() {
        println!(
            "{}",
            json!({ "ok": false, "error": "no se pudo leer stdin" })
        );
        std::process::exit(2);
    }
    match run(&input) {
        Ok(result) => println!("{}", json!({ "ok": true, "result": result })),
        Err(e) => {
            println!("{}", json!({ "ok": false, "error": e.to_string() }));
            std::process::exit(1);
        }
    }
}
