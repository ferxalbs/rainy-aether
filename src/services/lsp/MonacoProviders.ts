/**
 * Monaco LSP Providers
 * Connects LSP capabilities to Monaco Editor providers
 */

import * as monaco from 'monaco-editor';
import { LSPClient } from './lspClient';
import type {
  CompletionItem as LSPCompletionItem,
  Location as LSPLocation,
  DocumentSymbol as LSPDocumentSymbol,
} from './types';

/**
 * Convert Monaco position to LSP position (0-based)
 */
function toLSPPosition(position: monaco.Position): { line: number; character: number } {
  return {
    line: position.lineNumber - 1, // Monaco is 1-based, LSP is 0-based
    character: position.column - 1,
  };
}


/**
 * Convert LSP range to Monaco range
 */
function toMonacoRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): monaco.Range {
  return new monaco.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1
  );
}

/**
 * Convert Monaco range to LSP range
 */
function toLSPRange(range: monaco.Range): { start: { line: number; character: number }; end: { line: number; character: number } } {
  return {
    start: {
      line: range.startLineNumber - 1,
      character: range.startColumn - 1,
    },
    end: {
      line: range.endLineNumber - 1,
      character: range.endColumn - 1,
    },
  };
}

/**
 * Create Monaco Completion Provider from LSP Client
 */
export function createCompletionProvider(client: LSPClient): monaco.languages.CompletionItemProvider {
  return {
    async provideCompletionItems(model, position, _context, _token) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const items = await client.getCompletions(uri, lspPos.line, lspPos.character);

      return {
        suggestions: items.map((item: LSPCompletionItem) => {
          // Map LSP CompletionItemKind to Monaco CompletionItemKind
          let kind = monaco.languages.CompletionItemKind.Text;
          if (item.kind) {
            // LSP kinds: 1=Text, 2=Method, 3=Function, 4=Constructor, 5=Field, etc.
            const kindMap: Record<number, monaco.languages.CompletionItemKind> = {
              1: monaco.languages.CompletionItemKind.Text,
              2: monaco.languages.CompletionItemKind.Method,
              3: monaco.languages.CompletionItemKind.Function,
              4: monaco.languages.CompletionItemKind.Constructor,
              5: monaco.languages.CompletionItemKind.Field,
              6: monaco.languages.CompletionItemKind.Variable,
              7: monaco.languages.CompletionItemKind.Class,
              8: monaco.languages.CompletionItemKind.Interface,
              9: monaco.languages.CompletionItemKind.Module,
              10: monaco.languages.CompletionItemKind.Property,
              11: monaco.languages.CompletionItemKind.Unit,
              12: monaco.languages.CompletionItemKind.Value,
              13: monaco.languages.CompletionItemKind.Enum,
              14: monaco.languages.CompletionItemKind.Keyword,
              15: monaco.languages.CompletionItemKind.Snippet,
              16: monaco.languages.CompletionItemKind.Color,
              17: monaco.languages.CompletionItemKind.File,
              18: monaco.languages.CompletionItemKind.Reference,
              19: monaco.languages.CompletionItemKind.Folder,
              20: monaco.languages.CompletionItemKind.EnumMember,
              21: monaco.languages.CompletionItemKind.Constant,
              22: monaco.languages.CompletionItemKind.Struct,
              23: monaco.languages.CompletionItemKind.Event,
              24: monaco.languages.CompletionItemKind.Operator,
              25: monaco.languages.CompletionItemKind.TypeParameter,
            };
            kind = kindMap[item.kind] || monaco.languages.CompletionItemKind.Text;
          }

          const suggestion: monaco.languages.CompletionItem = {
            label: item.label,
            kind,
            insertText: item.insertText || item.label,
            detail: item.detail,
            documentation: typeof item.documentation === 'string'
              ? item.documentation
              : item.documentation?.value,
            sortText: item.sortText,
            filterText: item.filterText,
            range: undefined as any, // Will be filled by Monaco
          };

          return suggestion;
        }),
      };
    },
  };
}

/**
 * Create Monaco Hover Provider from LSP Client
 */
export function createHoverProvider(client: LSPClient): monaco.languages.HoverProvider {
  return {
    async provideHover(model, position, _token) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const hover = await client.getHover(uri, lspPos.line, lspPos.character);

      if (!hover || !hover.contents) {
        return null;
      }

      // Convert LSP hover contents to Monaco markdown strings
      let contents: monaco.IMarkdownString[] = [];

      if (typeof hover.contents === 'string') {
        contents = [{ value: hover.contents }];
      } else if (Array.isArray(hover.contents)) {
        contents = hover.contents.map((content: any) => {
          if (typeof content === 'string') {
            return { value: content };
          }
          return { value: content.value, isTrusted: true };
        });
      } else if (typeof hover.contents === 'object' && 'value' in hover.contents) {
        contents = [{ value: (hover.contents as any).value, isTrusted: true }];
      }

      const range = hover.range ? toMonacoRange(hover.range) : undefined;

      return {
        contents,
        range,
      };
    },
  };
}

