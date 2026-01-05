import { ethers, run } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("🚀 Deploying AetherSwarm Contracts");
    console.log("===================================");
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    // Deploy AgentRegistry (ERC-8004 compatible)
    console.log("📜 Deploying AgentRegistry...");
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();
    const agentRegistryAddress = await agentRegistry.getAddress();
    console.log("   AgentRegistry deployed to:", agentRegistryAddress);

    // Deploy ReputationRegistry (needs AgentRegistry address)
    console.log("⭐ Deploying ReputationRegistry...");
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    const reputationRegistry = await ReputationRegistry.deploy(agentRegistryAddress);
    await reputationRegistry.waitForDeployment();
    const reputationRegistryAddress = await reputationRegistry.getAddress();
    console.log("   ReputationRegistry deployed to:", reputationRegistryAddress);

    // Deploy QuestLogger
    console.log("📊 Deploying QuestLogger...");
    const QuestLogger = await ethers.getContractFactory("QuestLogger");
    const questLogger = await QuestLogger.deploy();
    await questLogger.waitForDeployment();
    const questLoggerAddress = await questLogger.getAddress();
    console.log("   QuestLogger deployed to:", questLoggerAddress);

    console.log("");
    console.log("✅ Deployment Complete!");
    console.log("===================================");
    console.log("");
    console.log("Add these to your .env:");
    console.log(`DISCOVERY_REGISTRY_ADDRESS_BASE=${agentRegistryAddress}`);
    console.log(`REPUTATION_REGISTRY_ADDRESS_BASE=${reputationRegistryAddress}`);
    console.log(`QUEST_LOGGER_ADDRESS_BASE=${questLoggerAddress}`);
    console.log("");

    // Verify contracts
    console.log("🔍 Verifying contracts on Etherscan...");
    console.log("Waiting 30 seconds for Etherscan to index...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
        console.log("   Verifying AgentRegistry...");
        await run("verify:verify", {
            address: agentRegistryAddress,
            constructorArguments: [],
        });
        console.log("   ✅ AgentRegistry verified");
    } catch (e: any) {
        console.log("   ⚠️ AgentRegistry:", e.message?.includes("Already Verified") ? "Already verified" : e.message);
    }

    try {
        console.log("   Verifying ReputationRegistry...");
        await run("verify:verify", {
            address: reputationRegistryAddress,
            constructorArguments: [agentRegistryAddress],
        });
        console.log("   ✅ ReputationRegistry verified");
    } catch (e: any) {
        console.log("   ⚠️ ReputationRegistry:", e.message?.includes("Already Verified") ? "Already verified" : e.message);
    }

    try {
        console.log("   Verifying QuestLogger...");
        await run("verify:verify", {
            address: questLoggerAddress,
            constructorArguments: [],
        });
        console.log("   ✅ QuestLogger verified");
    } catch (e: any) {
        console.log("   ⚠️ QuestLogger:", e.message?.includes("Already Verified") ? "Already verified" : e.message);
    }

    console.log("");
    console.log("🎉 All done!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
