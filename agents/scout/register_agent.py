#!/usr/bin/env python3
"""
Agent Registration Script
Professional implementation following ERC-8004 standard
Outputs structured JSON data
"""
import os
import sys
import json
from pathlib import Path
from web3 import Web3
from eth_account import Account

# Configuration
CONFIG = {
    "scout": {
        "type": "scout",
        "capabilities": {
            "data_discovery": True,
            "api_integration": True,
            "x402_payments": True,
            "web_search": True,
            "crypto_data": True,
            "premium_apis": True
        },
        "skills": [
            "web-search",
            "crypto-data",
            "hackernews-api",
            "coingecko-api",
            "x402-micropayments",
            "premium-data-access",
            "perplexity-ai",
            "tavily-search"
        ]
    },
    "verifier": {
        "type": "verifier",
        "capabilities": {
            "tee_verification": True,
            "data_attestation": True,
            "eigenlayer_integration": True,
            "cryptographic_proofs": True
        },
        "skills": [
            "tee-attestation",
            "eigencloud",
            "cryptographic-verification",
            "data-integrity"
        ]
    },
    "synthesizer": {
        "type": "synthesizer",
        "capabilities": {
            "knowledge_synthesis": True,
            "artifact_generation": True,
            "llm_integration": True,
            "nft_minting": True
        },
        "skills": [
            "data-synthesis",
            "report-generation",
            "crossmint-nft",
            "ipfs-storage"
        ]
    }
}

def load_contract_abi(contract_name: str) -> list:
    """Load contract ABI from compiled artifacts"""
    abi_path = Path(__file__).parent.parent.parent / "contracts" / "out" / f"{contract_name}.sol" / f"{contract_name}.json"
    
    if not abi_path.exists():
        raise FileNotFoundError(f"Contract ABI not found: {abi_path}\nRun 'forge build' first")
    
    with open(abi_path, 'r') as f:
        contract_json = json.load(f)
        return contract_json['abi']

def load_deployment_info() -> dict:
    """Load deployment information from JSON"""
    deployment_path = Path(__file__).parent.parent.parent / "contracts" / "deployment.json"
    
    if not deployment_path.exists():
        raise FileNotFoundError("deployment.json not found. Run ./deploy-contracts.sh first")
    
    with open(deployment_path, 'r') as f:
        return json.load(f)

def register_agent(agent_type: str) -> dict:
    """
    Register an agent following ERC-8004 standard
    
    Returns structured JSON with registration details
    """
    print(f"\n{'='*60}")
    print(f"Registering {agent_type.upper()} Agent")
    print(f"{'='*60}\n")
    
    # Load environment
    from dotenv import load_dotenv
    load_dotenv()
    
    deployment = load_deployment_info()
    registry_address = deployment['agentRegistry']
    rpc_url = os.getenv('POLYGON_AMOY_RPC_URL')
    private_key = os.getenv(f'{agent_type.upper()}_WALLET_PRIVATE_KEY') or os.getenv('DEPLOYER_PRIVATE_KEY')
    
    if not all([registry_address, rpc_url, private_key]):
        raise ValueError("Missing required environment variables")
    
    # Initialize Web3
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        raise ConnectionError(f"Failed to connect to RPC: {rpc_url}")
    
    print(f"✅ Connected to network (Chain ID: {w3.eth.chain_id})")
    
    # Load account
    account = Account.from_key(private_key)
    print(f"📝 Using account: {account.address}\n")
    
    # Load contract
    abi = load_contract_abi('AgentRegistry')
    contract = w3.eth.contract(address=Web3.to_checksum_address(registry_address), abi=abi)
    
    # Check if already registered
    try:
        agent_ids = contract.functions.getAgentsByOwner(account.address).call()
        
        for agent_id in agent_ids:
            agent = contract.functions.getAgent(agent_id).call()
            if agent[1] == agent_type:  # agentType
                print(f"✅ {agent_type.upper()} agent already registered")
                print(f"   Agent ID: {agent_id}")
                print(f"   Owner: {agent[0]}")
                
                result = {
                    "status": "already_registered",
                    "agentId": agent_id,
                    "agentType": agent_type,
                    "owner": agent[0],
                    "capabilities": json.loads(agent[2]),
                    "skills": list(agent[3]),
                    "registeredAt": agent[4],
                    "active": agent[5]
                }
                
                # Save to file
                output_file = Path(__file__).parent / f".{agent_type}_agent.json"
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                
                # Also save simple env format
                env_file = Path(__file__).parent / f".{agent_type}_agent.env"
                with open(env_file, 'w') as f:
                    f.write(f"{agent_type.upper()}_AGENT_ID={agent_id}\n")
                
                return result
    except Exception as e:
        print(f"⚠️  Could not check existing agents: {e}")
    
    # Register new agent
    config = CONFIG[agent_type]
    capabilities_json = json.dumps(config['capabilities'])
    skills = config['skills']
    
    print(f"🚀 Registering new {agent_type} agent...")
    print(f"   Type: {config['type']}")
    print(f"   Capabilities: {len(config['capabilities'])} features")
    print(f"   Skills: {len(skills)} skills\n")
    
    # Build transaction
    tx = contract.functions.registerAgent(
        config['type'],
        capabilities_json,
        skills
    ).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 500000,
        'gasPrice': w3.eth.gas_price
    })
    
    # Sign and send
    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"📡 Transaction sent: {tx_hash.hex()}")
    print(f"   Waiting for confirmation...")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    if receipt['status'] != 1:
        raise Exception("Transaction failed!")
    
    print(f"✅ Transaction confirmed (Block: {receipt['blockNumber']})\n")
    
    # Extract agent ID from events
    logs = contract.events.AgentRegistered().process_receipt(receipt)
    
    if not logs:
        raise Exception("No AgentRegistered event found")
    
    agent_id = logs[0]['args']['agentId']
    
    result = {
        "status": "newly_registered",
        "agentId": agent_id,
        "agentType": agent_type,
        "owner": account.address,
        "capabilities": config['capabilities'],
        "skills": skills,
        "transactionHash": tx_hash.hex(),
        "blockNumber": receipt['blockNumber'],
        "gasUsed": receipt['gasUsed'],
        "network": "polygon-amoy",
        "explorerUrl": f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"
    }
    
    print(f"{'='*60}")
    print(f"✅ {agent_type.upper()} Agent Registered Successfully!")
    print(f"{'='*60}")
    print(f"   Agent ID: {agent_id}")
    print(f"   Owner: {account.address}")
    print(f"   TX: {tx_hash.hex()}")
    print(f"   Explorer: {result['explorerUrl']}\n")
    
    # Save structured JSON
    output_file = Path(__file__).parent / f".{agent_type}_agent.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    # Save simple env format
    env_file = Path(__file__).parent / f".{agent_type}_agent.env"
    with open(env_file, 'w') as f:
        f.write(f"{agent_type.upper()}_AGENT_ID={agent_id}\n")
    
    print(f"📄 Output saved to: {output_file.name}")
    
    return result

if __name__ == "__main__":
    agent_type = sys.argv[1] if len(sys.argv) > 1 else "scout"
    
    if agent_type not in CONFIG:
        print(f"❌ Unknown agent type: {agent_type}")
        print(f"Available: {', '.join(CONFIG.keys())}")
        sys.exit(1)
    
    try:
        result = register_agent(agent_type)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Registration failed: {e}")
        sys.exit(1)
