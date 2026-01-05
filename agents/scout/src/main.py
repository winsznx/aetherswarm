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
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from pathlib import Path
from eth_account import Account
from eth_account.messages import encode_typed_data
import aiohttp
import websockets
from dotenv import load_dotenv

load_dotenv()

# Premium API integration with rate limiting
try:
    try:
        from src.premium_integration import get_premium_integration
        from src.faremeter import FaremeterClient
    except ImportError:
        from premium_integration import get_premium_integration
        from faremeter import FaremeterClient
        
    PREMIUM_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Premium integration not available: {e}")
    PREMIUM_AVAILABLE = False


class ScoutAgent:
    """
    AetherSwarm Scout Agent
    
    Responsibilities:
    - Connect to Swarm Coordinator via WebSocket
    - Receive query_quest tasks
    - Fetch data from paywalled APIs using x402 (Faremeter)
    - Return results with payment proofs
    """
    
    def __init__(self):
        self.coordinator_url = os.getenv("COORDINATOR_WS_URL", "ws://localhost:8080")
        self.private_key = os.getenv("AGENT_PRIVATE_KEY")
        self.agent_id = os.getenv("AGENT_ID", "scout-001")
        
        if not self.private_key:
            # Generate a random private key for development
            print("[Scout] ⚠️  AGENT_PRIVATE_KEY not set, generating random key (DEV MODE)")
            from eth_account import Account
            import secrets
            account = Account.create(secrets.token_hex(32))
            self.private_key = account.key.hex()
            print(f"[Scout] Generated address: {account.address}")
        else:
            print(f"[Scout] Using configured private key")
        
        try:
            self.x402_client = FaremeterClient(self.private_key)
            print(f"[Scout] x402 client initialized with address: {self.x402_client.address}")
        except Exception as e:
            print(f"[Scout] Error initializing x402 client: {e}")
            import traceback
            traceback.print_exc()
            self.x402_client = None
            print("[Scout] Warning: Running without x402 client (cannot process paid quests)")
        
        self.ws = None
        
        # Initialize premium API client with rate limiting
        if PREMIUM_AVAILABLE:
            try:
                # Load ERC-8004 agent ID if registered
                agent_json_path = Path(__file__).parent.parent / '.scout_agent.json'
                erc8004_agent_id = 1  # Default
                
                if agent_json_path.exists():
                    with open(agent_json_path, 'r') as f:
                        agent_info = json.load(f)
                        erc8004_agent_id = agent_info.get('agentId', 1)
                        print(f"[Scout] Loaded ERC-8004 Agent ID: {erc8004_agent_id}")
                
                self.premium = get_premium_integration(
                    agent_id=erc8004_agent_id,
                    x402_client=self.x402_client
                )
                print("[Scout] ✅ Premium API integration ready with rate limiting")
            except Exception as e:
                print(f"[Scout] ⚠️  Premium integration failed: {e}")
                self.premium = None
        else:
            self.premium = None

        
    async def connect(self):
        """Connect to Swarm Coordinator and register as Scout"""
        print(f"[Scout] Connecting to coordinator: {self.coordinator_url}")
        
        self.ws = await websockets.connect(self.coordinator_url)
        
        # Register with coordinator
        registration = {
            "type": "register",
            "role": "scout",
            "agentId": self.agent_id,
            "address": self.x402_client.address if self.x402_client else "0x0000000000000000000000000000000000000000",
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
        
        # Handle registration confirmation
        if task_type == "registered":
            print("[Scout] Registration confirmed by coordinator")
            return
        
        # Handle ping
        if task_type == "ping":
            pong = {
                "type": "pong",
                "agentId": self.agent_id
            }
            await self.ws.send(json.dumps(pong))
            print("[Scout] Responded to ping")
            return
        
        if task_type == "query_quest":
            results = []
            payment_proofs = []
            
            sources = task.get("sources", [])
            objective = task.get("objective", "")
            
            # Set quest wallet and ID for rate limiting
            if self.premium:
                wallet_address = task.get("walletAddress")
                if wallet_address:
                    self.premium.set_quest_wallet(wallet_address)
                    print(f"[Scout] Quest wallet set: {wallet_address}")
                
                if quest_id:
                    self.premium.set_quest_id(quest_id)
                    print(f"[Scout] Quest ID set for rate limiting: {quest_id}")

            
            for source_url in sources:
                # SKIP default test URL if we have an objective
                if  "faremeter.com" in source_url and objective:
                    continue

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
            
            # If no results (or skipped default), perform REAL Search based on objective
            if not results and objective:
                print(f"[Scout] No direct sources found. Performing REAL search for: {objective}")
                real_results = await self._perform_real_search(objective)
                results.extend(real_results)

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
            
            # Reset quest limits after completion
            if self.premium and quest_id:
                self.premium.complete_quest(quest_id)
                print(f"[Scout] Quest {quest_id} rate limits reset")
        else:
            print(f"[Scout] Unknown task type: {task_type}")


    async def _perform_real_search(self, query: str) -> List[Dict]:
        """
        PRODUCTION-READY SEARCH PRIORITY SYSTEM:
        
        Priority 0: Fast Path (Free) - Simple factual queries
        Priority 1: Premium External APIs - Complex research requiring analysis
        Priority 2: Internal x402 Demo - Only for explicit premium requests
        Priority 3: Free Fallback - Web scraping, public APIs
        """
        query_lower = query.lower()
        results = []
        timestamp = int(asyncio.get_event_loop().time())
        
        # === PRIORITY 0: Fast Path (Free) ===
        # Simple factual data that doesn't require analysis
        # Examples: "btc price", "eth market cap", "weather in NYC"
        
        # Check for crypto price queries
        crypto_keywords = ["price", "market cap", "value", "worth"]
        crypto_coins = ["btc", "eth", "bitcoin", "ethereum", "stacks", "solana"]
        
        is_simple_crypto_query = (
            any(coin in query_lower for coin in crypto_coins) and
            any(kw in query_lower for kw in crypto_keywords) and
            "analysis" not in query_lower and
            "research" not in query_lower and
            "why" not in query_lower
        )
        
        if is_simple_crypto_query:
            crypto_result = await self._check_crypto_price(query)
            if crypto_result:
                print(f"✅ [Scout] Fast path: Found crypto price for '{query}'")
                return crypto_result

        # === PRIORITY 1: Premium External APIs (Tavily) ===
        # Complex queries requiring research, analysis, or synthesis
        # Examples: "market analysis for eth", "why is btc rising", "defi trends 2026"
        
        requires_analysis = any(kw in query_lower for kw in [
            "analysis", "research", "who", "what", "why", "how", "explain", "trends", 
            "compare", "best", "should", "recommend"
        ])
        
        if self.premium and (requires_analysis or len(query.split()) > 4):
            try:
                print(f"[Scout] Complex query detected, using premium search...")
                premium_results = await self.premium.intelligent_research(query, budget_usdc=0.10)
                
                if premium_results.get('error'):
                    error_msg = premium_results.get('error', 'Unknown error')
                    if premium_results.get('rate_limited'):
                        print(f"⚠️  [Scout] Rate limited: {error_msg}")
                    else:
                        print(f"⚠️  [Scout] Premium API error: {error_msg}")
                    print(f"    Falling back to free APIs...")
                else:
                    print(f"✅ [Scout] Premium search successful!")
                    
                    scout_result = {
                        "source": premium_results.get("source", "tavily"),
                        "data": {
                            "query": premium_results.get("query", query),
                            "answer": premium_results.get("answer", ""),
                            "results": premium_results.get("results", []),
                            "citations": premium_results.get("citations", [])
                        },
                        "hash": hashlib.sha256(
                            json.dumps(premium_results, sort_keys=True).encode()
                        ).hexdigest(),
                        "timestamp": timestamp,
                        "paid": premium_results.get("paid", True),
                        "payment_proof": premium_results.get("payment_proof", {})
                    }
                    
                    results.append(scout_result)
                    
                    stats = self.premium.get_rate_limit_stats()
                    print(f"📊 [RateLimit] Today: {stats['requests_last_day']} requests, ${stats['cost_today']:.2f}")
                    
                    return results
                    
            except Exception as e:
                print(f"❌ [Scout] Premium search exception: {e}")
                print(f"    Falling back to free APIs...")
        
        # === PRIORITY 2: Internal x402 Demo (Optional) ===
        # Only triggered by explicit "premium" or "x402" keywords
        # This showcases the payment protocol without interfering with normal queries
        
        if "premium" in query_lower or "x402" in query_lower or "paid data" in query_lower:
            print(f"[Scout] Explicit premium request, checking internal x402 endpoint...")
            internal_result = await self._check_internal_knowledge_base(query)
            if internal_result:
                results.append(internal_result)
                print(f"✅ [Scout] Internal x402 search successful!")
                return results
        
        # === PRIORITY 3: Free Fallback ===
        print(f"[Scout] Using free API fallback...")
        
        print(f"[Scout] 🔍 Autonomous search for: {query}")
        
        try:
            # Step 1: Search the web for relevant APIs/sources
            discovered_sources = await self._discover_sources(query)
            
            # Step 2: Try each discovered source
            for source in discovered_sources[:3]:  # Top 3 results
                try:
                    print(f"[Scout] Trying source: {source['url']}")
                    
                    # Check for x402 support first (OPTIONS request)
                    is_x402 = await self._check_x402_support(source['url'])
                    
                    if is_x402:
                        # Premium x402 endpoint - pay for data
                        print(f"[Scout] ✓ x402-enabled endpoint found, paying for data...")
                        data = await self._fetch_with_x402(source['url'], query)
                    else:
                        # Free endpoint - attempt direct fetch
                        print(f"[Scout] Free endpoint, fetching...")
                        data = await self._fetch_free(source['url'])
                    
                    if data:
                        results.append({
                            "source": source['url'],
                            "title": source.get('title', 'Unknown'),
                            "data": data,
                            "hash": hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest(),
                            "timestamp": timestamp,
                            "paid": is_x402
                        })
                        print(f"[Scout] ✓ Got data from {source['url']}")
                        
                except Exception as e:
                    print(f"[Scout] Failed to fetch from {source['url']}: {e}")
                    continue
            
            # Step 3: If no results, try fallback knowledge bases
            if not results:
                print(f"[Scout] No discovered sources, trying fallbacks...")
                fallback_data = await self._try_fallback_sources(query)
                if fallback_data:
                    results.extend(fallback_data)
            
            # Step 4: Emergency fallback to known reliable free APIs (HackerNews only now)
            if not results:
                print(f"[Scout] Still no data, using emergency fallback APIs...")
                emergency_data = await self._emergency_fallback(query)
                if emergency_data:
                    results.extend(emergency_data)
                    
        except Exception as e:
            print(f"[Scout] Search error: {e}")
        
        return results

    async def _check_crypto_price(self, query: str) -> Optional[List[Dict]]:
        """Check Coingecko for crypto prices"""
        timestamp = int(asyncio.get_event_loop().time())
        query_lower = query.lower()
        results = []

        crypto_keywords = ["price", "market", "value", "btc", "eth", "bitcoin", "ethereum", "crypto", "coin"]
        if not any(kw in query_lower for kw in crypto_keywords):
            return None

        try:
            # Comprehensive coin detection with priority for longer matches
            coin_map = {
                "bitcoin": "bitcoin",
                "ethereum": "ethereum", 
                "stacks": "blockstack",
                "solana": "solana",
                "binance": "binancecoin",
                "cardano": "cardano",
                "ripple": "ripple",
                "dogecoin": "dogecoin",
                "avalanche": "avalanche-2",
                "polkadot": "polkadot",
                "polygon": "matic-network",
                "chainlink": "chainlink",
                "cosmos": "cosmos",
                # Shorter symbols after full names
                "btc": "bitcoin",
                "eth": "ethereum",
                "stx": "blockstack",
                "sol": "solana",
                "bnb": "binancecoin",
                "ada": "cardano",
                "xrp": "ripple",
                "doge": "dogecoin",
                "avax": "avalanche-2",
                "dot": "polkadot",
                "matic": "matic-network",
                "link": "chainlink",
                "atom": "cosmos"
            }
            
            # Try to extract coin name from query - prioritize longer matches
            coin_id = None
            best_match = ""
            for keyword, coingecko_id in coin_map.items():
                if keyword in query_lower and len(keyword) > len(best_match):
                    # Basic boundary check (ensure 'bit' doesn't match 'bitcoin' in query if query is just 'bit')
                    # ideally we'd use regex but simple len check is usually ok for these keywords
                    coin_id = coingecko_id
                    best_match = keyword
            
            if not coin_id:
                return None

            print(f"[Scout] Detected coin: {coin_id} (matched: '{best_match}')")
            
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        coin_data = data.get(coin_id, {})
                        
                        if coin_data:
                            # Proper display names
                            name_map = {
                                "bitcoin": "Bitcoin",
                                "ethereum": "Ethereum",
                                "blockstack": "Stacks",
                                "solana": "Solana",
                                "binancecoin": "BNB",
                                "cardano": "Cardano",
                                "ripple": "XRP",
                                "dogecoin": "Dogecoin",
                                "avalanche-2": "Avalanche",
                                "polkadot": "Polkadot",
                                "matic-network": "Polygon",
                                "chainlink": "Chainlink",
                                "cosmos": "Cosmos"
                            }
                            
                            market_data = {
                                "name": name_map.get(coin_id, coin_id.title()),
                                "current_price_usd": coin_data.get("usd", 0),
                                "market_cap_usd": coin_data.get("usd_market_cap", 0),
                                "price_change_24h": coin_data.get("usd_24h_change", 0),
                                "source": "Coingecko (Fast Path)"
                            }
                            
                            results.append({
                                "source": url,
                                "data": market_data,
                                "hash": hashlib.sha256(json.dumps(market_data, sort_keys=True).encode()).hexdigest(),
                                "timestamp": timestamp,
                                "paid": False
                            })
                            print(f"[Scout] ✓ Fast path: Got {coin_id} price from Coingecko")
                            return results
        except Exception as e:
            print(f"[Scout] Coingecko fast path failed: {e}")
        
        return None
    
    async def _check_internal_knowledge_base(self, query: str) -> Optional[Dict]:
        """Check internal x402 endpoint for premium data"""
        try:
            # Quest Engine runs on 3001
            url = "http://localhost:3001/data"
            
            # Use x402 client to handle payment handshake automatically
            # This triggers the 402 loop -> Sign -> Retry with headers
            response = await self.x402_client.fetch_with_payment(url)
            
            if response.status == 200:
                data = await response.json()
                
                # Check if we actually paid based on headers (simulated) or just got data
                was_paid = 'X-PAYMENT' in response.headers or data.get('paymentStatus') == 'verified'
                
                return {
                    "source": url,
                    "data": {
                        "content": data.get("content"),
                        "details": data.get("data"),
                        "query": query
                    },
                    "hash": hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest(),
                    "timestamp": int(asyncio.get_event_loop().time()),
                    "paid": was_paid,
                    "payment_proof": response.headers.get('X-Payment-Receipt', 'simulated-payment-proof')
                }
        except Exception as e:
            # Connection refused if backend down, etc.
            # print(f"[Scout] Internal x402 check failed: {e}")
            pass
            
        return None

    async def _discover_sources(self, query: str) -> List[Dict]:
        """Discover data sources via web search"""
        sources = []
        
        # Use Brave Search API (free tier: 2k queries/month)
        brave_api_key = os.getenv("BRAVE_API_KEY", "")
        
        if brave_api_key:
            try:
                search_query = f"{query} API real-time data"
                url = f"https://api.search.brave.com/res/v1/web/search?q={search_query}&count=5"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers={"X-Subscription-Token": brave_api_key}) as response:
                        if response.status == 200:
                            data = await response.json()
                            for result in data.get("web", {}).get("results", []):
                                sources.append({
                                    "url": result.get("url"),
                                    "title": result.get("title"),
                                    "description": result.get("description")
                                })
                            print(f"[Scout] Discovered {len(sources)} potential sources via Brave Search")
            except Exception as e:
                print(f"[Scout] Brave Search error: {e}")
        
        # Fallback: DuckDuckGo Instant Answers (free, no key)
        if not sources:
            try:
                ddg_url = f"https://api.duckduckgo.com/?q={query}&format=json"
                async with aiohttp.ClientSession() as session:
                    async with session.get(ddg_url) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("AbstractURL"):
                                sources.append({
                                    "url": data["AbstractURL"],
                                    "title": data.get("Heading", "DuckDuckGo Result"),
                                    "description": data.get("Abstract", "")
                                })
                print(f"[Scout] Found {len(sources)} sources via DuckDuckGo")
            except Exception as e:
                print(f"[Scout] DDG search error: {e}")
        
        return sources
    
    async def _check_x402_support(self, url: str) -> bool:
        """Check if endpoint supports x402 payments"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.options(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    # Check for x402 headers
                    return 'x-payment-required' in [h.lower() for h in response.headers.keys()]
        except:
            return False
    
    async def _fetch_with_x402(self, url: str, query: str) -> Optional[Dict]:
        """Fetch data from x402-enabled endpoint with payment"""
        try:
            response = await self.x402_client.fetch_with_payment(url)
            if response:
                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    return await response.json()
                else:
                    text = await response.text()
                    return {"result": text, "query": query}
        except Exception as e:
            print(f"[Scout] x402 fetch error: {e}")
        return None
    
    async def _fetch_free(self, url: str) -> Optional[Dict]:
        """Fetch from free endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        if 'json' in content_type:
                            return await response.json()
                        else:
                            # Try to extract meaningful data from HTML/text
                            text = await response.text()
                            return {"content": text[:500], "type": "text"}  # First 500 chars
        except:
            pass
        return None
    
    async def _try_fallback_sources(self, query: str) -> List[Dict]:
        """Fallback to known free knowledge bases"""
        results = []
        timestamp = int(asyncio.get_event_loop().time())
        
        # Try Wikipedia for general knowledge
        try:
            wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
            async with aiohttp.ClientSession() as session:
                async with session.get(wiki_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        results.append({
                            "source": wiki_url,
                            "data": {
                                "title": data.get("title"),
                                "summary": data.get("extract"),
                                "source": "Wikipedia"
                            },
                            "hash": hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest(),
                            "timestamp": timestamp,
                            "paid": False
                        })
                        print(f"[Scout] ✓ Got fallback data from Wikipedia")
        except:
            pass
        
        return results
    
    async def _emergency_fallback(self, query: str) -> List[Dict]:
        """
        Emergency fallback to known reliable free APIs
        Used when web search AND knowledge bases fail
        """
        results = []
        timestamp = int(asyncio.get_event_loop().time())
        query_lower = query.lower()
        
        # General/News fallback (HackerNews)
        try:
            url = f"http://hn.algolia.com/api/v1/search?query={query_lower}&tags=story&hitsPerPage=3"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        hits = data.get("hits", [])
                        
                        if hits:
                            cleaned_hits = []
                            for hit in hits:
                                cleaned_hits.append({
                                    "title": hit.get("title"),
                                    "url": hit.get("url"),
                                    "points": hit.get("points"),
                                    "author": hit.get("author")
                                })
                            
                            results.append({
                                "source": url,
                                "data": {
                                    "results": cleaned_hits,
                                    "summary": f"Found {len(cleaned_hits)} HackerNews discussions"
                                },
                                "hash": hashlib.sha256(json.dumps(cleaned_hits, sort_keys=True).encode()).hexdigest(),
                                "timestamp": timestamp,
                                "paid": False
                            })
                            print(f"[Scout] ✓ Emergency fallback: Found {len(hits)} HN results")
        except Exception as e:
            print(f"[Scout] HackerNews emergency fallback failed: {e}")
        
        return results
            
    async def heartbeat(self):
        """Send periodic pings to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # Send ping every 30 seconds
                if self.ws and not self.ws.closed:
                    ping_msg = json.dumps({"type": "ping", "agentId": self.agent_id})
                    await self.ws.send(ping_msg)
                    print(f"[Scout] Sent heartbeat ping")
                else:
                    print(f"[Scout] WebSocket closed, stopping heartbeat")
                    break
        except Exception as e:
            print(f"[Scout] Heartbeat error: {e}")
    
    async def run(self):
        """Main agent loop with reconnection logic"""
        retry_count = 0
        
        while True:
            try:
                print(f"[Scout] Connecting to coordinator (attempt {retry_count + 1})...")
                await self.connect()
                
                print(f"[Scout] Connected successfully! Listening for tasks...")
                retry_count = 0  # Reset retry count on successful connection
                
                # Start heartbeat task
                heartbeat_task = asyncio.create_task(self.heartbeat())
                
                try:
                    async for message in self.ws:
                        try:
                            task = json.loads(message)
                            await self.handle_task(task)
                        except json.JSONDecodeError:
                            print(f"[Scout] Invalid JSON received: {message}")
                        except Exception as e:
                            print(f"[Scout] Error handling task: {e}")
                            import traceback
                            traceback.print_exc()
                except Exception as e:
                    print(f"[Scout] WebSocket loop error: {e}")
                finally:
                    heartbeat_task.cancel()
                    try:
                        await heartbeat_task
                    except asyncio.CancelledError:
                        pass
                
                # If we get here, connection was closed
                print(f"[Scout] Connection closed, will retry in 5 seconds...")
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"[Scout] Connection error: {e}")
                import traceback
                traceback.print_exc()
                retry_count += 1
                wait_time = min(5 * retry_count, 60)  # Exponential backoff, max 60s
                print(f"[Scout] Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)


async def main():
    agent = ScoutAgent()
    try:
        await agent.run()
    except KeyboardInterrupt:
        print("[Scout] Shutting down gracefully...")
    except Exception as e:
        print(f"[Scout] Fatal error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
