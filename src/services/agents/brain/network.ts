/**
 * Rainy Brain - Multi-Agent Network
 * 
 * Provider-agnostic multi-agent network with:
 * - State-based routing (per AgentKit best practices)
 * - File caching via network.state.kv
 * - Lifecycle hooks for context management
 * - Execution planning for complex tasks
 */

import { createNetwork, type Network } from '@inngest/agent-kit';
import { codeAssistantAgent } from './agents/codeAssistant';
import { codeReviewerAgent } from './agents/codeReviewer';
import { documentationAgent } from './agents/documentationAgent';
import { plannerAgent } from './agents/plannerAgent';
import {
    createInferenceAdapter,
    selectModelForTask,
    type TaskType,
} from './modelAdapter';
import {
    type NetworkState,
    createDefaultNetworkState,
} from './types';
import type { ProviderCredentials } from '@/services/agent/providers';

// ===========================
// Types
// ===========================

export interface BrainConfig {
    credentials: ProviderCredentials;
    defaultTaskType?: TaskType;
    maxIterations?: number;
    workspace?: string;
}

export interface BrainRunOptions {
    task: string;
    taskType?: 'code-assist' | 'review' | 'document' | 'plan';
    context?: Record<string, unknown>;
    modelPreference?: TaskType;
    workspace?: string;
    currentFile?: string;
}

// ===========================
// State-Based Router
// ===========================

/**
 * Intelligent router that uses network state to determine the next agent.
 * This is the core of AgentKit's power - routing based on accumulated state.
 * 
 * Note: We use explicit any cast because AgentKit's generics don't fully support
 * custom state types in all scenarios.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStateBasedRouter(): any {
    return async ({ network }: { network: Network<NetworkState> }) => {
        const state = network.state.data;
        const agents = network.agents;

        // Track iteration
        state.iteration = (state.iteration || 0) + 1;
        console.log(`[Router] Iteration ${state.iteration}/${state.maxIterations}`);

        // Check termination conditions
        if (state.iteration >= state.maxIterations) {
            console.log('[Router] Max iterations reached, stopping');
            return undefined; // Stop execution
        }

        if (state.flags.taskCompleted) {
            console.log('[Router] Task completed, stopping');
            return undefined;
        }

        if (state.flags.needsUserInput) {
            console.log('[Router] Awaiting user input, stopping');
            return undefined;
        }

        // Phase 1: Context Loading
        // If we haven't loaded project context yet, use planner
        if (!state.flags.contextLoaded) {
            console.log('[Router] Loading context via planner');
            return agents.get('Planner');
        }

        // Phase 2: Plan Execution
        // If we have a plan, execute the next step
        if (state.plan && state.plan.currentIndex < state.plan.steps.length) {
            const currentStep = state.plan.steps[state.plan.currentIndex];
            console.log(`[Router] Executing plan step ${state.plan.currentIndex + 1}/${state.plan.totalSteps}: ${currentStep.agent}`);

            // Mark step as running
            currentStep.status = 'running';

            // Find the agent
            const agent = agents.get(currentStep.agent);
            if (agent) {
                return agent;
            }

            // Agent not found, skip this step
            console.warn(`[Router] Agent "${currentStep.agent}" not found, skipping`);
            currentStep.status = 'skipped';
            state.plan.currentIndex++;

            // Recurse to get next step
            return createStateBasedRouter()({ network });
        }

        // Phase 3: Default Routing
        // No plan - route based on last agent or default to coder
        if (state.lastAgent === 'Planner') {
            // After planning, usually need code assistant
            return agents.get('Code Assistant');
        }

        if (state.lastAgent === 'Code Assistant') {
            // After coding, might need review
            if (state.context.relevantFiles.length > 0) {
                return agents.get('Code Reviewer');
            }
        }

        // Default: Code Assistant handles most tasks
        return agents.get('Code Assistant');
    };
}

// ===========================
// Network Factory
// ===========================

/**
 * Create a Rainy Brain network with proper state management.
 * 
 * Key features:
 * - State-based routing for intelligent orchestration
 * - File caching to reduce redundant reads
 * - Execution planning for complex multi-step tasks
 * - Lifecycle hooks for resource management
 */
