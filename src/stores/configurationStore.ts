/**
 * Configuration Store
 *
 * State management for IDE configuration using useSyncExternalStore pattern.
 * Provides React hooks for accessing and modifying configuration.
 */

import { useSyncExternalStore } from 'react';
import { configurationService } from '@/services/configurationService';
import type {
  ResolvedConfigurationProperty,
  ConfigurationChangeEvent,
  ConfigurationFilterOptions,
  ConfigurationSearchResult,
  ConfigurationUpdateRequest,
  ConfigurationResetRequest
} from '@/types/configuration';

/**
 * Configuration store state
 */
interface ConfigurationState {
  /** All configuration properties */
  properties: ResolvedConfigurationProperty[];

  /** Search results (when filtered) */
  searchResults: ConfigurationSearchResult[] | null;

  /** Current filter options */
  filterOptions: ConfigurationFilterOptions | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Initial state
 */
const initialState: ConfigurationState = {
  properties: [],
  searchResults: null,
  filterOptions: null,
  isLoading: false,
  error: null,
  lastUpdate: Date.now()
};

let configurationState: ConfigurationState = { ...initialState };
let cachedSnapshot: ConfigurationState = { ...initialState };

type ConfigurationListener = () => void;

const listeners = new Set<ConfigurationListener>();

/**
 * Notify all listeners of state changes
 */
const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[ConfigurationStore] Listener error:', error);
    }
  });
};

/**
 * Update state and notify listeners
 */
const setState = (updater: (prev: ConfigurationState) => ConfigurationState) => {
  configurationState = updater(configurationState);
  cachedSnapshot = {
    ...configurationState,
    lastUpdate: Date.now()
  };
  notify();
  return configurationState;
};

/**
 * Subscribe to state changes
 */
const subscribe = (listener: ConfigurationListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Get current state snapshot
 */
const getSnapshot = () => cachedSnapshot;

/**
 * Get current state (non-reactive)
 */
export const getConfigurationState = () => configurationState;

/**
 * React hook to use configuration state
 */
export const useConfigurationState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/**
 * Initialize configuration store
 */
export async function initializeConfiguration(workspacePath?: string): Promise<void> {
  setState(prev => ({ ...prev, isLoading: true, error: null }));

  try {
    console.log('[ConfigurationStore] Starting initialization...');

    // Initialize service
    await configurationService.initialize(workspacePath);

    // Load all properties
    const properties = configurationService.getAllProperties();

    console.log('[ConfigurationStore] Loaded properties:', properties.length);
    console.log('[ConfigurationStore] Sample properties:', properties.slice(0, 3).map(p => ({
      key: p.key,
      value: p.value,
      default: p.default,
      isModified: p.isModified
    })));

    // Listen for configuration changes
    configurationService.onChange(handleConfigurationChange);

    setState(prev => ({
      ...prev,
      properties,
      isLoading: false
    }));

    console.log('[ConfigurationStore] ✅ Initialized successfully with', properties.length, 'properties');
  } catch (error: any) {
    console.error('[ConfigurationStore] ❌ Initialization failed:', error);
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error.message || 'Failed to initialize configuration'
    }));
  }
}

/**
 * Handle configuration change event from service
 */
function handleConfigurationChange(event: ConfigurationChangeEvent): void {
  console.log('[ConfigurationStore] 🔄 Configuration changed:', {
    changedKeys: event.changedKeys,
    scope: event.scope,
    newValues: event.newValues
  });

  // Reload all properties to reflect changes
  const properties = configurationService.getAllProperties();

  console.log('[ConfigurationStore] Reloaded properties. Sample:',
    properties
      .filter(p => event.changedKeys.includes(p.key))
      .map(p => ({ key: p.key, value: p.value, isModified: p.isModified }))
  );

  // Update search results if filter is active
  let searchResults = configurationState.searchResults;
  if (configurationState.filterOptions) {
    searchResults = configurationService.search(configurationState.filterOptions);
  }

  setState(prev => ({
    ...prev,
    properties,
    searchResults
  }));
}

/**
 * Get a configuration value
 */
export function getConfigurationValue<T = any>(key: string, defaultValue?: T): T {
  return configurationService.get(key, defaultValue);
}

