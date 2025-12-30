/**
 * Tool Bridge
 * 
 * Provides tool handlers that bridge between:
 * - AgentKit (running in Node.js sidecar)
 * - Tauri (running in Rust, has actual file/terminal access)
 * 
 * Communication happens via HTTP to the Tauri webview.
 */

import { ToolResult, TOOL_DEFINITIONS } from './schema';
import { ToolExecutor, ToolHandler, getToolExecutor, createToolCall } from './executor';

// ===========================
// Types
// ===========================

export interface TauriBridgeConfig {
    tauriUrl: string;          // URL to reach Tauri webview (for inter-process calls)
    workspacePath: string;     // Current workspace path
    timeout: number;           // Default timeout for bridge calls
}

export interface BridgeMessage {
    type: 'tool_call';
    id: string;
    tool: string;
    args: Record<string, unknown>;
}

export interface BridgeResponse {
    type: 'tool_result';
    id: string;
    result: ToolResult;
}

interface ToolArgs {
    path?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
    max_depth?: number;
    query?: string;
    file_pattern?: string;
    is_regex?: boolean;
    max_results?: number;
    command?: string;
    cwd?: string;
    timeout?: number;
    target?: string;
    framework?: string;
    message?: string;
    paths?: string[];
    staged?: boolean;
    file?: string;
    encoding?: string;
}

// ===========================
// In-Memory Tool Handlers (for Node.js sidecar)
// 
// These handlers simulate Tauri tool execution for testing
// In production, they will call Tauri via HTTP/WebSocket
// ===========================

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

// CRITICAL: DO NOT use process.cwd() - that's the IDE's path, not user's project
let workspacePath: string = '';

export function setWorkspacePath(p: string): void {
    if (!p) {
        console.warn('[Bridge] Empty workspace path provided');
        return;
    }
    workspacePath = p;
    console.log(`[Bridge] Workspace set to: ${p}`);
}

export function getWorkspacePath(): string {
    return workspacePath;
}

function resolvePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
        return relativePath;
    }
    if (!workspacePath) {
        throw new Error('Workspace path not set. Make sure to pass workspace with each request.');
    }
    return path.join(workspacePath, relativePath);
}

// ===========================
// Tool Handlers
// ===========================

