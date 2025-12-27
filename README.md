# AetherSwarm

A Decentralized Knowledge Expedition Platform

AetherSwarm is an autonomous AI agent swarm that hunts, verifies, and synthesizes knowledge using machine to machine micropayments. It represents a new paradigm where AI agents operate as independent economic actors, paying for data access and earning rewards for producing verified knowledge artifacts.


## The Problem We Solve

The current landscape of AI and data access is fundamentally broken in three critical ways.

First, AI agents cannot pay for information. When an AI agent encounters a paywall or a premium API, it simply stops. There is no standardized way for machines to autonomously authorize and execute payments. This creates a ceiling on what AI can accomplish without human intervention.

Second, there is no trust layer for autonomous agents. When you hire a human contractor, you can check references and verify credentials. When an AI agent claims it can perform a task, there is no standardized way to verify its identity, check its track record, or ensure accountability. This lack of trust infrastructure prevents the emergence of truly autonomous agent economies.

Third, AI generated content lacks provenance. When an AI produces a research summary or synthesizes information from multiple sources, there is no cryptographic proof of where that data came from, how it was verified, or whether the synthesis process was tamper proof. This makes AI generated knowledge unreliable for high stakes applications.

AetherSwarm solves all three problems by combining the x402 payment protocol with the ERC 8004 trustless agent standard and Trusted Execution Environment verification.


## Why This Matters

Consider a research organization that needs to synthesize information from hundreds of proprietary databases, academic journals, and real time data feeds. Today, this requires human researchers to manually navigate paywalls, verify sources, and compile findings. This process takes weeks and costs thousands of dollars in labor.

With AetherSwarm, a user submits a research objective and a budget in USDC. The platform automatically dispatches a swarm of specialized AI agents. Scout agents navigate to data sources and pay for access using the x402 protocol. Verifier agents run inside Trusted Execution Environments to cryptographically attest that the data was not tampered with. Synthesizer agents fuse the verified data into a knowledge graph and produce an artifact with a Merkle root proving the provenance of every data point.

The entire process happens autonomously in minutes rather than weeks. The resulting artifact is an NFT that can be traded, licensed, or cited with full cryptographic guarantees of its origin and integrity.


## Technical Architecture

AetherSwarm implements a four layer architecture designed for production deployment.

Layer One handles Quest Orchestration. The Quest Engine is a Node.js Express service that receives research requests from users. When a quest is submitted, the engine creates an embedded wallet for that quest using the Crossmint SDK. This wallet uses ERC 4337 account abstraction for gasless transactions on Polygon. The quest is then placed on a Redis queue for the Swarm Coordinator to process.

Layer Two handles Agent Execution. The Swarm Coordinator is the brain of the operation. It consumes quests from the queue and orchestrates a state machine that moves each quest through three phases. In the scouting phase, it queries the ERC 8004 Discovery Registry to find Scout agents with reputation scores above a minimum threshold. It assigns a Scout to fetch data from the specified sources. The Scout uses the x402 protocol to handle paywalled APIs. When encountering a 402 Payment Required response, the Scout parses the payment requirements, signs an EIP 712 typed data message using its private key, and retries the request with the X PAYMENT header containing the signed authorization. In the verification phase, the coordinator dispatches the fetched data to a Verifier agent. Verifiers run inside EigenCloud Trusted Execution Environments. They compute Blake3 hashes of the data and produce Intel TDX attestations proving the verification happened in a tamper proof enclave. In the synthesis phase, verified data chunks flow to a Synthesizer agent that constructs a knowledge graph, generates a Merkle tree for provenance, and uploads the final artifact to IPFS.

Layer Three handles Blockchain Settlement. All payments and identity are settled on Polygon for low transaction costs. The DiscoveryRegistry contract implements the ERC 8004 standard. Every agent is minted as an ERC 721 NFT with on chain identity including their wallet address, WebSocket endpoint, and minimum stake. The ReputationRegistry contract stores feedback from completed quests. Only users who have made verified x402 payments can leave feedback, preventing spam and fake reviews. The QuestPool contract holds USDC budgets for active quests and drips payments to agents as they complete work. The ArtifactNFT contract mints completed knowledge artifacts with their metadata URI, Merkle root, and list of contributing agents.

Layer Four handles Discovery and Marketplace. A Next.js frontend allows users to submit quests and browse completed artifacts. The Graph indexes all on chain events so the frontend can display agent leaderboards sorted by reputation, active quests, and artifact marketplaces.


## Project Structure

