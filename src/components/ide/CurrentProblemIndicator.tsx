import React, { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { editorState } from '../../stores/editorStore';
import { getMarkerService, IMarker, MarkerSeverity } from '../../services/markerService';
import { useSettingsState } from '../../stores/settingsStore';
import { IStatusBarEntry } from '@/types/statusbar';

/**
 * Hook that tracks the current problem at the cursor position
 */
export function useCurrentProblem(): IMarker | null {
  const [currentProblem, setCurrentProblem] = useState<IMarker | null>(null);
  const settings = useSettingsState();

  useEffect(() => {
    // Only track if setting is enabled
    if (!settings.problems.showCurrentInStatus) {
      setCurrentProblem(null);
      return;
    }

    const editor = editorState.view;
    if (!editor) {
      setCurrentProblem(null);
      return;
    }

    const markerService = getMarkerService();

    // Function to find marker at current cursor position
    const updateCurrentProblem = () => {
      const model = editor.getModel();
      const position = editor.getPosition();

      if (!model || !position) {
        setCurrentProblem(null);
        return;
      }

      // Get resource URI
      const resource = model.uri.toString();

      // Get all markers for this resource
      const markers = markerService.read({ resource });

      // Find marker that contains the current cursor position
      const markerAtPosition = markers.find((marker) => {
        const startLine = marker.startLineNumber;
        const startCol = marker.startColumn;
        const endLine = marker.endLineNumber;
        const endCol = marker.endColumn;

        // Check if cursor is within marker range
        if (position.lineNumber < startLine || position.lineNumber > endLine) {
          return false;
        }

        if (position.lineNumber === startLine && position.column < startCol) {
          return false;
        }

        if (position.lineNumber === endLine && position.column > endCol) {
          return false;
        }

        return true;
      });

      // Prioritize errors over warnings over info
      if (markerAtPosition) {
        setCurrentProblem(markerAtPosition);
      } else {
        setCurrentProblem(null);
      }
    };

    // Initial update
    updateCurrentProblem();

    // Listen to cursor position changes (debounced)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateCurrentProblem, 100); // 100ms debounce
    };

    const cursorDisposable = editor.onDidChangeCursorPosition(debouncedUpdate);

    // Listen to marker changes
    const markerUnsubscribe = markerService.onMarkerChanged(debouncedUpdate);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cursorDisposable.dispose();
      markerUnsubscribe();
    };
  }, [settings.problems.showCurrentInStatus]);

  return currentProblem;
}

/**
 * Creates a status bar entry for the current problem at cursor
 */
export function useCurrentProblemStatusBarEntry(): IStatusBarEntry | null {
  const currentProblem = useCurrentProblem();
  const settings = useSettingsState();

  if (!settings.problems.showCurrentInStatus || !currentProblem) {
    return null;
  }

  // Determine icon and kind based on severity
  let icon = '';
  let kind: 'error' | 'warning' | 'standard' = 'standard';

  switch (currentProblem.severity) {
    case MarkerSeverity.Error:
      icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      kind = 'error';
      break;
    case MarkerSeverity.Warning:
      icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      kind = 'warning';
      break;
    case MarkerSeverity.Info:
    case MarkerSeverity.Hint:
    default:
      icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      kind = 'standard';
      break;
  }

  // Truncate message if too long
  const maxLength = 50;
  let message = currentProblem.message;
  if (message.length > maxLength) {
    message = message.substring(0, maxLength) + '...';
  }

  // Include source/owner if available
  const source = currentProblem.source || currentProblem.owner;
  const sourcePrefix = source ? `[${source}] ` : '';

  const text = `${icon} ${sourcePrefix}${message}`;
  const tooltip = `${sourcePrefix}${currentProblem.message}\nLine ${currentProblem.startLineNumber}, Col ${currentProblem.startColumn}`;

  return {
    id: 'status.currentProblem',
    name: 'Current Problem',
    text,
    tooltip,
    ariaLabel: `Current problem: ${currentProblem.message}`,
    kind,
    order: 1.5, // Between problems counter (1) and git (2)
    position: 'left',
    onClick: () => {
      // Could open problems panel and focus on this problem
      console.log('Current problem clicked:', currentProblem);
    },
  };
}
