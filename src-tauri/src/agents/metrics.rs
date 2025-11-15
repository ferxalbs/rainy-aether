//! Performance metrics and telemetry
//!
//! This module provides comprehensive metrics tracking for agent operations,
//! including latency, throughput, costs, and error rates.

use dashmap::DashMap;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Global metrics collector
pub struct MetricsCollector {
    /// Agent-level metrics
    agent_metrics: Arc<DashMap<String, AgentMetrics>>,

    /// Tool-level metrics
    tool_metrics: Arc<DashMap<String, ToolMetrics>>,

    /// Provider-level metrics
    provider_metrics: Arc<DashMap<String, ProviderMetrics>>,

    /// System-wide metrics
    system_metrics: Arc<RwLock<SystemMetrics>>,
}

impl MetricsCollector {
    /// Create a new metrics collector
    pub fn new() -> Self {
        Self {
            agent_metrics: Arc::new(DashMap::new()),
            tool_metrics: Arc::new(DashMap::new()),
            provider_metrics: Arc::new(DashMap::new()),
            system_metrics: Arc::new(RwLock::new(SystemMetrics::default())),
        }
    }

    /// Record agent execution
    pub fn record_agent_execution(
        &self,
        agent_id: &str,
        duration: Duration,
        tokens: u32,
        cost: f64,
        success: bool,
    ) {
        let mut metrics = self.agent_metrics
            .entry(agent_id.to_string())
            .or_insert_with(AgentMetrics::default);

        metrics.total_requests += 1;
        metrics.total_tokens += tokens as u64;
        metrics.total_cost_usd += cost;

        if success {
            metrics.successful_requests += 1;
        } else {
            metrics.failed_requests += 1;
        }

        // Update latency statistics
        let duration_ms = duration.as_millis() as u64;
        metrics.total_latency_ms += duration_ms;
        metrics.min_latency_ms = metrics.min_latency_ms.min(duration_ms);
        metrics.max_latency_ms = metrics.max_latency_ms.max(duration_ms);

        // Update system metrics
        let mut system = self.system_metrics.write();
        system.total_requests += 1;
        system.total_tokens += tokens as u64;
        system.total_cost_usd += cost;
    }

    /// Record tool execution
    pub fn record_tool_execution(
        &self,
        tool_name: &str,
        duration: Duration,
        success: bool,
    ) {
        let mut metrics = self.tool_metrics
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

    /// Record provider API call
    pub fn record_provider_call(
        &self,
        provider: &str,
        duration: Duration,
        tokens: u32,
        cost: f64,
        success: bool,
    ) {
        let mut metrics = self.provider_metrics
            .entry(provider.to_string())
            .or_insert_with(ProviderMetrics::default);

        metrics.total_calls += 1;
        metrics.total_tokens += tokens as u64;
        metrics.total_cost_usd += cost;

        if success {
            metrics.successful_calls += 1;
        } else {
            metrics.failed_calls += 1;
        }

        let duration_ms = duration.as_millis() as u64;
        metrics.total_latency_ms += duration_ms;
    }

    /// Get metrics for a specific agent
    pub fn get_agent_metrics(&self, agent_id: &str) -> Option<AgentMetrics> {
        self.agent_metrics.get(agent_id).map(|m| m.clone())
    }

    /// Get metrics for a specific tool
    pub fn get_tool_metrics(&self, tool_name: &str) -> Option<ToolMetrics> {
        self.tool_metrics.get(tool_name).map(|m| m.clone())
    }

    /// Get metrics for a specific provider
    pub fn get_provider_metrics(&self, provider: &str) -> Option<ProviderMetrics> {
        self.provider_metrics.get(provider).map(|m| m.clone())
    }

    /// Get system-wide metrics
    pub fn get_system_metrics(&self) -> SystemMetrics {
        self.system_metrics.read().clone()
    }

    /// Get all metrics
    pub fn get_all_metrics(&self) -> AllMetrics {
        AllMetrics {
            agents: self.agent_metrics
                .iter()
                .map(|entry| (entry.key().clone(), entry.value().clone()))
                .collect(),
            tools: self.tool_metrics
                .iter()
                .map(|entry| (entry.key().clone(), entry.value().clone()))
                .collect(),
            providers: self.provider_metrics
                .iter()
                .map(|entry| (entry.key().clone(), entry.value().clone()))
                .collect(),
            system: self.get_system_metrics(),
        }
    }

    /// Reset all metrics
    pub fn reset(&self) {
        self.agent_metrics.clear();
        self.tool_metrics.clear();
        self.provider_metrics.clear();
        *self.system_metrics.write() = SystemMetrics::default();
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// Agent-specific metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentMetrics {
    /// Total number of requests
    pub total_requests: u64,

    /// Number of successful requests
    pub successful_requests: u64,

    /// Number of failed requests
    pub failed_requests: u64,

    /// Total tokens used
    pub total_tokens: u64,

    /// Total cost in USD
    pub total_cost_usd: f64,

    /// Total latency in milliseconds
    pub total_latency_ms: u64,

    /// Minimum latency in milliseconds
    #[serde(default = "default_max_u64")]
    pub min_latency_ms: u64,

    /// Maximum latency in milliseconds
    pub max_latency_ms: u64,
}

impl AgentMetrics {
    /// Calculate average latency
    pub fn avg_latency_ms(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_latency_ms as f64 / self.total_requests as f64
        }
    }

    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.successful_requests as f64 / self.total_requests as f64
        }
    }

    /// Calculate average tokens per request
    pub fn avg_tokens_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_tokens as f64 / self.total_requests as f64
        }
    }

    /// Calculate average cost per request
    pub fn avg_cost_per_request(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_cost_usd / self.total_requests as f64
        }
    }
}

