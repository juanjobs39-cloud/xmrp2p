// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {SwapEscrow} from "../src/SwapEscrow.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

abstract contract Base is Test {
    MockUSDT internal usdt;
    SwapFactory internal factory;

    address internal taker = makeAddr("taker");
    address internal maker = makeAddr("maker");
    address internal feeTo = makeAddr("feeTo");

    // Secretos de prueba (< 2^252, válidos en ambas curvas). vm.addr(s) = 160 bits bajos de keccak(s·G).
    uint256 internal constant S_TAKER = 0x0a11ce;
    uint256 internal constant S_MAKER = 0x0b0b;
    uint16 internal constant FEE_BPS = 50; // 0,5 %
    uint256 internal constant MIN_AMOUNT = 1e6; // 1 USDT
    uint64 internal constant MIN_D = 10 minutes;
    uint64 internal constant MAX_D = 2 days;
    uint64 internal constant D0 = 1 hours;
    uint64 internal constant D1 = 2 hours;
    uint256 internal constant AMOUNT = 1_000e6;

    function mode() internal pure virtual returns (MockUSDT.Mode) {
        return MockUSDT.Mode.STANDARD;
    }

    function commit(uint256 s) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(vm.addr(s))));
    }

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        usdt = new MockUSDT(mode());
        factory = _factory(FEE_BPS);
        usdt.mint(taker, 100 * AMOUNT);
        vm.prank(taker);
        usdt.approve(address(factory), type(uint256).max);
    }

    function _factory(uint16 bps) internal returns (SwapFactory) {
        return new SwapFactory(
            SwapFactory.Config({
                token: IERC20(address(usdt)),
                feeBps: bps,
                feeRecipient: feeTo,
                minAmount: MIN_AMOUNT,
                minDuration: MIN_D,
                maxDuration: MAX_D
            })
        );
    }

    function _newSwap(bytes32 salt) internal returns (SwapEscrow) {
        return _newSwap(salt, AMOUNT);
    }

    function _newSwap(bytes32 salt, uint256 amount) internal returns (SwapEscrow e) {
        vm.prank(taker);
        e = SwapEscrow(factory.newSwap(maker, commit(S_MAKER), commit(S_TAKER), D0, D1, amount, salt));
    }

    function _ready(SwapEscrow e) internal {
        vm.prank(taker);
        e.setReady();
    }
}
