/**
 * Symbol Service
 * Extracts document symbols using Monaco's built-in DocumentSymbolProvider
 * This provides VS Code-like breadcrumb and outline functionality
 */

import * as monaco from 'monaco-editor';

export interface SymbolNode {
  name: string;
  detail?: string;
  kind: monaco.languages.SymbolKind;
  range: monaco.Range;
  selectionRange: monaco.Range;
  children?: SymbolNode[];
}

/**
 * Extract document symbols from Monaco editor model
 * Uses Monaco's built-in language services instead of regex patterns
 */
export async function getDocumentSymbols(
  model: monaco.editor.ITextModel
): Promise<SymbolNode[]> {
  try {
    // Use Monaco's executeDocumentSymbolProvider to get symbols
    const symbols = await monaco.languages.executeDocumentSymbolProvider(model.uri);

    if (!symbols || symbols.length === 0) {
      return [];
    }

    // Convert Monaco symbols to our format
    return convertSymbols(symbols);
  } catch (error) {
    console.warn('[SymbolService] Failed to get document symbols:', error);
    return [];
  }
}

/**
 * Convert Monaco's DocumentSymbol format to our SymbolNode format
 */
function convertSymbols(
  symbols: monaco.languages.DocumentSymbol[]
): SymbolNode[] {
  return symbols.map((symbol) => ({
    name: symbol.name,
    detail: symbol.detail,
    kind: symbol.kind,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
    children: symbol.children ? convertSymbols(symbol.children) : undefined,
  }));
}

/**
 * Find the symbol path at a given position
 * Returns an array of symbols from root to the most specific symbol at position
 */
export function findSymbolPathAtPosition(
  symbols: SymbolNode[],
  position: monaco.Position
): SymbolNode[] {
  for (const symbol of symbols) {
    if (containsPosition(symbol.range, position)) {
      const path = [symbol];

      // Check children recursively
      if (symbol.children && symbol.children.length > 0) {
        const childPath = findSymbolPathAtPosition(symbol.children, position);
        if (childPath.length > 0) {
          return path.concat(childPath);
        }
      }

      return path;
    }
  }

  return [];
}

/**
 * Check if a range contains a position
 */
function containsPosition(range: monaco.Range, position: monaco.Position): boolean {
  if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
    return false;
  }
  if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
    return false;
  }
  if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
    return false;
  }
  return true;
}

/**
 * Get a human-readable name for a symbol kind
 */
export function getSymbolKindName(kind: monaco.languages.SymbolKind): string {
  const kindMap: Record<number, string> = {
    [monaco.languages.SymbolKind.File]: 'File',
    [monaco.languages.SymbolKind.Module]: 'Module',
    [monaco.languages.SymbolKind.Namespace]: 'Namespace',
    [monaco.languages.SymbolKind.Package]: 'Package',
    [monaco.languages.SymbolKind.Class]: 'Class',
    [monaco.languages.SymbolKind.Method]: 'Method',
    [monaco.languages.SymbolKind.Property]: 'Property',
    [monaco.languages.SymbolKind.Field]: 'Field',
    [monaco.languages.SymbolKind.Constructor]: 'Constructor',
    [monaco.languages.SymbolKind.Enum]: 'Enum',
    [monaco.languages.SymbolKind.Interface]: 'Interface',
    [monaco.languages.SymbolKind.Function]: 'Function',
    [monaco.languages.SymbolKind.Variable]: 'Variable',
    [monaco.languages.SymbolKind.Constant]: 'Constant',
    [monaco.languages.SymbolKind.String]: 'String',
    [monaco.languages.SymbolKind.Number]: 'Number',
    [monaco.languages.SymbolKind.Boolean]: 'Boolean',
    [monaco.languages.SymbolKind.Array]: 'Array',
    [monaco.languages.SymbolKind.Object]: 'Object',
    [monaco.languages.SymbolKind.Key]: 'Key',
    [monaco.languages.SymbolKind.Null]: 'Null',
    [monaco.languages.SymbolKind.EnumMember]: 'EnumMember',
    [monaco.languages.SymbolKind.Struct]: 'Struct',
    [monaco.languages.SymbolKind.Event]: 'Event',
    [monaco.languages.SymbolKind.Operator]: 'Operator',
    [monaco.languages.SymbolKind.TypeParameter]: 'TypeParameter',
  };

  return kindMap[kind] || 'Unknown';
}

/**
 * Flatten symbol tree into a flat list (useful for outline views)
 */
export function flattenSymbols(symbols: SymbolNode[], level = 0): Array<SymbolNode & { level: number }> {
  const result: Array<SymbolNode & { level: number }> = [];

  for (const symbol of symbols) {
    result.push({ ...symbol, level });

    if (symbol.children && symbol.children.length > 0) {
      result.push(...flattenSymbols(symbol.children, level + 1));
    }
  }

  return result;
}

/**
 * Get all symbols of a specific kind
 */
export function getSymbolsByKind(
  symbols: SymbolNode[],
  kind: monaco.languages.SymbolKind
): SymbolNode[] {
  const result: SymbolNode[] = [];

  for (const symbol of symbols) {
    if (symbol.kind === kind) {
      result.push(symbol);
    }

    if (symbol.children && symbol.children.length > 0) {
      result.push(...getSymbolsByKind(symbol.children, kind));
    }
  }

  return result;
}

/**
 * Search symbols by name (supports partial matching)
 */
export function searchSymbols(symbols: SymbolNode[], query: string): SymbolNode[] {
  const lowerQuery = query.toLowerCase();
  const result: SymbolNode[] = [];

  for (const symbol of symbols) {
    if (symbol.name.toLowerCase().includes(lowerQuery)) {
      result.push(symbol);
    }

    if (symbol.children && symbol.children.length > 0) {
      result.push(...searchSymbols(symbol.children, query));
    }
  }

  return result;
}
