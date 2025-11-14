/**
 * Configuration Bridge
 *
 * Bridges the new VS Code-compatible configuration system with existing
 * settings stores (settingsStore, themeStore). Provides bidirectional sync
 * and registers configuration schemas for all existing settings.
 *
 * This allows gradual migration while maintaining backward compatibility.
 */

import { configurationActions } from '@/stores/configurationStore';
import { configurationService } from '@/services/configurationService';
import type { ExtensionConfiguration } from '@/types/configuration';
import { ConfigurationScope } from '@/types/configuration';
import {
  getSettingsState,
  setFileIconColorMode,
  setCustomFileColor,
  setIconThemeId,
  setShowCurrentProblemInStatus,
  setProblemsSortOrder,
  setProblemsAutoReveal,
  type FileIconColorMode,
  type ProblemsSortOrder
} from '@/stores/settingsStore';
import {
  themeState,
  setUserPreference,
  switchBaseTheme,
  setCurrentTheme,
  findThemeByName,
  type ThemeMode
} from '@/stores/themeStore';

/**
 * Register IDE core settings as configuration schemas
 */
export function registerIDEConfigurations(): void {
  // Workbench (Appearance) Settings
  const workbenchConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.workbench',
    extensionName: 'Rainy Aether Workbench',
    isBuiltIn: true,
    configuration: {
      title: 'Workbench',
      properties: {
          'workbench.colorTheme': {
            type: 'string',
            enum: [
              'navy-day', 'navy-night',
              'dark-day', 'dark-night',
              'light-day', 'light-night',
              'monokai-day', 'monokai-night',
              'aurora-day', 'aurora-night',
              'ember-day', 'ember-night'
            ],
            enumDescriptions: [
              'Navy Blue - Day theme',
              'Navy Blue - Night theme',
              'Dark - Day theme',
              'Dark - Night theme',
              'Light - Day theme',
              'Light - Night theme',
              'Monokai - Day theme',
              'Monokai - Night theme',
              'Aurora - Day theme',
              'Aurora - Night theme',
              'Ember - Day theme',
              'Ember - Night theme'
            ],
            default: 'navy-day',
            description: 'Specifies the color theme used in the workbench.',
            scope: ConfigurationScope.Window,
            order: 0
          },
          'workbench.colorThemePreference': {
            type: 'string',
            enum: ['system', 'day', 'night'],
            enumDescriptions: [
              'Follow system theme (light/dark)',
              'Always use day theme',
              'Always use night theme'
            ],
            default: 'system',
            description: 'Controls whether the workbench follows the system theme or uses a specific theme mode.',
            scope: ConfigurationScope.Window,
            order: 1
          },
          'workbench.preferredColorThemeBase': {
            type: 'string',
            enum: ['navy', 'dark', 'light', 'monokai', 'aurora', 'ember'],
            enumDescriptions: [
              'Navy Blue theme family',
              'Dark theme family',
              'Light theme family',
              'Monokai theme family',
              'Aurora theme family',
              'Ember theme family'
            ],
            default: 'navy',
            description: 'Specifies the base theme family. The specific variant (day/night) is determined by colorThemePreference.',
            scope: ConfigurationScope.Window,
            order: 2
          },
          'workbench.iconTheme': {
            type: 'string',
            default: 'default',
            description: 'Specifies the icon theme used in the workbench, or null to not show file icons.',
            scope: ConfigurationScope.Window,
            order: 3
          }
        }
      }
  };

  // Explorer Settings
  const explorerConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.explorer',
    extensionName: 'Rainy Aether Explorer',
    isBuiltIn: true,
    configuration: {
      title: 'Explorer',
      properties: {
          'explorer.fileIconColorMode': {
            type: 'string',
            enum: ['theme', 'custom'],
            enumDescriptions: [
              'Use colors from the active color theme',
              'Use custom colors defined in explorer.fileIconColors'
            ],
            default: 'theme',
            description: 'Controls how file icon colors are determined.',
            scope: ConfigurationScope.Window,
            order: 0
          },
          'explorer.fileIconColors': {
            type: 'object',
            default: {
              ts: '#3b82f6',
              tsx: '#3b82f6',
              js: '#f59e0b',
              jsx: '#f59e0b',
              rs: '#dea584',
              json: '#10b981',
              md: '#64748b',
              css: '#22c55e',
              scss: '#22c55e',
              html: '#ef4444',
              svg: '#16a34a'
            },
            description: 'Custom colors for file icons by extension. Only used when explorer.fileIconColorMode is "custom".',
            scope: ConfigurationScope.Window,
            order: 1,
            additionalProperties: {
              type: 'string',
              pattern: '^#[0-9a-fA-F]{6}$'
            }
          },
          'explorer.sortOrder': {
            type: 'string',
            enum: ['default', 'name', 'type', 'modified'],
            enumDescriptions: [
              'Sort by name (folders first)',
              'Sort alphabetically by name',
              'Sort by file type',
              'Sort by last modified date'
            ],
            default: 'default',
            description: 'Controls sorting order of files and folders in the explorer.',
            scope: ConfigurationScope.Resource,
            order: 2
          },
          'explorer.autoReveal': {
            type: 'boolean',
            default: true,
            description: 'Controls whether the explorer should automatically reveal and select files when opening them.',
            scope: ConfigurationScope.Resource,
            order: 3
          }
        }
      }
  };

  // Problems Panel Settings
  const problemsConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.problems',
    extensionName: 'Rainy Aether Problems',
    isBuiltIn: true,
    configuration: {
      title: 'Problems',
      properties: {
          'problems.showCurrentInStatus': {
            type: 'boolean',
            default: true,
            description: 'Controls whether the current problem at the cursor position is shown in the status bar.',
            scope: ConfigurationScope.Window,
            order: 0
          },
          'problems.sortOrder': {
            type: 'string',
            enum: ['severity', 'position', 'name'],
            enumDescriptions: [
              'Sort by error severity (errors first, then warnings, then info)',
              'Sort by file position (line number)',
              'Sort by file name'
            ],
            default: 'severity',
            description: 'Controls the order in which problems are displayed in the Problems panel.',
            scope: ConfigurationScope.Window,
            order: 1
          },
          'problems.autoReveal': {
            type: 'boolean',
            default: false,
            description: 'Controls whether the Problems panel should automatically reveal when the cursor moves to a problem.',
            scope: ConfigurationScope.Window,
            order: 2
          }
        }
      }
  };

  // Editor Settings (from configurationService default schemas)
  const editorConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.editor',
    extensionName: 'Rainy Aether Editor',
    isBuiltIn: true,
    configuration: {
      title: 'Editor',
      properties: {
          'editor.fontSize': {
            type: 'number',
            default: 14,
            minimum: 8,
            maximum: 72,
            description: 'Controls the font size in pixels.',
            scope: ConfigurationScope.Resource,
            order: 0
          },
          'editor.fontFamily': {
            type: 'string',
            default: 'Consolas, "Courier New", monospace',
            description: 'Controls the font family.',
            scope: ConfigurationScope.Resource,
            order: 1
          },
          'editor.tabSize': {
            type: 'integer',
            default: 4,
            minimum: 1,
            maximum: 8,
            description: 'The number of spaces a tab is equal to.',
            scope: ConfigurationScope.Resource,
            order: 2
          },
          'editor.insertSpaces': {
            type: 'boolean',
            default: true,
            description: 'Insert spaces when pressing Tab.',
            scope: ConfigurationScope.Resource,
            order: 3
          },
          'editor.wordWrap': {
            type: 'string',
            enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
            enumDescriptions: [
              'Lines will never wrap',
              'Lines will wrap at viewport width',
              'Lines will wrap at the column defined by editor.wordWrapColumn',
              'Lines will wrap at the minimum of viewport and editor.wordWrapColumn'
            ],
            default: 'off',
            description: 'Controls how lines should wrap.',
            scope: ConfigurationScope.Resource,
            order: 4
          },
          'editor.lineNumbers': {
            type: 'string',
            enum: ['off', 'on', 'relative', 'interval'],
            enumDescriptions: [
              'No line numbers',
              'Show line numbers',
              'Show relative line numbers',
              'Show line numbers every 10 lines'
            ],
            default: 'on',
            description: 'Controls the display of line numbers.',
            scope: ConfigurationScope.Resource,
            order: 5
          },
          'editor.minimap.enabled': {
            type: 'boolean',
            default: true,
            description: 'Controls whether the minimap is shown.',
            scope: ConfigurationScope.Resource,
            order: 6
          }
        }
      }
  };

  // Files Settings
  const filesConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.files',
    extensionName: 'Rainy Aether Files',
    isBuiltIn: true,
    configuration: {
      title: 'Files',
      properties: {
          'files.autoSave': {
            type: 'string',
            enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
            enumDescriptions: [
              'Never auto save',
              'Auto save after a configured delay',
              'Auto save when editor loses focus',
              'Auto save when window loses focus'
            ],
            default: 'off',
            description: 'Controls auto save of dirty editors.',
            scope: ConfigurationScope.Resource,
            order: 0
          },
          'files.autoSaveDelay': {
            type: 'number',
            default: 1000,
            minimum: 0,
            description: 'Controls the delay in milliseconds after which a dirty editor is saved automatically.',
            scope: ConfigurationScope.Resource,
            order: 1
          },
          'files.exclude': {
            type: 'object',
            default: {
              '**/.git': true,
              '**/.DS_Store': true,
              '**/node_modules': true,
              '**/.next': true,
              '**/dist': true,
              '**/build': true
            },
            description: 'Configure glob patterns for excluding files and folders. These files/folders will be hidden in the explorer.',
            scope: ConfigurationScope.Resource,
            order: 2,
            additionalProperties: {
              type: 'boolean'
            }
          }
        }
      }
  };

  const extensionsConfig: ExtensionConfiguration = {
    extensionId: 'rainy-aether.extensions',
    extensionName: 'Rainy Aether Extensions',
    isBuiltIn: true,
    configuration: {
      title: 'Extensions',
      properties: {
        // === Startup Behavior ===
        'extensions.startupActivationMode': {
          type: 'string',
          enum: ['auto', 'manual'],
          enumDescriptions: [
            'Automatically activate all enabled extensions during startup',
            'Require manual activation from the Extension Manager each session'
          ],
          default: 'auto',
          description: 'Controls if Rainy Aether should eagerly activate enabled extensions on launch or wait for manual confirmation.',
          scope: ConfigurationScope.Window,
          order: 0
        },
        'extensions.startupActivationDelay': {
          type: 'number',
          default: 0,
          minimum: 0,
          maximum: 10000,
          description: 'Optional delay (in milliseconds) inserted between loading each extension during startup to improve stability.',
          scope: ConfigurationScope.Window,
          order: 1
        },
        'extensions.loadingStrategy': {
          type: 'string',
          enum: ['parallel', 'sequential', 'lazy'],
          enumDescriptions: [
            'Load all extensions in parallel (faster but higher memory)',
            'Load extensions one by one (slower but safer)',
            'Load extensions on-demand (most efficient)'
          ],
          default: 'parallel',
          description: 'Controls how extensions are loaded during startup.',
          scope: ConfigurationScope.Window,
          order: 2
        },

        // === Security & Safety ===
        'extensions.securityLevel': {
          type: 'string',
          enum: ['unrestricted', 'safe', 'restricted'],
          enumDescriptions: [
            'All extensions can run without restrictions',
            'Only built-in Rainy Aether extensions run automatically',
            'Only explicitly whitelisted extensions can run'
          ],
          default: 'unrestricted',
          description: 'Security level for extension execution.',
          scope: ConfigurationScope.Window,
          order: 3
        },
        'extensions.disableThirdParty': {
          type: 'boolean',
          default: false,
          description: 'Disable all third-party extensions (only Rainy Aether built-in extensions will run).',
          scope: ConfigurationScope.Window,
          order: 4
        },

        // === Performance & Resources ===
        'extensions.maxActiveExtensions': {
          type: 'number',
          default: 0,
          minimum: 0,
          maximum: 100,
          description: 'Maximum number of extensions that can be active simultaneously (0 = unlimited).',
          scope: ConfigurationScope.Window,
          order: 5
        },
        'extensions.enablePerformanceMonitoring': {
          type: 'boolean',
          default: true,
          description: 'Enable performance monitoring for extensions.',
          scope: ConfigurationScope.Window,
          order: 6
        },
        'extensions.autoDisableSlowExtensions': {
          type: 'boolean',
          default: false,
          description: 'Automatically disable extensions that exceed performance thresholds.',
          scope: ConfigurationScope.Window,
          order: 7
        },
        'extensions.performanceThreshold': {
          type: 'number',
          default: 5000,
          minimum: 1000,
          maximum: 30000,
          description: 'Performance threshold in milliseconds (extensions slower than this may be auto-disabled).',
          scope: ConfigurationScope.Window,
          order: 8
        },

        // === Error Handling ===
        'extensions.errorHandling': {
          type: 'string',
          enum: ['continue', 'stop', 'isolate'],
          enumDescriptions: [
            'Continue loading other extensions on error',
            'Stop loading all extensions on first error',
            'Isolate failed extensions and continue'
          ],
          default: 'continue',
          description: 'How to handle extension errors during loading.',
          scope: ConfigurationScope.Window,
          order: 9
        },
        'extensions.autoCleanupErrorExtensions': {
          type: 'boolean',
          default: false,
          description: 'Automatically cleanup extensions in error state on startup.',
          scope: ConfigurationScope.Window,
          order: 10
        },
        'extensions.showDetailedErrors': {
          type: 'boolean',
          default: true,
          description: 'Show detailed error notifications for extension failures.',
          scope: ConfigurationScope.Window,
          order: 11
        },

        // === Developer Options ===
        'extensions.verboseLogging': {
          type: 'boolean',
          default: false,
          description: 'Enable verbose logging for the extension system.',
          scope: ConfigurationScope.Window,
          order: 12
        },
        'extensions.enableHotReload': {
          type: 'boolean',
          default: false,
          description: 'Enable hot reload for extensions (development mode).',
          scope: ConfigurationScope.Window,
          order: 13
        },
        'extensions.allowUnsignedExtensions': {
          type: 'boolean',
          default: true,
          description: 'Allow unsigned/development extensions to run.',
          scope: ConfigurationScope.Window,
          order: 14
        },

        // === User Experience ===
        'extensions.showLoadingProgress': {
          type: 'boolean',
          default: true,
          description: 'Show extension loading progress during startup.',
          scope: ConfigurationScope.Window,
          order: 15
        },
        'extensions.showActivationNotifications': {
          type: 'boolean',
          default: false,
          description: 'Notify user when extensions are activated or deactivated.',
          scope: ConfigurationScope.Window,
          order: 16
        },
        'extensions.autoUpdateExtensions': {
          type: 'boolean',
          default: true,
          description: 'Automatically update extensions when updates are available.',
          scope: ConfigurationScope.Window,
          order: 17
        }
      }
    }
  };

  // Register all configurations
  configurationService.registerSchema(workbenchConfig);
  configurationService.registerSchema(explorerConfig);
  configurationService.registerSchema(problemsConfig);
  configurationService.registerSchema(editorConfig);
  configurationService.registerSchema(filesConfig);
  configurationService.registerSchema(extensionsConfig);

  console.log('[ConfigurationBridge] Registered IDE configuration schemas');
}

