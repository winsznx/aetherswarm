"""
AetherSwarm Scout Agent - x402 Protocol Implementation
Implements the full x402 payment handshake:
1. Make request to paywalled API
2. Receive 402 Payment Required with payment requirements
3. Sign EIP-712 payload using wallet
4. Retry with X-PAYMENT header
5. Complete transaction
"""

import asyncio
import json
import os
import hashlib
from typing import Optional, Dict, Any
from dataclasses import dataclass
from eth_account import Account
from eth_account.messages import encode_typed_data
import aiohttp
import websockets
from dotenv import load_dotenv

load_dotenv()

@dataclass
class PaymentRequirements:
    """x402 Payment Requirements parsed from 402 response"""
    pay_to: str
    amount: str
    asset: str
    network: str
    facilitator_url: str
    nonce: str
    expiry: int
    resource_url: str
    method: str

class X402Client:
    """
    Real x402 Client using EIP-712 signing
    Implements the Faremeter/Corbits protocol
    """
    
    def __init__(self, private_key: str, rpc_url: str = None):
        """
        Initialize x402 client with agent's private key
        
        Args:
            private_key: Hex-encoded private key (0x...)
            rpc_url: Optional RPC URL for on-chain verification
        """
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        self.rpc_url = rpc_url or os.getenv("RPC_URL", "https://polygon-mainnet.g.alchemy.com/v2/demo")
        
    def parse_402_response(self, response_headers: Dict, response_body: Dict) -> PaymentRequirements:
        """
        Parse x402 payment requirements from 402 response
        
        The 402 response contains:
        - X-Payment-Requirements header or body with payment terms
        """
        # Try header first (standard x402)
        requirements_json = response_headers.get('X-Payment-Requirements')
        
        if requirements_json:
            req = json.loads(requirements_json)
        else:
            # Fall back to body (Faremeter style)
            req = response_body.get('paymentRequirements', response_body)
        
        return PaymentRequirements(
            pay_to=req.get('payTo', req.get('recipient')),
            amount=req.get('amount', req.get('maxAmountRequired')),
            asset=req.get('asset', 'USDC'),
            network=req.get('network', 'polygon'),
            facilitator_url=req.get('facilitatorUrl', req.get('facilitator')),
            nonce=req.get('nonce', str(int(asyncio.get_event_loop().time() * 1000))),
            expiry=req.get('expiry', int(asyncio.get_event_loop().time()) + 3600),
            resource_url=req.get('resourceUrl', ''),
            method=req.get('method', 'GET')
        )

    def sign_x402_payment(self, requirements: PaymentRequirements) -> str:
        """
        Sign x402 payment using EIP-712 typed data
        
        This creates a cryptographic proof that the agent authorizes the payment
        """
        # EIP-712 Domain (x402 standard)
        domain = {
            "name": "x402",
            "version": "1",
            "chainId": self._get_chain_id(requirements.network),
            "verifyingContract": requirements.facilitator_url.split('/')[-1] if '0x' in requirements.facilitator_url else "0x0000000000000000000000000000000000000000"
        }
        
        # x402 Payment message type
        types = {
            "Payment": [
                {"name": "payTo", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "asset", "type": "address"},
                {"name": "nonce", "type": "uint256"},
                {"name": "expiry", "type": "uint256"},
                {"name": "resourceUrl", "type": "string"},
            ]
        }
        
        # Payment message data
        message = {
            "payTo": requirements.pay_to,
            "amount": int(requirements.amount),
            "asset": self._get_asset_address(requirements.asset, requirements.network),
            "nonce": int(requirements.nonce),
            "expiry": requirements.expiry,
            "resourceUrl": requirements.resource_url
        }
        
        # Sign using EIP-712
        typed_data = {
            "types": types,
            "primaryType": "Payment",
            "domain": domain,
            "message": message
        }
        
        encoded = encode_typed_data(full_message=typed_data)
        signed = self.account.sign_message(encoded)
        
        # Create x402 payment header value
        payment_header = {
            "signature": signed.signature.hex(),
            "payer": self.address,
            "payTo": requirements.pay_to,
            "amount": requirements.amount,
            "asset": requirements.asset,
            "network": requirements.network,
            "nonce": requirements.nonce,
            "expiry": requirements.expiry
        }
        
        return json.dumps(payment_header)

    def _get_chain_id(self, network: str) -> int:
        """Get chain ID for network"""
        chains = {
            "polygon": 137,
            "base": 8453,
            "ethereum": 1,
            "arbitrum": 42161,
            "abstract": 2741,
            "abstract-testnet": 11124
        }
        return chains.get(network.lower(), 137)
    
    def _get_asset_address(self, asset: str, network: str) -> str:
        """Get USDC contract address for network"""
        usdc_addresses = {
            "polygon": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "arbitrum": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            "abstract": "0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1"  # Example
        }
        if asset.upper() == "USDC":
            return usdc_addresses.get(network.lower(), usdc_addresses["polygon"])
        return asset  # Assume it's already an address

    async def fetch_with_payment(
        self, 
        url: str, 
        method: str = "GET",
        headers: Dict = None,
        body: Any = None,
        max_retries: int = 3
    ) -> aiohttp.ClientResponse:
        """
        Make a request with automatic x402 payment handling
        
        1. Make initial request
        2. If 402, parse requirements and sign
        3. Retry with X-PAYMENT header
        """
        headers = headers or {}
        
        async with aiohttp.ClientSession() as session:
            for attempt in range(max_retries):
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body if body else None
                ) as response:
                    
                    if response.status == 402:
                        # Parse payment requirements
                        response_body = await response.json()
                        requirements = self.parse_402_response(
                            dict(response.headers),
                            response_body
                        )
                        requirements.resource_url = url
                        requirements.method = method
                        
                        print(f"[x402] Payment required: {requirements.amount} {requirements.asset}")
                        
                        # Sign payment
                        payment_header = self.sign_x402_payment(requirements)
                        
                        # Retry with payment
                        headers['X-PAYMENT'] = payment_header
                        
                        print(f"[x402] Signed payment, retrying...")
                        continue
                    
                    elif response.status == 200:
                        print(f"[x402] Request successful")
                        return response
                    
                    else:
                        print(f"[x402] Unexpected status: {response.status}")
                        return response
            
            raise Exception(f"Max retries exceeded for {url}")


