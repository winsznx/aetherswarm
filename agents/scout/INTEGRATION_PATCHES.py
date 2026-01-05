"""
Scout Agent Integration Patches
Apply these changes to agents/scout/src/main.py
"""

# ============================================
# PATCH 1: Add imports at top of file (after line 23)
# ============================================
from src.premium_integration import get_premium_integration


# ============================================
# PATCH 2: In ScoutAgent.__init__ method (around line 220)
# After: self.agent_id = "scout-001"
# Add:
# ============================================
# Load agent ID from registration JSON
try:
    import json
    with open('.scout_agent.json', 'r') as f:
        agent_info = json.load(f)
        self.erc8004_agent_id = agent_info.get('agentId', 1)
        print(f"[Scout] Loaded ERC-8004 Agent ID: {self.erc8004_agent_id}")
except FileNotFoundError:
    self.erc8004_agent_id = 1  # Default for testing
    print("[Scout] No .scout_agent.json found, using default ID")

# Initialize premium API integration
self.premium = get_premium_integration(agent_id=self.erc8004_agent_id)


# ============================================  
# PATCH 3: In handle_task method (around line 285)
# After: objective = task.get("objective", "")
# Add:
# ============================================
# Set quest wallet if provided
wallet_address = task.get("walletAddress")
if wallet_address:
    self.premium.set_quest_wallet(wallet_address)
    print(f"[Scout] Quest wallet set: {wallet_address}")


# ============================================
# PATCH 4: In _perform_real_search method (around line 350)
# At the BEGINNING of the function, BEFORE any other logic
# Add:
# ============================================
# Try premium APIs first
try:
    premium_results = await self.premium.intelligent_search(query, budget_usdc=0.10)
    if premium_results:
        print(f"✅ [Scout] Got {len(premium_results)} results from premium APIs")
        return premium_results
except Exception as e:
    print(f"⚠️  [Scout] Premium APIs failed, falling back: {e}")

# ... continue with existing free API fallback code ...


# ============================================
# COMPLETE INTEGRATED HANDLE_TASK (for reference)
# ============================================
"""
async def handle_task(self, task: Dict):
    task_type = task.get("type")
    quest_id = task.get("questId")
    
    print(f"[Scout] Received task: {task_type} for quest {quest_id}")
    
    if task_type == "query_quest":
        results = []
        payment_proofs = []
        
        sources = task.get("sources", [])
        objective = task.get("objective", "")
        
        # === NEW: Set quest wallet ===
        wallet_address = task.get("walletAddress")
        if wallet_address:
            self.premium.set_quest_wallet(wallet_address)
            print(f"[Scout] Quest wallet: {wallet_address}")
        
        for source_url in sources:
            if "faremeter.com" in source_url and objective:
                continue

            try:
                response = await self.x402_client.fetch_with_payment(source_url)
                data = await response.json() if response.content_type == 'application/json' else await response.text()
                
                data_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()
                
                results.append({
                    "source": source_url,
                    "data": data,
                    "hash": data_hash,
                    "timestamp": int(asyncio.get_event_loop().time())
                })
                
                if 'X-PAYMENT' in response.headers:
                    payment_proofs.append({
                        "source": source_url,
                        "paymentHeader": response.headers.get('X-Payment-Receipt')
                    })
                    
            except Exception as e:
                print(f"[Scout] Error fetching {source_url}: {e}")
        
        # If no results, perform REAL search
        if not results and objective:
            print(f"[Scout] Performing search for: {objective}")
            real_results = await self._perform_real_search(objective)
            results.extend(real_results)

        # Send results back
        response = {
            "type": "task_result",
            "questId": quest_id,
            "agentId": self.agent_id,
            "erc8004AgentId": self.erc8004_agent_id,  # NEW
            "status": "complete",
            "results": results,
            "paymentProofs": payment_proofs,
            "dataHashes": [r.get("hash") for r in results if r.get("hash")]
        }
        
        await self.ws.send(json.dumps(response))
        print(f"[Scout] Sent results for quest {quest_id}")
"""


# ============================================
# COMPLETE INTEGRATED _perform_real_search (for reference)
# ============================================
"""
async def _perform_real_search(self, query: str) -> List[Dict]:
    results = []
    
    # === NEW: Try premium APIs first ===
    try:
        premium_results = await self.premium.intelligent_search(query, budget_usdc=0.10)
        if premium_results:
            print(f"✅ [Scout] Premium API success: {len(premium_results)} results")
            return premium_results
    except Exception as e:
        print(f"⚠️  [Scout] Premium APIs failed: {e}")
        print("[Scout] Falling back to free APIs...")
    
    # === EXISTING: Free API fallback ===
    # ... existing crypto detection code ...
    # ... existing HackerNews fallback ...
    
    return results
"""
