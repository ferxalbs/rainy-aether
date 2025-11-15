/**
 * Test Configuration Extension
 *
 * Demonstrates how to:
 * 1. Register configuration schema from package.json
 * 2. Read configuration values
 * 3. Update configuration values
 * 4. Listen to configuration changes
 * 5. Validate and react to configuration changes
 */

import type { ExtensionContext } from '../../../src/services/extension/types';
import {
  configurationAPI,
  type ConfigurationContribution
} from '../../../src/services/extension/configurationAPI';

/**
 * Extension activation function
 * Called when the extension is activated
 */
export function activate(context: ExtensionContext): void {
  console.log('[TestConfigExtension] Activating...');

  // 1. Register configuration schema from package.json
  const packageJson = require('../package.json');
  if (packageJson.contributes?.configuration) {
    configurationAPI.registerExtensionConfiguration(
      'rainy-aether.test-config-extension',
      'Test Configuration Extension',
      packageJson.contributes.configuration
    );
    console.log('[TestConfigExtension] Configuration schema registered');
  }

  // 2. Read initial configuration values
  const enabled = configurationAPI.getConfiguration<boolean>('testExtension.enabled', true);
  const apiKey = configurationAPI.getConfiguration<string>('testExtension.apiKey', '');
  const logLevel = configurationAPI.getConfiguration<string>('testExtension.logLevel', 'info');
  const maxRetries = configurationAPI.getConfiguration<number>('testExtension.maxRetries', 3);
  const timeout = configurationAPI.getConfiguration<number>('testExtension.timeout', 5000);
  const excludePatterns = configurationAPI.getConfiguration<string[]>('testExtension.excludePatterns', []);
  const customSettings = configurationAPI.getConfiguration<Record<string, any>>('testExtension.customSettings', {});

  console.log('[TestConfigExtension] Initial configuration:', {
    enabled,
    apiKey: apiKey ? '***' : '(not set)',
    logLevel,
    maxRetries,
    timeout,
    excludePatterns,
    customSettings
  });

  // 3. Listen to configuration changes
  const configListener = configurationAPI.onConfigurationChange((event) => {
    console.log('[TestConfigExtension] Configuration changed:', {
      changedKeys: event.changedKeys,
      scope: event.scope,
      timestamp: new Date(event.timestamp).toISOString()
    });

    // React to specific configuration changes
    if (event.changedKeys.includes('testExtension.enabled')) {
      const newEnabled = configurationAPI.getConfiguration<boolean>('testExtension.enabled', true);
      console.log(`[TestConfigExtension] Feature ${newEnabled ? 'ENABLED' : 'DISABLED'}`);

      if (newEnabled) {
        console.log('[TestConfigExtension] Starting extension features...');
      } else {
        console.log('[TestConfigExtension] Stopping extension features...');
      }
    }

    if (event.changedKeys.includes('testExtension.apiKey')) {
      const newApiKey = configurationAPI.getConfiguration<string>('testExtension.apiKey', '');
      console.log(`[TestConfigExtension] API key ${newApiKey ? 'set' : 'cleared'}`);

      if (newApiKey) {
        // Validate API key (simplified example)
        if (newApiKey.length === 32) {
          console.log('[TestConfigExtension] API key valid, connecting to service...');
        } else {
          console.warn('[TestConfigExtension] API key appears invalid');
        }
      }
    }

    if (event.changedKeys.includes('testExtension.logLevel')) {
      const newLogLevel = configurationAPI.getConfiguration<string>('testExtension.logLevel', 'info');
      console.log(`[TestConfigExtension] Log level changed to: ${newLogLevel}`);
    }

    if (event.changedKeys.includes('testExtension.maxRetries')) {
      const newMaxRetries = configurationAPI.getConfiguration<number>('testExtension.maxRetries', 3);
      console.log(`[TestConfigExtension] Max retries changed to: ${newMaxRetries}`);
    }

    if (event.changedKeys.includes('testExtension.experimentalFeatures')) {
      console.warn('[TestConfigExtension] Experimental features changed - RESTART REQUIRED');
    }
  });

  // Register cleanup
  context.subscriptions.push({
    dispose: () => {
      console.log('[TestConfigExtension] Cleaning up configuration listener...');
      configListener();
    }
  });

  // 4. Example: Get all extension settings as typed object
  interface TestExtensionConfig {
    enabled: boolean;
    apiKey: string;
    logLevel: string;
    maxRetries: number;
    timeout: number;
    excludePatterns: string[];
    customSettings: Record<string, any>;
    webhookUrl: string;
    experimentalFeatures: boolean;
    deprecatedSetting: string;
  }

  const allSettings = configurationAPI.getConfigurationSection<TestExtensionConfig>('testExtension');
  console.log('[TestConfigExtension] All settings:', {
    ...allSettings,
    apiKey: allSettings.apiKey ? '***' : '(not set)'
  });

  // 5. Example: Programmatically update configuration
  // (Uncomment to test)
  /*
  setTimeout(async () => {
    console.log('[TestConfigExtension] Updating configuration programmatically...');

    await configurationAPI.updateConfiguration(
      'testExtension.logLevel',
      'debug',
      'user'
    );

    console.log('[TestConfigExtension] Configuration updated');
  }, 5000);
  */

  // 6. Example: Batch update multiple settings
  // (Uncomment to test)
  /*
  setTimeout(async () => {
    console.log('[TestConfigExtension] Batch updating configuration...');

    await configurationAPI.updateConfigurationBatch({
      'testExtension.maxRetries': 5,
      'testExtension.timeout': 10000,
      'testExtension.logLevel': 'warn'
    }, 'user');

    console.log('[TestConfigExtension] Batch update complete');
  }, 10000);
  */

  // 7. Demonstrate configuration-driven behavior
  if (enabled) {
    console.log('[TestConfigExtension] Extension is enabled, starting features...');

    // Use configuration values to control behavior
    const log = (level: string, message: string) => {
      const levels = ['debug', 'info', 'warn', 'error'];
      const currentLevelIndex = levels.indexOf(logLevel);
      const messageLevelIndex = levels.indexOf(level);

      if (messageLevelIndex >= currentLevelIndex) {
        console.log(`[TestConfigExtension][${level.toUpperCase()}] ${message}`);
      }
    };

    log('debug', 'This is a debug message');
    log('info', 'This is an info message');
    log('warn', 'This is a warning message');
    log('error', 'This is an error message');

    // Demonstrate using timeout setting
    log('info', `Operations will timeout after ${timeout}ms`);

    // Demonstrate using retry setting
    log('info', `Failed operations will be retried up to ${maxRetries} times`);

    // Demonstrate using array setting
    log('info', `Excluding patterns: ${excludePatterns.join(', ')}`);

    // Demonstrate using object setting
    log('info', `Custom settings: ${JSON.stringify(customSettings)}`);
  } else {
    console.log('[TestConfigExtension] Extension is disabled');
  }

  console.log('[TestConfigExtension] Activation complete');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('[TestConfigExtension] Deactivating...');
  // Cleanup is handled by context.subscriptions
}
