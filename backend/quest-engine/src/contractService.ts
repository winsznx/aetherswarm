/**
 * Contract Integration Service for AetherSwarm
 * 
 * Connects Quest Engine to deployed smart contracts on Polygon Amoy:
 * - QuestPool: Quest budget management
 * - DiscoveryRegistry: ERC-8004 Agent identity
 * - ReputationRegistry: Agent reputation tracking
 * - ArtifactNFT: Knowledge artifact minting
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

// Contract ABIs (minimal interfaces for our use cases)
const QUEST_POOL_ABI = [
    'event QuestCreated(bytes32 indexed questId, uint256 budget)',
    'function createQuest(bytes32 questId, uint256 budget) external',
    'function drip(bytes32 questId, address agent, uint256 amount) external',
    'function questBudgets(bytes32 questId) view returns (uint256)'
];

const DISCOVERY_REGISTRY_ABI = [
    'event AgentRegistered(uint256 indexed agentId, address indexed paymentAddress, uint8 role, string tokenURI)',
    'function getAgent(uint256 agentId) view returns (uint8 role, address paymentAddress, string wsEndpoint, string a2aEndpoint, uint256 stakeAmount, bool isActive, uint256 registeredAt)',
    'function getAgentsByRole(uint8 role) view returns (uint256[])',
    'function totalAgents() view returns (uint256)'
];

const REPUTATION_REGISTRY_ABI = [
    'event ContributionRecorded(address indexed agent, bytes32 indexed questId, uint256 score)',
    'function recordContribution(address agent, bytes32 questId, uint256 score, string calldata attestationHash) external',
    'function getReputation(address agent) view returns (uint256 totalScore, uint256 contributionCount)',
    'function getContribution(address agent, bytes32 questId) view returns (uint256 score, string attestationHash, uint256 timestamp)'
];

const ARTIFACT_NFT_ABI = [
    'event ArtifactMinted(uint256 indexed tokenId, bytes32 merkleRoot, address[] contributors)',
    'function mintArtifact(address recipient, string metadataURI, bytes32 merkleRoot, address[] contributors) external returns (uint256)',
    'function getArtifact(uint256 tokenId) view returns (string metadataURI, bytes32 merkleRoot, address[] contributors, uint256 createdAt)',
    'function totalSupply() view returns (uint256)'
];

// Contract addresses from .env
const CONTRACT_ADDRESSES = {
    questPool: process.env.QUEST_POOL_ADDRESS || '0xa1Ec92002c51eD8E117dD4E015b74DcCD70D796F',
    discoveryRegistry: process.env.DISCOVERY_REGISTRY_ADDRESS || '0x30412D42E76d358Ad364411C8C22d050e2DC7af7',
    reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '0x9421c754C2cA9752513E500827373d3957ca9259',
    artifactNFT: process.env.ARTIFACT_NFT_ADDRESS || '0x585Eba2C08752E5550DEc4f61E08742044197b6A',
};

// Polygon Amoy RPC
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';

// PolygonScan URLs for block explorer links
const EXPLORER_URLS = {
    amoy: 'https://amoy.polygonscan.com',
    polygon: 'https://polygonscan.com'
};

export class ContractService {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet | null = null;

    // Contract instances
    public questPool: ethers.Contract;
    public discoveryRegistry: ethers.Contract;
    public reputationRegistry: ethers.Contract;
    public artifactNFT: ethers.Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);

        // Initialize contract instances (read-only by default)
        this.questPool = new ethers.Contract(
            CONTRACT_ADDRESSES.questPool,
            QUEST_POOL_ABI,
            this.provider
        );

        this.discoveryRegistry = new ethers.Contract(
            CONTRACT_ADDRESSES.discoveryRegistry,
            DISCOVERY_REGISTRY_ABI,
            this.provider
        );

        this.reputationRegistry = new ethers.Contract(
            CONTRACT_ADDRESSES.reputationRegistry,
            REPUTATION_REGISTRY_ABI,
            this.provider
        );

        this.artifactNFT = new ethers.Contract(
            CONTRACT_ADDRESSES.artifactNFT,
            ARTIFACT_NFT_ABI,
            this.provider
        );

        // If we have a private key, create signer for write operations
        const privateKey = process.env.PLATFORM_PRIVATE_KEY;
        if (privateKey) {
            this.signer = new ethers.Wallet(privateKey, this.provider);

            // Connect contracts with signer for write operations
            this.questPool = this.questPool.connect(this.signer) as any;
            this.reputationRegistry = this.reputationRegistry.connect(this.signer) as any;
            this.artifactNFT = this.artifactNFT.connect(this.signer) as any;

            console.log('[ContractService] Initialized with signer:', this.signer.address);
        } else {
            console.log('[ContractService] Initialized in read-only mode (no private key)');
        }
    }

    // --- Quest Pool Operations ---

    /**
     * Convert quest ID string to bytes32 for contract
     */
    questIdToBytes32(questId: string): string {
        return ethers.keccak256(ethers.toUtf8Bytes(questId));
    }

    /**
     * Get quest budget from on-chain
     */
    async getQuestBudget(questId: string): Promise<bigint> {
        const questIdBytes = this.questIdToBytes32(questId);
        return await this.questPool.questBudgets(questIdBytes);
    }

    /**
     * Drip payment to agent from quest budget
     */
    async dripToAgent(questId: string, agentAddress: string, amount: bigint): Promise<ethers.ContractTransactionReceipt> {
        if (!this.signer) {
            throw new Error('Signer required for write operations');
        }

        const questIdBytes = this.questIdToBytes32(questId);
        const tx = await this.questPool.drip(questIdBytes, agentAddress, amount);
        const receipt = await tx.wait();

        console.log(`[ContractService] Dripped ${amount} to ${agentAddress} for quest ${questId}`);
        console.log(`[ContractService] Tx: ${this.getTxExplorerUrl(receipt.hash)}`);

        return receipt;
    }

    // --- Discovery Registry Operations ---

    /**
     * Get total registered agents
     */
    async getTotalAgents(): Promise<number> {
        const total = await this.discoveryRegistry.totalAgents();
        return Number(total);
    }

    /**
     * Get agents by role (0=Scout, 1=Verifier, 2=Synthesizer)
     */
    async getAgentsByRole(role: number): Promise<number[]> {
        const agentIds = await this.discoveryRegistry.getAgentsByRole(role);
        return agentIds.map((id: bigint) => Number(id));
    }

    /**
     * Get agent details
     */
    async getAgentDetails(agentId: number): Promise<{
        role: number;
        paymentAddress: string;
        wsEndpoint: string;
        a2aEndpoint: string;
        stakeAmount: bigint;
        isActive: boolean;
        registeredAt: number;
    }> {
        const [role, paymentAddress, wsEndpoint, a2aEndpoint, stakeAmount, isActive, registeredAt] =
            await this.discoveryRegistry.getAgent(agentId);

        return {
            role: Number(role),
            paymentAddress,
            wsEndpoint,
            a2aEndpoint,
            stakeAmount,
            isActive,
            registeredAt: Number(registeredAt)
        };
    }

    // --- Reputation Registry Operations ---

    /**
     * Record agent contribution with attestation
     */
    async recordContribution(
        agentAddress: string,
        questId: string,
        score: number,
        attestationHash: string
    ): Promise<ethers.ContractTransactionReceipt> {
        if (!this.signer) {
            throw new Error('Signer required for write operations');
        }

        const questIdBytes = this.questIdToBytes32(questId);
        const tx = await this.reputationRegistry.recordContribution(
            agentAddress,
            questIdBytes,
            score,
            attestationHash
        );
        const receipt = await tx.wait();

        console.log(`[ContractService] Recorded contribution for ${agentAddress}: score=${score}`);
        console.log(`[ContractService] Tx: ${this.getTxExplorerUrl(receipt.hash)}`);

        return receipt;
    }

    /**
     * Get agent reputation
     */
    async getReputation(agentAddress: string): Promise<{ totalScore: bigint; contributionCount: bigint }> {
        const [totalScore, contributionCount] = await this.reputationRegistry.getReputation(agentAddress);
        return { totalScore, contributionCount };
    }

    // --- Artifact NFT Operations ---

    /**
     * Mint a knowledge artifact NFT
     */
    async mintArtifact(
        recipient: string,
        metadataURI: string,
        merkleRoot: string,
        contributors: string[]
    ): Promise<{ tokenId: number; receipt: ethers.ContractTransactionReceipt }> {
        if (!this.signer) {
            throw new Error('Signer required for write operations');
        }

        const tx = await this.artifactNFT.mintArtifact(
            recipient,
            metadataURI,
            merkleRoot,
            contributors
        );
        const receipt = await tx.wait();

        // Parse tokenId from event
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = this.artifactNFT.interface.parseLog(log);
                return parsed?.name === 'ArtifactMinted';
            } catch {
                return false;
            }
        });

        let tokenId = 0;
        if (event) {
            const parsed = this.artifactNFT.interface.parseLog(event);
            tokenId = Number(parsed?.args?.tokenId || 0);
        }

        console.log(`[ContractService] Minted artifact #${tokenId} for ${recipient}`);
        console.log(`[ContractService] Tx: ${this.getTxExplorerUrl(receipt.hash)}`);

        return { tokenId, receipt };
    }

    /**
     * Get artifact details
     */
    async getArtifact(tokenId: number): Promise<{
        metadataURI: string;
        merkleRoot: string;
        contributors: string[];
        createdAt: number;
    }> {
        const [metadataURI, merkleRoot, contributors, createdAt] =
            await this.artifactNFT.getArtifact(tokenId);

        return {
            metadataURI,
            merkleRoot,
            contributors,
            createdAt: Number(createdAt)
        };
    }

    /**
     * Get total artifacts minted
     */
    async getTotalArtifacts(): Promise<number> {
        const total = await this.artifactNFT.totalSupply();
        return Number(total);
    }

    // --- Block Explorer URLs ---

    /**
     * Get PolygonScan URL for transaction
     */
    getTxExplorerUrl(txHash: string): string {
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 80002;
        const baseUrl = chainId === 137 ? EXPLORER_URLS.polygon : EXPLORER_URLS.amoy;
        return `${baseUrl}/tx/${txHash}`;
    }

    /**
     * Get PolygonScan URL for address
     */
    getAddressExplorerUrl(address: string): string {
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 80002;
        const baseUrl = chainId === 137 ? EXPLORER_URLS.polygon : EXPLORER_URLS.amoy;
        return `${baseUrl}/address/${address}`;
    }

    /**
     * Get PolygonScan URL for NFT
     */
    getNftExplorerUrl(contractAddress: string, tokenId: number): string {
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 80002;
        const baseUrl = chainId === 137 ? EXPLORER_URLS.polygon : EXPLORER_URLS.amoy;
        return `${baseUrl}/token/${contractAddress}?a=${tokenId}`;
    }

    // --- x402scan.com URLs ---

    /**
     * Get x402scan.com URL for the x402 ecosystem explorer
     */
    getX402ScanUrl(): string {
        return 'https://x402scan.com';
    }

    /**
     * Get x402scan resources URL (where AetherSwarm endpoints would be listed)
     */
    getX402ResourcesUrl(): string {
        return 'https://x402scan.com/resources';
    }

    /**
     * Get Thirdweb Nexus dashboard URL
     */
    getThirdwebNexusUrl(): string {
        return 'https://nexus.thirdweb.com/dashboard';
    }

    /**
     * Get all explorer URLs for a quest
     */
    getQuestExplorerLinks(paymentTxHash?: string): {
        polygonscan: { paymentTx: string | null; questPool: string; discoveryRegistry: string };
        x402scan: string;
        thirdwebNexus: string;
    } {
        return {
            polygonscan: {
                paymentTx: paymentTxHash ? this.getTxExplorerUrl(paymentTxHash) : null,
                questPool: this.getAddressExplorerUrl(CONTRACT_ADDRESSES.questPool),
                discoveryRegistry: this.getAddressExplorerUrl(CONTRACT_ADDRESSES.discoveryRegistry),
            },
            x402scan: this.getX402ScanUrl(),
            thirdwebNexus: this.getThirdwebNexusUrl(),
        };
    }
}

// Singleton instance
let contractServiceInstance: ContractService | null = null;

export function getContractService(): ContractService {
    if (!contractServiceInstance) {
        contractServiceInstance = new ContractService();
    }
    return contractServiceInstance;
}

export default ContractService;
