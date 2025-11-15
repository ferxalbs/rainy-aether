//! Tool execution engine
//!
//! This module provides safe execution of agent tools with support for
//! parallel execution, caching, rate limiting, and comprehensive error handling.

use super::core::{ToolCall, ToolResult};
use dashmap::DashMap;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use thiserror::Error;
use tokio::sync::Semaphore;

/// Tool execution errors
#[derive(Error, Debug)]
pub enum ToolError {
    #[error("Tool not found: {0}")]
    NotFound(String),

    #[error("Invalid arguments: {0}")]
    InvalidArguments(String),

    #[error("Execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Timeout after {0:?}")]
    Timeout(Duration),

    #[error("Too many concurrent executions")]
    TooManyConcurrent,

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Tool executor with caching and concurrency control
pub struct ToolExecutor {
    /// Registry of available tools
    registry: Arc<ToolRegistry>,

    /// Cache for tool results
    cache: Arc<DashMap<String, CachedToolResult>>,

    /// Semaphore to limit concurrent executions
    semaphore: Arc<Semaphore>,

    /// Maximum concurrent tool executions
    max_concurrent: usize,

    /// Default tool timeout
    default_timeout: Duration,
}

impl ToolExecutor {
    /// Create a new tool executor
    pub fn new(max_concurrent: usize, default_timeout: Duration) -> Self {
        Self {
            registry: Arc::new(ToolRegistry::new()),
            cache: Arc::new(DashMap::new()),
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            max_concurrent,
            default_timeout,
        }
    }

    /// Register a tool
    pub fn register_tool(&self, tool: Arc<dyn Tool>) {
        self.registry.register(tool);
    }

    /// Execute a single tool
    pub async fn execute(
        &self,
        tool_name: &str,
        params: serde_json::Value,
        cache_key: Option<String>,
    ) -> Result<ToolResult, ToolError> {
        // Check cache first
        if let Some(key) = &cache_key {
            if let Some(cached) = self.cache.get(key) {
                if !cached.is_expired() {
                    tracing::debug!("Cache hit for tool: {}", tool_name);
                    return Ok(cached.result.clone());
                }
            }
        }

        // Acquire semaphore permit
        let _permit = self.semaphore.acquire().await
            .map_err(|_| ToolError::TooManyConcurrent)?;

        // Get tool from registry
        let tool = self.registry.get(tool_name)
            .ok_or_else(|| ToolError::NotFound(tool_name.to_string()))?;

        // Execute tool with timeout
        let start = Instant::now();
        let timeout = tool.timeout().unwrap_or(self.default_timeout);

        let result = tokio::time::timeout(
            timeout,
            tool.execute(params),
        ).await
            .map_err(|_| ToolError::Timeout(timeout))?
            .map_err(|e| ToolError::ExecutionFailed(e.to_string()))?;

        let duration = start.elapsed();

        let tool_result = ToolResult {
            output: result,
            success: true,
            execution_time_ms: duration.as_millis() as u64,
            error: None,
        };

        // Cache result if applicable
        if let Some(key) = cache_key {
            if tool.is_cacheable() {
                self.cache.insert(key, CachedToolResult {
                    result: tool_result.clone(),
                    timestamp: SystemTime::now(),
                    ttl: tool.cache_ttl(),
                });
            }
        }

        // Record metrics
        self.registry.record_execution(tool_name, duration, true);

        Ok(tool_result)
    }

    /// Execute multiple tools in parallel
    pub async fn execute_parallel(
        &self,
        tool_calls: Vec<ToolCall>,
    ) -> Vec<Result<ToolResult, ToolError>> {
        let futures: Vec<_> = tool_calls
            .into_iter()
            .map(|call| {
                let executor = self.clone();
                tokio::spawn(async move {
                    executor.execute(&call.name, call.arguments, None).await
                })
            })
            .collect();

        let results = futures::future::join_all(futures).await;

        results
            .into_iter()
            .map(|r| r.unwrap_or_else(|e| {
                Err(ToolError::ExecutionFailed(e.to_string()))
            }))
            .collect()
    }

    /// Get available tool definitions
    pub fn list_tools(&self) -> Vec<ToolDefinition> {
        self.registry.list_tools()
    }

    /// Get tool definition by name
    pub fn get_tool_definition(&self, name: &str) -> Option<ToolDefinition> {
        self.registry.get_definition(name)
    }

    /// Clear cache
    pub fn clear_cache(&self) {
        self.cache.clear();
        tracing::info!("Tool cache cleared");
    }

    /// Get executor statistics
    pub fn stats(&self) -> ExecutorStats {
        ExecutorStats {
            available_permits: self.semaphore.available_permits(),
            max_concurrent: self.max_concurrent,
            cached_results: self.cache.len(),
            registered_tools: self.registry.count(),
        }
    }
}

impl Clone for ToolExecutor {
    fn clone(&self) -> Self {
        Self {
            registry: Arc::clone(&self.registry),
            cache: Arc::clone(&self.cache),
            semaphore: Arc::clone(&self.semaphore),
            max_concurrent: self.max_concurrent,
            default_timeout: self.default_timeout,
        }
    }
}

/// Tool trait that all tools must implement
#[async_trait::async_trait]
pub trait Tool: Send + Sync {
    /// Get tool name
    fn name(&self) -> &str;

    /// Get tool description
    fn description(&self) -> &str;

    /// Get parameter schema (JSON Schema)
    fn parameters(&self) -> serde_json::Value;

    /// Execute the tool
    async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>>;

    /// Whether results should be cached
    fn is_cacheable(&self) -> bool {
        false
    }

