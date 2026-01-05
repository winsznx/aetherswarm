#!/bin/bash
# AetherSwarm Complete System Startup
# Starts all services in the correct order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 AetherSwarm System Startup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}   Copy .env.complete.example to .env and configure it${NC}"
    exit 1
fi

# Export Tavily API key
export TAVILY_API_KEY=$(grep TAVILY_API_KEY .env | cut -d '=' -f2)
export DEV_MODE=true

if [ -z "$TAVILY_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  TAVILY_API_KEY not set in .env${NC}"
else
    echo -e "${GREEN}✅ Tavily API key loaded${NC}"
fi

# Stop function for cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all services...${NC}"
    pkill -P $$ || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start services
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1. Starting Quest Engine...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend/quest-engine
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run dev > ../../logs/quest-engine.log 2>&1 &
QUEST_ENGINE_PID=$!
echo -e "${GREEN}✅ Quest Engine started (PID: $QUEST_ENGINE_PID)${NC}"
cd ../..

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}2. Starting Swarm Coordinator...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend/swarm-coordinator
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run dev > ../../logs/coordinator.log 2>&1 &
COORDINATOR_PID=$!
echo -e "${GREEN}✅ Coordinator started (PID: $COORDINATOR_PID)${NC}"
cd ../..

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}3. Starting Scout Agent...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd agents/scout

# Check Python dependencies
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || . venv/bin/activate

echo "Installing/updating Python dependencies..."
pip install -q -r requirements.txt

export TAVILY_API_KEY=$TAVILY_API_KEY
export COORDINATOR_WS_URL="ws://localhost:8080"
export AGENT_ID="scout-001"

# Generate agent private key if not exists
if [ -z "$AGENT_PRIVATE_KEY" ]; then
    export AGENT_PRIVATE_KEY="0x$(openssl rand -hex 32)"
    echo -e "${YELLOW}⚠️  Generated temporary agent private key${NC}"
fi

python3 src/main.py > ../../logs/scout.log 2>&1 &
SCOUT_PID=$!
echo -e "${GREEN}✅ Scout Agent started (PID: $SCOUT_PID)${NC}"

cd ../..

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}4. Starting Verifier Agent...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd agents/verifier

# Build if not already built
if [ ! -f "target/release/verifier-agent" ]; then
    echo "Building Rust verifier..."
    cargo build --release > /dev/null 2>&1
fi

export AGENT_ID="verifier-001"
export COORDINATOR_WS_URL="ws://localhost:8080"
./target/release/verifier-agent > ../../logs/verifier.log 2>&1 &
VERIFIER_PID=$!
echo -e "${GREEN}✅ Verifier Agent started (PID: $VERIFIER_PID)${NC}"

cd ../..

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}5. Starting Synthesizer Agent...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd agents/synthesizer

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || . venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || echo "Using existing dependencies"

export AGENT_ID="synthesizer-001"
python3 src/main.py > ../../logs/synthesizer.log 2>&1 &
SYNTHESIZER_PID=$!
echo -e "${GREEN}✅ Synthesizer Agent started (PID: $SYNTHESIZER_PID)${NC}"

cd ../..

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}6. Starting Frontend...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd frontend/marketplace

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

cd ../..

sleep 3

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ All Services Running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "   Quest Engine:     http://localhost:3001 (PID: $QUEST_ENGINE_PID)"
echo -e "   Coordinator:      ws://localhost:8080 (PID: $COORDINATOR_PID)"
echo -e "   Scout Agent:      Connected (PID: $SCOUT_PID)"
echo -e "   Verifier Agent:   Connected (PID: $VERIFIER_PID)"
echo -e "   Synthesizer:      Connected (PID: $SYNTHESIZER_PID)"
echo -e "   Frontend:         http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo -e "${BLUE}📁 Log Files:${NC}"
echo -e "   logs/quest-engine.log"
echo -e "   logs/coordinator.log"
echo -e "   logs/scout.log"
echo -e "   logs/verifier.log"
echo -e "   logs/synthesizer.log"
echo -e "   logs/frontend.log"
echo ""
echo -e "${YELLOW}💡 Tip: Open http://localhost:3000 to create quests${NC}"
echo -e "${YELLOW}    Watch logs: tail -f logs/*.log${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait
