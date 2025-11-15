//! Base provider trait and types
//!
//! Defines the common interface that all model providers must implement

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Provider errors
#[derive(Error, Debug)]
pub enum ProviderError {
    #[error("HTTP error: {0}")]
    HttpError(String),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Timeout")]
    Timeout,

    #[error("Unsupported feature: {0}")]
    UnsupportedFeature(String),
}

/// Model provider trait
#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Get provider identifier
    fn id(&self) -> &str;

    /// Get provider display name
    fn name(&self) -> &str;

    /// Generate completion
    async fn generate(
        &self,
        request: GenerateRequest,
    ) -> Result<GenerateResponse, ProviderError>;

    /// Stream completion
    async fn stream<F>(
        &self,
        request: GenerateRequest,
        callback: F,
    ) -> Result<(), ProviderError>
    where
        F: Fn(StreamChunk) + Send + 'static;

    /// Check if provider supports a feature
    fn supports_feature(&self, feature: ProviderFeature) -> bool;

    /// Get model list
    async fn list_models(&self) -> Result<Vec<ModelInfo>, ProviderError>;
}

/// Generate request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateRequest {
    /// Model identifier
    pub model: String,

    /// Conversation messages
    pub messages: Vec<Message>,

    /// Available tools/functions
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ToolSchema>>,

    /// Generation parameters
    #[serde(flatten)]
    pub parameters: GenerationParameters,
}

/// Generation parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationParameters {
    /// Temperature (0.0 - 2.0)
    #[serde(default = "default_temperature")]
    pub temperature: f32,

    /// Maximum tokens to generate
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,

    /// Top-p sampling
    #[serde(default = "default_top_p")]
    pub top_p: f32,

    /// Stop sequences
    #[serde(default)]
    pub stop_sequences: Vec<String>,

    /// Top-k sampling (provider-specific)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<u32>,

    /// Frequency penalty
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,

    /// Presence penalty
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
}

fn default_temperature() -> f32 { 0.7 }
fn default_max_tokens() -> u32 { 4096 }
fn default_top_p() -> f32 { 1.0 }

impl Default for GenerationParameters {
    fn default() -> Self {
        Self {
            temperature: default_temperature(),
            max_tokens: default_max_tokens(),
            top_p: default_top_p(),
            stop_sequences: vec![],
            top_k: None,
            frequency_penalty: None,
            presence_penalty: None,
        }
    }
}

/// Message in conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// Message role (system, user, assistant)
    pub role: String,

    /// Message content
    pub content: String,

    /// Optional message name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Tool calls (for assistant messages)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
}

/// Tool/function call
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// Tool call ID
    pub id: String,

    /// Tool name
    pub name: String,

    /// Tool arguments (JSON)
    pub arguments: serde_json::Value,
}

/// Tool schema definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchema {
    /// Tool name
    pub name: String,

    /// Tool description
    pub description: String,

    /// Parameter schema (JSON Schema)
    pub parameters: serde_json::Value,
}

/// Generate response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateResponse {
    /// Generated content
    pub content: String,

    /// Tool calls made by model
    #[serde(default)]
    pub tool_calls: Vec<ToolCall>,

    /// Finish reason
    pub finish_reason: FinishReason,

    /// Token usage
    pub usage: TokenUsage,

    /// Provider-specific metadata
    #[serde(default)]
    pub metadata: serde_json::Value,
}

/// Reason for completion
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    /// Natural stop
    Stop,

    /// Maximum tokens reached
    MaxTokens,

    /// Tool calls requested
    ToolCalls,

    /// Content filtered
    ContentFilter,

    /// Other/unknown reason
    Other,
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    /// Prompt tokens
    pub prompt_tokens: u32,

    /// Completion tokens
    pub completion_tokens: u32,

    /// Total tokens
    pub total_tokens: u32,
}

/// Streaming chunk
#[derive(Debug, Clone)]
pub struct StreamChunk {
    /// Content delta
    pub delta: String,

    /// Tool call (if any)
    pub tool_call: Option<ToolCall>,

    /// Whether this is the final chunk
    pub is_final: bool,

    /// Finish reason (if final)
    pub finish_reason: Option<FinishReason>,
}

/// Provider feature
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderFeature {
    /// Supports streaming responses
    Streaming,

    /// Supports function/tool calling
    ToolCalling,

    /// Supports system messages
    SystemMessages,

    /// Supports JSON mode
    JsonMode,

    /// Supports vision/images
    Vision,
}

/// Model information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// Model ID
    pub id: String,

    /// Model display name
    pub name: String,

    /// Model description
    pub description: String,

    /// Context window size
    pub context_window: u32,

    /// Maximum output tokens
    pub max_output_tokens: u32,

    /// Supported features
    pub features: Vec<String>,
}
