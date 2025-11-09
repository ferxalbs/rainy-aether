/**
 * DEPRECATED: Use markerService.ts instead
 * This file provides backward compatibility for existing code
 */
import {
  MarkerService,
  getMarkerService,
  disposeMarkerService,
  IMarker,
  MarkerSeverity,
  MarkerStatistics,
  IMarkerData,
} from './markerService';

// Re-export with old names for backward compatibility
export { MarkerSeverity as DiagnosticSeverity };

/**
 * Diagnostic source types (deprecated)
 */
export enum DiagnosticSource {
  Monaco = 'monaco',
  TypeScript = 'typescript',
  LSP = 'lsp',
  Git = 'git',
  Linter = 'linter',
  Custom = 'custom',
}

/**
 * Diagnostic item interface (deprecated)
 * Maps to IMarker from markerService
 */
export interface Diagnostic {
  id: string; // Legacy ID field (derived from owner + resource + position)
  source: DiagnosticSource; // Maps to owner
  severity: MarkerSeverity;
  message: string;
  file?: string; // Maps to resource
  line?: number; // Maps to startLineNumber
  column?: number; // Maps to startColumn
  endLine?: number; // Maps to endLineNumber
  endColumn?: number; // Maps to endColumn
  code?: string | number;
  relatedInformation?: {
    file: string;
    line: number;
    column: number;
    message: string;
  }[];
}

/**
 * Diagnostic statistics (compatible with MarkerStatistics)
 */
export interface DiagnosticStats {
  errors: number;
  warnings: number;
  info: number; // Maps to infos
  hints: number;
  total: number;
}

type DiagnosticListener = (diagnostics: Diagnostic[], stats: DiagnosticStats) => void;

/**
 * Convert IMarker to legacy Diagnostic format
 */
function markerToDiagnostic(marker: IMarker): Diagnostic {
  return {
    id: `${marker.owner}-${marker.resource}-${marker.startLineNumber}-${marker.startColumn}`,
    source: marker.owner as DiagnosticSource,
    severity: marker.severity,
    message: marker.message,
    file: marker.resource,
    line: marker.startLineNumber,
    column: marker.startColumn,
    endLine: marker.endLineNumber,
    endColumn: marker.endColumn,
    code: typeof marker.code === 'string' ? marker.code : marker.code?.value,
    relatedInformation: marker.relatedInformation?.map((info) => ({
      file: info.resource,
      line: info.startLineNumber,
      column: info.startColumn,
      message: info.message,
    })),
  };
}

/**
 * Convert legacy Diagnostic to IMarkerData format
 */
function diagnosticToMarkerData(diagnostic: Diagnostic): IMarkerData {
  return {
    severity: diagnostic.severity,
    message: diagnostic.message,
    startLineNumber: diagnostic.line || 1,
    startColumn: diagnostic.column || 1,
    endLineNumber: diagnostic.endLine || diagnostic.line || 1,
    endColumn: diagnostic.endColumn || diagnostic.column || 1,
    code: diagnostic.code?.toString(),
    source: diagnostic.source,
    relatedInformation: diagnostic.relatedInformation?.map((info) => ({
      resource: info.file,
      message: info.message,
      startLineNumber: info.line,
      startColumn: info.column,
      endLineNumber: info.line,
      endColumn: info.column + 1,
    })),
  };
}

/**
 * Convert MarkerStatistics to DiagnosticStats
 */
function markerStatsToDiagnosticStats(stats: MarkerStatistics): DiagnosticStats {
  return {
    errors: stats.errors,
    warnings: stats.warnings,
    info: stats.infos,
    hints: stats.hints,
    total: stats.total,
  };
}

/**
 * Centralized diagnostic service (deprecated)
 * This is a compatibility wrapper around MarkerService
 */
class DiagnosticService {
  private markerService: MarkerService;
  private legacyListeners: Map<DiagnosticListener, () => void> = new Map();

  constructor() {
    this.markerService = getMarkerService();
  }

  /**
   * Add or update a diagnostic
   */
  addDiagnostic(diagnostic: Diagnostic): void {
    const resource = diagnostic.file || 'unknown';
    const owner = diagnostic.source || DiagnosticSource.Custom;
    const markerData = diagnosticToMarkerData(diagnostic);

    // Get existing markers for this owner+resource
    const existingMarkers = this.markerService.read({ owner, resource });

    // Convert to IMarkerData and add the new one
    const markersData: IMarkerData[] = existingMarkers.map((m) => ({
      severity: m.severity,
      message: m.message,
      startLineNumber: m.startLineNumber,
      startColumn: m.startColumn,
      endLineNumber: m.endLineNumber,
      endColumn: m.endColumn,
      code: m.code,
      source: m.source,
      tags: m.tags,
      relatedInformation: m.relatedInformation,
    }));

    // Add the new marker
    markersData.push(markerData);

    // Update the marker service
    this.markerService.changeOne(owner, resource, markersData);

    // Notify legacy listeners
    this.notifyLegacyListeners();
  }

  /**
   * Add multiple diagnostics
   */
  addDiagnostics(diagnostics: Diagnostic[]): void {
    diagnostics.forEach((diagnostic) => {
      this.addDiagnostic(diagnostic);
    });
  }

