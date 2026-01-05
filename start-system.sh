#!/bin/bash

# AetherSwarm - Complete System Startup Script
# This script starts all services in the correct order and ensures they stay running

set -e  # Exit on error

echo "🚀 Starting AetherSwarm System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    echo -e " ${RED}✗ Failed${NC}"
    return 1
}

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 not found${NC}"
    exit 1
fi

if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}✗ Redis not found${NC}"
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Redis not running, starting...${NC}"
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        sudo systemctl start redis-server
    fi
    sleep 2
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 2: Clean up old processes
echo "🧹 Cleaning up old processes..."
pkill -f "quest-engine" 2>/dev/null || true
pkill -f "swarm-coordinator" 2>/dev/null || true
pkill -f "agents/scout" 2>/dev/null || true
pkill -f "verifier-agent" 2>/dev/null || true
pkill -f "agents/synthesizer" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Step 3: Start Quest Engine
echo "🔧 Starting Quest Engine..."
cd backend/quest-engine
npm run dev > ../../logs/quest-engine.log 2>&1 &
QUEST_ENGINE_PID=$!
cd ../..

wait_for_service "http://localhost:3001/health" "Quest Engine" || {
    echo -e "${RED}Failed to start Quest Engine${NC}"
    cat logs/quest-engine.log
    exit 1
}

# Step 4: Start Swarm Coordinator
echo "🎯 Starting Swarm Coordinator..."
cd backend/swarm-coordinator
DEV_MODE=true npm run dev > ../../logs/coordinator.log 2>&1 &
COORDINATOR_PID=$!
cd ../..

wait_for_service "http://localhost:8081/health" "Swarm Coordinator" || {
    echo -e "${RED}Failed to start Swarm Coordinator${NC}"
    cat logs/coordinator.log
    exit 1
}

# Give coordinator time to initialize WebSocket server
sleep 3

# Step 5: Start Scout Agent
echo "🔍 Starting Scout Agent..."
cd agents/scout
AGENT_ID=scout-001 python3 -m src.main > ../../logs/scout.log 2>&1 &
SCOUT_PID=$!
cd ../..
sleep 2

# Step 6: Start Verifier Agent
echo "✓ Starting Verifier Agent..."
cd agents/verifier
AGENT_ID=verifier-001 ./target/release/verifier-agent > ../../logs/verifier.log 2>&1 &
VERIFIER_PID=$!
cd ../..
sleep 2

# Step 7: Start Synthesizer Agent
echo "◇ Starting Synthesizer Agent..."
cd agents/synthesizer
AGENT_ID=synthesizer-001 python3 -m src.main > ../../logs/synthesizer.log 2>&1 &
SYNTHESIZER_PID=$!
cd ../..
sleep 2

# Step 8: Start Frontend
echo "💻 Starting Frontend..."
cd frontend/marketplace
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

wait_for_service "http://localhost:3000" "Frontend" || {
    echo -e "${YELLOW}Frontend taking a while, but proceeding...${NC}"
}
echo ""

# Step 9: Verify all services are running
echo ""
echo "🔍 Verifying services..."

check_service() {
    if ps -p $1 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $2 (PID: $1)"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (failed to start)"
        return 1
    fi
}

ALL_GOOD=true
check_service $QUEST_ENGINE_PID "Quest Engine" || ALL_GOOD=false
check_service $COORDINATOR_PID "Swarm Coordinator" || ALL_GOOD=false
check_service $SCOUT_PID "Scout Agent" || ALL_GOOD=false
check_service $VERIFIER_PID "Verifier Agent" || ALL_GOOD=false
check_service $SYNTHESIZER_PID "Synthesizer Agent" || ALL_GOOD=false
check_service $FRONTEND_PID "Frontend" || ALL_GOOD=false

echo ""

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All services started successfully!${NC}"
    echo ""
    echo "📊 Service URLs:"
    echo "  - Frontend:    http://localhost:3000"
    echo "  - Quest API:   http://localhost:3001"
    echo "  - Coordinator: ws://localhost:8080"
    echo ""
    echo "📝 Logs:"
    echo "  - Quest Engine:  logs/quest-engine.log"
    echo "  - Coordinator:   logs/coordinator.log"
    echo "  - Scout:         logs/scout.log"
    echo "  - Verifier:      logs/verifier.log"
    echo "  - Synthesizer:   logs/synthesizer.log"
    echo "  - Frontend:      logs/frontend.log"
    echo ""
    echo "🎯 Create a quest:"
    echo "  curl -X POST http://localhost:3001/quests \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"objectives\":\"Bitcoin price\",\"budget\":\"10\",\"walletAddress\":\"0x...\"}'"
    echo ""
    echo "📊 Monitor logs:"
    echo "  tail -f logs/*.log"
    echo ""
    echo "🛑 Stop all services:"
    echo "  ./stop-system.sh"
    echo ""
    
    # Save PIDs for later
    echo "$QUEST_ENGINE_PID" > .pids/quest-engine.pid
    echo "$COORDINATOR_PID" > .pids/coordinator.pid
    echo "$SCOUT_PID" > .pids/scout.pid
    echo "$VERIFIER_PID" > .pids/verifier.pid
    echo "$SYNTHESIZER_PID" > .pids/synthesizer.pid
    echo "$FRONTEND_PID" > .pids/frontend.pid
    
    echo -e "${GREEN}System is ready! 🚀${NC}"
else
    echo -e "${RED}❌ Some services failed to start${NC}"
    echo "Check logs for details:"
    echo "  tail -f logs/*.log"
    exit 1
fi
