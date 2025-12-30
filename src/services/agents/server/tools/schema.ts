/**
 * Unified Tool Schema
 * 
 * Defines tool specifications that work across:
 * - Frontend (React) for UI display
 * - AgentKit (Node.js sidecar) for agent execution
 * - Tauri (Rust) for actual execution
 */

// ===========================
// Core Types
// ===========================

export type ExecutorType = 'tauri' | 'node' | 'hybrid';
export type ToolCategory = 'read' | 'write' | 'execute' | 'git' | 'analysis';

export interface ToolParameter {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    default?: unknown;
    enum?: string[];
}

export interface ToolSchema {
    name: string;
    description: string;
    category: ToolCategory;
    executor: ExecutorType;

    // Execution properties
    parallel: boolean;        // Can run with other tools simultaneously
    timeout: number;          // Max execution time in ms
    retryable: boolean;       // Safe to retry on failure
    cacheable: boolean;       // Result can be cached
    cacheTimeout?: number;    // Cache TTL in ms

    // Parameter schema (JSON Schema compatible)
    parameters: {
        type: 'object';
        properties: Record<string, ToolParameter>;
        required: string[];
    };
}

export interface ToolResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    duration?: number;       // Execution time in ms
    cached?: boolean;        // Was result from cache
}

export interface ToolCall {
    id: string;
    tool: string;
    args: Record<string, unknown>;
    timestamp: number;
}

export interface ToolExecution extends ToolCall {
    status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
    result?: ToolResult;
    startTime?: number;
    endTime?: number;
}

// ===========================
// Tool Definitions
// ===========================

