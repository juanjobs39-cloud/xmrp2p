// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

/// Simula los tres comportamientos de USDT y la lista negra del emisor.
contract MockUSDT {
    enum Mode { STANDARD, NO_RETURN_ETH, FALSE_RETURN_TRON }

    Mode public immutable mode;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isBlackListed;
    uint8 public constant decimals = 6;

    constructor(Mode _mode) { mode = _mode; }

    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function addBlackList(address who) external { isBlackListed[who] = true; }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    function _move(address from, address to, uint256 a) internal {
        require(!isBlackListed[from], "blacklisted");
        require(balanceOf[from] >= a, "balance");
        balanceOf[from] -= a;
        balanceOf[to] += a;
    }

    function transfer(address to, uint256 a) external {
        _move(msg.sender, to, a);
        _ret(true);
    }

    function transferFrom(address from, address to, uint256 a) external {
        require(allowance[from][msg.sender] >= a, "allowance");
        allowance[from][msg.sender] -= a;
        _move(from, to, a);
        // En Tron, transferFrom de USDT sí devuelve true (solo transfer devuelve false).
        _retFrom();
    }

    function _ret(bool v) internal view {
        if (mode == Mode.NO_RETURN_ETH) assembly { return(0, 0) }
        bool r = mode == Mode.FALSE_RETURN_TRON ? false : v;
        assembly { mstore(0, r) return(0, 32) }
    }

    function _retFrom() internal view {
        if (mode == Mode.NO_RETURN_ETH) assembly { return(0, 0) }
        assembly { mstore(0, 1) return(0, 32) }
    }
}
