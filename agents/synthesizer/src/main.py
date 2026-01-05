"""
AetherSwarm Synthesizer Agent

Responsibilities:
- Receive verified data chunks from coordinator
- Fuse data into knowledge graphs using Neo4j
- Generate Merkle tree for provenance
- Produce TEE-attested knowledge artifact
- Upload to IPFS and return artifact metadata
"""

import asyncio
import json
import os
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import websockets
from dotenv import load_dotenv

load_dotenv()

@dataclass
class KnowledgeArtifact:
    """Final output of the synthesis process"""
    merkle_root: str
    metadata_uri: str
    contributors: List[str]
    data_hashes: List[str]
    graph_summary: Dict[str, Any]
    attestation: Optional[Dict[str, Any]]
    created_at: int


class MerkleTree:
    """Simple Merkle tree implementation for data provenance"""
    
    def __init__(self, leaves: List[str]):
        self.leaves = [self._hash(leaf) for leaf in leaves]
        self.tree = self._build_tree(self.leaves)
        
    def _hash(self, data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _build_tree(self, leaves: List[str]) -> List[List[str]]:
        if not leaves:
            return [[self._hash("")]]
            
        tree = [leaves]
        while len(tree[-1]) > 1:
            level = tree[-1]
            next_level = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else level[i]
                next_level.append(self._hash(left + right))
            tree.append(next_level)
        return tree
    
    @property
    def root(self) -> str:
        return self.tree[-1][0] if self.tree else ""
    
    def get_proof(self, index: int) -> List[Dict[str, str]]:
        """Get Merkle proof for a leaf at given index"""
        proof = []
        for level in self.tree[:-1]:
            if index % 2 == 0:
                sibling_index = index + 1
            else:
                sibling_index = index - 1
            
            if sibling_index < len(level):
                proof.append({
                    "position": "right" if index % 2 == 0 else "left",
                    "hash": level[sibling_index]
                })
            index //= 2
        return proof


class IPFSClient:
    """IPFS client for storing artifacts"""
    
    def __init__(self):
        self.gateway_url = os.getenv("IPFS_GATEWAY", "https://ipfs.io")
        self.api_url = os.getenv("IPFS_API_URL", "https://api.pinata.cloud")
    async def upload_json(self, data: Dict) -> str:
        """Upload JSON data to IPFS and return CID"""
        # Support both JWT (preferred) and API Key
        self.api_key = os.getenv("PINATA_JWT") or os.getenv("PINATA_API_KEY", "")
        
        if not self.api_key:
            raise ValueError("PINATA_JWT (or PINATA_API_KEY) is missing. Real IPFS upload required.")
        
        import aiohttp
        async with aiohttp.ClientSession() as session:
            try:
                print(f"[IPFS] Uploading artifact to Pinata...")
                async with session.post(
                    f"{self.api_url}/pinning/pinJSONToIPFS",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={"pinataContent": data}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        cid = result['IpfsHash']
                        print(f"[IPFS] Upload successful: {cid}")
                        return f"ipfs://{cid}"
                    else:
                        error_text = await response.text()
                        raise Exception(f"IPFS upload failed with status {response.status}: {error_text}")
            except Exception as e:
                print(f"[IPFS] Upload error: {e}")
                raise e


class SynthesizerAgent:
    """
    Synthesizer Agent - Fuses verified data into knowledge artifacts
    """
    
    def __init__(self):
        self.coordinator_url = os.getenv("COORDINATOR_WS_URL", "ws://localhost:8080")
        self.agent_id = os.getenv("AGENT_ID", "synthesizer-001")
        self.agent_address = os.getenv("AGENT_ADDRESS", "0x0000000000000000000000000000000000000000")
        self.ipfs = IPFSClient()
        self.ws = None
        
    async def connect(self):
        """Connect to Swarm Coordinator"""
        print(f"[Synthesizer] Connecting to coordinator: {self.coordinator_url}")
        
        self.ws = await websockets.connect(self.coordinator_url)
        
        registration = {
            "type": "register",
            "role": "synthesizer",
            "agentId": self.agent_id,
            "address": self.agent_address,
            "capabilities": [
                "knowledge_fusion",
                "graph_construction", 
                "merkle_provenance",
                "artifact_generation"
            ]
        }
        
        await self.ws.send(json.dumps(registration))
        print(f"[Synthesizer] Registered as {self.agent_id}")
        
    async def synthesize(
        self,
        quest_id: str,
        verified_data: List[Dict],
        attestation: Dict,
        objective: str
    ) -> KnowledgeArtifact:
        """
        Perform knowledge synthesis:
        1. Extract entities and relationships
        2. Build knowledge graph
        3. Generate Merkle tree for provenance
        4. Create artifact metadata
        5. Upload to IPFS
        """
        print(f"[Synthesizer] Starting synthesis for quest {quest_id}")
        
        # Step 1: Extract data hashes for Merkle tree
        data_hashes = []
        contributors = set()
        
        for chunk in verified_data:
            if chunk.get("hash"):
                data_hashes.append(chunk["hash"])
            if chunk.get("agentId"):
                contributors.add(chunk["agentId"])
        
        if not data_hashes:
            data_hashes = [hashlib.sha256(json.dumps(d).encode()).hexdigest() 
                          for d in verified_data]
        
        # Step 2: Build Merkle tree
        merkle_tree = MerkleTree(data_hashes)
        merkle_root = merkle_tree.root
        
        print(f"[Synthesizer] Merkle root: {merkle_root}")
        
        # Step 3: Construct knowledge graph summary
        # In production, this would use Neo4j for graph storage
        graph_summary = await self._build_knowledge_graph(verified_data, objective)
        
        # Step 4: Create artifact metadata
        artifact_metadata = {
            "name": f"AetherSwarm Artifact - {quest_id}",
            "description": f"Knowledge artifact synthesized for: {objective}",
            "questId": quest_id,
            "merkleRoot": merkle_root,
            "dataCount": len(verified_data),
            "contributors": list(contributors),
            "graph": graph_summary,
            "attestation": {
                "teeQuote": attestation.get("quote", ""),
                "validatorPubkey": attestation.get("validator_pubkey", ""),
                "confidenceScore": attestation.get("confidence_score", 0)
            },
            "createdAt": int(asyncio.get_event_loop().time()),
            "version": "1.0.0"
        }
        
        # Step 5: Upload to IPFS
        metadata_uri = await self.ipfs.upload_json(artifact_metadata)
        
        print(f"[Synthesizer] Artifact uploaded: {metadata_uri}")
        
        return KnowledgeArtifact(
            merkle_root=merkle_root,
            metadata_uri=metadata_uri,
            contributors=list(contributors),
            data_hashes=data_hashes,
            graph_summary=graph_summary,
            attestation=attestation,
            created_at=int(asyncio.get_event_loop().time())
        )
    
    async def _build_knowledge_graph(
        self, 
        verified_data: List[Dict],
        objective: str
    ) -> Dict[str, Any]:
        """
        Build a knowledge graph from verified data
        
        In production, this would:
        1. Connect to Neo4j
        2. Extract entities using NLP/LLM
        3. Create relationships
        4. Store in graph database
        """
        # Simulated graph construction
        entities = []
        relationships = []
        
        for i, chunk in enumerate(verified_data):
            source = chunk.get("source", f"source_{i}")
            
            # Create source entity
            entities.append({
                "id": f"entity_{i}",
                "type": "DataSource",
                "name": source,
                "hash": chunk.get("hash", "")
            })
            
            # Create relationship to objective
            relationships.append({
                "from": f"entity_{i}",
                "to": "objective",
                "type": "CONTRIBUTES_TO",
                "weight": 1.0
            })
        
        # Add objective as central entity
        entities.append({
            "id": "objective",
            "type": "Objective",
            "name": objective
        })
        
        # Create RICH Summary
        summary_text = f"Synthesized {len(verified_data)} sources for: {objective}"
        
        # Extract highlights from data
        highlights = []
        objective_lower = objective.lower()
        
        for chunk in verified_data:
            data = chunk.get("data", {})
            source = chunk.get("source", "")
            
            # Debug: log what we're receiving
            print(f"[Synthesizer] Processing chunk from source: {source}")
            print(f"[Synthesizer] Data keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
            if isinstance(data, dict) and "answer" in data:
                print(f"[Synthesizer] Answer field present: {bool(data.get('answer'))}")
                if data.get("answer"):
                    print(f"[Synthesizer] Answer preview: {data['answer'][:100]}...")
            
            if isinstance(data, dict):
                # PRIORITY 1: Tavily answer (most relevant for factual queries)
                if "answer" in data and data["answer"]:
                    # Use Tavily's LLM-generated answer directly
                    answer = data["answer"].strip()
                    if answer:
                        highlights.append(answer)
                        # Also include result count if available
                        if "results" in data and isinstance(data["results"], list):
                            count = len(data["results"])
                            if count > 0:
                                highlights.append(f"({count} sources cited)")
                        continue  # Skip other processing for Tavily answers
                
                # PRIORITY 2: Crypto Price/Market Data
                if "current_price_usd" in data:
                    name = data.get("name", "Asset")
                    
                    # Check what the query is asking for
                    if "market cap" in objective_lower or "marketcap" in objective_lower:
                        # Show market cap
                        market_cap = data.get("market_cap_usd", 0)
                        if market_cap > 1_000_000_000:
                            cap_str = f"${market_cap / 1_000_000_000:.2f}B"
                        elif market_cap > 1_000_000:
                            cap_str = f"${market_cap / 1_000_000:.2f}M"
                        else:
                            cap_str = f"${market_cap:,.0f}"
                        highlights.append(f"{name} Market Cap: {cap_str}")
                    else:
                        # Show price
                        price = data.get("current_price_usd")
                        change = data.get("price_change_24h", 0)
                        symbol = "🟢" if change >= 0 else "🔴"
                        highlights.append(f"{name}: ${price:,.2f} ({change:+.2f}%) {symbol}")
                
                # PRIORITY 3: HackerNews/News (fallback)
                elif "results" in data and isinstance(data["results"], list):
                    count = len(data["results"])
                    highlights.append(f"Found {count} recent discussions/articles")
                    if count > 0:
                        top = data["results"][0]
                        highlights.append(f"Top story: {top.get('title')}")
                
                # PRIORITY 4: Generic data extraction
                elif "query" in data and source == "tavily":
                    # Tavily data without answer - extract from results
                    if "results" in data and isinstance(data["results"], list) and len(data["results"]) > 0:
                        top_result = data["results"][0]
                        if top_result.get("content"):
                            # Use first result's content as summary
                            content = top_result["content"][:200]  # First 200 chars
                            highlights.append(content + "...")
                        elif top_result.get("title"):
                            highlights.append(top_result["title"])

        if highlights:
            summary_text = " | ".join(highlights)

        return {
            "entityCount": len(entities),
            "relationshipCount": len(relationships),
            "types": ["DataSource", "Objective"],
            "summary": summary_text
        }
    
    async def handle_task(self, task: Dict) -> Optional[Dict]:
        """Handle synthesis task from coordinator"""
        task_type = task.get("type")
        
        # Handle registration confirmation
        if task_type == "registered":
            print("[Synthesizer] Registration confirmed by coordinator")
            return None
        
        # Handle ping
        if task_type == "ping":
            return {
                "type": "pong",
                "agentId": self.agent_id
            }
        
        if task_type != "synthesize_task":
            print(f"[Synthesizer] Unknown task type: {task_type}")
            return None
        
        quest_id = task.get("questId")
        verified_data = task.get("verifiedData", [])
        attestation = task.get("attestation", {})
        objective = task.get("objective", "Unknown objective")
        
        print(f"[Synthesizer] Received synthesis task for quest {quest_id}")
        
        try:
            artifact = await self.synthesize(
                quest_id,
                verified_data,
                attestation,
                objective
            )
            
            return {
                "type": "task_result",
                "questId": quest_id,
                "agentId": self.agent_id,
                "status": "complete",
                "artifact": {
                    "merkleRoot": artifact.merkle_root,
                    "metadataURI": artifact.metadata_uri,
                    "contributors": artifact.contributors,
                    "graphSummary": artifact.graph_summary,
                    "summary": artifact.graph_summary.get("summary", "Quest completed successfully"),  # Add for UI display
                    "createdAt": artifact.created_at
                }
            }
            
        except Exception as e:
            print(f"[Synthesizer] Synthesis error: {e}")
            return {
                "type": "task_result",
                "questId": quest_id,
                "agentId": self.agent_id,
                "status": "error",
                "error": str(e)
            }
    
    async def heartbeat(self):
        """Send periodic pings to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # Send ping every 30 seconds
                if self.ws and not self.ws.closed:
                    ping_msg = json.dumps({"type": "ping", "agentId": self.agent_id})
                    await self.ws.send(ping_msg)
                    print(f"[Synthesizer] Sent heartbeat ping")
                else:
                    print(f"[Synthesizer] WebSocket closed, stopping heartbeat")
                    break
        except Exception as e:
            print(f"[Synthesizer] Heartbeat error: {e}")
    
    async def run(self):
        """Main agent loop with reconnection logic"""
        retry_count = 0
        
        while True:
            try:
                print(f"[Synthesizer] Connecting to coordinator (attempt {retry_count + 1})...")
                await self.connect()
                
                print(f"[Synthesizer] Connected successfully! Listening for tasks...")
                retry_count = 0  # Reset retry count on successful connection
                
                # Start heartbeat task
                heartbeat_task = asyncio.create_task(self.heartbeat())
                
                try:
                    async for message in self.ws:
                        try:
                            task = json.loads(message)
                            result = await self.handle_task(task)
                            
                            if result:
                                await self.ws.send(json.dumps(result))
                                
                        except json.JSONDecodeError:
                            print(f"[Synthesizer] Invalid JSON: {message}")
                        except Exception as e:
                            print(f"[Synthesizer] Error handling task: {e}")
                            import traceback
                            traceback.print_exc()
                except Exception as e:
                    print(f"[Synthesizer] WebSocket loop error: {e}")
                finally:
                    heartbeat_task.cancel()
                    try:
                        await heartbeat_task
                    except asyncio.CancelledError:
                        pass
                
                # If we get here, connection was closed
                print(f"[Synthesizer] Connection closed, will retry in 5 seconds...")
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"[Synthesizer] Connection error: {e}")
                import traceback
                traceback.print_exc()
                retry_count += 1
                wait_time = min(5 * retry_count, 60)  # Exponential backoff, max 60s
                print(f"[Synthesizer] Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)


async def main():
    agent = SynthesizerAgent()
    try:
        await agent.run()
    except KeyboardInterrupt:
        print("[Synthesizer] Shutting down gracefully...")
    except Exception as e:
        print(f"[Synthesizer] Fatal error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
