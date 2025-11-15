//! Agent system module
//!
//! This module provides a comprehensive multi-agent system with support for:
//! - Multiple AI providers (Google Gemini, Groq)
//! - Tool execution with caching and rate limiting
//! - Memory management and conversation history
//! - Performance metrics and telemetry
//! - Streaming responses
//!
//! # Architecture
//!
//! The agent system follows a layered architecture:
//!
//! 1. **Core Layer** (`core.rs`): Fundamental types and traits
//! 2. **Infrastructure Layer**: Memory, metrics, rate limiting
//! 3. **Provider Layer**: AI model integrations
//! 4. **Tool Layer**: Executable tools for agents
//! 5. **Execution Layer**: Inference and tool execution engines
//!
//! # Example
//!
//! ```ignore
//! use agents::{AgentManager, AgentConfig};
//!
//! let manager = AgentManager::new();
//! let session_id = manager.create_session(
//!     "rainy",
//!     AgentConfig {
//!         provider: "groq".to_string(),
//!         model: "llama-3.3-70b-versatile".to_string(),
//!         ..Default::default()
//!     }
//! ).await?;
//!
//! let response = manager.send_message(
//!     &session_id,
//!     "List all TypeScript files",
//!     true // enable tools
//! ).await?;
//! ```

pub mod core;
pub mod memory;
pub mod metrics;
pub mod rate_limiter;
pub mod inference;
pub mod executor;
pub mod providers;
pub mod tools;
pub mod commands;

// Re-exports for convenience (used by commands.rs and external modules)
pub use core::{
    AgentConfig, AgentError, AgentInput, AgentMetadata, AgentResult,
    Session,
};

pub use memory::{
    MemoryManager, MemoryStats,
    Message,
};

pub use metrics::{
    AgentMetrics, AllMetrics, MetricsCollector,
};

pub use executor::{ToolExecutor};

// Re-export for commands
pub use executor::ToolDefinition;

// Internal use only
use inference::InferenceEngine;
use providers::base::ModelProvider;

use dashmap::DashMap;
use parking_lot::RwLock;
use std::sync::Arc;
use std::time::Duration;

/// Agent manager - Main entry point for the agent system
///
/// The AgentManager coordinates all agent operations, managing sessions,
/// executing inference, and coordinating tool execution.
pub struct AgentManager {
    /// Active sessions
    sessions: Arc<DashMap<String, Session>>,

    /// Memory manager
    memory: Arc<MemoryManager>,

    /// Metrics collector
    metrics: Arc<MetricsCollector>,

    /// Tool executor
    executor: Arc<ToolExecutor>,

    /// Inference engines per provider (reserved for future implementation)
    #[allow(dead_code)]
    inference_engines: Arc<RwLock<std::collections::HashMap<String, InferenceEngine>>>,
}

impl AgentManager {
    /// Create a new agent manager
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
            memory: Arc::new(MemoryManager::default()),
            metrics: Arc::new(MetricsCollector::new()),
            executor: Arc::new(ToolExecutor::new(
                10, // max concurrent tools
                Duration::from_secs(30), // default timeout
            )),
            inference_engines: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Create a new agent session
    pub fn create_session(
        &self,
        agent_type: String,
        config: AgentConfig,
    ) -> Result<String, AgentError> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session = Session::new(session_id.clone(), agent_type, config);

        self.sessions.insert(session_id.clone(), session);

        tracing::info!("Created agent session: {}", session_id);