    /// Cache TTL (time-to-live)
    fn cache_ttl(&self) -> Duration {
        Duration::from_secs(60)
    }

    /// Execution timeout
    fn timeout(&self) -> Option<Duration> {
        None
    }
}

/// Tool definition for external use
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    pub is_cacheable: bool,
    pub cache_ttl_secs: u64,
}

/// Tool registry
pub struct ToolRegistry {
    tools: DashMap<String, Arc<dyn Tool>>,
    metrics: Arc<DashMap<String, ToolMetrics>>,
}

impl ToolRegistry {
    /// Create a new tool registry
    pub fn new() -> Self {
        Self {
            tools: DashMap::new(),
            metrics: Arc::new(DashMap::new()),
        }
    }

    /// Register a tool
    pub fn register(&self, tool: Arc<dyn Tool>) {
        let name = tool.name().to_string();
        self.tools.insert(name.clone(), tool);
        tracing::info!("Registered tool: {}", name);
    }

    /// Get a tool by name
    pub fn get(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.get(name).map(|entry| Arc::clone(entry.value()))
    }

    /// List all tool definitions
    pub fn list_tools(&self) -> Vec<ToolDefinition> {
        self.tools
            .iter()
            .map(|entry| {
                let tool = entry.value();
                ToolDefinition {
                    name: tool.name().to_string(),
                    description: tool.description().to_string(),
                    parameters: tool.parameters(),
                    is_cacheable: tool.is_cacheable(),
                    cache_ttl_secs: tool.cache_ttl().as_secs(),
                }
            })
            .collect()
    }

    /// Get tool definition by name
    pub fn get_definition(&self, name: &str) -> Option<ToolDefinition> {
        self.tools.get(name).map(|entry| {
            let tool = entry.value();
            ToolDefinition {
                name: tool.name().to_string(),
                description: tool.description().to_string(),
                parameters: tool.parameters(),
                is_cacheable: tool.is_cacheable(),
                cache_ttl_secs: tool.cache_ttl().as_secs(),
            }
        })
    }

    /// Get tool count
    pub fn count(&self) -> usize {
        self.tools.len()
    }

    /// Record tool execution
    pub fn record_execution(&self, tool_name: &str, duration: Duration, success: bool) {
        let mut metrics = self.metrics
            .entry(tool_name.to_string())
            .or_insert_with(ToolMetrics::default);

        metrics.total_executions += 1;
        if success {
            metrics.successful_executions += 1;
        } else {
            metrics.failed_executions += 1;
        }

        let duration_ms = duration.as_millis() as u64;
        metrics.total_duration_ms += duration_ms;
        metrics.min_duration_ms = metrics.min_duration_ms.min(duration_ms);
        metrics.max_duration_ms = metrics.max_duration_ms.max(duration_ms);
    }

    /// Get metrics for a tool
    pub fn get_metrics(&self, tool_name: &str) -> Option<ToolMetrics> {
        self.metrics.get(tool_name).map(|m| m.clone())
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Tool execution metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolMetrics {
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub total_duration_ms: u64,
    pub min_duration_ms: u64,
    pub max_duration_ms: u64,
}

/// Cached tool result
struct CachedToolResult {
    result: ToolResult,
    timestamp: SystemTime,
    ttl: Duration,
}

impl CachedToolResult {
    fn is_expired(&self) -> bool {
        self.timestamp.elapsed().unwrap_or(Duration::ZERO) > self.ttl
    }
}

/// Executor statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorStats {
    pub available_permits: usize,
    pub max_concurrent: usize,
    pub cached_results: usize,
    pub registered_tools: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockTool;

    #[async_trait::async_trait]
    impl Tool for MockTool {
        fn name(&self) -> &str {
            "mock_tool"
        }

        fn description(&self) -> &str {
            "A mock tool for testing"
        }

        fn parameters(&self) -> serde_json::Value {
            serde_json::json!({
                "type": "object",
                "properties": {
                    "value": {
                        "type": "string"
                    }
                }
            })
        }

        async fn execute(&self, params: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
            Ok(serde_json::json!({
                "result": params["value"]
            }))
        }

        fn is_cacheable(&self) -> bool {
            true
        }
    }

    #[tokio::test]
    async fn test_tool_execution() {
        let executor = ToolExecutor::new(5, Duration::from_secs(30));
        executor.register_tool(Arc::new(MockTool));

        let result = executor.execute(
            "mock_tool",
            serde_json::json!({"value": "test"}),
            None,
        ).await.unwrap();

        assert!(result.success);
        assert_eq!(result.output["result"], "test");
    }

    #[tokio::test]
    async fn test_tool_caching() {
        let executor = ToolExecutor::new(5, Duration::from_secs(30));
        executor.register_tool(Arc::new(MockTool));

        let cache_key = "test-cache-key".to_string();

        // First execution
        let result1 = executor.execute(
            "mock_tool",
            serde_json::json!({"value": "test"}),
            Some(cache_key.clone()),
        ).await.unwrap();

        // Second execution (should be cached)
        let result2 = executor.execute(
            "mock_tool",
            serde_json::json!({"value": "test"}),
            Some(cache_key),
        ).await.unwrap();

        assert_eq!(result1.output, result2.output);
    }

    #[test]
    fn test_tool_registry() {
        let registry = ToolRegistry::new();
        registry.register(Arc::new(MockTool));

        assert_eq!(registry.count(), 1);

        let definitions = registry.list_tools();
        assert_eq!(definitions.len(), 1);
        assert_eq!(definitions[0].name, "mock_tool");
    }
}
