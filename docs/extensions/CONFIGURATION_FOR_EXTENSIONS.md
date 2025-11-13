# Configuration System for Extension Developers

**Version:** 1.0.0
**Last Updated:** 2025-11-13
**Status:** ✅ Complete & Production Ready

---

## Overview

Rainy Aether provides a **VS Code-compatible configuration system** that allows extensions to expose settings to users through a beautiful, type-safe UI. This guide shows you how to integrate configuration into your extension.

### Key Features

✅ **VS Code Compatible** - Uses the same `contributes.configuration` schema
✅ **Automatic UI Generation** - Settings appear automatically in the Settings UI
✅ **Type Safe** - Full TypeScript support with validation
✅ **Real-time Updates** - Listen to configuration changes
✅ **Persistent** - Settings are automatically saved to disk
✅ **Scoped** - User-level and workspace-level settings
✅ **Validated** - Pattern matching, range validation, enum constraints

---

## Quick Start

### 1. Define Configuration in `package.json`

```json
{
  "name": "my-extension",
  "contributes": {
    "configuration": {
      "title": "My Extension Settings",
      "properties": {
        "myExtension.apiKey": {
          "type": "string",
          "default": "",
          "description": "API key for the service"
        },
        "myExtension.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable or disable the extension"
        },
        "myExtension.logLevel": {
          "type": "string",
          "enum": ["debug", "info", "warn", "error"],
          "default": "info",
          "description": "Logging level"
        }
      }
    }
  }
}
```

### 2. Register Configuration in Your Extension

```typescript
import type { ExtensionContext } from '@/services/extension/types';
import { configurationAPI } from '@/services/extension/configurationAPI';

export function activate(context: ExtensionContext): void {
  // Load package.json
  const packageJson = require('../package.json');

  // Register configuration schema
  if (packageJson.contributes?.configuration) {
    configurationAPI.registerExtensionConfiguration(
      'publisher.my-extension',
      'My Extension',
      packageJson.contributes.configuration
    );
  }

  // Read configuration values
  const apiKey = configurationAPI.getConfiguration<string>('myExtension.apiKey', '');
  const enabled = configurationAPI.getConfiguration<boolean>('myExtension.enabled', true);

  console.log('Extension configured:', { apiKey: apiKey ? '***' : '(not set)', enabled });
}
```

### 3. Access Settings in the UI

1. Press `Ctrl+,` (or `Cmd+,` on Mac) to open Settings
2. Click "All Settings" in the sidebar
3. Search for your extension name
4. All your settings appear automatically with appropriate controls!

---

## Configuration Schema Reference

### Supported Types

#### String

```json
{
  "myExtension.username": {
    "type": "string",
    "default": "guest",
    "description": "Username for authentication",
    "minLength": 3,
    "maxLength": 20,
    "pattern": "^[a-zA-Z0-9_]+$",
    "patternErrorMessage": "Username must contain only letters, numbers, and underscores"
  }
}
```

**UI Component:** Text input (single-line or multiline)

#### Number / Integer

```json
{
  "myExtension.maxRetries": {
    "type": "integer",
    "default": 3,
    "minimum": 1,
    "maximum": 10,
    "description": "Maximum retry attempts"
  },
  "myExtension.timeout": {
    "type": "number",
    "default": 5.5,
    "minimum": 0.1,
    "maximum": 60.0,
    "multipleOf": 0.1,
    "description": "Timeout in seconds"
  }
}
```

**UI Component:** Number input with spinner

#### Boolean

```json
{
  "myExtension.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable advanced features"
  }
}
```

**UI Component:** Toggle switch

#### Enum

```json
{
  "myExtension.logLevel": {
    "type": "string",
    "enum": ["debug", "info", "warn", "error"],
    "enumDescriptions": [
      "Show all debug messages",
      "Show informational messages",
      "Show warnings only",
      "Show errors only"
    ],
    "default": "info",
    "description": "Logging verbosity level"
  }
}
```

**UI Component:** Select dropdown with descriptions

#### Array

```json
{
  "myExtension.excludePatterns": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "default": ["**/node_modules/**", "**/.git/**"],
    "minItems": 0,
    "maxItems": 20,
    "description": "File patterns to exclude"
  }
}
```

**UI Component:** JSON editor (future: visual array editor)

#### Object

```json
{
  "myExtension.customSettings": {
    "type": "object",
    "properties": {
      "theme": { "type": "string" },
      "fontSize": { "type": "number" }
    },
    "default": {
      "theme": "dark",
      "fontSize": 14
    },
    "description": "Custom configuration object"
  }
}
```

**UI Component:** JSON editor (future: nested property editor)

---

## Advanced Features

### Multiline Text Input

For long strings (e.g., API URLs, JSON):

```json
{
  "myExtension.webhookUrl": {
    "type": "string",
    "default": "",
    "editPresentation": "multilineText",
    "description": "Webhook URL for notifications"
  }
}
```

