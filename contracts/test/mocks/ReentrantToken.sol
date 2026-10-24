// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

/// @notice Token malicioso que, al transferir, vuelve a llamar al escrow con la llamada guardada.
///         Sirve para comprobar que ningún reingreso permite cobrar dos veces.
contract ReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public target;
    bytes public payload;
    bool public reentered;
    bool public reentrySucceeded;

    function mint(address to, uint256 a) external {
        balanceOf[to] += a;
    }

    function arm(address t, bytes calldata p) external {
        target = t;
        payload = p;
    }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    function transfer(address to, uint256 a) external returns (bool) {
        balanceOf[msg.sender] -= a;
        balanceOf[to] += a;
        if (target != address(0) && !reentered) {
            reentered = true;
            (reentrySucceeded,) = target.call(payload);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 a) external returns (bool) {
        allowance[from][msg.sender] -= a;
        balanceOf[from] -= a;
        balanceOf[to] += a;
        return true;
    }
}
