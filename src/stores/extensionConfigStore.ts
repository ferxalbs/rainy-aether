/**
 * Extension Configuration Store
 *
 * Manages extension-specific settings and startup behavior.
 * Provides granular control over how extensions are loaded and activated.
 */

import { useSyncExternalStore } from "react";
import { saveToStore, loadFromStore } from "./app-store";

/**
 * Extension startup activation modes
 */
export type ExtensionStartupMode =
  | 'auto'      // Automatically activate all enabled extensions
  | 'manual';   // Require manual activation each session

/**
 * Extension loading strategy
 */
export type ExtensionLoadingStrategy =
  | 'parallel'    // Load all extensions in parallel (faster but higher memory)
  | 'sequential'  // Load extensions one by one (slower but safer)
  | 'lazy';       // Load extensions on-demand (most efficient)

/**
 * Extension security level
 */
export type ExtensionSecurityLevel =
  | 'unrestricted'  // All extensions can run
  | 'safe'          // Only built-in extensions run automatically
  | 'restricted';   // Only explicitly whitelisted extensions

/**
 * Extension error handling strategy
 */
export type ExtensionErrorHandling =
  | 'continue'  // Continue loading other extensions on error
  | 'stop'      // Stop loading all extensions on first error
  | 'isolate';  // Isolate failed extensions and continue

/**
 * Extension configuration state
 */
export interface ExtensionConfigState {
  // === Startup Behavior ===
  /** Controls if extensions activate automatically on startup */
  startupActivationMode: ExtensionStartupMode;

  /** Delay in milliseconds between loading each extension during startup (0 = no delay) */
  startupActivationDelay: number;

  /** Strategy for loading extensions */
  loadingStrategy: ExtensionLoadingStrategy;

  // === Security & Safety ===
  /** Security level for extension execution */
  securityLevel: ExtensionSecurityLevel;

  /** List of extension IDs that are whitelisted (used when securityLevel is 'restricted') */
  whitelistedExtensions: string[];

  /** Disable all third-party extensions */
  disableThirdParty: boolean;

  // === Performance & Resources ===
  /** Maximum number of extensions that can be active simultaneously (0 = unlimited) */
  maxActiveExtensions: number;

  /** Enable extension performance monitoring */
  enablePerformanceMonitoring: boolean;

  /** Auto-disable extensions that exceed performance thresholds */
  autoDisableSlowExtensions: boolean;

  /** Performance threshold in milliseconds (extensions slower than this may be auto-disabled) */
  performanceThreshold: number;

  // === Error Handling ===
  /** How to handle extension errors during loading */
  errorHandling: ExtensionErrorHandling;

  /** Auto-cleanup extensions in error state on startup */
  autoCleanupErrorExtensions: boolean;

  /** Show detailed error notifications */
  showDetailedErrors: boolean;

  // === Developer Options ===
  /** Enable verbose logging for extension system */
  verboseLogging: boolean;

  /** Enable extension hot reload (development mode) */
  enableHotReload: boolean;

  /** Allow unsigned/development extensions */
  allowUnsignedExtensions: boolean;

  // === User Experience ===
  /** Show extension loading progress during startup */
  showLoadingProgress: boolean;

  /** Notify user when extensions are activated/deactivated */
  showActivationNotifications: boolean;

  /** Auto-update extensions (when update system is implemented) */
  autoUpdateExtensions: boolean;
}

const defaultState: ExtensionConfigState = {
  // Startup Behavior
  startupActivationMode: 'auto',
  startupActivationDelay: 0,
  loadingStrategy: 'parallel',

  // Security & Safety
  securityLevel: 'unrestricted',
  whitelistedExtensions: [],
  disableThirdParty: false,

  // Performance & Resources
  maxActiveExtensions: 0, // unlimited
  enablePerformanceMonitoring: true,
  autoDisableSlowExtensions: false,
  performanceThreshold: 5000, // 5 seconds

  // Error Handling
  errorHandling: 'continue',
  autoCleanupErrorExtensions: false,
  showDetailedErrors: true,

  // Developer Options
  verboseLogging: false,
  enableHotReload: false,
  allowUnsignedExtensions: true, // Enable for development

  // User Experience
  showLoadingProgress: true,
  showActivationNotifications: false,
  autoUpdateExtensions: true,
};

