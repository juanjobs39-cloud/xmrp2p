// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Secp256k1} from "./Secp256k1.sol";
import {SafeTokenTransfer} from "./SafeTokenTransfer.sol";

/// @notice Escrow de UN swap (clon mínimo EIP-1167 creado por SwapFactory).
/// Reglas de plazos idénticas a AthanorLabs SwapCreator:
///  - taker (owner) puede reembolsar antes de t0 si no marcó READY, o después de t1.
///  - maker (claimer) puede reclamar si READY y antes de t1, o entre t0 y t1.
/// Fase 0: PROTOTIPO para medir compatibilidad. No auditado, no usar con fondos reales.
contract SwapEscrow {
    using SafeTokenTransfer for IERC20;

    enum Stage { UNINITIALIZED, PENDING, READY, COMPLETED }

    /// Tope inmutable de comisión: 1 % (100 bps). Ni la fábrica ni nadie puede superarlo.
    uint256 public constant MAX_FEE_BPS = 100;

    Stage public stage;
    address public factory;
    address public owner;        // taker (aporta USDT)
    address public claimer;      // maker (aporta XMR)
    bytes32 public claimCommitment;
    bytes32 public refundCommitment;
    uint64 public t0;
    uint64 public t1;
    IERC20 public token;
    uint256 public amount;
    uint16 public feeBps;
    address public feeRecipient;

    event Ready();
    event Claimed(bytes32 secret, uint256 toClaimer, uint256 fee);
    event Refunded(bytes32 secret);

    error AlreadyInitialized();
    error OnlyOwner();
    error OnlyClaimer();
    error BadStage();
    error TooEarlyToClaim();
    error TooLateToClaim();
    error NotTimeToRefund();
    error InvalidSecret();
    error FeeTooHigh();

    struct Params {
        address owner;
        address claimer;
        bytes32 claimCommitment;
        bytes32 refundCommitment;
        uint64 t0;
        uint64 t1;
        IERC20 token;
        uint256 amount;
        uint16 feeBps;
        address feeRecipient;
    }

    /// La implementación base queda inutilizable; solo los clones se inicializan.
    constructor() {
        stage = Stage.COMPLETED;
    }

    /// Lo llama la fábrica en la misma transacción en que crea el clon.
    function initialize(Params calldata p) external {
        if (stage != Stage.UNINITIALIZED) revert AlreadyInitialized();
        if (p.feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        stage = Stage.PENDING;
        factory = msg.sender;
        owner = p.owner;
        claimer = p.claimer;
        claimCommitment = p.claimCommitment;
        refundCommitment = p.refundCommitment;
        t0 = p.t0;
        t1 = p.t1;
        token = p.token;
        amount = p.amount;
        feeBps = p.feeBps;
        feeRecipient = p.feeRecipient;
    }

    function setReady() external {
        if (msg.sender != owner) revert OnlyOwner();
        if (stage != Stage.PENDING) revert BadStage();
        stage = Stage.READY;
        emit Ready();
    }

    function claim(bytes32 secret) external {
        if (msg.sender != claimer) revert OnlyClaimer();
        Stage s = stage;
        if (s != Stage.PENDING && s != Stage.READY) revert BadStage();
        if (block.timestamp < t0 && s != Stage.READY) revert TooEarlyToClaim();
        if (block.timestamp >= t1) revert TooLateToClaim();
        if (!Secp256k1.mulVerify(uint256(secret), claimCommitment)) revert InvalidSecret();

        stage = Stage.COMPLETED; // efectos antes de interacciones (reentrada)
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 toClaimer = amount - fee;
        emit Claimed(secret, toClaimer, fee);
        token.pushExact(claimer, toClaimer);
        if (fee > 0) token.pushExact(feeRecipient, fee);
    }

    function refund(bytes32 secret) external {
        if (msg.sender != owner) revert OnlyOwner();
        Stage s = stage;
        if (s != Stage.PENDING && s != Stage.READY) revert BadStage();
        if (block.timestamp < t1 && (block.timestamp >= t0 || s == Stage.READY)) revert NotTimeToRefund();
        if (!Secp256k1.mulVerify(uint256(secret), refundCommitment)) revert InvalidSecret();

        stage = Stage.COMPLETED;
        emit Refunded(secret);
        token.pushExact(owner, amount); // sin comisión en reembolsos
    }
}
