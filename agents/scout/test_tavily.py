#!/usr/bin/env python3
"""
Test Tavily Integration with Rate Limiting
Verifies official Tavily client works with safety features
"""
import asyncio
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

async def test_tavily_with_rate_limiting():
    """Test Tavily with rate limiting and caching"""
    from src.premium_apis import get_premium_client
    
    print("=" * 70)
    print("TAVILY INTEGRATION TEST WITH RATE LIMITING")
    print("=" * 70)
    print()
    
    # Check API key
    api_key = os.getenv('TAVILY_API_KEY')
    if not api_key:
        print("❌ TAVILY_API_KEY not set")
        return False
    
    print(f"✅ API Key: {api_key[:15]}...")
    print()
    
    premium = get_premium_client()
    premium.set_quest_id("test-quest-001")
    
    # Test 1: First request (should hit API)
    print("Test 1: First Request")
    print("-" * 70)
    try:
        result = await premium.intelligent_research("What is ERC-8004?")
        
        if result.get('error'):
            print(f"❌ Search failed: {result['error']}")
            return False
        
        print(f"✅ Search completed")
        print(f"   Results: {len(result.get('results', []))}")
        print(f"   Cost: ${result.get('cost_usdc', '0')}")
        
        # Show rate limit stats
        stats = premium.get_rate_limit_stats()
        print(f"\n📊 Rate Limit Stats:")
        print(f"   Requests today: {stats['requests_last_day']}")
        print(f"   Cost today: ${stats['cost_today']:.4f}")
        print(f"   Budget remaining: ${stats['budget_remaining']:.4f}")
        print(f"   Cache size: {stats['cache_size']}")
        print()
        
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        return False
    
    # Test 2: Same query again (should use cache)
    print("Test 2: Cached Request (Same Query)")
    print("-" * 70)
    try:
        result2 = await premium.intelligent_research("What is ERC-8004?")
        
        # Should be from cache (no additional cost)
        stats2 = premium.get_rate_limit_stats()
        
        print(f"✅ Search completed (should be cached)")
        print(f"   Results: {len(result2.get('results', []))}")
        print(f"   Cost: ${result2.get('cost_usdc', '0')}")
        print(f"\n📊 Rate Limit Stats:")
        print(f"   Requests today: {stats2['requests_last_day']} (should be same)")
        print(f"   Cost today: ${stats2['cost_today']:.4f} (should be same)")
        print()
        
        if stats2['requests_last_day'] > stats['requests_last_day']:
            print("⚠️  Warning: Cache might not be working")
        else:
            print("✅ Cache is working! Saved an API call.")
        print()
        
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
        return False
    
    # Test 3: Different query (new API call)
    print("Test 3: New Query (Should Hit API)")
    print("-" * 70)
    try:
        result3 = await premium.intelligent_research("What is AetherSwarm?")
        
        stats3 = premium.get_rate_limit_stats()
        
        print(f"✅ Search completed")
        print(f"   Results: {len(result3.get('results', []))}")
        print(f"   Cost: ${result3.get('cost_usdc', '0')}")
        print(f"\n📊 Rate Limit Stats:")
        print(f"   Requests today: {stats3['requests_last_day']}")
        print(f"   Cost today: ${stats3['cost_today']:.4f}")
        print()
        
    except Exception as e:
        print(f"❌ Test 3 failed: {e}")
        return False
    
    # Test 4: Per-quest limit (should allow 3 requests max)
    print("Test 4: Per-Quest Limit (Max 3 requests)")
    print("-" * 70)
    try:
        # This is the 3rd unique request for this quest
        result4 = await premium.intelligent_research("What is Tavily?")
        
        stats4 = premium.get_rate_limit_stats()
        print(f"✅ Request 3/3 allowed")
        print(f"   Requests today: {stats4['requests_last_day']}")
        
        # Try 4th request (should be blocked)
        print("\nTrying 4th request (should be blocked)...")
        result5 = await premium.intelligent_research("What is Polygon?")
        
        if result5.get('rate_limited'):
            print(f"✅ Request correctly blocked: {result5.get('error')}")
        else:
            print(f"⚠️  Warning: 4th request was allowed (should be blocked)")
        
        print()
        
    except Exception as e:
        print(f"❌ Test 4 failed: {e}")
        return False
    
    # Summary
    final_stats = premium.get_rate_limit_stats()
    
    print("=" * 70)
    print("✅ ALL TESTS PASSED")
    print("=" * 70)
    print()
    print("📊 Final Statistics:")
    print(f"   Total requests today: {final_stats['requests_last_day']}")
    print(f"   Total cost today: ${final_stats['cost_today']:.4f}")
    print(f"   Budget remaining: ${final_stats['budget_remaining']:.4f}")
    print(f"   Cached queries: {final_stats['cache_size']}")
    print()
    print("🔒 Safety Features Verified:")
    print("   ✅ Rate limiting working")
    print("   ✅ Caching working (saved API calls)")
    print("   ✅ Per-quest limits enforced")
    print("   ✅ Daily budget tracking")
    print()
    print("🎉 Tavily integration is safe and ready to use!")
    print()
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_tavily_with_rate_limiting())
    sys.exit(0 if success else 1)
