//! Tool registry for managing available tools
//!
//! The registry maintains a catalog of all available tools and provides
//! discovery and execution capabilities.

use crate::agents::executor::{Tool, ToolDefinition};
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

/// Centralized tool registry
pub struct ToolRegistry {
    /// Map of tool name to tool instance (using Arc for shared ownership)
    tools: RwLock<HashMap<String, Arc<dyn Tool>>>,

    /// Execution metrics per tool
    metrics: RwLock<HashMap<String, ToolMetrics>>,
}

/// Metrics for individual tools
#[derive(Debug, Clone, Default)]
pub struct ToolMetrics {
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub total_duration: Duration,
    pub avg_duration: Duration,
}

impl ToolRegistry {
    /// Create a new tool registry
    pub fn new() -> Self {
        let registry = Self {
            tools: RwLock::new(HashMap::new()),
            metrics: RwLock::new(HashMap::new()),
        };

        // Register default tools
        registry.register_default_tools();

        registry
    }

    /// Register default tools
    fn register_default_tools(&self) {
        use super::{
            filesystem::{ReadFileTool, WriteFileTool, ListDirectoryTool},
            terminal::ExecuteCommandTool,
            git::{GitStatusTool, GitLogTool},
            workspace::{WorkspaceStructureTool, SearchFilesTool},
        };

        // Register filesystem tools
        self.register(Arc::new(ReadFileTool));
        self.register(Arc::new(WriteFileTool));
        self.register(Arc::new(ListDirectoryTool));

        // Register terminal tools
        self.register(Arc::new(ExecuteCommandTool));

        // Register git tools
        self.register(Arc::new(GitStatusTool));
        self.register(Arc::new(GitLogTool));

        // Register workspace tools
        self.register(Arc::new(WorkspaceStructureTool));
        self.register(Arc::new(SearchFilesTool));

        tracing::info!("✅ Tool registry initialized with {} tools", self.count());
    }

    /// Register a tool
    pub fn register(&self, tool: Arc<dyn Tool>) {
        let name = tool.name().to_string();
        self.tools.write().insert(name.clone(), tool);
        self.metrics.write().insert(name.clone(), ToolMetrics::default());
        tracing::info!("Registered tool: {}", name);
    }

    /// Get a tool by name (returns Arc for shared ownership)
    pub fn get(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.read().get(name).cloned()
    }

    /// List all available tools
    pub fn list_tools(&self) -> Vec<ToolDefinition> {
        self.tools
            .read()
            .values()
            .map(|tool| ToolDefinition {
                name: tool.name().to_string(),
                description: tool.description().to_string(),
                parameters: tool.parameters(),
                is_cacheable: tool.is_cacheable(),
                cache_ttl_secs: tool.cache_ttl().as_secs(),
            })
            .collect()
    }

    /// Get tool definition by name
    pub fn get_definition(&self, name: &str) -> Option<ToolDefinition> {
        self.tools.read().get(name).map(|tool| ToolDefinition {
            name: tool.name().to_string(),
            description: tool.description().to_string(),
            parameters: tool.parameters(),
            is_cacheable: tool.is_cacheable(),
            cache_ttl_secs: tool.cache_ttl().as_secs(),
        })
    }

    /// Get tool count
    pub fn count(&self) -> usize {
        self.tools.read().len()
    }

    /// Check if tool exists
    pub fn has(&self, name: &str) -> bool {
        self.tools.read().contains_key(name)
    }

    /// Record tool execution
    pub fn record_execution(&self, name: &str, duration: Duration, success: bool) {
        let mut metrics_lock = self.metrics.write();
        if let Some(metrics) = metrics_lock.get_mut(name) {
            metrics.total_executions += 1;
            if success {
                metrics.successful_executions += 1;
            } else {
                metrics.failed_executions += 1;
            }
            metrics.total_duration += duration;

            // Calculate average duration
            if metrics.total_executions > 0 {
                metrics.avg_duration = metrics.total_duration / metrics.total_executions as u32;
            }
        }
    }

    /// Get metrics for a specific tool
    pub fn get_metrics(&self, name: &str) -> Option<ToolMetrics> {
        self.metrics.read().get(name).cloned()
    }

    /// Get all tool metrics
    pub fn get_all_metrics(&self) -> HashMap<String, ToolMetrics> {
        self.metrics.read().clone()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
