/**
 * Auto-Save Service
 *
 * Handles automatic saving of editor files based on configuration.
 * Supports multiple auto-save modes: off, afterDelay, onFocusChange, onWindowChange.
 */

import { configurationService } from './configurationService';

type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';

interface AutoSaveCallback {
  (): void | Promise<void>;
}

let autoSaveCallback: AutoSaveCallback | null = null;
let autoSaveTimer: NodeJS.Timeout | null = null;
let currentMode: AutoSaveMode = 'off';
let currentDelay = 1000;
let blurListener: (() => void) | null = null;
let configChangeDisposable: (() => void) | null = null;

/**
 * Register a callback to be called when auto-save triggers
 */
export function registerAutoSaveCallback(callback: AutoSaveCallback): void {
  autoSaveCallback = callback;
  console.log('[AutoSaveService] Callback registered');
}

/**
 * Trigger auto-save if conditions are met
 */
function triggerAutoSave(): void {
  if (autoSaveCallback) {
    console.log('[AutoSaveService] Triggering auto-save');
    void autoSaveCallback();
  }
}

/**
 * Schedule auto-save after delay
 */
function scheduleAutoSave(): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  if (currentMode === 'afterDelay' && currentDelay > 0) {
    autoSaveTimer = setTimeout(() => {
      triggerAutoSave();
    }, currentDelay);
  }
}

/**
 * Notify that editor content has changed
 */
export function notifyEditorChange(): void {
  if (currentMode === 'afterDelay') {
    scheduleAutoSave();
  }
}

/**
 * Notify that editor focus has changed
 */
export function notifyEditorFocusChange(focused: boolean): void {
  if (currentMode === 'onFocusChange' && !focused) {
    triggerAutoSave();
  }
}

/**
 * Apply auto-save configuration
 */
function applyAutoSaveConfiguration(): void {
  const mode = configurationService.get<AutoSaveMode>('files.autoSave', 'off');
  const delay = configurationService.get<number>('files.autoSaveDelay', 1000);

  currentMode = mode;
  currentDelay = delay;

  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  console.log('[AutoSaveService] Configuration applied:', { mode, delay });
}

/**
 * Cleanup auto-save service resources
 */
export function cleanupAutoSaveService(): void {
  // Clear timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  // Remove window blur listener
  if (blurListener) {
    window.removeEventListener('blur', blurListener);
    blurListener = null;
  }

  // Dispose configuration change listener
  if (configChangeDisposable) {
    configChangeDisposable();
    configChangeDisposable = null;
  }

  console.log('[AutoSaveService] Cleaned up resources');
}

/**
 * Initialize auto-save service
 */
export function initializeAutoSaveService(): void {
  console.log('[AutoSaveService] Initializing...');

  // Clean up existing resources before initializing
  cleanupAutoSaveService();

  // Apply initial configuration
  applyAutoSaveConfiguration();

  // Listen for configuration changes
  configChangeDisposable = configurationService.onChange((event) => {
    const autoSaveKeys = event.changedKeys.filter(
      key => key.startsWith('files.autoSave')
    );

    if (autoSaveKeys.length > 0) {
      console.log('[AutoSaveService] Configuration changed:', autoSaveKeys);
      applyAutoSaveConfiguration();
    }
  });

  // Create and store blur listener
  blurListener = () => {
    if (currentMode === 'onWindowChange') {
      triggerAutoSave();
    }
  };

  // Listen for window focus changes
  window.addEventListener('blur', blurListener);

  console.log('[AutoSaveService] Initialized successfully');
}

/**
 * Get current auto-save mode
 */
export function getAutoSaveMode(): AutoSaveMode {
  return currentMode;
}
