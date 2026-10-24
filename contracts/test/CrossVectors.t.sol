// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {Secp256k1} from "../src/lib/Secp256k1.sol";

contract Secp256k1Harness {
    function verify(uint256 s, bytes32 c) external pure returns (bool) {
        return Secp256k1.mulVerify(s, c);
    }
}

/// Vectores generados por research/dleq-wasm (Rust, sigma_fun + keccak):
/// el secreto de 252 bits que produce la DLEQ debe abrir el commitment en el contrato.
contract CrossVectorsTest is Test {
    using stdJson for string;

    struct Vector {
        bytes32 commitment;
        bytes32 secret;
    }

    Secp256k1Harness h;

    function setUp() public {
        h = new Secp256k1Harness();
    }

    function test_vectoresRust() public view {
        string memory json = vm.readFile("test/vectors/rust-sigma_fun.json");
        Vector[] memory vs = abi.decode(json.parseRaw(".vectors"), (Vector[]));
        assertGt(vs.length, 0);
        for (uint256 i; i < vs.length; i++) {
            uint256 s = uint256(vs[i].secret);
            assertLt(s, 2 ** 252, "secreto de mas de 252 bits");
            assertTrue(h.verify(s, vs[i].commitment), "vector no verifica");
            assertFalse(h.verify(s + 1, vs[i].commitment));
            assertEq(uint160(uint256(vs[i].commitment)), uint160(vm.addr(s)));
        }
    }

    function testFuzz_mulVerifyIgualQueVmAddr(uint256 s) public view {
        s = bound(s, 1, Secp256k1.N - 1);
        assertTrue(h.verify(s, bytes32(uint256(uint160(vm.addr(s))))));
    }

    function test_mulVerifyBordes() public view {
        assertFalse(h.verify(0, bytes32(uint256(1))));
        assertFalse(h.verify(Secp256k1.N, bytes32(uint256(uint160(vm.addr(1))))));
        assertFalse(h.verify(1, bytes32(0)));
    }
}
