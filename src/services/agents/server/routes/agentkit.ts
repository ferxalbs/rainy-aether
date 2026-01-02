/**
 * AgentKit Routes
 * 
 * New API endpoints for AgentKit-based execution with:
 * - Network-based task execution
 * - Hybrid routing (heuristics + LLM)
 * - Real-time SSE streaming
 * - MCP configuration
 * - State management
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import {
    executeWithNetwork,
    executeWithAgent,
    hybridRoute,
    stateStore,
    createConversationContext,
    agentFactories,
} from '../agents';
import type { AgentKitAgentType, RoutingContext } from '../agents';
import { agentEvents } from '../streaming/events';
import { setWorkspacePath, createToolCall, createConfiguredExecutor } from '../tools';
import { getMCPConfigs, getConfigByName } from '../mcp/config';
import type { MCPServerConfig } from '../mcp/config';

// ===========================
// Types
// ===========================

interface AgentKitTaskRequest {
    task: string;
    conversationId?: string;
    context?: {
        workspace?: string;
        currentFile?: string;
        selectedCode?: string;
    };
    options?: {
        routing?: 'auto' | 'heuristic' | 'llm';
        preferredAgent?: AgentKitAgentType;
        maxIterations?: number;
        enableMCP?: boolean;
        mcpServers?: string[];
    };
}

interface AgentKitTaskResponse {
    taskId: string;
    conversationId: string;
    routing: {
        agent: AgentKitAgentType;
        confidence: number;
        reasoning: string;
    };
    streamUrl: string;
    statusUrl: string;
}

interface TaskResult {
    taskId: string;
    conversationId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    agentsUsed: string[];
    toolsUsed: string[];
    filesModified: string[];
    error?: string;
    durationMs?: number;
}

// In-memory task store
const taskResults = new Map<string, TaskResult>();

// ===========================
// Routes
// ===========================

const agentkit = new Hono();

/**
 * Execute task with AgentKit network
 */
