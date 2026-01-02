/**
 * AgentKit Tools
 * 
 * Converts existing tool definitions to @inngest/agent-kit createTool format.
 * Uses Zod for parameter validation and provides durability via step functions.
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import { createConfiguredExecutor } from './bridge';
import { createToolCall } from './executor';
import type { ToolResult } from './schema';

// ===========================
// Helper Types
// ===========================

type ToolContext = {
    step?: {
        run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
};

// Helper to execute tool with optional step durability
async function executeWithStep(
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
    workspacePath?: string
): Promise<ToolResult> {
    const executor = createConfiguredExecutor(workspacePath);
    const call = createToolCall(toolName, args);

    if (ctx.step) {
        return ctx.step.run(`execute-${toolName}`, async () => {
            const execution = await executor.execute(call);
            return execution.result || { success: false, error: 'No result' };
        });
    }

    const execution = await executor.execute(call);
    return execution.result || { success: false, error: 'No result' };
}

// ===========================
// Read Tools
// ===========================

export const getWorkspaceInfoTool = createTool({
    name: 'get_workspace_info',
    description: `Get workspace metadata including path, name, and detected project type.
WHEN TO USE: Quick check of workspace location.
RETURNS: { path: string, name: string, projectType: 'npm'|'cargo'|'unknown' }`,
    parameters: z.object({
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('get_workspace_info', args, ctx as ToolContext);
    },
});

export const readFileTool = createTool({
    name: 'read_file',
    description: `Read a single file's complete contents.
WHEN TO USE: Reading one specific file when you know the exact path.
WHEN NOT TO USE: For reading 2+ files, use 'fs_batch_read' instead.
RETURNS: File content as string. Files >50KB are truncated.`,
    parameters: z.object({
        path: z.string().describe('Relative path to the file from workspace root'),
        encoding: z.string().optional().default('utf-8'),
        response_format: z.enum(['concise', 'detailed']).optional(),
        max_lines: z.number().optional(),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('read_file', args, ctx as ToolContext);
    },
});

export const listDirTool = createTool({
    name: 'list_dir',
    description: `List files and subdirectories in a path (one level only).
WHEN TO USE: Checking if specific files exist, exploring a single folder.
RETURNS: Array of { name, isDirectory, size } objects.`,
    parameters: z.object({
        path: z.string().describe('Relative path to directory (use "." for workspace root)'),
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('list_dir', args, ctx as ToolContext);
    },
});

export const readDirectoryTreeTool = createTool({
    name: 'read_directory_tree',
    description: `Get recursive directory structure as a nested tree.
WHEN TO USE: Understanding folder hierarchy, finding where files are located.
NOTE: Automatically ignores: node_modules, .git, dist, build, target.`,
    parameters: z.object({
        path: z.string().describe('Starting path (use "." for workspace root)'),
        max_depth: z.number().min(1).max(5).optional().default(3),
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('read_directory_tree', args, ctx as ToolContext);
    },
});

export const searchCodeTool = createTool({
    name: 'search_code',
    description: `Search for text/regex patterns across the codebase using grep.
WHEN TO USE: Finding where a function/variable/string is used.
TIP: Use file_pattern to narrow scope (e.g., "*.ts" for TypeScript only).
RETURNS: Array of { file, line, content } matches.`,
    parameters: z.object({
        query: z.string().describe('Search text or regex pattern'),
        file_pattern: z.string().optional().describe('Glob to filter files: "*.ts", "src/**/*.tsx"'),
        is_regex: z.boolean().optional().default(false),
        max_results: z.number().optional().default(50),
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('search_code', args, ctx as ToolContext);
    },
});

