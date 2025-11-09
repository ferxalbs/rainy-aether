import * as monaco from 'monaco-editor';

/**
 * Marker severity levels (VS Code compatible)
 */
export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

/**
 * Marker tags for additional metadata
 */
export enum MarkerTag {
  Unnecessary = 1, // Grayed out unused code
  Deprecated = 2, // Strikethrough deprecated symbols
}

/**
 * Related information for complex diagnostics
 */
export interface IRelatedInformation {
  resource: string; // File URI
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Marker data structure (without owner/resource)
 */
export interface IMarkerData {
  severity: MarkerSeverity;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  code?: string | { value: string; target: string }; // Code with optional link
  source?: string; // Source of diagnostic (e.g., 'TypeScript', 'ESLint')
  tags?: MarkerTag[]; // Optional tags
  relatedInformation?: IRelatedInformation[]; // Related locations
}

/**
 * Full marker with owner and resource
 */
export interface IMarker extends IMarkerData {
  owner: string; // Who created this (e.g., 'typescript', 'eslint', 'custom')
  resource: string; // File URI
}

/**
 * Resource markers for batch operations
 */
export interface IResourceMarker {
  resource: string;
  markers: IMarkerData[];
}

/**
 * Options for reading markers
 */
export interface IMarkerReadOptions {
  owner?: string; // Filter by owner
  resource?: string; // Filter by resource
  severities?: MarkerSeverity[]; // Filter by severity
  take?: number; // Limit results
}

/**
 * Marker statistics
 */
export interface MarkerStatistics {
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
  total: number;
  unknowns: number; // Markers with invalid severity
}

type MarkerChangeListener = (resources: string[]) => void;

/**
 * Central marker service matching VS Code's IMarkerService
 */
export class MarkerService {
  // Owner -> Resource -> Markers
  private markers: Map<string, Map<string, IMarker[]>> = new Map();

  // Listeners for marker changes
  private listeners: Set<MarkerChangeListener> = new Set();

  // Monaco disposables
  private monacoDisposables: monaco.IDisposable[] = [];

  constructor() {
    this.initializeMonacoListener();
  }

  /**
   * Initialize Monaco marker listener (auto-register 'monaco' owner)
   */
  private initializeMonacoListener(): void {
    const disposable = monaco.editor.onDidChangeMarkers((uris: readonly monaco.Uri[]) => {
      const changedResources: string[] = [];

      uris.forEach((uri: monaco.Uri) => {
        const resource = uri.toString();
        const monacoMarkers = monaco.editor.getModelMarkers({ resource: uri });

        // Convert Monaco markers to IMarkerData
        const markers: IMarkerData[] = monacoMarkers.map((m: monaco.editor.IMarker) => ({
          severity: m.severity as MarkerSeverity,
          message: m.message,
          startLineNumber: m.startLineNumber,
          startColumn: m.startColumn,
          endLineNumber: m.endLineNumber,
          endColumn: m.endColumn,
          code: typeof m.code === 'string' ? m.code : (m.code?.value as string | undefined),
          source: m.source,
          tags: m.tags as MarkerTag[] | undefined,
          relatedInformation: m.relatedInformation?.map((info: monaco.editor.IRelatedInformation) => ({
            resource: info.resource.toString(),
            message: info.message,
            startLineNumber: info.startLineNumber,
            startColumn: info.startColumn,
            endLineNumber: info.endLineNumber,
            endColumn: info.endColumn,
          })),
        }));

        this.changeOne('monaco', resource, markers);
        changedResources.push(resource);
      });

      if (changedResources.length > 0) {
        this.notifyListeners(changedResources);
      }
    });

    this.monacoDisposables.push(disposable);
  }

