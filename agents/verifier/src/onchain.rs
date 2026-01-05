//! On-chain attestation posting module
//! Posts TEE attestations to ReputationRegistry smart contract

use ethers::{
    prelude::*,
    providers::{Http, Provider},
    signers::{LocalWallet, Signer},
};
use std::sync::Arc;

/// ReputationRegistry contract ABI (matching deployed contract)
abigen!(
    ReputationRegistry,
    r#"[
        function postFeedback(uint256 agentId, uint8 score, string[] calldata tags, bytes32 questId, bytes32 x402PaymentHash, string calldata detailsURI) external
        function getReputation(uint256 agentId) external view returns (uint256 averageScore, uint256 feedbackCount)
    ]"#
);

pub struct OnChainAttestor {
    provider: Arc<Provider<Http>>,
    wallet: LocalWallet,
    contract_address: Address,
    chain_id: u64,
}

impl OnChainAttestor {
    pub fn new(
        rpc_url: &str,
        private_key: &str,
        contract_address: &str,
        chain_id: u64,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let provider = Provider::<Http>::try_from(rpc_url)?;
        let wallet: LocalWallet = private_key.parse::<LocalWallet>()?.with_chain_id(chain_id);
        let contract_address = contract_address.parse::<Address>()?;

        Ok(Self {
            provider: Arc::new(provider),
            wallet,
            contract_address,
            chain_id,
        })
    }

    /// Post attestation to ReputationRegistry contract
    pub async fn post_attestation(
        &self,
        quest_id: &str,
        data_hash: &str,
        _quote: &str,
        confidence_score: u8,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let client = SignerMiddleware::new(self.provider.clone(), self.wallet.clone());
        let contract = ReputationRegistry::new(self.contract_address, Arc::new(client));

        // Convert quest_id to bytes32
        let quest_id_bytes = self.string_to_bytes32(quest_id);
        
        // Create unique payment hash by combining data_hash with current timestamp
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let unique_hash = format!("{}_{}", data_hash, timestamp);
        let payment_hash_bytes = self.string_to_bytes32(&unique_hash);
        
        // Agent ID from quest_id hash (simplified)
        let agent_id = U256::from(1u64); // Scout agent ID placeholder
        
        // Tags for the verification
        let tags: Vec<String> = vec!["tee_verified".to_string(), "aetherswarm".to_string()];
        
        // Details URI (could be IPFS in production)
        let details_uri = format!("aetherswarm://attestation/{}", quest_id);

        println!("[OnChain] Posting attestation for quest: {}", quest_id);
        println!("[OnChain] Contract: {:?}", self.contract_address);
        println!("[OnChain] Score: {}", confidence_score);

        // Call contract with higher gas price for Polygon Amoy
        let receipt = contract
            .post_feedback(
                agent_id,
                confidence_score,
                tags,
                quest_id_bytes,
                payment_hash_bytes,
                details_uri,
            )
            .gas_price(30_000_000_000u64) // 30 gwei - Amoy requires minimum 25 gwei
            .send()
            .await?
            .await?
            .ok_or("Transaction failed")?;
        
        let tx_hash = format!("0x{:x}", receipt.transaction_hash);

        println!("[OnChain] Attestation posted: {}", tx_hash);
        println!("[OnChain] Explorer: https://amoy.polygonscan.com/tx/{}", tx_hash);

        Ok(tx_hash)
    }

    /// Convert string to bytes32 (takes first 32 bytes or pads with zeros)
    fn string_to_bytes32(&self, s: &str) -> [u8; 32] {
        let mut bytes = [0u8; 32];
        let s_bytes = s.as_bytes();
        let len = s_bytes.len().min(32);
        bytes[..len].copy_from_slice(&s_bytes[..len]);
        bytes
    }
}
