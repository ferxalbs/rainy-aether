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

// Project configuration (.rainy/mcp.json - standard format)
export {
    loadMCPConfig,
    getMCPConfigPath,
    hasMCPConfig,
    getProjectMCPConfigs,
    getMCPServerNames,
    getMCPServer,
    createDefaultMCPConfig,
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    toggleMCPServer,
    setServerOverride,
    getServerOverride,
    validateMCPConfig,
    watchMCPConfig,
    clearConfigCache,
    // Backward compat
    addServerToConfig,
    removeServerFromConfig,
    toggleServerEnabled,
} from './config-loader';
export type { MCPConfig, MCPServerEntry, ConfigValidationResult } from './config-loader';

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

// Tool approval service
export { approvalService } from './approval';
export type { PendingApproval, ApprovalRequest, ApprovalEvent } from './approval';
