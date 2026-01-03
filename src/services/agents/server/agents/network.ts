/**
 * AgentKit Network
 * 
 * Creates an Inngest AgentKit network with state-based routing.
 * This is the core orchestration layer for multi-agent execution.
 * 
 * Uses model IDs from existing provider system at @/services/agent/providers
 */

import { createNetwork, createAgent, gemini } from '@inngest/agent-kit';
import { getSystemPrompt, buildEnhancedPrompt } from './prompts';
import {
    plannerTools,
    coderTools,
    reviewerTools,
    terminalTools,
    docsTools,
} from '../tools/agentkit';
import { subagentRegistry } from '../registry/SubagentRegistry';
import { SubagentFactory } from '../factory/SubagentFactory';

// ===========================
// Types
// ===========================

export type AgentPhase =
    | 'planning'
    | 'coding'
    | 'reviewing'
    | 'testing'
    | 'documenting'
    | 'complete'
    | 'error';

export interface NetworkStateData {
    // Task context
    workspace: string;
    task: string;
    currentFile?: string;

    // Execution state
    phase: AgentPhase;
    plan: string | null;
    filesModified: string[];
    toolsUsed: string[];
    errors: string[];
    iterations: number;
    maxIterations: number;

    // Cache stats
    cacheHits: number;
    cacheMisses: number;

    // Flags
    planGenerated: boolean;
    codeWritten: boolean;
    reviewed: boolean;
    tested: boolean;
}

// ===========================
// Model Configuration
// ===========================

// Model IDs aligned with src/services/agent/providers/index.ts
const MODELS = {
    // Default model for most tasks - Gemini 3 Flash
    default: 'gemini-3-flash-preview',
    // Fast model for quick operations
    fast: 'gemini-3-flash-preview',
    // Smart model for complex reasoning
    smart: 'gemini-3-pro-preview',
} as const;

/**
 * Get AgentKit model instance
 * Uses Gemini 3 Flash/Pro aligned with existing provider system
 */
function getDefaultModel() {
    return gemini({ model: MODELS.default });
}

function getFastModel() {
    return gemini({ model: MODELS.fast });
}

function getSmartModel() {
    return gemini({ model: MODELS.smart });
}

// ===========================
// AgentKit Agent Factories
// ===========================

export const createPlannerAgent = (workspace?: string) => createAgent({
    name: 'planner',
    description: 'Analyzes tasks and creates step-by-step implementation plans',
    system: buildEnhancedPrompt('planner', { workspace }),
    model: getSmartModel(), // Planner needs reasoning
    tools: plannerTools,
});

export const createCoderAgent = (workspace?: string) => createAgent({
    name: 'coder',
    description: 'Writes, edits, and refactors code',
    system: buildEnhancedPrompt('coder', { workspace }),
    model: getDefaultModel(),
    tools: coderTools,
});

export const createReviewerAgent = (workspace?: string) => createAgent({
    name: 'reviewer',
    description: 'Reviews code for bugs, security, and best practices',
    system: buildEnhancedPrompt('reviewer', { workspace }),
    model: getDefaultModel(),
    tools: reviewerTools,
});

export const createTerminalAgent = (workspace?: string) => createAgent({
    name: 'terminal',
    description: 'Executes commands, runs tests, manages processes',
    system: buildEnhancedPrompt('terminal', { workspace }),
    model: getFastModel(),
    tools: terminalTools,
});

export const createDocsAgent = (workspace?: string) => createAgent({
    name: 'docs',
    description: 'Reads documentation and provides context',
    system: buildEnhancedPrompt('docs', { workspace }),
    model: getFastModel(),
    tools: docsTools,
});

// ===========================
// Agent Registry
// ===========================

export type AgentFactory = typeof createPlannerAgent;

export const agentFactories = {
    planner: createPlannerAgent,
    coder: createCoderAgent,
    reviewer: createReviewerAgent,
    terminal: createTerminalAgent,
    docs: createDocsAgent,
} as const;

export type AgentKitAgentType = keyof typeof agentFactories;

// ===========================
// Helpers
// ===========================

/**
 * Extract text content from AgentKit messages
 */
function extractTextContent(messages: unknown[]): string {
    return messages
        .filter((msg): msg is { type: 'text'; content: unknown } => {
            const m = msg as { type?: string };
            return m.type === 'text';
        })
        .map(msg => {
            const content = msg.content;
            if (typeof content === 'string') {
                return content;
            }
            if (Array.isArray(content)) {
                return content
                    .map(c => {
                        if (typeof c === 'string') return c;
                        if (c && typeof c === 'object' && 'text' in c) {
                            return String((c as { text: unknown }).text);
                        }
                        return '';
                    })
                    .join('');
            }
            return '';
        })
        .join('\n');
}

// ===========================
// Network Factory
// ===========================

/**
 * Create an AgentKit network for task execution
 * Supports both built-in and custom subagents
 */
