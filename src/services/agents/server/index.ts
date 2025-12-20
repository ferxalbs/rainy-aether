/**
 * Rainy Agents Server - Hono + Inngest Sidecar
 * 
 * Self-contained server that runs as a Tauri sidecar.
 * Provides:
 * - Brain API for multi-agent execution
 * - Tool execution endpoints
 * - Durable Inngest workflow execution
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve as serveInngest } from 'inngest/hono';
import type { Context } from 'hono';

// Import modules
import brainRoutes from './routes/brain';
import { inngest, allWorkflows } from './workflows';
import { getAgentTypes } from './agents';

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
    version: '0.3.0',
    uptime: process.uptime(),
    features: ['brain', 'tools', 'agents', 'inngest'],
}));

// Mount brain routes
app.route('/api/brain', brainRoutes);

// Inngest endpoint
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serveInngest({
    client: inngest,
    functions: allWorkflows,
}));

// Brain status
app.get('/api/brain/status', (c: Context) => c.json({
    status: 'ready',
    agents: getAgentTypes(),
    workflows: allWorkflows.map(w => w.id),
    tools: 18,
}));

// Root info
app.get('/', (c: Context) => c.json({
    name: 'Rainy Agents Server',
    version: '0.3.0',
    endpoints: {
        health: '/health',
        brain: {
            execute: 'POST /api/brain/execute',
            status: 'GET /api/brain/tasks/:id',
            stream: 'GET /api/brain/tasks/:id/stream',
            cancel: 'POST /api/brain/tasks/:id/cancel',
            tools: 'GET /api/brain/tools',
            agents: 'GET /api/brain/agents',
            tool: 'POST /api/brain/tool',
            batch: 'POST /api/brain/tools/batch',
        },
        inngest: '/api/inngest',
    },
    agents: getAgentTypes(),
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
    console.log('🧠 Rainy Agents Server v0.3.0');
    console.log('═══════════════════════════════════════');
    console.log(`   Server:    http://localhost:${info.port}`);
    console.log(`   Brain:     http://localhost:${info.port}/api/brain`);
    console.log(`   Inngest:   http://localhost:${info.port}/api/inngest`);
    console.log(`   Tools:     18 registered`);
    console.log(`   Agents:    ${getAgentTypes().join(', ')}`);
    console.log(`   Workflows: ${allWorkflows.length} durable`);
    console.log('═══════════════════════════════════════');
    console.log('');
});

export default app;
