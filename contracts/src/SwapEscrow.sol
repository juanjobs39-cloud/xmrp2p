// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Secp256k1} from "./lib/Secp256k1.sol";
import {SafeTokenTransfer} from "./lib/SafeTokenTransfer.sol";

/// @title SwapEscrow
/// @notice Escrow de UN atomic swap USDT ↔ XMR. Cada swap es un clon EIP-1167 de esta
///         implementación, para que una congelación del emisor de USDT afecte solo a ese swap.
///
/// Protocolo (adaptado de AthanorLabs):
///  - El taker (`owner`) deposita USDT al crear el clon. Conoce `s_a`; `refundCommitment = keccak(s_a·G)`.
///  - El maker (`claimer`) bloquea XMR en la dirección de `P_a + P_b`. Conoce `s_b`; `claimCommitment = keccak(s_b·G)`.
///  - Si el XMR está bien, el taker llama `setReady` antes de `t0`.
///  - El maker reclama con `claim(s_b)`: si está READY y antes de `t1`, o entre `t0` y `t1`.
///    Al revelar `s_b`, el taker obtiene la llave completa del XMR.
///  - El taker reembolsa con `refund(s_a)`: antes de `t0` si no está READY, o desde `t1`.
///    Al revelar `s_a`, el maker recupera su XMR.
///  - Las ventanas de `claim` y `refund` nunca se solapan.
///
/// Sin administrador: nadie puede mover fondos fuera de estas reglas.
/// @dev Los parámetros comunes (fábrica, token, comisión) son `immutable` de la implementación.
///      Los clones los leen del bytecode de la implementación vía delegatecall.
contract SwapEscrow {
    using SafeTokenTransfer for IERC20;

    enum Stage {
        UNINITIALIZED,
        PENDING,
        READY,
        COMPLETED
    }

    /// @notice Tope máximo de comisión: 1 % (100 puntos básicos). Constante: no se puede cambiar.
    uint16 public constant MAX_FEE_BPS = 100;

    /// @notice Única cuenta que puede inicializar clones.
    address public immutable FACTORY;
    /// @notice Único token aceptado (USDT de la red).
    IERC20 public immutable TOKEN;
    /// @notice Comisión en puntos básicos, fija para todos los swaps de esta fábrica.
    uint16 public immutable FEE_BPS;
    /// @notice Receptor de la comisión.
    address public immutable FEE_RECIPIENT;

    Stage public stage;
    uint64 public t0;
    uint64 public t1;
    address public owner;
    address public claimer;
    bytes32 public claimCommitment;
    bytes32 public refundCommitment;
    uint256 public amount;
    /// @notice Comisión pendiente de retirar (patrón pull: la lista negra del receptor no bloquea reclamos).
    uint256 public feeOwed;

    event Ready();
    event Claimed(bytes32 secret, address indexed to, uint256 amountToClaimer, uint256 fee);
    event Refunded(bytes32 secret, address indexed to, uint256 amount);
    event FeeWithdrawn(address indexed to, uint256 fee);

    error OnlyFactory();
    error AlreadyInitialized();
    error FeeTooHigh();
    error OnlyOwner();
    error OnlyClaimer();
    error BadStage();
    error TooLateToSetReady();
    error TooEarlyToClaim();
    error TooLateToClaim();
    error NotTimeToRefund();
    error InvalidSecret();
    error ZeroAddress();
    error NothingToWithdraw();

    constructor(IERC20 token, uint16 feeBps, address feeRecipient) {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (address(token) == address(0) || feeRecipient == address(0)) revert ZeroAddress();
        FACTORY = msg.sender;
        TOKEN = token;
        FEE_BPS = feeBps;
        FEE_RECIPIENT = feeRecipient;
        // La implementación nunca se usa como escrow.
        stage = Stage.COMPLETED;
    }

    /// @notice La fábrica lo llama en la misma transacción en que crea el clon, antes de mover el USDT.
    function initialize(
        address owner_,
        address claimer_,
        bytes32 claimCommitment_,
        bytes32 refundCommitment_,
        uint64 t0_,
        uint64 t1_,
        uint256 amount_
    ) external {
        if (msg.sender != FACTORY) revert OnlyFactory();
        if (stage != Stage.UNINITIALIZED) revert AlreadyInitialized();
        stage = Stage.PENDING;
        owner = owner_;
        claimer = claimer_;
        claimCommitment = claimCommitment_;
        refundCommitment = refundCommitment_;
        t0 = t0_;
        t1 = t1_;
        amount = amount_;
    }

    /// @notice El taker confirma que el XMR está bloqueado correctamente.
    function setReady() external {
        if (msg.sender != owner) revert OnlyOwner();
        if (stage != Stage.PENDING) revert BadStage();
        if (block.timestamp >= t0) revert TooLateToSetReady(); // tras t0 ya no tiene efecto
        stage = Stage.READY;
        emit Ready();
    }

    /// @notice El maker cobra revelando `s_b`. Paga a `to` (permite cobrar en otra dirección
    ///         si la del maker fue congelada, para no revelar `s_b` en una transacción fallida).
    function claim(bytes32 secret, address to) external {
        if (msg.sender != claimer) revert OnlyClaimer();
        if (to == address(0)) revert ZeroAddress();
        Stage s = stage;
        if (s != Stage.PENDING && s != Stage.READY) revert BadStage();
        if (block.timestamp < t0 && s != Stage.READY) revert TooEarlyToClaim();
        if (block.timestamp >= t1) revert TooLateToClaim();
        if (!Secp256k1.mulVerify(uint256(secret), claimCommitment)) revert InvalidSecret();

        stage = Stage.COMPLETED;
        uint256 fee = (amount * FEE_BPS) / 10_000;
        uint256 toClaimer = amount - fee;
        feeOwed = fee;
        emit Claimed(secret, to, toClaimer, fee);
        TOKEN.pushExact(to, toClaimer);
    }

    /// @notice El taker recupera su USDT revelando `s_a`. Sin comisión.
    function refund(bytes32 secret, address to) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (to == address(0)) revert ZeroAddress();
        Stage s = stage;
        if (s != Stage.PENDING && s != Stage.READY) revert BadStage();
        bool beforeT0Unready = block.timestamp < t0 && s == Stage.PENDING;
        bool afterT1 = block.timestamp >= t1;
        if (!beforeT0Unready && !afterT1) revert NotTimeToRefund();
        if (!Secp256k1.mulVerify(uint256(secret), refundCommitment)) revert InvalidSecret();

        stage = Stage.COMPLETED;
        uint256 a = amount;
        emit Refunded(secret, to, a);
        TOKEN.pushExact(to, a);
    }

    /// @notice Cualquiera puede enviar la comisión acumulada a `FEE_RECIPIENT`.
    function withdrawFee() external {
        uint256 fee = feeOwed;
        if (fee == 0) revert NothingToWithdraw();
        feeOwed = 0;
        emit FeeWithdrawn(FEE_RECIPIENT, fee);
        TOKEN.pushExact(FEE_RECIPIENT, fee);
    }
}
