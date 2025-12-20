/**
 * Brain Routes
 * 
 * API endpoints for the AgentKit brain with multi-agent support.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import {
    createConfiguredExecutor,
    setWorkspacePath,
    createToolCall,
    toAgentKitTools,
} from '../tools';
import { router, getAgentTypes, AgentType } from '../agents';

// ===========================
// Types
// ===========================

interface TaskRequest {
    task: string;
    context?: {
        workspace?: string;
        currentFile?: string;
        selectedCode?: string;
    };
    options?: {
        agentType?: 'auto' | AgentType;
        maxDuration?: number;
        streaming?: boolean;
    };
}

interface TaskStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        current: number;
        total: number;
        message: string;
    };
    result?: any;
    error?: string;
    startTime: number;
    endTime?: number;
    agentsUsed?: string[];
}

// In-memory task storage
const tasks = new Map<string, TaskStatus>();

// Router initialization flag
let routerInitialized = false;

// ===========================
// Routes
// ===========================

const brain = new Hono();

/**
 * Initialize router (called once)
 */
async function ensureRouterInitialized(): Promise<void> {
    if (routerInitialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            await router.initialize(apiKey);
            routerInitialized = true;
            console.log('[Brain] Router initialized with Gemini');
        } catch (e) {
            console.error('[Brain] Failed to initialize router:', e);
        }
    } else {
        console.log('[Brain] No GEMINI_API_KEY, router disabled');
    }
}

/**
 * Execute a task
 */
brain.post('/execute', async (c: Context) => {
    const body = await c.req.json<TaskRequest>();

    if (!body.task) {
        return c.json({ error: 'Task is required' }, 400);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (body.context?.workspace) {
        setWorkspacePath(body.context.workspace);
    }

    const status: TaskStatus = {
        id: taskId,
        status: 'pending',
        progress: { current: 0, total: 1, message: 'Initializing...' },
        startTime: Date.now(),
    };
    tasks.set(taskId, status);

    executeTask(taskId, body).catch(error => {
        const task = tasks.get(taskId);
        if (task) {
            task.status = 'failed';
            task.error = error.message;
            task.endTime = Date.now();
        }
    });

    return c.json({
        taskId,
        streaming: `/api/brain/tasks/${taskId}/stream`,
        status: `/api/brain/tasks/${taskId}`,
    });
});

/**
 * Get task status
 */
brain.get('/tasks/:id', (c: Context) => {
    const taskId = c.req.param('id');
    const task = tasks.get(taskId);

    if (!task) return c.json({ error: 'Task not found' }, 404);
    return c.json(task);
});

/**
 * Stream task updates via SSE
 */
brain.get('/tasks/:id/stream', (c: Context) => {
    const taskId = c.req.param('id');
    const task = tasks.get(taskId);

    if (!task) return c.json({ error: 'Task not found' }, 404);

    return streamSSE(c, async (stream) => {
        let lastStatus = '';

        while (true) {
            const current = tasks.get(taskId);
            if (!current) break;

            const statusStr = JSON.stringify(current);
            if (statusStr !== lastStatus) {
                await stream.writeSSE({ data: statusStr });
                lastStatus = statusStr;
            }

            if (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled') {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
    });
});

/**
 * Cancel a task
 */
brain.post('/tasks/:id/cancel', (c: Context) => {
    const taskId = c.req.param('id');
    const task = tasks.get(taskId);

    if (!task) return c.json({ error: 'Task not found' }, 404);

    task.status = 'cancelled';
    task.endTime = Date.now();
    return c.json({ cancelled: true });
});

/**
 * Get available tools
 */
brain.get('/tools', (c: Context) => {
    return c.json({ tools: toAgentKitTools() });
});

/**
 * Get available agents
 */
brain.get('/agents', (c: Context) => {
    return c.json({
        agents: router.listAgents(),
        types: getAgentTypes(),
    });
});

/**
 * Execute a single tool directly
 */
brain.post('/tool', async (c: Context) => {
    const { tool, args, workspace } = await c.req.json();

    if (!tool) return c.json({ error: 'Tool name is required' }, 400);

    if (workspace) setWorkspacePath(workspace);

    const executor = createConfiguredExecutor();
    const call = createToolCall(tool, args || {});
    const result = await executor.execute(call);

    return c.json(result);
});

/**
 * Batch execute multiple tools
 */
brain.post('/tools/batch', async (c: Context) => {
    const { calls, workspace, options } = await c.req.json();

    if (!Array.isArray(calls)) return c.json({ error: 'Calls must be an array' }, 400);

    if (workspace) setWorkspacePath(workspace);

    const executor = createConfiguredExecutor();
    const toolCalls = calls.map((call: any) => createToolCall(call.tool, call.args || {}));
    const results = await executor.batch(toolCalls, options);

    return c.json({ results });
});

// ===========================
// Task Execution with Agents
// ===========================

async function executeTask(taskId: string, request: TaskRequest): Promise<void> {
    const task = tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.progress = { current: 0, total: 3, message: 'Analyzing task...' };

    try {
        await ensureRouterInitialized();

        // If router is available, use multi-agent execution
        if (routerInitialized) {
            task.progress = { current: 1, total: 3, message: 'Routing to agent...' };

            const agentType = request.options?.agentType !== 'auto'
                ? request.options?.agentType as AgentType
                : undefined;

            const result = await router.execute(
                {
                    workspace: request.context?.workspace || process.cwd(),
                    task: request.task,
                    files: request.context?.currentFile ? [request.context.currentFile] : undefined,
                },
                agentType
            );

            task.progress = { current: 3, total: 3, message: 'Complete' };
            task.status = result.success ? 'completed' : 'failed';
            task.result = {
                output: result.output,
                toolsUsed: result.toolsUsed,
                filesModified: result.filesModified,
            };
            task.agentsUsed = result.agentsUsed;
            task.error = result.error;
            task.endTime = Date.now();
            return;
        }

        // Fallback: Simple tool-based execution
        const executor = createConfiguredExecutor();
        task.progress = { current: 1, total: 3, message: 'Reading workspace...' };

        const workspaceInfo = await executor.execute(createToolCall('get_workspace_info', {}));
        const dirTree = await executor.execute(createToolCall('read_directory_tree', { path: '.', max_depth: 2 }));

        task.progress = { current: 2, total: 3, message: 'Executing...' };

        const results: any[] = [];

        // Simple task parsing
        if (/create|crea/i.test(request.task)) {
            const match = request.task.match(/(?:create|crea)[^\w]*(?:file|archivo)?[^\w]*([a-zA-Z0-9_.-]+\.[a-zA-Z]+)/i);
            if (match) {
                const result = await executor.execute(createToolCall('create_file', {
                    path: match[1],
                    content: `// ${match[1]}\n// Created by Rainy Brain\n`,
                }));
                results.push(result);
            }
        }

        if (/read|lee/i.test(request.task)) {
            const match = request.task.match(/(?:read|lee)[^\w]*(?:file|archivo)?[^\w]*([a-zA-Z0-9_./\\-]+)/i);
            if (match) {
                const result = await executor.execute(createToolCall('read_file', { path: match[1] }));
                results.push(result);
            }
        }

        task.progress = { current: 3, total: 3, message: 'Complete' };
        task.status = 'completed';
        task.result = {
            workspaceInfo: workspaceInfo.result,
            directoryTree: dirTree.result,
            taskResults: results,
            message: `Task "${request.task}" completed`,
        };
        task.endTime = Date.now();

    } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.endTime = Date.now();
    }
}

export default brain;

