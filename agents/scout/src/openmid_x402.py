"""
OpenMid x402 Client for AetherSwarm Scout Agent

Integrates with OpenMid facilitator on Base Mainnet for:
- Sponsored x402 payments (free gas)
- Automatic ERC-8004 agent registration
- Real-time payment settlement
"""

import requests
from eth_account import Account
from eth_account.messages import encode_typed_data
import time
from typing import Optional, Dict, Any

class OpenMidX402Client:
    """
    x402 payment client using OpenMid facilitator on Base Mainnet
    
    Features:
    - Sponsored transactions (no gas fees)
    - EIP-712 payment signing
    - Automatic ERC-8004 registration
    """
    
    # OpenMid Configuration
    FACILITATOR_URL = "https://facilitator.openmid.xyz"
    CHAIN_ID = 8453  # Base Mainnet
    USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    
    def __init__(self, agent_private_key: str):
        """
        Initialize OpenMid x402 client
        
        Args:
            agent_private_key: Agent's Ethereum private key (0x...)
        """
        if not agent_private_key.startswith('0x'):
            raise ValueError("Private key must start with 0x")
            
        self.agent_private_key = agent_private_key
        self.account = Account.from_key(agent_private_key)
        self.agent_address = self.account.address
        
        print(f"[OpenMid] Initialized x402 client for agent {self.agent_address}")
    
    def fetch_with_payment(self, url: str, max_amount: float = 0.10) -> requests.Response:
        """
        Fetch data from x402-gated API using OpenMid facilitator
        
        Flow:
        1. Request resource → 402 Payment Required
        2. Parse payment requirements
        3. Sign EIP-712 payment authorization
        4. Submit to OpenMid facilitator
        5. Retry with payment proof
        
        Args:
            url: API endpoint (must support x402)
            max_amount: Maximum USDC willing to pay (default: 0.10)
            
        Returns:
            Response from API after payment
            
        Raises:
            ValueError: If payment exceeds max_amount
            Exception: If facilitator verification fails
        """
        print(f"[OpenMid] Fetching {url}...")
        
        # Step 1: Initial request to check for 402
        try:
            initial_response = requests.get(url, timeout=10)
        except requests.RequestException as e:
            print(f"[OpenMid] Request failed: {e}")
            raise
        
        # If not paywalled, return directly
        if initial_response.status_code != 402:
            print(f"[OpenMid] No payment required (status {initial_response.status_code})")
            return initial_response
        
        print(f"[OpenMid] Payment required (402 response)")
        
        # Step 2: Parse payment requirements from 402 response
        try:
            payment_requirements = initial_response.json()
        except ValueError:
            # Try parsing from headers if JSON fails
            payment_requirements = self._parse_payment_headers(initial_response.headers)
        
        pay_to = payment_requirements.get("payTo")
        amount = float(payment_requirements.get("amount", 0))
        nonce = payment_requirements.get("nonce", int(time.time()))
        
        if not pay_to:
            raise ValueError("Payment requirements missing 'payTo' address")
        
        # Verify amount is acceptable
        if amount > max_amount:
            raise ValueError(
                f"Payment required ({amount} USDC) exceeds max ({max_amount} USDC)"
            )
        
        print(f"[OpenMid] Payment: {amount} USDC to {pay_to[:10]}...")
        
        # Step 3: Sign EIP-712 payment authorization
        signature = self._sign_payment(pay_to, amount, nonce)
        
        # Step 4: Verify payment with OpenMid facilitator
        payment_proof = self._verify_with_facilitator(
            signature=signature,
            pay_to=pay_to,
            amount=amount,
            nonce=nonce
        )
        
        # Step 5: Retry request with payment proof
        headers = {
            "X-402-Payment": payment_proof,
            "X-402-Nonce": str(nonce),
            "X-402-Facilitator": self.FACILITATOR_URL
        }
        
        final_response = requests.get(url, headers=headers, timeout=10)
        
        if final_response.status_code == 200:
            print(f"[OpenMid] ✓ Payment successful, data received")
        else:
            print(f"[OpenMid] ✗ Payment accepted but request failed ({final_response.status_code})")
        
        return final_response
    
    def _sign_payment(self, pay_to: str, amount: float, nonce: int) -> str:
        """
        Sign EIP-712 payment authorization
        
        Args:
            pay_to: Recipient address
            amount: Amount in USDC
            nonce: Unique nonce for this payment
            
        Returns:
            Hex-encoded signature
        """
        # EIP-712 Domain
        domain_data = {
            "name": "x402",
            "version": "2",  # OpenMid uses x402 v2
            "chainId": self.CHAIN_ID,
            "verifyingContract": pay_to
        }
        
        # Payment Authorization Type
        message_types = {
            "PaymentAuthorization": [
                {"name": "payTo", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "asset", "type": "address"},
                {"name": "nonce", "type": "uint256"}
            ]
        }
        
        # Message Data
        message_data = {
            "payTo": pay_to,
            "amount": int(amount * 1e6),  # Convert to USDC base units (6 decimals)
            "asset": self.USDC_BASE,
            "nonce": nonce
        }
        
        # Sign
        signable_message = encode_typed_data(domain_data, message_types, message_data)
        signed_message = Account.sign_message(signable_message, self.agent_private_key)
        signature = signed_message.signature.hex()
        
        print(f"[OpenMid] Signed EIP-712 payment authorization")
        return signature
    
    def _verify_with_facilitator(
        self,
        signature: str,
        pay_to: str,
        amount: float,
        nonce: int
    ) -> str:
        """
        Submit payment to OpenMid facilitator for verification and settlement
        
        Args:
            signature: EIP-712 signature
            pay_to: Recipient address
            amount: Amount in USDC
            nonce: Payment nonce
            
        Returns:
            Payment proof for API request
            
        Raises:
            Exception: If facilitator verification fails
        """
        payload = {
            "signature": signature,
            "message": {
                "payTo": pay_to,
                "amount": int(amount * 1e6),
                "asset": self.USDC_BASE,
                "nonce": nonce
            },
            "domain": {
                "name": "x402",
                "version": "2",
                "chainId": self.CHAIN_ID,
                "verifyingContract": pay_to
            },
            "agentAddress": self.agent_address  # For ERC-8004 registration
        }
        
        try:
            response = requests.post(
                f"{self.FACILITATOR_URL}/verify",
                json=payload,
                timeout=10
            )
        except requests.RequestException as e:
            raise Exception(f"Facilitator request failed: {e}")
        
        if response.status_code != 200:
            raise Exception(
                f"Facilitator verification failed ({response.status_code}): {response.text}"
            )
        
        verification = response.json()
        payment_proof = verification.get("proof") or verification.get("paymentProof")
        
        if not payment_proof:
            raise Exception("Facilitator did not return payment proof")
        
        print(f"[OpenMid] ✓ Payment verified by facilitator")
        
        # Check if agent was registered to ERC-8004
        if verification.get("agentRegistered"):
            print(f"[OpenMid] ✓ Agent registered to ERC-8004 registry on Base")
        
        return payment_proof
    
    def _parse_payment_headers(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Parse payment requirements from HTTP headers (fallback)
        
        Args:
            headers: Response headers
            
        Returns:
            Payment requirements dict
        """
        return {
            "payTo": headers.get("X-402-Pay-To"),
            "amount": headers.get("X-402-Amount", "0"),
            "nonce": headers.get("X-402-Nonce", str(int(time.time())))
        }
    
    def get_agent_info(self) -> Dict[str, str]:
        """
        Get agent wallet information
        
        Returns:
            Dict with address and network info
        """
        return {
            "address": self.agent_address,
            "network": "Base Mainnet",
            "chainId": str(self.CHAIN_ID),
            "facilitator": self.FACILITATOR_URL
        }