/**
 * Sync configuration values from existing stores to configuration system
 */
export function syncFromStores(): void {
  const settings = getSettingsState();

  // Sync theme settings
  configurationActions.set({
    key: 'workbench.colorTheme',
    value: themeState.currentTheme.name,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync colorTheme:', err));

  configurationActions.set({
    key: 'workbench.colorThemePreference',
    value: themeState.userPreference,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync colorThemePreference:', err));

  configurationActions.set({
    key: 'workbench.preferredColorThemeBase',
    value: themeState.baseTheme,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync preferredColorThemeBase:', err));

  configurationActions.set({
    key: 'workbench.iconTheme',
    value: settings.iconThemeId || 'default',
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync iconTheme:', err));

  // Sync explorer settings
  configurationActions.set({
    key: 'explorer.fileIconColorMode',
    value: settings.fileIconColorMode,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync fileIconColorMode:', err));

  configurationActions.set({
    key: 'explorer.fileIconColors',
    value: settings.customFileColors,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync fileIconColors:', err));

  // Sync problems settings
  configurationActions.set({
    key: 'problems.showCurrentInStatus',
    value: settings.problems.showCurrentInStatus,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync showCurrentInStatus:', err));

  configurationActions.set({
    key: 'problems.sortOrder',
    value: settings.problems.sortOrder,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync sortOrder:', err));

  configurationActions.set({
    key: 'problems.autoReveal',
    value: settings.problems.autoReveal,
    scope: 'user'
  }).catch(err => console.error('[ConfigurationBridge] Failed to sync autoReveal:', err));

  console.log('[ConfigurationBridge] Synced values from existing stores to configuration system');
}

/**
 * Initialize configuration bridge
 * Registers schemas and sets up bidirectional sync
 */
export async function initializeConfigurationBridge(): Promise<void> {
  console.log('[ConfigurationBridge] Initializing...');

  // Register all IDE configuration schemas
  registerIDEConfigurations();

  // Sync current values from existing stores
  syncFromStores();

  // Set up configuration change listener to sync back to existing stores
  configurationService.onChange((event) => {
    const { changedKeys, newValues } = event;

    changedKeys.forEach(key => {
      const value = newValues[key];

      try {
        // Theme settings
        if (key === 'workbench.colorTheme') {
          // Direct theme change by full theme name (e.g., "navy-day", "monokai-night")
          const theme = findThemeByName(value);
          if (theme) {
            void setCurrentTheme(theme);
          } else {
            console.warn(`[ConfigurationBridge] Theme not found: ${value}`);
          }
        } else if (key === 'workbench.colorThemePreference') {
          void setUserPreference(value as ThemeMode);
        } else if (key === 'workbench.preferredColorThemeBase') {
          const mode = themeState.userPreference === 'system' ? themeState.systemTheme : themeState.userPreference;
          void switchBaseTheme(value, mode);
        } else if (key === 'workbench.iconTheme') {
          void setIconThemeId(value === 'default' ? null : value);
        }

        // Explorer settings
        else if (key === 'explorer.fileIconColorMode') {
          void setFileIconColorMode(value as FileIconColorMode);
        } else if (key === 'explorer.fileIconColors') {
          // Sync entire object
          const colors = value as Record<string, string>;
          Object.entries(colors).forEach(([ext, color]) => {
            void setCustomFileColor(ext, color);
          });
        }

        // Problems settings
        else if (key === 'problems.showCurrentInStatus') {
          void setShowCurrentProblemInStatus(value as boolean);
        } else if (key === 'problems.sortOrder') {
          void setProblemsSortOrder(value as ProblemsSortOrder);
        } else if (key === 'problems.autoReveal') {
          void setProblemsAutoReveal(value as boolean);
        }
      } catch (error) {
        console.error(`[ConfigurationBridge] Failed to sync configuration change for ${key}:`, error);
      }
    });
  });

  console.log('[ConfigurationBridge] Initialized successfully');
}
