# Test Configuration Extension

This is an example extension that demonstrates the Rainy Aether configuration system.

## Features

This extension showcases:

- **Configuration Schema Registration**: Defines settings in `package.json` using VS Code-compatible format
- **All Configuration Types**: Demonstrates string, number, integer, boolean, enum, array, and object types
- **Configuration Reading**: Shows how to read configuration values at activation
- **Configuration Updates**: Examples of programmatically updating settings
- **Change Listening**: Reacts to configuration changes in real-time
- **Validation**: Demonstrates pattern validation for API keys
- **Deprecation**: Shows how to deprecate old settings
- **Restart Requirements**: Indicates settings that require restart

## Configuration Settings

### `testExtension.enabled`
- **Type**: `boolean`
- **Default**: `true`
- Enable or disable the test extension features

### `testExtension.apiKey`
- **Type**: `string` (with pattern validation)
- **Default**: `""`
- API key for external service (must be 32 alphanumeric characters)

### `testExtension.logLevel`
- **Type**: `enum` (`debug`, `info`, `warn`, `error`)
- **Default**: `"info"`
- Logging verbosity level

### `testExtension.maxRetries`
- **Type**: `integer` (1-10)
- **Default**: `3`
- Maximum number of retry attempts

### `testExtension.timeout`
- **Type**: `number` (100-60000, step: 100)
- **Default**: `5000`
- Timeout for operations in milliseconds

### `testExtension.excludePatterns`
- **Type**: `array` of `string`
- **Default**: `["**/node_modules/**", "**/.git/**"]`
- File patterns to exclude from processing

### `testExtension.customSettings`
- **Type**: `object`
- **Default**: `{ "theme": "dark", "fontSize": 14 }`
- Custom settings object for advanced configuration

### `testExtension.webhookUrl`
- **Type**: `string` (multiline)
- **Default**: `""`
- Webhook URL for notifications

### `testExtension.experimentalFeatures`
- **Type**: `boolean`
- **Default**: `false`
- **Requires Restart**: Yes
- Enable experimental features

### `testExtension.deprecatedSetting` (Deprecated)
- **Type**: `string`
- **Default**: `"old-value"`
- **Status**: Deprecated (will be removed in v2.0)
- Use `testExtension.newSetting` instead

## Usage

1. The extension automatically registers its configuration on activation
2. Open Settings (Ctrl+, or Cmd+,) to see and edit these settings
3. Search for "Test Extension" to find all settings
4. Changes are automatically detected and logged to console
5. Some settings (like `experimentalFeatures`) require a restart

## Development

To build this extension:

```bash
cd example-extensions/test-config-extension
npm install
npm run compile
```

## Testing the Configuration System

This extension is perfect for testing the configuration UI:

1. **Test All Input Types**: Each setting demonstrates a different input control
2. **Test Validation**: Try entering an invalid API key to see validation errors
3. **Test Enum Dropdown**: Change the log level to see enum descriptions
4. **Test Number Inputs**: Adjust timeout and max retries with number spinners
5. **Test Arrays**: Edit the exclude patterns array
6. **Test Objects**: Modify the custom settings object
7. **Test Modified Indicator**: Change any setting to see the modified indicator
8. **Test Reset**: Click the reset button to restore defaults
9. **Test Deprecation Warning**: The deprecated setting shows a warning message
10. **Test Restart Badge**: Experimental features shows "Requires Restart" badge

## Configuration API Examples

### Reading Configuration

```typescript
const apiKey = configurationAPI.getConfiguration<string>('testExtension.apiKey', '');
const logLevel = configurationAPI.getConfiguration<string>('testExtension.logLevel', 'info');
```

### Updating Configuration

```typescript
await configurationAPI.updateConfiguration('testExtension.logLevel', 'debug', 'user');
```

### Batch Updates

```typescript
await configurationAPI.updateConfigurationBatch({
  'testExtension.maxRetries': 5,
  'testExtension.timeout': 10000
}, 'user');
```

### Listening to Changes

```typescript
const dispose = configurationAPI.onConfigurationChange((event) => {
  if (event.changedKeys.includes('testExtension.apiKey')) {
    console.log('API key changed!');
  }
});

// Later: cleanup
dispose();
```

### Getting All Settings

```typescript
const allSettings = configurationAPI.getConfigurationSection('testExtension');
```

## License

MIT
