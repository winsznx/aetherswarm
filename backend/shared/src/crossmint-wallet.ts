import axios from 'axios';
import { ethers } from 'ethers';

export interface EmbeddedWallet {
    walletAddress: string;
    questId: string;
    chain: 'polygon' | 'base';
    createdAt: Date;
}

export class CrossmintWalletManager {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.CROSSMINT_API_KEY || '';
        this.baseUrl = 'https://www.crossmint.com/api/v1-alpha1';

        if (!this.apiKey) {
            throw new Error('CROSSMINT_API_KEY not configured');
        }
    }

    /**
     * Create an embedded wallet for a quest
     */
    async createQuestWallet(
        questId: string,
        chain: 'polygon' | 'base' = 'polygon'
    ): Promise<EmbeddedWallet> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/wallets`,
                {
                    type: 'evm-smart-wallet',
                    config: {
                        chain: chain === 'polygon' ? 'polygon-amoy' : 'base-sepolia',
                    },
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const wallet: EmbeddedWallet = {
                walletAddress: response.data.address,
                questId,
                chain,
                createdAt: new Date(),
            };

            console.log(`✅ Created quest wallet for ${questId}: ${wallet.walletAddress}`);

            return wallet;
        } catch (error: any) {
            console.error('❌ Failed to create Crossmint wallet:', error.response?.data || error.message);
            throw new Error(`Crossmint wallet creation failed: ${error.message}`);
        }
    }

    /**
     * Fund a quest wallet with USDC
     */
    async fundQuestWallet(
        walletAddress: string,
        amountUSDC: string,
        chain: 'polygon' | 'base' = 'polygon'
    ): Promise<string> {
        try {
            // Use Crossmint's funding API or direct transfer
            const response = await axios.post(
                `${this.baseUrl}/wallets/${walletAddress}/fund`,
                {
                    currency: 'USDC',
                    amount: amountUSDC,
                    chain: chain === 'polygon' ? 'polygon-amoy' : 'base-sepolia',
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const txHash = response.data.transactionHash;
            console.log(`✅ Funded wallet ${walletAddress} with ${amountUSDC} USDC`);
            console.log(`   TX: ${txHash}`);

            return txHash;
        } catch (error: any) {
            console.error('❌ Failed to fund wallet:', error.response?.data || error.message);
            throw new Error(`Wallet funding failed: ${error.message}`);
        }
    }

    /**
     * Get wallet balance
     */
    async getWalletBalance(
        walletAddress: string,
        chain: 'polygon' | 'base' = 'polygon'
    ): Promise<string> {
        try {
            const rpcUrl =
                chain === 'polygon'
                    ? process.env.POLYGON_AMOY_RPC_URL
                    : process.env.BASE_SEPOLIA_RPC_URL;

            if (!rpcUrl) throw new Error('RPC URL not configured');

            const provider = new ethers.JsonRpcProvider(rpcUrl);

            // USDC contract address (testnet)
            const usdcAddress =
                chain === 'polygon'
                    ? '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582' // Polygon Amoy USDC
                    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

            const usdcContract = new ethers.Contract(
                usdcAddress,
                ['function balanceOf(address) view returns (uint256)'],
                provider
            );

            const balance = await usdcContract.balanceOf(walletAddress);
            const balanceFormatted = ethers.formatUnits(balance, 6); // USDC has 6 decimals

            return balanceFormatted;
        } catch (error: any) {
            console.error('❌ Failed to get balance:', error.message);
            return '0';
        }
    }

    /**
     * Execute a transaction from a quest wallet
     */
    async executeTransaction(
        walletAddress: string,
        to: string,
        data: string,
        value: string = '0',
        chain: 'polygon' | 'base' = 'polygon'
    ): Promise<string> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/wallets/${walletAddress}/transactions`,
                {
                    to,
                    data,
                    value,
                    chain: chain === 'polygon' ? 'polygon-amoy' : 'base-sepolia',
                },
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const txHash = response.data.transactionHash;
            console.log(`✅ Executed transaction from ${walletAddress}`);
            console.log(`   TX: ${txHash}`);

            return txHash;
        } catch (error: any) {
            console.error('❌ Transaction failed:', error.response?.data || error.message);
            throw new Error(`Transaction execution failed: ${error.message}`);
        }
    }

    /**
     * Transfer USDC from quest wallet to agent payment
     */
    async payAgentFromQuestWallet(
        questWallet: string,
        agentWallet: string,
        amountUSDC: string,
        chain: 'polygon' | 'base' = 'polygon'
    ): Promise<string> {
        const usdcAddress =
            chain === 'polygon'
                ? '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'
                : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

        // Encode transfer function call
        const iface = new ethers.Interface([
            'function transfer(address to, uint256 amount) returns (bool)',
        ]);

        const amount = ethers.parseUnits(amountUSDC, 6); // USDC decimals
        const data = iface.encodeFunctionData('transfer', [agentWallet, amount]);

        return await this.executeTransaction(questWallet, usdcAddress, data, '0', chain);
    }
}

/**
 * Initialize Crossmint wallet manager
 */
export async function initializeWalletManager(): Promise<CrossmintWalletManager> {
    return new CrossmintWalletManager();
}
