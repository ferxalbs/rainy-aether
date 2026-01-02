/**
 * Inngest Workflows
 * 
 * Durable workflows for long-running tasks with:
 * - Automatic retries on failure
 * - Checkpointing between steps
 * - Event-driven progress updates
 */

import { Inngest, EventSchemas } from 'inngest';
import { createConfiguredExecutor, setWorkspacePath, createToolCall } from '../tools';
import { router, AgentType, getAgentTypes } from '../agents';

// ===========================
// Event Types
// ===========================

type BrainEvents = {
    // Task execution
    'brain/task.execute': {
        data: {
            taskId: string;
            task: string;
            workspace: string;
            agentType?: AgentType;
            currentFile?: string;
        };
    };
    'brain/task.progress': {
        data: {
            taskId: string;
            step: number;
            total: number;
            message: string;
        };
    };
    'brain/task.completed': {
        data: {
            taskId: string;
            output: string;
            toolsUsed: string[];
            filesModified: string[];
            agentsUsed: string[];
        };
    };
    'brain/task.failed': {
        data: {
            taskId: string;
            error: string;
        };
    };

    // Project creation
    'brain/project.create': {
        data: {
            projectId: string;
            name: string;
            template: 'react' | 'next' | 'vite' | 'tauri' | 'rust';
            path: string;
            options?: Record<string, unknown>;
        };
    };
    'brain/project.completed': {
        data: {
            projectId: string;
            path: string;
        };
    };

    // Codebase indexing
    'brain/codebase.index': {
        data: {
            indexId: string;
            path: string;
            options?: {
                includeNodeModules?: boolean;
                maxDepth?: number;
            };
        };
    };
};

// ===========================
// Inngest Client
// ===========================

export const inngest = new Inngest({
    id: 'rainy-brain',
    schemas: new EventSchemas().fromRecord<BrainEvents>(),
});

// ===========================
// Execute Task Workflow
// ===========================

export const executeTaskWorkflow = inngest.createFunction(
    {
        id: 'execute-task',
        retries: 2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onFailure: async ({ event, error }: { event: any; error: any }) => {
            const taskId = event.data?.taskId || 'unknown';
            console.error(`[Workflow] Task ${taskId} failed:`, error.message);
            await inngest.send({
                name: 'brain/task.failed',
                data: { taskId, error: error.message },
            });
        },
    },
    { event: 'brain/task.execute' },
    async ({ event, step }) => {
        const { taskId, task, workspace, agentType, currentFile } = event.data;

        // Step 1: Setup workspace
        await step.run('setup-workspace', async () => {
            setWorkspacePath(workspace);
            console.log(`[Workflow] Task ${taskId}: Setting up workspace ${workspace}`);
            return { workspace };
        });

        // Step 2: Initialize router
        await step.run('init-router', async () => {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY not configured');
            }
            await router.initialize(apiKey);
            return { initialized: true };
        });

        // Step 3: Route and execute
        const result = await step.run('execute-with-agent', async () => {
            const preferredAgent = agentType && getAgentTypes().includes(agentType)
                ? agentType
                : undefined;

            const execResult = await router.execute(
                {
                    workspace,
                    task,
                    files: currentFile ? [currentFile] : undefined,
                },
                preferredAgent
            );

            return {
                success: execResult.success,
                output: execResult.output,
                toolsUsed: execResult.toolsUsed,
                filesModified: execResult.filesModified,
                agentsUsed: execResult.agentsUsed,
                error: execResult.error,
            };
        });

        // Step 4: Send completion event
        await step.run('send-completion', async () => {
            if (result.success) {
                await inngest.send({
                    name: 'brain/task.completed',
                    data: {
                        taskId,
                        output: result.output,
                        toolsUsed: result.toolsUsed,
                        filesModified: result.filesModified,
                        agentsUsed: result.agentsUsed,
                    },
                });
            } else {
                await inngest.send({
                    name: 'brain/task.failed',
                    data: { taskId, error: result.error || 'Unknown error' },
                });
            }
        });

        return result;
    }
);

// ===========================
// Create Project Workflow
// ===========================

