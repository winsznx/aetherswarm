"""
Multi-Facilitator x402 Client for AetherSwarm

Supports multiple facilitators with automatic fallback and routing:
- OpenMid: Sponsored transactions on Base (FREE)
- Thirdweb Nexus: 80+ chains, enterprise-grade
- Corbits: Modular, x402-native

Strategy: Try OpenMid first (free), fallback to others if needed
"""

import requests
from eth_account import Account
from eth_account.messages import encode_typed_data
import time
from typing import Optional, Dict, Any, List
from enum import Enum

class FacilitatorType(Enum):
    OPENMID = "openmid"
    THIRDWEB = "thirdweb"
    CORBITS = "corbits"

class MultiFacilitatorX402Client:
    """
    x402 client with multi-facilitator support and intelligent routing
    
    Routing Strategy:
    1. OpenMid (Base) - Try first if on Base network (FREE gas)
    2. Thirdweb (Multi-chain) - Fallback for other chains
    3. Corbits (Polygon/Solana) - Specialized use cases
    """
    
    # Facilitator Configurations
    FACILITATORS = {
        FacilitatorType.OPENMID: {
            "url": "https://facilitator.openmid.xyz",
            "payment_chains": [8453],  # Base Mainnet (for USDC payments)
            "registry_chain": 84532,  # Base Sepolia (for ERC-8004 registration)
            "usdc": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC on Base Mainnet
            "delegation_contract": "0xFdc90fCC6929a2f42a9D714bD10520eEE98bD378",  # EIP-7702 on Sepolia
            "sponsored": True,  # Free gas!
            "erc8004": True  # Auto-registers agents
        },
        FacilitatorType.THIRDWEB: {
            "url": "https://nexus.thirdweb.com/facilitator",
            "chains": [1, 137, 8453, 42161, 10],  # Ethereum, Polygon, Base, Arbitrum, Optimism
            "usdc": {
                1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # Ethereum
                137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",  # Polygon
                8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # Base
            },
            "sponsored": False,
            "erc8004": False
        },
        FacilitatorType.CORBITS: {
            "url": "https://facilitator.corbits.dev",
            "chains": [137, 1399811149],  # Polygon, Solana
            "usdc": {
                137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",  # Polygon
            },
            "sponsored": False,
            "erc8004": False
        }
    }
    
    def __init__(
        self,
        agent_private_key: str,
        preferred_chain: int = 8453,  # Default to Base
        facilitator_priority: Optional[List[FacilitatorType]] = None
    ):
        """
        Initialize multi-facilitator x402 client
        
        Args:
            agent_private_key: Agent's Ethereum private key
            preferred_chain: Preferred chain ID (default: Base)
            facilitator_priority: Custom facilitator order (default: OpenMid → Thirdweb → Corbits)
        """
        if not agent_private_key.startswith('0x'):
            raise ValueError("Private key must start with 0x")
            
        self.agent_private_key = agent_private_key
        self.account = Account.from_key(agent_private_key)
        self.agent_address = self.account.address
        self.preferred_chain = preferred_chain
        
        # Set facilitator priority
        if facilitator_priority:
            self.facilitator_priority = facilitator_priority
        else:
            # Default: OpenMid first (free!), then Thirdweb, then Corbits
            self.facilitator_priority = [
                FacilitatorType.OPENMID,
                FacilitatorType.THIRDWEB,
                FacilitatorType.CORBITS
            ]
        
        print(f"[x402] Multi-facilitator client initialized")
        print(f"[x402] Agent: {self.agent_address}")
        print(f"[x402] Preferred chain: {self._get_chain_name(preferred_chain)}")
        print(f"[x402] Facilitator priority: {[f.value for f in self.facilitator_priority]}")
    
    def fetch_with_payment(
        self,
        url: str,
        max_amount: float = 0.10,
        chain_id: Optional[int] = None
    ) -> requests.Response:
        """
        Fetch data from x402-gated API with automatic facilitator selection
        
        Args:
            url: API endpoint
            max_amount: Maximum USDC willing to pay
            chain_id: Override chain ID (default: use preferred_chain)
            
        Returns:
            Response from API after payment
        """
        chain_id = chain_id or self.preferred_chain
        
        print(f"[x402] Fetching {url} on chain {self._get_chain_name(chain_id)}...")
        
        # Step 1: Initial request to check for 402
        try:
            initial_response = requests.get(url, timeout=10)
        except requests.RequestException as e:
            print(f"[x402] Request failed: {e}")
            raise
        
        # If not paywalled, return directly
        if initial_response.status_code != 402:
            print(f"[x402] No payment required (status {initial_response.status_code})")
            return initial_response
        
        print(f"[x402] Payment required (402 response)")
        
        # Step 2: Parse payment requirements
        payment_requirements = self._parse_payment_requirements(initial_response)
        pay_to = payment_requirements.get("payTo")
        amount = float(payment_requirements.get("amount", 0))
        nonce = payment_requirements.get("nonce", int(time.time()))
        
        if not pay_to:
            raise ValueError("Payment requirements missing 'payTo' address")
        
        if amount > max_amount:
            raise ValueError(f"Payment ({amount} USDC) exceeds max ({max_amount} USDC)")
        
        print(f"[x402] Payment: {amount} USDC to {pay_to[:10]}...")
        
        # Step 3: Try facilitators in priority order
        last_error = None
        for facilitator_type in self.facilitator_priority:
            facilitator = self.FACILITATORS[facilitator_type]
            
            # Check if facilitator supports this chain
            if chain_id not in facilitator["chains"]:
                print(f"[x402] {facilitator_type.value}: Chain {chain_id} not supported, skipping")
                continue
            
            try:
                print(f"[x402] Trying {facilitator_type.value} facilitator...")
                
                # Get USDC address for this chain
                usdc_address = self._get_usdc_address(facilitator, chain_id)
                
                # Sign payment
                signature = self._sign_payment(
                    pay_to=pay_to,
                    amount=amount,
                    nonce=nonce,
                    chain_id=chain_id,
                    usdc_address=usdc_address
                )
                
                # Verify with facilitator
                payment_proof = self._verify_with_facilitator(
                    facilitator_type=facilitator_type,
                    facilitator_url=facilitator["url"],
                    signature=signature,
                    pay_to=pay_to,
                    amount=amount,
                    nonce=nonce,
                    chain_id=chain_id,
                    usdc_address=usdc_address
                )
                
                # Retry request with payment proof
                headers = {
                    "X-402-Payment": payment_proof,
                    "X-402-Nonce": str(nonce),
                    "X-402-Facilitator": facilitator["url"]
                }
                
                final_response = requests.get(url, headers=headers, timeout=10)
                
                if final_response.status_code == 200:
                    print(f"[x402] ✓ Payment successful via {facilitator_type.value}")
                    if facilitator.get("sponsored"):
                        print(f"[x402] ✓ Gas fees sponsored (FREE!)")
                    return final_response
                else:
                    print(f"[x402] Payment accepted but request failed ({final_response.status_code})")
                    last_error = Exception(f"Request failed with status {final_response.status_code}")
                    
            except Exception as e:
                print(f"[x402] {facilitator_type.value} failed: {e}")
                last_error = e
                continue
        
        # All facilitators failed
        raise Exception(f"All facilitators failed. Last error: {last_error}")
    
    def _sign_payment(
        self,
        pay_to: str,
        amount: float,
        nonce: int,
        chain_id: int,
        usdc_address: str
    ) -> str:
        """Sign EIP-712 payment authorization"""
        domain_data = {
            "name": "x402",
            "version": "2",
            "chainId": chain_id,
            "verifyingContract": pay_to
        }
        
        message_types = {
            "PaymentAuthorization": [
                {"name": "payTo", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "asset", "type": "address"},
                {"name": "nonce", "type": "uint256"}
            ]
        }
        
        message_data = {
            "payTo": pay_to,
            "amount": int(amount * 1e6),  # USDC has 6 decimals
            "asset": usdc_address,
            "nonce": nonce
        }
        
        signable_message = encode_typed_data(domain_data, message_types, message_data)
        signed_message = Account.sign_message(signable_message, self.agent_private_key)
        
        return signed_message.signature.hex()
    
    def _verify_with_facilitator(
        self,
        facilitator_type: FacilitatorType,
        facilitator_url: str,
        signature: str,
        pay_to: str,
        amount: float,
        nonce: int,
        chain_id: int,
        usdc_address: str
    ) -> str:
        """Submit payment to facilitator for verification"""
        payload = {
            "signature": signature,
            "message": {
                "payTo": pay_to,
                "amount": int(amount * 1e6),
                "asset": usdc_address,
                "nonce": nonce
            },
            "domain": {
                "name": "x402",
                "version": "2",
                "chainId": chain_id,
                "verifyingContract": pay_to
            },
            "agentAddress": self.agent_address,
            "chainId": chain_id
        }
        
        # OpenMid-specific: Include ERC-8004 registration request
        if facilitator_type == FacilitatorType.OPENMID:
            payload["registerAgent"] = True
        
        response = requests.post(
            f"{facilitator_url}/verify",
            json=payload,
            timeout=10
        )
        
        if response.status_code != 200:
            raise Exception(f"Facilitator verification failed: {response.text}")
        
        verification = response.json()
        payment_proof = verification.get("proof") or verification.get("paymentProof")
        
        if not payment_proof:
            raise Exception("Facilitator did not return payment proof")
        
        # Check for ERC-8004 registration (OpenMid)
        if verification.get("agentRegistered"):
            print(f"[x402] ✓ Agent registered to ERC-8004 registry")
        
        return payment_proof
    
    def _parse_payment_requirements(self, response: requests.Response) -> Dict[str, Any]:
        """Parse payment requirements from 402 response"""
        try:
            return response.json()
        except ValueError:
            # Fallback to headers
            return {
                "payTo": response.headers.get("X-402-Pay-To"),
                "amount": response.headers.get("X-402-Amount", "0"),
                "nonce": response.headers.get("X-402-Nonce", str(int(time.time())))
            }
    
    def _get_usdc_address(self, facilitator: Dict, chain_id: int) -> str:
        """Get USDC contract address for chain"""
        usdc = facilitator["usdc"]
        if isinstance(usdc, dict):
            return usdc.get(chain_id, usdc[list(usdc.keys())[0]])
        return usdc
    
    def _get_chain_name(self, chain_id: int) -> str:
        """Get human-readable chain name"""
        chains = {
            1: "Ethereum",
            137: "Polygon",
            8453: "Base",
            42161: "Arbitrum",
            10: "Optimism"
        }
        return chains.get(chain_id, f"Chain {chain_id}")
    
    def get_supported_chains(self) -> Dict[str, List[int]]:
        """Get supported chains per facilitator"""
        return {
            facilitator_type.value: config["chains"]
            for facilitator_type, config in self.FACILITATORS.items()
        }
    
    def get_agent_info(self) -> Dict[str, Any]:
        """Get agent configuration info"""
        return {
            "address": self.agent_address,
            "preferred_chain": self._get_chain_name(self.preferred_chain),
            "facilitators": [f.value for f in self.facilitator_priority],
            "supported_chains": self.get_supported_chains()
        }
