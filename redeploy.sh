#!/bin/bash

# Redeploy all services to pick up nixpacks.toml changes

echo "🔄 Redeploying all backend services..."

cd backend/quest-engine
echo "📦 Redeploying Quest Engine..."
railway up -s "Quest Engine" -d &

cd ../swarm-coordinator
echo "📦 Redeploying Swarm Coordinator..."
railway up -s "Swarm Coordinator" -d &

cd ../../
echo "✅ All services redeploying in background"
echo "Check Railway Dashboard for build progress"