/// Tool execution metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolMetrics {
    /// Total number of executions
    pub total_executions: u64,

    /// Number of successful executions
    pub successful_executions: u64,

    /// Number of failed executions
    pub failed_executions: u64,

    /// Total execution time in milliseconds
    pub total_duration_ms: u64,

    /// Minimum execution time in milliseconds
    #[serde(default = "default_max_u64")]
    pub min_duration_ms: u64,

    /// Maximum execution time in milliseconds
    pub max_duration_ms: u64,
}

impl ToolMetrics {
    /// Calculate average execution time
    pub fn avg_duration_ms(&self) -> f64 {
        if self.total_executions == 0 {
            0.0
        } else {
            self.total_duration_ms as f64 / self.total_executions as f64
        }
    }

    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.total_executions == 0 {
            0.0
        } else {
            self.successful_executions as f64 / self.total_executions as f64
        }
    }
}

/// Provider API metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProviderMetrics {
    /// Total number of API calls
    pub total_calls: u64,

    /// Number of successful calls
    pub successful_calls: u64,

    /// Number of failed calls
    pub failed_calls: u64,

    /// Total tokens used
    pub total_tokens: u64,

    /// Total cost in USD
    pub total_cost_usd: f64,

    /// Total API latency in milliseconds
    pub total_latency_ms: u64,
}

impl ProviderMetrics {
    /// Calculate average latency
    pub fn avg_latency_ms(&self) -> f64 {
        if self.total_calls == 0 {
            0.0
        } else {
            self.total_latency_ms as f64 / self.total_calls as f64
        }
    }

    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.total_calls == 0 {
            0.0
        } else {
            self.successful_calls as f64 / self.total_calls as f64
        }
    }
}

/// System-wide metrics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemMetrics {
    /// Total requests across all agents
    pub total_requests: u64,

    /// Total tokens used
    pub total_tokens: u64,

    /// Total cost in USD
    pub total_cost_usd: f64,

    /// System uptime
    #[serde(skip)]
    pub start_time: Option<Instant>,
}

impl SystemMetrics {
    /// Get system uptime
    pub fn uptime(&self) -> Duration {
        self.start_time
            .map(|start| start.elapsed())
            .unwrap_or_default()
    }
}

/// All metrics combined
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllMetrics {
    /// Agent metrics by agent ID
    pub agents: Vec<(String, AgentMetrics)>,

    /// Tool metrics by tool name
    pub tools: Vec<(String, ToolMetrics)>,

    /// Provider metrics by provider name
    pub providers: Vec<(String, ProviderMetrics)>,

    /// System-wide metrics
    pub system: SystemMetrics,
}

fn default_max_u64() -> u64 {
    u64::MAX
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_metrics() {
        let collector = MetricsCollector::new();

        collector.record_agent_execution(
            "test-agent",
            Duration::from_millis(100),
            1000,
            0.01,
            true,
        );

        let metrics = collector.get_agent_metrics("test-agent").unwrap();
        assert_eq!(metrics.total_requests, 1);
        assert_eq!(metrics.successful_requests, 1);
        assert_eq!(metrics.total_tokens, 1000);
        assert_eq!(metrics.total_cost_usd, 0.01);
    }

    #[test]
    fn test_tool_metrics() {
        let collector = MetricsCollector::new();

        collector.record_tool_execution("read_file", Duration::from_millis(50), true);

        let metrics = collector.get_tool_metrics("read_file").unwrap();
        assert_eq!(metrics.total_executions, 1);
        assert_eq!(metrics.successful_executions, 1);
        assert_eq!(metrics.avg_duration_ms(), 50.0);
    }

    #[test]
    fn test_metrics_calculations() {
        let mut metrics = AgentMetrics::default();
        metrics.total_requests = 10;
        metrics.successful_requests = 8;
        metrics.total_latency_ms = 1000;

        assert_eq!(metrics.success_rate(), 0.8);
        assert_eq!(metrics.avg_latency_ms(), 100.0);
    }
}
