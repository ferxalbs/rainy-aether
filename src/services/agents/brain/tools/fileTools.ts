/**
 * AgentKit Tools - File Operations
 * 
 * Tools for file system operations using Tauri IPC.
 * All operations are sandboxed through Tauri's security model.
 */

import { createTool } from '@inngest/agent-kit';
import { z } from 'zod';

// ===========================
// Read File Tool
// ===========================

export const readFileTool = createTool({
    name: 'read_file',
    description: 'Read the contents of a file. Returns the file content as a string.',
    parameters: z.object({
        path: z.string().describe('Absolute or relative path to the file to read'),
    }),
    handler: async ({ path }, { network }) => {
        try {
            // Dynamic import to avoid bundling issues in sidecar
            const { invoke } = await import('@tauri-apps/api/core');
            const content = await invoke<string>('read_text_file', { path });

            // Track in network state
            if (network?.state?.data) {
                network.state.data.lastReadFile = path;
                network.state.data.filesRead = (network.state.data.filesRead || 0) + 1;
            }

            return content;
        } catch (error) {
            throw new Error(`Failed to read file ${path}: ${error}`);
        }
    },
});

// ===========================
// Write File Tool
// ===========================

export const writeFileTool = createTool({
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file with new content.',
    parameters: z.object({
        path: z.string().describe('Path where the file should be written'),
        content: z.string().describe('The complete content to write to the file'),
    }),
    handler: async ({ path, content }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('write_file', { path, content });

            if (network?.state?.data) {
                network.state.data.lastWrittenFile = path;
                network.state.data.filesWritten = (network.state.data.filesWritten || 0) + 1;
            }

            return { success: true, path, bytesWritten: content.length };
        } catch (error) {
            throw new Error(`Failed to write file ${path}: ${error}`);
        }
    },
});

// ===========================
// Edit File Tool
// ===========================

export const editFileTool = createTool({
    name: 'edit_file',
    description: 'Edit a file by replacing a specific string with new content. Use for targeted modifications.',
    parameters: z.object({
        path: z.string().describe('Path to the file to edit'),
        oldString: z.string().describe('The exact string to find and replace'),
        newString: z.string().describe('The string to replace it with'),
    }),
    handler: async ({ path, oldString, newString }, { network }) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            // Read current content
            const content = await invoke<string>('read_text_file', { path });

            // Check if old string exists
            if (!content.includes(oldString)) {
                return {
                    success: false,
                    error: 'Target string not found in file',
                    path,
                };
            }

            // Replace and write
            const updated = content.replace(oldString, newString);
            await invoke('write_file', { path, content: updated });

            if (network?.state?.data) {
                network.state.data.filesEdited = (network.state.data.filesEdited || 0) + 1;
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
    description: 'List files and directories in a given path.',
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
    description: 'Search for a pattern across files in the workspace using grep.',
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
