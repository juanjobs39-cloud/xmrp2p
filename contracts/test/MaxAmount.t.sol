// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {Base} from "./Base.t.sol";

/// @notice Tope por swap de la beta en dinero real (100 USDT): nadie puede depositar más en un escrow.
contract MaxAmountTest is Base {
    uint256 internal constant CAP = 100e6;

    function setUp() public override {
        super.setUp();
        factory = new SwapFactory(
            SwapFactory.Config({
                token: IERC20(address(usdt)),
                feeBps: FEE_BPS,
                feeRecipient: feeTo,
                minAmount: MIN_AMOUNT,
                maxAmount: CAP,
                minDuration: MIN_D,
                maxDuration: MAX_D
            })
        );
        vm.prank(taker);
        usdt.approve(address(factory), type(uint256).max);
    }

    function test_tope_exacto_permitido() public {
        SwapEscrow e = _newSwap(bytes32("a"), CAP);
        assertEq(e.amount(), CAP);
        assertEq(usdt.balanceOf(address(e)), CAP);
        assertEq(factory.MAX_AMOUNT(), CAP);
    }

    function test_por_encima_del_tope_revierte() public {
        vm.prank(taker);
        vm.expectRevert(SwapFactory.AmountTooHigh.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, CAP + 1, bytes32("b"));
    }

    function test_permit_tambien_respeta_el_tope() public {
        vm.prank(taker);
        vm.expectRevert(SwapFactory.AmountTooHigh.selector);
        factory.newSwapWithPermit(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, CAP + 1, bytes32("c"), 0, 0, 0, 0);
    }

    function testFuzz_ningun_escrow_supera_el_tope(uint256 amount) public {
        amount = bound(amount, MIN_AMOUNT, 10 * CAP);
        uint256 before = usdt.balanceOf(taker);
        vm.prank(taker);
        if (amount > CAP) {
            vm.expectRevert(SwapFactory.AmountTooHigh.selector);
            factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, amount, bytes32("f"));
            assertEq(usdt.balanceOf(taker), before); // no se movió nada
        } else {
            SwapEscrow e = SwapEscrow(factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, amount, bytes32("f")));
            assertLe(usdt.balanceOf(address(e)), CAP);
        }
    }
}
