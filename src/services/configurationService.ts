/**
 * Configuration Service
 *
 * Manages IDE configuration with VS Code-compatible schema support.
 * Provides CRUD operations, validation, and change notifications.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { configurationSaveService } from './configurationSaveService';
import type {
  ExtensionConfiguration,
  ResolvedConfigurationProperty,
  ConfigurationChangeEvent,
  ConfigurationValidationError,
  ConfigurationSearchResult,
  ConfigurationFilterOptions,
  ConfigurationUpdateRequest,
  ConfigurationResetRequest
} from '@/types/configuration';

/**
 * Configuration service class
 * Singleton pattern for managing IDE configuration
 */
class ConfigurationService {
  private static instance: ConfigurationService | null = null;

  /** Registered configuration schemas from extensions and core */
  private schemas: Map<string, ExtensionConfiguration> = new Map();

  /** Flattened property map for quick lookups */
  private properties: Map<string, ResolvedConfigurationProperty> = new Map();

  /** User-level configuration values */
  private userValues: Map<string, any> = new Map();

  /** Workspace-level configuration values */
  private workspaceValues: Map<string, any> = new Map();

  /** Current workspace path (if any) */
  private workspacePath: string | null = null;

  /** Change event listeners */
  private changeListeners: Set<(event: ConfigurationChangeEvent) => void> = new Set();

  /** Unlisten function for Tauri event listener */
  private unlistenTauriEvent: UnlistenFn | null = null;