export const TOOL_DEFINITIONS: ToolSchema[] = [
    // --- Workspace Info ---
    {
        name: 'get_workspace_info',
        description: 'Get information about the current workspace including path, name, and project type.',
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 5000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 60000,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    // --- File System: Read ---
    {
        name: 'read_file',
        description: 'Read the contents of a file. Returns the file content as a string.',
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 10000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 30000,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file from workspace root',
                    required: true,
                },
                encoding: {
                    type: 'string',
                    description: 'File encoding (default: utf-8)',
                    default: 'utf-8',
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'list_dir',
        description: 'List files and directories in a given path.',
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 10000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 30000,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the directory',
                    required: true,
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'read_directory_tree',
        description: 'Get complete directory structure as a tree. Useful for understanding project layout.',
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 60000,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path (use "." for workspace root)',
                    required: true,
                },
                max_depth: {
                    type: 'number',
                    description: 'Maximum depth to traverse (default: 3, max: 5)',
                    default: 3,
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'search_code',
        description: 'Search for code patterns across the workspace using text or regex.',
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 10000,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (text or regex pattern)',
                    required: true,
                },
                file_pattern: {
                    type: 'string',
                    description: 'Glob pattern to filter files (e.g., "*.ts", "src/**/*.tsx")',
                },
                is_regex: {
                    type: 'boolean',
                    description: 'Treat query as regex pattern',
                    default: false,
                },
                max_results: {
                    type: 'number',
                    description: 'Maximum results to return',
                    default: 50,
                },
            },
            required: ['query'],
        },
    },

    // --- File System: Write ---
    {
        name: 'create_file',
        description: 'Create a new file with optional initial content.',
        category: 'write',
        executor: 'tauri',
        parallel: false,  // Write operations are sequential
        timeout: 10000,
        retryable: false, // Don't retry writes
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path for the new file',
                    required: true,
                },
                content: {
                    type: 'string',
                    description: 'Initial file content (optional)',
                    default: '',
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'write_file',
        description: 'Write complete content to a file, replacing existing content. Use for new files or complete rewrites.',
        category: 'write',
        executor: 'tauri',
        parallel: false,
        timeout: 10000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file',
                    required: true,
                },
                content: {
                    type: 'string',
                    description: 'Complete file content',
                    required: true,
                },
            },
            required: ['path', 'content'],
        },
    },

    {
        name: 'edit_file',
        description: 'Perform surgical edit on a file by replacing specific text. Preferred for modifications.',
        category: 'write',
        executor: 'tauri',
        parallel: false,
        timeout: 15000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file',
                    required: true,
                },
                old_string: {
                    type: 'string',
                    description: 'Exact text to find and replace (must be unique in file)',
                    required: true,
                },
                new_string: {
                    type: 'string',
                    description: 'Replacement text',
                    required: true,
                },
            },
            required: ['path', 'old_string', 'new_string'],
        },
    },

    {
        name: 'apply_file_diff',
        description: 'Apply changes to a file with visual diff preview. Shows green/red highlighting for additions/deletions. User must accept (Cmd/Ctrl+Enter) or reject (Escape). PREFERRED for code changes.',
        category: 'write',
        executor: 'hybrid',  // Needs frontend React state
        parallel: false,
        timeout: 30000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file',
                    required: true,
                },
                new_content: {
                    type: 'string',
                    description: 'Complete new content for the file',
                    required: true,
                },
                description: {
                    type: 'string',
                    description: 'Optional description of the changes being made',
                },
            },
            required: ['path', 'new_content'],
        },
    },

    {
        name: 'delete_file',
        description: 'Delete a file from the workspace.',
        category: 'write',
        executor: 'tauri',
        parallel: false,
        timeout: 5000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file to delete',
                    required: true,
                },
            },
            required: ['path'],
        },
    },

    // --- Execute ---
    {
        name: 'run_command',
        description: 'Execute a shell command and capture output. For build tools, tests, linters, etc.',
        category: 'execute',
        executor: 'tauri',
        parallel: false,  // Commands usually need sequential execution
        timeout: 120000,  // 2 minutes max
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'Command to execute (e.g., "npm test", "pnpm build")',
                    required: true,
                },
                cwd: {
                    type: 'string',
                    description: 'Working directory (relative to workspace)',
                },
                timeout: {
                    type: 'number',
                    description: 'Timeout in ms (default: 30000)',
                    default: 30000,
                },
            },
            required: ['command'],
        },
    },

    {
        name: 'run_tests',
        description: 'Run project tests. Auto-detects test runner (npm, pnpm, cargo, etc.).',
        category: 'execute',
        executor: 'tauri',
        parallel: false,
        timeout: 300000,  // 5 minutes for tests
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    description: 'Specific test file or suite (optional)',
                },
                framework: {
                    type: 'string',
                    description: 'Override test framework: npm, pnpm, cargo, pytest',
                },
            },
            required: [],
        },
    },

    {
        name: 'format_file',
        description: 'Format a file using project formatter (Prettier, rustfmt, etc.).',
        category: 'execute',
        executor: 'tauri',
        parallel: true,  // Formatting can be parallel
        timeout: 30000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file to format',
                    required: true,
                },
            },
            required: ['path'],
        },
    },

    // --- Git ---
    {
        name: 'git_status',
        description: 'Get current git status (staged, modified, untracked files).',
        category: 'git',
        executor: 'tauri',
        parallel: true,
        timeout: 10000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 5000,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    {
        name: 'git_diff',
        description: 'Get diff of changes (staged or unstaged).',
        category: 'git',
        executor: 'tauri',
        parallel: true,
        timeout: 15000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 5000,
        parameters: {
            type: 'object',
            properties: {
                staged: {
                    type: 'boolean',
                    description: 'Show only staged changes',
                    default: false,
                },
                path: {
                    type: 'string',
                    description: 'Specific file or directory to diff',
                },
            },
            required: [],
        },
    },

    {
        name: 'git_commit',
        description: 'Create a git commit with staged changes.',
        category: 'git',
        executor: 'tauri',
        parallel: false,
        timeout: 30000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'Commit message',
                    required: true,
                },
            },
            required: ['message'],
        },
    },

    {
        name: 'git_add',
        description: 'Stage files for commit.',
        category: 'git',
        executor: 'tauri',
        parallel: false,
        timeout: 10000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                paths: {
                    type: 'array',
                    description: 'Files to stage (use ["."] for all)',
                    required: true,
                },
            },
            required: ['paths'],
        },
    },

    // --- Analysis ---
    {
        name: 'get_diagnostics',
        description: 'Get errors and warnings from LSP/linters.',
        category: 'analysis',
        executor: 'tauri',
        parallel: true,
        timeout: 15000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 10000,
        parameters: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    description: 'Filter diagnostics to specific file',
                },
            },
            required: [],
        },
    },

    {
        name: 'analyze_imports',
        description: 'Analyze imports and dependencies in a file.',
        category: 'analysis',
        executor: 'hybrid',
        parallel: true,
        timeout: 20000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 30000,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'File to analyze',
                    required: true,
                },
            },
            required: ['path'],
        },
    },

    // =========================================================================
    // NEW CONSOLIDATED TOOLS (Anthropic Best Practices)
    // These tools combine multiple operations for better token efficiency
    // =========================================================================

    {
        name: 'get_project_context',
        description: 'Get comprehensive project context in ONE call. Returns workspace info, directory structure, dependencies, git status, README, and entry points. CALL THIS FIRST when starting any new task.',
        category: 'read',
        executor: 'hybrid',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 60000,
        parameters: {
            type: 'object',
            properties: {
                include: {
                    type: 'array',
                    description: "What to include: 'structure', 'dependencies', 'git', 'readme', 'entry_points'. Default: all.",
                },
                response_format: {
                    type: 'string',
                    description: "'concise' or 'detailed'. Default: detailed.",
                },
            },
            required: [],
        },
    },

    {
        name: 'fs_batch_read',
        description: 'Read multiple files in a single operation. Much more token-efficient than calling read_file multiple times.',
        category: 'read',
        executor: 'hybrid',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 30000,
        parameters: {
            type: 'object',
            properties: {
                paths: {
                    type: 'array',
                    description: 'Array of file paths to read (relative to workspace).',
                    required: true,
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (line counts + previews) or 'detailed' (full content).",
                },
                max_chars_per_file: {
                    type: 'number',
                    description: 'Maximum characters per file. Default: 50000.',
                },
            },
            required: ['paths'],
        },
    },

    {
        name: 'find_symbols',
        description: 'Find code symbols (functions, classes, interfaces, types) across the codebase. More accurate than text search.',
        category: 'read',
        executor: 'hybrid',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 15000,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Symbol name or pattern to find.',
                    required: true,
                },
                kind: {
                    type: 'string',
                    description: "Symbol type: 'function', 'class', 'interface', 'type', 'const', 'all'.",
                },
                file_pattern: {
                    type: 'string',
                    description: "Glob pattern for files (e.g., '*.ts', '*.rs').",
                },
                response_format: {
                    type: 'string',
                    description: "'concise' or 'detailed'.",
                },
            },
            required: ['query'],
        },
    },

    {
        name: 'verify_changes',
        description: 'Verify code changes by running type-check, lint, or tests. Call this AFTER making changes.',
        category: 'execute',
        executor: 'hybrid',
        parallel: false,
        timeout: 120000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                scope: {
                    type: 'string',
                    description: "'type-check', 'lint', 'test', or 'build'. Default: type-check.",
                },
                fix: {
                    type: 'boolean',
                    description: 'Auto-fix issues (lint only). Default: false.',
                },
            },
            required: [],
        },
    },

    {
        name: 'smart_edit',
        description: 'Perform reliable file edits with built-in verification. Combines read + edit + type-check.',
        category: 'write',
        executor: 'hybrid',
        parallel: false,
        timeout: 60000,
        retryable: false,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'File path to edit.',
                    required: true,
                },
                edits: {
                    type: 'array',
                    description: 'Array of {find: string, replace: string} objects.',
                    required: true,
                },
                verify: {
                    type: 'boolean',
                    description: 'Run type-check after editing. Default: true.',
                },
            },
            required: ['path', 'edits'],
        },
    },
];

// ===========================
// Helpers
// ===========================

export function getToolByName(name: string): ToolSchema | undefined {
    return TOOL_DEFINITIONS.find(t => t.name === name);
}

export function getToolsByCategory(category: ToolCategory): ToolSchema[] {
    return TOOL_DEFINITIONS.filter(t => t.category === category);
}

export function getParallelizableTools(): ToolSchema[] {
    return TOOL_DEFINITIONS.filter(t => t.parallel);
}

export function getCacheableTools(): ToolSchema[] {
    return TOOL_DEFINITIONS.filter(t => t.cacheable);
}

/**
 * Convert tool definitions to AgentKit format
 */
export function toAgentKitTools(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}> {
    return TOOL_DEFINITIONS.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
    }));
}

/**
 * Convert tool definitions to OpenAI function calling format
 */
export function toOpenAIFunctions(): Array<{
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}> {
    return TOOL_DEFINITIONS.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    }));
}
