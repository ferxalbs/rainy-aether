/**
 * Subagent Management API Routes
 * 
 * Express routes for managing subagents via HTTP.
 * Provides CRUD operations, validation, and analytics.
 */

import { Router } from 'express';
import { subagentRegistry } from '../registry/SubagentRegistry';
import { SubagentFactory } from '../factory/SubagentFactory';
import { toolPermissionManager } from '../tools/ToolPermissionManager';
import { inngestAgentKit } from '../workflows/inngest';
import type {
    SubagentConfig,
    CreateSubagentConfig,
    UpdateSubagentConfig,
} from '../types/SubagentConfig';

const router = Router();

// ===========================
// List & Get Operations
// ===========================

/**
 * GET /api/subagents
 * List all subagents with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { scope, enabled, tag, search } = req.query;

        let agents = subagentRegistry.getAll();

        // Filter by scope
        if (scope && typeof scope === 'string') {
            agents = agents.filter(a => a.scope === scope);
        }

        // Filter by enabled status
        if (enabled !== undefined) {
            const isEnabled = enabled === 'true';
            agents = agents.filter(a => a.enabled === isEnabled);
        }

        // Filter by tag
        if (tag && typeof tag === 'string') {
            agents = subagentRegistry.findByTag(tag);
        }

        // Search by query
        if (search && typeof search === 'string') {
            agents = subagentRegistry.search(search);
        }

        res.json({
            success: true,
            count: agents.length,
            agents,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list subagents',
        });
    }
});

/**
 * GET /api/subagents/stats
 * Get registry statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = subagentRegistry.getStats();

        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get stats',
        });
    }
});

/**
 * GET /api/subagents/:id
 * Get a specific subagent
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = subagentRegistry.get(id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: `Subagent '${id}' not found`,
            });
        }

        // Get tool stats
        const toolStats = SubagentFactory.getToolStats(agent);

        // Get usage stats
        const usageStats = toolPermissionManager.getUsageStats(id);

        res.json({
            success: true,
            agent,
            toolStats,
            usageStats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get subagent',
        });
    }
});

// ===========================
// Create & Update Operations
// ===========================

/**
 * POST /api/subagents
 * Create a new subagent
 */
router.post('/', async (req, res) => {
    try {
        const config: CreateSubagentConfig = req.body;

        // Validate with permissions
        const validation = SubagentFactory.validateWithPermissions(config as SubagentConfig);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
            });
        }

        // Create agent
        const agent = await subagentRegistry.create(config);

        // Trigger reload workflow
        await inngestAgentKit.send({
            name: 'agentkit/subagent.reload',
            data: { reason: 'agent_created', agentId: agent.id },
        });

        res.status(201).json({
            success: true,
            agent,
            warnings: validation.warnings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create subagent',
        });
    }
});

/**
 * PUT /api/subagents/:id
 * Update an existing subagent
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates: UpdateSubagentConfig = { ...req.body, id };

        // Validate
        const agent = subagentRegistry.get(id);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: `Subagent '${id}' not found`,
            });
        }

        // Merge and validate
        const merged = { ...agent, ...updates };
        const validation = SubagentFactory.validateWithPermissions(merged);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
            });
        }

        // Update
        const updated = await subagentRegistry.update(updates);

        // Trigger reload
        await inngestAgentKit.send({
            name: 'agentkit/subagent.reload',
            data: { reason: 'agent_updated', agentId: id },
        });

        res.json({
            success: true,
            agent: updated,
            warnings: validation.warnings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update subagent',
        });
    }
});

/**
 * DELETE /api/subagents/:id
 * Delete a subagent
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await subagentRegistry.delete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: `Subagent '${id}' not found or cannot be deleted`,
            });
        }

        // Trigger reload
        await inngestAgentKit.send({
            name: 'agentkit/subagent.reload',
            data: { reason: 'agent_deleted', agentId: id },
        });

        res.json({
            success: true,
            message: `Subagent '${id}' deleted`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete subagent',
        });
    }
});

// ===========================
// Validation & Testing
// ===========================

/**
 * POST /api/subagents/validate
 * Validate a subagent configuration
 */
router.post('/validate', async (req, res) => {
    try {
        const config: SubagentConfig = req.body;

        const validation = SubagentFactory.validateWithPermissions(config);

        res.json({
            success: validation.valid,
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed',
        });
    }
});

/**
 * POST /api/subagents/suggest-tools
 * Get AI-powered tool suggestions
 */
router.post('/suggest-tools', async (req, res) => {
    try {
        const { description } = req.body;

        if (!description || typeof description !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Description is required',
            });
        }

        const suggestions = SubagentFactory.suggestTools(description);

        res.json({
            success: true,
            ...suggestions,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to suggest tools',
        });
    }
});

/**
 * POST /api/subagents/:id/test
 * Test that a subagent can be created
 */
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = subagentRegistry.get(id);

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: `Subagent '${id}' not found`,
            });
        }

        const testResult = SubagentFactory.test(agent);

        res.json({
            success: testResult.success,
            ...testResult,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Test failed',
        });
    }
});

// ===========================
// Analytics & Usage
// ===========================

/**
 * GET /api/subagents/:id/usage
 * Get usage statistics for a subagent
 */
router.get('/:id/usage', async (req, res) => {
    try {
        const { id } = req.params;

        const stats = toolPermissionManager.getUsageStats(id);

        res.json({
            success: true,
            agentId: id,
            ...stats,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get usage stats',
        });
    }
});

/**
 * GET /api/subagents/violations
 * Get all agents with tool violations
 */
router.get('/analytics/violations', async (req, res) => {
    try {
        const violations = toolPermissionManager.getViolations();

        res.json({
            success: true,
            violations,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get violations',
        });
    }
});

/**
 * POST /api/subagents/reload
 * Reload all subagents from disk
 */
router.post('/reload', async (req, res) => {
    try {
        const result = await subagentRegistry.loadAll();

        // Trigger reload workflow
        await inngestAgentKit.send({
            name: 'agentkit/subagent.reload',
            data: { reason: 'manual_reload' },
        });

        res.json({
            success: true,
            count: result.count,
            errors: result.errors,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reload subagents',
        });
    }
});

export default router;