export async function createAgentNetwork(options: {
    workspace: string;
    task: string;
    currentFile?: string;
    maxIterations?: number;
    startAgent?: AgentKitAgentType | string; // Can be custom agent ID
}) {
    const { workspace, maxIterations = 15 } = options;

    // Create built-in agents with workspace context
    const builtInAgents = {
        planner: createPlannerAgent(workspace),
        coder: createCoderAgent(workspace),
        reviewer: createReviewerAgent(workspace),
        terminal: createTerminalAgent(workspace),
        docs: createDocsAgent(workspace),
    };

    // Load and create custom subagents
    const customConfigs = subagentRegistry.getEnabled();
    const customAgents: Record<string, any> = {};

    for (const config of customConfigs) {
        try {
            customAgents[config.id] = SubagentFactory.create(config);
            console.log(`[Network] Loaded custom agent: ${config.id}`);
        } catch (error) {
            console.error(`[Network] Failed to create custom agent ${config.id}:`, error);
        }
    }

    // Combine all agents
    const agents = { ...builtInAgents, ...customAgents };

    // Initial state for tracking
    const initialState: NetworkStateData = {
        workspace: workspace,
        task: options.task,
        currentFile: options.currentFile,
        phase: 'planning',
        plan: null,
        filesModified: [],
        toolsUsed: [],
        errors: [],
        iterations: 0,
        maxIterations,
        cacheHits: 0,
        cacheMisses: 0,
        planGenerated: false,
        codeWritten: false,
        reviewed: false,
        tested: false,
    };

    // Create network with agents
    const network = createNetwork({
        name: 'rainy-brain-network',
        agents: Object.values(agents),
        defaultModel: getDefaultModel(),
        maxIter: maxIterations,
    });

    return {
        network,
        agents,
        builtInAgents,
        customAgents,
        initialState,
    };
}

/**
 * Execute a task using the agent network
 * Automatically includes custom subagents
 */
export async function executeWithNetwork(options: {
    workspace: string;
    task: string;
    currentFile?: string;
    maxIterations?: number;
}): Promise<{
    success: boolean;
    output: string;
    state: NetworkStateData;
    agentsUsed: string[];
    toolsUsed: string[];
    filesModified: string[];
    error?: string;
}> {
    const networkSetup = await createAgentNetwork(options);

    try {
        const result = await networkSetup.network.run(options.task);

        // Extract state from result
        const stateData = result.state?.data as Record<string, unknown> | undefined;

        // Build output from result using helper
        let output = '';
        const results = result.state?.results as unknown[];
        if (results && results.length > 0) {
            const lastResult = results[results.length - 1] as { output?: unknown[] };
            if (lastResult?.output) {
                output = extractTextContent(lastResult.output);
            }
        }

        // Extract agent names
        const agentsUsed: string[] = [];
        if (results) {
            for (const r of results) {
                const res = r as { agent?: { name?: string } };
                if (res.agent?.name) {
                    agentsUsed.push(res.agent.name);
                }
            }
        }

        // Merge tracked state with any state from the network
        const finalState: NetworkStateData = {
            ...networkSetup.initialState,
            phase: 'complete',
            ...(stateData || {}),
        } as NetworkStateData;

        return {
            success: true,
            output,
            state: finalState,
            agentsUsed,
            toolsUsed: finalState.toolsUsed || [],
            filesModified: finalState.filesModified || [],
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            state: { ...networkSetup.initialState, phase: 'error' },
            agentsUsed: [],
            toolsUsed: [],
            filesModified: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ===========================
// Single Agent Execution
// ===========================

/**
 * Execute a task with a specific agent (no network routing)
 * Supports both built-in and custom agents
 */
export async function executeWithAgent(options: {
    workspace: string;
    task: string;
    agentType: AgentKitAgentType | string; // Can be custom agent ID
    currentFile?: string;
}): Promise<{
    success: boolean;
    output: string;
    toolsUsed: string[];
    error?: string;
}> {
    let agent: any;

    // Check if it's a built-in agent
    if (options.agentType in agentFactories) {
        const factory = agentFactories[options.agentType as AgentKitAgentType];
        agent = factory(options.workspace);
    } else {
        // Try to load as custom subagent
        const config = subagentRegistry.get(options.agentType);
        if (!config) {
            return {
                success: false,
                output: '',
                toolsUsed: [],
                error: `Unknown agent: ${options.agentType}`,
            };
        }

        try {
            agent = SubagentFactory.create(config);

            // Track usage
            await subagentRegistry.incrementUsage(config.id);
        } catch (error) {
            return {
                success: false,
                output: '',
                toolsUsed: [],
                error: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    try {
        const result = await agent.run(options.task);

        // Extract text output using helper
        const output = extractTextContent(result.output as unknown[]);

        // Extract tool names
        const toolsUsed: string[] = [];
        const toolCalls = result.toolCalls as Array<{ tool: { name: string } }> | undefined;
        if (toolCalls) {
            for (const tc of toolCalls) {
                toolsUsed.push(tc.tool.name);
            }
        }

        return {
            success: true,
            output,
            toolsUsed,
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            toolsUsed: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ===========================
// Re-exports
// ===========================

export { getSystemPrompt };
export { getDefaultModel, getFastModel, getSmartModel, MODELS };
