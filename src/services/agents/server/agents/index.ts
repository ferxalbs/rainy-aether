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

// AgentKit integration (new)
export { getSystemPrompt, buildEnhancedPrompt, getAllPrompts } from './prompts';
export {
    createAgentNetwork,
    executeWithNetwork,
    createPlannerAgent,
    createCoderAgent,
    createReviewerAgent,
    createTerminalAgent,
    createDocsAgent,
} from './network';
export type { NetworkStateData, AgentPhase } from './network';
