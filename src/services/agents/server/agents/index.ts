/**
 * Agents Module
 * 
 * Exports the agent network for use by the brain routes.
 */

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
