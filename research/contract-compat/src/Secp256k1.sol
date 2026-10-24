// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

/// @notice Verifica Q = s·G en secp256k1 abusando de `ecrecover` (idea de Vitalik Buterin,
/// usada también por AthanorLabs). Fase 0: prototipo de investigación, NO auditado.
/// @dev ecrecover(h=0, v=27, r=Gx, s=s·Gx mod n) devuelve address(keccak(s·G)).
library Secp256k1 {
    uint256 internal constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 internal constant N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    /// @param scalar secreto (big-endian, como lo entrega crypto-wasm)
    /// @param commitment keccak256(x || y) de la llave pública esperada
    function mulVerify(uint256 scalar, bytes32 commitment) internal pure returns (bool) {
        if (scalar == 0 || scalar >= N) return false;
        address q = ecrecover(0, 27, bytes32(GX), bytes32(mulmod(scalar, GX, N)));
        return q != address(0) && uint160(uint256(commitment)) == uint160(q);
    }
}
