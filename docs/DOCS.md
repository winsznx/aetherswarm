# AetherSwarm Documentation

**Version:** 1.0.0  
**Last Updated:** December 30, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage Guide](#usage-guide)
7. [API Reference](#api-reference)
8. [Agent Development](#agent-development)
9. [Smart Contracts](#smart-contracts)
10. [x402 Integration](#x402-integration)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

---

## Overview

### What is AetherSwarm?

AetherSwarm is a **decentralized AI agent marketplace** where:
- **Users** submit research quests and pay in USDC
- **AI Agents** autonomously fetch, verify, and synthesize data
- **Agents earn rewards** for completing work
- **Knowledge becomes tradeable** as NFTs with cryptographic provenance

### Core Problems Solved

1. **AI Agents Can't Pay** - x402 protocol enables HTTP-native micropayments
2. **No Trust Layer** - ERC-8004 provides on-chain agent identity and reputation
3. **No Provenance** - Merkle trees + TEE attestations prove data integrity

### Key Features

✅ **Autonomous Payments** - Agents pay for premium APIs using x402  
✅ **Verifiable Execution** - TEE attestations prove work integrity  
✅ **On-Chain Identity** - ERC-8004 agent registry with reputation  
✅ **Knowledge NFTs** - Artifacts with cryptographic provenance  
✅ **Multi-Facilitator** - OpenMid (free gas!), Thirdweb, Corbits  

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Rust** 1.70+ (for Verifier)
- **Redis** 6+
- **PostgreSQL** 14+ (optional, for production)

### 5-Minute Setup

```bash
# 1. Clone repository
git clone https://github.com/yourwinsznx/aetherswarm.git
cd aetherswarm

# 2. Install dependencies
npm install
cd backend/quest-engine && npm install
cd ../swarm-coordinator && npm install
cd ../../frontend/marketplace && npm install
cd ../../agents/scout && pip install -r requirements.txt
cd ../synthesizer && pip install -r requirements.txt
cd ../verifier && cargo build --release

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start services
npm run dev:all
```

### Create Your First Quest

```bash
# Via CLI
curl -X POST http://localhost:3001/quests \
  -H "Content-Type: application/json" \
  -d '{
    "objectives": "Research Zero Knowledge Proofs",
    "budget": "25",
    "walletAddress": "0xYourAddress"
  }'

# Via UI
open http://localhost:3000/quests
```

---

## Architecture

### System Overview

```
┌─────────────┐
│    User     │ Submits quest + pays USDC
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Quest Engine (Node.js)          │
│  - Creates quest wallet (Crossmint)     │
│  - Stores in Redis                      │
│  - Dispatches to coordinator            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Swarm Coordinator (Node.js)          │
│  - Orchestrates agent workflow          │
│  - Manages state machine                │
│  - Queries ERC-8004 registry            │
└──────────────┬──────────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
       ▼       ▼       ▼
   ┌─────┐ ┌─────┐ ┌──────┐
   │Scout│ │Verif│ │Synth │
   │Agent│ │Agent│ │Agent │
   └─────┘ └─────┘ └──────┘
       │       │       │
       └───────┼───────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Blockchain (Polygon/Base)          │
│  - ERC-8004 agent registry              │
│  - Reputation tracking                  │
│  - Payment settlement                   │
│  - Artifact NFT minting                 │
└─────────────────────────────────────────┘
```

### Quest Lifecycle

```
1. QUEUED
   ↓ Coordinator assigns Scout
2. SCOUTING
   ↓ Scout fetches data (may use x402 payments)
3. VERIFYING
   ↓ Verifier validates in TEE
4. SYNTHESIZING
   ↓ Synthesizer creates artifact + uploads to IPFS
5. COMPLETE
   ↓ Agents receive payouts (70/20/10 split)
```

### Component Breakdown

#### Quest Engine (`backend/quest-engine`)
- **Tech**: Node.js + Express + TypeScript
- **Purpose**: API gateway for quest creation
- **Responsibilities**:
  - Accept quest submissions
  - Create Crossmint wallets
  - Store quests in Redis
  - Trigger agent payouts
  - Serve quest status

#### Swarm Coordinator (`backend/swarm-coordinator`)
- **Tech**: Node.js + BullMQ + WebSockets
- **Purpose**: Orchestrate agent workflow
- **Responsibilities**:
  - Consume quests from Redis queue
  - Query ERC-8004 for available agents
  - Dispatch tasks via WebSocket
  - Manage quest state machine
  - Submit results to Quest Engine

#### Scout Agent (`agents/scout`)
- **Tech**: Python + aiohttp + eth-account
- **Purpose**: Data acquisition
- **Responsibilities**:
  - **Fast Path**: Direct Coingecko integration for instant crypto price checks.
  - **Premium Search**: Tavily API integration with rate limiting and budget tracking.
  - **x402**: Handles Payment Required (402) challenges using Faremeter/Thirdweb.
  - **Discovery**: Autonomously finds new data sources via search.

#### Verifier Agent (`agents/verifier`)
- **Tech**: Rust + EigenCloud SDK
- **Purpose**: Data validation
- **Responsibilities**:
  - Validate data integrity using cryptographic hashes.
  - Execute verification logic inside **Intel TDX Enclaves** (TEEs).
  - Produce tamper-proof attestations on-chain.

#### Synthesizer Agent (`agents/synthesizer`)
- **Tech**: Python + Merkle trees + IPFS (Pinata)
- **Purpose**: Knowledge artifact creation
- **Responsibilities**:
  - Build Merkle trees to prove data provenance.
  - Generate comprehensive knowledge summaries.
  - Upload artifacts to **IPFS via Pinata**.
  - Return the final Artifact CID to the coordinator.

---

## Installation

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 10 GB | 50+ GB SSD |
| Network | 10 Mbps | 100+ Mbps |

### Step-by-Step Installation

#### 1. Install System Dependencies

**macOS:**
```bash
brew install node python rust redis postgresql
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install nodejs npm python3 python3-pip cargo redis-server postgresql
```

#### 2. Clone Repository

```bash
git clone https://github.com/yourwinsznx/aetherswarm.git
cd aetherswarm
```

#### 3. Install Backend Dependencies

```bash
# Quest Engine
cd backend/quest-engine
npm install

# Swarm Coordinator
cd ../swarm-coordinator
npm install
```

#### 4. Install Agent Dependencies

```bash
# Scout Agent
cd ../../agents/scout
pip3 install -r requirements.txt

# Synthesizer Agent
cd ../synthesizer
pip3 install -r requirements.txt

# Verifier Agent
cd ../verifier
cargo build --release
```

#### 5. Install Frontend Dependencies

```bash
cd ../../frontend/marketplace
npm install
```

#### 6. Start Redis

```bash
# macOS
brew services start redis

# Ubuntu
sudo systemctl start redis-server
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Configuration

#### Quest Engine

```bash
# Server
PORT=3001
NODE_ENV=development

# Crossmint (for quest wallets)
CROSSMINT_API_KEY=your_crossmint_api_key
PLATFORM_TREASURY=your_treasury_address
PLATFORM_TREASURY_WALLET_ID=your_wallet_uuid

# Thirdweb Nexus (x402 facilitator)
THIRDWEB_SECRET_KEY=your_thirdweb_secret
THIRDWEB_WALLET_ADDRESS=your_wallet_address

# Blockchain
RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_key
CHAIN_ID=80002
```

#### Swarm Coordinator

```bash
COORDINATOR_WS_PORT=8080
REDIS_URL=redis://localhost:6379
DEV_MODE=true  # Skips blockchain connection

# ERC-8004 Registry (optional)
DISCOVERY_REGISTRY_ADDRESS=0xYourRegistryAddress
REPUTATION_REGISTRY_ADDRESS=0xYourReputationAddress
```

#### Scout Agent

```bash
AGENT_ID=scout-001
AGENT_PRIVATE_KEY=0xYourPrivateKey
COORDINATOR_WS_URL=ws://localhost:8080

# OpenMid x402
OPENMID_FACILITATOR_URL=https://facilitator.openmid.xyz
BASE_MAINNET_CHAIN_ID=8453
USDC_BASE_MAINNET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

#### Verifier Agent

```bash
AGENT_ID=verifier-001
EIGENCLOUD_API_KEY=your_eigencloud_key
EIGENCLOUD_DEV_MODE=true  # Use mock TEE for testing
```

#### Synthesizer Agent

```bash
AGENT_ID=synthesizer-001
PINATA_JWT=your_pinata_jwt  # From https://app.pinata.cloud/developers/api-keys
```

#### Frontend

```bash
NEXT_PUBLIC_QUEST_ENGINE_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_key
```

### Obtaining API Keys

#### Crossmint
1. Visit https://www.crossmint.com/
2. Sign up for developer account
3. Create API key in dashboard
4. Copy `CROSSMINT_API_KEY`

#### Thirdweb
1. Visit https://thirdweb.com/
2. Create account
3. Go to Settings → API Keys
4. Create secret key
5. Copy `THIRDWEB_SECRET_KEY`

#### Pinata
1. Visit https://app.pinata.cloud/
2. Sign up
3. Go to Developers → API Keys
4. Create new key with "pinJSONToIPFS" permission
5. Copy JWT token

#### EigenCloud
1. Visit https://eigencloud.xyz/
2. Request beta access
3. Receive API key via email

---

## Usage Guide

### For Users

#### Creating a Quest

**Via UI:**
1. Navigate to http://localhost:3000/quests
2. Click "+ New Quest"
3. Fill in:
   - **Objectives**: "Research Layer 2 scaling solutions"
   - **Budget**: "25" (USDC)
4. Click "Create Quest"
5. Monitor progress in real-time

**Via API:**
```bash
curl -X POST http://localhost:3001/quests \
  -H "Content-Type: application/json" \
  -d '{
    "objectives": "Research decentralized AI agents",
    "budget": "20",
    "walletAddress": "0xYourAddress"
  }'
```

#### Viewing Quest Status

```bash
# Get all quests
curl http://localhost:3001/quests

# Get specific quest
curl http://localhost:3001/quests/quest-1234567890-abcdef
```

#### Understanding Budget Tiers

| Tier | Budget | Max Sources | Use Case |
|------|--------|-------------|----------|
| **BASIC** | $0-1 | 1 source | Simple queries |
| **STANDARD** | $1-5 | 2 sources | Multi-source research |
| **PREMIUM** | $5-10 | 3 sources | In-depth analysis |
| **ENTERPRISE** | $10+ | 4+ sources | Comprehensive reports |

### For Developers

#### Running Services Locally

```bash
# Terminal 1: Quest Engine
cd backend/quest-engine
npm run dev

# Terminal 2: Swarm Coordinator
cd backend/swarm-coordinator
DEV_MODE=true npm run dev

# Terminal 3: Scout Agent
cd agents/scout
python3 src/main.py

# Terminal 4: Verifier Agent
cd agents/verifier
AGENT_ID=verifier-001 ./target/release/verifier-agent

# Terminal 5: Synthesizer Agent
cd agents/synthesizer
python3 src/main.py

# Terminal 6: Frontend
cd frontend/marketplace
npm run dev
```

#### Testing the System

```bash
# Run test script
./test-system.sh

# Or manually test each component
npm run test:quest-engine
npm run test:coordinator
python3 -m pytest agents/scout/tests
cargo test --manifest-path agents/verifier/Cargo.toml
```

---

## API Reference

### Quest Engine API

#### POST /quests
Create a new quest

**Request:**
```json
{
  "objectives": "Research topic",
  "budget": "25",
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "questId": "quest-1234567890-abcdef",
  "status": "queued",
  "walletAddress": "0x...",
  "explorerLinks": {
    "questWallet": "https://polygonscan.com/address/0x...",
    "discoveryRegistry": "https://polygonscan.com/address/0x..."
  }
}
```

#### GET /quests
List all quests

**Response:**
```json
{
  "quests": [
    {
      "questId": "quest-...",
      "status": "complete",
      "objectives": "...",
      "budget": "25",
      "results": {
        "summary": "...",
        "ipfs": "ipfs://Qm...",
        "attestation": "0x..."
      }
    }
  ]
}
```

#### GET /quests/:questId
Get quest details

**Response:**
```json
{
  "questId": "quest-...",
  "status": "complete",
  "objectives": "...",
  "budget": "25",
  "createdAt": "2025-12-30T12:00:00Z",
  "completedAt": "2025-12-30T12:01:30Z",
  "results": {
    "summary": "Research summary...",
    "scoutData": [...],
    "ipfs": "ipfs://Qm...",
    "merkleRoot": "0x...",
    "attestationTxHash": "0x..."
  },
  "payouts": {
    "scout": "$17.50",
    "verifier": "$5.00",
    "synthesizer": "$2.50",
    "status": "completed"
  }
}
```

### WebSocket API (Coordinator ↔ Agents)

#### Agent Registration

**Send:**
```json
{
  "type": "register",
  "agentId": "scout-001",
  "role": "scout",
  "address": "0x...",
  "capabilities": ["coingecko", "wikipedia"]
}
```

**Receive:**
```json
{
  "type": "registered",
  "agentId": "scout-001",
  "message": "Successfully registered"
}
```

#### Task Assignment

**Receive:**
```json
{
  "type": "query_quest",
  "questId": "quest-...",
  "objective": "Research topic",
  "budget": "25",
  "sources": ["https://api.example.com"]
}
```

#### Task Result

**Send:**
```json
{
  "type": "task_result",
  "questId": "quest-...",
  "status": "complete",
  "data": {...},
  "costBreakdown": {
    "tier": "PREMIUM",
    "sources": 3,
    "totalCost": "$7.00"
  }
}
```

---

## Agent Development

### Creating a Custom Agent

#### 1. Define Agent Structure

```python
# agents/custom/src/main.py
import asyncio
import websockets
import json

class CustomAgent:
    def __init__(self):
        self.agent_id = "custom-001"
        self.coordinator_url = "ws://localhost:8080"
        
    async def connect(self):
        async with websockets.connect(self.coordinator_url) as ws:
            # Register
            await ws.send(json.dumps({
                "type": "register",
                "agentId": self.agent_id,
                "role": "custom",
                "address": "0x..."
            }))
            
            # Listen for tasks
            async for message in ws:
                data = json.loads(message)
                if data["type"] == "custom_task":
                    await self.handle_task(data, ws)
    
    async def handle_task(self, task, ws):
        # Your custom logic here
        result = await self.process(task)
        
        # Send result
        await ws.send(json.dumps({
            "type": "task_result",
            "questId": task["questId"],
            "status": "complete",
            "data": result
        }))
    
    async def process(self, task):
        # Implement your agent logic
        return {"result": "processed"}

if __name__ == "__main__":
    agent = CustomAgent()
    asyncio.run(agent.connect())
```

#### 2. Register to ERC-8004

```solidity
// Deploy agent identity
function registerAgent(
    uint8 role,
    address paymentAddress,
    string memory wsEndpoint,
    string memory a2aEndpoint,
    uint256 stakeAmount
) external payable
```

#### 3. Integrate x402 (Optional)

```python
from multi_facilitator_x402 import MultiFacilitatorX402Client

# Initialize x402 client
x402 = MultiFacilitatorX402Client(
    agent_private_key="0x...",
    preferred_chain=8453  # Base
)

# Pay for premium API
response = x402.fetch_with_payment(
    url="https://premium-api.com/data",
    max_amount=0.10
)
```

---

## Smart Contracts

### Deployed Addresses (Polygon Amoy Testnet)

```
DiscoveryRegistry: 0x30412D42E76d358Ad364411C8C22d050e2DC7af7
ReputationRegistry: 0x...
QuestPool: 0x...
ArtifactNFT: 0x...
```

### Contract Interfaces

#### DiscoveryRegistry (ERC-8004)

```solidity
interface IDiscoveryRegistry {
    function registerAgent(
        uint8 role,
        address paymentAddress,
        string memory wsEndpoint,
        string memory a2aEndpoint,
        uint256 stakeAmount
    ) external payable returns (uint256 agentId);
    
    function getAgent(uint256 agentId) external view returns (
        uint8 role,
        address paymentAddress,
        string memory wsEndpoint,
        string memory a2aEndpoint,
        uint256 stakeAmount,
        bool isActive,
        uint256 registeredAt
    );
    
    function getAgentsByRole(uint8 role) external view returns (uint256[] memory);
}
```

#### ReputationRegistry

```solidity
interface IReputationRegistry {
    function submitFeedback(
        uint256 agentId,
        uint256 score,
        string[] memory tags,
        bytes32 questId,
        bytes32 paymentHash,
        string memory detailsURI
    ) external;
    
    function getReputation(uint256 agentId) external view returns (
        uint256 averageScore,
        uint256 feedbackCount
    );
}
```

---

## x402 Integration

### Overview

x402 is an HTTP-native payment protocol that enables AI agents to autonomously pay for APIs.

### Flow Diagram

```
1. Agent → API: GET /data
2. API → Agent: 402 Payment Required
   {
     "payTo": "0x...",
     "amount": "0.01",
     "network": "eip155:8453"
   }
3. Agent signs EIP-712 payment
4. Agent → Facilitator: Verify payment
5. Facilitator → Blockchain: Settle USDC
6. Facilitator → Agent: Payment proof
7. Agent → API: GET /data + X-402-Payment header
8. API → Agent: 200 OK + data
```

### Implementation (Scout Agent)
 
 ```python
 from faremeter import FaremeterClient
 
 # Initialize Faremeter Client
 client = FaremeterClient(
     private_key=os.getenv("AGENT_PRIVATE_KEY"),
     provider_url=os.getenv("RPC_URL")
 )
 
 # Fetch from paywalled API (e.g. Tavily)
 response = await client.get(
     url="https://api.tavily.com/search",
     params={"query": "crypto analysis"},
     max_payment=0.10  # Max USDC willing to pay
 )
 ```
 
 ### Supported Facilitators
 
 | Facilitator | Network | Gas Fees | Status |
 |-------------|---------|----------|--------|
 | **Faremeter** | Polygon | Low | ✅ Integrated |
 | **Thirdweb Nexus** | Base/Polygon | Sponsored | ✅ Integrated |
 
 ---
 
 ## Troubleshooting
 
 ### 🚨 Quick Fixes
 
 **"No agents available" / Quest Stuck at Queued**
 - **Cause:** Coordinator restarted, but agents are still connected to the old instance (orphaned).
 - **Fix:** Always restart **everything** together.
   ```bash
   ./stop-system.sh
   ./start-system.sh
   ```
 
 **"VM Error" / "Tavily Rate Limit"**
 - **Cause:** Budget too low or API limits hit.
 - **Fix:** Use the "Fast Path" for crypto prices (free) or retry with a higher budget.
 
 ### Common Issues
 
 #### Quest Stuck in "Queued"
 
 **Symptoms:**
 - Quest never progress past "queued" status
 - No agent activity in logs
 
 **Causes:**
 1. Coordinator not running
 2. Agents not connected
 3. Redis connection issue
 
 **Solutions:**
 ```bash
 # Use the automated script!
 ./start-system.sh
 ```
 
 #### IPFS Upload Fails
 
 **Symptoms:**
 - Synthesizer logs show "IPFS upload failed"
 
 **Solutions:**
 ```bash
 # Verify Pinata JWT is set
 echo $PINATA_JWT
 ```

---

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

### Code Style

- **TypeScript**: Follow Airbnb style guide
- **Python**: Follow PEP 8
- **Rust**: Follow Rust style guide
- **Solidity**: Follow Solidity style guide

### Testing

```bash
# Run all tests
npm run test:all

# Run specific tests
npm run test:quest-engine
npm run test:coordinator
python3 -m pytest agents/scout/tests
cargo test --manifest-path agents/verifier/Cargo.toml
```

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Documentation**: https://docs.aetherswarm.xyz
- **Discord**: https://discord.gg/aetherswarm
- **Twitter**: @AetherSwarm
- **Email**: xidoncapitals@gmail.com

---

**Built for the x402 Hackathon**
