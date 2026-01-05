"""
Rate Limiter & Cache for Premium APIs
Prevents excessive API usage and costs

Safety Features:
- Request throttling (max requests per minute/hour/day)
- Response caching (avoid duplicate queries)
- Per-quest limits
- Cost tracking and budgets
- Circuit breaker for failures
"""
import asyncio
import hashlib
import time
from typing import Dict, Optional, Any
from collections import deque
from dataclasses import dataclass
import json

@dataclass
class RateLimit:
    """Rate limit configuration"""
    max_per_minute: int = 5      # Max 5 requests per minute
    max_per_hour: int = 50        # Max 50 requests per hour
    max_per_day: int = 200        # Max 200 requests per day (well under 1000 free tier)
    max_per_quest: int = 3        # Max 3 API calls per quest

class RateLimiter:
    """
    Prevents API abuse with multiple safety layers
    
    Features:
    - Time-based throttling
    - Request counting
    - Cost budgets
    - Query caching (1 hour TTL)
    - Circuit breaker
    """
    
    def __init__(self, limits: RateLimit = None):
        self.limits = limits or RateLimit()
        
        # Request tracking
        self.requests_minute = deque()  # Timestamps of requests in last minute
        self.requests_hour = deque()    # Timestamps of requests in last hour
        self.requests_day = deque()     # Timestamps of requests in last day
        self.requests_per_quest: Dict[str, int] = {}  # quest_id -> count
        
        # Cache: hash(query) -> (result, timestamp)
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.cache_ttl = 3600  # 1 hour cache
        
        # Circuit breaker
        self.failures = 0
        self.max_failures = 5
        self.circuit_broken_until = 0
        
        # Cost tracking
        self.total_cost_today = 0.0
        self.daily_budget = 1.0  # $1 max per day
        self.last_reset = time.time()
        
        print("✅ [RateLimiter] Initialized")
        print(f"   Max per minute: {self.limits.max_per_minute}")
        print(f"   Max per hour: {self.limits.max_per_hour}")
        print(f"   Max per day: {self.limits.max_per_day}")
        print(f"   Max per quest: {self.limits.max_per_quest}")
        print(f"   Daily budget: ${self.daily_budget}")
        print(f"   Cache TTL: {self.cache_ttl}s")
    
    def _clean_old_requests(self):
        """Remove old request timestamps"""
        now = time.time()
        
        # Clean minute window
        while self.requests_minute and now - self.requests_minute[0] > 60:
            self.requests_minute.popleft()
        
        # Clean hour window
        while self.requests_hour and now - self.requests_hour[0] > 3600:
            self.requests_hour.popleft()
        
        # Clean day window
        while self.requests_day and now - self.requests_day[0] > 86400:
            self.requests_day.popleft()
        
        # Reset daily budget if new day
        if now - self.last_reset > 86400:
            self.total_cost_today = 0.0
            self.last_reset = now
            print("[RateLimiter] Daily budget reset")
    
    def _get_cache_key(self, query: str, params: Dict = None) -> str:
        """Generate cache key from query and parameters"""
        cache_data = {
            "query": query.lower().strip(),
            "params": params or {}
        }
        cache_str = json.dumps(cache_data, sort_keys=True)
        return hashlib.sha256(cache_str.encode()).hexdigest()
    
    def get_cached(self, query: str, params: Dict = None) -> Optional[Any]:
        """Get cached result if available and not expired"""
        cache_key = self._get_cache_key(query, params)
        
        if cache_key in self.cache:
            result, timestamp = self.cache[cache_key]
            
            # Check if expired
            if time.time() - timestamp < self.cache_ttl:
                print(f"✅ [Cache HIT] {query[:50]}...")
                return result
            else:
                # Expired, remove
                del self.cache[cache_key]
                print(f"⏰ [Cache EXPIRED] {query[:50]}...")
        
        print(f"❌ [Cache MISS] {query[:50]}...")
        return None
    
    def set_cache(self, query: str, result: Any, params: Dict = None):
        """Cache a result"""
        cache_key = self._get_cache_key(query, params)
        self.cache[cache_key] = (result, time.time())
        
        # Limit cache size to 100 entries
        if len(self.cache) > 100:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
    
    async def check_rate_limit(self, quest_id: Optional[str] = None, cost: float = 0.02) -> bool:
        """
        Check if request is allowed under rate limits
        
        Returns:
            True if allowed, False if rate limited
        
        Raises:
            Exception with reason if blocked
        """
        self._clean_old_requests()
        now = time.time()
        
        # Check circuit breaker
        if now < self.circuit_broken_until:
            remaining = int(self.circuit_broken_until - now)
            raise Exception(f"Circuit breaker active. Wait {remaining}s before retrying.")
        
        # Check daily budget
        if self.total_cost_today + cost > self.daily_budget:
            raise Exception(f"Daily budget exceeded (${self.total_cost_today:.2f}/${self.daily_budget})")
        
        # Check per-minute limit
        if len(self.requests_minute) >= self.limits.max_per_minute:
            raise Exception(f"Rate limit: Max {self.limits.max_per_minute} requests per minute")
        
        # Check per-hour limit
        if len(self.requests_hour) >= self.limits.max_per_hour:
            raise Exception(f"Rate limit: Max {self.limits.max_per_hour} requests per hour")
        
        # Check per-day limit
        if len(self.requests_day) >= self.limits.max_per_day:
            raise Exception(f"Rate limit: Max {self.limits.max_per_day} requests per day")
        
        # Check per-quest limit
        if quest_id:
            quest_count = self.requests_per_quest.get(quest_id, 0)
            if quest_count >= self.limits.max_per_quest:
                raise Exception(f"Quest limit: Max {self.limits.max_per_quest} requests per quest")
        
        return True
    
    async def record_request(self, quest_id: Optional[str] = None, cost: float = 0.02, success: bool = True):
        """Record a request for rate limiting"""
        now = time.time()
        
        # Add to tracking queues
        self.requests_minute.append(now)
        self.requests_hour.append(now)
        self.requests_day.append(now)
        
        # Track per-quest
        if quest_id:
            self.requests_per_quest[quest_id] = self.requests_per_quest.get(quest_id, 0) + 1
        
        # Track cost
        if success:
            self.total_cost_today += cost
            self.failures = 0  # Reset failure counter on success
        else:
            self.failures += 1
            
            # Activate circuit breaker after too many failures
            if self.failures >= self.max_failures:
                self.circuit_broken_until = now + 60  # 1 minute cooldown
                print(f"⚠️  [Circuit Breaker] Activated for 60s after {self.failures} failures")
    
    def get_stats(self) -> Dict:
        """Get current rate limit statistics"""
        self._clean_old_requests()
        
        return {
            "requests_last_minute": len(self.requests_minute),
            "requests_last_hour": len(self.requests_hour),
            "requests_last_day": len(self.requests_day),
            "cost_today": self.total_cost_today,
            "budget_remaining": self.daily_budget - self.total_cost_today,
            "cache_size": len(self.cache),
            "circuit_broken": time.time() < self.circuit_broken_until,
            "failures": self.failures
        }
    
    def reset_quest_limit(self, quest_id: str):
        """Reset request count for a quest (call when quest completes)"""
        if quest_id in self.requests_per_quest:
            del self.requests_per_quest[quest_id]


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None

def get_rate_limiter() -> RateLimiter:
    """Get or create rate limiter singleton"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter
