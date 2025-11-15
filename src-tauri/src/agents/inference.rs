//! Model inference engine
//!
//! This module handles communication with AI model providers (Google Gemini, Groq)
//! including request/response handling, streaming, and error management.

use super::core::{AgentError, ToolCall, ToolResult};
use super::rate_limiter::RateLimiter;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use thiserror::Error;

/// Inference errors
#[derive(Error, Debug)]
pub enum InferenceError {
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Timeout after {0:?}")]
    Timeout(Duration),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Model provider identifier
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Google,
    Groq,
}

/// Inference engine for model API calls
pub struct InferenceEngine {
    /// HTTP client for API requests
    client: Client,

    /// Rate limiter for request throttling
    rate_limiter: Arc<RateLimiter>,

    /// Request timeout
    timeout: Duration,
}

impl InferenceEngine {
    /// Create a new inference engine
    pub fn new(provider: Provider) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .expect("Failed to create HTTP client"),
            rate_limiter: Arc::new(RateLimiter::for_provider(
                match provider {
                    Provider::Google => "google",
                    Provider::Groq => "groq",
                }
            )),
            timeout: Duration::from_secs(60),
        }
    }

    /// Perform inference (non-streaming)
    pub async fn infer(
        &self,
        provider: Provider,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
    ) -> Result<InferenceResponse, InferenceError> {
        // Wait for rate limiter
        self.rate_limiter.acquire().await
            .map_err(|_| InferenceError::RateLimitExceeded)?;

        let start = Instant::now();

        let response = match provider {
            Provider::Google => {
                self.infer_google(model, messages, tools, config, api_key).await?
            }
            Provider::Groq => {
                self.infer_groq(model, messages, tools, config, api_key).await?
            }
        };

        // Record duration
        let duration = start.elapsed();
        tracing::info!(
            "Inference completed in {:?} with {} tokens",
            duration,
            response.usage.total_tokens
        );

        Ok(response)
    }

    /// Perform streaming inference
    pub async fn stream_infer<F>(
        &self,
        provider: Provider,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
        mut callback: F,
    ) -> Result<(), InferenceError>
    where
        F: FnMut(StreamChunk) + Send + 'static,
    {
        // Wait for rate limiter
        self.rate_limiter.acquire().await
            .map_err(|_| InferenceError::RateLimitExceeded)?;

        match provider {
            Provider::Google => {
                self.stream_google(model, messages, tools, config, api_key, callback).await
            }
            Provider::Groq => {
                self.stream_groq(model, messages, tools, config, api_key, callback).await
            }
        }
    }

    /// Infer using Google Gemini
    async fn infer_google(
        &self,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
    ) -> Result<InferenceResponse, InferenceError> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );

        let request_body = GoogleRequest {
            contents: messages.into_iter().map(|m| m.into()).collect(),
            tools: tools.map(|t| vec![GoogleTools {
                function_declarations: t.into_iter().map(|td| td.into()).collect(),
            }]),
            generation_config: Some(GoogleGenerationConfig {
                temperature: Some(config.temperature),
                max_output_tokens: Some(config.max_tokens),
                top_p: Some(config.top_p),
                stop_sequences: if config.stop_sequences.is_empty() {
                    None
                } else {
                    Some(config.stop_sequences)
                },
            }),
        };

        let response = self.client
            .post(&url)
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(InferenceError::ProviderError(error_text));
        }

        let google_response: GoogleResponse = response.json().await?;
        Ok(google_response.into())
    }

    /// Stream using Google Gemini
    async fn stream_google<F>(
        &self,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
        mut callback: F,
    ) -> Result<(), InferenceError>
    where
        F: FnMut(StreamChunk) + Send + 'static,
    {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}",
            model, api_key
        );

        let request_body = GoogleRequest {
            contents: messages.into_iter().map(|m| m.into()).collect(),
            tools: tools.map(|t| vec![GoogleTools {
                function_declarations: t.into_iter().map(|td| td.into()).collect(),
            }]),
            generation_config: Some(GoogleGenerationConfig {
                temperature: Some(config.temperature),
                max_output_tokens: Some(config.max_tokens),
                top_p: Some(config.top_p),
                stop_sequences: if config.stop_sequences.is_empty() {
                    None
                } else {
                    Some(config.stop_sequences)
                },
            }),
        };

        let response = self.client
            .post(&url)
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(InferenceError::ProviderError(error_text));
        }

        // Process streaming response
        let bytes = response.bytes().await?;
        let text = String::from_utf8_lossy(&bytes);

        // Parse streaming chunks (simplified)
        for line in text.lines() {
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(chunk_response) = serde_json::from_str::<GoogleResponse>(line) {
                if let Some(candidate) = chunk_response.candidates.first() {
                    if let Some(content) = &candidate.content {
                        for part in &content.parts {
                            if let Some(text) = &part.text {
                                callback(StreamChunk {
                                    delta: text.clone(),
                                    tool_call: None,
                                    is_final: false,
                                });
                            }
                        }
                    }
                }
            }
        }

        callback(StreamChunk {
            delta: String::new(),
            tool_call: None,
            is_final: true,
        });

        Ok(())
    }

    /// Infer using Groq
    async fn infer_groq(
        &self,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
    ) -> Result<InferenceResponse, InferenceError> {
        let url = "https://api.groq.com/openai/v1/chat/completions";

        let request_body = GroqRequest {
            model: model.to_string(),
            messages: messages.into_iter().map(|m| m.into()).collect(),
            tools: tools.map(|t| {
                t.into_iter().map(|td| GroqTool {
                    r#type: "function".to_string(),
                    function: GroqFunction {
                        name: td.name,
                        description: td.description,
                        parameters: td.parameters,
                    },
                }).collect()
            }),
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            stop: if config.stop_sequences.is_empty() {
                None
            } else {
                Some(config.stop_sequences)
            },
            stream: false,
        };

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(InferenceError::ProviderError(error_text));
        }

        let groq_response: GroqResponse = response.json().await?;
        Ok(groq_response.into())
    }

    /// Stream using Groq
    async fn stream_groq<F>(
        &self,
        model: &str,
        messages: Vec<InferenceMessage>,
        tools: Option<Vec<ToolDefinition>>,
        config: InferenceConfig,
        api_key: &str,
        mut callback: F,
    ) -> Result<(), InferenceError>
    where
        F: FnMut(StreamChunk) + Send + 'static,
    {
        let url = "https://api.groq.com/openai/v1/chat/completions";

        let request_body = GroqRequest {
            model: model.to_string(),
            messages: messages.into_iter().map(|m| m.into()).collect(),
            tools: tools.map(|t| {
                t.into_iter().map(|td| GroqTool {
                    r#type: "function".to_string(),
                    function: GroqFunction {
                        name: td.name,
                        description: td.description,
                        parameters: td.parameters,
                    },
                }).collect()
            }),
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            top_p: config.top_p,
            stop: if config.stop_sequences.is_empty() {
                None
            } else {
                Some(config.stop_sequences)
            },
            stream: true,
        };

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(InferenceError::ProviderError(error_text));
        }

        // Process SSE streaming
        let bytes = response.bytes().await?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }

                if let Ok(chunk) = serde_json::from_str::<GroqStreamChunk>(data) {
                    if let Some(choice) = chunk.choices.first() {
                        if let Some(delta) = &choice.delta.content {
                            callback(StreamChunk {
                                delta: delta.clone(),
                                tool_call: None,
                                is_final: false,
                            });
                        }
                    }
                }
            }
        }

        callback(StreamChunk {
            delta: String::new(),
            tool_call: None,
            is_final: true,
        });

        Ok(())
    }
}

