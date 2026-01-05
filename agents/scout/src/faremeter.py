import aiohttp
import json
import asyncio
from eth_account import Account
from eth_account.messages import encode_typed_data
import os
from dataclasses import dataclass

@dataclass
class SimpleResponse:
    """Safe wrapper for aiohttp response data"""
    status: int
    headers: dict
    _body: bytes
    content_type: str
    
    async def json(self):
        return json.loads(self._body)
        
    async def text(self):
        return self._body.decode('utf-8')

class FaremeterClient:
    """
    Faremeter Protocol Client for x402 Payments
    Implements standard EIP-712 payment handshake
    """
    def __init__(self, private_key: str):
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        
    def sign_payment(self, requirements: dict) -> str:
        """Sign EIP-712 payment authorization"""
        # Parse requirements
        chain_id = int(requirements.get('chainId', 137))
        verifying_contract = requirements.get('payTo', requirements.get('recipient'))
        amount = requirements.get('amount', requirements.get('maxAmountRequired'))
        nonce = int(requirements.get('nonce', int(asyncio.get_event_loop().time() * 1000)))
        
        # Domain Helper
        if not verifying_contract or not verifying_contract.startswith('0x'):
             # Fallback for demo/test
             verifying_contract = "0x0000000000000000000000000000000000000000"

        domain = {
            "name": "x402",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": verifying_contract
        }

        # Message Type
        types = {
            "Payment": [
                {"name": "payTo", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "nonce", "type": "uint256"}
            ]
        }

        # Message Data
        message = {
            "payTo": verifying_contract,
            "amount": int(amount), 
            "nonce": nonce
        }
        
        # Sign
        typed_data = {
            "types": types,
            "primaryType": "Payment",
            "domain": domain,
            "message": message
        }
        
        encoded = encode_typed_data(full_message=typed_data)
        signed = self.account.sign_message(encoded)
        
        # Format Header
        payment_header = {
            "signature": signed.signature.hex(),
            "payer": self.address,
            "payTo": verifying_contract,
            "amount": str(amount),
            "nonce": str(nonce)
        }
        
        return json.dumps(payment_header)

    async def fetch_with_payment(
        self, 
        url: str, 
        method: str = "GET", 
        headers: dict = None, 
        body: any = None
    ) -> SimpleResponse:
        """Fetch data from x402-gated endpoint with automatic payment"""
        headers = headers or {}
        
        async with aiohttp.ClientSession() as session:
            # 1. Probe / Initial Request
            async with session.request(
                method=method, 
                url=url, 
                headers=headers, 
                json=body if body else None
            ) as response:
                
                if response.status != 402:
                    return SimpleResponse(
                        status=response.status,
                        headers=dict(response.headers),
                        _body=await response.read(),
                        content_type=response.headers.get('content-type', '')
                    )
                
                # 2. Parse Requirements
                try:
                    resp_json = await response.json()
                except:
                    resp_json = {}
                    
                # Header fallback
                if 'X-Payment-Requirements' in response.headers:
                    requirements = json.loads(response.headers['X-Payment-Requirements'])
                else:
                    requirements = resp_json.get('paymentRequirements', resp_json)
            
                print(f"[Faremeter] Payment required: {requirements.get('amount')} {requirements.get('asset', 'USDC')}")
                
                # 3. Pay
                payment_proof = self.sign_payment(requirements)
                
                # 4. Retry with payment
                headers["X-PAYMENT"] = payment_proof
                
                async with session.request(
                    method=method, 
                    url=url, 
                    headers=headers, 
                    json=body if body else None
                ) as paid_response:
                    return SimpleResponse(
                        status=paid_response.status,
                        headers=dict(paid_response.headers),
                        _body=await paid_response.read(),
                        content_type=paid_response.headers.get('content-type', '')
                    )

