"""
Synthesizer Agent Integration Patches
Apply these changes to agents/synthesizer/src/main.py
"""

# ============================================
# PATCH 1: Add imports at top
# ============================================
import json
import os
from pathlib import Path
from web3 import Web3
from eth_account import Account


# ============================================
# PATCH 2: Load contract ABI helper function
# ============================================
def load_contract_abi(contract_name: str):
    """Load contract ABI from compiled artifacts"""
    abi_path = Path(__file__).parent.parent.parent.parent / "contracts" / "out" / f"{contract_name}.sol" / f"{contract_name}.json"
    
    if not abi_path.exists():
        print(f"⚠️  ABI not found: {abi_path}")
        return []
    
    with open(abi_path, 'r') as f:
        contract_json = json.load(f)
        return contract_json['abi']


# ============================================
# PATCH 3: In SynthesizerAgent.__init__ method
# Add reputation contract initialization:
# ============================================
# Load ERC-8004 agent IDs
self.scout_agent_id = self._load_agent_id('scout')
self.synthesizer_agent_id = self._load_agent_id('synthesizer')

# Initialize reputation contract
self.reputation_contract = None
try:
    rpc_url = os.getenv('POLYGON_AMOY_RPC_URL')
    private_key = os.getenv('DEPLOYER_PRIVATE_KEY') or os.getenv('SYNTHESIZER_WALLET_PRIVATE_KEY')
    reputation_address = os.getenv('REPUTATION_REGISTRY_ADDRESS')
    
    if rpc_url and private_key and reputation_address:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        account = Account.from_key(private_key)
        
        abi = load_contract_abi('ReputationRegistry')
        if abi:
            self.reputation_contract = w3.eth.contract(
                address=Web3.to_checksum_address(reputation_address),
                abi=abi
            )
            self.reputation_signer = account
            self.w3 = w3
            print(f"✅ [Synthesizer] Reputation contract connected")
        else:
            print("⚠️  [Synthesizer] Could not load ReputationRegistry ABI")
    else:
        print("⚠️  [Synthesizer] Reputation contract not configured")
except Exception as e:
    print(f"⚠️  [Synthesizer] Reputation init failed: {e}")


# ============================================
# PATCH 4: Add helper method to load agent IDs
# ============================================
def _load_agent_id(self, agent_type: str) -> int:
    """Load agent ID from registration JSON"""
    json_path = Path(__file__).parent.parent.parent / agent_type / f".{agent_type}_agent.json"
    
    try:
        with open(json_path, 'r') as f:
            agent_info = json.load(f)
            agent_id = agent_info.get('agentId', 1)
            print(f"[Synthesizer] Loaded {agent_type} agent ID: {agent_id}")
            return agent_id
    except FileNotFoundError:
        print(f"⚠️  [Synthesizer] No .{agent_type}_agent.json found")
        return 1  # Default


# ============================================
# PATCH 5: Add reputation recording method
# ============================================
async def record_scout_reputation(self, quest_id: str, quality_score: int, feedback: str = ""):
    """
    Record scout's performance on-chain
    
    Args:
        quest_id: Quest identifier
        quality_score: 0-100 performance score
        feedback: Optional feedback text
    """
    if not self.reputation_contract:
        print("⚠️  [Synthesizer] Reputation contract not available")
        return None
    
    try:
        print(f"[Synthesizer] Recording scout reputation...")
        print(f"  Quest: {quest_id}")
        print(f"  Agent: #{self.scout_agent_id}")
        print(f"  Score: {quality_score}/100")
        
        # Convert quest ID to uint256 (hash and mod)
        quest_id_hash = int(Web3.keccak(text=quest_id).hex(), 16) % (2**32)
        
        # Build transaction
        tx = self.reputation_contract.functions.recordQuestCompletion(
            self.scout_agent_id,
            quest_id_hash,
            quality_score,
            feedback
        ).build_transaction({
            'from': self.reputation_signer.address,
            'nonce': self.w3.eth.get_transaction_count(self.reputation_signer.address),
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = self.reputation_signer.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"  TX sent: {tx_hash.hex()}")
        print(f"  Waiting for confirmation...")
        
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt['status'] == 1:
            explorer_url = f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"
            print(f"✅ [Synthesizer] Reputation recorded!")
            print(f"   TX: {tx_hash.hex()}")
            print(f"   Block: {receipt['blockNumber']}")
            print(f"   Explorer: {explorer_url}")
            
            return {
                'txHash': tx_hash.hex(),
                'blockNumber': receipt['blockNumber'],
                'explorerUrl': explorer_url
            }
        else:
            print(f"❌ [Synthesizer] Transaction failed")
            return None
            
    except Exception as e:
        print(f"❌ [Synthesizer] Reputation recording failed: {e}")
        return None


# ============================================
# PATCH 6: Add quality scoring method
# ============================================
def calculate_quality_score(self, scout_results: list) -> int:
    """
    Calculate quality score (0-100) based on scout's work
    
    Factors:
    - Data completeness (40 points)
    - Premium API usage (30 points)
    - Data freshness (20 points)
    - Source diversity (10 points)
    """
    score = 0
    
    if not scout_results:
        return 0
    
    # Data completeness (40 points)
    if len(scout_results) > 0:
        score += min(40, len(scout_results) * 10)
    
    # Premium API usage (30 points)
    paid_sources = [r for r in scout_results if r.get('paid', False)]
    if paid_sources:
        score += 30
    
    # Data freshness (20 points)
    import time
    current_time = int(time.time())
    avg_age = sum([current_time - r.get('timestamp', 0) for r in scout_results]) / len(scout_results)
    if avg_age < 3600:  # Less than 1 hour old
        score += 20
    elif avg_age < 86400:  # Less than 1 day old
        score += 10
    
    # Source diversity (10 points)
    unique_sources = len(set([r.get('source') for r in scout_results]))
    score += min(10, unique_sources * 5)
    
    return min(100, score)


# ============================================
# PATCH 7: In quest completion logic
# After synthesizing results, before returning:
# ============================================
# Record scout's reputation on-chain
quality_score = self.calculate_quality_score(scout_results)
reputation_proof = await self.record_scout_reputation(
    quest_id,
    quality_score,
    f"Quest completed successfully with {len(scout_results)} data sources"
)

# Include in synthesis results
synthesis_result['reputationProof'] = reputation_proof
synthesis_result['scoutQualityScore'] = quality_score


# ============================================
# COMPLETE INTEGRATION EXAMPLE (for reference)
# ============================================
"""
async def handle_synthesis_task(self, task):
    quest_id = task.get('questId')
    verified_data = task.get('verifiedData', [])
    
    print(f"[Synthesizer] Synthesizing quest: {quest_id}")
    
    # Perform synthesis (existing logic)
    synthesis = await self.synthesize_knowledge(verified_data)
    
    # Upload to IPFS
    ipfs_hash = await self.upload_to_ipfs(synthesis)
    
    # === NEW: Record scout reputation ===
    quality_score = self.calculate_quality_score(verified_data)
    reputation_proof = await self.record_scout_reputation(
        quest_id,
        quality_score,
        f"Synthesized {len(verified_data)} sources into knowledge artifact"
    )
    
    # Return results
    result = {
        'questId': quest_id,
        'synthesis': synthesis,
        'ipfsHash': ipfs_hash,
        'scoutQualityScore': quality_score,
        'reputationProof': reputation_proof  # NEW
    }
    
    return result
"""