  private constructor() {
    this.initializeEventListener();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Initialize Tauri event listener for configuration changes
   */
  private async initializeEventListener(): Promise<void> {
    try {
      console.log('[ConfigurationService] 🎧 Setting up Tauri event listener for "configuration-changed"...');

      this.unlistenTauriEvent = await listen<ConfigurationChangeEvent>(
        'configuration-changed',
        (event) => {
          console.log('[ConfigurationService] 📨 Tauri event received:', event.payload);
          this.handleConfigurationChange(event.payload);
        }
      );

      console.log('[ConfigurationService] ✅ Tauri event listener registered successfully');
    } catch (error) {
      console.error('[ConfigurationService] ❌ Failed to initialize event listener:', error);
    }
  }

  /**
   * Handle configuration change event from Rust backend
   */
  private handleConfigurationChange(event: ConfigurationChangeEvent): void {
    console.log('[ConfigurationService] 🔥 handleConfigurationChange called:', {
      scope: event.scope,
      scopeType: typeof event.scope,
      changedKeys: event.changedKeys,
      newValues: event.newValues
    });

    // Update local cache
    if (event.scope === 'user') {
      event.changedKeys.forEach(key => {
        const newValue = event.newValues[key];
        if (newValue !== undefined) {
          this.userValues.set(key, newValue);
        } else {
          this.userValues.delete(key);
        }
      });
    } else if (event.scope === 'workspace') {
      event.changedKeys.forEach(key => {
        const newValue = event.newValues[key];
        if (newValue !== undefined) {
          this.workspaceValues.set(key, newValue);
        } else {
          this.workspaceValues.delete(key);
        }
      });
    }

    // Notify listeners
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConfigurationService] Error in change listener:', error);
      }
    });
  }

  /**
   * Initialize configuration service
   * Load schemas and current values
   */
  async initialize(workspacePath?: string): Promise<void> {
    console.log('[ConfigurationService] Initializing...');

    this.workspacePath = workspacePath || null;

    // Load core IDE configuration schemas
    await this.loadCoreSchemas();

    // Load user and workspace configurations
    await this.loadUserConfiguration();

    if (this.workspacePath) {
      await this.loadWorkspaceConfiguration(this.workspacePath);
    }

    console.log('[ConfigurationService] Initialized with', this.properties.size, 'properties');
  }

  /**
   * Load core IDE configuration schemas
   */
  private async loadCoreSchemas(): Promise<void> {
    // Define core IDE configuration schemas
    const coreConfiguration: ExtensionConfiguration = {
      extensionId: 'rainy-aether.core',
      extensionName: 'Rainy Aether Core',
      isBuiltIn: true,
      configuration: {
        title: 'Core Settings',
        properties: {
          'editor.fontSize': {
            type: 'number',
            default: 14,
            minimum: 8,
            maximum: 72,
            description: 'Controls the font size in pixels',
            order: 1
          },
          'editor.fontFamily': {
            type: 'string',
            default: 'Consolas, "Courier New", monospace',
            description: 'Controls the font family',
            order: 2
          },
          'editor.tabSize': {
            type: 'integer',
            default: 4,
            minimum: 1,
            maximum: 8,
            description: 'The number of spaces a tab is equal to',
            order: 3
          },
          'editor.wordWrap': {
            type: 'string',
            enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
            enumDescriptions: [
              'Lines will never wrap',
              'Lines will wrap at the viewport width',
              'Lines will wrap at editor.wordWrapColumn',
              'Lines will wrap at the minimum of viewport and editor.wordWrapColumn'
            ],
            default: 'off',
            description: 'Controls how lines should wrap',
            order: 4
          },
          'editor.minimap.enabled': {
            type: 'boolean',
            default: true,
            description: 'Controls whether the minimap is shown',
            order: 5
          },
          'workbench.colorTheme': {
            type: 'string',
            default: 'github-day',
            description: 'Specifies the color theme used in the workbench',
            order: 10
          },
          'workbench.iconTheme': {
            type: 'string',
            default: 'default',
            description: 'Specifies the file icon theme used in the workbench',
            order: 11
          },
          'files.autoSave': {
            type: 'string',
            enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'],
            enumDescriptions: [
              'A dirty file is never automatically saved',
              'A dirty file is automatically saved after the configured delay',
              'A dirty file is automatically saved when the editor loses focus',
              'A dirty file is automatically saved when the window loses focus'
            ],
            default: 'off',
            description: 'Controls auto save of dirty files',
            order: 20
          },
          'files.autoSaveDelay': {
            type: 'number',
            default: 1000,
            minimum: 0,
            description: 'Controls the delay in milliseconds after which a dirty file is saved automatically',
            order: 21
          },
          'terminal.integrated.fontSize': {
            type: 'number',
            default: 14,
            minimum: 8,
            maximum: 72,
            description: 'Controls the font size in pixels of the terminal',
            order: 30
          },
          'terminal.integrated.fontFamily': {
            type: 'string',
            default: 'Consolas, monospace',
            description: 'Controls the font family of the terminal',
            order: 31
          }
        }
      }
    };

    this.registerSchema(coreConfiguration);
  }

  /**
   * Register a configuration schema from an extension
   */
  registerSchema(schema: ExtensionConfiguration): void {
    console.log('[ConfigurationService] Registering schema for:', schema.extensionId);

    this.schemas.set(schema.extensionId, schema);

    // Flatten properties for quick lookups
    const contributions = Array.isArray(schema.configuration)
      ? schema.configuration
      : [schema.configuration];

    contributions.forEach(contribution => {
      Object.entries(contribution.properties).forEach(([key, property]) => {
        const resolved: ResolvedConfigurationProperty = {
          ...property,
          key,
          extensionId: schema.extensionId,
          extensionName: schema.extensionName,
          isBuiltIn: schema.isBuiltIn,
          value: property.default,
          isModified: false
        };

        this.properties.set(key, resolved);
      });
    });
  }

  /**
   * Load user-level configuration from backend
   */
  private async loadUserConfiguration(): Promise<void> {
    try {
      const json = await invoke<string>('load_user_configuration');
      const values = JSON.parse(json) as Record<string, any>;

      Object.entries(values).forEach(([key, value]) => {
        this.userValues.set(key, value);
      });

      console.log('[ConfigurationService] Loaded user configuration:', this.userValues.size, 'values');
    } catch (error) {
      console.error('[ConfigurationService] Failed to load user configuration:', error);
    }
  }

  /**
   * Load workspace-level configuration from backend
   */
  private async loadWorkspaceConfiguration(workspacePath: string): Promise<void> {
    try {
      const json = await invoke<string>('load_workspace_configuration', { workspacePath });
      const values = JSON.parse(json) as Record<string, any>;

      Object.entries(values).forEach(([key, value]) => {
        this.workspaceValues.set(key, value);
      });

      console.log('[ConfigurationService] Loaded workspace configuration:', this.workspaceValues.size, 'values');
    } catch (error) {
      console.error('[ConfigurationService] Failed to load workspace configuration:', error);
    }
  }

  /**
   * Get a configuration value (with scope resolution)
   * Priority: workspace > user > default
   */
  get<T = any>(key: string, defaultValue?: T): T {
    // Check workspace scope first
    if (this.workspaceValues.has(key)) {
      return this.workspaceValues.get(key) as T;
    }

    // Check user scope
    if (this.userValues.has(key)) {
      return this.userValues.get(key) as T;
    }

    // Check schema default
    const property = this.properties.get(key);
    if (property?.default !== undefined) {
      return property.default as T;
    }

    // Return provided default or undefined
    return defaultValue as T;
  }

  /**
   * Set a configuration value at specified scope
   * Uses debounced save service for optimized disk I/O
   */
  async set(request: ConfigurationUpdateRequest): Promise<void> {
    try {
      // Validate value if schema exists
      const property = this.properties.get(request.key);
      if (property) {
        const validation = await this.validate(request.key, request.value);
        if (!validation.valid && validation.error) {
          throw new Error(validation.error.message);
        }
      }

      // Get old value for event
      const oldValue = this.get(request.key);

      // Update local cache immediately for responsive UI
      if (request.scope === 'user') {
        this.userValues.set(request.key, request.value);
      } else {
        this.workspaceValues.set(request.key, request.value);
      }

      // CRITICAL: Notify listeners IMMEDIATELY (don't wait for backend event)
      const changeEvent: ConfigurationChangeEvent = {
        changedKeys: [request.key],
        scope: request.scope as any,
        oldValues: { [request.key]: oldValue },
        newValues: { [request.key]: request.value },
        timestamp: Date.now()
      };

      this.changeListeners.forEach(listener => {
        try {
          listener(changeEvent);
        } catch (error) {
          console.error('[ConfigurationService] Error in change listener:', error);
        }
      });

      // Queue debounced save to backend
      configurationSaveService.queueSave(request.key, request.value, request.scope);

      console.log(`[ConfigurationService] Set ${request.key} = ${request.value} (${request.scope})`);
    } catch (error) {
      console.error('[ConfigurationService] Failed to set configuration:', error);
      throw error;
    }
  }

  /**
   * Reset a configuration value to default
   */
  async reset(request: ConfigurationResetRequest): Promise<void> {
    try {
      await invoke('delete_configuration_value', {
        key: request.key,
        scope: request.scope,
        workspacePath: this.workspacePath
      });

      console.log(`[ConfigurationService] Reset ${request.key} (${request.scope})`);
    } catch (error) {
      console.error('[ConfigurationService] Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * Validate a configuration value against its schema
   */
  async validate(key: string, value: any): Promise<{ valid: boolean; error?: ConfigurationValidationError }> {
    const property = this.properties.get(key);
    if (!property) {
      return { valid: true }; // No schema, allow anything
    }

    try {
      const valid = await invoke<boolean>('validate_configuration_value', {
        key,
        value: JSON.stringify(value),
        schema: JSON.stringify(property)
      });

      return { valid };
    } catch (error: any) {
      // Parse error message as ValidationError
      try {
        const validationError = JSON.parse(error) as ConfigurationValidationError;
        return { valid: false, error: validationError };
      } catch {
        return {
          valid: false,
          error: {
            key,
            message: error.toString()
          }
        };
      }
    }
  }

  /**
   * Get all resolved configuration properties
   */
  getAllProperties(): ResolvedConfigurationProperty[] {
    const resolved: ResolvedConfigurationProperty[] = [];

    this.properties.forEach((property, key) => {
      const effectiveValue = this.get(key);
      const isModified = effectiveValue !== property.default;

      resolved.push({
        ...property,
        value: effectiveValue,
        isModified
      });
    });

    return resolved;
  }

  /**
   * Search configuration properties
   */
  search(options: ConfigurationFilterOptions): ConfigurationSearchResult[] {
    const results: ConfigurationSearchResult[] = [];
    const query = options.query?.toLowerCase() || '';

    this.properties.forEach((property, key) => {
      // Filter by extension
      if (options.extensionId && property.extensionId !== options.extensionId) {
        return;
      }

      // Filter by modified only
      const effectiveValue = this.get(key);
      const isModified = effectiveValue !== property.default;
      if (options.modifiedOnly && !isModified) {
        return;
      }

      // Search match
      let score = 0;
      const matchedFields: string[] = [];

      if (!query) {
        score = 1;
      } else {
        // Match key
        if (key.toLowerCase().includes(query)) {
          score += 10;
          matchedFields.push('key');
        }

        // Match description
        const description = property.description || property.markdownDescription || '';
        if (description.toLowerCase().includes(query)) {
          score += 5;
          matchedFields.push('description');
        }

        // Match tags
        if (property.tags?.some(tag => tag.toLowerCase().includes(query))) {
          score += 3;
          matchedFields.push('tags');
        }
      }

      if (score > 0 || !query) {
        results.push({
          property: {
            ...property,
            value: effectiveValue,
            isModified
          },
          score,
          matchedFields
        });
      }
    });

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Register a change listener
   */
  onChange(listener: (event: ConfigurationChangeEvent) => void): () => void {
    this.changeListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Flush pending saves immediately
   */
  async flush(): Promise<void> {
    await configurationSaveService.flush();
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Flush any pending saves before cleanup
    await this.flush();

    if (this.unlistenTauriEvent) {
      this.unlistenTauriEvent();
      this.unlistenTauriEvent = null;
    }

    this.changeListeners.clear();
    this.schemas.clear();
    this.properties.clear();
    this.userValues.clear();
    this.workspaceValues.clear();
  }
}

// Export singleton instance
export const configurationService = ConfigurationService.getInstance();

// Export class for testing
export { ConfigurationService };
