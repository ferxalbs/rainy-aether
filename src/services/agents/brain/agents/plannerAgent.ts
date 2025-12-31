/**
 * Planner Agent
 * 
 * Analyzes tasks and creates execution plans stored in network state.
 * This agent is typically called first to:
 * 1. Load project context into network state
 * 2. Generate an execution plan for complex tasks
 * 3. Coordinate handoffs between other agents
 */

import { createAgent, createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import type { NetworkState, ExecutionPlan, WorkspaceContext } from '../types';

// ===========================
// Planning Tools
// ===========================

/**
 * Tool to load project context into network state
 */
const loadContextTool = createTool({
    name: 'load_project_context',
    description: `Load project context into memory for efficient access.
    
WHEN TO USE: At the start of any new task to understand the project.
EFFECT: Populates network state with workspace info, avoiding repeated lookups.
RETURNS: Summary of loaded context.`,
    parameters: z.object({
        include: z.array(z.enum(['structure', 'dependencies', 'git', 'readme'])).optional()
            .describe('What to include. Default: all'),
    }),
    handler: async ({ include: _include }, { network }) => {
        if (!network) {
            return { error: 'No network context available' };
        }

        const state = network.state.data as NetworkState;
        const workspace = state.context.workspace;

        try {
            // Dynamic import to avoid bundling issues
            const { invoke } = await import('@tauri-apps/api/core');

            // Load workspace info
            const workspaceInfo: WorkspaceContext = {
                path: workspace,
                name: workspace.split('/').pop() || 'workspace',
                projectType: 'unknown',
                entryPoints: [],
                configFiles: [],
            };

            // Detect project type from config files
            try {
                const entries = await invoke<Array<{ name: string; isDirectory: boolean }>>('list_dir', { path: workspace });

                for (const entry of entries) {
                    if (entry.name === 'package.json') {
                        workspaceInfo.projectType = 'npm';
                        workspaceInfo.configFiles.push('package.json');
                    } else if (entry.name === 'Cargo.toml') {
                        workspaceInfo.projectType = 'cargo';
                        workspaceInfo.configFiles.push('Cargo.toml');
                    } else if (entry.name === 'requirements.txt' || entry.name === 'pyproject.toml') {
                        workspaceInfo.projectType = 'python';
                        workspaceInfo.configFiles.push(entry.name);
                    } else if (entry.name === 'tsconfig.json') {
                        workspaceInfo.configFiles.push('tsconfig.json');
                    } else if (entry.name === 'README.md') {
                        workspaceInfo.configFiles.push('README.md');
                    }
                }

                // Detect entry points based on project type
                if (workspaceInfo.projectType === 'npm') {
                    const possibleEntries = ['src/index.ts', 'src/main.ts', 'src/App.tsx', 'index.ts', 'index.js'];
                    for (const entry of possibleEntries) {
                        try {
                            await invoke('read_text_file', { path: `${workspace}/${entry}` });
                            workspaceInfo.entryPoints.push(entry);
                        } catch {
                            // File doesn't exist
                        }
                    }
                }
            } catch (err) {
                console.warn('[Planner] Failed to list workspace:', err);
            }

            // Store in network state
            state.workspaceInfo = workspaceInfo;
            state.flags.contextLoaded = true;

            console.log(`[Planner] Loaded context: ${workspaceInfo.projectType} project with ${workspaceInfo.configFiles.length} config files`);

            return {
                success: true,
                projectType: workspaceInfo.projectType,
                configFiles: workspaceInfo.configFiles,
                entryPoints: workspaceInfo.entryPoints,
            };
        } catch (error) {
            console.error('[Planner] Failed to load context:', error);
            state.flags.contextLoaded = true; // Mark as loaded to avoid infinite loop
            return { error: String(error) };
        }
    },
});

/**
 * Tool to create an execution plan
 */
const createPlanTool = createTool({
    name: 'create_execution_plan',
    description: `Create a multi-step execution plan for complex tasks.
    
WHEN TO USE: For tasks requiring multiple agents or ordered steps.
EFFECT: Stores plan in network state, router will execute steps in order.
AGENTS AVAILABLE: 'Code Assistant', 'Code Reviewer', 'Documentation Writer'`,
    parameters: z.object({
        steps: z.array(z.object({
            agent: z.string().describe("Agent name: 'Code Assistant', 'Code Reviewer', or 'Documentation Writer'"),
            action: z.string().describe('Description of what this step should accomplish'),
        })).describe('Ordered list of execution steps'),
        reasoning: z.string().optional().describe('Brief explanation of why this plan was chosen'),
    }),
    handler: async ({ steps, reasoning }, { network }) => {
        if (!network) {
            return { error: 'No network context available' };
        }

        const state = network.state.data as NetworkState;

        const plan: ExecutionPlan = {
            steps: steps.map(s => ({
                agent: s.agent,
                action: s.action,
                status: 'pending',
            })),
            currentIndex: 0,
            totalSteps: steps.length,
            startedAt: Date.now(),
        };

        state.plan = plan;
        state.flags.planGenerated = true;

        console.log(`[Planner] Created plan with ${steps.length} steps`);
        if (reasoning) {
            console.log(`[Planner] Reasoning: ${reasoning}`);
        }

        return {
            success: true,
            planId: `plan_${plan.startedAt}`,
            steps: plan.steps.map((s, i) => `${i + 1}. ${s.agent}: ${s.action}`),
            message: 'Plan created and ready for execution',
        };
    },
});

/**
 * Tool to mark planning complete without a formal plan
 */
const skipPlanningTool = createTool({
    name: 'skip_planning',
    description: `Skip formal planning for simple, single-step tasks.
    
WHEN TO USE: For straightforward tasks that don't need multi-step coordination.
EFFECT: Marks context as loaded and passes control to Code Assistant.`,
    parameters: z.object({
        reason: z.string().describe('Brief reason why planning is not needed'),
    }),
    handler: async ({ reason }, { network }) => {
        if (!network) {
            return { error: 'No network context available' };
        }

        const state = network.state.data as NetworkState;

        state.flags.contextLoaded = true;
        state.flags.planGenerated = true; // No plan needed

        console.log(`[Planner] Skipping planning: ${reason}`);

        return {
            success: true,
            message: 'Planning skipped, proceeding to execution',
            nextAgent: 'Code Assistant',
        };
    },
});

// ===========================
// Planner Agent
// ===========================

export const plannerAgent = createAgent({
    name: 'Planner',
    description: 'Analyzes tasks, loads project context, and creates execution plans for complex operations.',

    system: `You are a task planning agent for Rainy Aether IDE.

## Your Role
1. **Analyze** the user's request to understand what needs to be done
2. **Load context** about the project using load_project_context
3. **Decide** if this task needs a multi-step plan or can be handled directly

## When to Create a Plan
Create a plan for:
- Multi-file refactoring tasks
- Feature implementations touching multiple components
- Tasks requiring both code changes AND documentation
- Complex debugging requiring investigation then fixes

## When to Skip Planning
Skip planning for:
- Simple file edits (single function changes)
- Direct questions about code
- Single-step operations (read, search, run command)

## Available Agents for Plans
- 'Code Assistant' - Writing, editing, and modifying code
- 'Code Reviewer' - Analyzing code quality and reviewing changes
- 'Documentation Writer' - Creating docs and explanations

## Guidelines
1. Always call load_project_context first to understand the workspace
2. Keep plans focused - 2-4 steps for most tasks
3. If the task is simple, use skip_planning to hand off immediately
4. Include clear action descriptions so agents know their goal`,

    tools: [
        loadContextTool,
        createPlanTool,
        skipPlanningTool,
    ],

    lifecycle: {
        // Called before the agent runs
        onStart: async ({ prompt, history, network }) => {
            // Add current context to the prompt
            const state = network?.state.data as NetworkState | undefined;

            if (state?.workspaceInfo) {
                prompt.push({
                    type: 'text' as const,
                    role: 'system' as const,
                    content: `Current Project Context:
- Path: ${state.workspaceInfo.path}
- Type: ${state.workspaceInfo.projectType}
- Config Files: ${state.workspaceInfo.configFiles.join(', ') || 'none loaded'}
- Entry Points: ${state.workspaceInfo.entryPoints.join(', ') || 'not detected'}`,
                });
            }

            return { prompt, history: history || [], stop: false };
        },

        // Called after the agent completes
        onFinish: async ({ result, network }) => {
            const state = network?.state.data as NetworkState | undefined;

            if (state) {
                state.lastAgent = 'Planner';
                const firstOutput = result.output?.[0];
                state.lastAgentOutput = firstOutput && 'content' in firstOutput
                    ? String(firstOutput.content)
                    : '';
            }

            return result;
        },
    },
});

export default plannerAgent;
