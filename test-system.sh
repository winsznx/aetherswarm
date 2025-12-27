#!/bin/bash
# AetherSwarm Testing Script

echo "🧪 AetherSwarm System Test"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Quest Engine Health
echo -e "\n1️⃣  Testing Quest Engine..."
QUEST_HEALTH=$(curl -s http://localhost:3001/health)
if echo "$QUEST_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Quest Engine: Healthy${NC}"
else
    echo -e "${RED}❌ Quest Engine: Not responding${NC}"
    echo "$QUEST_HEALTH"
fi

# Test 2: Swarm Coordinator Health
echo -e "\n2️⃣  Testing Swarm Coordinator..."
COORD_HEALTH=$(curl -s http://localhost:8081/health)
if echo "$COORD_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Swarm Coordinator: Healthy${NC}"
    echo "   Connected Agents: $(echo $COORD_HEALTH | jq -r '.connectedAgents')"
else
    echo -e "${RED}❌ Swarm Coordinator: Not responding${NC}"
fi

# Test 3: Create a Quest
echo -e "\n3️⃣  Creating a test quest..."
QUEST_RESULT=$(curl -s -X POST http://localhost:3001/quests \
  -H "Content-Type: application/json" \
  -d '{"objectives": "Test quest for system validation", "budget": "1.00", "userId": "test-runner"}')

QUEST_ID=$(echo $QUEST_RESULT | jq -r '.questId')
WALLET=$(echo $QUEST_RESULT | jq -r '.walletAddress')

if [ "$QUEST_ID" != "null" ] && [ -n "$QUEST_ID" ]; then
    echo -e "${GREEN}✅ Quest Created${NC}"
    echo "   Quest ID: $QUEST_ID"
    echo "   Wallet: $WALLET"
else
    echo -e "${RED}❌ Quest Creation Failed${NC}"
    echo "$QUEST_RESULT"
fi

# Test 4: Payment Info
echo -e "\n4️⃣  Testing x402 Payment Info..."
PAYMENT=$(curl -s http://localhost:3001/payment-info)
if echo "$PAYMENT" | grep -q "facilitator"; then
    echo -e "${GREEN}✅ x402 Payment System: Configured${NC}"
else
    echo -e "${RED}❌ x402 Payment System: Not configured${NC}"
fi

# Test 5: WebSocket Connection Test
echo -e "\n5️⃣  Testing WebSocket (Coordinator)..."
WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null || echo "000")
if [ "$WS_TEST" = "426" ]; then
    echo -e "${GREEN}✅ WebSocket Server: Running (upgrade required response)${NC}"
else
    echo -e "⚠️  WebSocket Server: Response code $WS_TEST"
fi

echo -e "\n=========================="
echo "🎉 Test Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Start Scout agent: cd agents/scout && python src/main.py"
echo "   2. Start Verifier: cd agents/verifier && cargo run"
echo "   3. View frontend: cd frontend && npm run dev"
