#!/bin/bash

# Upload Environment Variables to Railway Services
# This script reads your .env file and uploads variables to the correct services

PROJECT_ID="7794b8b9-9eb0-4398-a370-246f929257f3"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Uploading Environment Variables to Railway...${NC}\n"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your configuration."
    exit 1
fi

# Source the .env file to load variables
set -a
source .env
set +a

# Function to set variables for a service
set_vars() {
    local service_name=$1
    shift
    local vars=("$@")
    
    echo -e "${BLUE}📦 Configuring ${service_name}...${NC}"
    
    # Build the command with --set flags
    local cmd="railway variables -s \"$service_name\""
    for var in "${vars[@]}"; do
        # Check if variable is set
        if [ -n "${!var}" ]; then
            cmd="$cmd --set \"$var=${!var}\""
        fi
    done
    
    # Execute
    eval $cmd
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${service_name} configured${NC}\n"
    else
        echo -e "${RED}❌ Failed to configure ${service_name}${NC}\n"
    fi
}

# Quest Engine Variables
set_vars "Quest Engine" \
    "PLATFORM_PRIVATE_KEY" \
    "REDIS_URL" \
    "QUEST_LOGGER_ADDRESS_BASE" \
    "DISCOVERY_REGISTRY_ADDRESS_BASE" \
    "REPUTATION_REGISTRY_ADDRESS_BASE" \
    "CHAIN_ID"

# Swarm Coordinator Variables
set_vars "Swarm Coordinator" \
    "REDIS_URL" \
    "PORT"

# Scout Agent Variables
set_vars "Scout Agent" \
    "AGENT_PRIVATE_KEY" \
    "COORDINATOR_WS_URL" \
    "AGENT_ID" \
    "REDIS_URL" \
    "BRAVE_API_KEY"

# Verifier Agent Variables
set_vars "Verifier Agent" \
    "AGENT_PRIVATE_KEY" \
    "COORDINATOR_WS_URL" \
    "AGENT_ID" \
    "REDIS_URL" \
    "EIGENCLOUD_API_KEY"

# Synthesizer Agent Variables
set_vars "Synthesizer Agent" \
    "AGENT_PRIVATE_KEY" \
    "COORDINATOR_WS_URL" \
    "AGENT_ID" \
    "REDIS_URL" \
    "PINATA_JWT"

echo -e "${GREEN}🎉 All environment variables uploaded!${NC}"
echo -e "${BLUE}💡 Note: Services will restart automatically to apply changes.${NC}"
