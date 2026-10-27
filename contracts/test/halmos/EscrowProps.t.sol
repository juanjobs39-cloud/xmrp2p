// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../../src/SwapFactory.sol";
import {SwapEscrow} from "../../src/SwapEscrow.sol";
import {MockUSDT} from "../mocks/MockUSDT.sol";

/// @notice Propiedades verificadas con Halmos (ejecución simbólica): cada `check_` se prueba para
///         TODOS los valores posibles de sus parámetros, no para una muestra como en el fuzzing.
///         Correr: halmos --contract EscrowProps   (lo hace el flujo «Auditoría» de GitHub Actions).
///         `forge test` las ignora (solo corre funciones `test_`).
contract EscrowProps is Test {
    MockUSDT internal usdt;
    SwapFactory internal factory;

    address internal constant TAKER = address(0x7a4e5);
    address internal constant MAKER = address(0x3a4e5);
    address internal constant FEE_TO = address(0xfee);
    // Secretos de prueba y sus commitments (160 bits bajos de keccak(s·G), calculados con `cast wallet address`).
    bytes32 internal constant S_TAKER = bytes32(uint256(0x0a11ce));
    bytes32 internal constant S_MAKER = bytes32(uint256(0x0b0b));
    bytes32 internal constant C_TAKER = bytes32(uint256(uint160(0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7)));
    bytes32 internal constant C_MAKER = bytes32(uint256(uint160(0x0376AAc07Ad725E01357B1725B5ceC61aE10473c)));

    uint256 internal constant CAP = 100e6; // tope de la beta (100 USDT)
    uint256 internal constant MIN = 1e6;
    uint16 internal constant FEE_BPS = 50;
    uint64 internal constant D0 = 1 hours;
    uint64 internal constant D1 = 2 hours;
    uint64 internal constant START = 1_800_000_000;

    function setUp() public {
        vm.warp(START);
        usdt = new MockUSDT(MockUSDT.Mode.STANDARD);
        factory = new SwapFactory(
            SwapFactory.Config({
                token: IERC20(address(usdt)),
                feeBps: FEE_BPS,
                feeRecipient: FEE_TO,
                minAmount: MIN,
                maxAmount: CAP,
                minDuration: 10 minutes,
                maxDuration: 2 days
            })
        );
        usdt.mint(TAKER, 10 * CAP);
        vm.prank(TAKER);
        usdt.approve(address(factory), type(uint256).max);
    }

    function _swap(uint256 amount, bytes32 salt) internal returns (SwapEscrow) {
        vm.prank(TAKER);
        return SwapEscrow(factory.newSwap(MAKER, C_MAKER, C_TAKER, D0, D1, amount, salt));
    }

    /// 1. Ningún escrow puede recibir más que el tope.
    function check_tope(uint256 amount) public {
        vm.assume(amount > CAP);
        vm.prank(TAKER);
        (bool ok,) = address(factory)
            .call(
                abi.encodeCall(SwapFactory.newSwap, (MAKER, C_MAKER, C_TAKER, D0, D1, amount, bytes32("t")))
            );
        assert(!ok);
    }

    /// 2. Solo el maker (claimer) puede cobrar, con cualquier secreto y destino.
    function check_soloElMakerCobra(address caller, bytes32 secret, address to, bool ready, uint64 dt)
        public
    {
        vm.assume(caller != MAKER);
        SwapEscrow e = _swap(10e6, bytes32("c"));
        if (ready) {
            vm.prank(TAKER);
            e.setReady();
        }
        vm.warp(uint256(START) + dt);
        vm.prank(caller);
        (bool ok,) = address(e).call(abi.encodeCall(SwapEscrow.claim, (secret, to)));
        assert(!ok);
    }

    /// 3. Solo el taker (owner) puede reembolsar, con cualquier secreto y destino.
    function check_soloElTakerReembolsa(address caller, bytes32 secret, address to, uint64 dt) public {
        vm.assume(caller != TAKER);
        SwapEscrow e = _swap(10e6, bytes32("r"));
        vm.warp(uint256(START) + dt);
        vm.prank(caller);
        (bool ok,) = address(e).call(abi.encodeCall(SwapEscrow.refund, (secret, to)));
        assert(!ok);
    }

    /// 4. En todo momento exactamente una parte puede cerrar el swap: nunca las dos, nunca ninguna.
    function check_unaSolaParteEnCadaMomento(uint64 dt, bool ready) public {
        SwapEscrow a = _swap(10e6, bytes32("a"));
        SwapEscrow b = _swap(10e6, bytes32("b"));
        if (ready) {
            vm.startPrank(TAKER);
            a.setReady();
            b.setReady();
            vm.stopPrank();
        }
        vm.warp(uint256(START) + dt);
        vm.prank(MAKER);
        (bool cobro,) = address(a).call(abi.encodeCall(SwapEscrow.claim, (S_MAKER, MAKER)));
        vm.prank(TAKER);
        (bool reembolso,) = address(b).call(abi.encodeCall(SwapEscrow.refund, (S_TAKER, TAKER)));
        assert(!(cobro && reembolso)); // disjuntas
        assert(cobro || reembolso); // sin huecos
    }

    /// 5. Al cobrar, todo cuadra: maker + comisión = monto; la comisión es 0,5 % y llega a FEE_TO.
    function check_cobroExacto(uint256 amount) public {
        vm.assume(amount >= MIN && amount <= CAP);
        SwapEscrow e = _swap(amount, bytes32("p"));
        vm.prank(TAKER);
        e.setReady();
        uint256 makerAntes = usdt.balanceOf(MAKER);
        vm.prank(MAKER);
        e.claim(S_MAKER, MAKER);
        uint256 fee = (amount * FEE_BPS) / 10_000;
        assert(usdt.balanceOf(MAKER) - makerAntes == amount - fee);
        assert(e.feeOwed() == fee);
        assert(usdt.balanceOf(address(e)) == fee);
        e.withdrawFee();
        assert(usdt.balanceOf(FEE_TO) == fee);
        assert(usdt.balanceOf(address(e)) == 0);
    }

    /// 6. Tras cobrar, nadie puede volver a cobrar ni reembolsar.
    function check_sinDobleCierre(uint64 dt, bytes32 secret) public {
        SwapEscrow e = _swap(10e6, bytes32("d"));
        vm.prank(TAKER);
        e.setReady();
        vm.prank(MAKER);
        e.claim(S_MAKER, MAKER);
        vm.warp(uint256(START) + dt);
        vm.prank(MAKER);
        (bool otroCobro,) = address(e).call(abi.encodeCall(SwapEscrow.claim, (secret, MAKER)));
        vm.prank(TAKER);
        (bool reembolso,) = address(e).call(abi.encodeCall(SwapEscrow.refund, (secret, TAKER)));
        assert(!otroCobro && !reembolso);
    }

    /// 0. Cordura: con el secreto correcto el maker SÍ cobra. Si falla, Halmos no está calculando
    ///    `ecrecover` (lo trata como función desconocida) y las propiedades que cobran son vacías.
    function check_cordura_cobroConSecretoValido() public {
        SwapEscrow e = _swap(10e6, bytes32("s"));
        vm.prank(TAKER);
        e.setReady();
        vm.prank(MAKER);
        (bool ok,) = address(e).call(abi.encodeCall(SwapEscrow.claim, (S_MAKER, MAKER)));
        assert(ok);
    }
}
