/**
 * Brain Routes
 * 
 * API endpoints for the AgentKit brain.
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
        agentType?: 'auto' | 'planner' | 'coder' | 'reviewer' | 'terminal';
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
}

// In-memory task storage (replace with Redis/DB in production)
const tasks = new Map<string, TaskStatus>();

// ===========================
// Routes
// ===========================

const brain = new Hono();

/**
 * Execute a task
 */
brain.post('/execute', async (c: Context) => {
    const body = await c.req.json<TaskRequest>();

    if (!body.task) {
        return c.json({ error: 'Task is required' }, 400);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Set workspace if provided
    if (body.context?.workspace) {
        setWorkspacePath(body.context.workspace);
    }

    // Create task status
    const status: TaskStatus = {
        id: taskId,
        status: 'pending',
        progress: { current: 0, total: 1, message: 'Initializing...' },
        startTime: Date.now(),
    };
    tasks.set(taskId, status);

    // Execute asynchronously
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

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
});

/**
 * Stream task updates via SSE
 */
brain.get('/tasks/:id/stream', (c: Context) => {
    const taskId = c.req.param('id');
    const task = tasks.get(taskId);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

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

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

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
 * Execute a single tool directly
 */
brain.post('/tool', async (c: Context) => {
    const { tool, args, workspace } = await c.req.json();

    if (!tool) {
        return c.json({ error: 'Tool name is required' }, 400);
    }

    if (workspace) {
        setWorkspacePath(workspace);
    }

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

    if (!Array.isArray(calls)) {
        return c.json({ error: 'Calls must be an array' }, 400);
    }

    if (workspace) {
        setWorkspacePath(workspace);
    }

    const executor = createConfiguredExecutor();
    const toolCalls = calls.map((call: any) => createToolCall(call.tool, call.args || {}));
    const results = await executor.batch(toolCalls, options);

    return c.json({ results });
});

// ===========================
// Task Execution (Simple for now)
// ===========================

async function executeTask(taskId: string, request: TaskRequest): Promise<void> {
    const task = tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    task.progress = { current: 0, total: 3, message: 'Analyzing task...' };

    try {
        const executor = createConfiguredExecutor();

        // Step 1: Understand context
        task.progress = { current: 1, total: 3, message: 'Reading workspace...' };

        const workspaceInfo = await executor.execute(createToolCall('get_workspace_info', {}));
        const dirTree = await executor.execute(createToolCall('read_directory_tree', { path: '.', max_depth: 2 }));

        // Step 2: Execute based on task type
        task.progress = { current: 2, total: 3, message: 'Executing task...' };

        // Simple task parsing (will be replaced by LLM in Phase 2)
        const results: any[] = [];

        if (request.task.toLowerCase().includes('create') || request.task.toLowerCase().includes('crea')) {
            // Extract filename from task (simple regex)
            const fileMatch = request.task.match(/(?:create|crea)[^\w]*(?:file|archivo)?[^\w]*([a-zA-Z0-9_.-]+\.[a-zA-Z]+)/i);
            if (fileMatch) {
                const filename = fileMatch[1];
                const result = await executor.execute(createToolCall('create_file', {
                    path: filename,
                    content: `// ${filename}\n// Created by Rainy Brain\n\nconsole.log("Hello from ${filename}");\n`,
                }));
                results.push(result);
            }
        }

        if (request.task.toLowerCase().includes('read') || request.task.toLowerCase().includes('lee')) {
            const fileMatch = request.task.match(/(?:read|lee)[^\w]*(?:file|archivo)?[^\w]*([a-zA-Z0-9_./\\-]+)/i);
            if (fileMatch) {
                const filename = fileMatch[1];
                const result = await executor.execute(createToolCall('read_file', { path: filename }));
                results.push(result);
            }
        }

        // Step 3: Complete
        task.progress = { current: 3, total: 3, message: 'Task completed' };
        task.status = 'completed';
        task.result = {
            workspaceInfo: workspaceInfo.result,
            directoryTree: dirTree.result,
            taskResults: results,
            message: `Task "${request.task}" completed successfully`,
        };
        task.endTime = Date.now();

    } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.endTime = Date.now();
    }
}

export default brain;