class ScoutAgent:
    """
    AetherSwarm Scout Agent
    
    Responsibilities:
    - Connect to Swarm Coordinator via WebSocket
    - Receive query_quest tasks
    - Fetch data from paywalled APIs using x402
    - Return results with payment proofs
    """
    
    def __init__(self):
        self.coordinator_url = os.getenv("COORDINATOR_WS_URL", "ws://localhost:8080")
        self.private_key = os.getenv("AGENT_PRIVATE_KEY")
        self.agent_id = os.getenv("AGENT_ID", "scout-001")
        
        if not self.private_key:
            raise ValueError("AGENT_PRIVATE_KEY environment variable required")
        
        self.x402_client = X402Client(self.private_key)
        self.ws = None
        
    async def connect(self):
        """Connect to Swarm Coordinator and register as Scout"""
        print(f"[Scout] Connecting to coordinator: {self.coordinator_url}")
        
        self.ws = await websockets.connect(self.coordinator_url)
        
        # Register with coordinator
        registration = {
            "type": "register",
            "role": "scout",
            "agentId": self.agent_id,
            "address": self.x402_client.address,
            "capabilities": ["web_scraping", "api_query", "document_fetch"]
        }
        
        await self.ws.send(json.dumps(registration))
        print(f"[Scout] Registered as {self.agent_id} with address {self.x402_client.address}")
        
    async def handle_task(self, task: Dict):
        """
        Handle a query_quest task from coordinator
        
        Task structure:
        {
            "type": "query_quest",
            "questId": "...",
            "objective": "Research topic X",
            "sources": ["https://api.example.com/data"],
            "budget": 100000 (in USDC base units)
        }
        """
        task_type = task.get("type")
        quest_id = task.get("questId")
        
        print(f"[Scout] Received task: {task_type} for quest {quest_id}")
        
        if task_type == "query_quest":
            results = []
            payment_proofs = []
            
            sources = task.get("sources", [])
            objective = task.get("objective", "")
            
            for source_url in sources:
                try:
                    # Fetch with x402 payment if needed
                    response = await self.x402_client.fetch_with_payment(source_url)
                    data = await response.json() if response.content_type == 'application/json' else await response.text()
                    
                    # Create data hash for verification
                    data_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()
                    
                    results.append({
                        "source": source_url,
                        "data": data,
                        "hash": data_hash,
                        "timestamp": int(asyncio.get_event_loop().time())
                    })
                    
                    # If payment was made, extract proof
                    if 'X-PAYMENT' in response.headers:
                        payment_proofs.append({
                            "source": source_url,
                            "paymentHeader": response.headers.get('X-Payment-Receipt')
                        })
                        
                except Exception as e:
                    print(f"[Scout] Error fetching {source_url}: {e}")
                    results.append({
                        "source": source_url,
                        "error": str(e)
                    })
            
            # Send results back to coordinator
            response = {
                "type": "task_result",
                "questId": quest_id,
                "agentId": self.agent_id,
                "status": "complete",
                "results": results,
                "paymentProofs": payment_proofs,
                "dataHashes": [r.get("hash") for r in results if r.get("hash")]
            }
            
            await self.ws.send(json.dumps(response))
            print(f"[Scout] Sent results for quest {quest_id}")
            
    async def run(self):
        """Main agent loop"""
        await self.connect()
        
        print(f"[Scout] Listening for tasks...")
        
        async for message in self.ws:
            try:
                task = json.loads(message)
                await self.handle_task(task)
            except json.JSONDecodeError:
                print(f"[Scout] Invalid JSON received: {message}")
            except Exception as e:
                print(f"[Scout] Error handling task: {e}")


async def main():
    agent = ScoutAgent()
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
