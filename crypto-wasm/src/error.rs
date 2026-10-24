use thiserror::Error as ThisError;

/// Errores del núcleo criptográfico. Los mensajes están en español porque llegan a la interfaz.
#[derive(Debug, ThisError, PartialEq, Eq)]
pub enum Error {
    #[error("hex inválido en {0}")]
    Hex(&'static str),
    #[error("longitud inválida en {0}")]
    Length(&'static str),
    #[error("punto ed25519 inválido o fuera del subgrupo primo")]
    InvalidEd25519Point,
    #[error("punto secp256k1 inválido")]
    InvalidSecp256k1Point,
    #[error("escalar inválido (debe ser < 2^252 y distinto de cero)")]
    InvalidScalar,
    #[error("la prueba DLEQ no verifica")]
    InvalidDleq,
    #[error("no se pudo decodificar la prueba DLEQ")]
    DleqEncoding,
    #[error("la llave de vista no corresponde")]
    ViewKeyMismatch,
    #[error("el secreto revelado no corresponde a la llave pública de la contraparte")]
    RevealedSecretMismatch,
    #[error("la llave reconstruida no corresponde a la dirección compartida")]
    SharedKeyMismatch,
    #[error("JSON inválido: {0}")]
    Json(String),
    #[error("red desconocida: {0}")]
    Network(String),
}
