import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load ABIs
function loadABI(contractName: string): any[] {
    const abiPath = path.join(__dirname, '../../../contracts/out', `${contractName}.sol`, `${contractName}.json`);
    try {
        const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        return contractJson.abi;
    } catch (error) {
        console.warn(`[Contracts] Could not load ABI for ${contractName}:`, error);
        return [];
    }
}

export interface QuestLogData {
    questId: string;
    objectives: string;
    budgetUSDC: string;
}

export interface PaymentProofData {
    questId: string;
    agentId: number;
    apiEndpoint: string;
    amountUSDC: string;
    txHash: string;
}

export class OnChainQuestLogger {
    private questLogger: ethers.Contract | null;
    private signer: ethers.Signer;
    private provider: ethers.Provider;

    constructor() {
        const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const questLoggerAddress = process.env.QUEST_LOGGER_ADDRESS;

        if (!rpcUrl || !privateKey) {
            console.warn('[QuestLogger] Missing RPC URL or private key - on-chain logging disabled');
            this.questLogger = null;
            this.provider = new ethers.JsonRpcProvider('http://localhost:8545'); // Dummy
            this.signer = ethers.Wallet.createRandom();
            return;
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers.Wallet(privateKey, this.provider);

        if (questLoggerAddress) {
            const abi = loadABI('QuestLogger');
            this.questLogger = new ethers.Contract(questLoggerAddress, abi, this.signer);
            console.log('[QuestLogger] Connected to contract:', questLoggerAddress);
        } else {
            console.warn('[QuestLogger] Contract address not set - on-chain logging disabled');
            this.questLogger = null;
        }
    }

    /**
     * Create quest log on-chain
     */
    async createQuest(data: QuestLogData): Promise<{ txHash: string; explorerUrl: string } | null> {
        if (!this.questLogger) {
            console.warn('[QuestLogger] Skipping on-chain quest creation (not configured)');
            return null;
        }

        try {
            console.log(`[QuestLogger] Creating quest on-chain: ${data.questId}`);

            const budgetWei = ethers.parseUnits(data.budgetUSDC, 6); // USDC has 6 decimals

            const tx = await this.questLogger.createQuest(
                data.questId,
                data.objectives,
                budgetWei
            );

            const receipt = await tx.wait();

            const explorerUrl = this.getTxExplorerUrl(receipt.hash);

            console.log(`[QuestLogger] Quest created on-chain`);
            console.log(`  TX: ${receipt.hash}`);
            console.log(`  Block: ${receipt.blockNumber}`);
            console.log(`  Explorer: ${explorerUrl}`);

            return {
                txHash: receipt.hash,
                explorerUrl
            };
        } catch (error: any) {
            console.error('[QuestLogger] Failed to create quest on-chain:', error.message);
            return null;
        }
    }

    /**
     * Record payment proof on-chain
     */
    async recordPayment(data: PaymentProofData): Promise<{ txHash: string; explorerUrl: string } | null> {
        if (!this.questLogger) {
            console.warn('[QuestLogger] Skipping payment recording (not configured)');
            return null;
        }

        try {
            console.log(`[QuestLogger] Recording payment on-chain`);
            console.log(`  Quest: ${data.questId}`);
            console.log(`  Agent: #${data.agentId}`);
            console.log(`  API: ${data.apiEndpoint}`);
            console.log(`  Amount: $${data.amountUSDC}`);

            const amountWei = ethers.parseUnits(data.amountUSDC, 6);
            const txHashBytes = ethers.getBytes(data.txHash);

            const tx = await this.questLogger.recordPayment(
                data.questId,
                data.agentId,
                data.apiEndpoint,
                amountWei,
                txHashBytes
            );

            const receipt = await tx.wait();

            const explorerUrl = this.getTxExplorerUrl(receipt.hash);

            console.log(`[QuestLogger] Payment recorded on-chain: ${receipt.hash}`);

            return {
                txHash: receipt.hash,
                explorerUrl
            };
        } catch (error: any) {
            console.error('[QuestLogger] Failed to record payment:', error.message);
            return null;
        }
    }

    /**
     * Complete quest with IPFS hash
     */
    async completeQuest(questId: string, ipfsHash: string): Promise<{ txHash: string; explorerUrl: string } | null> {
        if (!this.questLogger) {
            console.warn('[QuestLogger] Skipping quest completion (not configured)');
            return null;
        }

        try {
            console.log(`[QuestLogger] Completing quest on-chain: ${questId}`);
            console.log(`  IPFS: ${ipfsHash}`);

            const tx = await this.questLogger.completeQuest(questId, ipfsHash);
            const receipt = await tx.wait();

            const explorerUrl = this.getTxExplorerUrl(receipt.hash);

            console.log(`[QuestLogger] Quest completed on-chain: ${receipt.hash}`);

            return {
                txHash: receipt.hash,
                explorerUrl
            };
        } catch (error: any) {
            console.error('[QuestLogger] Failed to complete quest:', error.message);
            return null;
        }
    }

    /**
     * Get transaction explorer URL
     */
    private getTxExplorerUrl(txHash: string): string {
        const network = process.env.POLYGON_AMOY_RPC_URL ? 'polygon-amoy' : 'base-sepolia';

        if (network === 'polygon-amoy') {
            return `https://amoy.polygonscan.com/tx/${txHash}`;
        } else {
            return `https://sepolia.basescan.org/tx/${txHash}`;
        }
    }

    /**
     * Check if on-chain logging is enabled
     */
    isEnabled(): boolean {
        return this.questLogger !== null;
    }
}

// Singleton instance
let questLoggerInstance: OnChainQuestLogger | null = null;

export function getQuestLogger(): OnChainQuestLogger {
    if (!questLoggerInstance) {
        questLoggerInstance = new OnChainQuestLogger();
    }
    return questLoggerInstance;
}
