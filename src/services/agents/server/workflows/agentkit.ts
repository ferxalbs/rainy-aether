/**
 * AgentKit Workflows
 * 
 * Enhanced Inngest workflows using AgentKit network for multi-agent execution.
 * These workflows provide:
 * - AgentKit network-based task execution
 * - MCP-enabled agents with live documentation
 * - Real-time streaming events
 * - Durable execution with step functions
 */

import { Inngest, EventSchemas } from 'inngest';
import {
    createAgentNetwork,
    executeWithNetwork,
    executeWithAgent,
    createMCPCoderAgent,
    createMCPPlannerAgent,
} from '../agents';
import { setWorkspacePath, createToolCall, createConfiguredExecutor } from '../tools';
import { agentEvents } from '../streaming/events';
import type { AgentKitAgentType, NetworkStateData } from '../agents';

// ===========================
// Event Types
// ===========================

type AgentKitEvents = {
    // Network-based task execution
    'agentkit/task.execute': {
        data: {
            taskId: string;
            task: string;
            workspace: string;
            maxIterations?: number;
            currentFile?: string;
            useMCP?: boolean;
        };
    };
    'agentkit/task.progress': {
        data: {
            taskId: string;
            phase: string;
            agentName: string;
            iteration: number;
            maxIterations: number;
            message: string;
        };
    };
    'agentkit/task.completed': {
        data: {
            taskId: string;
            output: string;
            state: NetworkStateData;
            agentsUsed: string[];
            toolsUsed: string[];
            filesModified: string[];
        };
    };
    'agentkit/task.failed': {
        data: {
            taskId: string;
            error: string;
            phase: string;
        };
    };

    // Single agent execution
    'agentkit/agent.run': {
        data: {
            runId: string;
            task: string;
            workspace: string;
            agentType: AgentKitAgentType;
            currentFile?: string;
        };
    };
    'agentkit/agent.completed': {
        data: {
            runId: string;
            output: string;
            toolsUsed: string[];
        };
    };

    // MCP-enhanced task
    'agentkit/mcp.execute': {
        data: {
            taskId: string;
            task: string;
            workspace: string;
            mcpServers?: string[];
        };
    };
};

// ===========================
// Inngest Client (AgentKit)
// ===========================

export const inngestAgentKit = new Inngest({
    id: 'rainy-agentkit',
    schemas: new EventSchemas().fromRecord<AgentKitEvents>(),
});

// ===========================
// Network Task Workflow
// ===========================

/**
 * Execute a task using the AgentKit network.
 * The network coordinates multiple agents through planning -> coding -> review -> testing.
 */
export const executeNetworkTaskWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-network-task',
        retries: 2,
        onFailure: async (ctx) => {
            // Type assertion for event data (ctx.event.data is the event payload)
            const eventData = ctx.event.data as unknown as { taskId: string };
            const taskId = eventData.taskId || 'unknown';
            console.error(`[AgentKit] Network task ${taskId} failed:`, ctx.error.message);
            await inngestAgentKit.send({
                name: 'agentkit/task.failed',
                data: {
                    taskId,
                    error: ctx.error.message,
                    phase: 'unknown',
                },
            });
        },
    },
    { event: 'agentkit/task.execute' },
    async ({ event, step }) => {
        const { taskId, task, workspace, maxIterations = 15, currentFile } = event.data;

        // Step 1: Setup workspace
        await step.run('setup-workspace', async () => {
            setWorkspacePath(workspace);
            agentEvents.emit({
                type: 'agent.thinking',
                taskId,
                agent: 'network',
                message: 'Setting up workspace...',
            });
            return { workspace };
        });

        // Step 2: Create and run network
        const result = await step.run('execute-network', async () => {
            agentEvents.emit({
                type: 'network.route',
                taskId,
                from: null,
                to: 'planner',
                reason: 'Starting task execution',
            });

            const execResult = await executeWithNetwork({
                workspace,
                task,
                currentFile,
                maxIterations,
            });

            return execResult;
        });

        // Step 3: Process result
        await step.run('process-result', async () => {
            if (result.success) {
                agentEvents.emit({
                    type: 'agent.complete',
                    taskId,
                    agent: 'network',
                    output: result.output.substring(0, 500),
                    timestamp: Date.now(),
                });

                await inngestAgentKit.send({
                    name: 'agentkit/task.completed',
                    data: {
                        taskId,
                        output: result.output,
                        state: result.state,
                        agentsUsed: result.agentsUsed,
                        toolsUsed: result.toolsUsed,
                        filesModified: result.filesModified,
                    },
                });
            } else {
                agentEvents.emit({
                    type: 'network.error',
                    taskId,
                    error: result.error || 'Unknown error',
                });

                await inngestAgentKit.send({
                    name: 'agentkit/task.failed',
                    data: {
                        taskId,
                        error: result.error || 'Unknown error',
                        phase: result.state.phase,
                    },
                });
            }
        });

        return result;
    }
);