// ============================================================================
// Common Types
// ============================================================================

/// Inference configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceConfig {
    pub temperature: f32,
    pub max_tokens: u32,
    pub top_p: f32,
    pub stop_sequences: Vec<String>,
}

impl Default for InferenceConfig {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 1.0,
            stop_sequences: vec![],
        }
    }
}

/// Inference message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceMessage {
    pub role: String,
    pub content: String,
}

/// Tool definition for function calling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

/// Inference response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResponse {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub finish_reason: FinishReason,
    pub usage: TokenUsage,
}

/// Finish reason
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FinishReason {
    Stop,
    MaxTokens,
    ToolCalls,
    ContentFilter,
    Other,
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Streaming chunk
#[derive(Debug, Clone)]
pub struct StreamChunk {
    pub delta: String,
    pub tool_call: Option<ToolCall>,
    pub is_final: bool,
}

// ============================================================================
// Google Gemini Types
// ============================================================================

#[derive(Debug, Serialize)]
struct GoogleRequest {
    contents: Vec<GoogleContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<GoogleTools>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    generation_config: Option<GoogleGenerationConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleContent {
    role: String,
    parts: Vec<GooglePart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GooglePart {
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
}

#[derive(Debug, Serialize)]
struct GoogleTools {
    function_declarations: Vec<GoogleFunctionDeclaration>,
}

#[derive(Debug, Serialize)]
struct GoogleFunctionDeclaration {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct GoogleGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct GoogleResponse {
    candidates: Vec<GoogleCandidate>,
    #[serde(default)]
    usage_metadata: Option<GoogleUsageMetadata>,
}

#[derive(Debug, Deserialize)]
struct GoogleCandidate {
    content: Option<GoogleContent>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleUsageMetadata {
    prompt_token_count: u32,
    candidates_token_count: u32,
    total_token_count: u32,
}

// ============================================================================
// Groq Types
// ============================================================================

#[derive(Debug, Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<GroqMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<GroqTool>>,
    temperature: f32,
    max_tokens: u32,
    top_p: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct GroqMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct GroqTool {
    r#type: String,
    function: GroqFunction,
}

#[derive(Debug, Serialize)]
struct GroqFunction {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
    usage: GroqUsage,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
    message: GroqMessage,
    finish_reason: String,
}

#[derive(Debug, Deserialize)]
struct GroqUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct GroqStreamChunk {
    choices: Vec<GroqStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct GroqStreamChoice {
    delta: GroqDelta,
}

#[derive(Debug, Deserialize)]
struct GroqDelta {
    content: Option<String>,
}

// ============================================================================
// Conversions
// ============================================================================

impl From<InferenceMessage> for GoogleContent {
    fn from(msg: InferenceMessage) -> Self {
        GoogleContent {
            role: if msg.role == "system" || msg.role == "assistant" {
                "model".to_string()
            } else {
                msg.role
            },
            parts: vec![GooglePart {
                text: Some(msg.content),
            }],
        }
    }
}

impl From<InferenceMessage> for GroqMessage {
    fn from(msg: InferenceMessage) -> Self {
        GroqMessage {
            role: msg.role,
            content: msg.content,
        }
    }
}

impl From<ToolDefinition> for GoogleFunctionDeclaration {
    fn from(td: ToolDefinition) -> Self {
        GoogleFunctionDeclaration {
            name: td.name,
            description: td.description,
            parameters: td.parameters,
        }
    }
}

impl From<GoogleResponse> for InferenceResponse {
    fn from(resp: GoogleResponse) -> Self {
        let content = resp.candidates
            .first()
            .and_then(|c| c.content.as_ref())
            .and_then(|c| c.parts.first())
            .and_then(|p| p.text.clone())
            .unwrap_or_default();

        let finish_reason = resp.candidates
            .first()
            .and_then(|c| c.finish_reason.as_deref())
            .map(|r| match r {
                "STOP" => FinishReason::Stop,
                "MAX_TOKENS" => FinishReason::MaxTokens,
                _ => FinishReason::Other,
            })
            .unwrap_or(FinishReason::Other);

        let usage = resp.usage_metadata
            .map(|u| TokenUsage {
                prompt_tokens: u.prompt_token_count,
                completion_tokens: u.candidates_token_count,
                total_tokens: u.total_token_count,
            })
            .unwrap_or(TokenUsage {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            });

        InferenceResponse {
            content,
            tool_calls: vec![],
            finish_reason,
            usage,
        }
    }
}

impl From<GroqResponse> for InferenceResponse {
    fn from(resp: GroqResponse) -> Self {
        let content = resp.choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        let finish_reason = resp.choices
            .first()
            .map(|c| match c.finish_reason.as_str() {
                "stop" => FinishReason::Stop,
                "length" => FinishReason::MaxTokens,
                "tool_calls" => FinishReason::ToolCalls,
                _ => FinishReason::Other,
            })
            .unwrap_or(FinishReason::Other);

        InferenceResponse {
            content,
            tool_calls: vec![],
            finish_reason,
            usage: TokenUsage {
                prompt_tokens: resp.usage.prompt_tokens,
                completion_tokens: resp.usage.completion_tokens,
                total_tokens: resp.usage.total_tokens,
            },
        }
    }
}
