//! AetherSwarm Verifier Agent - EigenCloud TEE Integration
//! 
//! Implements Trusted Execution Environment verification using EigenCompute.
//! Verifies data integrity and produces cryptographic attestations.

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use tokio_tungstenite::{connect_async, tungstenite::Message};

mod eigencloud_sdk;
use eigencloud_sdk::EigenCompute;

/// TEE Attestation result from EigenCloud
#[derive(Debug, Serialize, Deserialize)]
pub struct TeeAttestation {
    /// Intel TDX or SGX attestation quote
    pub quote: String,
    /// Blake3 hash of verified data
    pub data_hash: String,
    /// Timestamp of attestation
    pub timestamp: u64,
    /// Validator public key
    pub validator_pubkey: String,
    /// Signature over attestation
    pub signature: String,
    /// Reproducibility score (0-100)
    pub confidence_score: u8,
}

/// Verification task from coordinator
#[derive(Debug, Deserialize)]
pub struct VerifyTask {
    #[serde(rename = "type")]
    pub task_type: String,
    #[serde(rename = "questId")]
    pub quest_id: String,
    pub data: Vec<DataChunk>,
    #[serde(rename = "expectedHashes")]
    pub expected_hashes: Vec<String>,
}

/// Data chunk to verify
#[derive(Debug, Deserialize, Serialize)]
pub struct DataChunk {
    pub source: String,
    pub data: Value,
    pub hash: String,
    pub timestamp: u64,
}

/// Verification result
#[derive(Debug, Serialize)]
pub struct VerificationResult {
    #[serde(rename = "type")]
    pub result_type: String,
    #[serde(rename = "questId")]
    pub quest_id: String,
    #[serde(rename = "agentId")]
    pub agent_id: String,
    pub status: String,
    pub attestation: TeeAttestation,
    #[serde(rename = "verifiedChunks")]
    pub verified_chunks: Vec<String>,
    #[serde(rename = "failedChunks")]
    pub failed_chunks: Vec<String>,
}

/// Verifier Agent implementation
pub struct VerifierAgent {
    agent_id: String,
    coordinator_url: String,
    eigen_compute: EigenCompute,
}

impl VerifierAgent {
    pub fn new() -> Self {
        // EigenCompute now uses ecloud CLI for auth (stored in OS keyring)
        let coordinator_url = env::var("COORDINATOR_WS_URL")
            .unwrap_or_else(|_| "ws://localhost:8080".to_string());
        let agent_id = env::var("AGENT_ID")
            .unwrap_or_else(|_| "verifier-001".to_string());

        Self {
            agent_id,
            coordinator_url,
            eigen_compute: EigenCompute::new(),
        }
    }

    /// Verify data integrity using Blake3 hashing
    fn verify_hash(&self, data: &Value, expected_hash: &str) -> bool {
        let data_bytes = serde_json::to_vec(data).unwrap_or_default();
        let computed_hash = blake3::hash(&data_bytes);
        let computed_hex = computed_hash.to_hex().to_string();
        
        computed_hex == expected_hash
    }

    /// Perform TEE-attested verification
    async fn verify_in_tee(&self, task: &VerifyTask) -> Result<VerificationResult, String> {
        let mut verified_chunks = Vec::new();
        let mut failed_chunks = Vec::new();

        // Verify each data chunk
        for chunk in &task.data {
            if self.verify_hash(&chunk.data, &chunk.hash) {
                verified_chunks.push(chunk.hash.clone());
            } else {
                failed_chunks.push(chunk.hash.clone());
            }
        }

        // Compute aggregate data hash
        let mut hasher = blake3::Hasher::new();
        for hash in &verified_chunks {
            hasher.update(hash.as_bytes());
        }
        let aggregate_hash = hasher.finalize().to_hex().to_string();

        // Get TEE attestation from EigenCloud
        let attestation = self.eigen_compute
            .execute_verification(
                &aggregate_hash,
                &verified_chunks,
                task.quest_id.as_str(),
            )
            .await?;

        let confidence = if failed_chunks.is_empty() { 100 } else { 
            ((verified_chunks.len() as f32 / task.data.len() as f32) * 100.0) as u8
        };

        let status = if confidence >= 95 { "verified" } else { "partial" };

        Ok(VerificationResult {
            result_type: "task_result".to_string(),
            quest_id: task.quest_id.clone(),
            agent_id: self.agent_id.clone(),
            status: status.to_string(),
            attestation: TeeAttestation {
                quote: attestation.quote,
                data_hash: aggregate_hash,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                validator_pubkey: attestation.validator_pubkey,
                signature: attestation.signature,
                confidence_score: confidence,
            },
            verified_chunks,
            failed_chunks,
        })
    }

    /// Handle incoming task from coordinator
    async fn handle_task(&self, message: &str) -> Option<String> {
        let task: Value = serde_json::from_str(message).ok()?;
        let task_type = task.get("type")?.as_str()?;

        match task_type {
            "verify_task" => {
                let verify_task: VerifyTask = serde_json::from_value(task.clone()).ok()?;
                
                println!("[Verifier] Received verification task for quest: {}", verify_task.quest_id);
                
                match self.verify_in_tee(&verify_task).await {
                    Ok(result) => {
                        println!(
                            "[Verifier] Verification complete: {} verified, {} failed",
                            result.verified_chunks.len(),
                            result.failed_chunks.len()
                        );
                        serde_json::to_string(&result).ok()
                    }
                    Err(e) => {
                        eprintln!("[Verifier] TEE verification failed: {}", e);
                        let error_response = json!({
                            "type": "task_result",
                            "questId": verify_task.quest_id,
                            "agentId": self.agent_id,
                            "status": "error",
                            "error": e
                        });
                        serde_json::to_string(&error_response).ok()
                    }
                }
            }
            "ping" => {
                Some(json!({"type": "pong", "agentId": self.agent_id}).to_string())
            }
            _ => {
                println!("[Verifier] Unknown task type: {}", task_type);
                None
            }
        }
    }

    /// Main agent loop
    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("[Verifier] Connecting to coordinator: {}", self.coordinator_url);

        let (ws_stream, _) = connect_async(&self.coordinator_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // Register with coordinator
        let registration = json!({
            "type": "register",
            "role": "verifier",
            "agentId": self.agent_id,
            "capabilities": ["tee_attestation", "hash_verification", "data_integrity"]
        });

        write.send(Message::Text(registration.to_string().into())).await?;
        println!("[Verifier] Registered as {}", self.agent_id);

        // Listen for tasks
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Some(response) = self.handle_task(&text).await {
                        write.send(Message::Text(response.into())).await?;
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("[Verifier] Connection closed");
                    break;
                }
                Err(e) => {
                    eprintln!("[Verifier] WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }

        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    
    let agent = VerifierAgent::new();
    agent.run().await
}