// ===========================
// Single Agent Workflow
// ===========================

/**
 * Execute a task with a specific agent type.
 * Useful when you know exactly which agent should handle the task.
 */
export const executeSingleAgentWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-single-agent',
        retries: 2,
    },
    { event: 'agentkit/agent.run' },
    async ({ event, step }) => {
        const { runId, task, workspace, agentType, currentFile } = event.data;

        // Step 1: Setup
        await step.run('setup', async () => {
            setWorkspacePath(workspace);
            agentEvents.emit({
                type: 'agent.start',
                taskId: runId,
                agent: agentType,
                timestamp: Date.now(),
            });
            return { agentType };
        });

        // Step 2: Execute with specific agent
        const result = await step.run('execute-agent', async () => {
            const execResult = await executeWithAgent({
                workspace,
                task,
                agentType,
                currentFile,
            });
            return execResult;
        });

        // Step 3: Send completion
        await step.run('complete', async () => {
            if (result.success) {
                await inngestAgentKit.send({
                    name: 'agentkit/agent.completed',
                    data: {
                        runId,
                        output: result.output,
                        toolsUsed: result.toolsUsed,
                    },
                });

                agentEvents.emit({
                    type: 'agent.complete',
                    taskId: runId,
                    agent: agentType,
                    output: result.output,
                    timestamp: Date.now(),
                });
            } else {
                agentEvents.emit({
                    type: 'network.error',
                    taskId: runId,
                    error: result.error || 'Agent execution failed',
                });
            }
        });

        return result;
    }
);

// ===========================
// MCP-Enhanced Workflow
// ===========================

/**
 * Execute a task with MCP-enabled agents that have access to Context7
 * for live documentation and external tools.
 */
export const executeMCPTaskWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-mcp-task',
        retries: 2,
    },
    { event: 'agentkit/mcp.execute' },
    async ({ event, step }) => {
        const { taskId, task, workspace, mcpServers = ['context7'] } = event.data;

        // Step 1: Setup
        await step.run('setup', async () => {
            setWorkspacePath(workspace);
            agentEvents.emit({
                type: 'mcp.connect',
                taskId,
                server: mcpServers.join(', '),
                status: 'connected',
            });
            return { mcpServers };
        });

        // Step 2: Create MCP-enabled agent and execute
        const result = await step.run('execute-mcp-agent', async () => {
            // Use planner for complex tasks, coder for implementation
            const isPlanning = task.toLowerCase().includes('plan') ||
                task.toLowerCase().includes('analyze') ||
                task.toLowerCase().includes('design');

            const agent = isPlanning
                ? createMCPPlannerAgent({ workspace, mcpServers })
                : createMCPCoderAgent({ workspace, mcpServers });

            const agentResult = await agent.run(task);

            // Extract output using type-safe approach
            let output = '';
            if (agentResult.output) {
                for (const msg of agentResult.output) {
                    if (msg.type === 'text') {
                        const textMsg = msg as { type: 'text'; content: string | unknown[] };
                        if (typeof textMsg.content === 'string') {
                            output += textMsg.content + '\n';
                        }
                    }
                }
            }

            // Extract tool names
            const toolsUsed: string[] = [];
            if (agentResult.toolCalls) {
                for (const tc of agentResult.toolCalls) {
                    toolsUsed.push(tc.tool.name);
                }
            }

            return {
                success: true,
                output: output.trim(),
                toolsUsed,
            };
        });

        // Step 3: Cleanup
        await step.run('cleanup', async () => {
            agentEvents.emit({
                type: 'agent.complete',
                taskId,
                agent: 'mcp-agent',
                output: result.output.substring(0, 200),
                timestamp: Date.now(),
            });
        });

        return result;
    }
);

// ===========================
// Batch Tool Execution Workflow
// ===========================

interface BatchToolsEventData {
    batchId: string;
    toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
    workspace: string;
}

/**
 * Execute multiple tools in sequence with durability.
 * Each tool call is a separate step for retry/resume.
 */
export const executeBatchToolsWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-batch-tools',
        retries: 3,
    },
    {
        event: 'agentkit/batch.tools' as never, // Future event type
    },
    async ({ event, step }) => {
        const { toolCalls, workspace } = event.data as BatchToolsEventData;

        const results = [];

        for (let i = 0; i < toolCalls.length; i++) {
            const { tool, args } = toolCalls[i];

            const result = await step.run(`execute-tool-${i}`, async () => {
                const executor = createConfiguredExecutor(workspace);
                const toolResult = await executor.execute(createToolCall(tool, args));
                return toolResult;
            });

            results.push(result);
        }

        return { results };
    }
);

// ===========================
// Export AgentKit Workflows
// ===========================

export const agentKitWorkflows = [
    executeNetworkTaskWorkflow,
    executeSingleAgentWorkflow,
    executeMCPTaskWorkflow,
    executeBatchToolsWorkflow,
];