export function createRainyBrain(config: BrainConfig) {
    const {
        credentials,
        defaultTaskType = 'smart',
        maxIterations = 30,
        workspace = process.cwd(),
    } = config;

    // Select model based on task type
    const modelId = selectModelForTask(defaultTaskType);
    const inferenceAdapter = createInferenceAdapter({
        modelId,
        credentials,
    });

    // Create the network with state-based routing
    // Note: Agents use StateData internally but we need NetworkState for the network
    // The cast is safe because NetworkState extends the required structure
    const network = createNetwork<NetworkState>({
        name: 'Rainy Brain',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agents: [
            plannerAgent,
            codeAssistantAgent,
            codeReviewerAgent,
            documentationAgent,
        ] as any,
        maxIter: maxIterations,

        // State-based router - the heart of intelligent orchestration
        router: createStateBasedRouter(),
    });

    return {
        network,
        inferenceAdapter,

        /**
         * Run the brain with a specific task
         */
        async run(options: BrainRunOptions) {
            const {
                task,
                taskType = 'code-assist',
                context = {},
                modelPreference,
                workspace: taskWorkspace,
                currentFile,
            } = options;

            // Create adapter with preferred model if specified
            const adapter = modelPreference
                ? createInferenceAdapter({
                    modelId: selectModelForTask(modelPreference),
                    credentials,
                })
                : inferenceAdapter;

            // Initialize state with defaults and provided context
            const workspacePath = taskWorkspace || workspace;
            const initialState = createDefaultNetworkState(workspacePath);

            // Merge in task-specific context
            initialState.context = {
                ...initialState.context,
                workspace: workspacePath,
                currentFile,
                relevantFiles: currentFile ? [currentFile] : [],
            };

            initialState.maxIterations = maxIterations;

            // Set flags based on task type
            if (taskType === 'plan') {
                // Planning task - let planner run first
                initialState.flags.contextLoaded = false;
            } else {
                // Simple task - can skip planning
                initialState.flags.contextLoaded = true;
            }

            // Log start
            console.log(`[Brain] Starting task: "${task.slice(0, 60)}..."`);
            console.log(`[Brain] Workspace: ${workspacePath}`);
            console.log(`[Brain] Task type: ${taskType}`);
            console.log(`[Brain] Max iterations: ${maxIterations}`);

            // Run the network with initialized state
            const result = await network.run(task, {
                state: {
                    data: {
                        ...initialState,
                        ...context,
                    },
                },
            });

            // Log completion stats
            const finalState = result.state?.data as NetworkState | undefined;
            if (finalState) {
                console.log(`[Brain] Completed in ${finalState.iteration} iterations`);
                console.log(`[Brain] Cache stats: ${finalState.fileCacheStats.hits} hits, ${finalState.fileCacheStats.misses} misses`);
            }

            // Adapter available for custom inference needs
            void adapter;

            return result;
        },

        /**
         * Get available agents
         */
        getAgents() {
            return [
                { name: 'Planner', type: 'plan' },
                { name: 'Code Assistant', type: 'code-assist' },
                { name: 'Code Reviewer', type: 'review' },
                { name: 'Documentation Writer', type: 'document' },
            ];
        },

        /**
         * Get network state schema (for debugging)
         */
        getStateSchema() {
            return createDefaultNetworkState('');
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
export function getBrain(credentials: ProviderCredentials, workspace?: string): ReturnType<typeof createRainyBrain> {
    if (!brainInstance) {
        brainInstance = createRainyBrain({ credentials, workspace });
    }
    return brainInstance;
}

/**
 * Reset the brain instance (useful for testing or re-initialization)
 */
export function resetBrain(): void {
    brainInstance = null;
}

export type RainyBrain = ReturnType<typeof createRainyBrain>;

// Re-export types for convenience
export type { NetworkState } from './types';
