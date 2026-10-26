// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

/// Actor que ejecuta acciones aleatorias (crear, ready, claim, refund, retirar comisión, pasar el tiempo).
contract Handler is Test {
    MockUSDT public usdt;
    SwapFactory public factory;
    address public taker = makeAddr("taker");
    address public maker = makeAddr("maker");
    address public feeTo;
    uint256 constant S_TAKER = 0x0a11ce;
    uint256 constant S_MAKER = 0x0b0b;
    SwapEscrow[] public escrows;
    uint256 public minted;
    uint256 nonce;
    uint256 public claims;
    uint256 public refunds;
    uint256 public readies;

    constructor(MockUSDT u, SwapFactory f, address fee) {
        usdt = u;
        factory = f;
        feeTo = fee;
    }

    function count() external view returns (uint256) {
        return escrows.length;
    }

    function create(uint256 amount, uint64 d0, uint64 d1) external {
        amount = bound(amount, 1e6, 1e15);
        d0 = uint64(bound(d0, 10 minutes, 2 days));
        d1 = uint64(bound(d1, 10 minutes, 2 days));
        usdt.mint(taker, amount);
        minted += amount;
        vm.startPrank(taker);
        usdt.approve(address(factory), amount);
        escrows.push(
            SwapEscrow(
                factory.newSwap(
                    maker,
                    bytes32(uint256(uint160(vm.addr(S_MAKER)))),
                    bytes32(uint256(uint160(vm.addr(S_TAKER)))),
                    d0,
                    d1,
                    amount,
                    bytes32(nonce++)
                )
            )
        );
        vm.stopPrank();
    }

    function _pick(uint256 i) internal view returns (SwapEscrow) {
        return escrows[i % escrows.length];
    }

    function ready(uint256 i) external {
        if (escrows.length == 0) return;
        vm.prank(taker);
        try _pick(i).setReady() {
            readies++;
        } catch {}
    }

    function claim(uint256 i) external {
        if (escrows.length == 0) return;
        vm.prank(maker);
        try _pick(i).claim(bytes32(S_MAKER), maker) {
            claims++;
        } catch {}
    }

    function refund(uint256 i) external {
        if (escrows.length == 0) return;
        vm.prank(taker);
        try _pick(i).refund(bytes32(S_TAKER), taker) {
            refunds++;
        } catch {}
    }

    function withdrawFee(uint256 i) external {
        if (escrows.length == 0) return;
        try _pick(i).withdrawFee() {} catch {}
    }

    function badClaim(uint256 i, uint256 s) external {
        if (escrows.length == 0 || s == S_MAKER) return;
        vm.prank(maker);
        try _pick(i).claim(bytes32(s), maker) {
            revert("secreto falso aceptado");
        } catch {}
    }

    function warp(uint64 dt) external {
        vm.warp(block.timestamp + bound(dt, 0, 3 days));
    }
}

contract InvariantTest is Test {
    MockUSDT usdt;
    SwapFactory factory;
    Handler handler;
    address feeTo = makeAddr("feeTo");

    function setUp() public {
        vm.warp(1_800_000_000);
        usdt = new MockUSDT(MockUSDT.Mode.FALSE_RETURN_TRON);
        factory =
            new SwapFactory(SwapFactory.Config(IERC20(address(usdt)), 100, feeTo, 1e6, type(uint256).max, 10 minutes, 2 days));
        handler = new Handler(usdt, factory, feeTo);
        targetContract(address(handler));
    }

    /// Nada se crea ni se pierde: todo lo acuñado está en taker, maker, receptor o algún escrow.
    function invariant_conservacionDeFondos() public view {
        uint256 total =
            usdt.balanceOf(handler.taker()) + usdt.balanceOf(handler.maker()) + usdt.balanceOf(feeTo);
        for (uint256 i; i < handler.count(); i++) {
            total += usdt.balanceOf(address(handler.escrows(i)));
        }
        assertEq(total, handler.minted());
    }

    /// Un escrow abierto guarda exactamente el monto; uno cerrado guarda solo la comisión pendiente.
    function invariant_saldoDeCadaEscrow() public view {
        for (uint256 i; i < handler.count(); i++) {
            SwapEscrow e = handler.escrows(i);
            SwapEscrow.Stage s = e.stage();
            if (s == SwapEscrow.Stage.COMPLETED) {
                assertEq(usdt.balanceOf(address(e)), e.feeOwed());
            } else {
                assertEq(usdt.balanceOf(address(e)), e.amount());
                assertEq(e.feeOwed(), 0);
            }
        }
    }

    /// La comisión total nunca supera el tope de 1 % de lo reclamado.
    function invariant_comisionBajoElTope() public view {
        for (uint256 i; i < handler.count(); i++) {
            SwapEscrow e = handler.escrows(i);
            assertLe(e.feeOwed(), e.amount() / 100);
        }
        assertLe(usdt.balanceOf(feeTo), handler.minted() / 100);
    }

    /// Registro por corrida: cuántos swaps se marcaron READY, se reclamaron y se reembolsaron.
    /// (Que el handler ejerce estos caminos se prueba de forma determinista en HandlerSmokeTest.)
    function afterInvariant() external view {
        console.log("ready/claim/refund", handler.readies(), handler.claims(), handler.refunds());
    }

    /// Los plazos siempre cumplen t0 < t1.
    function invariant_plazosOrdenados() public view {
        for (uint256 i; i < handler.count(); i++) {
            SwapEscrow e = handler.escrows(i);
            assertLt(e.t0(), e.t1());
        }
    }
}
