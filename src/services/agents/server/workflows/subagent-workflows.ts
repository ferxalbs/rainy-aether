/**
 * Subagent Inngest Workflows
 * 
 * Durable workflows for subagent operations:
 * - Reload agents dynamically
 * - Execute agents with proper routing
 * - Create/update agents asynchronously
 */

import { inngestAgentKit } from './inngest';
import { subagentRegistry } from '../registry/SubagentRegistry';
import { SubagentFactory } from '../factory/SubagentFactory';
import { toolPermissionManager } from '../tools/ToolPermissionManager';

// ===========================
// Subagent Reload Workflow
// ===========================

/**
 * Reload all subagents from disk
 * Triggered when agents are created/updated/deleted
 */
export const reloadSubagentsWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-subagent-reload',
        retriesAtMost: 1,
    },
    { event: 'agentkit/subagent.reload' },
    async ({ event, step }) => {
        const { reason, agentId } = event.data;

        await step.run('reload-agents', async () => {
            console.log(`[SubagentReload] Reloading agents. Reason: ${reason}`);

            const result = await subagentRegistry.loadAll();

            console.log(`[SubagentReload] Loaded ${result.count} agents`);
            if (result.errors.length > 0) {
                console.error(`[SubagentReload] Errors:`, result.errors);
            }

            return {
                count: result.count,
                errors: result.errors,
                reason,
                agentId,
            };
        });
    }
);

// ===========================
// Subagent Execution Workflow
// ===========================

/**
 * Execute a task with a specific subagent
 * Tracks usage and handles errors
 */
export const executeSubagentWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-subagent-execute',
        retries: 2,
    },
    { event: 'agentkit/subagent.execute' },
    async ({ event, step }) => {
        const { agentId, task, workspace } = event.data;

        // Step 1: Validate agent exists
        const config = await step.run('validate-agent', async () => {
            const agent = subagentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Subagent '${agentId}' not found`);
            }
            if (!agent.enabled) {
                throw new Error(`Subagent '${agentId}' is disabled`);
            }
            return agent;
        });

        // Step 2: Create and execute agent
        const result = await step.run('execute-agent', async () => {
            try {
                // Create agent instance
                const agent = SubagentFactory.create(config);

                // Execute task
                const response = await agent.run(task);

                // Extract output
                let output = '';
                for (const msg of response.output) {
                    if (msg.type === 'text') {
                        const textMsg = msg as { type: 'text'; content: string | unknown[] };
                        if (typeof textMsg.content === 'string') {
                            output += textMsg.content;
                        }
                    }
                }

                // Extract tool calls
                const toolsUsed: string[] = [];
                for (const tc of response.toolCalls) {
                    if (tc.tool) {
                        toolsUsed.push(tc.tool.name);

                        // Record tool usage
                        const permission = toolPermissionManager.checkPermission(config, tc.tool.name);
                        toolPermissionManager.recordUsage(agentId, tc.tool.name, permission.allowed);
                    }
                }

                return {
                    success: true,
                    output: output.trim(),
                    toolsUsed,
                };
            } catch (error) {
                return {
                    success: false,
                    output: '',
                    toolsUsed: [],
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });

        // Step 3: Update analytics
        await step.run('update-analytics', async () => {
            // Increment usage counter
            await subagentRegistry.incrementUsage(agentId);

            // Update success rate
            const currentSuccessRate = config.successRate || 0.5;
            const newSuccessRate = result.success
                ? currentSuccessRate * 0.95 + 0.05 // Slowly increase
                : currentSuccessRate * 0.95; // Slowly decrease

            await subagentRegistry.updateSuccessRate(agentId, newSuccessRate);
        });

        return result;
    }
);

// ===========================
// Subagent Creation Workflow
// ===========================

/**
 * Create a new subagent asynchronously
 * Validates, creates, and reloads
 */
export const createSubagentWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-subagent-create',
        retries: 2,
    },
    { event: 'agentkit/subagent.create' },
    async ({ event, step }) => {
        const { config } = event.data;

        // Step 1: Validate configuration
        await step.run('validate-config', async () => {
            const validation = SubagentFactory.validateWithPermissions(config);
            if (!validation.valid) {
                throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
            }
            return validation;
        });

        // Step 2: Create agent
        const agent = await step.run('create-agent', async () => {
            return await subagentRegistry.create(config);
        });

        // Step 3: Reload registry
        await step.run('reload-registry', async () => {
            await inngestAgentKit.send({
                name: 'agentkit/subagent.reload',
                data: { reason: 'agent_created', agentId: agent.id },
            });
        });

        return agent;
    }
);

// ===========================
// Subagent Update Workflow
// ===========================

/**
 * Update an existing subagent asynchronously
 * Validates, updates, and reloads
 */
export const updateSubagentWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-subagent-update',
        retries: 2,
    },
    { event: 'agentkit/subagent.update' },
    async ({ event, step }) => {
        const { id, updates } = event.data;

        // Step 1: Validate agent exists
        const existing = await step.run('validate-exists', async () => {
            const agent = subagentRegistry.get(id);
            if (!agent) {
                throw new Error(`Subagent '${id}' not found`);
            }
            return agent;
        });

        // Step 2: Validate updated configuration
        await step.run('validate-updates', async () => {
            const merged = { ...existing, ...updates };
            const validation = SubagentFactory.validateWithPermissions(merged);
            if (!validation.valid) {
                throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
            }
            return validation;
        });

        // Step 3: Update agent
        const agent = await step.run('update-agent', async () => {
            return await subagentRegistry.update({ id, ...updates });
        });

        // Step 4: Reload registry
        await step.run('reload-registry', async () => {
            await inngestAgentKit.send({
                name: 'agentkit/subagent.reload',
                data: { reason: 'agent_updated', agentId: id },
            });
        });

        return agent;
    }
);

// ===========================
// Subagent Deletion Workflow
// ===========================

/**
 * Delete a subagent asynchronously
 * Removes, clears analytics, and reloads
 */
export const deleteSubagentWorkflow = inngestAgentKit.createFunction(
    {
        id: 'agentkit-subagent-delete',
        retries: 2,
    },
    { event: 'agentkit/subagent.delete' },
    async ({ event, step }) => {
        const { id } = event.data;

        // Step 1: Delete agent
        const deleted = await step.run('delete-agent', async () => {
            return await subagentRegistry.delete(id);
        });

        if (!deleted) {
            throw new Error(`Failed to delete subagent '${id}'`);
        }

        // Step 2: Clear analytics
        await step.run('clear-analytics', async () => {
            toolPermissionManager.clearHistory(id);
        });

        // Step 3: Reload registry
        await step.run('reload-registry', async () => {
            await inngestAgentKit.send({
                name: 'agentkit/subagent.reload',
                data: { reason: 'agent_deleted', agentId: id },
            });
        });

        return { success: true, agentId: id };
    }
);

// ===========================
// Export All Workflows
// ===========================

export const subagentWorkflows = [
    reloadSubagentsWorkflow,
    executeSubagentWorkflow,
    createSubagentWorkflow,
    updateSubagentWorkflow,
    deleteSubagentWorkflow,
];
