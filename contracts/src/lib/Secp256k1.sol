// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

/// @title Secp256k1
/// @notice Verifica que `Q = s·G` en secp256k1 usando `ecrecover` como multiplicación escalar.
/// @dev Idea de Vitalik Buterin (ethresear.ch, "you can kinda abuse ecrecover to do ecmul"),
///      la misma que usa AthanorLabs. Con h = 0, v = 27, r = Gx y s' = s·Gx mod n,
///      ecrecover devuelve address(keccak256(s·G)). Se comparan los 160 bits bajos del
///      commitment, igual que una dirección de Ethereum.
library Secp256k1 {
    uint256 internal constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 internal constant N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    /// @param scalar secreto big-endian (lo entrega crypto-wasm)
    /// @param commitment keccak256(x || y) de la llave pública esperada (solo cuentan sus 160 bits bajos)
    function mulVerify(uint256 scalar, bytes32 commitment) internal pure returns (bool) {
        if (scalar == 0 || scalar >= N) return false;
        address q = ecrecover(0, 27, bytes32(GX), bytes32(mulmod(scalar, GX, N)));
        return q != address(0) && uint160(uint256(commitment)) == uint160(q);
    }
}
