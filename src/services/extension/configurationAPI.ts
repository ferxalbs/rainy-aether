/**
 * Configuration API for Extensions
 *
 * Provides APIs for extensions to:
 * 1. Register configuration schemas (package.json contributes.configuration)
 * 2. Read configuration values
 * 3. Update configuration values
 * 4. Listen to configuration changes
 *
 * This mirrors VS Code's configuration API.
 */

import { configurationService } from '@/services/configurationService';
import type {
  ExtensionConfiguration,
  ConfigurationProperty,
  ConfigurationUpdateRequest,
  ConfigurationChangeEvent
} from '@/types/configuration';

/**
 * Configuration contribution API
 * Extensions call this to register their configuration schemas
 */
export interface ConfigurationContribution {
  /** Configuration title */
  title?: string;

  /** Configuration properties */
  properties: Record<string, ConfigurationProperty>;
}

/**
 * Register configuration schema from an extension
 * This is typically called during extension activation
 *
 * @param extensionId - Unique extension identifier (e.g., "publisher.extension-name")
 * @param extensionName - Display name of the extension
 * @param contribution - Configuration contribution (from package.json)
 */
export function registerExtensionConfiguration(
  extensionId: string,
  extensionName: string,
  contribution: ConfigurationContribution | ConfigurationContribution[]
): void {
  console.log(`[ConfigurationAPI] Registering configuration for: ${extensionId}`);

  const extensionConfig: ExtensionConfiguration = {
    extensionId,
    extensionName,
    isBuiltIn: false, // Extensions are never built-in
    configuration: contribution
  };

  configurationService.registerSchema(extensionConfig);

  console.log(`[ConfigurationAPI] Successfully registered configuration for: ${extensionId}`);
}

/**
 * Get a configuration value
 * Supports dot notation for nested properties (e.g., "myExtension.feature.enabled")
 *
 * @param key - Configuration key
 * @param defaultValue - Default value if not found
 * @returns Configuration value
 *
 * @example
 * ```typescript
 * const apiKey = getConfiguration<string>('myExtension.apiKey', '');
 * const maxRetries = getConfiguration<number>('myExtension.maxRetries', 3);
 * ```
 */
export function getConfiguration<T = any>(key: string, defaultValue?: T): T {
  return configurationService.get<T>(key, defaultValue);
}

/**
 * Update a configuration value
 *
 * @param key - Configuration key
 * @param value - New value
 * @param scope - Scope to update ('user' or 'workspace')
 * @returns Promise that resolves when update is complete
 *
 * @example
 * ```typescript
 * await updateConfiguration('myExtension.apiKey', 'abc123', 'user');
 * ```
 */
export async function updateConfiguration(
  key: string,
  value: any,
  scope: 'user' | 'workspace' = 'user'
): Promise<void> {
  const request: ConfigurationUpdateRequest = {
    key,
    value,
    scope
  };

  await configurationService.set(request);
}

/**
 * Reset a configuration value to its default
 *
 * @param key - Configuration key
 * @param scope - Scope to reset ('user' or 'workspace')
 * @returns Promise that resolves when reset is complete
 *
 * @example
 * ```typescript
 * await resetConfiguration('myExtension.apiKey', 'user');
 * ```
 */
export async function resetConfiguration(
  key: string,
  scope: 'user' | 'workspace' = 'user'
): Promise<void> {
  await configurationService.reset({ key, scope });
}

/**
 * Listen to configuration changes
 *
 * @param callback - Function called when configuration changes
 * @returns Dispose function to stop listening
 *
 * @example
 * ```typescript
 * const dispose = onConfigurationChange((event) => {
 *   console.log('Changed keys:', event.changedKeys);
 *   if (event.changedKeys.includes('myExtension.apiKey')) {
 *     // Handle API key change
 *   }
 * });
 *
 * // Later: stop listening
 * dispose();
 * ```
 */
export function onConfigurationChange(
  callback: (event: ConfigurationChangeEvent) => void
): () => void {
  return configurationService.onChange(callback);
}

