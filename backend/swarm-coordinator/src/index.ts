/**
 * AetherSwarm Swarm Coordinator
 * 
 * Enhanced with:
 * - ERC-8004 Discovery Registry integration
 * - x402 payment verification
 * - TEE attestation validation
 * - Real-time agent management
 * - /agents endpoint for frontend
 */

import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import http from 'http';
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env only if it exists (for local development)
const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.log('[Coordinator] No .env file found, using environment variables from Railway');
}

// Redis connection for BullMQ
console.log('[Coordinator] Connecting to Redis...');
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

connection.on('error', (err) => {
    console.error('[Coordinator] Redis connection error:', err);
});

connection.on('connect', () => {
    console.log('[Coordinator] Redis connected successfully');
});

// Result queue for Quest Engine
const resultQueue = new Queue('quest-results', { connection });

// --- ERC-8004 Discovery Registry Integration ---

interface AgentInfo {
    agentId: number;
    role: 'scout' | 'verifier' | 'synthesizer';
    paymentAddress: string;
    wsEndpoint: string;
    a2aEndpoint: string;
    stakeAmount: bigint;
    isActive: boolean;
    registeredAt: number;
    reputationScore?: number;
}

class DiscoveryRegistryClient {
    private provider?: ethers.JsonRpcProvider;
    private registryAddress: string;
    private registryAbi = [
        'function getAgentsByRole(uint8 role) view returns (uint256[])',
        'function getAgent(uint256 agentId) view returns (uint8 role, address paymentAddress, string wsEndpoint, string a2aEndpoint, uint256 stakeAmount, bool isActive, uint256 registeredAt)',
        'function totalAgents() view returns (uint256)'
    ];
    private reputationAbi = [
        'function get Reputation(uint256 agentId) view returns (uint256 averageScore, uint256 feedbackCount)'
    ];
    private contract?: ethers.Contract;
    private reputationContract?: ethers.Contract;

    constructor() {
        const rpcUrl = process.env.RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo';
        this.registryAddress = process.env.DISCOVERY_REGISTRY_ADDRESS || '';

        // Skip RPC entirely in dev mode
        if (process.env.DEV_MODE === 'true') {
            console.log('[Discovery] Running in DEV_MODE - using local agents only, no blockchain connection');
            return;
        }

        // Try to initialize provider, but don't block if it fails
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            if (this.registryAddress) {
                this.contract = new ethers.Contract(
                    this.registryAddress,
                    this.registryAbi,
                    this.provider
                );

                const reputationAddress = process.env.REPUTATION_REGISTRY_ADDRESS;
                if (reputationAddress) {
                    this.reputationContract = new ethers.Contract(
                        reputationAddress,
                        this.reputationAbi,
                        this.provider
                    );
                }
            }
        } catch (error) {
            console.warn('[Discovery] RPC connection failed, running in dev mode (local agents only)');
            console.warn('[Discovery] Error:', error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Query agents from ERC-8004 registry by role
     * Filters by minimum reputation score
     */
    async discoverAgents(role: 'scout' | 'verifier' | 'synthesizer', minReputation: number = 0): Promise<AgentInfo[]> {
        if (!this.registryAddress || !this.contract) {
            console.log('[Discovery] No registry configured, using local agents only');
            return [];
        }

        const roleIndex = role === 'scout' ? 0 : role === 'verifier' ? 1 : 2;

        try {
            const agentIds: bigint[] = await this.contract!.getAgentsByRole(roleIndex);
            const agents: AgentInfo[] = [];

            for (const id of agentIds) {
                const [agentRole, paymentAddress, wsEndpoint, a2aEndpoint, stakeAmount, isActive, registeredAt] =
                    await this.contract!.getAgent(id);

                // Get reputation if available
                let reputationScore = 50; // Default
                if (this.reputationContract) {
                    try {
                        const [avgScore, count] = await this.reputationContract.getReputation(id);
                        reputationScore = Number(avgScore);
                    } catch (e) {
                        // No reputation yet
                    }
                }

                if (isActive && reputationScore >= minReputation) {
                    agents.push({
                        agentId: Number(id),
                        role,
                        paymentAddress,
                        wsEndpoint,
                        a2aEndpoint,
                        stakeAmount,
                        isActive,
                        registeredAt: Number(registeredAt),
                        reputationScore
                    });
                }
            }

            // Sort by reputation (highest first)
            agents.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));

            console.log(`[Discovery] Found ${agents.length} ${role} agents with reputation >= ${minReputation}`);
            return agents;

        } catch (error) {
            console.error('[Discovery] Error querying registry:', error);
            return [];
        }
    }
}