export const getProjectContextTool = createTool({
    name: 'get_project_context',
    description: `Get comprehensive project context: package.json, tsconfig, readme, directory structure.
WHEN TO USE: Starting a new task to understand the full project.
RETURNS: Combined analysis of project dependencies, configuration, and structure.`,
    parameters: z.object({
        include: z.array(z.string()).optional().default(['package', 'config', 'readme', 'structure']),
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('get_project_context', args, ctx as ToolContext);
    },
});

export const findSymbolsTool = createTool({
    name: 'find_symbols',
    description: `Find symbol definitions (functions, classes, types) in the codebase.
WHEN TO USE: Finding where a function/class is defined.
RETURNS: Array of { name, type, file, line } definitions.`,
    parameters: z.object({
        pattern: z.string().describe('Name pattern to search for'),
        file_pattern: z.string().optional().describe('Glob to filter files'),
        symbol_types: z.array(z.enum(['function', 'class', 'type', 'interface', 'const'])).optional(),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('find_symbols', args, ctx as ToolContext);
    },
});

// ===========================
// Write Tools
// ===========================

export const createFileTool = createTool({
    name: 'create_file',
    description: `Create a new file with optional initial content. Parent directories are created automatically.
WHEN TO USE: Creating brand new files.
ERRORS: Returns error if file already exists.`,
    parameters: z.object({
        path: z.string().describe('Relative path for new file'),
        content: z.string().optional().default(''),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('create_file', args, ctx as ToolContext);
    },
});

export const writeFileTool = createTool({
    name: 'write_file',
    description: `Write content to a file (creates or overwrites).
WHEN TO USE: Complete file rewrites or creating files that may already exist.
WARNING: Overwrites existing content entirely.`,
    parameters: z.object({
        path: z.string().describe('Relative path to file'),
        content: z.string().describe('Complete file content'),
        create_dirs: z.boolean().optional().default(true),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('write_file', args, ctx as ToolContext);
    },
});

export const editFileTool = createTool({
    name: 'edit_file',
    description: `Edit a file by replacing specific text.
WHEN TO USE: Making targeted changes to a file.
IMPORTANT: Always read the file first to understand the content.`,
    parameters: z.object({
        path: z.string().describe('File to edit'),
        find: z.string().describe('Text to find (must be unique in file)'),
        replace: z.string().describe('Replacement text'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('edit_file', args, ctx as ToolContext);
    },
});

export const deleteFileTool = createTool({
    name: 'delete_file',
    description: `Delete a file from the workspace.
WARNING: This action cannot be undone.`,
    parameters: z.object({
        path: z.string().describe('File to delete'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('delete_file', args, ctx as ToolContext);
    },
});

export const applyFileDiffTool = createTool({
    name: 'apply_file_diff',
    description: `Apply changes to a file using unified diff format.
PREFERRED: Shows visual diff preview before applying.
WHEN TO USE: Making multiple changes to a file in one operation.`,
    parameters: z.object({
        path: z.string().describe('File to edit'),
        diff: z.string().describe('Unified diff format changes'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('apply_file_diff', args, ctx as ToolContext);
    },
});

// ===========================
// Execute Tools
// ===========================

export const runCommandTool = createTool({
    name: 'run_command',
    description: `Run a shell command in the workspace.
SAFETY: Commands run in a sandboxed environment.
TIP: Use timeout to prevent long-running commands.`,
    parameters: z.object({
        command: z.string().describe('Command to execute'),
        cwd: z.string().optional().describe('Working directory (relative to workspace)'),
        timeout: z.number().optional().default(30000).describe('Max execution time in ms'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('run_command', args, ctx as ToolContext);
    },
});

export const runTestsTool = createTool({
    name: 'run_tests',
    description: `Run project tests (npm test, cargo test, etc).
RETURNS: Test results with pass/fail counts.`,
    parameters: z.object({
        pattern: z.string().optional().describe('Test file pattern'),
        watch: z.boolean().optional().default(false),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('run_tests', args, ctx as ToolContext);
    },
});

export const formatFileTool = createTool({
    name: 'format_file',
    description: `Format a file using prettier/rustfmt/etc.`,
    parameters: z.object({
        path: z.string().describe('File to format'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('format_file', args, ctx as ToolContext);
    },
});

// ===========================
// Git Tools
// ===========================

export const gitStatusTool = createTool({
    name: 'git_status',
    description: `Get current git status (changed files, branch, etc).`,
    parameters: z.object({
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('git_status', args, ctx as ToolContext);
    },
});

export const gitDiffTool = createTool({
    name: 'git_diff',
    description: `Get git diff for specific files or entire workspace.`,
    parameters: z.object({
        paths: z.array(z.string()).optional(),
        staged: z.boolean().optional().default(false),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('git_diff', args, ctx as ToolContext);
    },
});

export const gitAddTool = createTool({
    name: 'git_add',
    description: `Stage files for commit.`,
    parameters: z.object({
        paths: z.array(z.string()).describe('Files to stage'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('git_add', args, ctx as ToolContext);
    },
});

export const gitCommitTool = createTool({
    name: 'git_commit',
    description: `Create a git commit with staged changes.`,
    parameters: z.object({
        message: z.string().describe('Commit message'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('git_commit', args, ctx as ToolContext);
    },
});

// ===========================
// Analysis Tools
// ===========================

export const getDiagnosticsTool = createTool({
    name: 'get_diagnostics',
    description: `Get TypeScript/ESLint diagnostics for files.
RETURNS: Array of { file, line, message, severity } issues.`,
    parameters: z.object({
        paths: z.array(z.string()).optional().describe('Specific files to check'),
        severity: z.enum(['error', 'warning', 'all']).optional().default('all'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('get_diagnostics', args, ctx as ToolContext);
    },
});

export const analyzeImportsTool = createTool({
    name: 'analyze_imports',
    description: `Analyze imports and exports in a file.
RETURNS: { imports: [...], exports: [...] } with resolved paths.`,
    parameters: z.object({
        path: z.string().describe('File to analyze'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('analyze_imports', args, ctx as ToolContext);
    },
});

export const analyzeFileTool = createTool({
    name: 'analyze_file',
    description: `Get comprehensive analysis of a file: content, imports, exports, symbols, diagnostics.
WHEN TO USE: Before making changes to understand file structure.
BENEFITS: Avoids multiple tool calls (read_file + analyze_imports + get_diagnostics).`,
    parameters: z.object({
        path: z.string().describe('File to analyze'),
        include: z.array(z.string()).optional().default(['content', 'imports', 'exports', 'symbols', 'diagnostics']),
        response_format: z.enum(['concise', 'detailed']).optional().default('detailed'),
    }),
    handler: async (args, ctx) => {
        return executeWithStep('analyze_file', args, ctx as ToolContext);
    },
});

// ===========================
// Tool Collections
// ===========================

// All tools as array
export const allAgentKitTools = [
    // Read
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    readDirectoryTreeTool,
    searchCodeTool,
    getProjectContextTool,
    findSymbolsTool,
    // Write
    createFileTool,
    writeFileTool,
    editFileTool,
    deleteFileTool,
    applyFileDiffTool,
    // Execute
    runCommandTool,
    runTestsTool,
    formatFileTool,
    // Git
    gitStatusTool,
    gitDiffTool,
    gitAddTool,
    gitCommitTool,
    // Analysis
    getDiagnosticsTool,
    analyzeImportsTool,
    analyzeFileTool,
];

// Categorized tool collections for agents
export const readTools = [
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    readDirectoryTreeTool,
    searchCodeTool,
    getProjectContextTool,
    findSymbolsTool,
];

export const writeTools = [
    createFileTool,
    writeFileTool,
    editFileTool,
    deleteFileTool,
    applyFileDiffTool,
];

export const executeTools = [
    runCommandTool,
    runTestsTool,
    formatFileTool,
];

export const gitTools = [
    gitStatusTool,
    gitDiffTool,
    gitAddTool,
    gitCommitTool,
];

export const analysisTools = [
    getDiagnosticsTool,
    analyzeImportsTool,
    analyzeFileTool,
];

// Agent-specific tool sets
export const plannerTools = [
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    readDirectoryTreeTool,
    searchCodeTool,
    getProjectContextTool,
    findSymbolsTool,
];

export const coderTools = [
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    searchCodeTool,
    createFileTool,
    writeFileTool,
    editFileTool,
    applyFileDiffTool,
    deleteFileTool,
    formatFileTool,
];

export const reviewerTools = [
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    searchCodeTool,
    gitStatusTool,
    gitDiffTool,
    getDiagnosticsTool,
    analyzeImportsTool,
    analyzeFileTool,
];

export const terminalTools = [
    getWorkspaceInfoTool,
    runCommandTool,
    runTestsTool,
    gitStatusTool,
    gitDiffTool,
    gitAddTool,
    gitCommitTool,
];

export const docsTools = [
    getWorkspaceInfoTool,
    readFileTool,
    listDirTool,
    readDirectoryTreeTool,
    searchCodeTool,
    analyzeImportsTool,
];
