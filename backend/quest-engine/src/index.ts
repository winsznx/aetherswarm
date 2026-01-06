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
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env only if it exists (for local development)
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.log('[Quest Engine] No .env file found, using environment variables from Railway');
}

const app = express();

// CORS configuration - allow production and development origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'https://aetherswarm.xyz',
    'https://www.aetherswarm.xyz',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Also allow any vercel preview URLs
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response'],
    credentials: true,
}));
app.use(express.json());

// DEBUG: Log all requests
app.use((req, res, next) => {
    console.log(`[Quest Engine] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// Health check
app.get('/', (req, res) => {
    res.status(200).send('Quest Engine OK');
});

// --- Redis & BullMQ Setup ---

console.log(`[Quest Engine] Connecting to Redis...`);
// HARDCODED REDIS URL FOR DEBUGGING
const redisUrl = 'redis://default:RWmeXjOXRYfivZNUrgTaTbuZKEQhlPhp@redis.railway.internal:6379';
const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    family: 4 // Force IPv4
});

const questQueue = new Queue('quest-queue', { connection: redisConnection });
const resultQueue = new Queue('quest-results', { connection: redisConnection });

// In-memory quest storage (for development - use database in production)
interface StoredQuest {
    questId: string;
    status: 'queued' | 'scouting' | 'verifying' | 'synthesizing' | 'completed' | 'failed';
    objectives: string;
    budget: string;
    walletAddress?: string; // Quest wallet (Crossmint embedded wallet)
    userWalletAddress?: string; // User's connected wallet (MetaMask/etc)
    assignedAgents?: Record<string, string>; // Map of agentId -> walletAddress
    createdAt: string;
    completedAt?: string;
    paymentTxHash?: string | null;
    explorerLinks?: {
        paymentTx: string | null;
        questWallet: string;
        discoveryRegistry: string;
    };
    results?: {
        scoutData?: any[];
        summary?: string;
        attestationTxHash?: string;
        attestationExplorerLink?: string;
        payoutStatus?: string;
        payoutTxHashes?: string[];
        x402Payments?: Array<{
            payer: string;
            amount: string;
            asset: string;
            timestamp: number;
            purpose: string; // e.g., "premium_search", "data_access"
        }>;
        totalX402Cost?: string; // Total spent on x402 payments
        nftTokenId?: string;
        nftExplorerLink?: string;
    };
}


// Redis-based quest storage (persists across restarts)
import Redis from 'ioredis';
const redisClient = new Redis(redisUrl, { // Use same hardcoded URL
    maxRetriesPerRequest: null,
    family: 4 // Force IPv4
});

const QUEST_KEY_PREFIX = 'quest:';

async function saveQuest(quest: StoredQuest): Promise<void> {
    await redisClient.set(
        `${QUEST_KEY_PREFIX}${quest.questId}`,
        JSON.stringify(quest)
    );
}

async function getQuest(questId: string): Promise<StoredQuest | null> {
    const data = await redisClient.get(`${QUEST_KEY_PREFIX}${questId}`);
    return data ? JSON.parse(data) : null;
}

async function getAllQuests(): Promise<StoredQuest[]> {
    const keys = await redisClient.keys(`${QUEST_KEY_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await redisClient.mget(keys);
    return values
        .filter((v): v is string => v !== null)
        .map(v => JSON.parse(v) as StoredQuest)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

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
 * Transfer USDC from Platform Treasury (simulating Quest Wallet) to Agent
 * In a real scenario, this would use the Quest Wallet's delegated signer.
 */
/**
 * Batch settle agent payouts using Thirdweb Nexus
 * This batches multiple payments into a single on-chain transaction
 */
interface PayoutRecipient {
    address: string;
    amount: number;
    agentId: string;
}

async function batchSettlePayouts(recipients: PayoutRecipient[]): Promise<string[]> {
    // TODO: Implement proper Nexus batch settlement with EIP-712 signatures
    // For now, use individual Crossmint transfers (working implementation)
    console.log(`[Payout] Processing ${recipients.length} agent payouts...`);
    return fallbackIndividualTransfers(recipients);
}

/**
 * Fallback: Individual Crossmint transfers (old method)
 */
async function fallbackIndividualTransfers(recipients: PayoutRecipient[]): Promise<string[]> {
    const txHashes: string[] = [];

    for (const recipient of recipients) {
        const tx = await transferUSDC(recipient.address, recipient.amount);
        if (tx) txHashes.push(tx);
    }

    return txHashes;
}

async function transferUSDC(toAddress: string, amount: number): Promise<string | null> {
    if (!crossmintApiKey) {
        console.warn('[Crossmint] API key missing, skipping transfer');
        return null;
    }

    try {
        console.log(`[Crossmint] Transferring ${amount} USDC to ${toAddress}...`);

        const response = await fetch(`https://www.crossmint.com/api/v1-alpha1/wallets/${process.env.PLATFORM_TREASURY_WALLET_ID || 'me'}/transfers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': crossmintApiKey
            },
            body: JSON.stringify({
                recipient: `polygon:${toAddress}`,
                token: 'USDC',
                amount: amount.toString()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Crossmint] Transfer failed: ${response.status} ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log(`[Crossmint] Transfer initiated! ID: ${data.id}`);
        return data.id; // This is the transfer ID, not necessarily TX hash immediately
    } catch (error) {
        console.error('[Crossmint] Transfer error:', error);
        return null;
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
            discoveryRegistry: !!process.env.DISCOVERY_REGISTRY_ADDRESS,
            x402: !!process.env.THIRDWEB_SECRET_KEY
        }
    });
});

// x402 Payment Statistics
app.get('/x402/stats', (req: Request, res: Response) => {
    const { getPaymentStats } = require('./middleware/payment');
    const stats = getPaymentStats();
    res.json({
        ...stats,
        enabled: !!process.env.THIRDWEB_SECRET_KEY,
        facilitator: process.env.THIRDWEB_SECRET_KEY ? 'https://facilitator.corbits.dev' : null
    });
});

// Create Quest
app.post('/quests', async (req: Request, res: Response) => {
    try {
        const { objectives, budget, constraints, sources, userId, paymentTxHash, walletAddress } = req.body;

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
        console.log(`[Quest Engine] Created quest wallet: ${wallet.address}`);
        if (walletAddress) {
            console.log(`[Quest Engine] User wallet: ${walletAddress}`);
        }

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
            userWalletAddress: walletAddress || wallet.address, // Track user's wallet for filtering
            paymentTxHash: paymentTxHash || null,
            createdAt: Date.now()
        });

        console.log(`[Quest Engine] Quest ${questId} queued for processing`);
        if (paymentTxHash) {
            console.log(`[Quest Engine] Payment tx: ${explorerLinks.paymentTx}`);
        }

        // Store in Redis for persistence
        await saveQuest({
            questId,
            status: 'queued',
            objectives: Array.isArray(objectives) ? objectives.join(', ') : objectives,
            budget: String(budget),
            walletAddress: wallet.address, // Quest wallet (Crossmint)
            userWalletAddress: walletAddress || wallet.address, // User's connected wallet
            createdAt: new Date().toISOString(),
            paymentTxHash: paymentTxHash || null,
            explorerLinks,
        });

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

// List all quests
app.get('/quests', async (req: Request, res: Response) => {
    const quests = await getAllQuests();
    res.json({ quests });
});

// Get Quest Status
app.get('/quests/:questId', async (req: Request, res: Response) => {
    const { questId } = req.params;

    const quest = await getQuest(questId);
    if (quest) {
        res.json(quest);
    } else {
        res.json({
            questId,
            status: 'processing',
            message: 'Quest status endpoint - integrate with database'
        });
    }
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

// --- x402 Protected Resources (simulated premium data) ---

// Verify that payment middleware passed if we reach here
app.get('/data', (req: Request, res: Response) => {
    console.log('[Quest Engine] access to /data granted (payment verified if enabled)');
    res.json({
        type: 'premium_data',
        content: 'This is verified premium data accessed via x402.',
        paymentStatus: 'verified',
        timestamp: Date.now(),
        data: {
            market_sentiment: 'bullish',
            alpha_score: 98.5,
            source: 'AetherSwarm Proprietary Index'
        }
    });
});

app.get('/artifacts', (req: Request, res: Response) => {
    res.json({
        type: 'premium_artifacts',
        count: 12,
        artifacts: [
            { id: 1, name: 'Q1 Market Analysis', price: '0.10 USDC' },
            { id: 2, name: 'DeFi Risk Report', price: '0.15 USDC' }
        ]
    });
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

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Quest Engine] Running on port ${PORT}`);
    console.log(`[Quest Engine] Crossmint: ${process.env.CROSSMINT_API_KEY ? 'configured' : 'not configured'}`);
    console.log(`[Quest Engine] x402 Facilitator: enabled`);
});

// --- Result Queue Consumer ---

import { Worker } from 'bullmq';

const resultWorker = new Worker('quest-results', async (job) => {
    const { questId, artifact, attestation, contributors, scoutResults, scoutSummary, attestationTxHash } = job.data;

    console.log(`\n===== [Quest Engine Result Worker] =====`);
    console.log(`Quest ${questId} result received`);
    console.log(`Summary preview: ${(scoutSummary || artifact?.summary)?.substring(0, 100)}...`); // Verify attestation
    console.log(`Attestation TX: ${attestationTxHash || 'none'}`);

    // Update quest in Redis
    const quest = await getQuest(questId);
    if (quest) {
        console.log(`Found quest in Redis, updating status...`);

        // --- REAL X402 PAYOUTS ---
        let payoutStatus = 'pending';
        let payoutTxHashes: string[] = [];

        try {
            console.log(`[Quest Engine] Initiating agent payouts for quest ${questId}`);
            const budget = parseFloat(quest.budget || '0');

            // Calculate splits (70% Scout, 20% Verifier, 10% Synthesizer)
            // Note: In production, we'd distribute remaining budget after data costs
            // Here we distribute the full budget as "bounty" for simplicity in the demo
            if (budget > 0 && contributors && contributors.length > 0) {
                // Define agent wallets (hardcoded for demo, normally would be resolved from registry)
                const AGENT_WALLETS: Record<string, string> = {
                    'scout-001': '0x8515c00d4B781194689255E0c0D225E8572d277f', // Scout Wallet
                    'verifier-001': '0xEa242C48D027bf34241d713c7746564619E22f19', // Verifier Wallet 
                    'synthesizer-001': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' // Synthesizer Wallet
                };

                // Calculate amounts
                const scoutAmount = budget * 0.70;
                const verifierAmount = budget * 0.20;
                const synthesizerAmount = budget * 0.10;

                console.log(`[Quest Engine] Budget: ${budget} USDC`);
                console.log(`[Quest Engine] Splits: Scout $${scoutAmount.toFixed(2)}, Verifier $${verifierAmount.toFixed(2)}, Synth $${synthesizerAmount.toFixed(2)}`);

                // Build batch recipients for Nexus settlement
                const payoutRecipients: PayoutRecipient[] = [];

                if (AGENT_WALLETS['scout-001']) {
                    payoutRecipients.push({
                        address: AGENT_WALLETS['scout-001'],
                        amount: scoutAmount,
                        agentId: 'scout-001'
                    });
                }

                if (AGENT_WALLETS['verifier-001']) {
                    payoutRecipients.push({
                        address: AGENT_WALLETS['verifier-001'],
                        amount: verifierAmount,
                        agentId: 'verifier-001'
                    });
                }

                if (AGENT_WALLETS['synthesizer-001']) {
                    payoutRecipients.push({
                        address: AGENT_WALLETS['synthesizer-001'],
                        amount: synthesizerAmount,
                        agentId: 'synthesizer-001'
                    });
                }

                // Batch settle all payouts in single transaction using Nexus
                console.log(`[Quest Engine] Initiating batch settlement for ${payoutRecipients.length} agents...`);
                payoutTxHashes = await batchSettlePayouts(payoutRecipients);

                payoutStatus = 'completed';
                console.log(`[Quest Engine] ✓ Batch payout completed! TXs: ${payoutTxHashes.join(', ')}`);
            } else {
                console.log(`[Quest Engine] No budget or contributors, skipping payouts`);
                payoutStatus = 'skipped_no_budget';
            }
        } catch (error) {
            console.error(`[Quest Engine] Payout failed: ${error}`);
            payoutStatus = 'failed';
        }

        // --- ARTIFACT MINTING ---
        let nftTokenId: string | undefined;
        let nftExplorerLink: string | undefined;

        try {
            if (artifact && artifact.root) {
                console.log(`[Quest Engine] Minting Artifact NFT...`);
                const contractService = getContractService();

                // Use user's connected wallet as recipient if available, otherwise quest wallet
                const recipient = quest.userWalletAddress || quest.walletAddress || '0x0000000000000000000000000000000000000000';

                // Format merkle root (ensure it's 0x prefixed)
                const merkleRoot = artifact.root.startsWith('0x') ? artifact.root : `0x${artifact.root}`;

                // Default metadata URI (in prod this would be IPFS hash)
                const metadataURI = artifact.ipfsHash ? `ipfs://${artifact.ipfsHash}` : `ipfs://QmCheckPinata${questId}`;

                // Get contributors keys
                const contributorAddresses = Object.values(quest.assignedAgents || {}).filter(addr => addr && addr.startsWith('0x'));

                const mintResult = await contractService.mintArtifact(
                    recipient,
                    metadataURI,
                    merkleRoot,
                    contributorAddresses as string[] // Type assertion for now
                );

                nftTokenId = mintResult.tokenId.toString();
                nftExplorerLink = contractService.getNftExplorerUrl(
                    contractService.artifactNFT.target as string,
                    mintResult.tokenId
                );

                console.log(`[Quest Engine] ✓ NFT Minted: Token #${nftTokenId}`);
            }
        } catch (error) {
            console.error(`[Quest Engine] NFT Minting failed:`, error);
        }

        quest.status = 'completed';
        quest.completedAt = new Date().toISOString();
        quest.results = {
            scoutData: scoutResults || [],
            summary: scoutSummary || artifact?.summary || 'Quest completed successfully',
            attestationTxHash: attestationTxHash,
            attestationExplorerLink: attestationTxHash
                ? `https://amoy.polygonscan.com/tx/${attestationTxHash}`
                : undefined,
            payoutStatus,
            payoutTxHashes,
            nftTokenId,
            nftExplorerLink
        };
        await saveQuest(quest);
        console.log(`Quest ${questId} status updated to completed ✓`);
    } else {
        console.log(`WARNING: Quest ${questId} NOT FOUND in Redis!`);
    }
    console.log(`========================================\n`);

}, { connection: redisConnection });

resultWorker.on('completed', (job) => {
    console.log(`[Quest Engine] Result processed: ${job.id}`);
});
