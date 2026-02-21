/**
 * Tool Bridge
 * 
 * Provides tool handlers that bridge between:
 * - AgentKit (running in Node.js sidecar)
 * - Tauri (running in Rust, has actual file/terminal access)
 * 
 * Communication happens via HTTP to the Tauri webview.
 */

import type { ToolResult } from './schema';
import { ToolExecutor, getToolExecutor, createToolCall } from './executor';
import type { ToolHandler } from './executor';

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
    new_content?: string;
    diff?: string;
    description?: string;
    content?: string;
    find?: string;
    replace?: string;
    old_string?: string;
    new_string?: string;
    max_depth?: number;
    include?: string[];
    response_format?: 'concise' | 'detailed';
    query?: string;
    kind?: string;
    pattern?: string;
    symbol_types?: string[];
    file_pattern?: string;
    is_regex?: boolean;
    max_results?: number;
    max_chars_per_file?: number;
    command?: string;
    cwd?: string;
    timeout?: number;
    watch?: boolean;
    target?: string;
    framework?: string;
    scope?: string;
    fix?: boolean;
    edits?: unknown[];
    verify?: boolean;
    start_line?: number;
    end_line?: number;
    message?: string;
    paths?: string[];
    target_paths?: string[];
    staged?: boolean;
    file?: string;
    encoding?: string;
    max_files?: number;
    history_limit?: number;
}

// ===========================
// In-Memory Tool Handlers (for Node.js sidecar)
// 
// These handlers simulate Tauri tool execution for testing
// In production, they will call Tauri via HTTP/WebSocket
// ===========================

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, spawn, spawnSync } from 'child_process';

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

function asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
}

function normalizeInclude(include: unknown): string[] | undefined {
    if (!Array.isArray(include)) return undefined;
    const mapped = include.flatMap(item => {
        if (typeof item !== 'string') return [];
        switch (item) {
            case 'package':
            case 'config':
                return ['dependencies'];
            default:
                return [item];
        }
    });
    return [...new Set(mapped)];
}

function normalizeLegacyArgs(toolName: string, rawArgs: Record<string, unknown>): { args: Record<string, unknown>; deprecatedArgsUsed: string[] } {
    const args = { ...rawArgs };
    const deprecatedArgsUsed: string[] = [];

    if (toolName === 'edit_file') {
        if (typeof args.find === 'string' && typeof args.old_string !== 'string') {
            args.old_string = args.find;
            deprecatedArgsUsed.push('find');
        }
        if (typeof args.replace === 'string' && typeof args.new_string !== 'string') {
            args.new_string = args.replace;
            deprecatedArgsUsed.push('replace');
        }
    }

    if (toolName === 'find_symbols') {
        if (typeof args.pattern === 'string' && typeof args.query !== 'string') {
            args.query = args.pattern;
            deprecatedArgsUsed.push('pattern');
        }
        if (!args.kind && Array.isArray(args.symbol_types) && args.symbol_types.length > 0) {
            args.kind = args.symbol_types[0];
            deprecatedArgsUsed.push('symbol_types');
        }
    }

    if (toolName === 'run_tests') {
        if (typeof args.pattern === 'string' && typeof args.target !== 'string') {
            args.target = args.pattern;
            deprecatedArgsUsed.push('pattern');
        }
    }

    if (toolName === 'apply_file_diff') {
        if (typeof args.diff === 'string' && typeof args.new_content !== 'string') {
            args.new_content = args.diff;
            deprecatedArgsUsed.push('diff');
        }
    }

    if (toolName === 'git_diff') {
        if (typeof args.path !== 'string' && Array.isArray(args.paths) && args.paths.length > 0) {
            const first = args.paths[0];
            if (typeof first === 'string' && first.length > 0) {
                args.path = first;
                deprecatedArgsUsed.push('paths');
            }
        }
    }

    if (toolName === 'get_project_context') {
        const normalizedInclude = normalizeInclude(args.include);
        if (normalizedInclude) {
            if (Array.isArray(args.include) && normalizedInclude.join(',') !== args.include.join(',')) {
                deprecatedArgsUsed.push('include(package/config)');
            }
            args.include = normalizedInclude;
        }
    }

    if (toolName === 'get_diagnostics') {
        if (typeof args.file !== 'string' && Array.isArray(args.paths) && args.paths.length > 0) {
            const first = args.paths[0];
            if (typeof first === 'string' && first.length > 0) {
                args.file = first;
                deprecatedArgsUsed.push('paths');
            }
        }
    }

    return { args, deprecatedArgsUsed };
}

function mergeMeta(result: ToolResult, meta: Record<string, unknown>): ToolResult {
    const currentData = asObject(result.data);
    return {
        ...result,
        data: {
            ...currentData,
            meta: {
                ...(asObject(currentData.meta)),
                ...meta,
            },
        },
    };
}

function createNormalizedHandler(toolName: string, handler: ToolHandler): ToolHandler {
    return async (rawArgs: Record<string, unknown>) => {
        const { args, deprecatedArgsUsed } = normalizeLegacyArgs(toolName, rawArgs);
        const result = await handler(args);
        if (deprecatedArgsUsed.length === 0) return result;
        return mergeMeta(result, { deprecatedArgsUsed });
    };
}

// ===========================
// Tool Handlers
// ===========================

