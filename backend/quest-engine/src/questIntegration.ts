/**
 * Quest Creation Integration
 * Handles on-chain logging and structured data flow
 */

import { getQuestLogger, QuestLogData } from './questLogger';
import type { Request, Response } from 'express';

export interface QuestCreationResult {
    questId: string;
    status: string;
    walletAddress: string;
    onChainProof: {
        questCreation?: {
            txHash: string;
            explorerUrl: string;
        };
    };
    explorerLinks: {
        questCreation?: string;
        questWallet: string;
        paymentTx?: string | null;
    };
}

/**
 * Create quest with on-chain logging
 */
export async function createQuestWithLogging(
    questId: string,
    objectives: string,
    budget: string,
    walletAddress: string
): Promise<QuestCreationResult['onChainProof']> {

    const questLogger = getQuestLogger();

    const onChainProof: QuestCreationResult['onChainProof'] = {};

    if (questLogger.isEnabled()) {
        const proof = await questLogger.createQuest({
            questId,
            objectives,
            budgetUSDC: budget
        });

        if (proof) {
            console.log(`✅ [Quest] Logged on-chain: ${proof.txHash}`);
            onChainProof.questCreation = proof;
        }
    } else {
        console.log(`⚠️  [Quest] On-chain logging disabled (no QUEST_LOGGER_ADDRESS)`);
    }

    return onChainProof;
}

/**
 * Record payment on-chain during quest execution
 */
export async function recordQuestPayment(
    questId: string,
    agentId: number,
    apiEndpoint: string,
    amountUSDC: string,
    txHash: string
): Promise<{ txHash: string; explorerUrl: string } | null> {

    const questLogger = getQuestLogger();

    if (!questLogger.isEnabled()) {
        console.log(`⚠️  [Payment] On-chain logging disabled`);
        return null;
    }

    const proof = await questLogger.recordPayment({
        questId,
        agentId,
        apiEndpoint,
        amountUSDC,
        txHash
    });

    if (proof) {
        console.log(`✅ [Payment] Recorded on-chain: ${proof.txHash}`);
    }

    return proof;
}

/**
 * Complete quest on-chain with IPFS hash
 */
export async function completeQuestOnChain(
    questId: string,
    ipfsHash: string
): Promise<{ txHash: string; explorerUrl: string } | null> {

    const questLogger = getQuestLogger();

    if (!questLogger.isEnabled()) {
        console.log(`⚠️  [Quest Complete] On-chain logging disabled`);
        return null;
    }

    const proof = await questLogger.completeQuest(questId, ipfsHash);

    if (proof) {
        console.log(`✅ [Quest Complete] Logged on-chain: ${proof.txHash}`);
    }

    return proof;
}
