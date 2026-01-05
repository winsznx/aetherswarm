#!/bin/bash

# Monitor agent connectivity to coordinator

echo "=== AetherSwarm Agent Monitor ==="
echo ""

for i in {1..20}; do
    echo "Check #$i at $(date +%H:%M:%S)"
    
    # Get health status
    health=$(curl -s https://swarm-coordinator-production.up.railway.app/health)
    
    # Parse and display
    connected=$(echo $health | jq -r '.connectedAgents')
    scouts=$(echo $health | jq -r '.agentBreakdown.scouts')
    verifiers=$(echo $health | jq -r '.agentBreakdown.verifiers')
    synthesizers=$(echo $health | jq -r '.agentBreakdown.synthesizers')
    quests=$(echo $health | jq -r '.activeQuests')
    
    echo "  Connected Agents: $connected"
    echo "    - Scouts: $scouts"
    echo "    - Verifiers: $verifiers"
    echo "    - Synthesizers: $synthesizers"
    echo "  Active Quests: $quests"
    
    if [ "$connected" -gt "0" ]; then
        echo "  ✅ Agents are connected!"
        
        # Get agent details
        agents=$(curl -s https://swarm-coordinator-production.up.railway.app/agents | jq -r '.agents[] | "    - \(.role): \(.id)"')
        if [ ! -z "$agents" ]; then
            echo "  Agent details:"
            echo "$agents"
        fi
    else
        echo "  ⚠️  No agents connected"
    fi
    
    echo ""
    
    # Wait 5 seconds before next check
    if [ $i -lt 20 ]; then
        sleep 5
    fi
done

echo "=== Monitoring complete ==="
