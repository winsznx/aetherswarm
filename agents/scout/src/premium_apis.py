"""
Premium API Integration - Production Implementation with Rate Limiting
Uses official Tavily client with robust safety measures
Prevents excessive API usage through multiple layers of protection
"""
import asyncio
import os
from typing import Dict, Optional
from .tavily_client import get_tavily_client, TavilyClient
from .rate_limiter import get_rate_limiter, RateLimiter

class PremiumAPIClient:
    """
    Premium API client with rate limiting and caching
    
    Safety Features:
    - Request throttling (5/min, 50/hr, 200/day)
    - Response caching (1 hour TTL)
    - Per-quest limits (max 3 calls)
    - Daily budget ($1/day)
    - Circuit breaker on failures
    
    Integrated APIs:
    - Tavily Search (official client)
    """
    
    def __init__(self, x402_client=None):
        """
        Initialize with rate limiting
        
        Args:
            x402_client: Optional X402Client from main.py
        """
        self.x402_client = x402_client
        self.quest_wallet = None
        self.current_quest_id = None
        
        # Initialize rate limiter
        self.rate_limiter: RateLimiter = get_rate_limiter()
        
        # Initialize Tavily if key is available
        self.tavily_client: Optional[TavilyClient] = None
        if os.getenv("TAVILY_API_KEY"):
            try:
                self.tavily_client = get_tavily_client()
                print("✅ [Premium] Tavily client initialized with rate limiting")
            except Exception as e:
                print(f"⚠️  [Premium] Tavily init failed: {e}")
        
    def set_quest_wallet(self, wallet_address: str):
        """Set the quest wallet for payments"""
        self.quest_wallet = wallet_address
        print(f"[Premium] Quest wallet set: {wallet_address}")
    
    def set_quest_id(self, quest_id: str):
        """Set current quest ID for rate limiting"""
        self.current_quest_id = quest_id
        print(f"[Premium] Quest ID set: {quest_id}")
        
    async def tavily_search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic"
    ) -> Dict:
        """
        Search using Tavily with rate limiting
        
        Args:
            query: Search query
            max_results: Number of results (1-20)
            search_depth: basic/advanced/fast/ultra-fast
        
        Returns:
            Scout-compatible result dict
        """
        if not self.tavily_client:
            raise ValueError("Tavily client not initialized. Check TAVILY_API_KEY.")
        
        # Calculate cost based on search depth
        cost = 0.04 if search_depth == "advanced" else 0.02
        
        # Check cache first
        cache_params = {"max_results": max_results, "search_depth": search_depth}
        cached_result = self.rate_limiter.get_cached(query, cache_params)
        if cached_result:
            print(f"💰 [Cache] Saved ${cost} (cached result)")
            return cached_result
        
        # Check rate limits
        try:
            await self.rate_limiter.check_rate_limit(
                quest_id=self.current_quest_id,
                cost=cost
            )
        except Exception as e:
            print(f"🚫 [RateLimit] Request blocked: {e}")
            # Return error response instead of raising
            return {
                "source": "tavily",
                "query": query,
                "error": f"Rate limit: {str(e)}",
                "paid": False,
                "rate_limited": True
            }
        
        try:
            # Make API call
            result = await self.tavily_client.quick_search(query, max_results)
            
            # Record successful request
            await self.rate_limiter.record_request(
                quest_id=self.current_quest_id,
                cost=cost,
                success=True
            )
            
            # Cache the result
            self.rate_limiter.set_cache(query, result, cache_params)
            
            # Log stats
            stats = self.rate_limiter.get_stats()
            print(f"✅ [Tavily] Search completed")
            print(f"   Results: {len(result.get('results', []))}")
            print(f"   Cost: ${result.get('cost_usdc', '0')}")
            print(f"   Today: {stats['requests_last_day']} requests, ${stats['cost_today']:.2f}")
            print(f"   Budget remaining: ${stats['budget_remaining']:.2f}")
            
            return result
            
        except Exception as e:
            # Record failed request
            await self.rate_limiter.record_request(
                quest_id=self.current_quest_id,
                cost=0,  # Don't charge for failures
                success=False
            )
            
            print(f"❌ [Tavily] Search failed: {e}")
            return {
                "source": "tavily",
                "query": query,
                "error": str(e),
                "paid": False
            }
    
    async def intelligent_research(
        self,
        query: str,
        budget_usdc: float = 0.10
    ) -> Dict:
        """
        Intelligently route research with rate limiting
        
        Args:
            query: Research query
            budget_usdc: Maximum budget (currently ignored, using daily budget)
        
        Returns:
            Research results or rate limit error
        """
        query_lower = query.lower()
        
        # Use Tavily for all queries
        if self.tavily_client:
            try:
                # Determine search depth based on query complexity
                if any(word in query_lower for word in ["detailed", "comprehensive", "analyze", "explain"]):
                    search_depth = "advanced"  # 2 credits, $0.04
                    max_results = 10
                else:
                    search_depth = "basic"  # 1 credit, $0.02
                    max_results = 5
                
                result = await self.tavily_search(
                    query=query,
                    max_results=max_results,
                    search_depth=search_depth
                )
                
                return result
                
            except Exception as e:
                print(f"⚠️  [Premium] Tavily failed: {e}")
                return {
                    "source": "tavily",
                    "query": query,
                    "error": str(e),
                    "paid": False
                }
        
        # No API available
        raise ValueError("No premium APIs configured. Add TAVILY_API_KEY to .env")
    
    async def get_total_costs(self) -> float:
        """Get total costs including today's spend"""
        stats = self.rate_limiter.get_stats()
        return stats['cost_today']
    
    def get_available_apis(self) -> list:
        """Get list of available API services"""
        apis = []
        
        if self.tavily_client:
            apis.append("tavily")
        
        return apis
    
    def get_rate_limit_stats(self) -> Dict:
        """Get current rate limiting statistics"""
        return self.rate_limiter.get_stats()
    
    def complete_quest(self, quest_id: str):
        """Reset quest-specific limits when quest completes"""
        self.rate_limiter.reset_quest_limit(quest_id)
        print(f"[Premium] Quest {quest_id} limits reset")


# Global instance
_premium_client: Optional[PremiumAPIClient] = None

def get_premium_client(x402_client=None) -> PremiumAPIClient:
    """Get or create premium API client singleton"""
    global _premium_client
    if _premium_client is None:
        _premium_client = PremiumAPIClient(x402_client)
    return _premium_client
