/**
 * Workspace Structure Tool
 *
 * Allows AI agents to get the project directory structure.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for workspace_structure tool
 */
export const workspaceStructureInputSchema = z.object({
  path: z.string().optional().default('.').describe('Relative path to explore (default: root)'),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum depth to traverse'),
  exclude: z
    .array(z.string())
    .optional()
    .default(['node_modules', 'target', '.git', 'dist', 'build', '.next', '__pycache__'])
    .describe('Directory names to exclude'),
  filesOnly: z.boolean().optional().default(false).describe('Only show files, not directories'),
});

export type WorkspaceStructureInput = z.infer<typeof workspaceStructureInputSchema>;

/**
 * Directory node structure
 */
export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryNode[];
}

/**
 * Output type for workspace_structure tool
 */
export interface WorkspaceStructureOutput {
  tree: string; // ASCII tree representation
  structure: DirectoryNode;
  files: number;
  directories: number;
  totalSize: number;
}

/**
 * Workspace structure tool definition
 */
export const workspaceStructureTool: ToolDefinition<
  WorkspaceStructureInput,
  WorkspaceStructureOutput
> = {
  name: 'workspace_structure',
  description:
    'Get the directory structure of the workspace as an ASCII tree. Use this to understand project organization, find files, or navigate the codebase. Excludes common build artifacts and dependencies by default.',
  inputSchema: workspaceStructureInputSchema,
  category: 'workspace',
  permissionLevel: 'user',
  cacheable: true,
  cacheTtlMs: 30000, // 30 second cache
  timeoutMs: 15000,
  supportsParallel: true,

  async execute(input, context) {
    const { path, maxDepth, exclude, filesOnly } = input;

    try {
      // Load project structure from existing Tauri command
      const fullPath = path === '.' ? context.workspaceRoot : `${context.workspaceRoot}/${path}`;

      const structure = await invoke<DirectoryNode>('load_project_structure', {
        path: fullPath,
      });

      // Filter and process structure
      const filtered = filterStructure(structure, maxDepth, exclude, filesOnly, 0);

      // Generate ASCII tree
      const tree = generateTree(filtered, '', true);

      // Calculate statistics
      const stats = calculateStats(filtered);

      return {
        tree,
        structure: filtered,
        files: stats.files,
        directories: stats.directories,
        totalSize: stats.totalSize,
      };
    } catch (error: any) {
      if (error.includes('not found') || error.includes('does not exist')) {
        throw new Error(`Path not found: ${path}`);
      }
      if (error.includes('permission denied') || error.includes('access')) {
        throw new Error(`Permission denied: Cannot access ${path}`);
      }
      throw new Error(`Failed to get workspace structure: ${error}`);
    }
  },
};

/**
 * Filter directory structure based on criteria
 */
function filterStructure(
  node: DirectoryNode,
  maxDepth: number,
  exclude: string[],
  filesOnly: boolean,
  currentDepth: number
): DirectoryNode {
  // Check if excluded
  if (exclude.includes(node.name)) {
    return { ...node, children: [] };
  }

  // If files only and this is a directory, skip
  if (filesOnly && node.type === 'directory' && !node.children) {
    return { ...node, children: [] };
  }

  // Process children if within depth limit
  if (node.children && currentDepth < maxDepth) {
    const filteredChildren = node.children
      .map(child => filterStructure(child, maxDepth, exclude, filesOnly, currentDepth + 1))
      .filter(child => {
        // Keep files always
        if (child.type === 'file') return true;
        // Keep directories with children
        if (child.children && child.children.length > 0) return true;
        // Skip empty directories if filesOnly
        return !filesOnly;
      });

    return {
      ...node,
      children: filteredChildren.length > 0 ? filteredChildren : undefined,
    };
  }

  return node;
}

/**
 * Generate ASCII tree representation
 */
function generateTree(node: DirectoryNode, prefix: string = '', isLast: boolean = true): string {
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';

  let result = prefix + connector + node.name;

  if (node.type === 'file' && node.size !== undefined) {
    const sizeStr = formatSize(node.size);
    result += ` (${sizeStr})`;
  }

  result += '\n';

  if (node.children) {
    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      result += generateTree(child, prefix + extension, childIsLast);
    });
  }

  return result;
}

/**
 * Calculate statistics for directory tree
 */
function calculateStats(node: DirectoryNode): {
  files: number;
  directories: number;
  totalSize: number;
} {
  let files = 0;
  let directories = 0;
  let totalSize = 0;

  if (node.type === 'file') {
    files = 1;
    totalSize = node.size || 0;
  } else {
    directories = 1;
  }

  if (node.children) {
    for (const child of node.children) {
      const childStats = calculateStats(child);
      files += childStats.files;
      directories += childStats.directories;
      totalSize += childStats.totalSize;
    }
  }

  return { files, directories, totalSize };
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}
