/**
 * File Search Tool
 *
 * Allows AI agents to search for files by name patterns and content.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for file_search tool
 */
export const fileSearchInputSchema = z.object({
  pattern: z
    .string()
    .optional()
    .describe('Glob pattern to match file names (e.g., "**/*.ts", "src/**/*.tsx")'),
  content: z
    .string()
    .optional()
    .describe('Search for this text within file contents (case-insensitive)'),
  fileType: z
    .string()
    .optional()
    .describe('Filter by file extension (e.g., "ts", "tsx", "rs")'),
  maxResults: z
    .number()
    .int()
    .positive()
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
  excludePatterns: z
    .array(z.string())
    .optional()
    .default(['**/node_modules/**', '**/target/**', '**/.git/**', '**/dist/**', '**/build/**'])
    .describe('Glob patterns to exclude from search'),
});

export type FileSearchInput = z.infer<typeof fileSearchInputSchema>;

/**
 * Output type for file_search tool
 */
export interface FileSearchMatch {
  path: string;
  matches: number;
  lineNumbers?: number[];
  preview?: string;
}

export interface FileSearchOutput {
  files: FileSearchMatch[];
  totalMatches: number;
  truncated: boolean;
}

/**
 * File search tool definition
 */
export const fileSearchTool: ToolDefinition<FileSearchInput, FileSearchOutput> = {
  name: 'file_search',
  description:
    'Search for files in the workspace by name pattern (glob) or content. Can combine both filters. Returns matching file paths with match counts and line numbers for content searches.',
  inputSchema: fileSearchInputSchema,
  category: 'filesystem',
  permissionLevel: 'user', // Search is read-only
  cacheable: true,
  cacheTtlMs: 30000, // 30 second cache
  timeoutMs: 30000,
  rateLimit: {
    maxCalls: 30,
    windowMs: 60000, // 30 searches per minute
  },
  supportsParallel: true,

  async execute(input, context) {
    const { pattern, content, fileType, maxResults, excludePatterns } = input;

    // Validate that at least one search criterion is provided
    if (!pattern && !content && !fileType) {
      throw new Error('Must provide at least one of: pattern, content, or fileType');
    }

    try {
      // Build effective glob pattern
      let effectivePattern = pattern || '**/*';

      // Add file type filter if provided
      if (fileType && !pattern) {
        effectivePattern = `**/*.${fileType}`;
      } else if (fileType && pattern && !pattern.includes('*')) {
        effectivePattern = `${pattern}.${fileType}`;
      }

      // Implement search using available Tauri commands
      // In production, this should be optimized with a dedicated Rust implementation

      // Use glob pattern matching (simplified version)
      // This will be enhanced with a dedicated Rust command in the future
      const matches = await searchFiles({
        workspaceRoot: context.workspaceRoot,
        pattern: effectivePattern,
        content,
        excludePatterns,
        maxResults,
      });

      return {
        files: matches.slice(0, maxResults),
        totalMatches: matches.reduce((sum, m) => sum + m.matches, 0),
        truncated: matches.length > maxResults,
      };
    } catch (error: any) {
      throw new Error(`Failed to search files: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Warn about potentially slow searches
    if (input.content && input.content.length < 3) {
      console.warn('[file_search] Short search terms may return many results');
    }
    return true;
  },
};

/**
 * Helper function to search files
 * TODO: Implement as Rust command for better performance
 */
async function searchFiles(options: {
  workspaceRoot: string;
  pattern: string;
  content?: string;
  excludePatterns: string[];
  maxResults: number;
}): Promise<FileSearchMatch[]> {
  const { workspaceRoot, pattern, content } = options;

  // For MVP, use a simplified approach
  // This will call the existing file reading capabilities

  // First, get project structure to find matching files
  const structure = await invoke<any>('load_project_structure', {
    path: workspaceRoot,
  });

  const results: FileSearchMatch[] = [];

  // Simple glob matching function
  const globMatch = (path: string, pattern: string): boolean => {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    return new RegExp(`^${regex}$`).test(path);
  };

  // Recursively search structure
  const searchNode = (node: any, currentPath: string = '') => {
    if (results.length >= options.maxResults) return;

    const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

    // Check exclude patterns
    for (const excludePattern of options.excludePatterns) {
      if (globMatch(nodePath, excludePattern)) {
        return;
      }
    }

    if (node.children) {
      // Directory
      for (const child of node.children) {
        searchNode(child, nodePath);
      }
    } else {
      // File
      if (globMatch(nodePath, pattern)) {
        results.push({
          path: nodePath,
          matches: content ? 0 : 1, // Will be updated if content search
        });
      }
    }
  };

  searchNode(structure);

  // If content search is requested, filter and count matches
  if (content && results.length > 0) {
    const contentLower = content.toLowerCase();
    const contentResults: FileSearchMatch[] = [];

    for (const result of results) {
      try {
        // Read file content
        const fileContent = await invoke<{ content: string }>('tool_read_file', {
          workspaceRoot,
          path: result.path,
        });

        const lines = fileContent.content.split('\n');
        const matchingLines: number[] = [];
        let matchCount = 0;

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(contentLower)) {
            matchingLines.push(index + 1);
            matchCount++;
          }
        });

        if (matchCount > 0) {
          contentResults.push({
            path: result.path,
            matches: matchCount,
            lineNumbers: matchingLines,
            preview: lines[matchingLines[0] - 1]?.trim().substring(0, 100),
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return contentResults;
  }

  return results;
}
