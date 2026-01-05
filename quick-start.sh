#!/bin/bash
# Quick Start - Assumes dependencies are already installed
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Starting AetherSwarm...${NC}"

# Export environment
export TAVILY_API_KEY=$(grep TAVILY_API_KEY .env | cut -d '=' -f2)
export DEV_MODE=true

# Cleanup function
cleanup() {
    echo -e "\n🛑 Stopping all services..."
    pkill -P $$ || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Quest Engine
cd backend/quest-engine
npm run dev > ../../logs/quest-engine.log 2>&1 &
echo -e "${GREEN}✅ Quest Engine (PID: $!)${NC}"
cd ../..
sleep 1

# Start Coordinator
cd backend/swarm-coordinator
npm run dev > ../../logs/coordinator.log 2>&1 &
echo -e "${GREEN}✅ Coordinator (PID: $!)${NC}"
cd ../..
sleep 2

# Start Scout
cd agents/scout
source venv/bin/activate
export AGENT_ID="scout-001"
export COORDINATOR_WS_URL="ws://localhost:8080"
python3 src/main.py > ../../logs/scout.log 2>&1 &
echo -e "${GREEN}✅ Scout (PID: $!)${NC}"
cd ../..
sleep 1

# Start Verifier (Rust binary)
cd agents/verifier
export AGENT_ID="verifier-001"
export COORDINATOR_WS_URL="ws://localhost:8080"
./target/release/verifier-agent > ../../logs/verifier.log 2>&1 &
echo -e "${GREEN}✅ Verifier (PID: $!)${NC}"
cd ../..
sleep 1

# Start Synthesizer
cd agents/synthesizer
source venv/bin/activate
export AGENT_ID="synthesizer-001"
python3 src/main.py > ../../logs/synthesizer.log 2>&1 &
echo -e "${GREEN}✅ Synthesizer (PID: $!)${NC}"
cd ../..
sleep 1

# Start Frontend
cd frontend/marketplace
npm run dev > ../../logs/frontend.log 2>&1 &
echo -e "${GREEN}✅ Frontend (PID: $!)${NC}"
cd ../..

sleep 3

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Services Running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "\n${BLUE}📊 Access Points:${NC}"
echo "   Frontend:    http://localhost:3000"
echo "   Quest API:   http://localhost:3001"
echo "   Coordinator: ws://localhost:8080"
echo ""
echo -e "${BLUE}📁 Logs: logs/*.log${NC}"
echo ""
echo -e "Press Ctrl+C to stop all services\n"

wait
