// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {TestUSDT} from "../src/testnet/TestUSDT.sol";

/// @notice Despliega la fábrica.
///   - En testnet: libre (y despliega TestUSDT si no se da TOKEN).
///   - En Arbitrum One (beta con dinero real, SIN auditoría externa): solo con I_ACCEPT_MAINNET=yes,
///     TOKEN = USD₮0, MAX_AMOUNT ≤ 100 USDT y FEE_BPS ≤ 50. Cualquier otra red principal está bloqueada.
///
/// Variables de entorno:
///   FEE_RECIPIENT   dirección que recibe la comisión (obligatoria)
///   FEE_BPS         comisión en puntos básicos (por defecto 50 = 0,5 %)
///   TOKEN           USDT de la red; vacío = despliega TestUSDT (solo testnet)
///   MIN_AMOUNT      monto mínimo en unidades del token (por defecto 1e6 = 1 USDT)
///   MAX_AMOUNT      monto máximo por swap (por defecto 100e6 = 100 USDT)
///   MIN_DURATION / MAX_DURATION   límites de cada plazo en segundos (por defecto 10 min / 2 días)
///   I_ACCEPT_MAINNET  "yes" para Arbitrum One
///
/// La llave NUNCA va en el repo: usa --ledger o un keystore de Foundry (--account).
///   forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --account testnet-deployer --broadcast
contract Deploy is Script {
    error MainnetNotAllowed(uint256 chainId);

    uint256 internal constant ARBITRUM_ONE = 42161;
    /// @notice USD₮0 en Arbitrum One (probado en fork, incluido `permit`).
    address internal constant USDT0_ARBITRUM = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    uint256 internal constant BETA_MAX_AMOUNT = 100e6;
    uint256 internal constant BETA_MAX_FEE_BPS = 50;

    function run() external returns (SwapFactory factory, address token) {
        uint256 id = block.chainid;
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 feeRaw = vm.envOr("FEE_BPS", uint256(50));
        require(feeRaw <= 100, "FEE_BPS mayor que el tope (100)");
        uint16 feeBps = uint16(feeRaw);
        token = vm.envOr("TOKEN", address(0));
        uint256 minAmount = vm.envOr("MIN_AMOUNT", uint256(1e6));
        uint256 maxAmount = vm.envOr("MAX_AMOUNT", BETA_MAX_AMOUNT);
        uint64 minD = uint64(vm.envOr("MIN_DURATION", uint256(10 minutes)));
        uint64 maxD = uint64(vm.envOr("MAX_DURATION", uint256(2 days)));

        if (id == ARBITRUM_ONE) {
            _checkBeta(token, maxAmount, feeRaw);
        } else if (id == 1 || id == 728126428 || id == 56 || id == 137 || id == 8453 || id == 10) {
            // Ethereum, Tron, BSC, Polygon, Base, Optimism: siguen bloqueadas.
            revert MainnetNotAllowed(id);
        }

        vm.startBroadcast();
        if (token == address(0)) token = address(new TestUSDT());
        factory = new SwapFactory(
            SwapFactory.Config(IERC20(token), feeBps, feeRecipient, minAmount, maxAmount, minD, maxD)
        );
        vm.stopBroadcast();

        console.log("chainId        ", id);
        console.log("token          ", token);
        console.log("SwapFactory    ", address(factory));
        console.log("implementacion ", factory.IMPLEMENTATION());
        console.log("MAX_AMOUNT     ", factory.MAX_AMOUNT());
    }

    /// @dev Condiciones de la beta con dinero real (decisión del dueño, docs/MAINNET.md).
    function _checkBeta(address token, uint256 maxAmount, uint256 feeBps) internal view {
        require(
            keccak256(bytes(vm.envOr("I_ACCEPT_MAINNET", string("")))) == keccak256("yes"),
            "Arbitrum One requiere I_ACCEPT_MAINNET=yes (beta sin auditoria externa)"
        );
        require(token == USDT0_ARBITRUM, "en Arbitrum One TOKEN debe ser USD0 (0xFd086bC7...)");
        require(maxAmount > 0 && maxAmount <= BETA_MAX_AMOUNT, "MAX_AMOUNT debe ser <= 100 USDT en la beta");
        require(feeBps <= BETA_MAX_FEE_BPS, "FEE_BPS debe ser <= 50 en la beta");
    }
}