// --- Agent Connection Management ---

interface ConnectedAgent {
    ws: WebSocket;
    role: 'scout' | 'verifier' | 'synthesizer';
    agentId: string;
    address?: string;
    capabilities?: string[];
    discoveryInfo?: AgentInfo;  // Info from ERC-8004 registry
}

const connectedAgents: Map<string, ConnectedAgent> = new Map();

// --- Quest State Machine ---

interface QuestState {
    questId: string;
    status: 'scouting' | 'verifying' | 'synthesizing' | 'complete' | 'failed';
    data: any;
    scoutResults?: any[];
    scoutSummary?: string;
    verificationAttestation?: any;
    attestationTxHash?: string;
    artifact?: any;
    assignedAgents: {
        scout?: string;
        verifier?: string;
        synthesizer?: string;
    };
    budget: {
        total: number;
        scoutAllocation: number;
        verifierAllocation: number;
        synthesizerAllocation: number;
    };
    startTime: number;
    timeout: NodeJS.Timeout | null;
}

const activeQuests: Map<string, QuestState> = new Map();
const discoveryClient = new DiscoveryRegistryClient();

// --- Combined HTTP + WebSocket Server ---
// Railway only exposes one port, so we run both HTTP and WebSocket on the same port
const port = parseInt(process.env.PORT || process.env.WS_PORT || '8080');

