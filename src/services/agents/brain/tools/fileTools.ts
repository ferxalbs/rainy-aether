/**
 * AgentKit Tools - File Operations
 * 
 * Tools for file system operations using Tauri IPC.
 * Features:
 * - File caching via network.state to avoid redundant reads
 * - Cache invalidation on writes
 * - All operations sandboxed through Tauri's security model
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';
import {
    type NetworkState,
    getCachedFile,
    setCachedFile,
    invalidateCachedFile,
    CACHE_CONFIG,
} from '../types';

// ===========================
// Read File Tool (with caching)
// ===========================

export const readFileTool = createTool({
    name: 'read_file',
    description: `Read file contents with automatic caching.

CACHING: Files are cached for ${CACHE_CONFIG.FILE_TTL_MS / 1000}s. Repeated reads return cached content (no disk access).
WHEN TO USE: Reading one specific file when you know the exact path.
WHEN NOT TO USE: For reading 2+ files, use 'fs_batch_read' instead (more token-efficient).
RETURNS: File content as string. Files >${CACHE_CONFIG.MAX_FILE_SIZE / 1024}KB are not cached.`,
    parameters: z.object({
        path: z.string().describe('Absolute or relative path to the file to read'),
        bypass_cache: z.boolean().optional().describe('Force read from disk, ignoring cache'),
    }),
    handler: async ({ path, bypass_cache }, { network }) => {
        try {
            const state = network?.state?.data as NetworkState | undefined;

            // Check cache first (unless bypass requested)
            if (!bypass_cache && state) {
                const cached = getCachedFile(state, path);
                if (cached) {
                    console.log(`[read_file] Cache HIT: ${path}`);
                    return cached.content;
                }
            }

            // Dynamic import to avoid bundling issues in sidecar
            const { invoke } = await import('@tauri-apps/api/core');
            const content = await invoke<string>('read_text_file', { path });

            // Store in cache
            if (state) {
                setCachedFile(state, path, content);
                console.log(`[read_file] Cached: ${path} (${content.length} bytes)`);
            }

            return content;
        } catch (error) {
            throw new Error(`Failed to read file ${path}: ${error}`);
        }
    },
});


// ===========================
// Write File Tool (with cache invalidation)
// ===========================

export const writeFileTool = createTool({
    name: 'write_file',
    description: `Create or overwrite a file. Invalidates file cache on success.

WHEN TO USE: Creating new files OR completely replacing file contents.
WHEN NOT TO USE: For targeted modifications, use 'edit_file' instead.
CACHE: Automatically invalidates cached content for this path.`,
    parameters: z.object({
        path: z.string().describe('Path where the file should be written'),
        content: z.string().describe('The complete content to write to the file'),
    }),
    handler: async ({ path, content }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('write_file', { path, content });

            const state = network?.state?.data as NetworkState | undefined;
            if (state) {
                // Invalidate cache for this file
                invalidateCachedFile(state, path);

                // Track write stats
                const existing = state.context.relevantFiles;
                if (!existing.includes(path)) {
                    state.context.relevantFiles = [...existing, path];
                }
            }

            return { success: true, path, bytesWritten: content.length };
        } catch (error) {
            throw new Error(`Failed to write file ${path}: ${error}`);
        }
    },
});

// ===========================
// Edit File Tool (with cache invalidation)
// ===========================

export const editFileTool = createTool({
    name: 'edit_file',
    description: `Replace specific text in a file. Uses cache for read, invalidates on write.

WHEN TO USE: Small, targeted modifications to existing code.
WHEN NOT TO USE: For multiple edits, use 'smart_edit'. For new files, use 'write_file'.
CACHE: Reads from cache if available, invalidates after successful edit.
ERRORS: "Text not found" → Read file first to get exact text including whitespace.`,
    parameters: z.object({
        path: z.string().describe('Path to the file to edit'),
        oldString: z.string().describe('The exact string to find and replace'),
        newString: z.string().describe('The string to replace it with'),
    }),
    handler: async ({ path, oldString, newString }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const state = network?.state?.data as NetworkState | undefined;

            // Try cache first for read
            let content: string;
            const cached = state ? getCachedFile(state, path) : undefined;

            if (cached) {
                console.log(`[edit_file] Using cached content for: ${path}`);
                content = cached.content;
            } else {
                content = await invoke<string>('read_text_file', { path });
            }

            // Check if old string exists
            if (!content.includes(oldString)) {
                return {
                    success: false,
                    error: 'Target string not found in file',
                    path,
                    hint: 'Ensure oldString matches exactly, including whitespace and line breaks',
                };
            }

            // Count occurrences
            const occurrences = content.split(oldString).length - 1;
            if (occurrences > 1) {
                return {
                    success: false,
                    error: `Target string appears ${occurrences} times in file`,
                    path,
                    hint: 'Include more surrounding context to make oldString unique',
                };
            }

            // Replace and write
            const updated = content.replace(oldString, newString);
            await invoke('write_file', { path, content: updated });

            // Invalidate cache since content changed
            if (state) {
                invalidateCachedFile(state, path);

                // Update relevant files
                const existing = state.context.relevantFiles;
                if (!existing.includes(path)) {
                    state.context.relevantFiles = [...existing, path];
                }
            }

            return { success: true, path, replacements: 1 };
        } catch (error) {
            throw new Error(`Failed to edit file ${path}: ${error}`);
        }
    },
});

// ===========================
// List Directory Tool
// ===========================

export const listDirectoryTool = createTool({
    name: 'list_directory',
    description: 'List files and directories in a given path (one level only).',
    parameters: z.object({
        path: z.string().describe('Path to the directory to list'),
    }),
    handler: async ({ path }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const entries = await invoke<{ name: string; isDirectory: boolean; size: number }[]>(
                'list_dir',
                { path }
            );
            return entries;
        } catch (error) {
            throw new Error(`Failed to list directory ${path}: ${error}`);
        }
    },
});

// ===========================
// Search Code Tool
// ===========================

export const searchCodeTool = createTool({
    name: 'search_code',
    description: `Search for text/regex patterns across the codebase using grep.

WHEN TO USE: Finding where a function/variable/string is used.
WHEN NOT TO USE: For finding symbol definitions (functions, classes), use 'find_symbols'.
TIP: Use filePattern to narrow scope (e.g., "*.ts" for TypeScript only).`,
    parameters: z.object({
        query: z.string().describe('The search pattern to look for'),
        filePattern: z.string().optional().describe('Glob pattern to filter files (e.g., "*.ts")'),
        isRegex: z.boolean().optional().describe('Whether to treat query as regex'),
        maxResults: z.number().optional().describe('Maximum number of results to return'),
    }),
    handler: async ({ query, filePattern, isRegex, maxResults }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const results = await invoke<{ file: string; line: number; content: string }[]>(
                'search_files',
                { query, filePattern, isRegex: isRegex ?? false, maxResults: maxResults ?? 50 }
            );
            return results;
        } catch (error) {
            throw new Error(`Search failed: ${error}`);
        }
    },
});

// ===========================
// Exports
// ===========================

import { applyFileDiffTool, checkPendingDiffTool } from './applyFileDiffTool';

export const fileTools = [
    readFileTool,
    writeFileTool,
    editFileTool,
    applyFileDiffTool,
    checkPendingDiffTool,
    listDirectoryTool,
    searchCodeTool,
];

export { applyFileDiffTool, checkPendingDiffTool };
