/**
 * Monaco LSP Adapter
 * Integrates LSP services with Monaco Editor
 */

import * as monaco from 'monaco-editor';
import { getLSPService } from './lspService';
import { getDiagnosticService, DiagnosticSource, DiagnosticSeverity } from '../diagnosticService';

/**
 * Register LSP features with Monaco Editor
 */
export function registerLSPWithMonaco(): void {
  const lspService = getLSPService();
  const diagnosticService = getDiagnosticService();

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

    // Track Monaco's built-in TypeScript/JavaScript diagnostics
    if (languageId === 'typescript' || languageId === 'javascript') {
      registerMonacoDiagnosticTracking(model);
    }
  });

  // Listen to model disposals (file closed)
  monaco.editor.onWillDisposeModel((model) => {
    const uri = model.uri.toString();
    openDocuments.delete(uri);
    lspService.closeDocument(uri);

    // Clear diagnostics for closed file
    const allDiagnostics = diagnosticService.getAllDiagnostics();
    allDiagnostics
      .filter((d: { file?: string }) => d.file === uri)
      .forEach((d: { id: string }) => diagnosticService.removeDiagnostic(d.id));
  });

  console.info('[LSP] Monaco adapter registered with diagnostic tracking');
}

/**
 * Register Monaco's built-in TypeScript/JavaScript diagnostic tracking
 */
function registerMonacoDiagnosticTracking(model: monaco.editor.ITextModel): void {
  const diagnosticService = getDiagnosticService();
  const uri = model.uri;
  const uriString = uri.toString();

  // Track if model is disposed to prevent updates after disposal
  let isDisposed = false;

  // Additional diagnostic codes to filter out (beyond Monaco's configuration)
  const ignoredCodes = new Set([
    // These are already in Monaco config but double-check
    2307, 2792, 7016, 2688, 2304,
    1192, 1259, 1479,
    7006, 7031, 7034,
    2614, 2769,
    6133, 6196,
    1371, 1345,

    // Additional noise filters
    2305, // Module has no exported member
    2339, // Property does not exist on type (often false positive)
    2322, // Type is not assignable (too aggressive in editor)
    80001, // File is a CommonJS module
    80005, // 'require' call may be converted to an import
    80006, // This may be converted to an async function
  ]);

  // Function to check if diagnostic should be shown
  const shouldShowDiagnostic = (marker: monaco.editor.IMarker): boolean => {
    // Filter by code
    const code = typeof marker.code === 'string'
      ? parseInt(marker.code, 10)
      : typeof marker.code === 'object' && marker.code?.value
      ? parseInt(marker.code.value.toString(), 10)
      : null;

    if (code && ignoredCodes.has(code)) {
      return false;
    }

    // Only show errors and warnings, skip hints and info in Problems panel
    if (marker.severity < monaco.MarkerSeverity.Warning) {
      return false;
    }

    // Filter out some common false positives by message pattern
    const message = marker.message.toLowerCase();

    // Skip node_modules errors
    if (message.includes('node_modules')) {
      return false;
    }

    // Skip "cannot find module" variations
    if (message.includes('cannot find module') || message.includes('could not find')) {
      return false;
    }

    // Skip implicit any for now (too noisy)
    if (message.includes('implicitly has') && message.includes('any')) {
      return false;
    }

    return true;
  };

  // Function to sync Monaco diagnostics to our diagnostic service
  const syncDiagnostics = () => {
    // Skip if model is disposed
    if (isDisposed) {
      return;
    }

    const markers = monaco.editor.getModelMarkers({ resource: uri });

    // Clear previous Monaco diagnostics for this file
    const allDiagnostics = diagnosticService.getAllDiagnostics();
    allDiagnostics
      .filter((d: { source: DiagnosticSource; file?: string }) =>
        d.source === DiagnosticSource.Monaco && d.file === uriString)
      .forEach((d: { id: string }) => diagnosticService.removeDiagnostic(d.id));

    // Filter and add new diagnostics
    const relevantMarkers = markers.filter(shouldShowDiagnostic);

    relevantMarkers.forEach((marker, index) => {
      const severity = marker.severity === monaco.MarkerSeverity.Error
        ? DiagnosticSeverity.Error
        : marker.severity === monaco.MarkerSeverity.Warning
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Info;

      diagnosticService.addDiagnostic({
        id: `monaco-${uriString}-${index}`,
        source: DiagnosticSource.Monaco,
        severity,
        message: marker.message,
        file: uriString,
        line: marker.startLineNumber,
        column: marker.startColumn,
        code: marker.code?.toString(),
      });
    });
  };

  // Track changes with debouncing
  let syncTimeout: number | null = null;
  const debouncedSync = () => {
    if (isDisposed) {
      return;
    }

    if (syncTimeout !== null) {
      clearTimeout(syncTimeout);
    }
    syncTimeout = window.setTimeout(() => {
      syncDiagnostics();
      syncTimeout = null;
    }, 300); // Debounce 300ms for faster feedback
  };

  // Register event listeners
  const contentChangeDisposable = model.onDidChangeContent(debouncedSync);

  // Track marker changes globally
  const markerChangeDisposable = monaco.editor.onDidChangeMarkers((changedResources) => {
    if (!isDisposed && changedResources.some(resource => resource.toString() === uriString)) {
      debouncedSync();
    }
  });

  // Cleanup on model disposal - CRITICAL to prevent memory leaks
  model.onWillDispose(() => {
    // Mark as disposed
    isDisposed = true;

    // Clear any pending timeout
    if (syncTimeout !== null) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }

    // Dispose event listeners
    contentChangeDisposable.dispose();
    markerChangeDisposable.dispose();

    // Clear diagnostics for this file
    const allDiagnostics = diagnosticService.getAllDiagnostics();
    allDiagnostics
      .filter((d: { source: DiagnosticSource; file?: string }) =>
        d.source === DiagnosticSource.Monaco && d.file === uriString)
      .forEach((d: { id: string }) => diagnosticService.removeDiagnostic(d.id));
  });

  // Initial sync after a delay to let Monaco compute diagnostics
  // Longer delay for initial sync to reduce false positives
  setTimeout(() => {
    if (!isDisposed) {
      syncDiagnostics();
    }
  }, 1500); // 1.5s initial delay for more accurate diagnostics
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