### Deprecation Warnings

Mark settings as deprecated:

```json
{
  "myExtension.oldSetting": {
    "type": "string",
    "default": "value",
    "deprecationMessage": "This setting will be removed in version 2.0. Use myExtension.newSetting instead."
  }
}
```

**Result:** Shows a deprecation warning in the UI with the message.

### Restart Requirements

Indicate settings that require restart:

```json
{
  "myExtension.experimentalFeatures": {
    "type": "boolean",
    "default": false,
    "requiresRestart": true,
    "description": "Enable experimental features"
  }
}
```

**Result:** Shows "Requires Restart" badge in the UI.

### Configuration Scope

Control where settings can be applied:

```json
{
  "myExtension.apiKey": {
    "type": "string",
    "scope": "machine",
    "description": "Machine-specific API key"
  }
}
```

**Scopes:**
- `application` - Global (default)
- `machine` - Machine-specific
- `machine-overridable` - Machine-specific but can be overridden
- `window` - Window-specific
- `resource` - Workspace/file-specific

---

## Configuration API

### Reading Configuration

```typescript
import { configurationAPI } from '@/services/extension/configurationAPI';

// Get a single value
const apiKey = configurationAPI.getConfiguration<string>('myExtension.apiKey', '');
const maxRetries = configurationAPI.getConfiguration<number>('myExtension.maxRetries', 3);

// Get all extension settings as an object
interface MyConfig {
  apiKey: string;
  maxRetries: number;
  enabled: boolean;
}

const config = configurationAPI.getConfigurationSection<MyConfig>('myExtension');
console.log(config.apiKey, config.maxRetries, config.enabled);
```

### Updating Configuration

```typescript
// Update a single value
await configurationAPI.updateConfiguration(
  'myExtension.apiKey',
  'abc123',
  'user' // or 'workspace'
);

// Batch update
await configurationAPI.updateConfigurationBatch({
  'myExtension.apiKey': 'abc123',
  'myExtension.maxRetries': 5,
  'myExtension.enabled': true
}, 'user');
```

### Resetting Configuration

```typescript
// Reset to default value
await configurationAPI.resetConfiguration('myExtension.apiKey', 'user');
```

### Listening to Changes

```typescript
export function activate(context: ExtensionContext): void {
  // Listen to configuration changes
  const dispose = configurationAPI.onConfigurationChange((event) => {
    console.log('Configuration changed:', event.changedKeys);

    // React to specific changes
    if (event.changedKeys.includes('myExtension.apiKey')) {
      const newApiKey = configurationAPI.getConfiguration<string>('myExtension.apiKey', '');
      console.log('API key changed to:', newApiKey);
      // Reconnect to service, etc.
    }

    if (event.changedKeys.includes('myExtension.enabled')) {
      const enabled = configurationAPI.getConfiguration<boolean>('myExtension.enabled', true);
      if (enabled) {
        startFeatures();
      } else {
        stopFeatures();
      }
    }
  });

  // Register cleanup
  context.subscriptions.push({ dispose });
}
```

### Checking Configuration Existence

```typescript
// Check if a key exists in schema
if (configurationAPI.hasConfiguration('myExtension.apiKey')) {
  console.log('API key setting exists');
}

// Get all extension configuration keys
const keys = configurationAPI.getConfigurationKeys('myExtension.');
// Returns: ['myExtension.apiKey', 'myExtension.maxRetries', ...]
```

---

## Best Practices

### 1. Naming Conventions

- **Use prefix**: All settings should start with your extension name
  - ✅ `myExtension.apiKey`
  - ❌ `apiKey`

- **Use camelCase**: For property names
  - ✅ `myExtension.maxRetries`
  - ❌ `myExtension.max-retries`

- **Use dot notation**: For logical grouping
  - ✅ `myExtension.server.host`
  - ✅ `myExtension.server.port`

### 2. Provide Defaults

Always provide sensible default values:

```json
{
  "myExtension.timeout": {
    "type": "number",
    "default": 5000,  // ✅ Good: Has default
    "description": "Timeout in milliseconds"
  }
}
```

### 3. Write Clear Descriptions

```json
{
  "myExtension.autoSave": {
    "type": "boolean",
    "default": true,
    "description": "Automatically save files after editing"  // ✅ Clear and concise
  }
}
```

### 4. Add Validation

Prevent invalid input with constraints:

```json
{
  "myExtension.apiKey": {
    "type": "string",
    "pattern": "^[a-zA-Z0-9]{32}$",
    "patternErrorMessage": "API key must be exactly 32 alphanumeric characters"
  },
  "myExtension.port": {
    "type": "integer",
    "minimum": 1024,
    "maximum": 65535
  }
}
```

### 5. Handle Configuration Changes

Always listen for changes and react appropriately:

