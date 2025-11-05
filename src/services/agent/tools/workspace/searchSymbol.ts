/**
 * Workspace Search Symbol Tool
 *
 * Allows AI agents to search for code symbols (functions, classes, etc.) in the workspace.
 */

import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { ToolDefinition } from '../types';

/**
 * Input schema for workspace_search_symbol tool
 */
export const workspaceSearchSymbolInputSchema = z.object({
  query: z.string().min(1).describe('Symbol name or pattern to search for'),
  type: z
    .enum(['function', 'class', 'interface', 'type', 'variable', 'any'])
    .optional()
    .default('any')
    .describe('Type of symbol to search for'),
  filePattern: z
    .string()
    .optional()
    .describe('File pattern to search in (e.g., "**/*.ts", "src/**/*.tsx")'),
  maxResults: z
    .number()
    .int()
    .positive()
    .optional()
    .default(50)
    .describe('Maximum number of results'),
  caseSensitive: z.boolean().optional().default(false).describe('Case-sensitive search'),
});

export type WorkspaceSearchSymbolInput = z.infer<typeof workspaceSearchSymbolInputSchema>;

/**
 * Symbol match result
 */
export interface SymbolMatch {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'other';
  file: string;
  line: number;
  column?: number;
  preview: string;
  signature?: string;
}

/**
 * Output type for workspace_search_symbol tool
 */
export interface WorkspaceSearchSymbolOutput {
  symbols: SymbolMatch[];
  totalResults: number;
  truncated: boolean;
  searchTime: number;
}

/**
 * Workspace search symbol tool definition
 */
export const workspaceSearchSymbolTool: ToolDefinition<
  WorkspaceSearchSymbolInput,
  WorkspaceSearchSymbolOutput
> = {
  name: 'workspace_search_symbol',
  description:
    'Search for code symbols (functions, classes, interfaces, types, variables) across the workspace. Use this to find where something is defined, locate implementations, or understand code structure.',
  inputSchema: workspaceSearchSymbolInputSchema,
  category: 'workspace',
  permissionLevel: 'user',
  cacheable: true,
  cacheTtlMs: 60000, // 1 minute cache
  timeoutMs: 30000,
  supportsParallel: true,

  async execute(input, context) {
    const startTime = Date.now();
    const { query, type, maxResults, caseSensitive } = input;

    try {
      // Build search patterns based on symbol type
      const patterns = buildSymbolPatterns(query, type, caseSensitive);

      // Search files for symbols
      const symbols: SymbolMatch[] = [];

      // Get project structure to search
      const structure = await invoke<any>('load_project_structure', {
        path: context.workspaceRoot,
      });

      // Search files for symbols
      await searchForSymbols(
        structure,
        '',
        patterns,
        type,
        maxResults,
        symbols,
        context.workspaceRoot
      );

      const searchTime = Date.now() - startTime;

      return {
        symbols: symbols.slice(0, maxResults),
        totalResults: symbols.length,
        truncated: symbols.length > maxResults,
        searchTime,
      };
    } catch (error: any) {
      throw new Error(`Failed to search symbols: ${error}`);
    }
  },
};

/**
 * Build regex patterns for symbol types
 */
function buildSymbolPatterns(
  query: string,
  type: string,
  caseSensitive: boolean
): RegExp[] {
  const flags = caseSensitive ? 'g' : 'gi';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const patterns: RegExp[] = [];

  if (type === 'function' || type === 'any') {
    // Function patterns for TypeScript/JavaScript
    patterns.push(
      new RegExp(`function\\s+${escapedQuery}\\s*\\(`, flags),
      new RegExp(`const\\s+${escapedQuery}\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>`, flags),
      new RegExp(`\\s+${escapedQuery}\\s*\\([^)]*\\)\\s*{`, flags), // Method
      // Rust function
      new RegExp(`fn\\s+${escapedQuery}\\s*[<(]`, flags)
    );
  }

  if (type === 'class' || type === 'any') {
    patterns.push(
      new RegExp(`class\\s+${escapedQuery}\\s*[{<(]`, flags),
      new RegExp(`struct\\s+${escapedQuery}\\s*[{<]`, flags) // Rust
    );
  }

  if (type === 'interface' || type === 'type' || type === 'any') {
    patterns.push(
      new RegExp(`interface\\s+${escapedQuery}\\s*[{<]`, flags),
      new RegExp(`type\\s+${escapedQuery}\\s*=`, flags)
    );
  }

  if (type === 'variable' || type === 'any') {
    patterns.push(
      new RegExp(`(?:const|let|var)\\s+${escapedQuery}\\s*[=:]`, flags),
      new RegExp(`\\s+${escapedQuery}\\s*:\\s*\\w+`, flags) // Typed variable
    );
  }

  return patterns;
}

/**
 * Recursively search for symbols in directory structure
 */
async function searchForSymbols(
  node: any,
  currentPath: string,
  patterns: RegExp[],
  type: string,
  maxResults: number,
  results: SymbolMatch[],
  workspaceRoot: string
): Promise<void> {
  if (results.length >= maxResults) return;

  const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

  // Skip common directories
  const skipDirs = ['node_modules', 'target', 'dist', 'build', '.git', '__pycache__'];
  if (skipDirs.includes(node.name)) return;

  if (node.children) {
    // Directory
    for (const child of node.children) {
      await searchForSymbols(child, nodePath, patterns, type, maxResults, results, workspaceRoot);
      if (results.length >= maxResults) break;
    }
  } else {
    // File - check if it's a code file
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '.go', '.java'];
    const hasCodeExtension = codeExtensions.some(ext => node.name.endsWith(ext));

    if (!hasCodeExtension) return;

    try {
      // Read file content
      const fileContent = await invoke<{ content: string }>('tool_read_file', {
        workspaceRoot,
        path: nodePath,
      });

      const lines = fileContent.content.split('\n');

      // Search each line for symbol patterns
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        for (const pattern of patterns) {
          const match = pattern.exec(line);
          if (match) {
            // Determine symbol type from pattern
            const symbolType = detectSymbolType(line);

            results.push({
              name: extractSymbolName(line, match),
              type: symbolType,
              file: nodePath,
              line: lineIndex + 1,
              column: match.index,
              preview: line.trim().substring(0, 100),
              signature: line.trim(),
            });

            if (results.length >= maxResults) return;
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }
}

/**
 * Detect symbol type from line content
 */
function detectSymbolType(line: string): SymbolMatch['type'] {
  if (/\bfunction\b/.test(line) || /\bfn\b/.test(line) || /=>/.test(line)) return 'function';
  if (/\bclass\b/.test(line) || /\bstruct\b/.test(line)) return 'class';
  if (/\binterface\b/.test(line)) return 'interface';
  if (/\btype\b/.test(line)) return 'type';
  if (/\b(?:const|let|var)\b/.test(line)) return 'variable';
  return 'other';
}

/**
 * Extract symbol name from matched line
 */
function extractSymbolName(line: string, match: RegExpExecArray): string {
  // Try to extract the actual symbol name
  const afterMatch = line.substring(match.index);
  const nameMatch = afterMatch.match(/\b(\w+)\b/);
  return nameMatch ? nameMatch[1] : 'unknown';
}
