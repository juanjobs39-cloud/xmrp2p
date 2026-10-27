// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;
import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";
import {Handler} from "./Invariant.t.sol";

contract HandlerSmokeTest is Test {
    function test_handlerEjerceCaminosReales() public {
        vm.warp(1_800_000_000);
        MockUSDT u = new MockUSDT(MockUSDT.Mode.FALSE_RETURN_TRON);
        SwapFactory f = new SwapFactory(
            SwapFactory.Config(
                IERC20(address(u)), 100, address(7), 1e6, type(uint256).max, 10 minutes, 2 days
            )
        );
        Handler h = new Handler(u, f, address(7));
        h.create(5e6, 1 hours, 1 hours);
        h.ready(0);
        h.claim(0);
        assertEq(h.readies(), 1);
        assertEq(h.claims(), 1);
        h.create(5e6, 1 hours, 1 hours);
        h.refund(1);
        assertEq(h.refunds(), 1);
    }
}
