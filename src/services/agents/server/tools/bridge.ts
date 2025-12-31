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
        const responseFormat = (args as any).response_format || 'detailed';

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
                return { file: file.replace(/^\.\//, ''), line: parseInt(lineNum) || 0, content: rest.join(':').trim() };
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
                default:
                    patterns = [`\\b${escaped}\\b`];
            }

            // Use grep to search
            const results: Array<{ file: string; line: number; content: string }> = [];
            for (const pattern of patterns) {
                try {
                    const cmd = `grep -rn -E "${pattern}" --include="${filePattern}" . 2>/dev/null | head -50`;
                    const output = execSync(cmd, { cwd: workspacePath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
                    for (const line of output.split('\n').filter(Boolean)) {
                        const match = line.match(/^\.\/([^:]+):(\d+):(.*)$/);
                        if (match) {
                            results.push({ file: match[1], line: parseInt(match[2]), content: match[3].trim() });
                        }
                    }
                } catch { /* no matches */ }
            }

            // Deduplicate
            const unique = results.filter((r, i, arr) =>
                arr.findIndex(x => x.file === r.file && x.line === r.line) === i
            );

            return {
                success: true,
                data: {
                    query,
                    kind,
                    results: unique,
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
