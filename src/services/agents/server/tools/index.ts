/**
 * Tools Module
 * 
 * Exports the unified tool system for use by AgentKit agents.
 */

// Schema and types - using 'export type' for type-only exports
export type {
    ToolSchema,
    ToolParameter,
    ToolResult,
    ToolCall,
    ToolExecution,
    ToolCategory,
} from './schema';

export {
    TOOL_DEFINITIONS,
    getToolByName,
    getToolsByCategory,
    getParallelizableTools,
    getCacheableTools,
    toAgentKitTools,
    toOpenAIFunctions,
} from './schema';

// Executor - using 'export type' for type-only exports
export type { ExecutorConfig, BatchOptions, ToolHandler } from './executor';

export {
    ToolExecutor,
    getToolExecutor,
    createToolExecutor,
    createToolCall,
} from './executor';

// Bridge (handlers)
export {
    toolHandlers,
    setWorkspacePath,
    getWorkspacePath,
    registerToolHandlers,
    createConfiguredExecutor,
} from './bridge';

// AgentKit tools (new)
export {
    allAgentKitTools,
    readTools,
    writeTools,
    executeTools,
    gitTools,
    analysisTools,
    plannerTools,
    coderTools,
    reviewerTools,
    terminalTools,
    docsTools,
} from './agentkit';
