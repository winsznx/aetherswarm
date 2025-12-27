const hre = require("hardhat");

async function main() {
    console.log("Deploying remaining contracts to Polygon Amoy...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "POL");

    // DiscoveryRegistry already deployed
    const discoveryAddress = "0x30412D42E76d358Ad364411C8C22d050e2DC7af7";
    console.log("\nDiscoveryRegistry (already deployed):", discoveryAddress);

    // Deploy ReputationRegistry with discoveryRegistry address
    console.log("\n2. Deploying ReputationRegistry...");
    const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
    const reputationRegistry = await ReputationRegistry.deploy(discoveryAddress);
    await reputationRegistry.waitForDeployment();
    const reputationAddress = await reputationRegistry.getAddress();
    console.log("ReputationRegistry deployed to:", reputationAddress);

    // Deploy QuestPool
    console.log("\n3. Deploying QuestPool...");
    const QuestPool = await hre.ethers.getContractFactory("QuestPool");
    const questPool = await QuestPool.deploy();
    await questPool.waitForDeployment();
    const questPoolAddress = await questPool.getAddress();
    console.log("QuestPool deployed to:", questPoolAddress);

    // Deploy ArtifactNFT
    console.log("\n4. Deploying ArtifactNFT...");
    const ArtifactNFT = await hre.ethers.getContractFactory("ArtifactNFT");
    const artifactNFT = await ArtifactNFT.deploy();
    await artifactNFT.waitForDeployment();
    const artifactAddress = await artifactNFT.getAddress();
    console.log("ArtifactNFT deployed to:", artifactAddress);

    console.log("\n========================================");
    console.log("All contracts deployed successfully!");
    console.log("========================================");
    console.log("\nUpdate your .env file with:");
    console.log(`DISCOVERY_REGISTRY_ADDRESS=${discoveryAddress}`);
    console.log(`REPUTATION_REGISTRY_ADDRESS=${reputationAddress}`);
    console.log(`QUEST_POOL_ADDRESS=${questPoolAddress}`);
    console.log(`ARTIFACT_NFT_ADDRESS=${artifactAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
