/**
 * MCP Module Exports
 * 
 * Model Context Protocol integration for Rainy Brain.
 * Supports local and external MCP servers with multiple transports.
 */

// Core
export { MCPClientManager, mcpManager } from './client';
export { createLocalMCPServer } from './local-server';
export { getMCPConfigs, type MCPTransport, type MCPServerConfig } from './config';

// Project configuration (.rainy/rainy-mcp.json)
export {
    loadMCPConfig,
    getMCPConfigPath,
    hasMCPConfig,
    getProjectMCPConfigs,
    createDefaultMCPConfig,
    addServerToConfig,
    removeServerFromConfig,
    toggleServerEnabled,
    validateMCPConfig,
    watchMCPConfig,
    clearConfigCache,
} from './config-loader';
export type { RainyMCPConfig, MCPServerEntry, ConfigValidationResult } from './config-loader';

// Production resilience
export {
    // Circuit breakers
    canExecute,
    recordSuccess,
    recordFailure,
    resetCircuitBreaker,
    getCircuitBreakerStatus,
    // Retry logic
    withRetry,
    withTimeout,
    withFallback,
    // Health monitoring
    recordHealthCheck,
    getHealthStatus,
    getAllHealthStatuses,
    isServerHealthy,
    // Rate limiting
    createRateLimiter,
    checkRateLimit,
    // Logging
    logMCP,
} from './resilience';
export type {
    CircuitBreakerState,
    RetryOptions,
    MCPHealthStatus,
    FallbackOptions,
} from './resilience';
