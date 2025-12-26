/**
 * Agent Types
 * 
 * TypeScript definitions for specialized agents system.
 */

/**
 * Metadata for a specialized agent
 */
export interface SpecializedAgentMeta {
    id: string;
    name: string;
    description: string;
    tools: string[];
    model: 'fast' | 'smart';
    patterns: {
        keywords: string[];
        examples: string[];
    };
    status: 'ready' | 'disabled';
}

/**
 * Agent types available in the system
 */
export type AgentTypeId = 'planner' | 'coder' | 'reviewer' | 'terminal' | 'docs' | 'auto';

/**
 * Response from /api/brain/agents endpoint
 */
export interface AgentsListResponse {
    agents: SpecializedAgentMeta[];
    types: AgentTypeId[];
    defaultAgent: AgentTypeId;
}