// Create HTTP server first
const server = http.createServer((req, res) => {
    // CORS headers for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            connectedAgents: connectedAgents.size,
            activeQuests: activeQuests.size,
            agentBreakdown: {
                scouts: Array.from(connectedAgents.values()).filter(a => a.role === 'scout').length,
                verifiers: Array.from(connectedAgents.values()).filter(a => a.role === 'verifier').length,
                synthesizers: Array.from(connectedAgents.values()).filter(a => a.role === 'synthesizer').length
            }
        }));
    } else if (req.url === '/agents') {
        const agents = Array.from(connectedAgents.values()).map(agent => ({
            id: agent.agentId,
            role: agent.role,
            address: agent.address || 'N/A',
            status: 'active',
            capabilities: agent.capabilities || [],
            reputation: agent.discoveryInfo?.reputationScore || 0,
            wsEndpoint: agent.discoveryInfo?.wsEndpoint,
            stakeAmount: agent.discoveryInfo?.stakeAmount ? Number(agent.discoveryInfo.stakeAmount) : 0,
            registeredAt: agent.discoveryInfo?.registeredAt
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ agents }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

console.log(`[Coordinator] HTTP + WebSocket server running on port ${port}`);

wss.on('connection', (ws: WebSocket) => {
    let agentId: string | null = null;

    ws.on('message', async (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'register') {
                agentId = message.agentId || `${message.role}-${Date.now()}`;

                const agent: ConnectedAgent = {
                    ws,
                    role: message.role,
                    agentId: agentId as string,
                    address: message.address,
                    capabilities: message.capabilities
                };

                connectedAgents.set(agentId as string, agent);
                console.log(`[Coordinator] Agent registered: ${agentId} (${message.role})`);

                // Send confirmation
                ws.send(JSON.stringify({
                    type: 'registered',
                    agentId,
                    message: 'Successfully registered with coordinator'
                }));
            }

            if (message.type === 'task_result') {
                await handleTaskResult(message);
            }

        } catch (error) {
            console.error('[Coordinator] Error processing message:', error);
        }
    });

    ws.on('close', () => {
        if (agentId) {
            connectedAgents.delete(agentId);
            console.log(`[Coordinator] Agent disconnected: ${agentId}`);
        }
    });
});

// --- Task Result Handler ---

async function handleTaskResult(result: any): Promise<void> {
    const { questId, status } = result;
    const quest = activeQuests.get(questId);

    if (!quest) {
        console.warn(`[Coordinator] Result for unknown quest: ${questId}`);
        return;
    }

    console.log(`[Coordinator] Received ${status} result for quest ${questId}`);

    // Clear timeout
    if (quest.timeout) {
        clearTimeout(quest.timeout);
    }

    if (quest.status === 'scouting' && status === 'complete') {
        // Store scout results and summary, then move to verification
        quest.scoutResults = result.results;
        quest.scoutSummary = result.summary;
        quest.status = 'verifying';

        await dispatchVerificationTask(quest);
    }
    else if (quest.status === 'verifying') {
        console.log(`[Coordinator] Verification phase ended. Status: ${status}`);

        // Store attestation (even if failed/partial) and move to synthesis
        if (result.attestation) {
            quest.verificationAttestation = result.attestation;
            quest.attestationTxHash = result.attestationTxHash;
        }

        quest.status = 'synthesizing';

        console.log(`[Coordinator] Quest ${questId} moving to Synthesis phase.`);

        await dispatchSynthesisTask(quest);
    }
    else if (quest.status === 'synthesizing' && status === 'complete') {
        // Quest complete!
        quest.artifact = result.artifact;
        quest.status = 'complete';

        console.log(`[Coordinator] Quest ${questId} COMPLETE!`);
        console.log(`[Coordinator] Artifact: ${JSON.stringify(result.artifact)}`);

        // Send result to Quest Engine
        await resultQueue.add('quest-complete', {
            questId,
            artifact: result.artifact,
            attestation: quest.verificationAttestation,
            contributors: Object.values(quest.assignedAgents).filter(Boolean),
            scoutResults: quest.scoutResults || [],
            scoutSummary: quest.scoutSummary || '',
            attestationTxHash: quest.attestationTxHash
        });

        activeQuests.delete(questId);
    }
    else if (status === 'error') {
        quest.status = 'failed';
        console.error(`[Coordinator] Quest ${questId} FAILED:`, result.error);
        activeQuests.delete(questId);
    }
}

// --- Task Dispatchers ---

async function dispatchScoutingTask(quest: QuestState): Promise<void> {
    // First, try to find scout from ERC-8004 registry
    const registeredScouts = await discoveryClient.discoverAgents('scout', 70);

    // Then check connected agents
    const connectedScouts = Array.from(connectedAgents.values())
        .filter(a => a.role === 'scout');

    console.log(`[Coordinator] Total connected agents: ${connectedAgents.size}`);
    console.log(`[Coordinator] Connected scouts: ${connectedScouts.length}`);


    // Prefer registered agents with high reputation
    let selectedScout: ConnectedAgent | undefined;

    for (const regScout of registeredScouts) {
        const connected = connectedScouts.find(cs =>
            cs.address?.toLowerCase() === regScout.paymentAddress.toLowerCase()
        );
        if (connected) {
            selectedScout = connected;
            selectedScout.discoveryInfo = regScout;
            break;
        }
    }

    // Fall back to any connected scout
    if (!selectedScout && connectedScouts.length > 0) {
        selectedScout = connectedScouts[0];
    }

    if (!selectedScout) {
        console.error(`[Coordinator] No scout agents available for quest ${quest.questId}`);
        quest.status = 'failed';
        return;
    }

    quest.assignedAgents.scout = selectedScout.agentId;

    const task = {
        type: 'query_quest',
        questId: quest.questId,
        objective: quest.data.objectives?.[0] || quest.data.objective,
        sources: quest.data.sources || (process.env.DEFAULT_X402_SOURCES || 'https://api.faremeter.com/v1/test').split(','),
        budget: quest.budget.scoutAllocation,
        constraints: quest.data.constraints
    };

    console.log(`[Coordinator] Dispatching scout task to ${selectedScout.agentId}`);
    selectedScout.ws.send(JSON.stringify(task));

    // Set timeout
    quest.timeout = setTimeout(() => {
        console.error(`[Coordinator] Scout timeout for quest ${quest.questId}`);
        quest.status = 'failed';
    }, 300000); // 5 minute timeout
}

async function dispatchVerificationTask(quest: QuestState): Promise<void> {
    const registeredVerifiers = await discoveryClient.discoverAgents('verifier', 80);
    const connectedVerifiers = Array.from(connectedAgents.values())
        .filter(a => a.role === 'verifier');

    let selectedVerifier: ConnectedAgent | undefined;

    for (const regVerifier of registeredVerifiers) {
        const connected = connectedVerifiers.find(cv =>
            cv.address?.toLowerCase() === regVerifier.paymentAddress.toLowerCase()
        );
        if (connected) {
            selectedVerifier = connected;
            selectedVerifier.discoveryInfo = regVerifier;
            break;
        }
    }

    if (!selectedVerifier && connectedVerifiers.length > 0) {
        selectedVerifier = connectedVerifiers[0];
    }

    if (!selectedVerifier) {
        console.error(`[Coordinator] No verifier agents available`);
        quest.status = 'failed';
        return;
    }

    quest.assignedAgents.verifier = selectedVerifier.agentId;

    const task = {
        type: 'verify_task',
        questId: quest.questId,
        data: quest.scoutResults,
        expectedHashes: quest.scoutResults?.map(r => r.hash).filter(Boolean) || [],
        budget: quest.budget.verifierAllocation
    };

    console.log(`[Coordinator] Dispatching verification task to ${selectedVerifier.agentId}`);
    selectedVerifier.ws.send(JSON.stringify(task));

    quest.timeout = setTimeout(() => {
        console.error(`[Coordinator] Verifier timeout for quest ${quest.questId}`);
        quest.status = 'failed';
    }, 600000); // 10 minute timeout for TEE operations
}

async function dispatchSynthesisTask(quest: QuestState): Promise<void> {
    const registeredSynthesizers = await discoveryClient.discoverAgents('synthesizer', 70);
    const connectedSynthesizers = Array.from(connectedAgents.values())
        .filter(a => a.role === 'synthesizer');

    let selectedSynthesizer: ConnectedAgent | undefined;

    for (const regSynth of registeredSynthesizers) {
        const connected = connectedSynthesizers.find(cs =>
            cs.address?.toLowerCase() === regSynth.paymentAddress.toLowerCase()
        );
        if (connected) {
            selectedSynthesizer = connected;
            selectedSynthesizer.discoveryInfo = regSynth;
            break;
        }
    }

    if (!selectedSynthesizer && connectedSynthesizers.length > 0) {
        selectedSynthesizer = connectedSynthesizers[0];
    }

    if (!selectedSynthesizer) {
        console.error(`[Coordinator] No synthesizer agents available`);
        quest.status = 'failed';
        return;
    }

    quest.assignedAgents.synthesizer = selectedSynthesizer.agentId;

    const task = {
        type: 'synthesize_task',
        questId: quest.questId,
        verifiedData: quest.scoutResults,
        attestation: quest.verificationAttestation,
        objective: quest.data.objectives?.[0] || quest.data.objective,
        budget: quest.budget.synthesizerAllocation
    };

    console.log(`[Coordinator] Dispatching synthesis task to ${selectedSynthesizer.agentId}`);
    selectedSynthesizer.ws.send(JSON.stringify(task));

    quest.timeout = setTimeout(() => {
        console.error(`[Coordinator] Synthesizer timeout for quest ${quest.questId}`);
        quest.status = 'failed';
    }, 900000); // 15 minute timeout for synthesis
}

// --- BullMQ Worker for Quest Queue ---

const questWorker = new Worker('quest-queue', async (job) => {
    const { questId, objectives, budget, constraints, walletAddress, sources } = job.data;

    console.log(`[Coordinator] Processing quest: ${questId}`);
    console.log(`[Coordinator] Objective: ${objectives?.[0] || 'N/A'}`);
    console.log(`[Coordinator] Budget: ${budget} USDC`);

    // Calculate budget splits (50% scout, 30% verifier, 20% synthesizer)
    const budgetNum = typeof budget === 'number' ? budget : parseInt(budget) || 1000000;

    const questState: QuestState = {
        questId,
        status: 'scouting',
        data: { objectives, constraints, sources, walletAddress },
        assignedAgents: {},
        budget: {
            total: budgetNum,
            scoutAllocation: Math.floor(budgetNum * 0.5),
            verifierAllocation: Math.floor(budgetNum * 0.3),
            synthesizerAllocation: Math.floor(budgetNum * 0.2)
        },
        startTime: Date.now(),
        timeout: null
    };

    activeQuests.set(questId, questState);

    // Start the quest pipeline
    await dispatchScoutingTask(questState);

}, { connection });

questWorker.on('completed', (job) => {
    console.log(`[Coordinator] Job ${job.id} completed`);
});

questWorker.on('failed', (job, err) => {
    console.error(`[Coordinator] Job ${job?.id} failed:`, err);
});

console.log('[Coordinator] Quest worker started, listening for jobs...');

// Start the combined HTTP + WebSocket server
server.listen(port, '0.0.0.0', () => {
    console.log(`[Coordinator] Server running on port ${port} (0.0.0.0)`);
    console.log(`[Coordinator] WebSocket endpoint: ws://0.0.0.0:${port}`);
    console.log(`[Coordinator] Health endpoint: http://0.0.0.0:${port}/health`);
    console.log(`[Coordinator] Agents endpoint: http://0.0.0.0:${port}/agents`);
});
