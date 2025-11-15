//! Tool registry for managing available tools
//!
//! The registry maintains a catalog of all available tools and provides
//! discovery and execution capabilities.

use crate::agents::executor::{Tool, ToolDefinition};
use parking_lot::Mutex;
use std::collections::HashMap;

/// Centralized tool registry
pub struct ToolRegistry {
    /// Map of tool name to tool instance
    tools: Mutex<HashMap<String, Box<dyn Tool>>>,
}

impl ToolRegistry {
    /// Create a new tool registry
    pub fn new() -> Self {
        let mut registry = Self {
            tools: Mutex::new(HashMap::new()),
        };

        // Register default tools
        registry.register_default_tools();

        registry
    }

    /// Register default tools
    fn register_default_tools(&mut self) {
        // Tools will be registered here
        // This method will be expanded as we implement each tool
        tracing::info!("Tool registry initialized");
    }

    /// Register a tool
    pub fn register(&self, tool: Box<dyn Tool>) {
        let name = tool.name().to_string();
        self.tools.lock().insert(name.clone(), tool);
        tracing::info!("Registered tool: {}", name);
    }

    /// Get a tool by name
    pub fn get(&self, name: &str) -> Option<Box<dyn Tool>> {
        // Note: This is a simplified version
        // In production, we'd return a reference or use Arc
        None
    }

    /// List all available tools
    pub fn list(&self) -> Vec<ToolDefinition> {
        self.tools
            .lock()
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

    /// Get tool count
    pub fn count(&self) -> usize {
        self.tools.lock().len()
    }

    /// Check if tool exists
    pub fn has(&self, name: &str) -> bool {
        self.tools.lock().contains_key(name)
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
