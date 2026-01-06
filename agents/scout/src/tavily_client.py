"""
Tavily Search Integration - Official Implementation
Based on Tavily API Documentation: https://docs.tavily.com/

Following official best practices:
- Bearer token authentication
- Proper request/response handling
- All official parameters supported
- Real data, no mocks
"""
import asyncio
import aiohttp
import os
import json
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass

@dataclass
class TavilySearchResult:
    """Official Tavily search result structure"""
    title: str
    url: str
    content: str
    score: float
    raw_content: Optional[str] = None
    favicon: Optional[str] = None

@dataclass
class TavilyResponse:
    """Official Tavily API response structure"""
    query: str
    answer: Optional[str]
    images: List[Dict]
    results: List[TavilySearchResult]
    response_time: str
    auto_parameters: Optional[Dict]
    usage: Dict
    request_id: str

class TavilyClient:
    """
    Official Tavily API Client
    
    Implements all features from Tavily documentation:
    - Search depth control (basic/advanced/fast/ultra-fast)
    - Answer generation
    - Image search
    - Domain filtering
    - Time range filtering
    - Topic categorization (general/news/finance)
    """
    
    BASE_URL = "https://api.tavily.com"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Tavily client
        
        Args:
            api_key: Tavily API key (tvly-xxx). If not provided, reads from TAVILY_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        
        if not self.api_key:
            raise ValueError("Tavily API key is required. Set TAVILY_API_KEY environment variable or pass api_key parameter.")
        
        self.total_credits_used = 0
        
    async def search(
        self,
        query: str,
        search_depth: Literal["basic", "advanced", "fast", "ultra-fast"] = "basic",
        max_results: int = 5,
        topic: Literal["general", "news", "finance"] = "general",
        time_range: Optional[Literal["day", "week", "month", "year", "d", "w", "m", "y"]] = None,
        include_answer: bool = True,
        include_raw_content: bool = False,
        include_images: bool = False,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
        country: Optional[str] = None,
    ) -> TavilyResponse:
        """
        Execute a Tavily search query
        
        Args:
            query: The search query
            search_depth: Controls latency vs relevance
                - basic: Balanced (1 credit)
                - advanced: Highest relevance (2 credits)
                - fast: Low latency (1 credit)
                - ultra-fast: Minimum latency (1 credit)
            max_results: Maximum number of results (0-20)
            topic: Category of search (general/news/finance)
            time_range: Filter by time (day/week/month/year)
            include_answer: Include LLM-generated answer
            include_raw_content: Include cleaned HTML content
            include_images: Include related images
            include_domains: Domain whitelist (max 300)
            exclude_domains: Domain blacklist (max 150)
            country: Boost results from specific country
        
        Returns:
            TavilyResponse with search results
        """
        endpoint = f"{self.BASE_URL}/search"
        
        # Build request payload following official docs
        payload = {
            "query": query,
            "search_depth": search_depth,
            "max_results": max_results,
            "topic": topic,
            "include_answer": include_answer,
            "include_raw_content": include_raw_content,
            "include_images": include_images,
        }
        
        # Add optional parameters
        if time_range:
            payload["time_range"] = time_range
        if include_domains:
            payload["include_domains"] = include_domains[:300]  # Max 300
        if exclude_domains:
            payload["exclude_domains"] = exclude_domains[:150]  # Max 150
        if country and topic == "general":
            payload["country"] = country
        
        # Official authentication: Bearer token
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(endpoint, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Tavily API error {response.status}: {error_text}")
                    
                    data = await response.json()
                    
                    # Track API credit usage
                    credits_used = data.get("usage", {}).get("credits", 0)
                    self.total_credits_used += credits_used
                    
                    # Parse response following official structure
                    tavily_response = TavilyResponse(
                        query=data.get("query", query),
                        answer=data.get("answer"),
                        images=data.get("images", []),
                        results=[
                            TavilySearchResult(
                                title=r.get("title", ""),
                                url=r.get("url", ""),
                                content=r.get("content", ""),
                                score=r.get("score", 0.0),
                                raw_content=r.get("raw_content"),
                                favicon=r.get("favicon")
                            )
                            for r in data.get("results", [])
                        ],
                        response_time=data.get("response_time", "0"),
                        auto_parameters=data.get("auto_parameters"),
                        usage=data.get("usage", {}),
                        request_id=data.get("request_id", "")
                    )
                    
                    print(f"✅ [Tavily] Search completed")
                    print(f"   Query: {query[:60]}...")
                    print(f"   Results: {len(tavily_response.results)}")
                    print(f"   Credits: {credits_used}")
                    print(f"   Response time: {tavily_response.response_time}s")
                    
                    return tavily_response
                    
        except aiohttp.ClientError as e:
            print(f"❌ [Tavily] Network error: {e}")
            raise
        except Exception as e:
            print(f"❌ [Tavily] Search failed: {e}")
            raise
    
    async def quick_search(self, query: str, max_results: int = 5) -> Dict:
        """
        Simplified search for agent integration
        Returns scout-compatible format
        """
        try:
            response = await self.search(
                query=query,
                search_depth="basic",
                max_results=max_results,
                include_answer=True,
                include_raw_content=False
            )
            
            # Convert to scout-compatible format
            return {
                "source": "tavily",
                "query": response.query,
                "answer": response.answer or "",
                "results": [
                    {
                        "title": r.title,
                        "url": r.url,
                        "content": r.content,
                        "score": r.score
                    }
                    for r in response.results
                ],
                "citations": [r.url for r in response.results],
                "cost_usdc": str(response.usage.get("credits", 0) * 0.02),  # $0.02 per credit
                "credits_used": response.usage.get("credits", 0),
                "paid": True,
                "response_time": response.response_time,
                "request_id": response.request_id
            }
            
        except Exception as e:
            print(f"❌ [Tavily] Quick search failed: {e}")
            return {
                "source": "tavily",
                "query": query,
                "error": str(e),
                "paid": False
            }
    
    def get_total_cost(self) -> float:
        """Calculate total cost based on credits used ($0.02 per credit)"""
        return self.total_credits_used * 0.02
    
    def get_credits_used(self) -> int:
        """Get total API credits consumed"""
        return self.total_credits_used


# Global instance
_tavily_client: Optional[TavilyClient] = None

def get_tavily_client() -> TavilyClient:
    """Get or create Tavily client singleton"""
    global _tavily_client
    if _tavily_client is None:
        _tavily_client = TavilyClient()
    return _tavily_client
