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

// Re-exports for convenience
pub use core::{
    Agent, AgentConfig, AgentError, AgentInput, AgentMetadata, AgentResult,
    Capability, Session, ToolCall, ToolResult,
};

pub use memory::{
    ConversationMemory, MemoryManager, MemoryStats, MemoryUsage,
    Message, MessageRole,
};

pub use metrics::{
    AgentMetrics, AllMetrics, MetricsCollector, ProviderMetrics,
    SystemMetrics, ToolMetrics,
};

pub use rate_limiter::{RateLimiter, RateLimiterStats};

pub use inference::{
    FinishReason, InferenceConfig, InferenceEngine, InferenceError,
    InferenceMessage, InferenceResponse, Provider, StreamChunk, TokenUsage,
    ToolDefinition,
};

pub use executor::{Tool, ToolDefinition as ExecutorToolDefinition, ToolError, ToolExecutor};

pub use providers::{GoogleProvider, GroqProvider, ModelProvider};

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

    /// Inference engines per provider
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

        // Execute agent logic (simplified)
        let result = AgentResult {
            content: "Agent response placeholder".to_string(),
            tool_calls: vec![],
            metadata: AgentMetadata::default(),
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
