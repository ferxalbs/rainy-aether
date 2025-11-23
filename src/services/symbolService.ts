/**
 * Symbol Service
 * Extracts document symbols for breadcrumb and outline functionality
 * Uses Monaco's TypeScript worker for TS/JS and pattern matching for other languages
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
 */
export async function getDocumentSymbols(
  model: monaco.editor.ITextModel
): Promise<SymbolNode[]> {
  const languageId = model.getLanguageId();

  try {
    // Use TypeScript worker for TS/JS files
    if (languageId === 'typescript' || languageId === 'javascript') {
      return await getTypeScriptSymbols(model);
    }

    // For other languages, use pattern matching
    return getPatternBasedSymbols(model);
  } catch (error) {
    console.warn('[SymbolService] Failed to get document symbols:', error);
    return [];
  }
}

/**
 * Get symbols from TypeScript/JavaScript using Monaco's TS worker
 */
async function getTypeScriptSymbols(
  model: monaco.editor.ITextModel
): Promise<SymbolNode[]> {
  try {
    const worker = await monaco.typescript.getTypeScriptWorker();
    const client = await worker(model.uri);

    // Get navigation tree (this is how VS Code gets symbols)
    const navigationTree = await (client as any).getNavigationTree(model.uri.toString());

    if (!navigationTree || !navigationTree.childItems) {
      return [];
    }

    // Convert navigation tree to our symbol format
    return convertNavigationTree(navigationTree.childItems, model);
  } catch (error) {
    console.warn('[SymbolService] TypeScript worker failed, falling back to patterns:', error);
    return getPatternBasedSymbols(model);
  }
}

/**
 * Convert TypeScript navigation tree to SymbolNode format
 */
function convertNavigationTree(
  items: any[],
  model: monaco.editor.ITextModel
): SymbolNode[] {
  const symbols: SymbolNode[] = [];

  for (const item of items) {
    if (!item.spans || item.spans.length === 0) continue;

    const span = item.spans[0];
    const startPos = model.getPositionAt(span.start);
    const endPos = model.getPositionAt(span.start + span.length);

    const kind = convertNavigationKind(item.kind);

    const symbol: SymbolNode = {
      name: item.text,
      kind,
      range: new monaco.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      ),
      selectionRange: new monaco.Range(
        startPos.lineNumber,
        startPos.column,
        startPos.lineNumber,
        startPos.column + item.text.length
      ),
    };

    // Recursively add children
    if (item.childItems && item.childItems.length > 0) {
      symbol.children = convertNavigationTree(item.childItems, model);
    }

    symbols.push(symbol);
  }

  return symbols;
}

/**
 * Convert TypeScript navigation kind to Monaco SymbolKind
 */
function convertNavigationKind(kind: string): monaco.languages.SymbolKind {
  const kindMap: Record<string, monaco.languages.SymbolKind> = {
    'class': monaco.languages.SymbolKind.Class,
    'interface': monaco.languages.SymbolKind.Interface,
    'type': monaco.languages.SymbolKind.Interface,
    'enum': monaco.languages.SymbolKind.Enum,
    'function': monaco.languages.SymbolKind.Function,
    'method': monaco.languages.SymbolKind.Method,
    'property': monaco.languages.SymbolKind.Property,
    'field': monaco.languages.SymbolKind.Field,
    'variable': monaco.languages.SymbolKind.Variable,
    'const': monaco.languages.SymbolKind.Constant,
    'let': monaco.languages.SymbolKind.Variable,
    'constructor': monaco.languages.SymbolKind.Constructor,
    'module': monaco.languages.SymbolKind.Module,
    'namespace': monaco.languages.SymbolKind.Namespace,
  };

  return kindMap[kind] || monaco.languages.SymbolKind.Variable;
}

/**
 * Get symbols using pattern matching (fallback for non-TS languages)
 */
function getPatternBasedSymbols(
  model: monaco.editor.ITextModel
): SymbolNode[] {
  const symbols: SymbolNode[] = [];
  const content = model.getValue();
  const lines = content.split('\n');
  const languageId = model.getLanguageId();

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // TypeScript/JavaScript patterns (fallback)
    if (languageId === 'typescript' || languageId === 'javascript') {
      // Function declarations
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        symbols.push(createSymbol(funcMatch[1], monaco.languages.SymbolKind.Function, lineNumber, line));
        return;
      }

      // Arrow functions
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
      if (arrowMatch) {
        symbols.push(createSymbol(arrowMatch[1], monaco.languages.SymbolKind.Function, lineNumber, line));
        return;
      }

      // Classes
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push(createSymbol(classMatch[1], monaco.languages.SymbolKind.Class, lineNumber, line));
        return;
      }

      // Interfaces
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push(createSymbol(interfaceMatch[1], monaco.languages.SymbolKind.Interface, lineNumber, line));
        return;
      }

      // Type aliases
      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        symbols.push(createSymbol(typeMatch[1], monaco.languages.SymbolKind.Interface, lineNumber, line));
        return;
      }
    }

    // Rust patterns
    if (languageId === 'rust') {
      const fnMatch = line.match(/(?:pub\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        symbols.push(createSymbol(fnMatch[1], monaco.languages.SymbolKind.Function, lineNumber, line));
        return;
      }

      const structMatch = line.match(/(?:pub\s+)?struct\s+(\w+)/);
      if (structMatch) {
        symbols.push(createSymbol(structMatch[1], monaco.languages.SymbolKind.Struct, lineNumber, line));
        return;
      }

      const implMatch = line.match(/impl\s+(?:<[^>]+>\s+)?(\w+)/);
      if (implMatch) {
        symbols.push(createSymbol(implMatch[1], monaco.languages.SymbolKind.Class, lineNumber, line));
        return;
      }
    }

    // HTML patterns
    if (languageId === 'html') {
      const idMatch = line.match(/id=["']([^"']+)["']/);
      if (idMatch) {
        symbols.push(createSymbol(`#${idMatch[1]}`, monaco.languages.SymbolKind.Property, lineNumber, line));
      }
    }

    // CSS patterns
    if (languageId === 'css' || languageId === 'scss' || languageId === 'less') {
      const selectorMatch = line.match(/^([.#]?[\w-]+)\s*\{/);
      if (selectorMatch) {
        symbols.push(createSymbol(selectorMatch[1], monaco.languages.SymbolKind.Class, lineNumber, line));
      }
    }
  });

  return symbols;
}

/**
 * Helper to create a symbol node
 */
function createSymbol(
  name: string,
  kind: monaco.languages.SymbolKind,
  lineNumber: number,
  lineText: string
): SymbolNode {
  const column = lineText.indexOf(name) + 1;

  return {
    name,
    kind,
    range: new monaco.Range(lineNumber, 1, lineNumber, lineText.length + 1),
    selectionRange: new monaco.Range(lineNumber, column, lineNumber, column + name.length),
  };
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