let extensionConfigState: ExtensionConfigState = { ...defaultState };
let cachedSnapshot: ExtensionConfigState = { ...defaultState };

type ExtensionConfigListener = () => void;
const listeners = new Set<ExtensionConfigListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("[ExtensionConfigStore] Listener error:", error);
    }
  });
};

const setState = (updater: (prev: ExtensionConfigState) => ExtensionConfigState) => {
  extensionConfigState = updater(extensionConfigState);
  cachedSnapshot = { ...extensionConfigState };
  notify();
  return extensionConfigState;
};

const subscribe = (listener: ExtensionConfigListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

// === React Hooks ===

export const useExtensionConfig = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const useExtensionConfigValue = <K extends keyof ExtensionConfigState>(
  key: K
): ExtensionConfigState[K] => {
  const config = useExtensionConfig();
  return config[key];
};

// === Actions ===

/**
 * Initialize extension configuration from persistent storage
 */
export async function initializeExtensionConfig(): Promise<void> {
  try {
    console.log('[ExtensionConfigStore] Initializing extension configuration...');

    // Load all settings from persistent storage
    const startupActivationMode = await loadFromStore<ExtensionStartupMode>(
      "rainy-extension-startup-mode",
      defaultState.startupActivationMode
    );

    const startupActivationDelay = await loadFromStore<number>(
      "rainy-extension-startup-delay",
      defaultState.startupActivationDelay
    );

    const loadingStrategy = await loadFromStore<ExtensionLoadingStrategy>(
      "rainy-extension-loading-strategy",
      defaultState.loadingStrategy
    );

    const securityLevel = await loadFromStore<ExtensionSecurityLevel>(
      "rainy-extension-security-level",
      defaultState.securityLevel
    );

    const whitelistedExtensions = await loadFromStore<string[]>(
      "rainy-extension-whitelist",
      defaultState.whitelistedExtensions
    );

    const disableThirdParty = await loadFromStore<boolean>(
      "rainy-extension-disable-third-party",
      defaultState.disableThirdParty
    );

    const maxActiveExtensions = await loadFromStore<number>(
      "rainy-extension-max-active",
      defaultState.maxActiveExtensions
    );

    const enablePerformanceMonitoring = await loadFromStore<boolean>(
      "rainy-extension-perf-monitoring",
      defaultState.enablePerformanceMonitoring
    );

    const autoDisableSlowExtensions = await loadFromStore<boolean>(
      "rainy-extension-auto-disable-slow",
      defaultState.autoDisableSlowExtensions
    );

    const performanceThreshold = await loadFromStore<number>(
      "rainy-extension-perf-threshold",
      defaultState.performanceThreshold
    );

    const errorHandling = await loadFromStore<ExtensionErrorHandling>(
      "rainy-extension-error-handling",
      defaultState.errorHandling
    );

    const autoCleanupErrorExtensions = await loadFromStore<boolean>(
      "rainy-extension-auto-cleanup",
      defaultState.autoCleanupErrorExtensions
    );

    const showDetailedErrors = await loadFromStore<boolean>(
      "rainy-extension-show-errors",
      defaultState.showDetailedErrors
    );

    const verboseLogging = await loadFromStore<boolean>(
      "rainy-extension-verbose",
      defaultState.verboseLogging
    );

    const enableHotReload = await loadFromStore<boolean>(
      "rainy-extension-hot-reload",
      defaultState.enableHotReload
    );

    const allowUnsignedExtensions = await loadFromStore<boolean>(
      "rainy-extension-allow-unsigned",
      defaultState.allowUnsignedExtensions
    );

    const showLoadingProgress = await loadFromStore<boolean>(
      "rainy-extension-show-progress",
      defaultState.showLoadingProgress
    );

    const showActivationNotifications = await loadFromStore<boolean>(
      "rainy-extension-show-notifications",
      defaultState.showActivationNotifications
    );

    const autoUpdateExtensions = await loadFromStore<boolean>(
      "rainy-extension-auto-update",
      defaultState.autoUpdateExtensions
    );

    // Update state
    setState(() => ({
      startupActivationMode,
      startupActivationDelay,
      loadingStrategy,
      securityLevel,
      whitelistedExtensions,
      disableThirdParty,
      maxActiveExtensions,
      enablePerformanceMonitoring,
      autoDisableSlowExtensions,
      performanceThreshold,
      errorHandling,
      autoCleanupErrorExtensions,
      showDetailedErrors,
      verboseLogging,
      enableHotReload,
      allowUnsignedExtensions,
      showLoadingProgress,
      showActivationNotifications,
      autoUpdateExtensions,
    }));

    console.log('[ExtensionConfigStore] Extension configuration initialized:', extensionConfigState);
  } catch (error) {
    console.error('[ExtensionConfigStore] Failed to initialize extension configuration:', error);
    // Use default state on error
  }
}

/**
 * Set startup activation mode
 */
export async function setStartupActivationMode(mode: ExtensionStartupMode): Promise<void> {
  setState(prev => ({ ...prev, startupActivationMode: mode }));
  await saveToStore("rainy-extension-startup-mode", mode);
  console.log(`[ExtensionConfigStore] Startup activation mode set to: ${mode}`);
}

/**
 * Set startup activation delay
 */
export async function setStartupActivationDelay(delay: number): Promise<void> {
  setState(prev => ({ ...prev, startupActivationDelay: delay }));
  await saveToStore("rainy-extension-startup-delay", delay);
  console.log(`[ExtensionConfigStore] Startup activation delay set to: ${delay}ms`);
}

/**
 * Set loading strategy
 */
export async function setLoadingStrategy(strategy: ExtensionLoadingStrategy): Promise<void> {
  setState(prev => ({ ...prev, loadingStrategy: strategy }));
  await saveToStore("rainy-extension-loading-strategy", strategy);
  console.log(`[ExtensionConfigStore] Loading strategy set to: ${strategy}`);
}

/**
 * Set security level
 */
export async function setSecurityLevel(level: ExtensionSecurityLevel): Promise<void> {
  setState(prev => ({ ...prev, securityLevel: level }));
  await saveToStore("rainy-extension-security-level", level);
  console.log(`[ExtensionConfigStore] Security level set to: ${level}`);
}

/**
 * Add extension to whitelist
 */
export async function addToWhitelist(extensionId: string): Promise<void> {
  setState(prev => ({
    ...prev,
    whitelistedExtensions: [...prev.whitelistedExtensions, extensionId]
  }));
  await saveToStore("rainy-extension-whitelist", extensionConfigState.whitelistedExtensions);
  console.log(`[ExtensionConfigStore] Added to whitelist: ${extensionId}`);
}

/**
 * Remove extension from whitelist
 */
export async function removeFromWhitelist(extensionId: string): Promise<void> {
  setState(prev => ({
    ...prev,
    whitelistedExtensions: prev.whitelistedExtensions.filter(id => id !== extensionId)
  }));
  await saveToStore("rainy-extension-whitelist", extensionConfigState.whitelistedExtensions);
  console.log(`[ExtensionConfigStore] Removed from whitelist: ${extensionId}`);
}

/**
 * Toggle third-party extension blocking
 */
export async function setDisableThirdParty(disable: boolean): Promise<void> {
  setState(prev => ({ ...prev, disableThirdParty: disable }));
  await saveToStore("rainy-extension-disable-third-party", disable);
  console.log(`[ExtensionConfigStore] Disable third-party set to: ${disable}`);
}

/**
 * Set maximum active extensions
 */
export async function setMaxActiveExtensions(max: number): Promise<void> {
  setState(prev => ({ ...prev, maxActiveExtensions: max }));
  await saveToStore("rainy-extension-max-active", max);
  console.log(`[ExtensionConfigStore] Max active extensions set to: ${max}`);
}

/**
 * Toggle performance monitoring
 */
export async function setEnablePerformanceMonitoring(enable: boolean): Promise<void> {
  setState(prev => ({ ...prev, enablePerformanceMonitoring: enable }));
  await saveToStore("rainy-extension-perf-monitoring", enable);
  console.log(`[ExtensionConfigStore] Performance monitoring set to: ${enable}`);
}

/**
 * Toggle auto-disable slow extensions
 */
export async function setAutoDisableSlowExtensions(disable: boolean): Promise<void> {
  setState(prev => ({ ...prev, autoDisableSlowExtensions: disable }));
  await saveToStore("rainy-extension-auto-disable-slow", disable);
  console.log(`[ExtensionConfigStore] Auto-disable slow extensions set to: ${disable}`);
}

/**
 * Set performance threshold
 */
export async function setPerformanceThreshold(threshold: number): Promise<void> {
  setState(prev => ({ ...prev, performanceThreshold: threshold }));
  await saveToStore("rainy-extension-perf-threshold", threshold);
  console.log(`[ExtensionConfigStore] Performance threshold set to: ${threshold}ms`);
}

/**
 * Set error handling strategy
 */
export async function setErrorHandling(handling: ExtensionErrorHandling): Promise<void> {
  setState(prev => ({ ...prev, errorHandling: handling }));
  await saveToStore("rainy-extension-error-handling", handling);
  console.log(`[ExtensionConfigStore] Error handling set to: ${handling}`);
}

/**
 * Toggle auto-cleanup of error extensions
 */
export async function setAutoCleanupErrorExtensions(cleanup: boolean): Promise<void> {
  setState(prev => ({ ...prev, autoCleanupErrorExtensions: cleanup }));
  await saveToStore("rainy-extension-auto-cleanup", cleanup);
  console.log(`[ExtensionConfigStore] Auto-cleanup error extensions set to: ${cleanup}`);
}

/**
 * Toggle detailed error display
 */
export async function setShowDetailedErrors(show: boolean): Promise<void> {
  setState(prev => ({ ...prev, showDetailedErrors: show }));
  await saveToStore("rainy-extension-show-errors", show);
  console.log(`[ExtensionConfigStore] Show detailed errors set to: ${show}`);
}

/**
 * Toggle verbose logging
 */
export async function setVerboseLogging(verbose: boolean): Promise<void> {
  setState(prev => ({ ...prev, verboseLogging: verbose }));
  await saveToStore("rainy-extension-verbose", verbose);
  console.log(`[ExtensionConfigStore] Verbose logging set to: ${verbose}`);
}

/**
 * Toggle hot reload
 */
export async function setEnableHotReload(enable: boolean): Promise<void> {
  setState(prev => ({ ...prev, enableHotReload: enable }));
  await saveToStore("rainy-extension-hot-reload", enable);
  console.log(`[ExtensionConfigStore] Hot reload set to: ${enable}`);
}

/**
 * Toggle unsigned extensions
 */
export async function setAllowUnsignedExtensions(allow: boolean): Promise<void> {
  setState(prev => ({ ...prev, allowUnsignedExtensions: allow }));
  await saveToStore("rainy-extension-allow-unsigned", allow);
  console.log(`[ExtensionConfigStore] Allow unsigned extensions set to: ${allow}`);
}

/**
 * Toggle loading progress display
 */
export async function setShowLoadingProgress(show: boolean): Promise<void> {
  setState(prev => ({ ...prev, showLoadingProgress: show }));
  await saveToStore("rainy-extension-show-progress", show);
  console.log(`[ExtensionConfigStore] Show loading progress set to: ${show}`);
}

/**
 * Toggle activation notifications
 */
export async function setShowActivationNotifications(show: boolean): Promise<void> {
  setState(prev => ({ ...prev, showActivationNotifications: show }));
  await saveToStore("rainy-extension-show-notifications", show);
  console.log(`[ExtensionConfigStore] Show activation notifications set to: ${show}`);
}

/**
 * Toggle auto-update extensions
 */
export async function setAutoUpdateExtensions(update: boolean): Promise<void> {
  setState(prev => ({ ...prev, autoUpdateExtensions: update }));
  await saveToStore("rainy-extension-auto-update", update);
  console.log(`[ExtensionConfigStore] Auto-update extensions set to: ${update}`);
}

/**
 * Get current extension configuration
 */
export function getExtensionConfig(): ExtensionConfigState {
  return extensionConfigState;
}

/**
 * Reset configuration to defaults
 */
export async function resetExtensionConfig(): Promise<void> {
  setState(() => ({ ...defaultState }));

  // Save all defaults to storage
  await saveToStore("rainy-extension-startup-mode", defaultState.startupActivationMode);
  await saveToStore("rainy-extension-startup-delay", defaultState.startupActivationDelay);
  await saveToStore("rainy-extension-loading-strategy", defaultState.loadingStrategy);
  await saveToStore("rainy-extension-security-level", defaultState.securityLevel);
  await saveToStore("rainy-extension-whitelist", defaultState.whitelistedExtensions);
  await saveToStore("rainy-extension-disable-third-party", defaultState.disableThirdParty);
  await saveToStore("rainy-extension-max-active", defaultState.maxActiveExtensions);
  await saveToStore("rainy-extension-perf-monitoring", defaultState.enablePerformanceMonitoring);
  await saveToStore("rainy-extension-auto-disable-slow", defaultState.autoDisableSlowExtensions);
  await saveToStore("rainy-extension-perf-threshold", defaultState.performanceThreshold);
  await saveToStore("rainy-extension-error-handling", defaultState.errorHandling);
  await saveToStore("rainy-extension-auto-cleanup", defaultState.autoCleanupErrorExtensions);
  await saveToStore("rainy-extension-show-errors", defaultState.showDetailedErrors);
  await saveToStore("rainy-extension-verbose", defaultState.verboseLogging);
  await saveToStore("rainy-extension-hot-reload", defaultState.enableHotReload);
  await saveToStore("rainy-extension-allow-unsigned", defaultState.allowUnsignedExtensions);
  await saveToStore("rainy-extension-show-progress", defaultState.showLoadingProgress);
  await saveToStore("rainy-extension-show-notifications", defaultState.showActivationNotifications);
  await saveToStore("rainy-extension-auto-update", defaultState.autoUpdateExtensions);

  console.log('[ExtensionConfigStore] Configuration reset to defaults');
}

/**
 * Check if an extension is allowed to run based on current security settings
 */
export function isExtensionAllowed(extensionId: string, publisher?: string): boolean {
  const config = extensionConfigState;

  // Check if third-party extensions are disabled
  if (config.disableThirdParty && publisher !== 'rainy-aether' && !extensionId.startsWith('rainy-aether.')) {
    return false;
  }

  // Check security level
  switch (config.securityLevel) {
    case 'unrestricted':
      return true;

    case 'safe':
      // Only allow built-in extensions
      return publisher === 'rainy-aether' || extensionId.startsWith('rainy-aether.');

    case 'restricted':
      // Only allow whitelisted extensions
      return config.whitelistedExtensions.includes(extensionId);

    default:
      return true;
  }
}
