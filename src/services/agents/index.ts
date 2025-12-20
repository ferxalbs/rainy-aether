/**
 * Agents Service Index
 * 
 * Main export for the agents module including:
 * - Inngest client and workflows
 * - AgentKit brain (network, agents, tools)
 * - Model adapter for provider-agnostic inference
 */

// Inngest
export { inngest } from './inngest/client';
export type { Events } from './inngest/client';

// Workflows
export { allWorkflows, indexCodebase, migrateRepo, indexRAG } from './workflows';

// Brain
export {
    createRainyBrain,
    getBrain,
    resetBrain,
    type RainyBrain,
    type BrainConfig,
    type BrainRunOptions,
} from './brain/network';

export {
    createInferenceAdapter,
    selectModelForTask,
    getRecommendedModel,
    recordModelMetrics,
    getBestPerformingModel,
    type InferenceOptions,
    type InferenceResult,
    type TaskType,
} from './brain/modelAdapter';

// Agents
export { codeAssistantAgent, codeReviewerAgent, documentationAgent, allAgents } from './brain/agents';

// Tools
export { fileTools, terminalTools, allTools } from './brain/tools';
