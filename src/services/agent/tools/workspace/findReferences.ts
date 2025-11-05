/**
 * Workspace Find References Tool
 *
 * Allows AI agents to find all references to a symbol in the workspace.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for workspace_find_references tool
 */
export const workspaceFindReferencesInputSchema = z.object({
  symbol: z.string().min(1).describe('Symbol name to find references for'),
  file: z.string().optional().describe('File where symbol is defined (helps narrow search)'),
  line: z.number().int().positive().optional().describe('Line number of symbol definition'),
  includeDeclaration: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include the declaration/definition in results'),
  maxResults: z
    .number()
    .int()
    .positive()
    .optional()
    .default(100)
    .describe('Maximum number of references'),
});

export type WorkspaceFindReferencesInput = z.infer<typeof workspaceFindReferencesInputSchema>;

/**
 * Reference match
 */
export interface ReferenceMatch {
  file: string;
  line: number;
  column: number;
  context: string;
  isDeclaration: boolean;
}

/**
 * Output type for workspace_find_references tool
 */
export interface WorkspaceFindReferencesOutput {
  symbol: string;
  references: ReferenceMatch[];
  totalReferences: number;
  truncated: boolean;
  searchTime: number;
  filesCovered: number;
}

/**
 * Workspace find references tool definition
 */
export const workspaceFindReferencesTool: ToolDefinition<
  WorkspaceFindReferencesInput,
  WorkspaceFindReferencesOutput
> = {
  name: 'workspace_find_references',
  description:
    'Find all references to a symbol (function, class, variable, etc.) across the workspace. Use this to understand how a symbol is used, find all call sites, or track dependencies.',
  inputSchema: workspaceFindReferencesInputSchema,
  category: 'workspace',
  permissionLevel: 'user',
  cacheable: true,
  cacheTtlMs: 60000, // 1 minute cache
  timeoutMs: 30000,
  supportsParallel: true,

  async execute(input, context) {
    const startTime = Date.now();
    const { symbol, file, line, includeDeclaration, maxResults } = input;

    try {
      const references: ReferenceMatch[] = [];
      const filesSearched = new Set<string>();

      // Build search pattern
      // Match word boundaries to avoid partial matches
      const pattern = new RegExp(`\\b${escapeRegExp(symbol)}\\b`, 'g');

      // Get project structure
      const structure = await invoke<any>('load_project_structure', {
        path: context.workspaceRoot,
      });

      // Search for references
      await findReferencesInStructure(
        structure,
        '',
        symbol,
        pattern,
        file,
        line,
        maxResults,
        references,
        filesSearched,
        context.workspaceRoot
      );

      // Sort by file and line
      references.sort((a, b) => {
        if (a.file === b.file) return a.line - b.line;
        return a.file.localeCompare(b.file);
      });

      // Filter declaration if requested
      const filteredReferences = includeDeclaration
        ? references
        : references.filter(ref => !ref.isDeclaration);

      const searchTime = Date.now() - startTime;

      return {
        symbol,
        references: filteredReferences.slice(0, maxResults),
        totalReferences: filteredReferences.length,
        truncated: filteredReferences.length > maxResults,
        searchTime,
        filesCovered: filesSearched.size,
      };
    } catch (error: any) {
      throw new Error(`Failed to find references: ${error}`);
    }
  },
};

/**
 * Recursively find references in directory structure
 */
async function findReferencesInStructure(
  node: any,
  currentPath: string,
  symbol: string,
  pattern: RegExp,
  declarationFile: string | undefined,
  declarationLine: number | undefined,
  maxResults: number,
  results: ReferenceMatch[],
  filesSearched: Set<string>,
  workspaceRoot: string
): Promise<void> {
  if (results.length >= maxResults) return;

  const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

  // Skip common directories
  const skipDirs = ['node_modules', 'target', 'dist', 'build', '.git', '__pycache__', '.next'];
  if (skipDirs.includes(node.name)) return;

  if (node.children) {
    // Directory
    for (const child of node.children) {
      await findReferencesInStructure(
        child,
        nodePath,
        symbol,
        pattern,
        declarationFile,
        declarationLine,
        maxResults,
        results,
        filesSearched,
        workspaceRoot
      );
      if (results.length >= maxResults) break;
    }
  } else {
    // File - check if it's a code file
    const codeExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.rs',
      '.py',
      '.go',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
    ];
    const hasCodeExtension = codeExtensions.some(ext => node.name.endsWith(ext));

    if (!hasCodeExtension) return;

    try {
      // Read file content
      const fileContent = await invoke<{ content: string }>('tool_read_file', {
        workspaceRoot,
        path: nodePath,
      });

      filesSearched.add(nodePath);

      const lines = fileContent.content.split('\n');

      // Search each line for symbol references
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const currentLine = lineIndex + 1;

        // Reset pattern lastIndex for each line
        pattern.lastIndex = 0;

        let match;
        while ((match = pattern.exec(line)) !== null) {
          // Check if this is the declaration
          const isDeclaration =
            declarationFile === nodePath && declarationLine === currentLine;

          // Get context (current line + surrounding lines)
          const contextLines = [];
          if (lineIndex > 0) contextLines.push(lines[lineIndex - 1]);
          contextLines.push(line);
          if (lineIndex < lines.length - 1) contextLines.push(lines[lineIndex + 1]);

          results.push({
            file: nodePath,
            line: currentLine,
            column: match.index + 1,
            context: contextLines.join('\n').trim().substring(0, 200),
            isDeclaration,
          });

          if (results.length >= maxResults) return;
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
