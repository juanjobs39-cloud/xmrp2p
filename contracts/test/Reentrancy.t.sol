// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {ReentrantToken} from "./mocks/ReentrantToken.sol";

/// El token de producción es fijo (USDT), pero comprobamos que aun con un token que reingresa
/// no se puede cobrar dos veces ni sacar más de lo depositado.
contract ReentrancyTest is Test {
    ReentrantToken tok;
    SwapFactory factory;
    address taker = makeAddr("taker");
    address feeTo = makeAddr("feeTo");
    uint256 constant S_TAKER = 0x0a11ce;
    uint256 constant S_MAKER = 0x0b0b;
    uint256 constant AMOUNT = 1_000e6;

    /// El maker es este contrato para poder reingresar como `claimer`.
    function setUp() public {
        tok = new ReentrantToken();
        factory = new SwapFactory(SwapFactory.Config(IERC20(address(tok)), 50, feeTo, 1, type(uint256).max, 10 minutes, 2 days));
        tok.mint(taker, AMOUNT);
        vm.prank(taker);
        tok.approve(address(factory), AMOUNT);
    }

    function _swap() internal returns (SwapEscrow e) {
        vm.prank(taker);
        e = SwapEscrow(
            factory.newSwap(
                address(this),
                bytes32(uint256(uint160(vm.addr(S_MAKER)))),
                bytes32(uint256(uint160(vm.addr(S_TAKER)))),
                1 hours,
                1 hours,
                AMOUNT,
                "r"
            )
        );
    }

    function test_reingresoEnClaimNoCobraDosVeces() public {
        SwapEscrow e = _swap();
        vm.prank(taker);
        e.setReady();
        // Durante la transferencia del claim, el token vuelve a llamar a claim (como este contrato no es
        // msg.sender en la llamada del token, se usa un payload que el token ejecuta como sí mismo:
        // debe fallar por OnlyClaimer; y un segundo intento directo falla por BadStage).
        tok.arm(address(e), abi.encodeCall(SwapEscrow.claim, (bytes32(S_MAKER), address(this))));
        e.claim(bytes32(S_MAKER), address(this));
        assertTrue(tok.reentered());
        assertFalse(tok.reentrySucceeded());
        vm.expectRevert(SwapEscrow.BadStage.selector);
        e.claim(bytes32(S_MAKER), address(this));
        uint256 fee = AMOUNT * 50 / 10_000;
        assertEq(tok.balanceOf(address(this)), AMOUNT - fee);
        assertEq(tok.balanceOf(address(e)), fee);
    }

    function test_reingresoWithdrawFeeDuranteClaimNoDuplica() public {
        SwapEscrow e = _swap();
        vm.prank(taker);
        e.setReady();
        tok.arm(address(e), abi.encodeCall(SwapEscrow.withdrawFee, ()));
        e.claim(bytes32(S_MAKER), address(this));
        // La comisión se pagó una sola vez y nada quedó en el escrow.
        assertEq(tok.balanceOf(feeTo) + tok.balanceOf(address(this)), AMOUNT);
        assertEq(tok.balanceOf(address(e)), 0);
        vm.expectRevert(SwapEscrow.NothingToWithdraw.selector);
        e.withdrawFee();
    }

    function test_reingresoRefundDuranteRefund() public {
        SwapEscrow e = _swap();
        tok.arm(address(e), abi.encodeCall(SwapEscrow.refund, (bytes32(S_TAKER), taker)));
        vm.prank(taker);
        e.refund(bytes32(S_TAKER), taker);
        assertFalse(tok.reentrySucceeded());
        assertEq(tok.balanceOf(taker), AMOUNT);
    }
}
