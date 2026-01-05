"""
Premium API Integration Wrapper for Scout Agent
FIXED VERSION - Uses corrected premium_apis.py
"""

import asyncio
import json
from typing import Dict, List, Optional
import hashlib

# Import premium API client (now fixed)
try:
    try:
        from .premium_apis import get_premium_client, PremiumAPIClient
    except ImportError:
        from premium_apis import get_premium_client, PremiumAPIClient

    PREMIUM_APIS_AVAILABLE = True
    print("✅ Premium APIs module loaded successfully")
except ImportError as e:
    print(f"⚠️  Premium APIs module not found: {e}")
    PREMIUM_APIS_AVAILABLE = False


class ScoutPremiumIntegration:
    """Integrates premium APIs into scout agent workflow"""

    def __init__(self, agent_id: Optional[int] = None, x402_client=None):
        self.agent_id = agent_id
        self.premium_client: Optional[PremiumAPIClient] = None

        if PREMIUM_APIS_AVAILABLE:
            self.premium_client = get_premium_client(x402_client)
            print(f"✅ [Scout] Premium API client initialized for agent #{agent_id}")
        else:
            print("⚠️  [Scout] Premium APIs not available - fallback mode")

    def set_quest_wallet(self, wallet_address: str):
        """Set the quest wallet for x402 payments"""
        if self.premium_client:
            self.premium_client.set_quest_wallet(wallet_address)
            print(f"✅ [Scout] Quest wallet set: {wallet_address}")

    async def intelligent_research(self, query: str, budget_usdc: float = 0.10) -> Dict:
        """
        Perform intelligent research using premium APIs

        Returns structured data with payment proofs (Dict format matching premium_apis.py)
        """
        if not self.premium_client:
            print("⚠️  [Scout] No premium client, skipping paid search")
            return {
                "source": "premium-api",
                "query": query,
                "error": "No premium client available",
                "paid": False,
            }

        # Check if we have API keys configured
        import os

        has_perplexity = bool(os.getenv("PERPLEXITY_API_KEY"))
        has_tavily = bool(os.getenv("TAVILY_API_KEY"))

        if not (has_perplexity or has_tavily):
            print("⚠️  [Scout] No premium API keys configured")
            return {
                "source": "premium-api",
                "query": query,
                "error": "No API keys configured",
                "paid": False,
            }

        try:
            # Use intelligent routing from premium_apis.py
            result = await self.premium_client.intelligent_research(query, budget_usdc)

            # Return result directly (already in correct format from premium_apis.py)
            return result

        except Exception as e:
            print(f"❌ [Scout] Premium search exception: {e}")
            return {
                "source": "premium-api",
                "query": query,
                "error": str(e),
                "paid": False,
            }

    async def get_total_spent(self) -> float:
        """Get total USDC spent on premium APIs this session"""
        if self.premium_client:
            return await self.premium_client.get_total_costs()
        return 0.0

    def set_quest_id(self, quest_id: str):
        """Set current quest ID for rate limiting"""
        if self.premium_client:
            self.premium_client.set_quest_id(quest_id)

    def complete_quest(self, quest_id: str):
        """Reset quest-specific limits when quest completes"""
        if self.premium_client:
            self.premium_client.complete_quest(quest_id)

    def get_rate_limit_stats(self) -> Dict:
        """Get current rate limiting statistics"""
        if self.premium_client:
            return self.premium_client.get_rate_limit_stats()
        return {"requests_last_day": 0, "cost_today": 0.0, "budget_remaining": 0.0}


# Global instance for easy import
_integration: Optional[ScoutPremiumIntegration] = None


def get_premium_integration(
    agent_id: Optional[int] = None, x402_client=None
) -> ScoutPremiumIntegration:
    """Get or create premium integration singleton"""
    global _integration
    if _integration is None:
        _integration = ScoutPremiumIntegration(agent_id, x402_client)
    return _integration
