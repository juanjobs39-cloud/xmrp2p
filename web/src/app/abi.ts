/** ABIs de la fábrica y del escrow (compartidas por la app y el taker de pruebas e2e). */
import { parseAbi } from "viem";

export const FACTORY_ABI = parseAbi([
  "function newSwap(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt) returns (address)",
  "function newSwapWithPermit(address claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint64 duration0, uint64 duration1, uint256 amount, bytes32 salt, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns (address)",
  "function predictEscrow(address owner, bytes32 salt) view returns (address)",
  "function TOKEN() view returns (address)",
  "function FEE_BPS() view returns (uint16)",
]);

export const ESCROW_ABI = parseAbi([
  "function stage() view returns (uint8)",
  "function t0() view returns (uint64)",
  "function t1() view returns (uint64)",
  "function amount() view returns (uint256)",
  "function owner() view returns (address)",
  "function claimer() view returns (address)",
  "function claimCommitment() view returns (bytes32)",
  "function refundCommitment() view returns (bytes32)",
  "function setReady()",
  "function refund(bytes32 secret, address to)",
  "event Claimed(bytes32 secret, address indexed to, uint256 amountToClaimer, uint256 fee)",
  "event Refunded(bytes32 secret, address indexed to, uint256 amount)",
]);
