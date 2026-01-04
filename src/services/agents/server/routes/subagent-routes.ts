/**
 * Subagent Management API Routes (Hono)
 * 
 * Hono routes for managing subagents via HTTP.
 * Provides CRUD operations, validation, and analytics.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { subagentRegistry } from '../registry/SubagentRegistry';
import { SubagentFactory } from '../factory/SubagentFactory';
import { SubagentExecutor } from '../factory/SubagentExecutor';
import { toolPermissionManager } from '../tools/ToolPermissionManager';
import { setWorkspacePath } from '../tools/bridge';
import type {
    SubagentConfig,
    CreateSubagentConfig,
    UpdateSubagentConfig,
} from '../types/SubagentConfig';

const subagentRoutes = new Hono();

// ===========================
// List & Get Operations
// ===========================

/**
 * GET /api/subagents
 * List all subagents with optional filtering
 */
subagentRoutes.get('/', async (c: Context) => {
    try {
        const scope = c.req.query('scope');
        const enabled = c.req.query('enabled');
        const tag = c.req.query('tag');
        const search = c.req.query('search');
        const workspace = c.req.query('workspace');

        // If workspace is provided, set project path and reload agents
        // This ensures project-level subagents are always loaded when listing
        if (workspace) {
            console.log(`[Subagents API] Setting project path to: ${workspace}`);
            subagentRegistry.setProjectPath(workspace);
            // Reload to pick up any new/changed project-level agents
            await subagentRegistry.loadAll();
        }

        let agents = subagentRegistry.getAll();

        console.log(`[Subagents API] Listing ${agents.length} subagents (workspace: ${workspace || 'none'})`);

        // Filter by scope
        if (scope) {
            agents = agents.filter(a => a.scope === scope);
        }

        // Filter by enabled status
        if (enabled !== undefined) {
            const isEnabled = enabled === 'true';
            agents = agents.filter(a => a.enabled === isEnabled);
        }

        // Filter by tag
        if (tag) {
            agents = subagentRegistry.findByTag(tag);
        }

        // Search by query
        if (search) {
            agents = subagentRegistry.search(search);
        }

        return c.json({
            success: true,
            count: agents.length,
            agents,
        });
    } catch (error) {
        console.error('[Subagents API] Error listing subagents:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list subagents',
        }, 500);
    }
});

/**
 * GET /api/subagents/stats
 * Get registry statistics
 */
subagentRoutes.get('/stats', (c: Context) => {
    try {
        const stats = subagentRegistry.getStats();

        return c.json({
            success: true,
            stats,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get stats',
        }, 500);
    }
});

/**
 * GET /api/subagents/:id
 * Get a specific subagent
 */
subagentRoutes.get('/:id', (c: Context) => {
    try {
        const id = c.req.param('id');
        const agent = subagentRegistry.get(id);

        if (!agent) {
            return c.json({
                success: false,
                error: `Subagent '${id}' not found`,
            }, 404);
        }

        // Get tool stats
        const toolStats = SubagentFactory.getToolStats(agent);

        // Get usage stats
        const usageStats = toolPermissionManager.getUsageStats(id);

        return c.json({
            success: true,
            agent,
            toolStats,
            usageStats,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get subagent',
        }, 500);
    }
});

// ===========================
// Create & Update Operations
// ===========================

/**
 * POST /api/subagents
 * Create a new subagent
 */
subagentRoutes.post('/', async (c: Context) => {
    try {
        const body = await c.req.json<CreateSubagentConfig & { workspace?: string }>();

        // Generate ID from name if not provided
        const id = body.id || body.name?.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') || 'custom-agent';

        // Set project path for project-scoped agents (DYNAMIC based on open project)
        if (body.scope === 'project') {
            const workspace = body.workspace;
            if (!workspace) {
                return c.json({
                    success: false,
                    error: 'Workspace path is required for project-scoped agents',
                }, 400);
            }
            subagentRegistry.setProjectPath(workspace);
        }

        // Build config with generated ID
        const config = { ...body, id };
        delete (config as any).workspace; // Remove workspace from config (not part of schema)

        // Validate with permissions
        const validation = SubagentFactory.validateWithPermissions(config as SubagentConfig);
        if (!validation.valid) {
            return c.json({
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
            }, 400);
        }

        // Create agent
        const agent = await subagentRegistry.create(config);

        return c.json({
            success: true,
            agent,
            warnings: validation.warnings,
        }, 201);
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create subagent',
        }, 500);
    }
});


/**
 * PUT /api/subagents/:id
 * Update an existing subagent
 */
subagentRoutes.put('/:id', async (c: Context) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json<UpdateSubagentConfig & { workspace?: string }>();

        // Validate
        const agent = subagentRegistry.get(id);
        if (!agent) {
            return c.json({
                success: false,
                error: `Subagent '${id}' not found`,
            }, 404);
        }

        // Set project path if updating a project-scoped agent
        const effectiveScope = body.scope || agent.scope;
        if (effectiveScope === 'project') {
            const workspace = body.workspace;
            if (!workspace) {
                return c.json({
                    success: false,
                    error: 'Workspace path is required for project-scoped agents',
                }, 400);
            }
            subagentRegistry.setProjectPath(workspace);
        }

        // Remove workspace from updates (not part of schema)
        const updates = { ...body };
        delete (updates as any).workspace;

        // Merge and validate
        const merged = { ...agent, ...updates };
        const validation = SubagentFactory.validateWithPermissions(merged);
        if (!validation.valid) {
            return c.json({
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
            }, 400);
        }

        // Update
        const updated = await subagentRegistry.update({ ...updates, id });

        return c.json({
            success: true,
            agent: updated,
            warnings: validation.warnings,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update subagent',
        }, 500);
    }
});