/**
 * Set a configuration value
 */
export async function setConfigurationValue(request: ConfigurationUpdateRequest): Promise<void> {
  try {
    console.log('[ConfigurationStore] 💾 Setting value:', { key: request.key, value: request.value, scope: request.scope });

    await configurationService.set(request);

    console.log('[ConfigurationStore] ✅ Value set successfully');
    // State will be updated via change event
  } catch (error: any) {
    console.error('[ConfigurationStore] ❌ Failed to set value:', error);
    setState(prev => ({
      ...prev,
      error: error.message || 'Failed to set configuration value'
    }));
    throw error;
  }
}

/**
 * Reset a configuration value to default
 */
export async function resetConfigurationValue(request: ConfigurationResetRequest): Promise<void> {
  try {
    await configurationService.reset(request);

    // State will be updated via change event
  } catch (error: any) {
    console.error('[ConfigurationStore] Failed to reset value:', error);
    setState(prev => ({
      ...prev,
      error: error.message || 'Failed to reset configuration value'
    }));
    throw error;
  }
}

/**
 * Search/filter configuration properties
 */
export function searchConfiguration(options: ConfigurationFilterOptions): void {
  try {
    const searchResults = configurationService.search(options);

    setState(prev => ({
      ...prev,
      searchResults,
      filterOptions: options
    }));

    console.log('[ConfigurationStore] Search results:', searchResults.length);
  } catch (error: any) {
    console.error('[ConfigurationStore] Search failed:', error);
    setState(prev => ({
      ...prev,
      error: error.message || 'Failed to search configuration'
    }));
  }
}

/**
 * Clear search/filter
 */
export function clearConfigurationSearch(): void {
  setState(prev => ({
    ...prev,
    searchResults: null,
    filterOptions: null
  }));
}

/**
 * Get property by key
 */
export function getConfigurationProperty(key: string): ResolvedConfigurationProperty | undefined {
  return configurationState.properties.find(p => p.key === key);
}

/**
 * Get properties by extension
 */
export function getConfigurationsByExtension(extensionId: string): ResolvedConfigurationProperty[] {
  return configurationState.properties.filter(p => p.extensionId === extensionId);
}

/**
 * Get all modified properties
 */
export function getModifiedConfigurations(): ResolvedConfigurationProperty[] {
  return configurationState.properties.filter(p => p.isModified);
}

/**
 * Get configuration categories (grouped by prefix)
 */
export function getConfigurationCategories(): Map<string, ResolvedConfigurationProperty[]> {
  const categories = new Map<string, ResolvedConfigurationProperty[]>();

  configurationState.properties.forEach(property => {
    // Extract category from key (e.g., "editor" from "editor.fontSize")
    const category = property.key.split('.')[0];

    if (!categories.has(category)) {
      categories.set(category, []);
    }

    categories.get(category)!.push(property);
  });

  return categories;
}

/**
 * Validate a configuration value
 */
export async function validateConfigurationValue(
  key: string,
  value: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    const result = await configurationService.validate(key, value);

    return {
      valid: result.valid,
      error: result.error?.message
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Validation failed'
    };
  }
}

/**
 * Export configuration (for backup/sync)
 */
export async function exportConfiguration(): Promise<string> {
  // TODO: Implement configuration export
  throw new Error('Not implemented');
}

/**
 * Import configuration (from backup/sync)
 */
export async function importConfiguration(_json: string): Promise<void> {
  // TODO: Implement configuration import
  throw new Error('Not implemented');
}

/**
 * Clear error state
 */
export function clearConfigurationError(): void {
  setState(prev => ({
    ...prev,
    error: null
  }));
}

/**
 * Configuration actions for convenience
 */
export const configurationActions = {
  initialize: initializeConfiguration,
  get: getConfigurationValue,
  set: setConfigurationValue,
  reset: resetConfigurationValue,
  search: searchConfiguration,
  clearSearch: clearConfigurationSearch,
  getProperty: getConfigurationProperty,
  getByExtension: getConfigurationsByExtension,
  getModified: getModifiedConfigurations,
  getCategories: getConfigurationCategories,
  validate: validateConfigurationValue,
  clearError: clearConfigurationError
};
