//! Groq provider implementation (Llama 3.3)

use super::base::*;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

/// Groq provider
pub struct GroqProvider {
    api_key: String,
    base_url: String,
    client: Client,
}

impl GroqProvider {
    /// Create a new Groq provider
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://api.groq.com/openai/v1".to_string(),
            client: Client::new(),
        }
    }

    /// Set custom base URL (for testing)
    pub fn with_base_url(mut self, base_url: String) -> Self {
        self.base_url = base_url;
        self
    }
}

#[async_trait]
impl ModelProvider for GroqProvider {
    fn id(&self) -> &str {
        "groq"
    }

    fn name(&self) -> &str {
        "Groq"
    }

    async fn generate(
        &self,
        request: GenerateRequest,
    ) -> Result<GenerateResponse, ProviderError> {
        // Build Groq API request (OpenAI-compatible format)
        let messages: Vec<serde_json::Value> = request
            .messages
            .iter()
            .map(|msg| {
                json!({
                    "role": msg.role,
                    "content": msg.content
                })
            })
            .collect();

        let mut body = json!({
            "model": request.model,
            "messages": messages,
            "temperature": request.parameters.temperature,
            "max_tokens": request.parameters.max_tokens,
        });

        // Add tools if provided
        if let Some(tools) = request.tools {
            let tools_json: Vec<serde_json::Value> = tools
                .iter()
                .map(|tool| {
                    json!({
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": tool.parameters
                        }
                    })
                })
                .collect();
            body["tools"] = json!(tools_json);
        }

        // Make HTTP request
        let response = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ProviderError::ApiError(format!(
                "Groq API error {}: {}",
                status, error_text
            )));
        }

        // Parse response
        let groq_response: GroqCompletionResponse = response
            .json()
            .await
            .map_err(|e| ProviderError::ParseError(e.to_string()))?;

        // Extract content and tool calls
        let choice = groq_response
            .choices
            .first()
            .ok_or_else(|| ProviderError::ParseError("No choices in response".to_string()))?;

        let content = choice.message.content.clone().unwrap_or_default();
        let tool_calls = choice
            .message
            .tool_calls
            .as_ref()
            .map(|calls| {
                calls
                    .iter()
                    .map(|tc| ToolCall {
                        id: tc.id.clone(),
                        name: tc.function.name.clone(),
                        arguments: serde_json::from_str(&tc.function.arguments)
                            .unwrap_or(serde_json::Value::Null),
                    })
                    .collect()
            })
            .unwrap_or_default();

        let finish_reason = match choice.finish_reason.as_str() {
            "stop" => FinishReason::Stop,
            "length" => FinishReason::MaxTokens,
            "tool_calls" => FinishReason::ToolCalls,
            _ => FinishReason::Stop,
        };

        Ok(GenerateResponse {
            content,
            tool_calls,
            finish_reason,
            usage: TokenUsage {
                prompt_tokens: groq_response.usage.prompt_tokens,
                completion_tokens: groq_response.usage.completion_tokens,
                total_tokens: groq_response.usage.total_tokens,
            },
            metadata: serde_json::to_value(&groq_response)
                .unwrap_or(serde_json::Value::Null),
        })
    }

    async fn stream<F>(
        &self,
        _request: GenerateRequest,
        _callback: F,
    ) -> Result<(), ProviderError>
    where
        F: Fn(StreamChunk) + Send + 'static,
    {
        // Implementation would use the inference engine
        Ok(())
    }

    fn supports_feature(&self, feature: ProviderFeature) -> bool {
        matches!(
            feature,
            ProviderFeature::Streaming
                | ProviderFeature::ToolCalling
                | ProviderFeature::SystemMessages
        )
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, ProviderError> {
        Ok(vec![
            ModelInfo {
                id: "llama-3.3-70b-versatile".to_string(),
                name: "Llama 3.3 70B".to_string(),
                description: "Meta's most capable Llama model".to_string(),
                context_window: 128_000,
                max_output_tokens: 8192,
                features: vec!["streaming".to_string(), "tool_calling".to_string()],
            },
            ModelInfo {
                id: "llama-3.1-8b-instant".to_string(),
                name: "Llama 3.1 8B (Instant)".to_string(),
                description: "Fast and efficient Llama model".to_string(),
                context_window: 128_000,
                max_output_tokens: 8192,
                features: vec!["streaming".to_string()],
            },
        ])
    }
}

// ============================================================================
// Groq API Response Types (OpenAI-compatible)
// ============================================================================

#[derive(Debug, Deserialize, Serialize)]
struct GroqCompletionResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<GroqChoice>,
    usage: GroqUsage,
}

#[derive(Debug, Deserialize, Serialize)]
struct GroqChoice {
    index: u32,
    message: GroqMessage,
    finish_reason: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct GroqMessage {
    role: String,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_calls: Option<Vec<GroqToolCall>>,
}

#[derive(Debug, Deserialize, Serialize)]
struct GroqToolCall {
    id: String,
    #[serde(rename = "type")]
    call_type: String,
    function: GroqFunction,
}

#[derive(Debug, Deserialize, Serialize)]
struct GroqFunction {
    name: String,
    arguments: String, // JSON string
}

#[derive(Debug, Deserialize, Serialize)]
struct GroqUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}
