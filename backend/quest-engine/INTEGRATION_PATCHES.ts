/**
 * Quest Engine Integration Patches
 * Apply these changes to backend/quest-engine/src/index.ts
 */

// ============================================
// PATCH 1: Add import at line 18 (after other imports)
// ============================================
import { createQuestWithLogging, recordQuestPayment, completeQuestOnChain } from './questIntegration';


// ============================================
// PATCH 2: In quest creation endpoint (around line 412)
// After: const wallet = await createEmbeddedWallet(userId || questId);
// Add this:
// ============================================

// Create quest on-chain
const onChainProof = await createQuestWithLogging(
    questId,
    Array.isArray(objectives) ? objectives.join(', ') : objectives,
    String(budget),
    wallet.address
);

if (onChainProof?.questCreation) {
    console.log(`✅ [Quest] Logged on-chain: ${onChainProof.questCreation.txHash}`);
}


// ============================================
// PATCH 3: Update quest data structure (around line 443)
// In saveQuest() call, add:
// ============================================
onChainProof,  // Add this field


    // ============================================  
    // PATCH 4: Update response (around line 454)
    // In res.status(201).json(), add:
    // ============================================
    onChainProof,  // Add this field


// ============================================
// COMPLETE INTEGRATED FUNCTION (for reference):
// ============================================
/*
app.post('/quests', async (req: Request, res: Response) => {
    try {
        const { objectives, budget, constraints, sources, userId, paymentTxHash } = req.body;

        if (!objectives || (Array.isArray(objectives) && objectives.length === 0)) {
            res.status(400).json({ error: 'objectives required' });
            return;
        }

        if (!budget || budget < 0) {
            res.status(400).json({ error: 'valid budget required' });
            return;
        }

        const questId = `quest-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Create embedded wallet
        const wallet = await createEmbeddedWallet(userId || questId);
        console.log(`[Quest Engine] Created wallet: ${wallet.address}`);

        // === NEW: Log quest creation on-chain ===
        const onChainProof = await createQuestWithLogging(
            questId,
            Array.isArray(objectives) ? objectives.join(', ') : objectives,
            String(budget),
            wallet.address
        );

        if (onChainProof?.questCreation) {
            console.log(`✅ [Quest] On-chain: ${onChainProof.questCreation.txHash}`);
        }

        const contractService = getContractService();

        const explorerLinks = {
            paymentTx: paymentTxHash ? contractService.getTxExplorerUrl(paymentTxHash) : null,
            questWallet: contractService.getAddressExplorerUrl(wallet.address),
            discoveryRegistry: contractService.getAddressExplorerUrl(process.env.DISCOVERY_REGISTRY_ADDRESS || ''),
            questCreation: onChainProof?.questCreation?.explorerUrl  // NEW
        };

        await questQueue.add('process-quest', {
            questId,
            objectives: Array.isArray(objectives) ? objectives : [objectives],
            budget,
            constraints: constraints || [],
            sources: sources || [],
            walletAddress: wallet.address,
            paymentTxHash: paymentTxHash || null,
            createdAt: Date.now(),
            onChainProof  // NEW: Pass to agents
        });

        console.log(`[Quest Engine] Quest ${questId} queued`);

        await saveQuest({
            questId,
            status: 'queued',
            objectives: Array.isArray(objectives) ? objectives.join(', ') : objectives,
            budget: String(budget),
            walletAddress: wallet.address,
            createdAt: new Date().toISOString(),
            paymentTxHash: paymentTxHash || null,
            explorerLinks,
            onChainProof  // NEW
        });

        res.status(201).json({
            questId,
            status: 'queued',
            walletAddress: wallet.address,
            paymentTxHash: paymentTxHash || null,
            explorerLinks,
            onChainProof,  // NEW
            message: 'Quest created and dispatched to swarm coordinator'
        });

    } catch (error) {
        console.error('[Quest Engine] Error:', error);
        res.status(500).json({ error: 'Failed to create quest' });
    }
});
*/