/**
 * DELETE /api/subagents/:id
 * Delete a subagent
 */
subagentRoutes.delete('/:id', async (c: Context) => {
    try {
        const id = c.req.param('id');

        const deleted = await subagentRegistry.delete(id);

        if (!deleted) {
            return c.json({
                success: false,
                error: `Subagent '${id}' not found or cannot be deleted`,
            }, 404);
        }

        return c.json({
            success: true,
            message: `Subagent '${id}' deleted`,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete subagent',
        }, 500);
    }
});

// ===========================
// Validation & Testing
// ===========================

/**
 * POST /api/subagents/validate
 * Validate a subagent configuration
 */
subagentRoutes.post('/validate', async (c: Context) => {
    try {
        const config = await c.req.json<SubagentConfig>();

        const validation = SubagentFactory.validateWithPermissions(config);

        return c.json({
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed',
        }, 500);
    }
});

/**
 * POST /api/subagents/suggest-tools
 * Get AI-powered tool suggestions
 */
subagentRoutes.post('/suggest-tools', async (c: Context) => {
    try {
        const { description } = await c.req.json<{ description: string }>();

        if (!description || typeof description !== 'string') {
            return c.json({
                success: false,
                error: 'Description is required',
            }, 400);
        }

        const suggestions = SubagentFactory.suggestTools(description);

        return c.json({
            success: true,
            ...suggestions,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to suggest tools',
        }, 500);
    }
});

/**
 * POST /api/subagents/:id/test
 * Test that a subagent can be created
 */
subagentRoutes.post('/:id/test', (c: Context) => {
    try {
        const id = c.req.param('id');
        const agent = subagentRegistry.get(id);

        if (!agent) {
            return c.json({
                success: false,
                error: `Subagent '${id}' not found`,
            }, 404);
        }

        const testResult = SubagentFactory.test(agent);

        return c.json(testResult);
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Test failed',
        }, 500);
    }
});

/**
 * POST /api/subagents/:id/execute
 * Execute a task with a specific subagent
 */
subagentRoutes.post('/:id/execute', async (c: Context) => {
    try {
        const id = c.req.param('id');
        const { task, workspace, apiKey } = await c.req.json<{ task: string; workspace?: string; apiKey?: string }>();

        if (!task) {
            return c.json({
                success: false,
                error: 'Task is required',
            }, 400);
        }

        // Set API key in environment if provided (needed for AgentKit model providers)
        if (apiKey) {
            process.env.GEMINI_API_KEY = apiKey;
            console.log('[Subagent Execute] API key set from request');
        } else if (!process.env.GEMINI_API_KEY) {
            return c.json({
                success: false,
                error: 'API key is required. Please configure your Gemini API key in settings.',
            }, 400);
        }

        const agent = subagentRegistry.get(id);

        if (!agent) {
            return c.json({
                success: false,
                error: `Subagent '${id}' not found`,
            }, 404);
        }

        if (!agent.enabled) {
            return c.json({
                success: false,
                error: `Subagent '${id}' is disabled`,
            }, 400);
        }

        // CRITICAL: Set workspace path for tool bridge BEFORE executing
        // Without this, tools like read_file, list_dir, etc. will fail
        if (workspace) {
            console.log(`[Subagent Execute] Setting workspace path: ${workspace}`);
            setWorkspacePath(workspace);
        } else {
            console.warn('[Subagent Execute] No workspace provided - tools may fail');
        }

        // Create and run the subagent with isolated execution
        const executor = new SubagentExecutor(agent);
        console.log(`[Subagent Execute] Starting isolated execution for agent '${agent.name}' (${id})`);

        const result = await executor.execute(task, {
            timeoutMs: 60000,
            includeToolCalls: true,
        });

        console.log('[Subagent Execute] Raw result summary:', {
            success: result.success,
            outputLength: result.output?.length || 0,
            hasError: !!result.error
        });

        // Increment usage count
        await subagentRegistry.incrementUsage(id);

        // Check if execution was successful
        if (!result.success) {
            console.error('[Subagent Execute] Execution failed:', result.error);
            return c.json({
                success: false,
                error: result.error || 'Subagent execution failed',
            }, 500);
        }

        console.log('[Subagent Execute] Completed for', agent.name);
        console.log('[Subagent Execute] Output length:', result.output.length);
        console.log('[Subagent Execute] Execution time:', result.executionTimeMs, 'ms');

        return c.json({
            success: true,
            agentId: id,
            agentName: agent.name,
            output: result.output,
            model: agent.model,
            executionTimeMs: result.executionTimeMs,
            toolCalls: result.toolCalls,
        });
    } catch (error) {
        console.error('[Subagent Execute] Error:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Execution failed',
        }, 500);
    }
});

// ===========================
// Analytics & Usage
// ===========================

/**
 * GET /api/subagents/:id/usage
 * Get usage statistics for a subagent
 */
subagentRoutes.get('/:id/usage', (c: Context) => {
    try {
        const id = c.req.param('id');

        const stats = toolPermissionManager.getUsageStats(id);

        return c.json({
            success: true,
            agentId: id,
            ...stats,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get usage stats',
        }, 500);
    }
});

/**
 * GET /api/subagents/analytics/violations
 * Get all agents with tool violations
 */
subagentRoutes.get('/analytics/violations', (c: Context) => {
    try {
        const violations = toolPermissionManager.getViolations();

        return c.json({
            success: true,
            violations,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get violations',
        }, 500);
    }
});

/**
 * POST /api/subagents/reload
 * Reload all subagents from disk
 */
subagentRoutes.post('/reload', async (c: Context) => {
    try {
        const result = await subagentRegistry.loadAll();

        return c.json({
            success: true,
            count: result.count,
            errors: result.errors,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reload subagents',
        }, 500);
    }
});

export default subagentRoutes;
