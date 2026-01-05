#!/bin/bash

# AetherSwarm Complete Setup Script
# Installs dependencies and deploys ERC-8004 infrastructure

set -e

echo "🚀 AetherSwarm Complete Setup"
echo "================================"

# Load environment
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example and fill in values."
    exit 1
fi

source .env

echo ""
echo "📦 Step 1: Install Foundry (if needed)"
if ! command -v forge &> /dev/null; then
    echo "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
else
    echo "✅ Foundry already installed"
fi

echo ""
echo "📦 Step 2: Install Contract Dependencies"
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
cd ..

echo ""
echo "📦 Step 3: Install Python Dependencies"
cd agents/scout
pip install web3 eth-account
cd ../..

echo ""
echo "📦 Step 4: Install Backend Dependencies"
cd backend/shared
npm install ethers axios
cd ../..

echo ""
echo "🔐 Step 5: Check Environment Variables"
required_vars=("POLYGON_AMOY_RPC_URL" "DEPLOYER_PRIVATE_KEY" "CROSSMINT_API_KEY")
missing=0

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing: $var"
        missing=1
    else
        echo "✅ Found: $var"
    fi
done

if [ $missing -eq 1 ]; then
    echo ""
    echo "⚠️  Please set missing environment variables in .env"
    exit 1
fi

echo ""
echo "🏗️  Step 6: Deploy Smart Contracts"
cd contracts
forge script script/Deploy.s.sol \
    --rpc-url $POLYGON_AMOY_RPC_URL \
    --broadcast \
    --verify \
    || echo "⚠️  Deployment failed or verification pending"

# Load contract addresses
if [ -f .contracts.env ]; then
    source .contracts.env
    echo "✅ Contract addresses loaded"
    echo "   AgentRegistry: $AGENT_REGISTRY_ADDRESS"
    echo "   ReputationRegistry: $REPUTATION_REGISTRY_ADDRESS"
else
    echo "❌ .contracts.env not found - deployment may have failed"
    exit 1
fi
cd ..

echo ""
echo "🤖 Step 7: Register Agents"

# Register Scout
echo "Registering Scout Agent..."
cd agents/scout
AGENT_REGISTRY_ADDRESS=$AGENT_REGISTRY_ADDRESS python register_agent.py

if [ -f .agent.env ]; then
    source .agent.env
    echo "✅ Scout Agent registered: #$SCOUT_AGENT_ID"
else
    echo "❌ Scout registration failed"
fi
cd ../..

# TODO: Register Verifier and Synthesizer similarly

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Verify contracts on Polygonscan:"
echo "   https://amoy.polygonscan.com/address/$AGENT_REGISTRY_ADDRESS"
echo ""
echo "2. Test quest creation:"
echo "   curl -X POST http://localhost:3001/api/quests \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"objectives\": \"Test quest\", \"budget\": \"0.10\"}'"
echo ""
echo "3. Watch the Quest complete in logs:"
echo "   tail -f logs/coordinator.log"
echo ""
