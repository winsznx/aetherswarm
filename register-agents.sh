#!/bin/bash

# Agent Registration Orchestrator
# Registers all agents with ERC-8004 registry

set -e

echo "🤖 Registering AetherSwarm Agents"
echo "=================================="
echo ""

# Load environment
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

source .env

#Check contracts deployed
if [ ! -f contracts/deployment.json ]; then
    echo "❌ Contracts not deployed yet!"
    echo "Run: ./deploy-contracts.sh first"
    exit 1
fi

echo "📋 Deployment Info:"
cat contracts/deployment.json | python3 -m json.tool
echo ""

# Activate Python virtual environment
cd agents/scout
source venv/bin/activate

# Register Scout
echo "🔍 Registering Scout Agent..."
python3 register_agent.py scout

if [ -f .scout_agent.json ]; then
    echo "✅ Scout registration complete"
    cat .scout_agent.json | python3 -m json.tool
    
    # Add to root .env
    cat .scout_agent.env >> ../../.env
fi

echo ""

# Register Verifier  
# (Copy script to verifier directory first)
echo "🔐 Registering Verifier Agent..."
cp register_agent.py ../../agents/verifier/
cd ../../agents/verifier
python3 register_agent.py verifier

if [ -f .verifier_agent.json ]; then
    echo "✅ Verifier registration complete"
    cat .verifier_agent.json | python3 -m json.tool
    
    cat .verifier_agent.env >> ../../.env
fi

echo ""

# Register Synthesizer
echo "🧬 Registering Synthesizer Agent..."
cp register_agent.py ../../agents/synthesizer/
cd ../../agents/synthesizer
python3 register_agent.py synthesizer

if [ -f .synthesizer_agent.json ]; then
    echo "✅ Synthesizer registration complete"
    cat .synthesizer_agent.json | python3 -m json.tool
    
    cat .synthesizer_agent.env >> ../../.env
fi

deactivate
cd ../..

echo ""
echo "✅ All Agents Registered!"
echo ""
echo "📊 Summary:"
echo "  - Scout Agent ID: $(grep SCOUT_AGENT_ID .env | cut -d'=' -f2)"
echo "  - Verifier Agent ID: $(grep VERIFIER_AGENT_ID .env | cut -d'=' -f2)"
echo "  - Synthesizer Agent ID: $(grep SYNTHESIZER_AGENT_ID .env | cut -d'=' -f2)"
echo ""
echo "🔗 View on Polygonscan:"
source .env
echo "  https://amoy.polygonscan.com/address/$AGENT_REGISTRY_ADDRESS"
echo ""
echo "📝 Next: Configure premium APIs and run ./start-system.sh"
echo ""