/**
 * Create Monaco Definition Provider from LSP Client
 */
export function createDefinitionProvider(client: LSPClient): monaco.languages.DefinitionProvider {
  return {
    async provideDefinition(model, position, _token) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const locations = await client.getDefinition(uri, lspPos.line, lspPos.character);

      return locations.map((loc: LSPLocation) => ({
        uri: monaco.Uri.parse(loc.uri),
        range: toMonacoRange(loc.range),
      }));
    },
  };
}

/**
 * Create Monaco References Provider from LSP Client
 */
export function createReferencesProvider(client: LSPClient): monaco.languages.ReferenceProvider {
  return {
    async provideReferences(model, position, _context, _token) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const locations = await client.getReferences(uri, lspPos.line, lspPos.character);

      return locations.map((loc: LSPLocation) => ({
        uri: monaco.Uri.parse(loc.uri),
        range: toMonacoRange(loc.range),
      }));
    },
  };
}

/**
 * Create Monaco Document Symbol Provider from LSP Client
 */
export function createDocumentSymbolProvider(client: LSPClient): monaco.languages.DocumentSymbolProvider {
  return {
    async provideDocumentSymbols(model, _token) {
      const uri = model.uri.toString();

      const symbols = await client.getDocumentSymbols(uri);

      function convertSymbol(symbol: LSPDocumentSymbol): monaco.languages.DocumentSymbol {
        // Map LSP SymbolKind to Monaco SymbolKind
        const kindMap: Record<number, monaco.languages.SymbolKind> = {
          1: monaco.languages.SymbolKind.File,
          2: monaco.languages.SymbolKind.Module,
          3: monaco.languages.SymbolKind.Namespace,
          4: monaco.languages.SymbolKind.Package,
          5: monaco.languages.SymbolKind.Class,
          6: monaco.languages.SymbolKind.Method,
          7: monaco.languages.SymbolKind.Property,
          8: monaco.languages.SymbolKind.Field,
          9: monaco.languages.SymbolKind.Constructor,
          10: monaco.languages.SymbolKind.Enum,
          11: monaco.languages.SymbolKind.Interface,
          12: monaco.languages.SymbolKind.Function,
          13: monaco.languages.SymbolKind.Variable,
          14: monaco.languages.SymbolKind.Constant,
          15: monaco.languages.SymbolKind.String,
          16: monaco.languages.SymbolKind.Number,
          17: monaco.languages.SymbolKind.Boolean,
          18: monaco.languages.SymbolKind.Array,
          19: monaco.languages.SymbolKind.Object,
          20: monaco.languages.SymbolKind.Key,
          21: monaco.languages.SymbolKind.Null,
          22: monaco.languages.SymbolKind.EnumMember,
          23: monaco.languages.SymbolKind.Struct,
          24: monaco.languages.SymbolKind.Event,
          25: monaco.languages.SymbolKind.Operator,
          26: monaco.languages.SymbolKind.TypeParameter,
        };

        const kind = kindMap[symbol.kind] || monaco.languages.SymbolKind.Variable;

        const monacoSymbol: monaco.languages.DocumentSymbol = {
          name: symbol.name,
          detail: symbol.detail || '',
          kind,
          range: toMonacoRange(symbol.range),
          selectionRange: toMonacoRange(symbol.selectionRange),
          children: symbol.children ? symbol.children.map(convertSymbol) : undefined,
          tags: [], // Monaco expects tags property
        };

        return monacoSymbol;
      }

      return symbols.map(convertSymbol);
    },
  };
}

/**
 * Create Monaco Signature Help Provider from LSP Client
 */
export function createSignatureHelpProvider(client: LSPClient): monaco.languages.SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],

    async provideSignatureHelp(model, position, _token, _context) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const signatureHelp = await client.getSignatureHelp(uri, lspPos.line, lspPos.character);

      if (!signatureHelp || !signatureHelp.signatures) {
        return null;
      }

      const result: monaco.languages.SignatureHelpResult = {
        value: {
          activeSignature: signatureHelp.activeSignature ?? 0,
          activeParameter: signatureHelp.activeParameter ?? 0,
          signatures: signatureHelp.signatures.map(sig => ({
            label: sig.label,
            documentation: typeof sig.documentation === 'string'
              ? { value: sig.documentation }
              : sig.documentation,
            parameters: sig.parameters?.map(param => ({
              label: param.label,
              documentation: typeof param.documentation === 'string'
                ? { value: param.documentation }
                : param.documentation,
            })) || [],
          })),
        },
        dispose: () => {}, // Required by SignatureHelpResult
      };

      return result;
    },
  };
}

