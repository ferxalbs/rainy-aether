/**
 * Tools Module
 * 
 * Exports the unified tool system for use by AgentKit agents.
 */

// Schema and types
export {
    ToolSchema,
    ToolParameter,
    ToolResult,
    ToolCall,
    ToolExecution,
    ToolCategory,
    TOOL_DEFINITIONS,
    getToolByName,
    getToolsByCategory,
    getParallelizableTools,
    getCacheableTools,
    toAgentKitTools,
    toOpenAIFunctions,
} from './schema';

// Executor (ToolExecutor class is here, not in schema)
export {
    ToolExecutor,
    ExecutorConfig,
    BatchOptions,
    ToolHandler,
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
