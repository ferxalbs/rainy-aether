/**
 * Monaco LSP Adapter
 * Integrates LSP services with Monaco Editor
 */

import * as monaco from 'monaco-editor';
import { getLSPService } from './lspService';
import { registerLSPProviders } from './MonacoProviders';
import { getMarkerService, type IMarkerData, MarkerSeverity } from '../markerService';

const LSP_MARKER_OWNER = 'lsp';
const MONACO_MARKER_OWNER = 'monaco';
const BUILTIN_DIAGNOSTIC_LANGUAGES = new Set(['typescript', 'javascript', 'json', 'css', 'html']);

const providerDisposablesByLanguage = new Map<string, monaco.IDisposable[]>();
const openModelCountByLanguage = new Map<string, number>();

/**
 * Register LSP features with Monaco Editor
 */
export function registerLSPWithMonaco(): void {
  const lspService = getLSPService();
  const markerService = getMarkerService();

  // Listen to model additions (file opened)
  monaco.editor.onDidCreateModel((model) => {
    const uri = model.uri.toString();
    const languageId = model.getLanguageId();
    const content = model.getValue();

    ensureProvidersForLanguage(languageId);
    incrementLanguageUsage(languageId);
    void lspService.openDocument(uri, languageId, content);

    // Listen to content changes
    const contentDisposable = model.onDidChangeContent(() => {
      const newContent = model.getValue();
      void lspService.updateDocument(uri, newContent, model.getVersionId());
    });

    // Track Monaco's built-in diagnostics for supported languages
    const monacoDiagnosticsDisposable = BUILTIN_DIAGNOSTIC_LANGUAGES.has(languageId)
      ? registerMonacoDiagnosticTracking(model)
      : null;

    model.onWillDispose(() => {
      contentDisposable.dispose();
      monacoDiagnosticsDisposable?.dispose();
      decrementLanguageUsage(languageId);
      clearModelMarkers(model);
      clearStoreMarkers(uri, markerService);
    });
  });

  // Listen to model disposals (file closed)
  monaco.editor.onWillDisposeModel((model) => {
    const uri = model.uri.toString();
    void lspService.closeDocument(uri);
  });

  function ensureProvidersForLanguage(languageId: string): void {
    if (providerDisposablesByLanguage.has(languageId)) {
      return;
    }

    const client = lspService.getClientForLanguage(languageId);
    if (!client) {
      return;
    }

    providerDisposablesByLanguage.set(languageId, registerLSPProviders(languageId, client));
  }

  function incrementLanguageUsage(languageId: string): void {
    openModelCountByLanguage.set(languageId, (openModelCountByLanguage.get(languageId) || 0) + 1);
  }

  function decrementLanguageUsage(languageId: string): void {
    const current = openModelCountByLanguage.get(languageId) || 0;
    if (current <= 1) {
      openModelCountByLanguage.delete(languageId);
      const disposables = providerDisposablesByLanguage.get(languageId);
      if (disposables) {
        disposables.forEach((disposable) => disposable.dispose());
        providerDisposablesByLanguage.delete(languageId);
      }
      return;
    }

    openModelCountByLanguage.set(languageId, current - 1);
  }

  console.info('[LSP] Monaco adapter registered');
}

/**
 * Register Monaco's built-in TypeScript/JavaScript diagnostic tracking
 */
function registerMonacoDiagnosticTracking(model: monaco.editor.ITextModel): monaco.IDisposable {
  const markerService = getMarkerService();
  const uri = model.uri;
  const uriString = uri.toString();

  // Track if model is disposed to prevent updates after disposal
  let isDisposed = false;

  // Function to check if diagnostic should be shown
  const shouldShowDiagnostic = (marker: monaco.editor.IMarker): boolean => {
    // Only show errors and warnings, skip hints and info in Problems panel
    if (marker.severity < monaco.MarkerSeverity.Warning) {
      return false;
    }

    // Filter out some common false positives by message pattern
    const message = marker.message.toLowerCase();

    // Skip node_modules errors (usually from external library definitions)
    if (message.includes('node_modules')) {
      return false;
    }

    // Note: Previously filtered out these real errors - now showing them:
    // - "cannot find module" - let Monaco's built-in filtering handle this
    // - "implicitly has type 'any'" - real TypeScript issue, user should fix

    return true;
  };

  // Function to sync Monaco diagnostics to our diagnostic service
  const syncDiagnostics = () => {
    // Skip if model is disposed
    if (isDisposed) {
      return;
    }

    const markers = monaco.editor.getModelMarkers({ resource: uri });

    // Filter and add new diagnostics with deduplication
    const relevantMarkers = markers.filter(shouldShowDiagnostic);
    const seenIds = new Set<string>();
    const markerData: IMarkerData[] = [];

    relevantMarkers.forEach((marker) => {
      const severity = marker.severity === monaco.MarkerSeverity.Error
        ? MarkerSeverity.Error
        : marker.severity === monaco.MarkerSeverity.Warning
          ? MarkerSeverity.Warning
          : MarkerSeverity.Info;

      // Generate unique ID based on content (prevents duplicates)
      const codeStr = marker.code?.toString() || '';
      const diagnosticId = `monaco-${uriString}-${marker.startLineNumber}-${marker.startColumn}-${codeStr}`;

      // Skip if we've already added this diagnostic (deduplication)
      if (seenIds.has(diagnosticId)) {
        return;
      }
      seenIds.add(diagnosticId);

      markerData.push({
        severity,
        message: marker.message,
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
        code: codeStr,
        source: marker.source || MONACO_MARKER_OWNER,
      });
    });

    markerService.changeAll(MONACO_MARKER_OWNER, [{ resource: uriString, markers: markerData }]);
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
    }, 150); // Reduced debounce to 150ms for faster feedback
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
  // Initial sync after a delay to let Monaco compute diagnostics
  setTimeout(() => {
    if (!isDisposed) {
      syncDiagnostics();
    }
  }, 500); // Reduced from 1.5s to 500ms for faster initial feedback

  return {
    dispose: () => {
      isDisposed = true;

      if (syncTimeout !== null) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }

      contentChangeDisposable.dispose();
      markerChangeDisposable.dispose();
      markerService.remove(MONACO_MARKER_OWNER, [uriString]);
    },
  };
}

function clearModelMarkers(model: monaco.editor.ITextModel): void {
  monaco.editor.setModelMarkers(model, LSP_MARKER_OWNER, []);
  monaco.editor.setModelMarkers(model, MONACO_MARKER_OWNER, []);
}

function clearStoreMarkers(resource: string, markerService: ReturnType<typeof getMarkerService>): void {
  markerService.remove(LSP_MARKER_OWNER, [resource]);
  markerService.remove(MONACO_MARKER_OWNER, [resource]);
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
