/**
 * File System Tools
 *
 * Collection of tools for file and directory operations in the workspace.
 */

export * from './read';
export * from './write';
export * from './edit';
export * from './delete';
export * from './rename';
export * from './copy';
export * from './search';

import { fileReadTool } from './read';
import { fileWriteTool } from './write';
import { fileEditTool } from './edit';
import { fileDeleteTool } from './delete';
import { fileRenameTool } from './rename';
import { fileCopyTool } from './copy';
import { fileSearchTool } from './search';
import type { ToolDefinition } from '../types';

/**
 * All file system tools
 */
export const filesystemTools: ToolDefinition<any, any>[] = [
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  fileDeleteTool,
  fileRenameTool,
  fileCopyTool,
  fileSearchTool,
];

/**
 * Register all file system tools with the registry
 */
export function registerFilesystemTools(registry: {
  register: (tool: ToolDefinition<any, any>) => void;
}): void {
  for (const tool of filesystemTools) {
    registry.register(tool);
  }
  console.log(`[FilesystemTools] Registered ${filesystemTools.length} file system tools`);
}