agentkit.post('/execute', async (c: Context) => {
    const body = await c.req.json<AgentKitTaskRequest>();

    if (!body.task) {
        return c.json({ error: 'Task is required' }, 400);
    }

    // Generate IDs
    const taskId = `ak_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const conversationId = body.conversationId || `conv_${Date.now()}`;

    // Set workspace
    const workspace = body.context?.workspace || process.cwd();
    setWorkspacePath(workspace);

    // Create conversation context
    const convContext = createConversationContext(conversationId, workspace);
    convContext.addUserMessage(body.task);

    // Route the task
    const routingContext: RoutingContext = {
        task: body.task,
        workspace,
        currentFile: body.context?.currentFile,
        preferredAgent: body.options?.preferredAgent,
        conversationHistory: [convContext.getRecentContext()],
    };

    const routing = await hybridRoute(routingContext, {
        llmThreshold: body.options?.routing === 'llm' ? 0 : 0.6,
        useLLM: body.options?.routing !== 'heuristic',
    });

    // Initialize result
    const result: TaskResult = {
        taskId,
        conversationId,
        status: 'pending',
        agentsUsed: [],
        toolsUsed: [],
        filesModified: [],
    };
    taskResults.set(taskId, result);

    // Start task execution in background
    convContext.startTask(taskId, body.context?.currentFile);
    executeAgentKitTask(taskId, conversationId, body, routing.agent).catch(error => {
        const task = taskResults.get(taskId);
        if (task) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
        }
    });

    const response: AgentKitTaskResponse = {
        taskId,
        conversationId,
        routing: {
            agent: routing.agent,
            confidence: routing.confidence,
            reasoning: routing.reasoning,
        },
        streamUrl: `/api/agentkit/tasks/${taskId}/stream`,
        statusUrl: `/api/agentkit/tasks/${taskId}`,
    };

    return c.json(response, 202);
});

/**
 * Get task status
 */
agentkit.get('/tasks/:id', (c: Context) => {
    const taskId = c.req.param('id');
    const task = taskResults.get(taskId);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
});

/**
 * Stream task events via SSE
 */
agentkit.get('/tasks/:id/stream', (c: Context) => {
    const taskId = c.req.param('id');
    const task = taskResults.get(taskId);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return streamSSE(c, async (stream) => {
        // Subscribe to agent events
        const unsubscribe = agentEvents.subscribe(taskId, async (event) => {
            try {
                await stream.writeSSE({ data: JSON.stringify(event) });
            } catch {
                // Stream closed
            }
        });

        // Poll for completion
        while (true) {
            const current = taskResults.get(taskId);
            if (!current) break;

            if (current.status === 'completed' || current.status === 'failed') {
                // Send final status
                await stream.writeSSE({
                    data: JSON.stringify({
                        type: 'task.complete',
                        taskId,
                        status: current.status,
                        output: current.output,
                        agentsUsed: current.agentsUsed,
                        toolsUsed: current.toolsUsed,
                        filesModified: current.filesModified,
                        error: current.error,
                    }),
                });
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        unsubscribe();
        agentEvents.cleanup(taskId);
    });
});

/**
 * Execute with specific agent (no routing)
 */
agentkit.post('/agent/:type', async (c: Context) => {
    const agentType = c.req.param('type') as AgentKitAgentType;
    const body = await c.req.json<{ task: string; workspace?: string; currentFile?: string }>();

    if (!agentFactories[agentType]) {
        return c.json({ error: `Unknown agent type: ${agentType}` }, 400);
    }

    if (!body.task) {
        return c.json({ error: 'Task is required' }, 400);
    }

    const workspace = body.workspace || process.cwd();
    setWorkspacePath(workspace);

    try {
        const result = await executeWithAgent({
            workspace,
            task: body.task,
            agentType,
            currentFile: body.currentFile,
        });

        return c.json(result);
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

/**
 * Route task without executing
 */
agentkit.post('/route', async (c: Context) => {
    const body = await c.req.json<{
        task: string;
        workspace?: string;
        currentFile?: string;
        mode?: 'heuristic' | 'llm' | 'hybrid';
    }>();

    if (!body.task) {
        return c.json({ error: 'Task is required' }, 400);
    }

    const routing = await hybridRoute({
        task: body.task,
        workspace: body.workspace,
        currentFile: body.currentFile,
    }, {
        useLLM: body.mode !== 'heuristic',
        llmThreshold: body.mode === 'llm' ? 0 : 0.6,
    });

    return c.json(routing);
});

/**
 * Get available agents
 */
agentkit.get('/agents', (c: Context) => {
    const agents = Object.keys(agentFactories).map(name => ({
        name,
        factory: name,
        description: getAgentDescription(name as AgentKitAgentType),
    }));

    return c.json({ agents });
});

/**
 * Get conversation history
 */
agentkit.get('/conversations/:id', (c: Context) => {
    const conversationId = c.req.param('id');
    const conversation = stateStore.getConversation(conversationId);

    if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({
        id: conversation.id,
        workspace: conversation.workspace,
        messageCount: conversation.messages.length,
        taskCount: conversation.tasks.length,
        messages: conversation.messages.slice(-20), // Last 20 messages
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
    });
});

/**
 * Get state stats
 */
agentkit.get('/state/stats', (c: Context) => {
    return c.json(stateStore.getStats());
});

// ===========================
// MCP Configuration Endpoints
// ===========================

import {
    hasMCPConfig,
    loadMCPConfig,
    getProjectMCPConfigs,
    createDefaultMCPConfig,
    addServerToConfig,
    removeServerFromConfig,
    toggleServerEnabled,
    getAllHealthStatuses,
    getCircuitBreakerStatus,
    resetCircuitBreaker,
} from '../mcp';
import type { MCPServerEntry } from '../mcp';

/**
 * Get MCP server configurations (built-in + project)
 */
agentkit.get('/mcp/servers', (c: Context) => {
    const workspace = c.req.query('workspace') || process.cwd();

    // Built-in configs
    const builtIn = getMCPConfigs();

    // Project configs from .rainy/rainy-mcp.json
    const projectConfigs = getProjectMCPConfigs(workspace);

    return c.json({
        hasProjectConfig: hasMCPConfig(workspace),
        servers: [...builtIn, ...projectConfigs].map(cfg => ({
            name: cfg.name,
            enabled: cfg.enabled,
            transport: cfg.transport.type,
            description: cfg.description,
            category: cfg.category,
            priority: cfg.priority,
        })),
    });
});

/**
 * Get project MCP configuration
 */
agentkit.get('/mcp/config', (c: Context) => {
    const workspace = c.req.query('workspace') || process.cwd();

    if (!hasMCPConfig(workspace)) {
        return c.json({
            exists: false,
            path: `${workspace}/.rainy/rainy-mcp.json`,
        });
    }

    const config = loadMCPConfig(workspace);
    return c.json({ exists: true, config });
});

/**
 * Create default MCP configuration
 */
agentkit.post('/mcp/config', async (c: Context) => {
    const { workspace } = await c.req.json<{ workspace?: string }>();
    const ws = workspace || process.cwd();

    if (hasMCPConfig(ws)) {
        return c.json({ error: 'Configuration already exists' }, 409);
    }

    const configPath = createDefaultMCPConfig(ws);
    return c.json({ created: true, path: configPath });
});

/**
 * Add server to project config
 */
agentkit.post('/mcp/servers', async (c: Context) => {
    const { workspace, server } = await c.req.json<{
        workspace?: string;
        server: MCPServerEntry;
    }>();

    const ws = workspace || process.cwd();
    const success = addServerToConfig(ws, server);

    if (!success) {
        return c.json({ error: 'Failed to add server' }, 400);
    }

    return c.json({ added: true, server: server.name });
});

/**
 * Remove server from project config
 */
agentkit.delete('/mcp/servers/:name', async (c: Context) => {
    const name = c.req.param('name');
    const workspace = c.req.query('workspace') || process.cwd();

    const success = removeServerFromConfig(workspace, name);

    if (!success) {
        return c.json({ error: 'Server not found' }, 404);
    }

    return c.json({ removed: true, server: name });
});

/**
 * Toggle server enabled/disabled
 */
agentkit.patch('/mcp/servers/:name', async (c: Context) => {
    const name = c.req.param('name');
    const { enabled, workspace } = await c.req.json<{
        enabled: boolean;
        workspace?: string;
    }>();

    const ws = workspace || process.cwd();
    const success = toggleServerEnabled(ws, name, enabled);

    if (!success) {
        return c.json({ error: 'Server not found' }, 404);
    }

    return c.json({ updated: true, server: name, enabled });
});

/**
 * Get MCP server details (built-in)
 */
agentkit.get('/mcp/servers/:name', (c: Context) => {
    const name = c.req.param('name');
    const config = getConfigByName(name);

    if (!config) {
        return c.json({ error: 'Server not found' }, 404);
    }

    return c.json(config);
});

// ===========================
// MCP Health & Resilience Endpoints
// ===========================

/**
 * Get health status of all MCP servers
 */
agentkit.get('/mcp/health', (c: Context) => {
    const statuses = getAllHealthStatuses();
    const circuitBreakers = getCircuitBreakerStatus();

    return c.json({
        servers: statuses,
        circuitBreakers: Object.fromEntries(circuitBreakers),
    });
});

/**
 * Reset circuit breaker for a server
 */
agentkit.post('/mcp/health/:name/reset', (c: Context) => {
    const name = c.req.param('name');
    resetCircuitBreaker(name);

    return c.json({ reset: true, server: name });
});

// ===========================
// Helper Functions
// ===========================

function getAgentDescription(type: AgentKitAgentType): string {
    const descriptions: Record<AgentKitAgentType, string> = {
        planner: 'Analyzes tasks and creates step-by-step implementation plans',
        coder: 'Writes, edits, and refactors code',
        reviewer: 'Reviews code for bugs, security, and best practices',
        terminal: 'Executes commands, runs tests, manages processes',
        docs: 'Reads documentation and provides context',
    };
    return descriptions[type] || 'Unknown agent';
}

async function executeAgentKitTask(
    taskId: string,
    conversationId: string,
    request: AgentKitTaskRequest,
    routedAgent: AgentKitAgentType
): Promise<void> {
    const task = taskResults.get(taskId);
    if (!task) return;

    task.status = 'running';
    const startTime = Date.now();

    try {
        // Emit start event
        agentEvents.emit({
            type: 'agent.start',
            taskId,
            agent: routedAgent,
            timestamp: Date.now(),
        });

        // Execute with network
        const result = await executeWithNetwork({
            workspace: request.context?.workspace || process.cwd(),
            task: request.task,
            currentFile: request.context?.currentFile,
            maxIterations: request.options?.maxIterations || 15,
        });

        // Update conversation context
        const convContext = createConversationContext(conversationId, request.context?.workspace || process.cwd());
        convContext.addAssistantMessage(result.output, routedAgent);
        convContext.completeTask(result.success, result.error);

        // Store in state
        for (const agent of result.agentsUsed) {
            stateStore.recordAgentUsed(agent as AgentKitAgentType);
        }
        for (const tool of result.toolsUsed) {
            stateStore.recordToolUsed(tool);
        }
        for (const file of result.filesModified) {
            stateStore.recordFileModified(file);
        }

        // Update result
        task.status = result.success ? 'completed' : 'failed';
        task.output = result.output;
        task.agentsUsed = result.agentsUsed;
        task.toolsUsed = result.toolsUsed;
        task.filesModified = result.filesModified;
        task.error = result.error;
        task.durationMs = Date.now() - startTime;

        // Emit completion event
        agentEvents.emit({
            type: 'agent.complete',
            taskId,
            agent: routedAgent,
            output: result.output.substring(0, 500),
            timestamp: Date.now(),
        });

    } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.durationMs = Date.now() - startTime;

        agentEvents.emit({
            type: 'network.error',
            taskId,
            error: task.error,
        });
    }
}

export default agentkit;
