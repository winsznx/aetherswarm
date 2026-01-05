#!/bin/bash

# AetherSwarm - System Shutdown Script

echo "🛑 Stopping AetherSwarm System..."

# Kill all processes
pkill -f "quest-engine" 2>/dev/null && echo "✓ Stopped Quest Engine"
pkill -f "swarm-coordinator" 2>/dev/null && echo "✓ Stopped Swarm Coordinator"
pkill -f "agents/scout" 2>/dev/null && echo "✓ Stopped Scout Agent"
pkill -f "verifier-agent" 2>/dev/null && echo "✓ Stopped Verifier Agent"
pkill -f "agents/synthesizer" 2>/dev/null && echo "✓ Stopped Synthesizer Agent"

# Clean up PID files
rm -f .pids/*.pid 2>/dev/null

echo ""
echo "✅ All services stopped"
