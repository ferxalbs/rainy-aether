import * as monaco from 'monaco-editor';

/**
 * Diagnostic severity levels matching Monaco's MarkerSeverity
 */
export enum DiagnosticSeverity {
  Error = 8,
  Warning = 4,
  Info = 2,
  Hint = 1,
}

/**
 * Diagnostic source types
 */
export enum DiagnosticSource {
  Monaco = 'monaco',
  TypeScript = 'typescript',
  Git = 'git',
  Linter = 'linter',
  Custom = 'custom',
}

/**
 * Diagnostic item interface
 */
export interface Diagnostic {
  id: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string | number;
  relatedInformation?: {
    file: string;
    line: number;
    column: number;
    message: string;
  }[];
}

/**
 * Diagnostic statistics
 */
export interface DiagnosticStats {
  errors: number;
  warnings: number;
  info: number;
  hints: number;
  total: number;
}

type DiagnosticListener = (diagnostics: Diagnostic[], stats: DiagnosticStats) => void;

/**
 * Centralized diagnostic service
 * Collects and manages diagnostics from multiple sources
 */
class DiagnosticService {
  private diagnostics: Map<string, Diagnostic> = new Map();
  private listeners: Set<DiagnosticListener> = new Set();
  private monacoDisposables: monaco.IDisposable[] = [];

  constructor() {
    this.initializeMonacoMarkerListener();
  }

  /**
   * Initialize Monaco marker listener
   */
  private initializeMonacoMarkerListener() {
    // Listen to marker changes from Monaco
    const disposable = monaco.editor.onDidChangeMarkers((uris) => {
      uris.forEach((uri) => {
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        this.updateMonacoMarkers(uri.toString(), markers);
      });
    });

    this.monacoDisposables.push(disposable);
  }

  /**
   * Update diagnostics from Monaco markers
   */
  private updateMonacoMarkers(uri: string, markers: monaco.editor.IMarker[]) {
    // Remove old Monaco diagnostics for this URI
    const keysToDelete: string[] = [];
    this.diagnostics.forEach((diagnostic, key) => {
      if (diagnostic.source === DiagnosticSource.Monaco && diagnostic.file === uri) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.diagnostics.delete(key));

    // Add new diagnostics
    markers.forEach((marker, index) => {
      const diagnostic: Diagnostic = {
        id: `monaco-${uri}-${index}`,
        source: DiagnosticSource.Monaco,
        severity: marker.severity as unknown as DiagnosticSeverity,
        message: marker.message,
        file: uri,
        line: marker.startLineNumber,
        column: marker.startColumn,
        endLine: marker.endLineNumber,
        endColumn: marker.endColumn,
        code: typeof marker.code === 'string' ? marker.code : marker.code?.value,
      };

      this.diagnostics.set(diagnostic.id, diagnostic);
    });

    this.notifyListeners();
  }

  /**
   * Add or update a diagnostic
   */
  addDiagnostic(diagnostic: Diagnostic) {
    this.diagnostics.set(diagnostic.id, diagnostic);
    this.notifyListeners();
  }

  /**
   * Add multiple diagnostics
   */
  addDiagnostics(diagnostics: Diagnostic[]) {
    diagnostics.forEach((diagnostic) => {
      this.diagnostics.set(diagnostic.id, diagnostic);
    });
    this.notifyListeners();
  }

  /**
   * Remove a diagnostic by ID
   */
  removeDiagnostic(id: string) {
    this.diagnostics.delete(id);
    this.notifyListeners();
  }

  /**
   * Remove diagnostics by source
   */
  removeDiagnosticsBySource(source: DiagnosticSource) {
    const keysToDelete: string[] = [];
    this.diagnostics.forEach((diagnostic, key) => {
      if (diagnostic.source === source) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.diagnostics.delete(key));
    this.notifyListeners();
  }

  /**
   * Remove diagnostics by file
   */
  removeDiagnosticsByFile(file: string) {
    const keysToDelete: string[] = [];
    this.diagnostics.forEach((diagnostic, key) => {
      if (diagnostic.file === file) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.diagnostics.delete(key));
    this.notifyListeners();
  }

  /**
   * Clear all diagnostics
   */
  clearAll() {
    this.diagnostics.clear();
    this.notifyListeners();
  }

  /**
   * Get all diagnostics
   */
  getAllDiagnostics(): Diagnostic[] {
    return Array.from(this.diagnostics.values());
  }

  /**
   * Get diagnostics by file
   */
  getDiagnosticsByFile(file: string): Diagnostic[] {
    return this.getAllDiagnostics().filter((d) => d.file === file);
  }

  /**
   * Get diagnostics by source
   */
  getDiagnosticsBySource(source: DiagnosticSource): Diagnostic[] {
    return this.getAllDiagnostics().filter((d) => d.source === source);
  }

  /**
   * Get diagnostics by severity
   */
  getDiagnosticsBySeverity(severity: DiagnosticSeverity): Diagnostic[] {
    return this.getAllDiagnostics().filter((d) => d.severity === severity);
  }

  /**
   * Get diagnostic statistics
   */
  getStats(): DiagnosticStats {
    const diagnostics = this.getAllDiagnostics();
    const stats: DiagnosticStats = {
      errors: 0,
      warnings: 0,
      info: 0,
      hints: 0,
      total: diagnostics.length,
    };

    diagnostics.forEach((diagnostic) => {
      switch (diagnostic.severity) {
        case DiagnosticSeverity.Error:
          stats.errors++;
          break;
        case DiagnosticSeverity.Warning:
          stats.warnings++;
          break;
        case DiagnosticSeverity.Info:
          stats.info++;
          break;
        case DiagnosticSeverity.Hint:
          stats.hints++;
          break;
      }
    });

    return stats;
  }

  /**
   * Subscribe to diagnostic changes
   */
  subscribe(listener: DiagnosticListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getAllDiagnostics(), this.getStats());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const diagnostics = this.getAllDiagnostics();
    const stats = this.getStats();
    
    this.listeners.forEach((listener) => {
      try {
        listener(diagnostics, stats);
      } catch (error) {
        console.error('Diagnostic listener error:', error);
      }
    });
  }

  /**
   * Dispose the service
   */
  dispose() {
    this.monacoDisposables.forEach((disposable) => disposable.dispose());
    this.monacoDisposables = [];
    this.diagnostics.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let diagnosticServiceInstance: DiagnosticService | null = null;

/**
 * Get the diagnostic service instance
 */
export function getDiagnosticService(): DiagnosticService {
  if (!diagnosticServiceInstance) {
    diagnosticServiceInstance = new DiagnosticService();
  }
  return diagnosticServiceInstance;
}

/**
 * Dispose the diagnostic service
 */
export function disposeDiagnosticService() {
  if (diagnosticServiceInstance) {
    diagnosticServiceInstance.dispose();
    diagnosticServiceInstance = null;
  }
}
