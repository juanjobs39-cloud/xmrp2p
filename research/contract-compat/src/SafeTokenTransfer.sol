// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Transferencias que funcionan con los tres comportamientos de USDT:
/// estándar (devuelve true), Ethereum (no devuelve nada) y Tron (devuelve false aunque transfiere).
/// En vez de confiar en el valor de retorno, comprueba la diferencia de saldo del destinatario.
/// Fase 0: prototipo, NO auditado.
library SafeTokenTransfer {
    error TokenTransferFailed();

    function pushExact(IERC20 token, address to, uint256 amount) internal {
        uint256 before = token.balanceOf(to);
        (bool ok,) = address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || token.balanceOf(to) - before != amount) revert TokenTransferFailed();
    }

    function pullExact(IERC20 token, address from, address to, uint256 amount) internal {
        uint256 before = token.balanceOf(to);
        (bool ok,) = address(token).call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!ok || token.balanceOf(to) - before != amount) revert TokenTransferFailed();
    }
}