```
aetherswarm/
├── backend/
│   ├── quest-engine/         # Express API with Crossmint and Thirdweb Nexus
│   └── swarm-coordinator/    # BullMQ Worker with WebSocket and ERC 8004 Discovery
├── agents/
│   ├── scout/                # Python agent with x402 and EIP 712 signing
│   ├── verifier/             # Rust agent with EigenCloud TEE integration
│   └── synthesizer/          # Python agent with Merkle trees and IPFS
├── web3/
│   ├── contracts/            # Solidity contracts for ERC 8004 and payments
│   └── subgraph/             # The Graph schema and event handlers
└── frontend/
    └── marketplace/          # Next.js dashboard for quest submission
```


## Smart Contracts

The DiscoveryRegistry contract implements ERC 8004 agent identity. It extends ERC 721 with URI storage so each agent receives a unique NFT identity. The contract stores agent metadata including their role as scout verifier or synthesizer, their payment address, WebSocket endpoint for coordinator communication, A2A endpoint for agent to agent messaging, stake amount for slashing, and registration timestamp.

The ReputationRegistry contract stores feedback for agents. Each feedback entry includes the reviewer address, score from 0 to 100, tags, quest ID, x402 payment hash proving the reviewer actually paid, details URI pointing to IPFS, and timestamp.

The QuestPool contract manages quest budgets. When a user creates a quest, USDC is transferred from their wallet to the contract. The drip function allows the coordinator to release payments to agents as they complete work.

The ArtifactNFT contract mints knowledge artifacts. Each artifact stores its metadata URI, Merkle root for provenance verification, and list of contributing agent addresses.


## Implementation Details

The Scout Agent is written in Python and implements a complete x402 client. When it makes a request to a paywalled endpoint and receives a 402 response, it extracts the payment requirements from the X Payment Requirements header. These requirements specify the recipient address, amount, asset, network, and nonce. The Scout then constructs an EIP 712 typed data structure conforming to the x402 specification and signs it with its Ethereum private key. The signed payload is base64 encoded and attached to the X PAYMENT header on the retry request. The receiving server or facilitator verifies the signature and settles the payment on chain.

The Verifier Agent is written in Rust for performance critical cryptographic operations. It connects to EigenCloud and executes verification logic inside an Intel TDX enclave. The enclave produces an attestation quote that can be independently verified by any party. This proves that the specific verification code ran unmodified on genuine Intel hardware protecting against tampering.

The Synthesizer Agent is written in Python and constructs a Merkle tree from verified data hashes. The Merkle root becomes part of the artifact metadata stored on IPFS. Anyone can later verify that a specific data point was included in the synthesis by checking a Merkle proof against the root stored in the NFT.

The Swarm Coordinator integrates with the ERC 8004 Discovery Registry using ethers.js. Before assigning work, it queries the registry for agents matching the required role with reputation scores above a configurable threshold. This ensures that only proven reliable agents receive high value tasks.


## Integration Partners

Corbits provides the Faremeter framework for x402 protocol implementation. Their documentation is at docs.corbits.dev and covers both merchant and agent integration patterns.

Thirdweb provides the Nexus facilitator for payment settlement. Their documentation at nexus.thirdweb.com explains the settlePayment function and middleware integration. Thirdweb also provides Connect for wallet authentication and their contract SDK for deployment.

Crossmint provides embedded wallet infrastructure at crossmint.com. Each quest receives its own ERC 4337 smart wallet. Crossmint also provides agentic checkout for autonomous purchasing documented at docs.crossmint.com/solutions/ai-agents.

EigenCloud provides Trusted Execution Environments. Their EigenCompute product runs containers inside Intel TDX enclaves. The EigenAI product provides deterministic inference. EigenDA provides data availability.

Edge and Node provides The Graph for indexing. Their ampersend product handles agent payment operations.

Polygon provides the settlement layer with transaction costs under one cent.

Abstract Chain provides Global Wallet for consumer onboarding. Their documentation is at docs.abs.xyz.


## Standards Compliance

ERC 8004 defines the trustless agent standard with three registries. The Identity Registry uses ERC 721 to give each agent a unique on chain identity. The Reputation Registry stores verifiable feedback tied to actual payments. The Validation Registry provides hooks for TEE attestation verification. More details at learn.backpack.exchange/articles/erc-8004-explained.

EIP 712 defines typed structured data signing. All x402 payment authorizations use this standard for secure deterministic signatures.

x402 defines the HTTP Payment Required protocol. When a server returns status 402, it includes payment requirements. The client signs a payment authorization and retries with the X PAYMENT header. Full specification at x402.org.


## Prerequisites

Node.js version 20 or higher is required for the backend services.

Python version 3.11 or higher is required for the Scout and Synthesizer agents.

Rust version 1.75 or higher is required for the Verifier agent.

Redis version 7 or higher is required for the message queue.

Docker is optional but recommended for EigenCloud development.


## Installation

Clone the repository.

```bash
git clone https://github.com/yourorg/aetherswarm.git
cd aetherswarm
```

Install backend dependencies.

```bash
cd backend/quest-engine
npm install

cd ../swarm-coordinator
npm install
```

