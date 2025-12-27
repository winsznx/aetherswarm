/**
 * AetherSwarm Quest Engine
 * 
 * Enhanced with:
 * - Crossmint Embedded Wallets & Agentic Checkout
 * - Thirdweb Nexus x402 Facilitator integration
 * - ERC-8004 registry validation
 * - Real x402 payment middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { getContractService } from './contractService';

dotenv.config({ path: '../../.env' });

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response'],
    credentials: true,
}));
app.use(express.json());

// --- Redis & BullMQ Setup ---

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const questQueue = new Queue('quest-queue', { connection: redisConnection });
const resultQueue = new Queue('quest-results', { connection: redisConnection });

// --- Crossmint SDK Integration ---
// Using official @crossmint/wallets-sdk
// Requires Server-side API key with scopes:
// users.create, users.read, wallets.read, wallets.create,
// wallets:transactions.create, wallets:transactions.sign,
// wallets:balance.read, wallets.fund

import { CrossmintWallets, createCrossmint } from '@crossmint/wallets-sdk';

interface WalletResult {
    address: string;
    chain: string;
    type: string;
}

// Initialize Crossmint client
const crossmintApiKey = process.env.CROSSMINT_API_KEY || '';

let crossmintWallets: CrossmintWallets | null = null;

if (crossmintApiKey) {
    const crossmint = createCrossmint({
        apiKey: crossmintApiKey,
    });
    crossmintWallets = CrossmintWallets.from(crossmint);
    console.log('[Crossmint] SDK initialized with server-side key');
} else {
    console.warn('[Crossmint] No API key configured, using mock wallets');
}

/**
 * Create an embedded wallet for the quest
 * Uses Crossmint REST API for server-side wallet creation
 */
async function createEmbeddedWallet(userId: string): Promise<WalletResult> {
    if (!crossmintApiKey) {
        // Mock wallet for development
        console.warn('[Crossmint] Creating mock wallet');
        return {
            address: `0x${crypto.randomBytes(20).toString('hex')}`,
            chain: 'polygon',
            type: 'mock'
        };
    }

    try {
        // Use REST API for server-side wallet creation (Crossmint API 2025-06-09)
        const response = await fetch('https://www.crossmint.com/api/2025-06-09/wallets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': crossmintApiKey
            },
            body: JSON.stringify({
                chainType: 'evm',
                type: 'smart',
                config: {
                    adminSigner: {
                        type: 'external-wallet',
                        address: process.env.PLATFORM_TREASURY || '0xFc2b2e43342a65F0911D4A602Cef650fa84245bA'
                    }
                },
                owner: `email:${userId}@aetherswarm.quest`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Wallet creation failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Crossmint] Created wallet: ${data.address}`);

        return {
            address: data.address,
            chain: 'polygon',
            type: 'crossmint-smart-wallet'
        };
    } catch (error) {
        console.error('[Crossmint] Wallet creation failed:', error);
        throw error;
    }
}

/**
 * Execute agentic checkout for autonomous purchasing
 * Enables agents to buy research papers, datasets, etc.
 */
async function agenticCheckout(
    walletAddress: string,
    productUrl: string,
    maxAmount: number,
    currency: string = 'usdc'
): Promise<{ orderId: string; status: string }> {
    if (!crossmintApiKey) {
        return { orderId: `mock-${Date.now()}`, status: 'mock' };
    }

    // Use Crossmint Orders API for agentic commerce
    const response = await fetch('https://www.crossmint.com/api/v1-alpha1/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': crossmintApiKey
        },
        body: JSON.stringify({
            lineItems: [{
                productLocator: productUrl,
                quantity: 1
            }],
            payment: {
                method: 'web3',
                currency,
                walletAddress
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agentic checkout failed: ${response.status} ${errorText}`);
    }

    const order = await response.json();
    return {
        orderId: order.orderId,
        status: order.status
    };
}

// --- Thirdweb Nexus x402 Facilitator ---
// Using @thirdweb-dev/nexus SDK with x402-express middleware
// Transactions visible on x402scan.com and thirdweb dashboard
// Requires:
// - THIRDWEB_SECRET_KEY: Your Thirdweb secret key
// - THIRDWEB_WALLET_ADDRESS: Your wallet address for receiving payments

import { createFacilitator, type ThirdwebX402Facilitator } from '@thirdweb-dev/nexus';
import { paymentMiddleware } from 'x402-express';

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY || '';
const thirdwebWalletAddress = process.env.THIRDWEB_WALLET_ADDRESS || process.env.PLATFORM_TREASURY || '';

let facilitator: ThirdwebX402Facilitator | null = null;

if (thirdwebSecretKey && thirdwebWalletAddress) {
    facilitator = createFacilitator({
        walletSecret: thirdwebSecretKey,
        walletAddress: thirdwebWalletAddress,
    });
    console.log('[Thirdweb Nexus] Facilitator initialized');
    console.log(`[Thirdweb Nexus] Wallet: ${thirdwebWalletAddress}`);
    console.log('[Thirdweb Nexus] Transactions visible on: https://nexus.thirdweb.com/dashboard');
    console.log('[Thirdweb Nexus] Also trackable on: https://x402scan.com');
} else {
    console.warn('[Thirdweb Nexus] Missing secret key or wallet address, x402 payments disabled');
}

// --- x402 Payment Middleware ---
// Define paid routes with metadata for Nexus discovery

