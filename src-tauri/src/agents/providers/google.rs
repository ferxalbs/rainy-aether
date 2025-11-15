//! Google Gemini provider implementation

use super::base::*;
use async_trait::async_trait;
use reqwest::Client;

/// Google Gemini provider
pub struct GoogleProvider {
    api_key: String,
    base_url: String,
    client: Client,
}

impl GoogleProvider {
    /// Create a new Google provider
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
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
impl ModelProvider for GoogleProvider {
    fn id(&self) -> &str {
        "google"
    }

    fn name(&self) -> &str {
        "Google Gemini"
    }

    async fn generate(
        &self,
        _request: GenerateRequest,
    ) -> Result<GenerateResponse, ProviderError> {
        // Implementation would use the inference engine
        // This is a placeholder
        Ok(GenerateResponse {
            content: String::new(),
            tool_calls: vec![],
            finish_reason: FinishReason::Stop,
            usage: TokenUsage {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
            metadata: serde_json::Value::Null,
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
                id: "gemini-2.0-flash-exp".to_string(),
                name: "Gemini 2.0 Flash (Experimental)".to_string(),
                description: "Fastest Gemini model with experimental features".to_string(),
                context_window: 1_000_000,
                max_output_tokens: 8192,
                features: vec!["streaming".to_string(), "tool_calling".to_string()],
            },
            ModelInfo {
                id: "gemini-1.5-pro".to_string(),
                name: "Gemini 1.5 Pro".to_string(),
                description: "Most capable Gemini model".to_string(),
                context_window: 1_000_000,
                max_output_tokens: 8192,
                features: vec!["streaming".to_string(), "tool_calling".to_string(), "vision".to_string()],
            },
        ])
    }
}