/**
 * Get all configuration keys that start with a prefix
 * Useful for getting all settings for a specific extension
 *
 * @param prefix - Key prefix to search for
 * @returns Array of matching configuration keys
 *
 * @example
 * ```typescript
 * const keys = getConfigurationKeys('myExtension.');
 * // Returns: ['myExtension.apiKey', 'myExtension.maxRetries', ...]
 * ```
 */
export function getConfigurationKeys(prefix?: string): string[] {
  const allProperties = configurationService.getAllProperties();

  if (!prefix) {
    return allProperties.map(p => p.key);
  }

  return allProperties
    .filter(p => p.key.startsWith(prefix))
    .map(p => p.key);
}

/**
 * Check if a configuration key exists in the schema
 *
 * @param key - Configuration key to check
 * @returns true if key exists in schema
 */
export function hasConfiguration(key: string): boolean {
  const allProperties = configurationService.getAllProperties();
  return allProperties.some(p => p.key === key);
}

/**
 * Get configuration as a typed object
 * Retrieves all settings under a prefix as an object
 *
 * @param section - Configuration section (e.g., "myExtension")
 * @returns Configuration object
 *
 * @example
 * ```typescript
 * interface MyConfig {
 *   apiKey: string;
 *   maxRetries: number;
 *   enabled: boolean;
 * }
 *
 * const config = getConfigurationSection<MyConfig>('myExtension');
 * console.log(config.apiKey, config.maxRetries, config.enabled);
 * ```
 */
export function getConfigurationSection<T extends Record<string, any>>(
  section: string
): T {
  const keys = getConfigurationKeys(`${section}.`);
  const config: Record<string, any> = {};

  keys.forEach(key => {
    // Remove section prefix to get property name
    const propertyName = key.substring(section.length + 1);
    config[propertyName] = configurationService.get(key);
  });

  return config as T;
}

/**
 * Update multiple configuration values at once
 *
 * @param updates - Map of key-value pairs to update
 * @param scope - Scope to update ('user' or 'workspace')
 * @returns Promise that resolves when all updates are complete
 *
 * @example
 * ```typescript
 * await updateConfigurationBatch({
 *   'myExtension.apiKey': 'abc123',
 *   'myExtension.maxRetries': 5,
 *   'myExtension.enabled': true
 * }, 'user');
 * ```
 */
export async function updateConfigurationBatch(
  updates: Record<string, any>,
  scope: 'user' | 'workspace' = 'user'
): Promise<void> {
  const promises = Object.entries(updates).map(([key, value]) =>
    updateConfiguration(key, value, scope)
  );

  await Promise.all(promises);
}

/**
 * Example: How extensions register configuration
 *
 * In extension's package.json:
 * ```json
 * {
 *   "contributes": {
 *     "configuration": {
 *       "title": "My Extension Settings",
 *       "properties": {
 *         "myExtension.apiKey": {
 *           "type": "string",
 *           "default": "",
 *           "description": "API key for the service"
 *         },
 *         "myExtension.maxRetries": {
 *           "type": "number",
 *           "default": 3,
 *           "minimum": 1,
 *           "maximum": 10,
 *           "description": "Maximum number of retries"
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * In extension's activation code:
 * ```typescript
 * import { registerExtensionConfiguration } from '@/services/extension/configurationAPI';
 *
 * export function activate(context: ExtensionContext) {
 *   // Register configuration from package.json
 *   const packageJson = require('./package.json');
 *   if (packageJson.contributes?.configuration) {
 *     registerExtensionConfiguration(
 *       'publisher.my-extension',
 *       'My Extension',
 *       packageJson.contributes.configuration
 *     );
 *   }
 *
 *   // Read configuration
 *   const apiKey = getConfiguration<string>('myExtension.apiKey', '');
 *
 *   // Listen to changes
 *   const dispose = onConfigurationChange((event) => {
 *     if (event.changedKeys.includes('myExtension.apiKey')) {
 *       console.log('API key changed!');
 *     }
 *   });
 *
 *   context.subscriptions.push({ dispose });
 * }
 * ```
 */

// Export all APIs
export const configurationAPI = {
  registerExtensionConfiguration,
  getConfiguration,
  updateConfiguration,
  resetConfiguration,
  onConfigurationChange,
  getConfigurationKeys,
  hasConfiguration,
  getConfigurationSection,
  updateConfigurationBatch
};
