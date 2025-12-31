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
    // For array types - defines the type of items in the array
    items?: {
        type: 'string' | 'number' | 'boolean' | 'object';
        properties?: Record<string, { type: string; description?: string }>;
        required?: string[];
        description?: string;
    };
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
        description: `Get workspace metadata including path, name, and detected project type.

WHEN TO USE: Quick check of workspace location. For comprehensive project understanding, use 'get_project_context' instead.
RETURNS: { path: string, name: string, projectType: 'npm'|'cargo'|'unknown' }`,
        category: 'read',
        executor: 'tauri',
        parallel: true,
        timeout: 5000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 60000,
        parameters: {
            type: 'object',
            properties: {
                response_format: {
                    type: 'string',
                    description: "'concise' (path only) or 'detailed' (all metadata). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: [],
        },
    },

    // --- File System: Read ---
    {
        name: 'read_file',
        description: `Read a single file's complete contents.

WHEN TO USE: Reading one specific file when you know the exact path.
WHEN NOT TO USE: For reading 2+ files, use 'fs_batch_read' instead (more token-efficient).
RETURNS: File content as string. Files >50KB are truncated with '[...truncated]' marker.
ERRORS: "file not found" - verify path with 'list_dir' first.`,
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
                    description: 'Relative path to the file from workspace root (e.g., "src/App.tsx")',
                    required: true,
                },
                encoding: {
                    type: 'string',
                    description: 'File encoding (default: utf-8)',
                    default: 'utf-8',
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (first 100 lines + line count) or 'detailed' (full content). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
                max_lines: {
                    type: 'number',
                    description: 'Maximum lines to return. Default: unlimited.',
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'list_dir',
        description: `List files and subdirectories in a path (one level only).

WHEN TO USE: Checking if specific files exist, exploring a single folder.
WHEN NOT TO USE: For project overview, use 'get_project_context'. For deep traversal, use 'read_directory_tree'.
RETURNS: Array of { name, isDirectory, size } objects, sorted alphabetically.`,
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
                    description: 'Relative path to directory (use "." for workspace root)',
                    required: true,
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (names only) or 'detailed' (with sizes/types). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'read_directory_tree',
        description: `Get recursive directory structure as a nested tree.

WHEN TO USE: Understanding folder hierarchy, finding where files are located.
WHEN NOT TO USE: For quick project overview with deps/git/readme, use 'get_project_context' instead.
NOTE: Automatically ignores: node_modules, .git, dist, build, target, .cache, __pycache__.
RETURNS: Nested { directories: [...], files: [...] } structure.`,
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
                    description: 'Starting path (use "." for workspace root)',
                    required: true,
                },
                max_depth: {
                    type: 'number',
                    description: 'Maximum depth to traverse (1-5). Default: 3.',
                    default: 3,
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (names only, flat list) or 'detailed' (nested tree with sizes). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'search_code',
        description: `Search for text/regex patterns across the codebase using grep.

WHEN TO USE: Finding where a function/variable/string is used.
WHEN NOT TO USE: For finding symbol definitions (functions, classes), use 'find_symbols' instead.
TIP: Use file_pattern to narrow scope (e.g., "*.ts" for TypeScript only).
RETURNS: Array of { file, line, content } matches, max 50 by default.`,
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
                    description: 'Search text or regex pattern',
                    required: true,
                },
                file_pattern: {
                    type: 'string',
                    description: 'Glob to filter files: "*.ts", "src/**/*.tsx", "!**/test/**"',
                },
                is_regex: {
                    type: 'boolean',
                    description: 'Treat query as regex. Default: false (literal text).',
                    default: false,
                },
                max_results: {
                    type: 'number',
                    description: 'Maximum matches to return. Default: 50.',
                    default: 50,
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (file:line only) or 'detailed' (with matching text). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: ['query'],
        },
    },

    // --- File System: Write ---
    {
        name: 'create_file',
        description: `Create a new file with optional initial content. Parent directories are created automatically.

WHEN TO USE: Creating brand new files.
WHEN NOT TO USE: If file might exist, use 'write_file' instead (overwrites safely).
ERRORS: Returns error if file already exists.`,
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
                    description: 'Relative path for new file (e.g., "src/components/Button.tsx")',
                    required: true,
                },
                content: {
                    type: 'string',
                    description: 'Initial file content. Default: empty file.',
                    default: '',
                },
            },
            required: ['path'],
        },
    },

    {
        name: 'write_file',
        description: `Write complete content to a file, creating or overwriting it.

WHEN TO USE: Creating new files OR completely replacing file contents.
WHEN NOT TO USE: For targeted modifications, use 'edit_file' or 'smart_edit' instead.
TIP: Always use 'verify_changes' after writes to catch type errors.`,
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
                    description: 'Complete file content to write',
                    required: true,
                },
            },
            required: ['path', 'content'],
        },
    },

    {
        name: 'edit_file',
        description: `Replace specific text in a file. The old_string must be UNIQUE in the file.

WHEN TO USE: Small, targeted modifications to existing code.
WHEN NOT TO USE: For multiple edits, use 'smart_edit'. For new files, use 'write_file'.
ERRORS:
- "Text not found" → Read file first to get exact text including whitespace.
- "Text appears N times" → Include more context to make old_string unique.
TIP: Include surrounding lines for uniqueness.`,
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
                    description: 'Exact text to find (must be unique in file, include whitespace)',
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
        description: `Apply changes with visual diff preview in the editor. Shows green/red highlighting.

WHEN TO USE: When user should review changes before they're applied.
USER ACTION REQUIRED: Accept (Cmd/Ctrl+Enter) or Reject (Escape).
BENEFIT: User sees exactly what changes, can reject bad edits.
WHEN NOT TO USE: For silent/automated changes, use 'edit_file' or 'smart_edit'.`,
        category: 'write',
        executor: 'hybrid',
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
                    description: 'Summary of changes (shown to user)',
                },
            },
            required: ['path', 'new_content'],
        },
    },

    {
        name: 'delete_file',
        description: `Delete a file from the workspace. Cannot be undone.

WHEN TO USE: Removing obsolete files after refactoring.
WARNING: Permanent deletion. Consider git_status first to verify uncommitted changes.
ERRORS: "file not found" - file may already be deleted.`,
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
        description: `Execute a shell command and capture stdout/stderr.

WHEN TO USE: Build tools, linters, custom scripts, package managers.
WHEN NOT TO USE: For type-checking, use 'verify_changes'. For tests, use 'run_tests'.
NOTE: Commands run in workspace root. Exit code 1 = "found issues" (not a failure).
TIMEOUT: Default 30s, max 120s. Long builds may need higher timeout.`,
        category: 'execute',
        executor: 'tauri',
        parallel: false,
        timeout: 120000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'Shell command to run (e.g., "pnpm build", "cargo check")',
                    required: true,
                },
                cwd: {
                    type: 'string',
                    description: 'Working directory relative to workspace. Default: workspace root.',
                },
                timeout: {
                    type: 'number',
                    description: 'Timeout in ms. Default: 30000. Max: 120000.',
                    default: 30000,
                },
            },
            required: ['command'],
        },
    },

    {
        name: 'run_tests',
        description: `Run project tests with auto-detected test framework.

WHEN TO USE: Running full test suite or specific test files.
AUTO-DETECTS: pnpm/npm (package.json), cargo (Cargo.toml), pytest (requirements.txt).
TIMEOUT: 5 minutes max for long test suites.`,
        category: 'execute',
        executor: 'tauri',
        parallel: false,
        timeout: 300000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    description: 'Specific test file or pattern (e.g., "src/utils.test.ts")',
                },
                framework: {
                    type: 'string',
                    description: 'Override test framework: "pnpm", "npm", "cargo", "pytest"',
                    enum: ['pnpm', 'npm', 'cargo', 'pytest'],
                },
            },
            required: [],
        },
    },

    {
        name: 'format_file',
        description: `Format a file using project's configured formatter.

AUTO-DETECTS: Prettier (JS/TS/CSS/HTML/MD), rustfmt (Rust).
WHEN TO USE: After creating or editing files to ensure consistent style.`,
        category: 'execute',
        executor: 'tauri',
        parallel: true,
        timeout: 30000,
        retryable: true,
        cacheable: false,
        parameters: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'File path to format',
                    required: true,
                },
            },
            required: ['path'],
        },
    },

    // --- Git ---
    {
        name: 'git_status',
        description: `Get git status: staged, modified, and untracked files.

WHEN TO USE: Before committing to see what files have changes.
RETURNS: Porcelain format (M=modified, A=added, ??=untracked).`,
        category: 'git',
        executor: 'tauri',
        parallel: true,
        timeout: 10000,
        retryable: true,
        cacheable: true,
        cacheTimeout: 5000,
        parameters: {
            type: 'object',
            properties: {
                response_format: {
                    type: 'string',
                    description: "'concise' (modified file count) or 'detailed' (file list). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: [],
        },
    },

    {
        name: 'git_diff',
        description: `Get diff showing actual code changes.

WHEN TO USE: Reviewing what changed before committing or after edits.
OPTIONS: Use staged=true for changes ready to commit.`,
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
                    description: 'Show only staged changes. Default: false (unstaged).',
                    default: false,
                },
                path: {
                    type: 'string',
                    description: 'Filter to specific file or directory.',
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (stat summary) or 'detailed' (full diff). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: [],
        },
    },

    {
        name: 'git_commit',
        description: `Create a git commit with currently staged changes.

WHEN TO USE: After staging files with 'git_add'.
PREREQ: Files must be staged first. Use 'git_status' to verify.
ERRORS: "nothing to commit" → Stage files first with 'git_add'.`,
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
                    description: 'Commit message (use conventional format: "type: description")',
                    required: true,
                },
            },
            required: ['message'],
        },
    },

    {
        name: 'git_add',
        description: `Stage files for the next commit.

WHEN TO USE: Before 'git_commit' to prepare changes.
USAGE: paths=["."] stages all changes, or specify individual files.`,
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
                    description: 'File paths to stage. Use ["."] for all files.',
                    items: { type: 'string' },
                    required: true,
                },
            },
            required: ['paths'],
        },
    },

    // --- Analysis ---
    {
        name: 'get_diagnostics',
        description: `Get TypeScript/lint errors and warnings from the language server.

WHEN TO USE: After edits to check for errors without running full build.
WHEN NOT TO USE: Use 'verify_changes' for comprehensive type-checking.`,
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
                    description: 'Filter to specific file (optional).',
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (error count) or 'detailed' (full messages). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: [],
        },
    },

    {
        name: 'analyze_imports',
        description: `Analyze import/require statements in a file.

RETURNS: List of imported modules (npm packages, relative paths, etc.).
WHEN TO USE: Understanding file dependencies before refactoring.`,
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
                response_format: {
                    type: 'string',
                    description: "'concise' (import count) or 'detailed' (full list). Default: detailed.",
                    enum: ['concise', 'detailed'],
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
                    items: { type: 'string' },
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
                    items: { type: 'string' },
                    description: 'Array of file paths to read (relative to workspace).',
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
                    items: {
                        type: 'object',
                        properties: {
                            find: { type: 'string', description: 'Text to find (must be unique in file)' },
                            replace: { type: 'string', description: 'Replacement text' }
                        },
                        required: ['find', 'replace']
                    },
                    description: 'Array of {find: string, replace: string} objects.',
                },
                verify: {
                    type: 'boolean',
                    description: 'Run type-check after editing. Default: true.',
                },
            },
            required: ['path', 'edits'],
        },
    },

    // =========================================================================
    // PHASE 3 & 4: PRECISION EDIT TOOLS + ANALYZE FILE
    // =========================================================================

    {
        name: 'edit_file_lines',
        description: `Edit a file by replacing specific line ranges. More precise than text-based edit.

WHEN TO USE: When you know exact line numbers to modify (e.g., from search_code or read_file output).
WHEN NOT TO USE: For text-based find/replace, use 'edit_file' or 'smart_edit'.
BENEFITS: No need to match exact text - just specify line numbers.`,
        category: 'write',
        executor: 'hybrid',
        parallel: false,
        timeout: 30000,
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
                start_line: {
                    type: 'number',
                    description: 'First line to replace (1-indexed).',
                    required: true,
                },
                end_line: {
                    type: 'number',
                    description: 'Last line to replace (1-indexed, inclusive).',
                    required: true,
                },
                new_content: {
                    type: 'string',
                    description: 'Replacement content for those lines.',
                    required: true,
                },
                verify: {
                    type: 'boolean',
                    description: 'Run type-check after edit. Default: true.',
                    default: true,
                },
            },
            required: ['path', 'start_line', 'end_line', 'new_content'],
        },
    },

    {
        name: 'multi_edit',
        description: `Apply multiple edits to a file atomically. All edits succeed or none are applied.

WHEN TO USE: Making several related changes to one file in a single operation.
BENEFITS: 
- Atomic: all-or-nothing, won't leave file in broken state
- Token-efficient: one tool call vs multiple edit_file calls
- Auto-adjusts line numbers as edits are applied`,
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
                    items: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                description: 'Edit type: "line" (line range) or "text" (find/replace)',
                            },
                            start_line: { type: 'number', description: 'For line type: first line (1-indexed)' },
                            end_line: { type: 'number', description: 'For line type: last line (1-indexed)' },
                            find: { type: 'string', description: 'For text type: text to find' },
                            replace: { type: 'string', description: 'Replacement content' },
                        },
                        required: ['type', 'replace'],
                    },
                    description: 'Array of edit operations to apply in order.',
                },
                verify: {
                    type: 'boolean',
                    description: 'Run type-check after edits. Default: true.',
                    default: true,
                },
            },
            required: ['path', 'edits'],
        },
    },

    {
        name: 'analyze_file',
        description: `Get comprehensive analysis of a file in ONE call: content, imports, exports, symbols, diagnostics.

WHEN TO USE: Before making changes to understand file structure and dependencies.
BENEFITS: Avoids multiple tool calls (read_file + analyze_imports + get_diagnostics + find_symbols).
RETURNS: Combined analysis with imports, exports, function/class definitions, and any errors.`,
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
                    description: 'File to analyze.',
                    required: true,
                },
                include: {
                    type: 'array',
                    items: { type: 'string' },
                    description: "What to include: 'content', 'imports', 'exports', 'symbols', 'diagnostics'. Default: all.",
                },
                response_format: {
                    type: 'string',
                    description: "'concise' (counts + summary) or 'detailed' (full data). Default: detailed.",
                    enum: ['concise', 'detailed'],
                },
            },
            required: ['path'],
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
