// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title SafeTokenTransfer
/// @notice Transferencias que toleran los tres comportamientos conocidos de USDT:
///   - estándar: devuelve `true`
///   - Ethereum: no devuelve nada
///   - Tron: `transfer` devuelve `false` aunque transfiere
/// @dev No se confía en el valor de retorno: se exige que la llamada no revierta y que el
///      saldo del destinatario suba exactamente `amount`. Esto también rechaza tokens con
///      comisión por transferencia. `from != to` siempre en los usos de este proyecto.
library SafeTokenTransfer {
    error TokenTransferFailed();

    function pushExact(IERC20 token, address to, uint256 amount) internal {
        uint256 before = token.balanceOf(to);
        (bool ok,) = address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || token.balanceOf(to) != before + amount) revert TokenTransferFailed();
    }

    function pullExact(IERC20 token, address from, address to, uint256 amount) internal {
        uint256 before = token.balanceOf(to);
        (bool ok,) = address(token).call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!ok || token.balanceOf(to) != before + amount) revert TokenTransferFailed();
    }
}
