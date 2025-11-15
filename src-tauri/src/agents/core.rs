//! Core agent types, traits, and interfaces
//!
//! This module defines the fundamental abstractions for the agent system,
//! including the Agent trait, input/output types, and capability definitions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use async_trait::async_trait;
use thiserror::Error;

/// Agent execution errors
#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Agent not initialized")]
    NotInitialized,

    #[error("Tool execution failed: {0}")]
    ToolExecutionFailed(String),

    #[error("Inference failed: {0}")]
    InferenceFailed(String),

    #[error("Memory limit exceeded")]
    MemoryLimitExceeded,

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Other error: {0}")]
    Other(String),
}

/// Core trait that all agents must implement
#[async_trait]
pub trait Agent: Send + Sync {
    /// Get the unique identifier of the agent
    fn id(&self) -> &str;

    /// Get the display name of the agent
    fn name(&self) -> &str;

    /// Execute the agent with given input
    async fn execute(&self, input: AgentInput) -> Result<AgentResult, AgentError>;

    /// Get the capabilities of this agent
    fn capabilities(&self) -> Vec<Capability>;

    /// Check if agent has a specific capability
    fn has_capability(&self, capability: &Capability) -> bool {
        self.capabilities().contains(capability)
    }
}

/// Input structure for agent execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInput {
    /// Unique session identifier
    pub session_id: String,

    /// User message/prompt
    pub message: String,

    /// Additional context data
    #[serde(default)]
    pub context: HashMap<String, serde_json::Value>,

    /// Whether tools are enabled for this execution
    #[serde(default = "default_true")]
    pub tools_enabled: bool,

    /// Maximum number of agent iterations
    #[serde(default = "default_max_iterations")]
    pub max_iterations: u32,

    /// Temperature for model inference (0.0 - 2.0)
    #[serde(default = "default_temperature")]
    pub temperature: f32,

    /// Maximum tokens in response
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

fn default_true() -> bool { true }
fn default_max_iterations() -> u32 { 10 }
fn default_temperature() -> f32 { 0.7 }
fn default_max_tokens() -> u32 { 4096 }

/// Result structure from agent execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    /// The agent's response content
    pub content: String,

    /// Tool calls made during execution
    #[serde(default)]
    pub tool_calls: Vec<ToolCall>,

    /// Execution metadata and metrics
    pub metadata: AgentMetadata,

    /// Whether execution completed successfully
    pub success: bool,

    /// Error message if execution failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Metadata about agent execution
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentMetadata {
    /// Total tokens used (prompt + completion)
    #[serde(default)]
    pub tokens_used: u32,

    /// Execution time in milliseconds
    #[serde(default)]
    pub execution_time_ms: u64,

    /// Names of tools executed
    #[serde(default)]
    pub tools_executed: Vec<String>,

    /// Estimated cost in USD
    #[serde(default)]
    pub cost_usd: f64,

    /// Number of iterations performed
    #[serde(default)]
    pub iterations: u32,

    /// Model used for inference
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider used for inference
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

/// Representation of a tool call
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// Unique identifier for this tool call
    pub id: String,

    /// Name of the tool being called
    pub name: String,

    /// Arguments passed to the tool
    pub arguments: serde_json::Value,

    /// Result from tool execution (if completed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<ToolResult>,

    /// Timestamp when tool was called
    #[serde(default = "chrono::Utc::now")]
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Result from tool execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// Output from the tool
    pub output: serde_json::Value,

    /// Whether tool execution succeeded
    pub success: bool,

    /// Execution time in milliseconds
    pub execution_time_ms: u64,

    /// Error message if execution failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Agent capabilities
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Capability {
    /// Generate new code
    CodeGeneration,

    /// Edit existing code
    CodeEditing,

    /// Perform file operations
    FileOperations,

    /// Execute git operations
    GitOperations,

    /// Execute terminal commands
    TerminalExecution,

    /// Analyze workspace structure
    WorkspaceAnalysis,

    /// Analyze code quality and patterns
    CodeAnalysis,

    /// Refactor code
    Refactoring,

    /// Generate tests
    Testing,

    /// Generate documentation
    Documentation,

    /// Autonomous coding without explicit instructions
    AutonomousCoding,

    /// Proactively suggest improvements
    ProactiveSuggestions,
}

/// Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// Provider to use (google, groq, etc.)
    pub provider: String,

    /// Model identifier
    pub model: String,

    /// System prompt for the agent
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,

    /// Maximum iterations before stopping
    #[serde(default = "default_max_iterations")]
    pub max_iterations: u32,

    /// Tool execution timeout in milliseconds
    #[serde(default = "default_tool_timeout")]
    pub tool_timeout: u64,

    /// Whether to allow parallel tool execution
    #[serde(default = "default_true")]
    pub parallel_tools: bool,

    /// Temperature for inference
    #[serde(default = "default_temperature")]
    pub temperature: f32,

    /// Maximum tokens in response
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,

    /// Additional provider-specific settings
    #[serde(default)]
    pub extra: HashMap<String, serde_json::Value>,
}

fn default_tool_timeout() -> u64 { 30000 }

/// Session state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Unique session identifier
    pub id: String,

    /// Agent type/identifier
    pub agent_type: String,

    /// Session configuration
    pub config: AgentConfig,

    /// Session creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// Last activity timestamp
    pub updated_at: chrono::DateTime<chrono::Utc>,

    /// Total messages in session
    pub message_count: usize,

    /// Total tokens used in session
    pub total_tokens: usize,

    /// Total cost for session
    pub total_cost_usd: f64,
}

impl Session {
    /// Create a new session
    pub fn new(id: String, agent_type: String, config: AgentConfig) -> Self {
        let now = chrono::Utc::now();
        Self {
            id,
            agent_type,
            config,
            created_at: now,
            updated_at: now,
            message_count: 0,
            total_tokens: 0,
            total_cost_usd: 0.0,
        }
    }

    /// Update session with execution metadata
    pub fn update_from_metadata(&mut self, metadata: &AgentMetadata) {
        self.updated_at = chrono::Utc::now();
        self.message_count += 1;
        self.total_tokens += metadata.tokens_used as usize;
        self.total_cost_usd += metadata.cost_usd;
    }
}
