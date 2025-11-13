/**
 * Editor Configuration Service
 *
 * Applies editor configuration settings to Monaco Editor instances.
 * Listens to configuration changes and updates editor options in real-time.
 */

import { configurationService } from './configurationService';
import { editorActions } from '@/stores/editorStore';
import type * as Monaco from 'monaco-editor';

/**
 * Apply editor configuration to Monaco Editor
 */
export function applyEditorConfiguration(editor: Monaco.editor.IStandaloneCodeEditor): void {
  const fontSize = configurationService.get<number>('editor.fontSize', 14);
  const fontFamily = configurationService.get<string>('editor.fontFamily', 'Consolas, "Courier New", monospace');
  const tabSize = configurationService.get<number>('editor.tabSize', 4);
  const insertSpaces = configurationService.get<boolean>('editor.insertSpaces', true);
  const wordWrap = configurationService.get<string>('editor.wordWrap', 'off');
  const lineNumbers = configurationService.get<string>('editor.lineNumbers', 'on');
  const minimapEnabled = configurationService.get<boolean>('editor.minimap.enabled', true);

  editor.updateOptions({
    fontSize,
    fontFamily,
    tabSize,
    insertSpaces,
    wordWrap: wordWrap as 'off' | 'on' | 'wordWrapColumn' | 'bounded',
    lineNumbers: lineNumbers as 'on' | 'off' | 'relative' | 'interval',
    minimap: {
      enabled: minimapEnabled
    }
  });

  console.log('[EditorConfigurationService] Applied configuration to editor:', {
    fontSize,
    fontFamily,
    tabSize,
    insertSpaces,
    wordWrap,
    lineNumbers,
    minimapEnabled
  });
}

/**
 * Initialize editor configuration service
 * Sets up listener for configuration changes
 */
export function initializeEditorConfigurationService(): void {
  console.log('[EditorConfigurationService] Initializing...');

  // Listen for configuration changes
  configurationService.onChange((event) => {
    const editorKeys = event.changedKeys.filter(key => key.startsWith('editor.'));

    if (editorKeys.length === 0) {
      return;
    }

    console.log('[EditorConfigurationService] Editor configuration changed:', editorKeys);

    // Get current editor instance
    const editor = editorActions.getCurrentEditor();
    if (!editor) {
      console.warn('[EditorConfigurationService] No active editor to apply configuration');
      return;
    }

    // Apply updated configuration
    applyEditorConfiguration(editor);
  });

  console.log('[EditorConfigurationService] Initialized successfully');
}
