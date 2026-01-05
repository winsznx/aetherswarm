#!/bin/bash

# Smart Contract Deployment Script
# Deploys all ERC-8004 contracts to Polygon Amoy testnet

set -e

echo "🚀 Deploying AetherSwarm Smart Contracts"
echo "========================================="
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.complete.example to .env and fill in values"
    exit 1
fi

source .env

# Validate required variables
if [ -z "$POLYGON_AMOY_RPC_URL" ]; then
    echo "❌ POLYGON_AMOY_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$POLYGONSCAN_API_KEY" ]; then
    echo "⚠️  POLYGONSCAN_API_KEY not set - contracts won't be verified"
    echo "Get one from: https://polygonscan.com/apis"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd contracts

echo "🔍 Checking deployer balance..."
# Get deployer address from private key
DEPLOYER_ADDRESS=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)
echo "Deployer address: $DEPLOYER_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $POLYGON_AMOY_RPC_URL)
echo "Balance: $BALANCE wei"

if [ "$BALANCE" = "0" ]; then
    echo "❌ Deployer has no funds!"
    echo "Get testnet MATIC from: https://faucet.polygon.technology/"
    exit 1
fi

echo "✅ Deployer funded"
echo ""

echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Contract compilation failed"
    exit 1
fi

echo "✅ Contracts compiled"
echo ""

echo "📡 Deploying to Polygon Amoy..."
echo "This will:"
echo "  1. Deploy AgentRegistry.sol"
echo "  2. Deploy ReputationRegistry.sol"
echo "  3. Deploy QuestLogger.sol"
echo "  4. Verify all contracts on Polygonscan"
echo ""

# Deploy with verification
forge script script/Deploy.s.sol:DeployContracts \
    --rpc-url $POLYGON_AMOY_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $POLYGONSCAN_API_KEY \
    -vvvv

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Check if .contracts.env was created
if [ -f .contracts.env ]; then
    echo "📝 Contract addresses saved to contracts/.contracts.env"
    cat .contracts.env
    
    # Copy to root .env
    echo ""
    echo "Adding addresses to root .env file..."
    cat .contracts.env >> ../.env
    
    echo "✅ Addresses added to .env"
else
    echo "⚠️  .contracts.env not found - addresses may not have been saved"
fi

echo ""
echo "🔗 View contracts on Polygonscan:"
source .contracts.env
echo "AgentRegistry: https://amoy.polygonscan.com/address/$AGENT_REGISTRY_ADDRESS"
echo "ReputationRegistry: https://amoy.polygonscan.com/address/$REPUTATION_REGISTRY_ADDRESS"
echo "QuestLogger: https://amoy.polygonscan.com/address/$QUEST_LOGGER_ADDRESS"

cd ..

echo ""
echo "📝 Next Step: Run ./register-agents.sh to register agents"
echo ""
