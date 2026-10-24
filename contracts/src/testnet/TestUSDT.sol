// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title TestUSDT — SOLO TESTNET
/// @notice Token de prueba que simula USDT (6 decimales, con permit). Cualquiera puede pedir
///         hasta 10 000 unidades por llamada para probar swaps. No tiene ningún valor.
contract TestUSDT is ERC20, ERC20Permit {
    uint256 public constant FAUCET_MAX = 10_000e6;

    error TooMuch();

    constructor() ERC20("Test USDT (sin valor)", "tUSDT") ERC20Permit("Test USDT (sin valor)") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet(uint256 amount) external {
        if (amount > FAUCET_MAX) revert TooMuch();
        _mint(msg.sender, amount);
    }
}
