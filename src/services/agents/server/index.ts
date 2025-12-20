/**
 * Rainy Agents Server - Hono + Inngest Sidecar
 * 
 * Self-contained server that runs as a Tauri sidecar.
 * Provides Inngest workflow execution endpoints.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve as serveInngest } from 'inngest/hono';
import { Inngest, EventSchemas } from 'inngest';
import type { Context } from 'hono';

// ===========================
// Inngest Client (inline)
// ===========================

type Events = {
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
    'rag/index.requested': {
        data: {
            projectId: string;
            rootPath: string;
        };
    };
};

const inngest = new Inngest({
    id: 'rainy-aether',
    schemas: new EventSchemas().fromRecord<Events>(),
});

// ===========================
// Workflows (inline)
// ===========================

const indexCodebase = inngest.createFunction(
    { id: 'index-codebase', retries: 3 },
    { event: 'codebase/index.requested' },
    async ({ event, step }) => {
        const { rootPath, projectId } = event.data;

        const fileCount = await step.run('scan-files', async () => {
            console.log(`[${projectId}] Scanning: ${rootPath}`);
            return 0; // Placeholder - actual impl via IPC
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

const indexRAG = inngest.createFunction(
    { id: 'index-rag', retries: 3 },
    { event: 'rag/index.requested' },
    async ({ event, step }) => {
        const { projectId, rootPath } = event.data;

        await step.run('generate-embeddings', async () => {
            console.log(`Generating embeddings for ${rootPath}`);
        });

        return { projectId, success: true };
    }
);

const allWorkflows = [indexCodebase, migrateRepo, indexRAG];

// ===========================
// Hono App
// ===========================

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:1420', 'tauri://localhost'],
    credentials: true,
}));

// Health check
app.get('/health', (c: Context) => c.json({
    status: 'ok',
    server: 'rainy-agents',
    version: '0.1.0',
    uptime: process.uptime(),
}));

// Inngest endpoint
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serveInngest({
    client: inngest,
    functions: allWorkflows,
}));

// Brain status
app.get('/api/brain/status', (c: Context) => c.json({
    status: 'ready',
    agents: ['codeAssistant', 'codeReviewer', 'documentationAgent'],
    workflows: allWorkflows.map(w => w.id),
}));

// Start server
const port = parseInt(process.env.INNGEST_PORT || '3847', 10);

serve({
    fetch: app.fetch,
    port,
}, (info: { port: number }) => {
    console.log(`🧠 Rainy Agents Server running on http://localhost:${info.port}`);
    console.log(`   Inngest endpoint: http://localhost:${info.port}/api/inngest`);
});

export default app;