Install Python agent dependencies.

```bash
cd ../../agents/scout
pip install -r requirements.txt

cd ../synthesizer
pip install -r requirements.txt
```

Build the Rust verifier.

```bash
cd ../verifier
cargo build --release
```

Install frontend dependencies.

```bash
cd ../../frontend/marketplace
npm install
```


## Configuration

Copy the example environment file and fill in your API keys.

```bash
cp .env.example .env
```

Required environment variables for the Quest Engine include CROSSMINT_API_KEY from crossmint.com/console, PLATFORM_TREASURY as the wallet address receiving payments, THIRDWEB_WALLET_SECRET for the Nexus facilitator, RPC_URL for Polygon access via Alchemy or Infura, and REDIS_URL defaulting to redis://localhost:6379.

Required environment variables for the Swarm Coordinator include DISCOVERY_REGISTRY_ADDRESS and REPUTATION_REGISTRY_ADDRESS after deploying contracts, WS_PORT defaulting to 8080, and HEALTH_PORT defaulting to 8081.

Required environment variables for agents include COORDINATOR_WS_URL defaulting to ws://localhost:8080, AGENT_PRIVATE_KEY as the agent wallet private key, EIGENCLOUD_API_KEY for the verifier, and PINATA_API_KEY for IPFS uploads.


## Contract Deployment

Deploy contracts using Thirdweb CLI.

```bash
cd web3/contracts
npx thirdweb deploy
```

Alternatively deploy using Foundry.

```bash
forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/DiscoveryRegistry.sol:DiscoveryRegistry
```

After deployment update the env file with DISCOVERY_REGISTRY_ADDRESS and REPUTATION_REGISTRY_ADDRESS.


## Subgraph Deployment

Generate types and build the subgraph.

```bash
cd web3/subgraph
graph codegen
graph build
```

Deploy to The Graph Studio.

```bash
graph deploy --studio aetherswarm
```

Example query for agent discovery.

```graphql
{
  agents(where: { role: Scout, reputationScore_gte: 70 }) {
    id
    paymentAddress
    reputationScore
    questsCompleted
  }
}
```


## Running the Services

Start Redis.

```bash
redis-server
```

Start the Quest Engine in a new terminal.

```bash
cd backend/quest-engine
npm run dev
```

Start the Swarm Coordinator in a new terminal.

```bash
cd backend/swarm-coordinator
npm run dev
```

Start the frontend in a new terminal.

```bash
cd frontend/marketplace
npm run dev
```

Start the Scout agent.

```bash
cd agents/scout
python src/main.py
```

Start the Verifier agent.

```bash
cd agents/verifier
cargo run --release
```

Start the Synthesizer agent.

```bash
cd agents/synthesizer
python src/main.py
```


## Creating a Quest

Use curl to submit a quest.

```bash
curl -X POST http://localhost:3001/quests \
  -H "Content-Type: application/json" \
  -d '{
    "objectives": ["Research ERC 8004 implementation patterns"],
    "budget": 100000,
    "sources": ["https://arxiv.org/api/query"]
  }'
```

The response includes the quest ID and wallet address.

```json
{
  "questId": "quest-1703548800000-a1b2c3d4",
  "status": "queued",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f8bE2a",
  "message": "Quest created and dispatched to swarm coordinator"
}
```


## Testing

Run backend unit tests.

```bash
cd backend/quest-engine
npm test

cd ../swarm-coordinator
npm test
```

Run Python agent tests.

```bash
cd agents/scout
pytest

cd ../synthesizer
pytest
```

Run Rust verifier tests.

```bash
cd agents/verifier
cargo test
```

Run integration tests from the project root.

```bash
npm run test:integration
```


## Health Checks

The Quest Engine health endpoint.

```bash
curl http://localhost:3001/health
```

The Swarm Coordinator health endpoint.

```bash
curl http://localhost:8081/health
```

The health response includes connected agent counts.

```json
{
  "status": "healthy",
  "connectedAgents": 3,
  "activeQuests": 1,
  "agentBreakdown": {
    "scouts": 1,
    "verifiers": 1,
    "synthesizers": 1
  }
}
```


## Roadmap

Phase one covering core architecture is complete. This includes the Quest Engine, Swarm Coordinator, and all three agent types.

Phase two covering the ERC 8004 trust layer is complete. Discovery and Reputation registries are implemented and integrated.

Phase three covering x402 payments is complete. Scout agents handle the full payment handshake with EIP 712 signing.

Phase four covering TEE verification is complete. The Rust verifier integrates with EigenCloud for Intel TDX attestations.

Phase five covering Abstract Global Wallet integration is planned for mainnet deployment.

Phase six covering production deployment is planned following security audits.


## License

MIT License


## Built for the x402 Hackathon

Where AI swarms hunt knowledge and micropayments fuel discovery.
