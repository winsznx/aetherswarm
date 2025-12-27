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
        self.api_key = os.getenv("PINATA_API_KEY", "")
        
    async def upload_json(self, data: Dict) -> str:
        """Upload JSON data to IPFS and return CID"""
        if not self.api_key:
            # Mock for development
            content = json.dumps(data)
            cid = f"Qm{hashlib.sha256(content.encode()).hexdigest()[:44]}"
            return f"ipfs://{cid}"
        
        import aiohttp
        async with aiohttp.ClientSession() as session:
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
                    return f"ipfs://{result['IpfsHash']}"
                else:
                    raise Exception(f"IPFS upload failed: {await response.text()}")


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
        
        return {
            "entityCount": len(entities),
            "relationshipCount": len(relationships),
            "types": ["DataSource", "Objective"],
            "summary": f"Graph synthesized {len(verified_data)} sources for: {objective}"
        }
    
    async def handle_task(self, task: Dict) -> Optional[Dict]:
        """Handle synthesis task from coordinator"""
        task_type = task.get("type")
        
        if task_type != "synthesize_task":
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
    
    async def run(self):
        """Main agent loop"""
        await self.connect()
        
        print(f"[Synthesizer] Listening for tasks...")
        
        async for message in self.ws:
            try:
                task = json.loads(message)
                result = await self.handle_task(task)
                
                if result:
                    await self.ws.send(json.dumps(result))
                    
            except json.JSONDecodeError:
                print(f"[Synthesizer] Invalid JSON: {message}")
            except Exception as e:
                print(f"[Synthesizer] Error: {e}")


async def main():
    agent = SynthesizerAgent()
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
