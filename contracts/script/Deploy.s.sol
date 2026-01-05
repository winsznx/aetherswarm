// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/QuestLogger.sol";

/**
 * @title DeployContracts
 * @notice Professional deployment script with structured JSON output
 */
contract DeployContracts is Script {
    
    struct DeploymentInfo {
        address agentRegistry;
        address reputationRegistry;
        address questLogger;
        address deployer;
        uint256 chainId;
        uint256 blockNumber;
        uint256 timestamp;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("AetherSwarm Contract Deployment");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("========================================");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentRegistry
        console.log("\n[1/3] Deploying AgentRegistry...");
        AgentRegistry agentRegistry = new AgentRegistry();
        console.log("  Address:", address(agentRegistry));

        // 2. Deploy ReputationRegistry
        console.log("\n[2/3] Deploying ReputationRegistry...");
        ReputationRegistry reputationRegistry = new ReputationRegistry(
            address(agentRegistry)
        );
        console.log("  Address:", address(reputationRegistry));

        // 3. Deploy QuestLogger
        console.log("\n[3/3] Deploying QuestLogger...");
        QuestLogger questLogger = new QuestLogger();
        console.log("  Address:", address(questLogger));

        vm.stopBroadcast();

        console.log("\n========================================");
        console.log("Deployment Complete!");
        console.log("========================================");

        // Create structured JSON output
        DeploymentInfo memory info = DeploymentInfo({
            agentRegistry: address(agentRegistry),
            reputationRegistry: address(reputationRegistry),
            questLogger: address(questLogger),
            deployer: deployer,
            chainId: block.chainid,
            blockNumber: block.number,
            timestamp: block.timestamp
        });

        // Save as .env format
        string memory envOutput = string(abi.encodePacked(
            "AGENT_REGISTRY_ADDRESS=", vm.toString(info.agentRegistry), "\n",
            "REPUTATION_REGISTRY_ADDRESS=", vm.toString(info.reputationRegistry), "\n",
            "QUEST_LOGGER_ADDRESS=", vm.toString(info.questLogger), "\n"
        ));
        vm.writeFile(".contracts.env", envOutput);

        // Save as JSON for structured processing
        string memory jsonOutput = string(abi.encodePacked(
            "{\n",
            '  "agentRegistry": "', vm.toString(info.agentRegistry), '",\n',
            '  "reputationRegistry": "', vm.toString(info.reputationRegistry), '",\n',
            '  "questLogger": "', vm.toString(info.questLogger), '",\n',
            '  "deployer": "', vm.toString(info.deployer), '",\n',
            '  "chainId": ', vm.toString(info.chainId), ',\n',
            '  "blockNumber": ', vm.toString(info.blockNumber), ',\n',
            '  "timestamp": ', vm.toString(info.timestamp), ',\n',
            '  "network": "polygon-amoy"\n',
            "}\n"
        ));
        vm.writeFile("deployment.json", jsonOutput);

        console.log("\nOutput files created:");
        console.log("  - .contracts.env (environment variables)");
        console.log("  - deployment.json (structured data)");
    }
}