/**
 * Create Monaco Document Formatting Provider from LSP Client
 */
export function createDocumentFormattingProvider(client: LSPClient): monaco.languages.DocumentFormattingEditProvider {
  return {
    async provideDocumentFormattingEdits(model, options, _token) {
      const uri = model.uri.toString();

      const workspaceEdit = await client.formatDocument(uri, {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces,
      });

      if (!workspaceEdit) {
        return [];
      }

      // Convert workspace edit to text edits
      const edits: monaco.languages.TextEdit[] = [];

      if (workspaceEdit.changes) {
        const changes = workspaceEdit.changes[uri];
        if (changes) {
          edits.push(...changes.map((change: any) => ({
            range: toMonacoRange(change.range),
            text: change.newText,
          })));
        }
      }

      return edits;
    },
  };
}

/**
 * Create Monaco Document Range Formatting Provider from LSP Client
 */
export function createDocumentRangeFormattingProvider(client: LSPClient): monaco.languages.DocumentRangeFormattingEditProvider {
  return {
    async provideDocumentRangeFormattingEdits(model, range, options, _token) {
      const uri = model.uri.toString();
      const lspRange = toLSPRange(range);

      const workspaceEdit = await client.formatRange(uri, lspRange, {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces,
      });

      if (!workspaceEdit) {
        return [];
      }

      // Convert workspace edit to text edits
      const edits: monaco.languages.TextEdit[] = [];

      if (workspaceEdit.changes) {
        const changes = workspaceEdit.changes[uri];
        if (changes) {
          edits.push(...changes.map((change: any) => ({
            range: toMonacoRange(change.range),
            text: change.newText,
          })));
        }
      }

      return edits;
    },
  };
}

/**
 * Create Monaco Rename Provider from LSP Client
 */
export function createRenameProvider(client: LSPClient): monaco.languages.RenameProvider {
  return {
    async provideRenameEdits(model, position, newName, _token) {
      const uri = model.uri.toString();
      const lspPos = toLSPPosition(position);

      const workspaceEdit = await client.rename(uri, lspPos.line, lspPos.character, newName);

      if (!workspaceEdit) {
        return {
          edits: [],
        };
      }

      // Convert workspace edit to resource edits
      const edits: monaco.languages.IWorkspaceTextEdit[] = [];

      if (workspaceEdit.changes) {
        for (const [fileUri, changes] of Object.entries(workspaceEdit.changes)) {
          for (const change of changes as any[]) {
            edits.push({
              resource: monaco.Uri.parse(fileUri),
              versionId: undefined,
              textEdit: {
                range: toMonacoRange(change.range),
                text: change.newText,
              },
            });
          }
        }
      }

      return {
        edits,
      };
    },
  };
}

/**
 * Register all LSP providers for a language with Monaco
 */
export function registerLSPProviders(languageId: string, client: LSPClient): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  const capabilities = client.getCapabilities();

  // Register completion provider
  if (capabilities.completionProvider) {
    disposables.push(
      monaco.languages.registerCompletionItemProvider(languageId, createCompletionProvider(client))
    );
  }

  // Register hover provider
  if (capabilities.hoverProvider) {
    disposables.push(
      monaco.languages.registerHoverProvider(languageId, createHoverProvider(client))
    );
  }

  // Register definition provider
  if (capabilities.definitionProvider) {
    disposables.push(
      monaco.languages.registerDefinitionProvider(languageId, createDefinitionProvider(client))
    );
  }

  // Register references provider
  if (capabilities.referencesProvider) {
    disposables.push(
      monaco.languages.registerReferenceProvider(languageId, createReferencesProvider(client))
    );
  }

  // Register document symbol provider
  if (capabilities.documentSymbolProvider) {
    disposables.push(
      monaco.languages.registerDocumentSymbolProvider(languageId, createDocumentSymbolProvider(client))
    );
  }

  // Register signature help provider
  if (capabilities.signatureHelpProvider) {
    disposables.push(
      monaco.languages.registerSignatureHelpProvider(languageId, createSignatureHelpProvider(client))
    );
  }

  // Register document formatting provider
  if (capabilities.documentFormattingProvider) {
    disposables.push(
      monaco.languages.registerDocumentFormattingEditProvider(languageId, createDocumentFormattingProvider(client))
    );
  }

  // Register document range formatting provider
  if (capabilities.documentRangeFormattingProvider) {
    disposables.push(
      monaco.languages.registerDocumentRangeFormattingEditProvider(languageId, createDocumentRangeFormattingProvider(client))
    );
  }

  // Register rename provider
  if (capabilities.renameProvider) {
    disposables.push(
      monaco.languages.registerRenameProvider(languageId, createRenameProvider(client))
    );
  }

  console.info(`[LSP] Registered ${disposables.length} providers for language: ${languageId}`);

  return disposables;
}