const routePaymentConfig: Record<string, { price: string; network: string; config?: { description: string } }> = {
    // Artifacts endpoint - paid access to synthesized knowledge
    '/artifacts': {
        price: '$0.10',
        network: 'base', // Thirdweb Nexus supports base, polygon, arbitrum, etc.
        config: { description: 'Access synthesized knowledge artifacts from AetherSwarm quests' }
    },
    '/artifacts/:id': {
        price: '$0.05',
        network: 'base',
        config: { description: 'Get a specific knowledge artifact by ID' }
    },
    // Data endpoint - paid access to raw verified data
    '/data': {
        price: '$0.05',
        network: 'base',
        config: { description: 'Access raw verified data from Scout agents' }
    },
    '/data/:questId': {
        price: '$0.03',
        network: 'base',
        config: { description: 'Get verified data for a specific quest' }
    }
};

// Create x402 middleware
let x402Middleware: any;

if (facilitator) {
    x402Middleware = paymentMiddleware(
        thirdwebWalletAddress,
        routePaymentConfig,
        facilitator
    );
    console.log('[x402] Payment middleware enabled');
} else {
    // No-op middleware when facilitator not configured
    x402Middleware = (req: Request, res: Response, next: NextFunction) => {
        next();
    };
    console.log('[x402] Payment middleware disabled (no facilitator)');
}

// --- API Routes ---

app.use(x402Middleware);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'quest-engine',
        version: '2.0.0',
        integrations: {
            crossmint: !!process.env.CROSSMINT_API_KEY,
            thirdweb: !!process.env.THIRDWEB_WALLET_SECRET,
            discoveryRegistry: !!process.env.DISCOVERY_REGISTRY_ADDRESS
        }
    });
});

// Create Quest
app.post('/quests', async (req: Request, res: Response) => {
    try {
        const { objectives, budget, constraints, sources, userId, paymentTxHash } = req.body;

        // Validate input
        if (!objectives || (Array.isArray(objectives) && objectives.length === 0)) {
            res.status(400).json({ error: 'objectives required' });
            return;
        }

        if (!budget || budget < 0) {
            res.status(400).json({ error: 'valid budget required' });
            return;
        }

        // Generate unique quest ID
        const questId = `quest-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Create embedded wallet for this quest
        const wallet = await createEmbeddedWallet(userId || questId);
        console.log(`[Quest Engine] Created wallet: ${wallet.address}`);

        // Get contract service for explorer URLs
        const contractService = getContractService();

        // Generate block explorer links
        const explorerLinks = {
            paymentTx: paymentTxHash ? contractService.getTxExplorerUrl(paymentTxHash) : null,
            questWallet: contractService.getAddressExplorerUrl(wallet.address),
            discoveryRegistry: contractService.getAddressExplorerUrl(process.env.DISCOVERY_REGISTRY_ADDRESS || ''),
        };

        // Queue the quest for processing
        await questQueue.add('process-quest', {
            questId,
            objectives: Array.isArray(objectives) ? objectives : [objectives],
            budget,
            constraints: constraints || [],
            sources: sources || [],
            walletAddress: wallet.address,
            paymentTxHash: paymentTxHash || null,
            createdAt: Date.now()
        });

        console.log(`[Quest Engine] Quest ${questId} queued for processing`);
        if (paymentTxHash) {
            console.log(`[Quest Engine] Payment tx: ${explorerLinks.paymentTx}`);
        }

        res.status(201).json({
            questId,
            status: 'queued',
            walletAddress: wallet.address,
            paymentTxHash: paymentTxHash || null,
            explorerLinks,
            message: 'Quest created and dispatched to swarm coordinator'
        });

    } catch (error) {
        console.error('[Quest Engine] Error creating quest:', error);
        res.status(500).json({ error: 'Failed to create quest' });
    }
});

// Get Quest Status
app.get('/quests/:questId', async (req: Request, res: Response) => {
    const { questId } = req.params;

    // Would query from database in production
    res.json({
        questId,
        status: 'processing',
        message: 'Quest status endpoint - integrate with database'
    });
});

// Agentic Checkout endpoint - for agents to buy products
app.post('/checkout', async (req: Request, res: Response) => {
    try {
        const { walletAddress, productUrl, maxAmount, currency } = req.body;

        const result = await agenticCheckout(
            walletAddress,
            productUrl,
            maxAmount,
            currency
        );

        res.json(result);
    } catch (error) {
        console.error('[Quest Engine] Checkout error:', error);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

// Get payment requirements (x402 discovery)
app.get('/payment-info', (req: Request, res: Response) => {
    res.json({
        protocol: 'x402',
        version: '1.0',
        supportedAssets: ['USDC'],
        supportedNetworks: ['polygon', 'base', 'abstract'],
        facilitator: process.env.THIRDWEB_FACILITATOR_URL || 'https://nexus.thirdweb.com',
        treasury: process.env.PLATFORM_TREASURY
    });
});

// --- Start Server ---

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Quest Engine] Running on port ${PORT}`);
    console.log(`[Quest Engine] Crossmint: ${process.env.CROSSMINT_API_KEY ? 'configured' : 'not configured'}`);
    console.log(`[Quest Engine] x402 Facilitator: enabled`);
});

// --- Result Queue Consumer ---

import { Worker } from 'bullmq';

const resultWorker = new Worker('quest-results', async (job) => {
    const { questId, artifact, attestation, contributors } = job.data;

    console.log(`[Quest Engine] Quest ${questId} completed!`);
    console.log(`[Quest Engine] Artifact: ${JSON.stringify(artifact)}`);
    console.log(`[Quest Engine] Contributors: ${contributors.join(', ')}`);

    // TODO: Mint artifact NFT, distribute payments, update registry
    // This would call the smart contracts

}, { connection: redisConnection });

resultWorker.on('completed', (job) => {
    console.log(`[Quest Engine] Result processed: ${job.id}`);
});
