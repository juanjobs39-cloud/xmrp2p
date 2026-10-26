// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SwapEscrow} from "./SwapEscrow.sol";
import {SafeTokenTransfer} from "./lib/SafeTokenTransfer.sol";

/// @title SwapFactory
/// @notice Crea un escrow aislado (clon EIP-1167 de `SwapEscrow`) por cada swap y mueve el USDT
///         del taker directamente a ese clon. Todos los parámetros son inmutables: no hay
///         administrador, ni pausa, ni actualización.
contract SwapFactory {
    using SafeTokenTransfer for IERC20;

    /// @notice Implementación compartida por todos los clones.
    address public immutable IMPLEMENTATION;
    IERC20 public immutable TOKEN;
    uint16 public immutable FEE_BPS;
    address public immutable FEE_RECIPIENT;
    /// @notice Monto mínimo por swap (evita spam de escrows diminutos).
    uint256 public immutable MIN_AMOUNT;
    /// @notice Monto máximo por swap. En la beta sin auditoría externa acota lo que un error podría
    ///         poner en riesgo en un solo swap (p. ej. 100 USDT). Inmutable: nadie puede subirlo.
    uint256 public immutable MAX_AMOUNT;
    /// @notice Límites de cada plazo (duración hasta t0 y de t0 a t1), en segundos.
    uint64 public immutable MIN_DURATION;
    uint64 public immutable MAX_DURATION;

    event SwapCreated(
        address indexed escrow,
        address indexed owner,
        address indexed claimer,
        bytes32 claimCommitment,
        bytes32 refundCommitment,
        uint64 t0,
        uint64 t1,
        uint256 amount
    );

    error AmountTooLow();
    error AmountTooHigh();
    error InvalidDuration();
    error InvalidParams();
    error InvalidConfig();

    struct Config {
        IERC20 token;
        uint16 feeBps;
        address feeRecipient;
        uint256 minAmount;
        uint256 maxAmount;
        uint64 minDuration;
        uint64 maxDuration;
    }

    constructor(Config memory c) {
        if (c.minAmount == 0 || c.maxAmount < c.minAmount || c.minDuration == 0 || c.maxDuration < c.minDuration) {
            revert InvalidConfig();
        }
        // El constructor de SwapEscrow valida token, receptor y el tope de comisión.
        IMPLEMENTATION = address(new SwapEscrow(c.token, c.feeBps, c.feeRecipient));
        TOKEN = c.token;
        FEE_BPS = c.feeBps;
        FEE_RECIPIENT = c.feeRecipient;
        MIN_AMOUNT = c.minAmount;
        MAX_AMOUNT = c.maxAmount;
        MIN_DURATION = c.minDuration;
        MAX_DURATION = c.maxDuration;
    }

    /// @notice Dirección que tendrá el escrow de `owner` con `salt` (para preparar el swap fuera de la cadena).
    function predictEscrow(address owner, bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(IMPLEMENTATION, _salt(owner, salt));
    }

    /// @notice Crea el swap. Requiere `approve` previo del monto a esta fábrica.
    function newSwap(
        address claimer,
        bytes32 claimCommitment,
        bytes32 refundCommitment,
        uint64 duration0,
        uint64 duration1,
        uint256 amount,
        bytes32 salt
    ) public returns (address escrow) {
        if (amount < MIN_AMOUNT) revert AmountTooLow();
        if (amount > MAX_AMOUNT) revert AmountTooHigh();
        if (
            duration0 < MIN_DURATION || duration0 > MAX_DURATION || duration1 < MIN_DURATION
                || duration1 > MAX_DURATION
        ) revert InvalidDuration();
        if (
            claimer == address(0) || claimer == msg.sender || claimCommitment == 0 || refundCommitment == 0
                || claimCommitment == refundCommitment
        ) revert InvalidParams();

        uint64 t0 = uint64(block.timestamp) + duration0;
        uint64 t1 = t0 + duration1;
        escrow = Clones.cloneDeterministic(IMPLEMENTATION, _salt(msg.sender, salt));
        SwapEscrow(escrow).initialize(msg.sender, claimer, claimCommitment, refundCommitment, t0, t1, amount);
        emit SwapCreated(escrow, msg.sender, claimer, claimCommitment, refundCommitment, t0, t1, amount);
        TOKEN.pullExact(msg.sender, escrow, amount);
    }

    /// @notice Igual que `newSwap`, pero autoriza el monto con una firma EIP-2612 (sin `approve` aparte).
    /// @dev Si el permit falla (p. ej. alguien lo usó antes desde el mempool) se continúa:
    ///      si la autorización ya existe, `transferFrom` funciona igual.
    function newSwapWithPermit(
        address claimer,
        bytes32 claimCommitment,
        bytes32 refundCommitment,
        uint64 duration0,
        uint64 duration1,
        uint256 amount,
        bytes32 salt,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (address) {
        try IERC20Permit(address(TOKEN)).permit(msg.sender, address(this), amount, deadline, v, r, s) {}
            catch {}
        return newSwap(claimer, claimCommitment, refundCommitment, duration0, duration1, amount, salt);
    }

    function _salt(address owner, bytes32 salt) private pure returns (bytes32) {
        return keccak256(abi.encode(owner, salt));
    }
}
