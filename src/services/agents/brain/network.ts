/**
 * Rainy Brain - Multi-Agent Network
 * 
 * Provider-agnostic multi-agent network with deterministic routing.
 * Uses the existing AIProvider abstraction for model inference.
 */

import { createNetwork } from '@inngest/agent-kit';
import { codeAssistantAgent } from './agents/codeAssistant';
import { codeReviewerAgent } from './agents/codeReviewer';
import { documentationAgent } from './agents/documentationAgent';
import {
    createInferenceAdapter,
    selectModelForTask,
    type TaskType,
} from './modelAdapter';
import type { ProviderCredentials } from '@/services/agent/providers';

// ===========================
// Types
// ===========================

export interface BrainConfig {
    credentials: ProviderCredentials;
    defaultTaskType?: TaskType;
    maxIterations?: number;
}

export interface BrainRunOptions {
    task: string;
    taskType?: 'code-assist' | 'review' | 'document';
    context?: Record<string, unknown>;
    modelPreference?: TaskType;
}

// ===========================
// Network Factory
// ===========================

/**
 * Create a Rainy Brain network with provider-agnostic model configuration.
 * The brain uses the existing AIProvider layer for actual inference.
 */
export function createRainyBrain(config: BrainConfig) {
    const { credentials, defaultTaskType = 'smart', maxIterations = 10 } = config;

    // Select model based on task type
    const modelId = selectModelForTask(defaultTaskType);
    const inferenceAdapter = createInferenceAdapter({
        modelId,
        credentials,
    });

    // Create the network - AgentKit handles routing internally
    const network = createNetwork({
        name: 'Rainy Brain',
        agents: [codeAssistantAgent, codeReviewerAgent, documentationAgent],
        maxIter: maxIterations,
    });

    return {
        network,
        inferenceAdapter,

        /**
         * Run the brain with a specific task
         */
        async run(options: BrainRunOptions) {
            const { task, taskType = 'code-assist', context = {}, modelPreference } = options;

            // Create adapter with preferred model if specified
            const adapter = modelPreference
                ? createInferenceAdapter({
                    modelId: selectModelForTask(modelPreference),
                    credentials,
                })
                : inferenceAdapter;

            // Run the network with initialized state
            const result = await network.run(task, {
                state: {
                    data: {
                        currentTaskType: taskType,
                        complete: false,
                        iterations: 0,
                        ...context,
                    },
                },
            });

            // Adapter available for custom inference needs
            void adapter;

            return result;
        },

        /**
         * Get available agents
         */
        getAgents() {
            return [
                { name: 'Code Assistant', type: 'code-assist' },
                { name: 'Code Reviewer', type: 'review' },
                { name: 'Documentation Writer', type: 'document' },
            ];
        },
    };
}

// ===========================
// Singleton Instance
// ===========================

let brainInstance: ReturnType<typeof createRainyBrain> | null = null;

/**
 * Get or create the brain instance
 */
export function getBrain(credentials: ProviderCredentials): ReturnType<typeof createRainyBrain> {
    if (!brainInstance) {
        brainInstance = createRainyBrain({ credentials });
    }
    return brainInstance;
}

/**
 * Reset the brain instance
 */
export function resetBrain(): void {
    brainInstance = null;
}

export type RainyBrain = ReturnType<typeof createRainyBrain>;
