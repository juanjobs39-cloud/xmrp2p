// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SwapFactory} from "../src/SwapFactory.sol";
import {TestUSDT} from "../src/testnet/TestUSDT.sol";

/// @notice Despliega la fábrica en una TESTNET. Se niega a correr en redes principales.
///
/// Variables de entorno:
///   FEE_RECIPIENT   dirección que recibe la comisión (obligatoria)
///   FEE_BPS         comisión en puntos básicos (por defecto 50 = 0,5 %; tope 100)
///   TOKEN           USDT de la red; vacío = despliega TestUSDT
///   MIN_AMOUNT      monto mínimo en unidades del token (por defecto 1e6 = 1 USDT)
///   MIN_DURATION / MAX_DURATION   límites de cada plazo en segundos (por defecto 10 min / 2 días)
///
/// Ejemplo (la llave NUNCA va en el repo; usa un keystore de Foundry):
///   forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --account testnet-deployer --broadcast
contract Deploy is Script {
    error MainnetNotAllowed(uint256 chainId);

    function run() external returns (SwapFactory factory, address token) {
        uint256 id = block.chainid;
        // Arbitrum One, Ethereum, Tron mainnet (vía EVM), BSC, Polygon, Base, Optimism.
        if (id == 42161 || id == 1 || id == 728126428 || id == 56 || id == 137 || id == 8453 || id == 10) {
            revert MainnetNotAllowed(id);
        }

        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 feeRaw = vm.envOr("FEE_BPS", uint256(50));
        require(feeRaw <= 100, "FEE_BPS mayor que el tope (100)");
        uint16 feeBps = uint16(feeRaw);
        token = vm.envOr("TOKEN", address(0));
        uint256 minAmount = vm.envOr("MIN_AMOUNT", uint256(1e6));
        uint64 minD = uint64(vm.envOr("MIN_DURATION", uint256(10 minutes)));
        uint64 maxD = uint64(vm.envOr("MAX_DURATION", uint256(2 days)));

        vm.startBroadcast();
        if (token == address(0)) token = address(new TestUSDT());
        factory =
            new SwapFactory(SwapFactory.Config(IERC20(token), feeBps, feeRecipient, minAmount, minD, maxD));
        vm.stopBroadcast();

        console.log("chainId        ", id);
        console.log("token          ", token);
        console.log("SwapFactory    ", address(factory));
        console.log("implementacion ", factory.IMPLEMENTATION());
    }
}
