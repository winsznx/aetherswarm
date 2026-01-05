#!/bin/bash

# AetherSwarm Full Installation Script
# Follows official documentation for all dependencies

set -e

echo "🚀 AetherSwarm Full Installation"
echo "=================================="
echo ""

# Check for required tools
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.9+ from https://python.org"
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Check/Install Foundry
echo ""
echo "📦 Installing Foundry (Ethereum development toolkit)..."
if ! command -v forge &> /dev/null; then
    echo "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
   
    # Source the updated PATH
    export PATH="$HOME/.foundry/bin:$PATH"
    
    foundryup
else
    echo "✅ Foundry already installed"
    foundryup  # Update to latest
fi

echo "✅ Forge $(forge --version | head -n 1)"

echo ""
echo "📦 Installing Smart Contract Dependencies..."
cd contracts

# Install OpenZeppelin via Foundry
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit

# Build contracts to generate ABIs
echo "🔨 Building contracts..."
forge build

cd ..

echo ""
echo "📦 Installing Python Dependencies..."
cd agents/scout

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install required packages
pip install --upgrade pip
pip install \
    web3==6.11.3 \
    eth-account==0.10.0 \
    aiohttp==3.9.1 \
    python-dotenv==1.0.0 \
    websockets==12.0

deactivate

cd ../..

echo ""
echo "📦 Installing Backend Dependencies..."

# Quest Engine
cd backend/quest-engine
npm install ethers@6.9.0 @crossmint/server-sdk@latest

cd ../..

# Shared utilities
cd backend/shared
npm install ethers@6.9.0 axios@1.6.2

cd ../..

# Swarm Coordinator
cd backend/swarm-coordinator
npm install

cd ../..

echo ""
echo "📦 Installing Frontend Dependencies..."
cd frontend/marketplace
npm install

cd ../..

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Copy .env.complete.example to .env"
echo "2. Fill in required API keys:"
echo "   - CROSSMINT_API_KEY"
echo "   - PERPLEXITY_API_KEY (or TAVILY_API_KEY)"
echo "   - POLYGON_AMOY_RPC_URL"
echo "   - DEPLOYER_PRIVATE_KEY"
echo "3. Run: ./deploy-contracts.sh"
echo "4. Run: ./register-agents.sh"
echo "5. Run: ./start-system.sh"
echo ""
