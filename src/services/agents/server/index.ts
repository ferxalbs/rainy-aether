/**
 * Rainy Agents Server - Hono + Inngest Sidecar
 * 
 * Self-contained server that runs as a Tauri sidecar.
 * Provides:
 * - Brain API for agent execution
 * - Tool execution endpoints
 * - Inngest workflow execution
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve as serveInngest } from 'inngest/hono';
import { Inngest, EventSchemas } from 'inngest';
import type { Context } from 'hono';

// Import brain routes
import brainRoutes from './routes/brain';

// ===========================
// Inngest Client
// ===========================

type Events = {
    'brain/task.requested': {
        data: {
            taskId: string;
            task: string;
            context?: Record<string, unknown>;
        };
    };
    'brain/task.completed': {
        data: {
            taskId: string;
            result: unknown;
        };
    };
    'codebase/index.requested': {
        data: {
            rootPath: string;
            projectId: string;
            options?: {
                includeNodeModules?: boolean;
                maxDepth?: number;
            };
        };
    };
    'repo/migration.requested': {
        data: {
            sourcePath: string;
            targetPath: string;
            migrationType: string;
        };
    };
};

const inngest = new Inngest({
    id: 'rainy-aether',
    schemas: new EventSchemas().fromRecord<Events>(),
});

// ===========================
// Inngest Workflows
// ===========================

const indexCodebase = inngest.createFunction(
    { id: 'index-codebase', retries: 3 },
    { event: 'codebase/index.requested' },
    async ({ event, step }) => {
        const { rootPath, projectId } = event.data;

        const fileCount = await step.run('scan-files', async () => {
            console.log(`[${projectId}] Scanning: ${rootPath}`);
            return 0;
        });

        await step.run('analyze-files', async () => {
            console.log(`[${projectId}] Analyzing ${fileCount} files`);
        });

        return { projectId, indexed: fileCount };
    }
);

const migrateRepo = inngest.createFunction(
    { id: 'migrate-repo', retries: 2 },
    { event: 'repo/migration.requested' },
    async ({ event, step }) => {
        const { sourcePath, migrationType } = event.data;

        await step.run('backup', async () => {
            console.log(`Backing up ${sourcePath}`);
        });

        await step.run('migrate', async () => {
            console.log(`Running ${migrationType} migration`);
        });

        return { success: true, sourcePath };
    }
);

const allWorkflows = [indexCodebase, migrateRepo];

// ===========================
// Hono App
// ===========================

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:1420', 'http://localhost:5173', 'tauri://localhost'],
    credentials: true,
}));

// Health check
app.get('/health', (c: Context) => c.json({
    status: 'ok',
    server: 'rainy-agents',
    version: '0.2.0',
    uptime: process.uptime(),
    features: ['brain', 'tools', 'inngest'],
}));

// Mount brain routes
app.route('/api/brain', brainRoutes);

// Inngest endpoint
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serveInngest({
    client: inngest,
    functions: allWorkflows,
}));

// Legacy brain status (for backwards compatibility)
app.get('/api/brain/status', (c: Context) => c.json({
    status: 'ready',
    agents: ['planner', 'coder', 'reviewer', 'terminal', 'docs'],
    workflows: allWorkflows.map(w => w.id),
    tools: 18,
}));

// Root info
app.get('/', (c: Context) => c.json({
    name: 'Rainy Agents Server',
    version: '0.2.0',
    endpoints: {
        health: '/health',
        brain: {
            execute: 'POST /api/brain/execute',
            status: 'GET /api/brain/tasks/:id',
            stream: 'GET /api/brain/tasks/:id/stream',
            cancel: 'POST /api/brain/tasks/:id/cancel',
            tools: 'GET /api/brain/tools',
            tool: 'POST /api/brain/tool',
            batch: 'POST /api/brain/tools/batch',
        },
        inngest: '/api/inngest',
    },
}));

// ===========================
// Start Server
// ===========================

const port = parseInt(process.env.INNGEST_PORT || '3847', 10);

serve({
    fetch: app.fetch,
    port,
}, (info: { port: number }) => {
    console.log('');
    console.log('🧠 Rainy Agents Server v0.2.0');
    console.log('═══════════════════════════════════════');
    console.log(`   Server:    http://localhost:${info.port}`);
    console.log(`   Brain:     http://localhost:${info.port}/api/brain`);
    console.log(`   Inngest:   http://localhost:${info.port}/api/inngest`);
    console.log(`   Tools:     18 registered`);
    console.log(`   Agents:    5 specialized`);
    console.log('═══════════════════════════════════════');
    console.log('');
});

export default app;
