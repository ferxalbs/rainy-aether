/**
 * Unit tests for MarkerService
 * Tests multi-owner marker tracking and other core functionality
 *
 * NOTE: Vitest is not installed yet. Install with: pnpm add -D vitest
 * TODO: Uncomment when vitest is available
 */

// @ts-nocheck - Temporarily disabled until vitest is installed
/* eslint-disable */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MarkerService,
  getMarkerService,
  disposeMarkerService,
  MarkerSeverity,
  IMarkerData,
} from '../markerService';

describe('MarkerService', () => {
  let service: MarkerService;

  beforeEach(() => {
    // Dispose any existing instance
    disposeMarkerService();
    // Create a fresh instance
    service = getMarkerService();
  });

  afterEach(() => {
    if (service) {
      service.dispose();
    }
    disposeMarkerService();
  });

  it('should create a singleton instance', () => {
    const service1 = getMarkerService();
    const service2 = getMarkerService();
    expect(service1).toBe(service2);
  });

  it('should add markers for a single owner and resource', () => {
    const markers: IMarkerData[] = [
      {
        severity: MarkerSeverity.Error,
        message: 'Test error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ];

    service.changeOne('typescript', 'file:///test.ts', markers);
    const result = service.read({ owner: 'typescript' });

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Test error');
    expect(result[0].owner).toBe('typescript');
    expect(result[0].resource).toBe('file:///test.ts');
  });

  it('should support multiple owners for the same resource', () => {
    const tsMarkers: IMarkerData[] = [
      {
        severity: MarkerSeverity.Error,
        message: 'TypeScript error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ];

    const eslintMarkers: IMarkerData[] = [
      {
        severity: MarkerSeverity.Warning,
        message: 'ESLint warning',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
    ];

    service.changeOne('typescript', 'file:///test.ts', tsMarkers);
    service.changeOne('eslint', 'file:///test.ts', eslintMarkers);

    const allMarkers = service.read({ resource: 'file:///test.ts' });
    expect(allMarkers).toHaveLength(2);

    const tsResult = service.read({ owner: 'typescript', resource: 'file:///test.ts' });
    expect(tsResult).toHaveLength(1);
    expect(tsResult[0].message).toBe('TypeScript error');

    const eslintResult = service.read({ owner: 'eslint', resource: 'file:///test.ts' });
    expect(eslintResult).toHaveLength(1);
    expect(eslintResult[0].message).toBe('ESLint warning');
  });

  it('should replace markers for the same owner+resource', () => {
    const markers1: IMarkerData[] = [
      {
        severity: MarkerSeverity.Error,
        message: 'Error 1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ];

    const markers2: IMarkerData[] = [
      {
        severity: MarkerSeverity.Warning,
        message: 'Warning 1',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
    ];

    service.changeOne('typescript', 'file:///test.ts', markers1);
    let result = service.read({ owner: 'typescript' });
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Error 1');

    // Replace with new markers
    service.changeOne('typescript', 'file:///test.ts', markers2);
    result = service.read({ owner: 'typescript' });
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Warning 1');
  });

  it('should calculate statistics correctly', () => {
    service.changeOne('owner1', 'file:///a.ts', [
      {
        severity: MarkerSeverity.Error,
        message: 'Error 1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Warning,
        message: 'Warning 1',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
    ]);

    service.changeOne('owner2', 'file:///b.ts', [
      {
        severity: MarkerSeverity.Info,
        message: 'Info 1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Hint,
        message: 'Hint 1',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
    ]);

    const stats = service.getStatistics();
    expect(stats.errors).toBe(1);
    expect(stats.warnings).toBe(1);
    expect(stats.infos).toBe(1);
    expect(stats.hints).toBe(1);
    expect(stats.total).toBe(4);
  });

  it('should notify listeners on marker changes', () => {
    let notified = false;
    let notifiedResources: string[] = [];

    const unsubscribe = service.onMarkerChanged((resources) => {
      notified = true;
      notifiedResources = resources;
    });

    service.changeOne('owner', 'file:///test.ts', [
      {
        severity: MarkerSeverity.Error,
        message: 'Test',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ]);

    expect(notified).toBe(true);
    expect(notifiedResources).toContain('file:///test.ts');

    unsubscribe();
  });

  it('should remove markers correctly', () => {
    service.changeOne('typescript', 'file:///a.ts', [
      {
        severity: MarkerSeverity.Error,
        message: 'Error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ]);

    service.changeOne('typescript', 'file:///b.ts', [
      {
        severity: MarkerSeverity.Warning,
        message: 'Warning',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
    ]);

    let result = service.read({ owner: 'typescript' });
    expect(result).toHaveLength(2);

    // Remove one resource
    service.remove('typescript', ['file:///a.ts']);
    result = service.read({ owner: 'typescript' });
    expect(result).toHaveLength(1);
    expect(result[0].resource).toBe('file:///b.ts');
  });

  it('should handle related information', () => {
    const markers: IMarkerData[] = [
      {
        severity: MarkerSeverity.Error,
        message: 'Main error',
        startLineNumber: 10,
        startColumn: 5,
        endLineNumber: 10,
        endColumn: 15,
        relatedInformation: [
          {
            resource: 'file:///related.ts',
            message: 'Related issue here',
            startLineNumber: 20,
            startColumn: 10,
            endLineNumber: 20,
            endColumn: 20,
          },
        ],
      },
    ];

    service.changeOne('typescript', 'file:///test.ts', markers);
    const result = service.read({ owner: 'typescript' });

    expect(result).toHaveLength(1);
    expect(result[0].relatedInformation).toBeDefined();
    expect(result[0].relatedInformation).toHaveLength(1);
    expect(result[0].relatedInformation![0].message).toBe('Related issue here');
  });

  it('should filter by severity', () => {
    service.changeOne('owner', 'file:///test.ts', [
      {
        severity: MarkerSeverity.Error,
        message: 'Error',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Warning,
        message: 'Warning',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Info,
        message: 'Info',
        startLineNumber: 3,
        startColumn: 1,
        endLineNumber: 3,
        endColumn: 10,
      },
    ]);

    const errors = service.read({ severities: [MarkerSeverity.Error] });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Error');

    const warnings = service.read({ severities: [MarkerSeverity.Warning] });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toBe('Warning');
  });

  it('should limit results with take parameter', () => {
    service.changeOne('owner', 'file:///test.ts', [
      {
        severity: MarkerSeverity.Error,
        message: 'Error 1',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Error,
        message: 'Error 2',
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      },
      {
        severity: MarkerSeverity.Error,
        message: 'Error 3',
        startLineNumber: 3,
        startColumn: 1,
        endLineNumber: 3,
        endColumn: 10,
      },
    ]);

    const result = service.read({ take: 2 });
    expect(result).toHaveLength(2);
  });
});