export const toolHandlers: Record<string, ToolHandler> = {
    // --- Workspace Info ---
    get_workspace_info: async (): Promise<ToolResult> => {
        try {
            if (!workspacePath) {
                return {
                    success: false,
                    error: 'No workspace is set. Please open a project first.'
                };
            }
            const name = path.basename(workspacePath);
            return {
                success: true,
                data: {
                    name,
                    path: workspacePath,
                },
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    },

    // --- Read Operations ---
    read_file: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = resolvePath(args.path as string);
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, data: { content, path: filePath } };
        } catch (error) {
            return { success: false, error: `Failed to read file: ${error}` };
        }
    },

    list_dir: async (args) => {
        try {
            const dirPath = resolvePath(args.path as string);
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const files = entries.map(entry => ({
                name: entry.name,
                path: path.join(dirPath, entry.name),
                isDirectory: entry.isDirectory(),
            }));
            return { success: true, data: { files } };
        } catch (error) {
            return { success: false, error: `Failed to list directory: ${error}` };
        }
    },

    read_directory_tree: async (args) => {
        const maxDepth = Math.min((args.max_depth as number) || 3, 5);
        const dirPath = resolvePath(args.path as string);

        async function buildTree(currentPath: string, depth: number): Promise<any> {
            if (depth > maxDepth) return null;

            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                const tree: { directories: any[]; files: any[] } = { directories: [], files: [] };

                for (const entry of entries) {
                    // Skip common ignored directories
                    if (['node_modules', '.git', 'dist', 'build', '.next', 'target'].includes(entry.name)) {
                        continue;
                    }

                    const entryPath = path.join(currentPath, entry.name);

                    if (entry.isDirectory()) {
                        const subtree = await buildTree(entryPath, depth + 1);
                        tree.directories.push({
                            name: entry.name,
                            path: entryPath,
                            children: subtree,
                        });
                    } else {
                        tree.files.push({
                            name: entry.name,
                            path: entryPath,
                        });
                    }
                }

                return tree;
            } catch {
                return null;
            }
        }

        try {
            const tree = await buildTree(dirPath, 0);
            return { success: true, data: { tree } };
        } catch (error) {
            return { success: false, error: `Failed to read directory tree: ${error}` };
        }
    },

    search_code: async (args) => {
        // Simple grep-like search (in production, use ripgrep)
        const query = args.query as string;
        const filePattern = args.file_pattern as string | undefined;
        const maxResults = (args.max_results as number) || 50;

        try {
            // Use grep/ripgrep for actual search
            const cmd = process.platform === 'win32'
                ? `findstr /s /n "${query}" *`
                : `grep -rn "${query}" . --include="${filePattern || '*'}" 2>/dev/null | head -${maxResults}`;

            const output = execSync(cmd, {
                cwd: workspacePath,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
            });

            const results = output.split('\n').filter(Boolean).slice(0, maxResults).map(line => {
                const [file, lineNum, ...rest] = line.split(':');
                return { file, line: parseInt(lineNum) || 0, content: rest.join(':').trim() };
            });

            return { success: true, data: { results, total: results.length } };
        } catch (error) {
            // grep returns non-zero when no matches
            return { success: true, data: { results: [], total: 0 } };
        }
    },

    // --- Write Operations ---
    create_file: async (args) => {
        try {
            const filePath = resolvePath(args.path as string);
            const content = (args.content as string) || '';

            // Ensure directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');

            return { success: true, data: { path: filePath, created: true } };
        } catch (error) {
            return { success: false, error: `Failed to create file: ${error}` };
        }
    },

    write_file: async (args) => {
        try {
            const filePath = resolvePath(args.path as string);
            const content = args.content as string;

            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');

            return { success: true, data: { path: filePath, written: true } };
        } catch (error) {
            return { success: false, error: `Failed to write file: ${error}` };
        }
    },

    edit_file: async (args) => {
        try {
            const filePath = resolvePath(args.path as string);
            const oldString = args.old_string as string;
            const newString = args.new_string as string;

            const content = await fs.readFile(filePath, 'utf-8');

            // Normalize line endings
            const normalized = content.replace(/\r\n/g, '\n');
            const normalizedOld = oldString.replace(/\r\n/g, '\n');

            if (!normalized.includes(normalizedOld)) {
                return {
                    success: false,
                    error: `Text not found in file. Make sure to use exact text from the file.`
                };
            }

            // Check for multiple occurrences
            const occurrences = normalized.split(normalizedOld).length - 1;
            if (occurrences > 1) {
                return {
                    success: false,
                    error: `Text appears ${occurrences} times. Provide more context to make it unique.`
                };
            }

            const newContent = normalized.replace(normalizedOld, newString);
            await fs.writeFile(filePath, newContent, 'utf-8');

            return {
                success: true,
                data: {
                    path: filePath,
                    edited: true,
                    oldLength: oldString.length,
                    newLength: newString.length,
                }
            };
        } catch (error) {
            return { success: false, error: `Failed to edit file: ${error}` };
        }
    },

    delete_file: async (args) => {
        try {
            const filePath = resolvePath(args.path as string);
            await fs.unlink(filePath);
            return { success: true, data: { path: filePath, deleted: true } };
        } catch (error) {
            return { success: false, error: `Failed to delete file: ${error}` };
        }
    },

    // --- Execute Operations ---
    run_command: async (args) => {
        const command = args.command as string;
        const cwd = args.cwd ? resolvePath(args.cwd as string) : workspacePath;
        const timeout = Math.min((args.timeout as number) || 30000, 120000);

        console.log(`[Bridge] Executing: "${command}" in ${cwd} (timeout: ${timeout}ms)`);

        return new Promise((resolve) => {
            let output = '';
            let stderr = '';
            let timedOut = false;

            const [cmd, ...cmdArgs] = command.split(' ');
            const proc = spawn(cmd, cmdArgs, {
                cwd,
                shell: true,
                timeout,
            });

            proc.stdout?.on('data', (data) => { output += data.toString(); });
            proc.stderr?.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                if (timedOut) return; // Already resolved on timeout

                const combinedOutput = output + (stderr ? '\n--- stderr ---\n' + stderr : '');

                // IMPORTANT: Always return success=true for completed commands
                // Exit code 1 from tsc, eslint, etc. is normal - it means "found issues"
                // The agent should interpret the output, not retry on exit code 1
                console.log(`[Bridge] Command completed with exit code ${code}, ${combinedOutput.length} bytes`);

                resolve({
                    success: true, // Changed: Always success for completed commands
                    data: {
                        stdout: output,
                        stderr,
                        exitCode: code,
                        combinedOutput,
                        // Include informational note about exit code
                        message: code === 0
                            ? 'Command completed successfully.'
                            : `Command completed with exit code ${code}. Review output for details.`,
                    },
                });
            });

            proc.on('error', (error) => {
                if (timedOut) return;
                console.error(`[Bridge] Command error:`, error.message);
                resolve({
                    success: false,
                    error: `Failed to execute command: ${error.message}`,
                });
            });

            // Timeout handling
            setTimeout(() => {
                if (!proc.killed) {
                    timedOut = true;
                    proc.kill();
                    resolve({
                        success: false,
                        error: `Command timed out after ${timeout}ms`,
                        data: {
                            stdout: output,
                            stderr,
                            exitCode: null,
                        },
                    });
                }
            }, timeout);
        });
    },

    run_tests: async (args) => {
        const target = args.target as string | undefined;
        const framework = args.framework as string | undefined;

        // Detect test command
        let testCommand = '';

        if (framework) {
            testCommand = `${framework} test ${target || ''}`;
        } else {
            // Auto-detect
            try {
                const pkgPath = path.join(workspacePath, 'package.json');
                const pkgContent = await fs.readFile(pkgPath, 'utf-8');
                const pkg = JSON.parse(pkgContent);

                if (pkg.scripts?.test) {
                    testCommand = `pnpm test ${target || ''}`;
                }
            } catch {
                // Try Cargo
                try {
                    await fs.access(path.join(workspacePath, 'Cargo.toml'));
                    testCommand = `cargo test ${target || ''}`;
                } catch {
                    return { success: false, error: 'Could not detect test framework' };
                }
            }
        }

        return toolHandlers.run_command({ command: testCommand.trim(), timeout: 300000 });
    },

    format_file: async (args) => {
        const filePath = args.path as string;
        const ext = path.extname(filePath).slice(1);

        let formatCommand = '';
        if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'md'].includes(ext)) {
            formatCommand = `npx prettier --write "${resolvePath(filePath)}"`;
        } else if (ext === 'rs') {
            formatCommand = `rustfmt "${resolvePath(filePath)}"`;
        } else {
            return { success: false, error: `No formatter for .${ext} files` };
        }

        return toolHandlers.run_command({ command: formatCommand, timeout: 30000 });
    },

    // --- Git Operations ---
    git_status: async () => {
        return toolHandlers.run_command({ command: 'git status --porcelain' });
    },

    git_diff: async (args) => {
        const staged = args.staged as boolean;
        const filePath = args.path as string | undefined;

        let cmd = 'git diff';
        if (staged) cmd += ' --staged';
        if (filePath) cmd += ` "${filePath}"`;

        return toolHandlers.run_command({ command: cmd });
    },

    git_commit: async (args) => {
        const message = args.message as string;
        return toolHandlers.run_command({ command: `git commit -m "${message}"` });
    },

    git_add: async (args) => {
        const paths = args.paths as string[];
        return toolHandlers.run_command({ command: `git add ${paths.join(' ')}` });
    },

    // --- Analysis ---
    get_diagnostics: async (_args) => {
        // This would normally call the LSP
        // For now, return empty
        return { success: true, data: { diagnostics: [] } };
    },

    analyze_imports: async (args) => {
        const filePath = resolvePath(args.path as string);

        try {
            const content = await fs.readFile(filePath, 'utf-8');

            // Simple import analysis
            const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
            const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

            const imports: string[] = [];
            let match;

            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1]);
            }
            while ((match = requireRegex.exec(content)) !== null) {
                imports.push(match[1]);
            }

            return {
                success: true,
                data: {
                    imports: [...new Set(imports)],
                    count: imports.length,
                }
            };
        } catch (error) {
            return { success: false, error: `Failed to analyze imports: ${error}` };
        }
    },
};

