// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapEscrow} from "./SwapEscrow.sol";
import {SafeTokenTransfer} from "./SafeTokenTransfer.sol";

/// @notice Crea un escrow aislado (clon EIP-1167) por swap y mueve el USDT del taker
/// directamente al clon. Sin funciones de administrador. Fase 0: prototipo.
contract SwapFactory {
    using SafeTokenTransfer for IERC20;

    address public immutable implementation;
    uint16 public immutable feeBps;
    address public immutable feeRecipient;

    event SwapCreated(address indexed escrow, address indexed owner, address indexed claimer, uint256 amount);

    error ZeroValue();
    error InvalidTimeouts();
    error InvalidParams();

    constructor(uint16 _feeBps, address _feeRecipient) {
        implementation = address(new SwapEscrow());
        if (_feeBps > SwapEscrow(implementation).MAX_FEE_BPS()) revert SwapEscrow.FeeTooHigh();
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
    }

    function newSwap(
        address claimer,
        bytes32 claimCommitment,
        bytes32 refundCommitment,
        uint64 duration0,
        uint64 duration1,
        IERC20 token,
        uint256 amount,
        bytes32 salt
    ) external returns (address escrow) {
        if (amount == 0) revert ZeroValue();
        if (duration0 == 0 || duration1 == 0) revert InvalidTimeouts();
        if (claimer == address(0) || claimCommitment == 0 || refundCommitment == 0) revert InvalidParams();

        escrow = Clones.cloneDeterministic(implementation, keccak256(abi.encode(msg.sender, salt)));
        uint64 t0 = uint64(block.timestamp) + duration0;
        SwapEscrow(escrow).initialize(
            SwapEscrow.Params({
                owner: msg.sender,
                claimer: claimer,
                claimCommitment: claimCommitment,
                refundCommitment: refundCommitment,
                t0: t0,
                t1: t0 + duration1,
                token: token,
                amount: amount,
                feeBps: feeBps,
                feeRecipient: feeRecipient
            })
        );
        token.pullExact(msg.sender, escrow, amount);
        emit SwapCreated(escrow, msg.sender, claimer, amount);
    }
}
