/**
 * Agents Module
 * 
 * Exports the agent network for use by the brain routes.
 */

// Legacy agents (for backwards compatibility)
export { BaseAgent } from './base';
export type { AgentConfig, AgentContext, AgentResult, Message, ToolExecution } from './base';
export {
    PlannerAgent,
    CoderAgent,
    ReviewerAgent,
    TerminalAgent,
    DocsAgent,
    AGENTS,
    createAgent,
    getAgentTypes,
    getAgentsMetadata,
} from './specialized';
export type { AgentType, AgentMetadata } from './specialized';
export { SmartRouter, router } from './router';
export type { RouteDecision, NetworkResult } from './router';

// AgentKit integration
export { getSystemPrompt, buildEnhancedPrompt, getAllPrompts } from './prompts';
export {
    createAgentNetwork,
    executeWithNetwork,
    executeWithAgent,
    createPlannerAgent,
    createCoderAgent,
    createReviewerAgent,
    createTerminalAgent,
    createDocsAgent,
    agentFactories,
    getDefaultModel,
    getFastModel,
    getSmartModel,
    MODELS,
} from './network';
export type { NetworkStateData, AgentPhase, AgentKitAgentType } from './network';

// MCP-enhanced agents
export {
    createMCPPlannerAgent,
    createMCPCoderAgent,
    createMCPDocsAgent,
    createMCPReviewerAgent,
    createMCPAgent,
    getMCPAgentTypes,
    mcpAgentFactories,
} from './mcp-agents';
export type { MCPAgentOptions, MCPAgentType } from './mcp-agents';

// Routing agent (Phase 4)
export {
    createRoutingAgent,
    routeByHeuristics,
    routeByLLM,
    hybridRoute,
} from './routing-agent';
export type {
    RoutingDecision,
    RoutingContext,
    ConversationTurn,
    HybridRouterConfig,
} from './routing-agent';

// State management (Phase 4)
export {
    stateStore,
    createConversationContext,
} from './state';
export type {
    Message as StateMessage,
    ToolCallRecord,
    TaskState,
    ConversationState,
    MemoryItem,
} from './state';
