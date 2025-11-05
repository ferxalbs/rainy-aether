/**
 * File Edit Tool
 *
 * Allows AI agents to edit files using search/replace, insert, and delete operations.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Edit operation schemas
 */
const replaceOperationSchema = z.object({
  type: z.literal('replace'),
  search: z.string().describe('Text to search for'),
  replace: z.string().describe('Text to replace with'),
  all: z.boolean().optional().default(false).describe('Replace all occurrences (default: first only)'),
});

const insertOperationSchema = z.object({
  type: z.literal('insert'),
  line: z.number().int().positive().describe('Line number to insert at (1-indexed)'),
  content: z.string().describe('Content to insert'),
});

const deleteOperationSchema = z.object({
  type: z.literal('delete'),
  startLine: z.number().int().positive().describe('Start line to delete (1-indexed, inclusive)'),
  endLine: z.number().int().positive().describe('End line to delete (1-indexed, inclusive)'),
});

const editOperationSchema = z.discriminatedUnion('type', [
  replaceOperationSchema,
  insertOperationSchema,
  deleteOperationSchema,
]);

/**
 * Input schema for file_edit tool
 */
export const fileEditInputSchema = z.object({
  path: z.string().describe('Relative file path from workspace root'),
  operations: z
    .array(editOperationSchema)
    .min(1)
    .describe('List of edit operations to apply sequentially'),
});

export type FileEditInput = z.infer<typeof fileEditInputSchema>;
export type EditOperation = z.infer<typeof editOperationSchema>;

/**
 * Output type for file_edit tool
 */
export interface FileEditOutput {
  success: boolean;
  diff: string;
  appliedOperations: number;
}

/**
 * File edit tool definition
 */
export const fileEditTool: ToolDefinition<FileEditInput, FileEditOutput> = {
  name: 'file_edit',
  description:
    'Edit an existing file using multiple operations: replace (search/replace text), insert (add lines), or delete (remove line ranges). Operations are applied sequentially. Returns a diff of changes made.',
  inputSchema: fileEditInputSchema,
  category: 'filesystem',
  permissionLevel: 'admin', // Edit operations require admin permission
  cacheable: false,
  timeoutMs: 30000,
  rateLimit: {
    maxCalls: 30,
    windowMs: 60000, // 30 edits per minute
  },

  async execute(input, context) {
    const { path, operations } = input;

    // Validate operations
    for (const op of operations) {
      if (op.type === 'delete') {
        if (op.startLine > op.endLine) {
          throw new Error(
            `Invalid delete operation: startLine (${op.startLine}) must be <= endLine (${op.endLine})`
          );
        }
      }
    }

    try {
      const result = await invoke<FileEditOutput>('tool_edit_file', {
        workspaceRoot: context.workspaceRoot,
        path,
        operations,
      });

      return result;
    } catch (error: any) {
      // Enhance error messages
      if (error.includes('File not found')) {
        throw new Error(`File not found: ${path}. Use file_write to create new files.`);
      }
      if (error.includes('outside workspace')) {
        throw new Error(`Security error: Path is outside workspace: ${path}`);
      }
      throw new Error(`Failed to edit file: ${error}`);
    }
  },

  // Custom validation
  async validate(input) {
    // Warn about large number of operations
    if (input.operations.length > 20) {
      console.warn(
        `[file_edit] Large number of operations (${input.operations.length}) for: ${input.path}`
      );
    }
    return true;
  },
};
