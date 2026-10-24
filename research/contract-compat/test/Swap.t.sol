// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {SafeTokenTransfer} from "../src/SafeTokenTransfer.sol";
import {Secp256k1} from "../src/Secp256k1.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

contract SecpHarness {
    function verify(uint256 s, bytes32 c) external pure returns (bool) {
        return Secp256k1.mulVerify(s, c);
    }
}

abstract contract SwapTestBase is Test {
    MockUSDT usdt;
    SwapFactory factory;
    address taker = makeAddr("taker");
    address maker = makeAddr("maker");
    address feeTo = makeAddr("feeTo");

    // Secretos de prueba (escalares < 2^252). El commitment son los 160 bits bajos de keccak(Q),
    // que es justo lo que devuelve vm.addr.
    uint256 constant S_TAKER = 0x0a11ce;
    uint256 constant S_MAKER = 0x0b0b;
    uint64 constant D0 = 1 hours;
    uint64 constant D1 = 1 hours;
    uint256 constant AMOUNT = 1_000e6;

    function mode() internal pure virtual returns (MockUSDT.Mode);

    function commit(uint256 s) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(vm.addr(s))));
    }

    function setUp() public {
        usdt = new MockUSDT(mode());
        factory = new SwapFactory(50, feeTo); // 0,5 %
        usdt.mint(taker, 10 * AMOUNT);
        vm.prank(taker);
        usdt.approve(address(factory), type(uint256).max);
    }

    function _newSwap(bytes32 salt) internal returns (SwapEscrow e) {
        vm.prank(taker);
        e = SwapEscrow(
            factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, IERC20(address(usdt)), AMOUNT, salt)
        );
    }

    function test_exito_conReady() public {
        SwapEscrow e = _newSwap("1");
        assertEq(usdt.balanceOf(address(e)), AMOUNT);
        vm.prank(taker);
        e.setReady();
        vm.prank(maker);
        e.claim(bytes32(S_MAKER));
        assertEq(usdt.balanceOf(maker), AMOUNT - AMOUNT * 50 / 10_000);
        assertEq(usdt.balanceOf(feeTo), AMOUNT * 50 / 10_000);
        assertEq(uint8(e.stage()), uint8(SwapEscrow.Stage.COMPLETED));
    }

    function test_reembolso_antesDeT0() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.refund(bytes32(S_TAKER));
        assertEq(usdt.balanceOf(taker), 10 * AMOUNT);
    }

    function test_claimAutomatico_trasT0_sinReady() public {
        // RIESGO documentado: si el taker no aparece antes de t0, el maker puede reclamar.
        SwapEscrow e = _newSwap("1");
        vm.warp(block.timestamp + D0);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER));
        assertGt(usdt.balanceOf(maker), 0);
    }

    function test_noReembolsoEntreT0yT1() public {
        SwapEscrow e = _newSwap("1");
        vm.warp(block.timestamp + D0);
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.NotTimeToRefund.selector);
        e.refund(bytes32(S_TAKER));
    }

    function test_noReembolsoTrasReady() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.setReady();
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.NotTimeToRefund.selector);
        e.refund(bytes32(S_TAKER));
    }

    function test_reembolso_trasT1() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.setReady();
        vm.warp(block.timestamp + D0 + D1);
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.TooLateToClaim.selector);
        e.claim(bytes32(S_MAKER));
        vm.prank(taker);
        e.refund(bytes32(S_TAKER));
        assertEq(usdt.balanceOf(taker), 10 * AMOUNT);
    }

    function test_claim_secretoInvalido() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.setReady();
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.claim(bytes32(S_TAKER));
    }

    function test_claim_soloMaker() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.setReady();
        vm.expectRevert(SwapEscrow.OnlyClaimer.selector);
        e.claim(bytes32(S_MAKER));
    }

    function test_noDobleClaim() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        e.setReady();
        vm.startPrank(maker);
        e.claim(bytes32(S_MAKER));
        vm.expectRevert(SwapEscrow.BadStage.selector);
        e.claim(bytes32(S_MAKER));
        vm.stopPrank();
    }

    function test_implementacionNoInicializable() public {
        SwapEscrow impl = SwapEscrow(factory.implementation());
        SwapEscrow.Params memory p;
        vm.expectRevert(SwapEscrow.AlreadyInitialized.selector);
        impl.initialize(p);
    }

    function test_aislamiento_listaNegra() public {
        // Si el emisor congela un escrow, los demás siguen funcionando.
        SwapEscrow a = _newSwap("a");
        SwapEscrow b = _newSwap("b");
        usdt.addBlackList(address(a));
        vm.prank(taker);
        vm.expectRevert(SafeTokenTransfer.TokenTransferFailed.selector);
        a.refund(bytes32(S_TAKER));
        vm.prank(taker);
        b.refund(bytes32(S_TAKER));
        assertEq(usdt.balanceOf(taker), 9 * AMOUNT);
    }

    function testFuzz_comision(uint96 amount, uint16 bps) public {
        bps = uint16(bound(bps, 0, 100));
        amount = uint96(bound(amount, 1, 1e15));
        SwapFactory f = new SwapFactory(bps, feeTo);
        usdt.mint(taker, amount);
        vm.startPrank(taker);
        usdt.approve(address(f), amount);
        SwapEscrow e = SwapEscrow(
            f.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, IERC20(address(usdt)), amount, "f")
        );
        e.setReady();
        vm.stopPrank();
        uint256 before = usdt.balanceOf(maker) + usdt.balanceOf(feeTo);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER));
        assertEq(usdt.balanceOf(maker) + usdt.balanceOf(feeTo) - before, amount); // nada se pierde
        assertLe(usdt.balanceOf(feeTo), uint256(amount) * 100 / 10_000);
    }

    function test_comisionSobreTope_revierte() public {
        vm.expectRevert(SwapEscrow.FeeTooHigh.selector);
        new SwapFactory(101, feeTo);
    }
}

contract SwapStandardTest is SwapTestBase {
    function mode() internal pure override returns (MockUSDT.Mode) { return MockUSDT.Mode.STANDARD; }
}

contract SwapNoReturnEthTest is SwapTestBase {
    function mode() internal pure override returns (MockUSDT.Mode) { return MockUSDT.Mode.NO_RETURN_ETH; }
}

contract SwapFalseReturnTronTest is SwapTestBase {
    function mode() internal pure override returns (MockUSDT.Mode) { return MockUSDT.Mode.FALSE_RETURN_TRON; }
}

/// Prueba cruzada: vector generado por research/dleq-wasm (Rust, sigma_fun + keccak).
contract CrossVectorTest is Test {
    function test_vectorRust() public {
        SecpHarness h = new SecpHarness();
        uint256 s = 0x0b9fd45b3eb8e0c24e48b8c277389c362677b61a00521baffa6d55fd7374f75b;
        bytes32 c = 0x7aa54cb951b39264d27828c80da21070273684cbf8af4cf10231ce2278d8680f;
        assertTrue(h.verify(s, c));
        assertFalse(h.verify(s + 1, c));
        assertEq(uint160(uint256(c)), uint160(vm.addr(s))); // misma llave que deriva Foundry
    }
}
