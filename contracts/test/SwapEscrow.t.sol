// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Base} from "./Base.t.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {SafeTokenTransfer} from "../src/lib/SafeTokenTransfer.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

/// Pruebas de comportamiento. Se ejecutan con los tres modos de USDT (ver contratos al final).
abstract contract SwapEscrowTest is Base {
    // ---------------------------------------------------------------- creación

    function test_newSwap_depositaEnElClonYGuardaParametros() public {
        address predicted = factory.predictEscrow(taker, "1");
        SwapEscrow e = _newSwap("1");
        assertEq(address(e), predicted);
        assertEq(usdt.balanceOf(address(e)), AMOUNT);
        assertEq(uint8(e.stage()), uint8(SwapEscrow.Stage.PENDING));
        assertEq(e.owner(), taker);
        assertEq(e.claimer(), maker);
        assertEq(e.t0(), block.timestamp + D0);
        assertEq(e.t1(), block.timestamp + D0 + D1);
        assertEq(address(e.TOKEN()), address(usdt));
        assertEq(e.FEE_BPS(), FEE_BPS);
    }

    function test_newSwap_emiteEvento() public {
        address predicted = factory.predictEscrow(taker, "1");
        vm.expectEmit(address(factory));
        emit SwapFactory.SwapCreated(
            predicted,
            taker,
            maker,
            commit(S_MAKER),
            commit(S_TAKER),
            uint64(block.timestamp + D0),
            uint64(block.timestamp + D0 + D1),
            AMOUNT
        );
        _newSwap("1");
    }

    function test_newSwap_saltRepetidoRevierte() public {
        _newSwap("1");
        vm.prank(taker);
        vm.expectRevert();
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "1");
    }

    function test_newSwap_mismoSaltDistintoTakerNoChoca() public {
        _newSwap("1");
        address other = makeAddr("other");
        usdt.mint(other, AMOUNT);
        vm.startPrank(other);
        usdt.approve(address(factory), AMOUNT);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "1");
        vm.stopPrank();
    }

    function test_newSwap_validaciones() public {
        vm.startPrank(taker);
        vm.expectRevert(SwapFactory.AmountTooLow.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, MIN_AMOUNT - 1, "a");
        vm.expectRevert(SwapFactory.InvalidDuration.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), MIN_D - 1, D1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidDuration.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, MAX_D + 1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidParams.selector);
        factory.newSwap(address(0), commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidParams.selector);
        factory.newSwap(taker, commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidParams.selector);
        factory.newSwap(maker, 0, commit(S_TAKER), D0, D1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidParams.selector);
        factory.newSwap(maker, commit(S_MAKER), 0, D0, D1, AMOUNT, "a");
        vm.expectRevert(SwapFactory.InvalidParams.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_MAKER), D0, D1, AMOUNT, "a");
        vm.stopPrank();
    }

    function test_newSwap_sinSaldoRevierteYNoQuedaClon() public {
        address poor = makeAddr("poor");
        vm.startPrank(poor);
        usdt.approve(address(factory), AMOUNT);
        address predicted = factory.predictEscrow(poor, "1");
        vm.expectRevert();
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "1");
        vm.stopPrank();
        assertEq(predicted.code.length, 0);
    }

    function test_newSwap_tokenConComisionPorTransferenciaRevierte() public {
        usdt.setTransferFee(10);
        vm.prank(taker);
        vm.expectRevert(SafeTokenTransfer.TokenTransferFailed.selector);
        factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, AMOUNT, "1");
    }

    function test_config_validaciones() public {
        vm.expectRevert(SwapEscrow.FeeTooHigh.selector);
        _factory(101);
        vm.expectRevert(SwapFactory.InvalidConfig.selector);
        new SwapFactory(SwapFactory.Config(IERC20(address(usdt)), FEE_BPS, feeTo, 0, type(uint256).max, MIN_D, MAX_D));
        vm.expectRevert(SwapFactory.InvalidConfig.selector);
        new SwapFactory(SwapFactory.Config(IERC20(address(usdt)), FEE_BPS, feeTo, 1, type(uint256).max, MAX_D, MIN_D));
        vm.expectRevert(SwapFactory.InvalidConfig.selector); // máximo menor que el mínimo
        new SwapFactory(SwapFactory.Config(IERC20(address(usdt)), FEE_BPS, feeTo, 10, 9, MIN_D, MAX_D));
        vm.expectRevert(SwapEscrow.ZeroAddress.selector);
        new SwapFactory(SwapFactory.Config(IERC20(address(usdt)), FEE_BPS, address(0), 1, type(uint256).max, MIN_D, MAX_D));
        vm.expectRevert(SwapEscrow.ZeroAddress.selector);
        new SwapFactory(SwapFactory.Config(IERC20(address(0)), FEE_BPS, feeTo, 1, type(uint256).max, MIN_D, MAX_D));
    }

    // ---------------------------------------------------------------- inicialización

    function test_implementacion_noInicializable() public {
        SwapEscrow impl = SwapEscrow(factory.IMPLEMENTATION());
        vm.prank(address(factory));
        vm.expectRevert(SwapEscrow.AlreadyInitialized.selector);
        impl.initialize(taker, maker, commit(S_MAKER), commit(S_TAKER), 1, 2, 1);
    }

    function test_clon_noReinicializable() public {
        SwapEscrow e = _newSwap("1");
        vm.expectRevert(SwapEscrow.OnlyFactory.selector);
        e.initialize(maker, maker, commit(S_MAKER), commit(S_TAKER), 1, 2, 1);
        vm.prank(address(factory));
        vm.expectRevert(SwapEscrow.AlreadyInitialized.selector);
        e.initialize(maker, maker, commit(S_MAKER), commit(S_TAKER), 1, 2, 1);
    }

    // ---------------------------------------------------------------- camino feliz

    function test_exito_conReady() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        uint256 fee = AMOUNT * FEE_BPS / 10_000;
        vm.expectEmit(address(e));
        emit SwapEscrow.Claimed(bytes32(S_MAKER), maker, AMOUNT - fee, fee);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        assertEq(usdt.balanceOf(maker), AMOUNT - fee);
        assertEq(usdt.balanceOf(address(e)), fee);
        assertEq(e.feeOwed(), fee);
        assertEq(uint8(e.stage()), uint8(SwapEscrow.Stage.COMPLETED));

        e.withdrawFee(); // cualquiera puede llamarlo
        assertEq(usdt.balanceOf(feeTo), fee);
        assertEq(usdt.balanceOf(address(e)), 0);
        vm.expectRevert(SwapEscrow.NothingToWithdraw.selector);
        e.withdrawFee();
    }

    function test_claim_aOtraDireccion() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        address alt = makeAddr("alt");
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), alt);
        assertGt(usdt.balanceOf(alt), 0);
        assertEq(usdt.balanceOf(maker), 0);
    }

    function test_claim_trasT0SinReady() public {
        // Riesgo heredado del protocolo (docs/ARQUITECTURA.md, riesgo 1).
        SwapEscrow e = _newSwap("1");
        vm.warp(e.t0());
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        assertGt(usdt.balanceOf(maker), 0);
    }

    function test_sinComision() public {
        factory = _factory(0);
        vm.prank(taker);
        usdt.approve(address(factory), type(uint256).max);
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        assertEq(usdt.balanceOf(maker), AMOUNT);
        vm.expectRevert(SwapEscrow.NothingToWithdraw.selector);
        e.withdrawFee();
    }

    // ---------------------------------------------------------------- reembolsos

    function test_reembolso_antesDeT0() public {
        SwapEscrow e = _newSwap("1");
        vm.expectEmit(address(e));
        emit SwapEscrow.Refunded(bytes32(S_TAKER), taker, AMOUNT);
        vm.prank(taker);
        e.refund(bytes32(S_TAKER), taker);
        assertEq(usdt.balanceOf(taker), 100 * AMOUNT);
        assertEq(uint8(e.stage()), uint8(SwapEscrow.Stage.COMPLETED));
    }

    function test_reembolso_justoAntesDeT0() public {
        SwapEscrow e = _newSwap("1");
        vm.warp(e.t0() - 1);
        vm.prank(taker);
        e.refund(bytes32(S_TAKER), taker);
    }

    function test_reembolso_enT0Revierte() public {
        SwapEscrow e = _newSwap("1");
        vm.warp(e.t0());
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.NotTimeToRefund.selector);
        e.refund(bytes32(S_TAKER), taker);
    }

    function test_reembolso_trasReadyRevierte() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.NotTimeToRefund.selector);
        e.refund(bytes32(S_TAKER), taker);
    }

    function test_reembolso_desdeT1_conYsinReady() public {
        SwapEscrow a = _newSwap("a");
        SwapEscrow b = _newSwap("b");
        _ready(b);
        vm.warp(a.t1());
        vm.startPrank(taker);
        a.refund(bytes32(S_TAKER), taker);
        b.refund(bytes32(S_TAKER), taker);
        vm.stopPrank();
        assertEq(usdt.balanceOf(taker), 100 * AMOUNT);
    }

    function test_reembolso_aOtraDireccion() public {
        SwapEscrow e = _newSwap("1");
        address alt = makeAddr("alt");
        vm.prank(taker);
        e.refund(bytes32(S_TAKER), alt);
        assertEq(usdt.balanceOf(alt), AMOUNT);
    }

    // ---------------------------------------------------------------- reclamos inválidos

    function test_claim_antesDeT0SinReadyRevierte() public {
        SwapEscrow e = _newSwap("1");
        vm.warp(e.t0() - 1);
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.TooEarlyToClaim.selector);
        e.claim(bytes32(S_MAKER), maker);
    }

    function test_claim_enT1Revierte() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.warp(e.t1());
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.TooLateToClaim.selector);
        e.claim(bytes32(S_MAKER), maker);
    }

    function test_claim_justoAntesDeT1() public {
        SwapEscrow e = _newSwap("1");
        vm.warp(e.t1() - 1);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
    }

    function test_claim_secretoInvalido() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.startPrank(maker);
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.claim(bytes32(S_TAKER), maker); // el secreto del taker no sirve para reclamar
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.claim(bytes32(0), maker);
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.claim(bytes32(type(uint256).max), maker); // >= n
        vm.stopPrank();
    }

    function test_refund_secretoInvalido() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.refund(bytes32(S_MAKER), taker);
    }

    function test_soloLasPartes() public {
        SwapEscrow e = _newSwap("1");
        address x = makeAddr("x");
        vm.startPrank(x);
        vm.expectRevert(SwapEscrow.OnlyOwner.selector);
        e.setReady();
        vm.expectRevert(SwapEscrow.OnlyOwner.selector);
        e.refund(bytes32(S_TAKER), x);
        vm.expectRevert(SwapEscrow.OnlyClaimer.selector);
        e.claim(bytes32(S_MAKER), x);
        vm.stopPrank();
        // El maker no puede marcar READY ni reembolsar; el taker no puede reclamar.
        vm.startPrank(maker);
        vm.expectRevert(SwapEscrow.OnlyOwner.selector);
        e.setReady();
        vm.stopPrank();
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.OnlyClaimer.selector);
        e.claim(bytes32(S_MAKER), taker);
    }

    function test_direccionCeroRevierte() public {
        SwapEscrow e = _newSwap("1");
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.ZeroAddress.selector);
        e.refund(bytes32(S_TAKER), address(0));
        _ready(e);
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.ZeroAddress.selector);
        e.claim(bytes32(S_MAKER), address(0));
    }

    function test_setReady_unaVezYAntesDeT0() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.BadStage.selector);
        e.setReady();

        SwapEscrow f = _newSwap("2");
        vm.warp(f.t0());
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.TooLateToSetReady.selector);
        f.setReady();
    }

    function test_completado_esFinal() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        vm.warp(e.t1());
        vm.prank(taker);
        vm.expectRevert(SwapEscrow.BadStage.selector);
        e.refund(bytes32(S_TAKER), taker);
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.BadStage.selector);
        e.claim(bytes32(S_MAKER), maker);
    }

    // ---------------------------------------------------------------- lista negra del emisor

    function test_listaNegra_unEscrowNoAfectaAOtros() public {
        SwapEscrow a = _newSwap("a");
        SwapEscrow b = _newSwap("b");
        usdt.setBlackList(address(a), true);
        vm.startPrank(taker);
        vm.expectRevert(SafeTokenTransfer.TokenTransferFailed.selector);
        a.refund(bytes32(S_TAKER), taker);
        b.refund(bytes32(S_TAKER), taker);
        vm.stopPrank();
        assertEq(usdt.balanceOf(taker), 99 * AMOUNT);
        assertEq(uint8(a.stage()), uint8(SwapEscrow.Stage.PENDING)); // el revert no consume el swap
    }

    function test_listaNegra_receptorDeComisionNoBloqueaReclamo() public {
        usdt.setBlackList(feeTo, true);
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        assertGt(usdt.balanceOf(maker), 0);
        vm.expectRevert(SafeTokenTransfer.TokenTransferFailed.selector);
        e.withdrawFee();
        usdt.setBlackList(feeTo, false);
        e.withdrawFee();
        assertEq(usdt.balanceOf(feeTo), AMOUNT * FEE_BPS / 10_000);
    }

    function test_listaNegra_makerCobraEnOtraDireccion() public {
        SwapEscrow e = _newSwap("1");
        _ready(e);
        usdt.setBlackList(maker, true);
        vm.startPrank(maker);
        vm.expectRevert(SafeTokenTransfer.TokenTransferFailed.selector);
        e.claim(bytes32(S_MAKER), maker);
        address alt = makeAddr("alt");
        e.claim(bytes32(S_MAKER), alt);
        vm.stopPrank();
        assertGt(usdt.balanceOf(alt), 0);
    }

    // ---------------------------------------------------------------- fuzzing

    function testFuzz_comisionConservaFondos(uint256 amount, uint16 bps) public {
        bps = uint16(bound(bps, 0, 100));
        amount = bound(amount, MIN_AMOUNT, 1e30);
        factory = _factory(bps);
        usdt.mint(taker, amount);
        vm.prank(taker);
        usdt.approve(address(factory), amount);
        SwapEscrow e = _newSwap("f", amount);
        _ready(e);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        if (e.feeOwed() > 0) e.withdrawFee();
        assertEq(usdt.balanceOf(maker) + usdt.balanceOf(feeTo), amount);
        assertLe(usdt.balanceOf(feeTo), amount / 100);
        assertEq(usdt.balanceOf(address(e)), 0);
    }

    function testFuzz_ventanasNoSeSolapan(uint64 dt, bool ready) public {
        SwapEscrow e = _newSwap("1");
        if (ready) _ready(e);
        dt = uint64(bound(dt, 0, D0 + D1 + 10 days));
        vm.warp(block.timestamp + dt);
        bool canClaim;
        bool canRefund;
        uint256 snap = vm.snapshotState();
        vm.prank(maker);
        try e.claim(bytes32(S_MAKER), maker) {
            canClaim = true;
        } catch {}
        vm.revertToState(snap);
        vm.prank(taker);
        try e.refund(bytes32(S_TAKER), taker) {
            canRefund = true;
        } catch {}
        // En todo momento exactamente una parte puede cerrar el swap: nunca ambas (carrera) ni ninguna (bloqueo).
        assertTrue(canClaim != canRefund, "debe poder actuar exactamente una parte");
    }

    function testFuzz_secretoAleatorioNoReclama(uint256 s) public {
        vm.assume(s != S_MAKER);
        SwapEscrow e = _newSwap("1");
        _ready(e);
        vm.prank(maker);
        vm.expectRevert(SwapEscrow.InvalidSecret.selector);
        e.claim(bytes32(s), maker);
    }
}

contract SwapEscrowStandardTest is SwapEscrowTest {}

contract SwapEscrowEthUsdtTest is SwapEscrowTest {
    function mode() internal pure override returns (MockUSDT.Mode) {
        return MockUSDT.Mode.NO_RETURN_ETH;
    }
}

contract SwapEscrowTronUsdtTest is SwapEscrowTest {
    function mode() internal pure override returns (MockUSDT.Mode) {
        return MockUSDT.Mode.FALSE_RETURN_TRON;
    }
}
