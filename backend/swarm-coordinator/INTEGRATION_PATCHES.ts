/**
 * Swarm Coordinator Integration Patches
 * Apply these changes to backend/swarm-coordinator/src/index.ts
 */

// ============================================
// PATCH 1: Add import at top
// ============================================
import { recordQuestPayment } from '../../quest-engine/src/questIntegration';


// ============================================
// PATCH 2: In the message handler where scouts return results
// After receiving scout results with payment_proof
// Add this function:
// ============================================

async function processScoutResults(questId: string, scoutResults: any) {
    // Check if scout made any paid API calls
    for (const result of scoutResults.results || []) {
        if (result.paid && result.payment_proof) {
            const proof = result.payment_proof;

            console.log(`[Coordinator] Recording payment on-chain...`);
            console.log(`  Quest: ${questId}`);
            console.log(`  Agent: #${proof.agent_id}`);
            console.log(`  API: ${proof.api}`);
            console.log(`  Cost: $${proof.cost_usdc}`);

            try {
                const onChainProof = await recordQuestPayment(
                    questId,
                    proof.agent_id,
                    proof.api,
                    proof.cost_usdc,
                    proof.tx_hash
                );

                if (onChainProof) {
                    console.log(`✅ [Coordinator] Payment recorded: ${onChainProof.txHash}`);
                    console.log(`   Explorer: ${onChainProof.explorerUrl}`);

                    // Store proof for quest completion
                    result.onChainProof = onChainProof;
                }
            } catch (error) {
                console.error(`❌ [Coordinator] Failed to record payment:`, error);
                // Don't fail the quest, just log
            }
        }
    }

    return scoutResults;
}


// ============================================
// PATCH 3: In the websocket message handler
// When scout sends results, call processScoutResults:
// ============================================

ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'task_result' && message.agentId === 'scout') {
        // === NEW: Process and record payments ===
        const processedResults = await processScoutResults(
            message.questId,
            message
        );

        // Continue with existing logic (forward to verifier, etc.)
        // ...
    }
});


// ============================================
// COMPLETE EXAMPLE (for reference)
// ============================================
/*
// Message handler in coordinator
io.on('connection', (socket) => {
    console.log('[Coordinator] Agent connected');
    
    socket.on('task_result', async (data) => {
        const { questId, agentId, results, paymentProofs } = data;
        
        console.log(`[Coordinator] Received results from ${agentId}`);
        
        if (agentId.includes('scout')) {
            // === NEW: Record payments on chain ===
            await processScoutResults(questId, data);
            
            // Forward to verifier
            io.to('verifiers').emit('verify_data', {
                questId,
                data: results
            });
        }
        
        if (agentId.includes('verifier')) {
            // Forward to synthesizer
            io.to('synthesizers').emit('synthesize', {
                questId,
                verifiedData: results
            });
        }
        
        if (agentId.includes('synthesizer')) {
            // Quest complete
            await completeQuestFlow(questId, results);
        }
    });
});
*/


// ============================================
// QUEST COMPLETION ENHANCEMENT
// ============================================

async function completeQuestFlow(questId: string, synthesisResults: any) {
    console.log(`[Coordinator] Completing quest: ${questId}`);

    // Upload to IPFS (existing logic)
    const ipfsHash = await uploadToIPFS(synthesisResults);

    // === NEW: Complete quest on-chain ===
    const { completeQuestOnChain } = await import('../../quest-engine/src/questIntegration');

    const completionProof = await completeQuestOnChain(questId, ipfsHash);

    if (completionProof) {
        console.log(`✅ [Coordinator] Quest completed on-chain: ${completionProof.txHash}`);
        console.log(`   IPFS: ${ipfsHash}`);
        console.log(`   Explorer: ${completionProof.explorerUrl}`);
    }

    // Update quest status in database
    await updateQuestStatus(questId, 'completed', {
        ipfsHash,
        completionProof
    });

    return {
        questId,
        status: 'completed',
        ipfsHash,
        completionProof
    };
}
