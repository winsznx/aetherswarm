//! EigenCloud SDK for Verifiable Compute
//! 
//! Implements the EigenCompute SDK for TEE-based verification
//! Uses Intel TDX attestation via EigenLayer's infrastructure
//! 
//! EigenCloud Authentication:
//! - Install: npm install -g @layr-labs/ecloud-cli
//! - Auth: ecloud auth login (or ecloud auth generate --store)
//! - Credentials stored in OS keyring

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

/// EigenCloud attestation response
#[derive(Debug, Deserialize, Serialize)]
pub struct AttestationResponse {
    pub quote: String,
    #[serde(rename = "validatorPubkey")]
    pub validator_pubkey: String,
    pub signature: String,
    pub success: bool,
    pub error: Option<String>,
}

/// TEE deployment status
#[derive(Debug, Deserialize)]
pub struct DeploymentStatus {
    pub id: String,
    pub status: String,
    pub address: Option<String>,
    pub logs: Option<String>,
}

/// EigenCompute client for TEE operations
/// Uses ecloud CLI for authentication (credentials in OS keyring)
pub struct EigenCompute {
    environment: String,  // "testnet" or "mainnet"
    dev_mode: bool,
}

impl EigenCompute {
    pub fn new() -> Self {
        let environment = std::env::var("EIGENCLOUD_ENVIRONMENT")
            .unwrap_or_else(|_| "testnet".to_string());
        let dev_mode = std::env::var("EIGENCLOUD_DEV_MODE").is_ok();
        
        Self {
            environment,
            dev_mode,
        }
    }

    /// Check if ecloud CLI is authenticated
    pub fn check_auth(&self) -> Result<String, String> {
        let output = Command::new("ecloud")
            .args(["auth", "whoami"])
            .output()
            .map_err(|e| format!("Failed to run ecloud CLI: {}. Install with: npm install -g @layr-labs/ecloud-cli", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(format!(
                "Not authenticated. Run: ecloud auth login\n{}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    /// Deploy a verification container to EigenCloud TEE
    pub async fn deploy_verification_container(
        &self,
        image: &str,
    ) -> Result<DeploymentStatus, String> {
        // In dev mode, skip actual deployment
        if self.dev_mode {
            return Ok(DeploymentStatus {
                id: format!("dev-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()),
                status: "running".to_string(),
                address: Some("http://localhost:8090".to_string()),
                logs: None,
            });
        }

        // Use ecloud CLI to deploy
        let output = Command::new("ecloud")
            .args([
                "deploy",
                image,
                "--env", &self.environment,
                "--json"
            ])
            .output()
            .map_err(|e| format!("Failed to deploy: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Deployment failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse deployment response: {}", e))
    }

    /// Execute verification in TEE and get attestation
    /// 
    /// In production, this calls a deployed EigenCloud container
    /// In dev mode, generates a simulated attestation
    pub async fn execute_verification(
        &self,
        data_hash: &str,
        verified_hashes: &[String],
        quest_id: &str,
    ) -> Result<AttestationResponse, String> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // In dev mode, generate local attestation
        if self.dev_mode {
            return Ok(self.generate_dev_attestation(data_hash, quest_id));
        }

        // In production, call the deployed TEE container
        // The container provides attestation via TDX hardware
        let payload = serde_json::json!({
            "operation": "verify_data_integrity",
            "dataHash": data_hash,
            "verifiedHashes": verified_hashes,
            "questId": quest_id,
            "timestamp": timestamp,
            "teeType": "TDX"
        });

        // Get deployment address from environment or use default
        let tee_url = std::env::var("TEE_CONTAINER_URL")
            .unwrap_or_else(|_| "http://localhost:8090".to_string());

        let client = reqwest::Client::new();
        let response = client
            .post(format!("{}/verify", tee_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("TEE container error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "TEE verification failed: {}",
                response.text().await.unwrap_or_default()
            ));
        }

        response
            .json::<AttestationResponse>()
            .await
            .map_err(|e| format!("Failed to parse attestation: {}", e))
    }

    /// Generate a development attestation (NOT for production)
    /// This simulates what EigenCloud TEE would return
    fn generate_dev_attestation(&self, data_hash: &str, quest_id: &str) -> AttestationResponse {
        use blake3::Hasher;
        
        let mut hasher = Hasher::new();
        hasher.update(data_hash.as_bytes());
        hasher.update(quest_id.as_bytes());
        hasher.update(b"eigencloud_dev_attestation");
        
        let quote_hash = hasher.finalize();
        
        AttestationResponse {
            quote: format!("DEV_TDX_QUOTE_{}", quote_hash.to_hex()),
            validator_pubkey: format!("DEV_PUBKEY_{}", &quote_hash.to_hex()[..16]),
            signature: format!("DEV_SIG_{}", &quote_hash.to_hex()[16..48]),
            success: true,
            error: None,
        }
    }

    /// List deployed applications
    pub fn list_deployments(&self) -> Result<String, String> {
        let output = Command::new("ecloud")
            .args(["list", "--env", &self.environment])
            .output()
            .map_err(|e| format!("Failed to list deployments: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    /// Get logs from a deployment
    pub fn get_logs(&self, deployment_id: &str) -> Result<String, String> {
        let output = Command::new("ecloud")
            .args(["logs", deployment_id, "--env", &self.environment])
            .output()
            .map_err(|e| format!("Failed to get logs: {}", e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

impl Default for EigenCompute {
    fn default() -> Self {
        Self::new()
    }
}