export const createProjectWorkflow = inngest.createFunction(
    {
        id: 'create-project',
        retries: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onFailure: async ({ event, error }: { event: any; error: any }) => {
            const projectId = event.data?.projectId || 'unknown';
            console.error(`[Workflow] Project ${projectId} creation failed:`, error.message);
        },
    },
    { event: 'brain/project.create' },
    async ({ event, step }) => {
        const { projectId, name: _name, template, path: projectPath, options: _options } = event.data;

        // Step 1: Create project directory
        await step.run('create-directory', async () => {
            const executor = createConfiguredExecutor(projectPath);
            await executor.execute(createToolCall('run_command', {
                command: `mkdir -p "${projectPath}"`,
            }));
            return { created: true };
        });

        // Step 2: Initialize project based on template
        await step.run('init-project', async () => {
            const executor = createConfiguredExecutor(projectPath);

            let initCommand = '';
            switch (template) {
                case 'react':
                    initCommand = `npx create-react-app . --template typescript`;
                    break;
                case 'next':
                    initCommand = `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`;
                    break;
                case 'vite':
                    initCommand = `npm create vite@latest . -- --template react-ts`;
                    break;
                case 'tauri':
                    initCommand = `npm create tauri-app@latest . -- --manager pnpm --template react-ts`;
                    break;
                case 'rust':
                    initCommand = `cargo init .`;
                    break;
                default:
                    throw new Error(`Unknown template: ${template}`);
            }

            const result = await executor.execute(createToolCall('run_command', {
                command: initCommand,
                cwd: projectPath,
                timeout: 300000, // 5 minutes
            }));

            return result.result;
        });

        // Step 3: Install dependencies
        await step.run('install-deps', async () => {
            if (template === 'rust') {
                return { skipped: true };
            }

            const executor = createConfiguredExecutor(projectPath);
            const result = await executor.execute(createToolCall('run_command', {
                command: 'pnpm install',
                cwd: projectPath,
                timeout: 300000,
            }));

            return result.result;
        });

        // Step 4: Send completion event
        await step.run('complete', async () => {
            await inngest.send({
                name: 'brain/project.completed',
                data: { projectId, path: projectPath },
            });
        });

        return {
            projectId,
            path: projectPath,
            template,
            success: true,
        };
    }
);

// ===========================
// Codebase Indexing Workflow
// ===========================

export const indexCodebaseWorkflow = inngest.createFunction(
    {
        id: 'index-codebase',
        retries: 2,
    },
    { event: 'brain/codebase.index' },
    async ({ event, step }) => {
        const { indexId, path: codebasePath, options } = event.data;
        const maxDepth = options?.maxDepth || 5;

        // Step 1: Scan directory structure
        const structure = await step.run('scan-structure', async () => {
            const executor = createConfiguredExecutor(codebasePath);
            const result = await executor.execute(createToolCall('read_directory_tree', {
                path: '.',
                max_depth: maxDepth,
            }));
            return result.result;
        });

        // Step 2: Find key files
        const keyFiles = await step.run('find-key-files', async () => {
            const executor = createConfiguredExecutor(codebasePath);
            const files: string[] = [];

            // Search for config files
            const configPatterns = [
                'package.json', 'tsconfig.json', 'Cargo.toml',
                'README.md', '.env.example',
            ];

            for (const pattern of configPatterns) {
                const result = await executor.execute(createToolCall('search_code', {
                    query: pattern,
                    file_pattern: pattern,
                    max_results: 5,
                }));
                // Handle dynamic result data
                const data = result.result?.data as { results?: Array<{ file: string }> } | undefined;
                if (data?.results) {
                    files.push(...data.results.map((r) => r.file));
                }
            }

            return { files: [...new Set(files)] };
        }) as { files: string[] };

        // Step 3: Analyze imports
        const imports = await step.run('analyze-imports', async () => {
            const executor = createConfiguredExecutor(codebasePath);
            const allImports: Record<string, string[]> = {};

            // Analyze main entry files
            const entryFiles = ['src/index.ts', 'src/main.ts', 'src/App.tsx', 'src/lib.rs'];

            for (const file of entryFiles) {
                try {
                    const result = await executor.execute(createToolCall('analyze_imports', { path: file }));
                    if (result.result?.success) {
                        // Handle dynamic result data with type assertion
                        const data = result.result.data as { imports?: string[] } | undefined;
                        allImports[file] = data?.imports || [];
                    }
                } catch {
                    // File doesn't exist, skip
                }
            }

            return { imports: allImports };
        }) as { imports: Record<string, string[]> };

        return {
            indexId,
            path: codebasePath,
            structure,
            keyFiles: keyFiles.files,
            imports: imports.imports,
        };
    }
);

// ===========================
// Export all workflows
// ===========================

// Import AgentKit workflows
import { agentKitWorkflows, inngestAgentKit } from './agentkit';

export const allWorkflows = [
    executeTaskWorkflow,
    createProjectWorkflow,
    indexCodebaseWorkflow,
    ...agentKitWorkflows,
];

// Re-export AgentKit client for use elsewhere
export { inngestAgentKit };