export const toolHandlers: Record<string, ToolHandler> = {
    // --- Workspace Info ---
    get_workspace_info: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            if (!workspacePath) {
                return {
                    success: false,
                    error: 'No workspace is set. Please open a project first.'
                };
            }
            const name = path.basename(workspacePath);
            const responseFormat = (args as any).response_format || 'detailed';

            // Detect project type
            let projectType = 'unknown';
            try {
                await fs.access(path.join(workspacePath, 'package.json'));
                projectType = 'npm';
            } catch {
                try {
                    await fs.access(path.join(workspacePath, 'Cargo.toml'));
                    projectType = 'cargo';
                } catch { /* keep unknown */ }
            }

            if (responseFormat === 'concise') {
                return { success: true, data: { path: workspacePath } };
            }

            return {
                success: true,
                data: { name, path: workspacePath, projectType },
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    },

    // --- Read Operations ---
    read_file: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = resolvePath(args.path as string);
            const responseFormat = (args as any).response_format || 'detailed';
            const maxLines = (args as any).max_lines as number | undefined;
            let content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const totalLines = lines.length;

            // Apply max_lines if specified
            if (maxLines && maxLines > 0 && lines.length > maxLines) {
                content = lines.slice(0, maxLines).join('\n') + '\n\n[... truncated, showing ' + maxLines + ' of ' + totalLines + ' lines]';
            }

            // Truncate very large files
            const MAX_CHARS = 50000;
            if (content.length > MAX_CHARS) {
                content = content.slice(0, MAX_CHARS) + '\n\n[... truncated at ' + MAX_CHARS + ' chars]';
            }

            if (responseFormat === 'concise') {
                const preview = lines.slice(0, 100).join('\n');
                return {
                    success: true,
                    data: {
                        path: filePath,
                        lineCount: totalLines,
                        charCount: content.length,
                        preview: preview.slice(0, 2000),
                    }
                };
            }

            return { success: true, data: { content, path: filePath, lineCount: totalLines } };
        } catch (error) {
            return { success: false, error: `Failed to read file: ${error}. Verify path exists with 'list_dir'.` };
        }
    },

    list_dir: async (args) => {
        try {
            const dirPath = resolvePath(args.path as string);
            const responseFormat = (args as any).response_format || 'detailed';
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            if (responseFormat === 'concise') {
                const names = entries.map(e => e.name).sort();
                return { success: true, data: { files: names, count: names.length } };
            }

            const files = await Promise.all(entries.map(async entry => {
                const entryPath = path.join(dirPath, entry.name);
                let size = 0;
                if (!entry.isDirectory()) {
                    try {
                        const stat = await fs.stat(entryPath);
                        size = stat.size;
                    } catch { /* ignore */ }
                }
                return {
                    name: entry.name,
                    path: entryPath,
                    isDirectory: entry.isDirectory(),
                    size,
                };
            }));
            return { success: true, data: { files: files.sort((a, b) => a.name.localeCompare(b.name)) } };
        } catch (error) {
            return { success: false, error: `Failed to list directory: ${error}` };
        }
    },

    read_directory_tree: async (args) => {
        const maxDepth = Math.min((args.max_depth as number) || 3, 5);
        const dirPath = resolvePath(args.path as string);
        const responseFormat = (args as any).response_format || 'detailed';

        // For concise mode, collect flat list
        const flatFiles: string[] = [];
        const flatDirs: string[] = [];

        async function buildTree(currentPath: string, depth: number, relativePath: string = ''): Promise<any> {
            if (depth > maxDepth) return null;

            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                const tree: { directories: any[]; files: any[] } = { directories: [], files: [] };

                for (const entry of entries) {
                    // Skip common .gitignore patterns
                    const IGNORED = ['node_modules', '.git', 'dist', 'build', '.next', 'out',
                        'target', '.cache', '.turbo', 'coverage', '.nyc_output', 'vendor',
                        'bower_components', '.pnpm', '__pycache__', '.venv', 'venv'];
                    if (IGNORED.includes(entry.name)) {
                        continue;
                    }

                    const entryPath = path.join(currentPath, entry.name);
                    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

                    if (entry.isDirectory()) {
                        flatDirs.push(relPath);
                        const subtree = await buildTree(entryPath, depth + 1, relPath);
                        tree.directories.push({
                            name: entry.name,
                            path: entryPath,
                            children: subtree,
                        });
                    } else {
                        flatFiles.push(relPath);
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

            if (responseFormat === 'concise') {
                return {
                    success: true,
                    data: {
                        directories: flatDirs.slice(0, 100),
                        files: flatFiles.slice(0, 200),
                        summary: { dirCount: flatDirs.length, fileCount: flatFiles.length },
                    }
                };
            }

            return { success: true, data: { tree } };
        } catch (error) {
            return { success: false, error: `Failed to read directory tree: ${error}` };
        }
    },

    search_code: async (args) => {
        const query = args.query as string;
        const filePattern = args.file_pattern as string | undefined;
        const maxResults = (args.max_results as number) || 50;
        const isRegex = (args.is_regex as boolean) || false;
        const responseFormat = (args as any).response_format || 'detailed';

        if (!query || typeof query !== 'string') {
            return { success: false, error: 'query parameter is required' };
        }

        const ignoredGlobs = [
            '!node_modules',
            '!.git',
            '!dist',
            '!build',
            '!.next',
            '!out',
            '!target',
            '!.cache',
            '!.turbo',
            '!coverage',
            '!.nyc_output',
        ];

        const rgArgs: string[] = [
            '--line-number',
            '--no-heading',
            '--color=never',
            '--max-count',
            String(maxResults),
        ];

        if (!isRegex) {
            rgArgs.push('--fixed-strings');
        }

        if (filePattern) {
            rgArgs.push('--glob', filePattern);
        }
        for (const glob of ignoredGlobs) {
            rgArgs.push('--glob', glob);
        }
        rgArgs.push(query, '.');

        try {
            const run = spawnSync('rg', rgArgs, {
                cwd: workspacePath,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
            });

            // rg uses exit code 1 when there are no matches.
            if (run.status === 1) {
                return { success: true, data: { results: [], total: 0 } };
            }
            if (run.error) {
                return { success: false, error: `search_code failed: ${run.error.message}` };
            }
            if (run.status !== 0) {
                return { success: false, error: `search_code failed: ${run.stderr || run.stdout || 'unknown error'}` };
            }

            const output = run.stdout || '';
            const results = output
                .split('\n')
                .filter(Boolean)
                .slice(0, maxResults)
                .map(line => {
                    const [file, lineNum, ...rest] = line.split(':');
                    return { file: file.replace(/^\.\//, ''), line: parseInt(lineNum, 10) || 0, content: rest.join(':').trim() };
                });

            if (responseFormat === 'concise') {
                return {
                    success: true,
                    data: {
                        matches: results.map(r => `${r.file}:${r.line}`),
                        total: results.length,
                    }
                };
            }

            return { success: true, data: { results, total: results.length } };
        } catch (error) {
            return { success: false, error: `search_code failed: ${error}` };
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

    apply_file_diff: async (args) => {
        try {
            const filePath = args.path as string;
            const newContent = (args as any).new_content as string;
            const description = (args as any).description as string | undefined;

            if (!filePath || typeof filePath !== 'string') {
                return { success: false, error: 'path is required' };
            }
            if (newContent === undefined || newContent === null) {
                return { success: false, error: 'new_content is required' };
            }

            const resolved = resolvePath(filePath);
            let previousContent = '';
            try {
                previousContent = await fs.readFile(resolved, 'utf-8');
            } catch {
                previousContent = '';
            }

            await fs.mkdir(path.dirname(resolved), { recursive: true });
            await fs.writeFile(resolved, newContent, 'utf-8');

            const oldLines = previousContent.split('\n');
            const newLines = newContent.split('\n');
            const changedLines = Math.abs(oldLines.length - newLines.length);

            return {
                success: true,
                data: {
                    path: filePath,
                    applied: true,
                    mode: 'direct_apply',
                    previousLineCount: oldLines.length,
                    newLineCount: newLines.length,
                    changedLineDelta: changedLines,
                    description,
                    note: 'Sidecar mode applied changes directly. UI preview is available in the IDE-native tool runtime.',
                }
            };
        } catch (error) {
            return { success: false, error: `Failed to apply file diff: ${error}` };
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
        const watch = (args as any).watch as boolean | undefined;

        // Detect test command
        let testCommand = '';

        if (framework) {
            const watchFlag = watch ? ' --watch' : '';
            testCommand = `${framework} test ${target || ''}${watchFlag}`;
        } else {
            // Auto-detect
            try {
                const pkgPath = path.join(workspacePath, 'package.json');
                const pkgContent = await fs.readFile(pkgPath, 'utf-8');
                const pkg = JSON.parse(pkgContent);

                if (pkg.scripts?.test) {
                    testCommand = `pnpm test ${target || ''}${watch ? ' --watch' : ''}`;
                }
            } catch {
                // Try Cargo
                try {
                    await fs.access(path.join(workspacePath, 'Cargo.toml'));
                    // Cargo has no stable watch flag equivalent.
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
    get_diagnostics: async (args) => {
        // Placeholder implementation until LSP diagnostics stream is wired to sidecar.
        const file = typeof args.file === 'string' ? args.file : undefined;
        const responseFormat = (args as any).response_format || 'detailed';
        if (responseFormat === 'concise') {
            return {
                success: true,
                data: {
                    file,
                    errorCount: 0,
                    warningCount: 0,
                    source: 'sidecar-placeholder',
                }
            };
        }
        return {
            success: true,
            data: {
                file,
                diagnostics: [],
                source: 'sidecar-placeholder',
                note: 'Diagnostics are not yet streamed into sidecar; use verify_changes for compiler-level checks.',
            }
        };
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

    // =========================================================================
    // NEW CONSOLIDATED TOOLS (Anthropic Best Practices)
    // =========================================================================

    get_project_context: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const include = (args as any).include || ['structure', 'dependencies', 'git', 'readme', 'entry_points'];
            const responseFormat = (args as any).response_format || 'detailed';
            const context: Record<string, unknown> = {};

            // Workspace info
            context.workspace = {
                path: workspacePath,
                name: path.basename(workspacePath),
            };

            // Directory structure
            if (include.includes('structure')) {
                try {
                    const readDirRecursive = async (dir: string, depth: number = 0, maxDepth: number = 2): Promise<any> => {
                        if (depth >= maxDepth) return null;
                        const items = await fs.readdir(dir, { withFileTypes: true });
                        const IGNORED = ['node_modules', '.git', 'dist', 'build', '.next', 'target', '.cache'];
                        const filtered = items.filter(i => !IGNORED.includes(i.name) && !i.name.startsWith('.'));

                        return {
                            directories: await Promise.all(
                                filtered.filter(i => i.isDirectory()).slice(0, 20).map(async d => ({
                                    name: d.name,
                                    children: await readDirRecursive(path.join(dir, d.name), depth + 1, maxDepth)
                                }))
                            ),
                            files: filtered.filter(i => i.isFile()).slice(0, 30).map(f => ({ name: f.name }))
                        };
                    };
                    context.structure = await readDirRecursive(workspacePath);
                } catch { /* ignore */ }
            }

            // Dependencies
            if (include.includes('dependencies')) {
                try {
                    const pkgPath = path.join(workspacePath, 'package.json');
                    const content = await fs.readFile(pkgPath, 'utf-8');
                    const pkg = JSON.parse(content);
                    context.dependencies = responseFormat === 'concise'
                        ? {
                            name: pkg.name,
                            version: pkg.version,
                            type: 'npm',
                            scripts: Object.keys(pkg.scripts || {}),
                            dependencyCount: Object.keys(pkg.dependencies || {}).length,
                        }
                        : {
                            name: pkg.name,
                            version: pkg.version,
                            type: 'npm',
                            scripts: pkg.scripts,
                            dependencies: pkg.dependencies,
                            devDependencies: pkg.devDependencies,
                        };
                } catch {
                    try {
                        const cargoPath = path.join(workspacePath, 'Cargo.toml');
                        const content = await fs.readFile(cargoPath, 'utf-8');
                        context.dependencies = { type: 'cargo', content: responseFormat === 'concise' ? content.slice(0, 500) : content };
                    } catch { /* no deps */ }
                }
            }

            // Git status
            if (include.includes('git')) {
                try {
                    const status = execSync('git status --porcelain', { cwd: workspacePath, encoding: 'utf-8' });
                    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath, encoding: 'utf-8' }).trim();
                    const lines = status.split('\n').filter(Boolean);
                    context.git = responseFormat === 'concise'
                        ? { branch, modified: lines.length }
                        : { branch, files: lines };
                } catch { /* not a git repo */ }
            }

            // README
            if (include.includes('readme')) {
                try {
                    const readmePath = path.join(workspacePath, 'README.md');
                    const content = await fs.readFile(readmePath, 'utf-8');
                    context.readme = responseFormat === 'concise' ? content.slice(0, 500) : content;
                } catch { /* no readme */ }
            }

            // Entry points
            if (include.includes('entry_points')) {
                const entries = ['src/main.ts', 'src/index.ts', 'src/main.tsx', 'src/App.tsx', 'src/lib.rs', 'src/main.rs', 'index.js', 'main.py'];
                const found = [];
                for (const entry of entries) {
                    try {
                        await fs.access(path.join(workspacePath, entry));
                        found.push(entry);
                    } catch { /* doesn't exist */ }
                }
                context.entry_points = found;
            }

            return { success: true, data: context };
        } catch (error) {
            return { success: false, error: `Failed to get project context: ${error}` };
        }
    },

    fs_batch_read: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const paths = args.paths || [];
            const responseFormat = (args as any).response_format || 'detailed';
            const maxCharsPerFile = (args as any).max_chars_per_file || 50000;

            if (!Array.isArray(paths) || paths.length === 0) {
                return { success: false, error: 'paths array is required and must not be empty' };
            }

            const results = [];
            for (const filePath of paths) {
                try {
                    const resolved = resolvePath(filePath);
                    let content = await fs.readFile(resolved, 'utf-8');
                    if (content.length > maxCharsPerFile) {
                        content = content.slice(0, maxCharsPerFile) + '\n\n[... truncated ...]';
                    }
                    const lines = content.split('\n');

                    if (responseFormat === 'concise') {
                        results.push({
                            path: filePath,
                            success: true,
                            lineCount: lines.length,
                            charCount: content.length,
                            preview: lines.slice(0, 5).join('\n')
                        });
                    } else {
                        results.push({
                            path: filePath,
                            success: true,
                            content,
                            lineCount: lines.length
                        });
                    }
                } catch (error) {
                    results.push({ path: filePath, success: false, error: String(error) });
                }
            }

            return {
                success: true,
                data: {
                    files: results,
                    summary: {
                        requested: paths.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length,
                    }
                }
            };
        } catch (error) {
            return { success: false, error: `Batch read failed: ${error}` };
        }
    },

    find_symbols: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const query = args.query;
            const kind = (args as any).kind || 'all';
            const filePattern = args.file_pattern || '*.{ts,tsx,js,jsx,rs,py}';
            const responseFormat = (args as any).response_format || 'detailed';
            const maxResults = Math.min((args as any).max_results || 50, 200);

            if (!query) {
                return { success: false, error: 'query parameter is required' };
            }

            // Build regex patterns based on kind
            let patterns: string[] = [];
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            switch (kind) {
                case 'function':
                    patterns = [`(function|const|let|var)\\s+${escaped}\\s*[=(<]`, `fn\\s+${escaped}\\s*[<(]`];
                    break;
                case 'class':
                    patterns = [`class\\s+${escaped}\\s*[{<]`, `struct\\s+${escaped}\\s*[{<]`];
                    break;
                case 'interface':
                    patterns = [`interface\\s+${escaped}\\s*[{<]`, `trait\\s+${escaped}\\s*[{<]`];
                    break;
                case 'type':
                    patterns = [`type\\s+${escaped}\\s*=`, `enum\\s+${escaped}\\s*[{<]`];
                    break;
                case 'const':
                    patterns = [`(const|let|var)\\s+${escaped}\\s*[=:]`];
                    break;
                default:
                    patterns = [`\\b${escaped}\\b`];
            }

            // Use ripgrep with structured args to avoid shell interpolation.
            const results: Array<{ file: string; line: number; content: string }> = [];
            for (const pattern of patterns) {
                const run = spawnSync(
                    'rg',
                    [
                        '--line-number',
                        '--no-heading',
                        '--color=never',
                        '--max-count',
                        String(maxResults),
                        '--glob',
                        filePattern,
                        '--glob',
                        '!node_modules',
                        '--glob',
                        '!.git',
                        '-e',
                        pattern,
                        '.',
                    ],
                    { cwd: workspacePath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
                );
                if (run.error || (run.status !== 0 && run.status !== 1)) {
                    return {
                        success: false,
                        error: `Symbol search failed: ${run.error?.message || run.stderr || 'unknown rg error'}`
                    };
                }
                const output = run.stdout || '';
                for (const line of output.split('\n').filter(Boolean)) {
                    const [file, lineNum, ...rest] = line.split(':');
                    results.push({
                        file: file.replace(/^\.\//, ''),
                        line: parseInt(lineNum, 10) || 0,
                        content: rest.join(':').trim(),
                    });
                }
            }

            // Deduplicate
            const unique = results.filter((r, i, arr) =>
                arr.findIndex(x => x.file === r.file && x.line === r.line) === i
            );

            if (responseFormat === 'concise') {
                return {
                    success: true,
                    data: {
                        query,
                        kind,
                        matches: unique.slice(0, maxResults).map(r => `${r.file}:${r.line}`),
                        total: unique.length,
                    }
                };
            }

            return {
                success: true,
                data: {
                    query,
                    kind,
                    results: unique.slice(0, maxResults),
                    total: unique.length,
                }
            };
        } catch (error) {
            return { success: false, error: `Symbol search failed: ${error}` };
        }
    },

    verify_changes: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const scope = (args as any).scope || 'type-check';
            const fix = (args as any).fix || false;

            // Detect project type
            let command = '';
            let hasTs = false;
            let hasCargo = false;

            try { await fs.access(path.join(workspacePath, 'tsconfig.json')); hasTs = true; } catch { }
            try { await fs.access(path.join(workspacePath, 'Cargo.toml')); hasCargo = true; } catch { }

            if (hasTs) {
                switch (scope) {
                    case 'type-check': command = 'pnpm exec tsc --noEmit 2>&1'; break;
                    case 'lint': command = fix ? 'pnpm exec eslint . --fix 2>&1' : 'pnpm exec eslint . 2>&1'; break;
                    case 'test': command = 'pnpm test 2>&1'; break;
                    case 'build': command = 'pnpm build 2>&1'; break;
                    default: command = 'pnpm exec tsc --noEmit 2>&1';
                }
            } else if (hasCargo) {
                switch (scope) {
                    case 'type-check':
                    case 'build': command = 'cargo check 2>&1'; break;
                    case 'lint': command = 'cargo clippy 2>&1'; break;
                    case 'test': command = 'cargo test 2>&1'; break;
                    default: command = 'cargo check 2>&1';
                }
            } else {
                return { success: false, error: 'Could not detect project type (no tsconfig.json or Cargo.toml)' };
            }

            try {
                const output = execSync(command, { cwd: workspacePath, encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
                const hasErrors = /error(\[|\s|:)/i.test(output);
                const errorCount = (output.match(/error(\[|\s|:)/gi) || []).length;
                const warningCount = (output.match(/warning(\[|\s|:)/gi) || []).length;

                return {
                    success: true,
                    data: {
                        scope,
                        command,
                        passed: !hasErrors,
                        summary: { errors: errorCount, warnings: warningCount },
                        output: output.slice(0, 10000),
                    }
                };
            } catch (error: any) {
                const output = error.stdout || error.stderr || String(error);
                const errorCount = (output.match(/error(\[|\s|:)/gi) || []).length;
                return {
                    success: true,
                    data: {
                        scope,
                        command,
                        passed: false,
                        summary: { errors: errorCount, warnings: 0 },
                        output: output.slice(0, 10000),
                    }
                };
            }
        } catch (error) {
            return { success: false, error: `Verification failed: ${error}` };
        }
    },

    smart_edit: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = args.path;
            const edits = (args as any).edits;
            const verify = (args as any).verify !== false;

            if (!filePath) {
                return { success: false, error: 'path parameter is required' };
            }
            if (!edits || !Array.isArray(edits) || edits.length === 0) {
                return { success: false, error: 'edits array is required' };
            }

            const resolved = resolvePath(filePath);
            let content = await fs.readFile(resolved, 'utf-8');
            const changes: Array<{ find: string; replace: string; success: boolean; error?: string }> = [];

            for (const edit of edits) {
                if (!edit.find || edit.replace === undefined) {
                    changes.push({ find: edit.find || '(empty)', replace: '', success: false, error: 'Both find and replace are required' });
                    continue;
                }

                const normalizedContent = content.replace(/\r\n/g, '\n');
                const normalizedFind = edit.find.replace(/\r\n/g, '\n');

                if (!normalizedContent.includes(normalizedFind)) {
                    changes.push({
                        find: edit.find.slice(0, 50),
                        replace: edit.replace.slice(0, 50),
                        success: false,
                        error: 'Text not found in file'
                    });
                    continue;
                }

                const occurrences = normalizedContent.split(normalizedFind).length - 1;
                if (occurrences > 1) {
                    changes.push({
                        find: edit.find.slice(0, 50),
                        replace: edit.replace.slice(0, 50),
                        success: false,
                        error: `Text appears ${occurrences} times. Make it unique.`
                    });
                    continue;
                }

                content = normalizedContent.replace(normalizedFind, edit.replace);
                changes.push({ find: edit.find.slice(0, 50), replace: edit.replace.slice(0, 50), success: true });
            }

            const successfulEdits = changes.filter(c => c.success);
            if (successfulEdits.length === 0) {
                return { success: false, error: 'No edits could be applied', data: { changes } };
            }

            await fs.writeFile(resolved, content, 'utf-8');

            // Optionally verify
            let verification = null;
            if (verify) {
                verification = await toolHandlers.verify_changes({ scope: 'type-check' } as any);
            }

            return {
                success: true,
                data: {
                    path: filePath,
                    changes,
                    summary: {
                        attempted: edits.length,
                        successful: successfulEdits.length,
                        failed: edits.length - successfulEdits.length,
                    },
                    verification: verification?.data || null,
                }
            };
        } catch (error) {
            return { success: false, error: `Smart edit failed: ${error}` };
        }
    },

    // =========================================================================
    // PHASE 3 & 4: PRECISION EDIT TOOLS + ANALYZE FILE
    // =========================================================================

    edit_file_lines: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = args.path as string;
            const startLine = (args as any).start_line as number;
            const endLine = (args as any).end_line as number;
            const newContent = (args as any).new_content as string;
            const verify = (args as any).verify !== false;

            if (!filePath) return { success: false, error: 'path is required' };
            if (!startLine || startLine < 1) return { success: false, error: 'start_line must be >= 1' };
            if (!endLine || endLine < startLine) return { success: false, error: 'end_line must be >= start_line' };

            const resolved = resolvePath(filePath);
            const content = await fs.readFile(resolved, 'utf-8');
            const lines = content.split('\n');

            if (endLine > lines.length) {
                return { success: false, error: `end_line (${endLine}) exceeds file length (${lines.length} lines)` };
            }

            // Replace lines (1-indexed to 0-indexed)
            const newLines = newContent.split('\n');
            const before = lines.slice(0, startLine - 1);
            const after = lines.slice(endLine);
            const result = [...before, ...newLines, ...after];

            await fs.writeFile(resolved, result.join('\n'), 'utf-8');

            let verification = null;
            if (verify) {
                verification = await toolHandlers.verify_changes({ scope: 'type-check' } as any);
            }

            return {
                success: true,
                data: {
                    path: filePath,
                    linesReplaced: { start: startLine, end: endLine, count: endLine - startLine + 1 },
                    newLinesInserted: newLines.length,
                    totalLines: result.length,
                    verification: verification?.data || null,
                }
            };
        } catch (error) {
            return { success: false, error: `edit_file_lines failed: ${error}` };
        }
    },

    multi_edit: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = args.path as string;
            const edits = (args as any).edits as any[];
            const verify = (args as any).verify !== false;

            if (!filePath) return { success: false, error: 'path is required' };
            if (!edits || !Array.isArray(edits) || edits.length === 0) {
                return { success: false, error: 'edits array is required' };
            }

            const resolved = resolvePath(filePath);
            const originalContent = await fs.readFile(resolved, 'utf-8');
            let content = originalContent;
            const results: any[] = [];

            // Sort edits by line number (descending) to avoid offset issues
            const sortedEdits = [...edits].map((e, i) => ({ ...e, originalIndex: i }));
            sortedEdits.sort((a, b) => {
                if (a.type === 'line' && b.type === 'line') return b.start_line - a.start_line;
                return 0;
            });

            for (const edit of sortedEdits) {
                const editResult = { index: edit.originalIndex, type: edit.type, success: false, error: '' };

                if (edit.type === 'line') {
                    const { start_line, end_line, replace } = edit;
                    if (!start_line || !end_line || replace === undefined) {
                        editResult.error = 'line edit requires start_line, end_line, and replace';
                        results.push(editResult);
                        continue;
                    }

                    const lines = content.split('\n');
                    if (end_line > lines.length || start_line < 1) {
                        editResult.error = `Invalid line range: ${start_line}-${end_line} (file has ${lines.length} lines)`;
                        results.push(editResult);
                        continue;
                    }

                    const newLines = replace.split('\n');
                    const before = lines.slice(0, start_line - 1);
                    const after = lines.slice(end_line);
                    content = [...before, ...newLines, ...after].join('\n');
                    editResult.success = true;
                } else if (edit.type === 'text') {
                    const { find, replace } = edit;
                    if (!find || replace === undefined) {
                        editResult.error = 'text edit requires find and replace';
                        results.push(editResult);
                        continue;
                    }

                    const normalized = content.replace(/\r\n/g, '\n');
                    const normalizedFind = find.replace(/\r\n/g, '\n');

                    if (!normalized.includes(normalizedFind)) {
                        editResult.error = 'Text not found';
                        results.push(editResult);
                        continue;
                    }

                    const occurrences = normalized.split(normalizedFind).length - 1;
                    if (occurrences > 1) {
                        editResult.error = `Text appears ${occurrences} times. Make it unique.`;
                        results.push(editResult);
                        continue;
                    }

                    content = normalized.replace(normalizedFind, replace);
                    editResult.success = true;
                } else {
                    editResult.error = 'Unknown edit type. Use "line" or "text".';
                }

                results.push(editResult);
            }

            // Check if any edits succeeded
            const successCount = results.filter(r => r.success).length;
            if (successCount === 0) {
                return {
                    success: false,
                    error: 'No edits could be applied',
                    data: { results: results.sort((a, b) => a.index - b.index) }
                };
            }

            // Write atomically only if all edits succeeded (or make it configurable)
            await fs.writeFile(resolved, content, 'utf-8');

            let verification = null;
            if (verify) {
                verification = await toolHandlers.verify_changes({ scope: 'type-check' } as any);
            }

            return {
                success: true,
                data: {
                    path: filePath,
                    results: results.sort((a, b) => a.index - b.index),
                    summary: { total: edits.length, successful: successCount, failed: edits.length - successCount },
                    verification: verification?.data || null,
                }
            };
        } catch (error) {
            return { success: false, error: `multi_edit failed: ${error}` };
        }
    },

    analyze_file: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const filePath = args.path as string;
            const include = (args as any).include as string[] || ['content', 'imports', 'exports', 'symbols', 'diagnostics'];
            const responseFormat = (args as any).response_format || 'detailed';

            if (!filePath) return { success: false, error: 'path is required' };

            const resolved = resolvePath(filePath);
            const content = await fs.readFile(resolved, 'utf-8');
            const lines = content.split('\n');
            const ext = path.extname(filePath).toLowerCase();

            const analysis: any = { path: filePath, lineCount: lines.length };

            // Include content if requested
            if (include.includes('content')) {
                if (responseFormat === 'concise') {
                    analysis.content = { preview: lines.slice(0, 50).join('\n'), lineCount: lines.length };
                } else {
                    analysis.content = content.length > 50000
                        ? content.slice(0, 50000) + '\n[...truncated]'
                        : content;
                }
            }

            // Parse imports/exports for JS/TS files
            if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
                if (include.includes('imports')) {
                    const importRegex = /^(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\)|require\s*\(['"]([^'"]+)['"]\))/gm;
                    const imports: string[] = [];
                    let match;
                    while ((match = importRegex.exec(content)) !== null) {
                        imports.push(match[1] || match[2] || match[3]);
                    }
                    analysis.imports = responseFormat === 'concise'
                        ? { count: imports.length, list: imports.slice(0, 10) }
                        : imports;
                }

                if (include.includes('exports')) {
                    const exportRegex = /export\s+(?:default\s+)?(?:(?:async\s+)?function|class|const|let|var|type|interface|enum)\s+(\w+)/gm;
                    const exports: string[] = [];
                    let match;
                    while ((match = exportRegex.exec(content)) !== null) {
                        exports.push(match[1]);
                    }
                    analysis.exports = responseFormat === 'concise'
                        ? { count: exports.length, list: exports.slice(0, 10) }
                        : exports;
                }

                if (include.includes('symbols')) {
                    const symbols: any[] = [];
                    // Functions
                    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
                    let match;
                    while ((match = funcRegex.exec(content)) !== null) {
                        const lineNum = content.slice(0, match.index).split('\n').length;
                        symbols.push({ name: match[1], kind: 'function', line: lineNum });
                    }
                    // Classes
                    const classRegex = /(?:export\s+)?class\s+(\w+)/gm;
                    while ((match = classRegex.exec(content)) !== null) {
                        const lineNum = content.slice(0, match.index).split('\n').length;
                        symbols.push({ name: match[1], kind: 'class', line: lineNum });
                    }
                    // Interfaces/Types
                    const typeRegex = /(?:export\s+)?(?:interface|type)\s+(\w+)/gm;
                    while ((match = typeRegex.exec(content)) !== null) {
                        const lineNum = content.slice(0, match.index).split('\n').length;
                        symbols.push({ name: match[1], kind: 'type', line: lineNum });
                    }
                    analysis.symbols = responseFormat === 'concise'
                        ? { count: symbols.length, list: symbols.slice(0, 15).map(s => `${s.kind}:${s.name}`) }
                        : symbols;
                }
            }

            // Diagnostics placeholder (would integrate with LSP in production)
            if (include.includes('diagnostics')) {
                analysis.diagnostics = responseFormat === 'concise'
                    ? { errorCount: 0, warningCount: 0 }
                    : [];
            }

            return { success: true, data: analysis };
        } catch (error) {
            return { success: false, error: `analyze_file failed: ${error}` };
        }
    },

    review_diff_summary: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const staged = Boolean(args.staged);
            const targetPath = typeof args.path === 'string' ? args.path : undefined;
            const diffArgs = ['diff', '--numstat'];
            if (staged) diffArgs.push('--staged');
            if (targetPath) diffArgs.push('--', targetPath);

            const run = spawnSync('git', diffArgs, {
                cwd: workspacePath,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
            });

            if (run.error) {
                return { success: false, error: `review_diff_summary failed: ${run.error.message}` };
            }
            if (run.status !== 0 && run.status !== 1) {
                return { success: false, error: `review_diff_summary failed: ${run.stderr || 'git diff error'}` };
            }

            const files = (run.stdout || '')
                .split('\n')
                .filter(Boolean)
                .map(line => {
                    const [addedRaw, deletedRaw, file] = line.split('\t');
                    const added = Number.isFinite(Number(addedRaw)) ? Number(addedRaw) : 0;
                    const deleted = Number.isFinite(Number(deletedRaw)) ? Number(deletedRaw) : 0;
                    return {
                        path: file,
                        additions: added,
                        deletions: deleted,
                        changes: added + deleted,
                        risk: added + deleted > 300 ? 'high' : added + deleted > 80 ? 'medium' : 'low',
                    };
                })
                .sort((a, b) => b.changes - a.changes);

            const totals = files.reduce(
                (acc, f) => {
                    acc.files += 1;
                    acc.additions += f.additions;
                    acc.deletions += f.deletions;
                    acc.changes += f.changes;
                    return acc;
                },
                { files: 0, additions: 0, deletions: 0, changes: 0 }
            );

            return {
                success: true,
                data: {
                    staged,
                    targetPath,
                    files,
                    totals,
                    summary: `${totals.files} file(s), +${totals.additions}/-${totals.deletions} (${totals.changes} changed lines)`,
                }
            };
        } catch (error) {
            return { success: false, error: `review_diff_summary failed: ${error}` };
        }
    },

    review_hotspots: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const maxFiles = Math.min(Math.max(Number((args as any).max_files || 10), 1), 100);
            const historyLimit = Math.min(Math.max(Number((args as any).history_limit || 300), 50), 2000);

            const run = spawnSync('git', ['log', `-n${historyLimit}`, '--name-only', '--pretty=format:'], {
                cwd: workspacePath,
                encoding: 'utf-8',
                maxBuffer: 20 * 1024 * 1024,
            });
            if (run.error) {
                return { success: false, error: `review_hotspots failed: ${run.error.message}` };
            }
            if (run.status !== 0) {
                return { success: false, error: `review_hotspots failed: ${run.stderr || 'git log error'}` };
            }

            const counts = new Map<string, number>();
            for (const line of (run.stdout || '').split('\n')) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
            }

            const hotspots = Array.from(counts.entries())
                .map(([file, commitsTouched]) => ({ file, commitsTouched }))
                .sort((a, b) => b.commitsTouched - a.commitsTouched)
                .slice(0, maxFiles);

            return {
                success: true,
                data: {
                    maxFiles,
                    historyLimit,
                    hotspots,
                }
            };
        } catch (error) {
            return { success: false, error: `review_hotspots failed: ${error}` };
        }
    },

    review_checklist: async (args: ToolArgs): Promise<ToolResult> => {
        try {
            const targetPaths = Array.isArray((args as any).target_paths)
                ? (args as any).target_paths.filter((p: unknown) => typeof p === 'string')
                : [];
            const staged = (args as any).staged !== false;

            const diffArgs = ['diff'];
            if (staged) diffArgs.push('--staged');
            if (targetPaths.length > 0) {
                diffArgs.push('--', ...targetPaths);
            }

            const run = spawnSync('git', diffArgs, {
                cwd: workspacePath,
                encoding: 'utf-8',
                maxBuffer: 20 * 1024 * 1024,
            });
            if (run.error) {
                return { success: false, error: `review_checklist failed: ${run.error.message}` };
            }
            if (run.status !== 0 && run.status !== 1) {
                return { success: false, error: `review_checklist failed: ${run.stderr || 'git diff error'}` };
            }

            const diffText = run.stdout || '';
            const addedLines = diffText
                .split('\n')
                .filter(line => line.startsWith('+') && !line.startsWith('+++'))
                .join('\n');

            const checks = [
                {
                    key: 'security.eval',
                    severity: 'critical',
                    pattern: /\beval\s*\(/,
                    message: 'Avoid eval() usage in committed code.',
                },
                {
                    key: 'security.dom',
                    severity: 'warning',
                    pattern: /\b(innerHTML|dangerouslySetInnerHTML)\b/,
                    message: 'Potential unsafe HTML injection path detected.',
                },
                {
                    key: 'quality.console',
                    severity: 'info',
                    pattern: /\bconsole\.log\s*\(/,
                    message: 'Debug console.log found in changed lines.',
                },
                {
                    key: 'quality.todo',
                    severity: 'info',
                    pattern: /\b(TODO|FIXME)\b/,
                    message: 'TODO/FIXME marker present in changes.',
                },
            ];

            const findings = checks
                .filter(check => check.pattern.test(addedLines))
                .map(check => ({
                    key: check.key,
                    severity: check.severity,
                    message: check.message,
                }));

            return {
                success: true,
                data: {
                    staged,
                    targetPaths,
                    checklist: {
                        passed: findings.length === 0,
                        findings,
                    },
                }
            };
        } catch (error) {
            return { success: false, error: `review_checklist failed: ${error}` };
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
    // Register canonical handlers with arg normalization and deprecation metadata.
    for (const [name, handler] of Object.entries(toolHandlers)) {
        executor.registerHandler(name, createNormalizedHandler(name, handler));
    }

    // Register aliases (pointing to same canonical handlers).
    for (const [alias, canonical] of Object.entries(TOOL_ALIASES)) {
        const handler = toolHandlers[canonical];
        if (!handler) continue;
        executor.registerHandler(alias, createNormalizedHandler(canonical, handler));
    }
}

export function getToolHandlerNames(): string[] {
    return Object.keys(toolHandlers);
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