// ===========================
// Bridge Setup
// ===========================

// Tool aliases for LLM compatibility (LLMs sometimes use alternative names)
const TOOL_ALIASES: Record<string, string> = {
    'list_files': 'list_dir',
    'read_dir': 'list_dir',
    'ls': 'list_dir',
    'cat': 'read_file',
    'file_read': 'read_file',
    'file_write': 'write_file',
    'file_create': 'create_file',
    'file_edit': 'edit_file',
    'file_diff': 'apply_file_diff',
    'diff_file': 'apply_file_diff',
    'file_delete': 'delete_file',
    'rm': 'delete_file',
    'grep': 'search_code',
    'find': 'search_code',
    'exec': 'run_command',
    'shell': 'run_command',
    'test': 'run_tests',
};

/**
 * Resolve tool alias to canonical name
 */
export function resolveToolAlias(name: string): string {
    return TOOL_ALIASES[name] || name;
}

/**
 * Register all tool handlers with an executor
 */
export function registerToolHandlers(executor: ToolExecutor): void {
    // Register canonical handlers
    executor.registerHandlers(toolHandlers);

    // Register aliases (pointing to same handlers)
    for (const [alias, canonical] of Object.entries(TOOL_ALIASES)) {
        const handler = toolHandlers[canonical];
        if (handler) {
            executor.registerHandler(alias, handler);
        }
    }
}

/**
 * Create a fully configured tool executor with all handlers
 */
export function createConfiguredExecutor(workspace?: string): ToolExecutor {
    if (workspace) {
        setWorkspacePath(workspace);
    }

    const executor = getToolExecutor({
        maxConcurrency: 10,
        defaultTimeout: 30000,
        enableCache: true,
        onToolStart: (call) => {
            console.log(`[Tool] Starting: ${call.tool}`);
        },
        onToolComplete: (execution) => {
            console.log(`[Tool] Complete: ${execution.tool} (${execution.result?.duration}ms)`);
        },
        onToolError: (call, error) => {
            console.error(`[Tool] Error: ${call.tool}:`, error.message);
        },
    });

    registerToolHandlers(executor);
    return executor;
}

// Export types and utilities
export { ToolExecutor, createToolCall };
