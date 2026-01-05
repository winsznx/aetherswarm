import { ethers } from 'ethers';
import AgentRegistryABI from './abis/AgentRegistry.json';
import ReputationRegistryABI from './abis/ReputationRegistry.json';

export interface Agent {
    owner: string;
    agentType: 'scout' | 'verifier' | 'synthesizer';
    capabilities: string;
    skills: string[];
    registeredAt: bigint;
    active: boolean;
}

export interface AgentReputation {
    totalScore: bigint;
    questCount: bigint;
    averageScore: bigint;
    lastQuest: bigint;
}

export class ERC8004Registry {
    private agentRegistry: ethers.Contract;
    private reputationRegistry: ethers.Contract;
    private signer: ethers.Signer;

    constructor(
        agentRegistryAddress: string,
        reputationRegistryAddress: string,
        provider: ethers.Provider,
        signer: ethers.Signer
    ) {
        this.agentRegistry = new ethers.Contract(
            agentRegistryAddress,
            AgentRegistryABI,
            provider
        );
        this.reputationRegistry = new ethers.Contract(
            reputationRegistryAddress,
            ReputationRegistryABI,
            provider
        );
        this.signer = signer;
    }

    /**
     * Register a new agent on-chain
     */
    async registerAgent(
        agentType: 'scout' | 'verifier' | 'synthesizer',
        capabilities: Record<string, any>,
        skills: string[]
    ): Promise<number> {
        const capabilitiesJson = JSON.stringify(capabilities);

        const tx = await this.agentRegistry
            .connect(this.signer)
            .registerAgent(agentType, capabilitiesJson, skills);

        const receipt = await tx.wait();

        // Extract agentId from events
        const event = receipt.logs.find(
            (log: any) => log.fragment?.name === 'AgentRegistered'
        );

        if (!event) throw new Error('Agent registration failed');

        const agentId = Number(event.args[0]);
        console.log(`✅ Registered ${agentType} agent with ID: ${agentId}`);

        return agentId;
    }

    /**
     * Get agent details
     */
    async getAgent(agentId: number): Promise<Agent> {
        const agent = await this.agentRegistry.getAgent(agentId);

        return {
            owner: agent.owner,
            agentType: agent.agentType,
            capabilities: agent.capabilities,
            skills: agent.skills,
            registeredAt: agent.registeredAt,
            active: agent.active,
        };
    }

    /**
     * Get agents by type
     */
    async getAgentsByType(
        agentType: 'scout' | 'verifier' | 'synthesizer'
    ): Promise<number[]> {
        const agentIds = await this.agentRegistry.getAgentsByType(agentType);
        return agentIds.map((id: bigint) => Number(id));
    }

    /**
     * Record quest completion and score
     */
    async recordQuestCompletion(
        agentId: number,
        questId: string,
        score: number,
        feedback: string = ''
    ): Promise<void> {
        if (score < 0 || score > 100) {
            throw new Error('Score must be between 0 and 100');
        }

        // Convert quest ID to uint256 (hash it)
        const questIdHash = ethers.keccak256(ethers.toUtf8Bytes(questId));
        const questIdNum = BigInt(questIdHash) % BigInt(2 ** 32);

        const tx = await this.reputationRegistry
            .connect(this.signer)
            .recordQuestCompletion(agentId, questIdNum, score, feedback);

        await tx.wait();

        console.log(`✅ Recorded quest ${questId} for agent ${agentId}: ${score}/100`);
    }

    /**
     * Get agent reputation
     */
    async getReputation(agentId: number): Promise<AgentReputation> {
        const rep = await this.reputationRegistry.getReputation(agentId);

        return {
            totalScore: rep.totalScore,
            questCount: rep.questCount,
            averageScore: rep.averageScore,
            lastQuest: rep.lastQuest,
        };
    }

    /**
     * Get average score for an agent
     */
    async getAverageScore(agentId: number): Promise<number> {
        const score = await this.reputationRegistry.getAverageScore(agentId);
        return Number(score);
    }

    /**
     * Get high-reputation agents of a specific type
     */
    async getHighReputationAgents(
        agentType: 'scout' | 'verifier' | 'synthesizer',
        minScore: number = 70
    ): Promise<number[]> {
        const allAgents = await this.getAgentsByType(agentType);

        const highRepAgents: number[] = [];

        for (const agentId of allAgents) {
            const avgScore = await this.getAverageScore(agentId);
            if (avgScore >= minScore) {
                highRepAgents.push(agentId);
            }
        }

        return highRepAgents;
    }

    /**
     * Authorize an address to record quest completions
     */
    async authorizeRater(raterAddress: string): Promise<void> {
        const tx = await this.reputationRegistry
            .connect(this.signer)
            .setAuthorizedRater(raterAddress, true);

        await tx.wait();

        console.log(`✅ Authorized rater: ${raterAddress}`);
    }
}

/**
 * Initialize ERC-8004 registry from environment
 */
export async function initializeRegistry(): Promise<ERC8004Registry> {
    const agentRegistryAddress = process.env.AGENT_REGISTRY_ADDRESS;
    const reputationRegistryAddress = process.env.REPUTATION_REGISTRY_ADDRESS;
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

    if (!agentRegistryAddress || !reputationRegistryAddress || !rpcUrl || !privateKey) {
        throw new Error('Missing required environment variables for ERC-8004 registry');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    return new ERC8004Registry(
        agentRegistryAddress,
        reputationRegistryAddress,
        provider,
        signer
    );
}
