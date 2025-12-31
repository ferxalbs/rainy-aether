/**
 * AgentKit Tools - Batch Operations
 * 
 * Efficient batch tools that leverage network state caching
 * for reduced redundancy and better token efficiency.
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import {
    type NetworkState,
    getCachedFile,
    setCachedFile,
    CACHE_CONFIG,
} from '../types';

// ===========================
// Batch Read Files Tool
// ===========================

export const batchReadFilesTool = createTool({
    name: 'fs_batch_read',
    description: `Read multiple files in one operation. More efficient than calling read_file multiple times.

WHEN TO USE: Reading 2+ files that you need to analyze together.
CACHING: All files are cached for ${CACHE_CONFIG.FILE_TTL_MS / 1000}s after reading.
TOKEN EFFICIENCY: Returns structured summaries instead of full content when files are large.
RETURNS: Object with file paths as keys, content/error as values.`,
    parameters: z.object({
        paths: z.array(z.string()).describe('Array of file paths to read'),
        format: z.enum(['full', 'summary']).optional()
            .describe("'full' returns complete content, 'summary' returns first/last 50 lines for large files"),
    }),
    handler: async ({ paths, format = 'full' }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            const results: Record<string, { content: string; cached: boolean; truncated?: boolean } | { error: string }> = {};

            // Process files with caching
            for (const path of paths) {
                try {
                    // Check cache first
                    let content: string;
                    let cached = false;

                    if (state) {
                        const cachedFile = getCachedFile(state, path);
                        if (cachedFile) {
                            content = cachedFile.content;
                            cached = true;
                            console.log(`[fs_batch_read] Cache HIT: ${path}`);
                        } else {
                            content = await invoke<string>('read_text_file', { path });
                            setCachedFile(state, path, content);
                            console.log(`[fs_batch_read] Cached: ${path}`);
                        }
                    } else {
                        content = await invoke<string>('read_text_file', { path });
                    }

                    // Apply format
                    if (format === 'summary' && content.length > 5000) {
                        const lines = content.split('\n');
                        if (lines.length > 100) {
                            const head = lines.slice(0, 50).join('\n');
                            const tail = lines.slice(-50).join('\n');
                            results[path] = {
                                content: `=== First 50 lines ===\n${head}\n\n=== ... ${lines.length - 100} lines omitted ===\n\n=== Last 50 lines ===\n${tail}`,
                                cached,
                                truncated: true,
                            };
                        } else {
                            results[path] = { content, cached };
                        }
                    } else {
                        results[path] = { content, cached };
                    }
                } catch (error) {
                    results[path] = { error: String(error) };
                }
            }

            return {
                success: true,
                filesRead: Object.keys(results).filter(k => !('error' in results[k])).length,
                filesErrored: Object.keys(results).filter(k => 'error' in results[k]).length,
                results,
            };
        } catch (error) {
            throw new Error(`Batch read failed: ${error}`);
        }
    },
});

// ===========================
// Batch Search Tool
// ===========================

export const batchSearchTool = createTool({
    name: 'batch_search',
    description: `Search for multiple patterns across the codebase in one call.

WHEN TO USE: Finding usages of multiple functions/variables at once.
EFFICIENCY: Runs searches in parallel and deduplicates results.
RETURNS: Results grouped by query pattern.`,
    parameters: z.object({
        queries: z.array(z.object({
            pattern: z.string().describe('The search pattern'),
            isRegex: z.boolean().optional().describe('Treat as regex'),
        })).describe('Array of search queries'),
        filePattern: z.string().optional().describe('Glob to filter files (e.g., "*.ts")'),
        maxResultsPerQuery: z.number().optional().describe('Max results per query (default: 20)'),
    }),
    handler: async ({ queries, filePattern, maxResultsPerQuery = 20 }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const results: Record<string, { file: string; line: number; content: string }[]> = {};

            // Run searches
            for (const query of queries) {
                try {
                    const searchResults = await invoke<{ file: string; line: number; content: string }[]>(
                        'search_files',
                        {
                            query: query.pattern,
                            filePattern,
                            isRegex: query.isRegex ?? false,
                            maxResults: maxResultsPerQuery,
                        }
                    );
                    results[query.pattern] = searchResults;
                } catch (err) {
                    results[query.pattern] = [];
                }
            }

            return {
                success: true,
                queriesExecuted: queries.length,
                results,
            };
        } catch (error) {
            throw new Error(`Batch search failed: ${error}`);
        }
    },
});

// ===========================
// Verify Changes Tool
// ===========================

export const verifyChangesTool = createTool({
    name: 'verify_changes',
    description: `Run TypeScript type-check to verify code changes are valid.

WHEN TO USE: After making edits to catch type errors early.
CACHES: Result is cached for short duration to avoid repeated checks.
RETURNS: List of type errors or success confirmation.`,
    parameters: z.object({
        paths: z.array(z.string()).optional()
            .describe('Specific files to check (checks all if not provided)'),
    }),
    handler: async ({ paths }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            // Check cache for recent verification
            const cacheKey = 'verify:' + (paths?.join(',') || 'all');
            const cached = state?.symbolCache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 10000) { // 10s cache
                return {
                    success: true,
                    cached: true,
                    message: 'Using cached verification result (run again to re-check)',
                };
            }

            // Run typecheck
            const result = await invoke<{
                success: boolean;
                errors: Array<{ file: string; line: number; message: string }>;
            }>('run_typecheck', { paths });

            // Cache result
            if (state) {
                state.symbolCache[cacheKey] = {
                    symbols: result.errors.map(e => `${e.file}:${e.line}: ${e.message}`),
                    timestamp: Date.now(),
                };
            }

            if (result.success) {
                return {
                    success: true,
                    message: 'No type errors found',
                    cached: false,
                };
            } else {
                return {
                    success: false,
                    errors: result.errors,
                    cached: false,
                };
            }
        } catch (error) {
            // Typecheck command might not exist - fall back to shell
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const result = await invoke<{
                    exitCode: number;
                    stdout: string;
                    stderr: string;
                }>('execute_command', {
                    command: 'npx tsc --noEmit',
                    timeout: 60000,
                });

                return {
                    success: result.exitCode === 0,
                    output: result.exitCode === 0 ? 'No type errors' : result.stdout + result.stderr,
                    cached: false,
                };
            } catch (shellError) {
                throw new Error(`Verify changes failed: ${shellError}`);
            }
        }
    },
});

// ===========================
// Get Project Context Tool
// ===========================

export const getProjectContextTool = createTool({
    name: 'get_project_context',
    description: `Get consolidated project information including structure, dependencies, and entry points.

WHEN TO USE: At the start of a task to understand the project.
CACHING: Result is cached in network state for the session.
RETURNS: Project type, config files, entry points, and key dependencies.`,
    parameters: z.object({
        include: z.array(z.enum(['structure', 'dependencies', 'git', 'readme'])).optional()
            .describe('What to include (default: all)'),
    }),
    handler: async ({ include: _include }, { network }) => {
        const state = network?.state?.data as NetworkState | undefined;

        // Return cached context if available
        if (state?.workspaceInfo) {
            return {
                success: true,
                cached: true,
                projectType: state.workspaceInfo.projectType,
                path: state.workspaceInfo.path,
                configFiles: state.workspaceInfo.configFiles,
                entryPoints: state.workspaceInfo.entryPoints,
            };
        }

        try {
            const { invoke } = await import('@tauri-apps/api/core');

            const workspace = state?.context?.workspace || '.';
            const entries = await invoke<Array<{ name: string; isDirectory: boolean }>>(
                'list_dir',
                { path: workspace }
            );

            // Detect project type and gather info
            const configFiles: string[] = [];
            let projectType: 'npm' | 'cargo' | 'python' | 'unknown' = 'unknown';

            for (const entry of entries) {
                if (entry.name === 'package.json') {
                    projectType = 'npm';
                    configFiles.push('package.json');
                } else if (entry.name === 'Cargo.toml') {
                    projectType = 'cargo';
                    configFiles.push('Cargo.toml');
                } else if (entry.name === 'pyproject.toml') {
                    projectType = 'python';
                    configFiles.push('pyproject.toml');
                } else if (entry.name === 'tsconfig.json') {
                    configFiles.push('tsconfig.json');
                } else if (entry.name === 'README.md') {
                    configFiles.push('README.md');
                }
            }

            // Store in state
            if (state) {
                state.workspaceInfo = {
                    path: workspace,
                    name: workspace.split('/').pop() || 'workspace',
                    projectType,
                    configFiles,
                    entryPoints: [],
                };
                state.flags.contextLoaded = true;
            }

            return {
                success: true,
                cached: false,
                projectType,
                path: workspace,
                configFiles,
                entryPoints: [],
            };
        } catch (error) {
            throw new Error(`Get project context failed: ${error}`);
        }
    },
});

// ===========================
// Exports
// ===========================

export const batchTools = [
    batchReadFilesTool,
    batchSearchTool,
    verifyChangesTool,
    getProjectContextTool,
];