  /**
   * Change markers for a single resource and owner
   * Replaces all markers for this owner+resource combination
   */
  changeOne(owner: string, resource: string, markers: IMarkerData[]): void {
    if (!this.markers.has(owner)) {
      this.markers.set(owner, new Map());
    }

    const ownerMarkers = this.markers.get(owner)!;

    if (markers.length === 0) {
      // Remove all markers for this owner+resource
      ownerMarkers.delete(resource);
      if (ownerMarkers.size === 0) {
        this.markers.delete(owner);
      }
    } else {
      // Add owner and resource to each marker
      const fullMarkers: IMarker[] = markers.map((m) => ({
        ...m,
        owner,
        resource,
      }));

      ownerMarkers.set(resource, fullMarkers);
    }
  }

  /**
   * Change markers for multiple resources at once (batch operation)
   */
  changeAll(owner: string, data: IResourceMarker[]): void {
    const changedResources: string[] = [];

    data.forEach(({ resource, markers }) => {
      this.changeOne(owner, resource, markers);
      changedResources.push(resource);
    });

    if (changedResources.length > 0) {
      this.notifyListeners(changedResources);
    }
  }

  /**
   * Remove markers for specific resources and owner
   */
  remove(owner: string, resources: string[]): void {
    const ownerMarkers = this.markers.get(owner);
    if (!ownerMarkers) return;

    resources.forEach((resource) => {
      ownerMarkers.delete(resource);
    });

    if (ownerMarkers.size === 0) {
      this.markers.delete(owner);
    }

    this.notifyListeners(resources);
  }

  /**
   * Read markers with optional filtering
   */
  read(filter?: IMarkerReadOptions): IMarker[] {
    const results: IMarker[] = [];

    // Iterate through owners
    this.markers.forEach((ownerMarkers, owner) => {
      // Filter by owner if specified
      if (filter?.owner && owner !== filter.owner) {
        return;
      }

      // Iterate through resources
      ownerMarkers.forEach((markers, resource) => {
        // Filter by resource if specified
        if (filter?.resource && resource !== filter.resource) {
          return;
        }

        // Add markers to results
        markers.forEach((marker) => {
          // Filter by severity if specified
          if (filter?.severities && !filter.severities.includes(marker.severity)) {
            return;
          }

          results.push(marker);
        });
      });
    });

    // Apply limit if specified
    if (filter?.take && results.length > filter.take) {
      return results.slice(0, filter.take);
    }

    return results;
  }

  /**
   * Get marker statistics
   */
  getStatistics(): MarkerStatistics {
    const stats: MarkerStatistics = {
      errors: 0,
      warnings: 0,
      infos: 0,
      hints: 0,
      unknowns: 0,
      total: 0,
    };

    const allMarkers = this.read();
    stats.total = allMarkers.length;

    allMarkers.forEach((marker) => {
      switch (marker.severity) {
        case MarkerSeverity.Error:
          stats.errors++;
          break;
        case MarkerSeverity.Warning:
          stats.warnings++;
          break;
        case MarkerSeverity.Info:
          stats.infos++;
          break;
        case MarkerSeverity.Hint:
          stats.hints++;
          break;
        default:
          stats.unknowns++;
      }
    });

    return stats;
  }

  /**
   * Subscribe to marker changes
   * Returns unsubscribe function
   */
  onMarkerChanged(listener: MarkerChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of marker changes
   */
  private notifyListeners(resources: string[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(resources);
      } catch (error) {
        console.error('[MarkerService] Listener error:', error);
      }
    });
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    this.monacoDisposables.forEach((d) => d.dispose());
    this.monacoDisposables.length = 0;
    this.markers.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let markerServiceInstance: MarkerService | null = null;

/**
 * Get the marker service instance
 */
export function getMarkerService(): MarkerService {
  if (!markerServiceInstance) {
    markerServiceInstance = new MarkerService();
  }
  return markerServiceInstance;
}

/**
 * Dispose the marker service
 */
export function disposeMarkerService(): void {
  if (markerServiceInstance) {
    markerServiceInstance.dispose();
    markerServiceInstance = null;
  }
}
