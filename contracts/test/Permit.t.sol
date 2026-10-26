// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {TestUSDT} from "../src/testnet/TestUSDT.sol";

contract PermitTest is Test {
    TestUSDT tok;
    SwapFactory factory;
    uint256 takerKey = 0xA11CE;
    address taker;
    address maker = makeAddr("maker");
    uint256 constant AMOUNT = 500e6;

    function setUp() public {
        tok = new TestUSDT();
        factory = new SwapFactory(
            SwapFactory.Config(IERC20(address(tok)), 50, makeAddr("fee"), 1e6, type(uint256).max, 10 minutes, 2 days)
        );
        taker = vm.addr(takerKey);
        vm.prank(taker);
        tok.faucet(AMOUNT);
    }

    function _c(uint256 s) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(vm.addr(s))));
    }

    function _sign(uint256 value, uint256 deadline) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                taker,
                address(factory),
                value,
                tok.nonces(taker),
                deadline
            )
        );
        (v, r, s) =
            vm.sign(takerKey, keccak256(abi.encodePacked("\x19\x01", tok.DOMAIN_SEPARATOR(), structHash)));
    }

    function test_newSwapWithPermit() public {
        (uint8 v, bytes32 r, bytes32 s) = _sign(AMOUNT, block.timestamp + 1 hours);
        vm.prank(taker);
        address e = factory.newSwapWithPermit(
            maker, _c(0xb0b), _c(0xa11ce), 1 hours, 1 hours, AMOUNT, "p", block.timestamp + 1 hours, v, r, s
        );
        assertEq(tok.balanceOf(e), AMOUNT);
    }

    /// Alguien copia la firma del mempool y la usa primero: el swap igual se crea.
    function test_permitAdelantadoNoBloquea() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(AMOUNT, deadline);
        tok.permit(taker, address(factory), AMOUNT, deadline, v, r, s); // atacante
        vm.prank(taker);
        address e = factory.newSwapWithPermit(
            maker, _c(0xb0b), _c(0xa11ce), 1 hours, 1 hours, AMOUNT, "p", deadline, v, r, s
        );
        assertEq(tok.balanceOf(e), AMOUNT);
    }

    function test_permitInvalidoSinAutorizacionRevierte() public {
        vm.prank(taker);
        vm.expectRevert();
        factory.newSwapWithPermit(
            maker,
            _c(0xb0b),
            _c(0xa11ce),
            1 hours,
            1 hours,
            AMOUNT,
            "p",
            block.timestamp,
            27,
            bytes32(0),
            bytes32(0)
        );
    }

    function test_faucetLimitado() public {
        vm.expectRevert(TestUSDT.TooMuch.selector);
        tok.faucet(10_001e6);
        assertEq(tok.decimals(), 6);
    }
}