```typescript
configurationAPI.onConfigurationChange((event) => {
  if (event.changedKeys.includes('myExtension.apiKey')) {
    // Reconnect to service with new API key
    reconnect();
  }

  if (event.changedKeys.includes('myExtension.enabled')) {
    // Start/stop features based on enabled status
    const enabled = configurationAPI.getConfiguration<boolean>('myExtension.enabled');
    if (enabled) {
      startFeatures();
    } else {
      stopFeatures();
    }
  }
});
```

### 6. Sensitive Data

For sensitive data like API keys, mask when logging:

```typescript
const apiKey = configurationAPI.getConfiguration<string>('myExtension.apiKey', '');
console.log('API key:', apiKey ? '***' : '(not set)');  // ✅ Masked
console.log('API key:', apiKey);  // ❌ Exposed
```

---

## Example Extension

See [example-extensions/test-config-extension](../../example-extensions/test-config-extension) for a complete working example that demonstrates:

- ✅ All configuration types (string, number, boolean, enum, array, object)
- ✅ Pattern validation
- ✅ Enum with descriptions
- ✅ Multiline text input
- ✅ Deprecation warnings
- ✅ Restart requirements
- ✅ Reading configuration
- ✅ Listening to changes
- ✅ Batch updates
- ✅ Configuration-driven behavior

---

## Troubleshooting

### Settings Not Showing in UI

**Problem:** My extension's settings don't appear in the Settings UI.

**Solution:**
1. Verify `package.json` has correct `contributes.configuration` section
2. Check that `registerExtensionConfiguration` is called during activation
3. Ensure extension ID matches the one used in registration
4. Check browser console for errors

### Configuration Not Persisting

**Problem:** Settings revert after restart.

**Solution:**
1. Check that Tauri backend is running (`pnpm tauri dev`)
2. Verify file permissions for `~/.rainy-aether/settings.json`
3. Check console for save errors
4. Ensure scope is set correctly ('user' or 'workspace')

### Validation Errors

**Problem:** Can't save valid values.

**Solution:**
1. Check schema definition matches value type
2. Verify pattern regex is valid
3. Test validation separately:
   ```typescript
   const result = await configurationAPI.validateConfiguration(key, value);
   console.log(result);
   ```

### Changes Not Detected

**Problem:** Extension doesn't react to configuration changes.

**Solution:**
1. Verify `onConfigurationChange` listener is registered
2. Check that listener is added to `context.subscriptions` for cleanup
3. Ensure changed key is checked in the event handler
4. Check console for listener errors

---

## Migration from Old Settings System

If you're migrating from a custom settings system:

### Before (Custom Settings)

```typescript
// Old way - custom storage
const settings = await loadSettings();
const apiKey = settings.apiKey || '';
```

### After (Configuration System)

```typescript
// New way - configuration system
const apiKey = configurationAPI.getConfiguration<string>('myExtension.apiKey', '');
```

### Benefits of Migration

✅ **Automatic UI** - No need to build settings UI
✅ **Validation** - Built-in type and constraint validation
✅ **Persistence** - Automatic saving to disk
✅ **Scoping** - User vs workspace settings
✅ **Change Events** - Real-time notifications
✅ **Consistency** - Same UX as other extensions

---

## API Reference

### `registerExtensionConfiguration`

Register configuration schema from package.json.

```typescript
configurationAPI.registerExtensionConfiguration(
  extensionId: string,
  extensionName: string,
  contribution: ConfigurationContribution | ConfigurationContribution[]
): void
```

### `getConfiguration`

Get a configuration value with optional default.

```typescript
configurationAPI.getConfiguration<T = any>(
  key: string,
  defaultValue?: T
): T
```

### `updateConfiguration`

Update a configuration value.

```typescript
configurationAPI.updateConfiguration(
  key: string,
  value: any,
  scope: 'user' | 'workspace' = 'user'
): Promise<void>
```

### `resetConfiguration`

Reset configuration to default value.

```typescript
configurationAPI.resetConfiguration(
  key: string,
  scope: 'user' | 'workspace' = 'user'
): Promise<void>
```

### `onConfigurationChange`

Listen to configuration changes.

```typescript
configurationAPI.onConfigurationChange(
  callback: (event: ConfigurationChangeEvent) => void
): () => void  // Returns dispose function
```

### `getConfigurationSection`

Get all settings for a section as a typed object.

```typescript
configurationAPI.getConfigurationSection<T extends Record<string, any>>(
  section: string
): T
```

### `updateConfigurationBatch`

Update multiple configuration values at once.

```typescript
configurationAPI.updateConfigurationBatch(
  updates: Record<string, any>,
  scope: 'user' | 'workspace' = 'user'
): Promise<void>
```

---

## Additional Resources

- [Configuration System Documentation](../configuration/CONFIGURATION_SYSTEM.md)
- [Type Component Mapping](../configuration/TYPE_COMPONENT_MAPPING.md)
- [VS Code Configuration API](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)
- [Example Extension](../../example-extensions/test-config-extension)

---

*Last updated: 2025-11-13*
*Rainy Aether Development Team*
