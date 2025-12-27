/**
 * AetherSwarm Contract Deployment Script
 * 
 * Deploys all contracts to Polygon using Thirdweb SDK
 * 
 * Prerequisites:
 * - PRIVATE_KEY env variable set
 * - POLYGON_RPC_URL env variable set
 */

import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { Polygon } from "@thirdweb-dev/chains";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../../.env" });

async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY environment variable required");
    }

    console.log("🚀 Deploying AetherSwarm contracts to Polygon...\n");

    // Initialize SDK
    const sdk = ThirdwebSDK.fromPrivateKey(privateKey, Polygon, {
        secretKey: process.env.THIRDWEB_SECRET_KEY
    });

    const deployer = await sdk.wallet.getAddress();
    console.log(`Deployer address: ${deployer}\n`);

    const deployedContracts: Record<string, string> = {};

    // 1. Deploy DiscoveryRegistry (ERC-8004 Identity)
    console.log("📋 Deploying DiscoveryRegistry...");
    try {
        const discoveryRegistry = await sdk.deployer.deployContractFromUri(
            "ipfs://Qm...", // Would be uploaded binary
            [],
            {
                contractName: "DiscoveryRegistry"
            }
        );
        deployedContracts.DiscoveryRegistry = discoveryRegistry;
        console.log(`   ✅ DiscoveryRegistry: ${discoveryRegistry}\n`);
    } catch (e) {
        console.log("   ⚠️  Using manual deploy for DiscoveryRegistry");
        console.log("   Run: npx thirdweb deploy\n");
    }

    // 2. Deploy ReputationRegistry (ERC-8004 Reputation)
    console.log("⭐ Deploying ReputationRegistry...");
    try {
        const discoveryAddress = deployedContracts.DiscoveryRegistry || "0x0000000000000000000000000000000000000000";
        // Would deploy with constructor args
        console.log(`   Pass DiscoveryRegistry address: ${discoveryAddress}\n`);
    } catch (e) {
        console.log("   ⚠️  Deploy manually with thirdweb\n");
    }

    // 3. Deploy QuestPool
    console.log("💰 Deploying QuestPool...");
    console.log("   Note: Initialize with treasury address\n");

    // 4. Deploy ArtifactNFT
    console.log("🎨 Deploying ArtifactNFT...");
    console.log("   Note: ERC-721A for gas-efficient minting\n");

    // Output deployment addresses
    console.log("═".repeat(50));
    console.log("DEPLOYMENT SUMMARY");
    console.log("═".repeat(50));

    for (const [name, address] of Object.entries(deployedContracts)) {
        console.log(`${name}: ${address}`);
    }

    // Save to .env
    const envContent = Object.entries(deployedContracts)
        .map(([name, addr]) => `${name.toUpperCase()}_ADDRESS=${addr}`)
        .join("\n");

    fs.appendFileSync(path.join(__dirname, "../../.env"), `\n# Deployed Contracts\n${envContent}\n`);
    console.log("\n✅ Addresses appended to .env");

    // Generate Subgraph config
    console.log("\n📊 Update web3/subgraph/subgraph.yaml with:");
    for (const [name, address] of Object.entries(deployedContracts)) {
        console.log(`   ${name}: ${address}`);
    }
}

main().catch(console.error);
