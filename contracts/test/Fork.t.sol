// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";

/// Pruebas contra el USDT REAL en forks locales (no se envía nada a ninguna red).
/// Se activan con FORK_TESTS=true:  FORK_TESTS=true forge test --match-contract Fork
abstract contract ForkBase is Test {
    IERC20 internal usdt;
    SwapFactory internal factory;
    uint256 internal takerKey = 0xA11CE;
    address internal taker;
    address internal maker = makeAddr("maker");
    address internal feeTo = makeAddr("feeTo");
    uint256 internal constant S_TAKER = 0x0a11ce;
    uint256 internal constant S_MAKER = 0x0b0b;
    uint256 internal constant AMOUNT = 250e6;

    function rpc() internal pure virtual returns (string memory);
    function token() internal pure virtual returns (address);

    function setUp() public {
        if (!vm.envOr("FORK_TESTS", false)) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc());
        taker = vm.addr(takerKey);
        usdt = IERC20(token());
        factory =
            new SwapFactory(SwapFactory.Config(usdt, 50, feeTo, 1e6, type(uint256).max, 10 minutes, 2 days));
        deal(address(usdt), taker, AMOUNT * 4);
    }

    function _c(uint256 s) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(vm.addr(s))));
    }

    function test_fork_swapCompletoConUsdtReal() public {
        vm.startPrank(taker);
        // USDT de Ethereum exige poner la autorización en 0 antes de cambiarla; aquí parte de 0.
        (bool ok,) = address(usdt).call(abi.encodeCall(IERC20.approve, (address(factory), AMOUNT)));
        assertTrue(ok);
        SwapEscrow e =
            SwapEscrow(factory.newSwap(maker, _c(S_MAKER), _c(S_TAKER), 1 hours, 1 hours, AMOUNT, "f"));
        e.setReady();
        vm.stopPrank();
        assertEq(usdt.balanceOf(address(e)), AMOUNT);
        vm.prank(maker);
        e.claim(bytes32(S_MAKER), maker);
        e.withdrawFee();
        uint256 fee = AMOUNT * 50 / 10_000;
        assertEq(usdt.balanceOf(maker), AMOUNT - fee);
        assertEq(usdt.balanceOf(feeTo), fee);
    }

    function test_fork_reembolsoConUsdtReal() public {
        vm.startPrank(taker);
        (bool ok,) = address(usdt).call(abi.encodeCall(IERC20.approve, (address(factory), AMOUNT)));
        assertTrue(ok);
        SwapEscrow e =
            SwapEscrow(factory.newSwap(maker, _c(S_MAKER), _c(S_TAKER), 1 hours, 1 hours, AMOUNT, "r"));
        e.refund(bytes32(S_TAKER), taker);
        vm.stopPrank();
        assertEq(usdt.balanceOf(taker), AMOUNT * 4);
    }
}

/// Arbitrum One — USD₮0 (0xFd08…Cbb9). Responde la pregunta abierta A4: ¿acepta `permit`?
contract ForkArbitrumUsdt0Test is ForkBase {
    function rpc() internal pure override returns (string memory) {
        return "arbitrum_one";
    }

    function token() internal pure override returns (address) {
        return 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    }

    function test_fork_newSwapWithPermit() public {
        IERC20Permit p = IERC20Permit(token());
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 typeHash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash =
            keccak256(abi.encode(typeHash, taker, address(factory), AMOUNT, p.nonces(taker), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", p.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(takerKey, digest);

        vm.prank(taker);
        address e = factory.newSwapWithPermit(
            maker, _c(S_MAKER), _c(S_TAKER), 1 hours, 1 hours, AMOUNT, "p", deadline, v, r, s
        );
        assertEq(usdt.balanceOf(e), AMOUNT, "el permit no autorizo el deposito");
        assertEq(usdt.allowance(taker, address(factory)), 0);
    }
}

/// Ethereum — USDT original (0xdAC1…1ec7), cuyo `transfer` no devuelve nada.
contract ForkEthereumUsdtTest is ForkBase {
    function rpc() internal pure override returns (string memory) {
        return "ethereum";
    }

    function token() internal pure override returns (address) {
        return 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    }
}
