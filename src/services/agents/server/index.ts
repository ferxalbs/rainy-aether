/**
 * Rainy Agents Server - Hono + Inngest Sidecar
 * 
 * This server runs as a Tauri sidecar and provides:
 * - Inngest workflow execution endpoints
 * - AgentKit multi-agent brain orchestration
 * 
 * Built with `pkg` into platform-specific binaries.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve as serveInngest } from 'inngest/hono';
import { inngest } from '../inngest/client';
import { allWorkflows } from '../workflows';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:1420', 'tauri://localhost'],
    credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => c.json({
    status: 'ok',
    server: 'rainy-agents',
    version: '0.1.0',
    uptime: process.uptime(),
}));

// Inngest endpoint - handles all workflow events
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serveInngest({
    client: inngest,
    functions: allWorkflows,
}));

// Brain status endpoint
app.get('/api/brain/status', (c) => c.json({
    status: 'ready',
    agents: ['codeAssistant', 'codeReviewer', 'documentationAgent'],
    workflows: allWorkflows.map(w => w.id),
}));

// Start server
const port = parseInt(process.env.INNGEST_PORT || '3847', 10);

serve({
    fetch: app.fetch,
    port,
}, (info) => {
    console.log(`🧠 Rainy Agents Server running on http://localhost:${info.port}`);
    console.log(`   Inngest endpoint: http://localhost:${info.port}/api/inngest`);
    console.log(`   Health check: http://localhost:${info.port}/health`);
});

export default app;