        Ok(session_id)
    }

    /// Send a message to an agent
    pub async fn send_message(
        &self,
        session_id: &str,
        message: String,
        enable_tools: bool,
    ) -> Result<AgentResult, AgentError> {
        let session = self.sessions
            .get(session_id)
            .ok_or_else(|| AgentError::SessionNotFound(session_id.to_string()))?;

        let input = AgentInput {
            session_id: session_id.to_string(),
            message,
            context: Default::default(),
            tools_enabled: enable_tools,
            max_iterations: session.config.max_iterations,
            temperature: session.config.temperature,
            max_tokens: session.config.max_tokens,
        };

        // Add user message to memory
        self.memory.add_message(
            session_id,
            Message::user(input.message.clone()),
        );

        // Get conversation history for context
        let history = self.memory.get_history(session_id, None);

        // Build messages for provider (convert from memory::Message to providers::base::Message)
        let mut provider_messages: Vec<providers::base::Message> = history
            .iter()
            .map(|msg| providers::base::Message {
                role: msg.role.as_str().to_string(),
                content: msg.content.clone(),
                name: None,
                tool_calls: None,
            })
            .collect();

        // Create provider instance
        // Get API key from config.extra or environment variable
        let api_key = session.config.extra
            .get("api_key")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .or_else(|| std::env::var("GROQ_API_KEY").ok())
            .unwrap_or_default();

        let provider = providers::groq::GroqProvider::new(api_key);

        // Get tool definitions if enabled
        let tools = if enable_tools {
            Some(self.executor.list_tools().iter().map(|tool| {
                providers::base::ToolSchema {
                    name: tool.name.clone(),
                    description: tool.description.clone(),
                    parameters: tool.parameters.clone(),
                }
            }).collect())
        } else {
            None
        };

        // Start timing
        let start_time = std::time::Instant::now();
        let mut total_tokens = 0u32;
        let mut all_tool_calls = Vec::new();
        let mut final_content = String::new();
        let mut iterations = 0;

        // Tool execution loop
        loop {
            iterations += 1;
            if iterations > input.max_iterations {
                break;
            }

            // Build generate request
            let generate_request = providers::base::GenerateRequest {
                model: session.config.model.clone(),
                messages: provider_messages.clone(),
                tools: tools.clone(),
                parameters: providers::base::GenerationParameters {
                    temperature: input.temperature,
                    max_tokens: input.max_tokens,
                    top_p: 1.0,
                    stop_sequences: vec![],
                    top_k: None,
                    frequency_penalty: None,
                    presence_penalty: None,
                },
            };

            // Call provider
            let response = provider.generate(generate_request).await
                .map_err(|e| AgentError::InferenceFailed(e.to_string()))?;

            // Update token count
            total_tokens += response.usage.total_tokens;
            final_content = response.content.clone();

            // Add assistant response to message history
            provider_messages.push(providers::base::Message {
                role: "assistant".to_string(),
                content: response.content.clone(),
                name: None,
                tool_calls: if response.tool_calls.is_empty() {
                    None
                } else {
                    Some(response.tool_calls.clone())
                },
            });

            // Check if we need to execute tools
            if response.tool_calls.is_empty() {
                // No more tool calls, we're done
                break;
            }

            // Execute tool calls
            all_tool_calls.extend(response.tool_calls.clone());

            for tool_call in &response.tool_calls {
                let tool_result = self.executor.execute(
                    &tool_call.name,
                    tool_call.arguments.clone(),
                    None, // No cache key for now
                ).await;

                // Add tool result to message history
                let tool_result_content = match tool_result {
                    Ok(result) => serde_json::to_string(&result.output).unwrap_or_default(),
                    Err(e) => format!("{{\"error\": \"{}\"}}", e),
                };

                provider_messages.push(providers::base::Message {
                    role: "tool".to_string(),
                    content: tool_result_content,
                    name: Some(tool_call.name.clone()),
                    tool_calls: None,
                });
            }

            // Continue loop to get next response from model
        }

        // Calculate execution time
        let execution_time = start_time.elapsed();

        // Build result
        let result = AgentResult {
            content: final_content.clone(),
            tool_calls: all_tool_calls.iter().map(|tc| {
                core::ToolCall {
                    id: tc.id.clone(),
                    name: tc.name.clone(),
                    arguments: tc.arguments.clone(),
                    result: None, // We don't store results in memory for now
                    timestamp: chrono::Utc::now(),
                }
            }).collect(),
            metadata: AgentMetadata {
                tokens_used: total_tokens,
                execution_time_ms: execution_time.as_millis() as u64,
                cost_usd: (total_tokens as f64) * 0.00001, // Rough estimate
                model: Some(session.config.model.clone()),
                provider: Some(session.config.provider.clone()),
                iterations,
                tools_executed: all_tool_calls.iter().map(|tc| tc.name.clone()).collect(),
            },
            success: true,
            error: None,
        };

        // Add assistant message to memory
        self.memory.add_message(
            session_id,
            Message::assistant(result.content.clone()),
        );

        // Update session metrics
        if let Some(mut session) = self.sessions.get_mut(session_id) {
            session.update_from_metadata(&result.metadata);
        }

        // Record metrics
        self.metrics.record_agent_execution(
            &session.agent_type,
            Duration::from_millis(result.metadata.execution_time_ms),
            result.metadata.tokens_used,
            result.metadata.cost_usd,
            result.success,
        );

        Ok(result)
    }

    /// Get session information
    pub fn get_session(&self, session_id: &str) -> Option<Session> {
        self.sessions.get(session_id).map(|s| s.clone())
    }

    /// Get conversation history
    pub fn get_history(&self, session_id: &str, limit: Option<usize>) -> Vec<Message> {
        self.memory.get_history(session_id, limit)
    }

    /// Get memory statistics
    pub fn get_memory_stats(&self, session_id: &str) -> Option<MemoryStats> {
        self.memory.get_stats(session_id)
    }

    /// Get agent metrics
    pub fn get_metrics(&self, agent_id: &str) -> Option<AgentMetrics> {
        self.metrics.get_agent_metrics(agent_id)
    }

    /// Get all metrics
    pub fn get_all_metrics(&self) -> AllMetrics {
        self.metrics.get_all_metrics()
    }

    /// List available tools
    pub fn list_tools(&self) -> Vec<executor::ToolDefinition> {
        self.executor.list_tools()
    }

    /// Destroy a session
    pub fn destroy_session(&self, session_id: &str) -> Result<(), AgentError> {
        self.sessions.remove(session_id)
            .ok_or_else(|| AgentError::SessionNotFound(session_id.to_string()))?;

        self.memory.clear_session(session_id);

        tracing::info!("Destroyed agent session: {}", session_id);

        Ok(())
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Get active session IDs
    pub fn active_sessions(&self) -> Vec<String> {
        self.sessions.iter().map(|s| s.key().clone()).collect()
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_manager_creation() {
        let manager = AgentManager::new();
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_session_creation() {
        let manager = AgentManager::new();

        let session_id = manager.create_session(
            "test-agent".to_string(),
            AgentConfig {
                provider: "groq".to_string(),
                model: "llama-3.3-70b-versatile".to_string(),
                system_prompt: None,
                max_iterations: 10,
                tool_timeout: 30000,
                parallel_tools: true,
                temperature: 0.7,
                max_tokens: 4096,
                extra: Default::default(),
            },
        ).unwrap();

        assert_eq!(manager.session_count(), 1);
        assert!(manager.get_session(&session_id).is_some());
    }

    #[test]
    fn test_session_destruction() {
        let manager = AgentManager::new();

        let session_id = manager.create_session(
            "test-agent".to_string(),
            AgentConfig {
                provider: "groq".to_string(),
                model: "llama-3.3-70b-versatile".to_string(),
                system_prompt: None,
                max_iterations: 10,
                tool_timeout: 30000,
                parallel_tools: true,
                temperature: 0.7,
                max_tokens: 4096,
                extra: Default::default(),
            },
        ).unwrap();

        assert_eq!(manager.session_count(), 1);

        manager.destroy_session(&session_id).unwrap();

        assert_eq!(manager.session_count(), 0);
    }
}
