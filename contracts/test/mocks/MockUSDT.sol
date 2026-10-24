// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

/// @notice Simula los tres comportamientos de USDT, la lista negra del emisor y una
///         comisión por transferencia opcional (para comprobar que se rechaza).
contract MockUSDT {
    enum Mode {
        STANDARD,
        NO_RETURN_ETH,
        FALSE_RETURN_TRON
    }

    Mode public immutable mode;
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    uint256 public transferFeeBps;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isBlackListed;

    constructor(Mode _mode) {
        mode = _mode;
    }

    function mint(address to, uint256 a) external {
        balanceOf[to] += a;
        totalSupply += a;
    }

    function setBlackList(address who, bool v) external {
        isBlackListed[who] = v;
    }

    function setTransferFee(uint256 bps) external {
        transferFeeBps = bps;
    }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    function _move(address from, address to, uint256 a) internal {
        require(!isBlackListed[from] && !isBlackListed[to], "blacklisted");
        require(balanceOf[from] >= a, "balance");
        uint256 fee = a * transferFeeBps / 10_000;
        balanceOf[from] -= a;
        balanceOf[to] += a - fee;
        totalSupply -= fee;
    }

    function transfer(address to, uint256 a) external {
        _move(msg.sender, to, a);
        if (mode == Mode.NO_RETURN_ETH) {
            assembly { return(0, 0) }
        }
        bool r = mode != Mode.FALSE_RETURN_TRON; // Tron: false aunque transfiere
        assembly {
            mstore(0, r)
            return(0, 32)
        }
    }

    function transferFrom(address from, address to, uint256 a) external {
        require(allowance[from][msg.sender] >= a, "allowance");
        allowance[from][msg.sender] -= a;
        _move(from, to, a);
        if (mode == Mode.NO_RETURN_ETH) {
            assembly { return(0, 0) }
        }
        assembly {
            mstore(0, 1)
            return(0, 32)
        }
    }
}
