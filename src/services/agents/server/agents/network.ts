/**
 * AgentKit Network
 * 
 * Creates an Inngest AgentKit network with state-based routing.
 * This is the core orchestration layer for multi-agent execution.
 */

import { createNetwork, createAgent } from '@inngest/agent-kit';
import { getSystemPrompt, buildEnhancedPrompt } from './prompts';
import { getDefaultModel, getFastModel } from './models';
import {
    plannerTools,
    coderTools,
    reviewerTools,
    terminalTools,
    docsTools,
} from '../tools/agentkit';

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
// AgentKit Agent Factories
// ===========================

export const createPlannerAgent = (workspace?: string) => createAgent({
    name: 'planner',
    description: 'Analyzes tasks and creates step-by-step implementation plans',
    system: buildEnhancedPrompt('planner', { workspace }),
    model: getDefaultModel(),
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
 */
export function createAgentNetwork(options: {
    workspace: string;
    task: string;
    currentFile?: string;
    maxIterations?: number;
    startAgent?: AgentKitAgentType;
}) {
    const { workspace, maxIterations = 15 } = options;

    // Create agents with workspace context
    const agents = {
        planner: createPlannerAgent(workspace),
        coder: createCoderAgent(workspace),
        reviewer: createReviewerAgent(workspace),
        terminal: createTerminalAgent(workspace),
        docs: createDocsAgent(workspace),
    };

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
        initialState,
    };
}

/**
 * Execute a task using the agent network
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
    const { network, initialState } = createAgentNetwork(options);

    try {
        const result = await network.run(options.task);

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
            ...initialState,
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
            state: { ...initialState, phase: 'error' },
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
 */
export async function executeWithAgent(options: {
    workspace: string;
    task: string;
    agentType: AgentKitAgentType;
    currentFile?: string;
}): Promise<{
    success: boolean;
    output: string;
    toolsUsed: string[];
    error?: string;
}> {
    const factory = agentFactories[options.agentType];
    const agent = factory(options.workspace);

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
