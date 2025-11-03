/**
 * Monaco LSP Adapter
 * Integrates LSP services with Monaco Editor
 */

import * as monaco from 'monaco-editor';
import { getLSPService } from './lspService';

/**
 * Register LSP features with Monaco Editor
 */
export function registerLSPWithMonaco(): void {
  const lspService = getLSPService();

  // Track open documents
  const openDocuments = new Set<string>();

  // Listen to model additions (file opened)
  monaco.editor.onDidCreateModel((model) => {
    const uri = model.uri.toString();
    const languageId = model.getLanguageId();
    const content = model.getValue();

    openDocuments.add(uri);
    lspService.openDocument(uri, languageId, content);

    // Listen to content changes
    model.onDidChangeContent(() => {
      const newContent = model.getValue();
      lspService.updateDocument(uri, newContent, model.getVersionId());
    });
  });

  // Listen to model disposals (file closed)
  monaco.editor.onWillDisposeModel((model) => {
    const uri = model.uri.toString();
    openDocuments.delete(uri);
    lspService.closeDocument(uri);
  });

  console.info('[LSP] Monaco adapter registered');
}

/**
 * Create custom LSP providers for Monaco
 * These can override or extend Monaco's built-in language services
 */
export function registerCustomLSPProviders(): void {
  // For now, we rely on Monaco's built-in TypeScript language service
  // which already provides excellent IntelliSense for TS/JS

  // In the future, we can register custom providers here:
  // - monaco.languages.registerCompletionItemProvider
  // - monaco.languages.registerHoverProvider
  // - monaco.languages.registerDefinitionProvider
  // etc.

  console.info('[LSP] Custom LSP providers ready (using Monaco built-ins)');
}