  /**
   * Remove a diagnostic by ID (best effort)
   */
  removeDiagnostic(id: string): void {
    // Parse ID to get owner and resource
    const parts = id.split('-');
    if (parts.length < 4) return;

    const owner = parts[0];
    const resource = parts.slice(1, -2).join('-');

    // Get existing markers and filter out the one with matching ID
    const existingMarkers = this.markerService.read({ owner, resource });
    const filtered = existingMarkers.filter((m) => {
      const markerId = `${m.owner}-${m.resource}-${m.startLineNumber}-${m.startColumn}`;
      return markerId !== id;
    });

    // Update with filtered markers
    const markersData: IMarkerData[] = filtered.map((m) => ({
      severity: m.severity,
      message: m.message,
      startLineNumber: m.startLineNumber,
      startColumn: m.startColumn,
      endLineNumber: m.endLineNumber,
      endColumn: m.endColumn,
      code: m.code,
      source: m.source,
      tags: m.tags,
      relatedInformation: m.relatedInformation,
    }));

    this.markerService.changeOne(owner, resource, markersData);
    this.notifyLegacyListeners();
  }

  /**
   * Remove diagnostics by source
   */
  removeDiagnosticsBySource(source: DiagnosticSource): void {
    const markers = this.markerService.read({ owner: source });
    const resources = [...new Set(markers.map((m) => m.resource))];

    this.markerService.remove(source, resources);
    this.notifyLegacyListeners();
  }

  /**
   * Remove diagnostics by file
   */
  removeDiagnosticsByFile(file: string): void {
    // Get all owners that have markers for this file
    const allMarkers = this.markerService.read({ resource: file });
    const owners = [...new Set(allMarkers.map((m) => m.owner))];

    // Remove markers for each owner
    owners.forEach((owner) => {
      this.markerService.remove(owner, [file]);
    });

    this.notifyLegacyListeners();
  }

  /**
   * Clear all diagnostics
   */
  clearAll(): void {
    // Get all markers and clear by owner
    const allMarkers = this.markerService.read();
    const owners = [...new Set(allMarkers.map((m) => m.owner))];

    owners.forEach((owner) => {
      const resources = [...new Set(allMarkers.filter((m) => m.owner === owner).map((m) => m.resource))];
      this.markerService.remove(owner, resources);
    });

    this.notifyLegacyListeners();
  }

  /**
   * Get all diagnostics
   */
  getAllDiagnostics(): Diagnostic[] {
    const markers = this.markerService.read();
    return markers.map(markerToDiagnostic);
  }

  /**
   * Get diagnostics by file
   */
  getDiagnosticsByFile(file: string): Diagnostic[] {
    const markers = this.markerService.read({ resource: file });
    return markers.map(markerToDiagnostic);
  }

  /**
   * Get diagnostics by source
   */
  getDiagnosticsBySource(source: DiagnosticSource): Diagnostic[] {
    const markers = this.markerService.read({ owner: source });
    return markers.map(markerToDiagnostic);
  }

  /**
   * Get diagnostics by severity
   */
  getDiagnosticsBySeverity(severity: MarkerSeverity): Diagnostic[] {
    const markers = this.markerService.read({ severities: [severity] });
    return markers.map(markerToDiagnostic);
  }

  /**
   * Get diagnostic statistics
   */
  getStats(): DiagnosticStats {
    const stats = this.markerService.getStatistics();
    return markerStatsToDiagnosticStats(stats);
  }

  /**
   * Subscribe to diagnostic changes
   */
  subscribe(listener: DiagnosticListener): () => void {
    // Create a wrapper that converts marker changes to diagnostic format
    const unsubscribe = this.markerService.onMarkerChanged(() => {
      const diagnostics = this.getAllDiagnostics();
      const stats = this.getStats();
      try {
        listener(diagnostics, stats);
      } catch (error) {
        console.error('Diagnostic listener error:', error);
      }
    });

    // Store the unsubscribe function
    this.legacyListeners.set(listener, unsubscribe);

    // Immediately notify with current state
    listener(this.getAllDiagnostics(), this.getStats());

    // Return unsubscribe function
    return () => {
      const unsub = this.legacyListeners.get(listener);
      if (unsub) {
        unsub();
        this.legacyListeners.delete(listener);
      }
    };
  }

  /**
   * Notify all legacy listeners
   */
  private notifyLegacyListeners(): void {
    const diagnostics = this.getAllDiagnostics();
    const stats = this.getStats();

    this.legacyListeners.forEach((_, listener) => {
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
  dispose(): void {
    this.legacyListeners.clear();
    // Don't dispose markerService as it's a singleton
  }
}

// Singleton instance
let diagnosticServiceInstance: DiagnosticService | null = null;

/**
 * Get the diagnostic service instance
 * @deprecated Use getMarkerService() instead
 */
export function getDiagnosticService(): DiagnosticService {
  if (!diagnosticServiceInstance) {
    diagnosticServiceInstance = new DiagnosticService();
  }
  return diagnosticServiceInstance;
}

/**
 * Dispose the diagnostic service
 * @deprecated Use disposeMarkerService() instead
 */
export function disposeDiagnosticService(): void {
  if (diagnosticServiceInstance) {
    diagnosticServiceInstance.dispose();
    diagnosticServiceInstance = null;
  }
}

// Re-export marker service functions for migration
export { getMarkerService, disposeMarkerService };
