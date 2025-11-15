# Extension Configuration System

**Comprehensive guide to the extension configuration system in Rainy Aether**

Version: 1.0.0
Date: 2025-11-14

---

## Overview

The Extension Configuration System provides granular control over how extensions are loaded, secured, and managed in Rainy Aether. This system addresses the core issue where extensions appear "enabled" but don't actually function until manually toggled.

## Problem Statement

**Original Issue**: Extensions would show as "enabled" in the Extension Manager on startup, but wouldn't actually work until you:
1. Click "Disable"
2. Click "Enable" again

This was caused by extensions not being automatically activated during IDE initialization.

## Solution

A comprehensive configuration system with multiple layers:

1. **Persistent Configuration Store** (`extensionConfigStore.ts`)
2. **VS Code-Compatible Configuration Bridge** (`configurationBridge.ts`)
3. **Smart Initialization Logic** (`App.tsx`)
4. **UI Controls** (`ExtensionManager.tsx`, `ExtensionConfigPanel.tsx`)

---

## Architecture

### 1. Extension Config Store

**Location**: `src/stores/extensionConfigStore.ts`

Manages all extension-related settings with persistence via Tauri's store plugin.

**Key Features**:
- ✅ React hooks for reactive UI updates
- ✅ Persistent storage (survives app restarts)
- ✅ Type-safe configuration
- ✅ Granular control over 18+ settings

**Core State**:

```typescript
interface ExtensionConfigState {
  // Startup Behavior
  startupActivationMode: 'auto' | 'manual';
  startupActivationDelay: number; // milliseconds
  loadingStrategy: 'parallel' | 'sequential' | 'lazy';

  // Security & Safety
  securityLevel: 'unrestricted' | 'safe' | 'restricted';
  whitelistedExtensions: string[];
  disableThirdParty: boolean;

  // Performance & Resources
  maxActiveExtensions: number; // 0 = unlimited
  enablePerformanceMonitoring: boolean;
  autoDisableSlowExtensions: boolean;
  performanceThreshold: number; // milliseconds

  // Error Handling
  errorHandling: 'continue' | 'stop' | 'isolate';
  autoCleanupErrorExtensions: boolean;
  showDetailedErrors: boolean;

  // Developer Options
  verboseLogging: boolean;
  enableHotReload: boolean;
  allowUnsignedExtensions: boolean;

  // User Experience
  showLoadingProgress: boolean;
  showActivationNotifications: boolean;
  autoUpdateExtensions: boolean;
}
```

### 2. Configuration Bridge

**Location**: `src/services/configurationBridge.ts`

Integrates extension configuration with the VS Code-compatible configuration system.

**Purpose**:
- Expose extension settings to the configuration API
- Allow extensions to query configuration
- Provide schema validation
- Enable future settings UI integration

**Registered Configurations**:
- `extensions.startupActivationMode`
- `extensions.startupActivationDelay`
- `extensions.loadingStrategy`
- `extensions.securityLevel`
- ... (18 total settings)

### 3. Initialization Logic

**Location**: `src/App.tsx` (Stage 3: Extensions)

**Flow**:

1. **Initialize Configuration**
   ```typescript
   await initializeExtensionConfig();
   ```

2. **Load Configuration**
   ```typescript
   const extensionConfig = getExtensionConfig();
   ```

3. **Auto-Cleanup (if enabled)**
   - Remove extensions in error state
   - Clean up stuck installations

4. **Apply Security Filters**
   - Check security level
   - Filter by whitelist (if restricted mode)
   - Block third-party extensions (if enabled)

5. **Apply Resource Limits**
   - Enforce max active extensions limit

6. **Choose Loading Strategy**
   - **Parallel**: Load all extensions simultaneously (fastest)
   - **Sequential**: Load one by one (safest)
   - **Lazy**: Load on-demand (most efficient)

7. **Activate Extensions**
   - Only if `startupActivationMode === 'auto'`
   - Apply activation delay between extensions
   - Handle errors based on `errorHandling` strategy

### 4. UI Components

#### Extension Manager Quick Config

**Location**: `src/components/ide/ExtensionManager.tsx`

**Features**:
- Toggle startup mode (Auto/Manual) with one click
- View current security level
- View loading strategy
- Warning message when in manual mode

**Usage**:
1. Open Extension Manager
2. Click the "Settings" icon in the header
3. Toggle startup mode or view current configuration

#### Advanced Configuration Panel

**Location**: `src/components/settings/ExtensionConfigPanel.tsx`

**Features**:
- Full control over all 18+ configuration options
- Organized into logical sections
- Live updates with React hooks
- Reset to defaults button
- Helpful tooltips and descriptions

**Sections**:
1. **Startup Behavior** - Control when and how extensions load
2. **Security & Safety** - Control which extensions can run
3. **Performance & Resources** - Manage resource usage
4. **Error Handling** - Control error behavior
5. **Developer Options** - Advanced debugging features
6. **User Experience** - Notifications and feedback

---

## Configuration Options

### Startup Behavior

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startupActivationMode` | `'auto' \| 'manual'` | `'auto'` | **SOLUTION TO ORIGINAL PROBLEM**: Set to 'auto' to activate extensions on startup |
| `startupActivationDelay` | `number` | `0` | Delay in ms between loading each extension |
| `loadingStrategy` | `'parallel' \| 'sequential' \| 'lazy'` | `'parallel'` | How extensions are loaded |

**Key Point**: Setting `startupActivationMode` to `'auto'` fixes the original issue where extensions didn't work on startup.

### Security & Safety

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `securityLevel` | `'unrestricted' \| 'safe' \| 'restricted'` | `'unrestricted'` | Which extensions can run |
| `disableThirdParty` | `boolean` | `false` | Block all non-Rainy Aether extensions |
| `allowUnsignedExtensions` | `boolean` | `true` | Allow development extensions |
| `whitelistedExtensions` | `string[]` | `[]` | Extensions allowed in restricted mode |

### Performance & Resources

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxActiveExtensions` | `number` | `0` | Max simultaneous extensions (0 = unlimited) |
| `enablePerformanceMonitoring` | `boolean` | `true` | Track extension performance |
| `autoDisableSlowExtensions` | `boolean` | `false` | Auto-disable slow extensions |
| `performanceThreshold` | `number` | `5000` | Max load time in ms |

### Error Handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `errorHandling` | `'continue' \| 'stop' \| 'isolate'` | `'continue'` | What to do on extension error |
| `autoCleanupErrorExtensions` | `boolean` | `false` | Auto-remove broken extensions |
| `showDetailedErrors` | `boolean` | `true` | Show detailed error messages |

### Developer Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `verboseLogging` | `boolean` | `false` | Enable detailed extension logs |
| `enableHotReload` | `boolean` | `false` | Auto-reload extensions on file change |

### User Experience

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showLoadingProgress` | `boolean` | `true` | Show progress during startup |
| `showActivationNotifications` | `boolean` | `false` | Notify on activation/deactivation |
| `autoUpdateExtensions` | `boolean` | `true` | Auto-update when available |

---

## Usage Examples

### Fix the Original Problem

**Problem**: Extensions show as "enabled" but don't work until manually toggled.

**Solution**: Ensure `startupActivationMode` is set to `'auto'`:

```typescript
import { setStartupActivationMode } from '@/stores/extensionConfigStore';

// Enable automatic activation on startup
await setStartupActivationMode('auto');
```

**Result**: Extensions will now automatically activate when the IDE starts.

### High-Security Mode

Lock down extensions for untrusted environments:

```typescript
import {
  setSecurityLevel,
  setDisableThirdParty,
  setAllowUnsignedExtensions
} from '@/stores/extensionConfigStore';

// Only allow built-in Rainy Aether extensions
await setSecurityLevel('safe');
await setDisableThirdParty(true);
await setAllowUnsignedExtensions(false);
```

### Performance-Optimized Mode

Optimize for slow machines:

```typescript
import {
  setLoadingStrategy,
  setMaxActiveExtensions,
  setAutoDisableSlowExtensions,
  setPerformanceThreshold
} from '@/stores/extensionConfigStore';

// Sequential loading, limit extensions, auto-disable slow ones
await setLoadingStrategy('sequential');
await setMaxActiveExtensions(5);
await setAutoDisableSlowExtensions(true);
await setPerformanceThreshold(3000); // 3 seconds
```

### Development Mode

Enable all development features:

```typescript
import {
  setVerboseLogging,
  setEnableHotReload,
  setAllowUnsignedExtensions,
  setShowDetailedErrors
} from '@/stores/extensionConfigStore';

await setVerboseLogging(true);
await setEnableHotReload(true);
await setAllowUnsignedExtensions(true);
await setShowDetailedErrors(true);
```

### React Hook Usage

```typescript
import { useExtensionConfig, useExtensionConfigValue } from '@/stores/extensionConfigStore';

function MyComponent() {
  // Get entire config
  const config = useExtensionConfig();

  // Get specific value
  const startupMode = useExtensionConfigValue('startupActivationMode');

  return (
    <div>
      <p>Startup Mode: {startupMode}</p>
      <p>Security Level: {config.securityLevel}</p>
    </div>
  );
}
```

---

## API Reference

### Actions

All actions are async and automatically persist changes:

```typescript
// Startup Behavior
await setStartupActivationMode(mode: 'auto' | 'manual')
await setStartupActivationDelay(delay: number)
await setLoadingStrategy(strategy: 'parallel' | 'sequential' | 'lazy')

// Security
await setSecurityLevel(level: 'unrestricted' | 'safe' | 'restricted')
await addToWhitelist(extensionId: string)
await removeFromWhitelist(extensionId: string)
await setDisableThirdParty(disable: boolean)

// Performance
await setMaxActiveExtensions(max: number)
await setEnablePerformanceMonitoring(enable: boolean)
await setAutoDisableSlowExtensions(disable: boolean)
await setPerformanceThreshold(threshold: number)

// Error Handling
await setErrorHandling(handling: 'continue' | 'stop' | 'isolate')
await setAutoCleanupErrorExtensions(cleanup: boolean)
await setShowDetailedErrors(show: boolean)

// Developer
await setVerboseLogging(verbose: boolean)
await setEnableHotReload(enable: boolean)
await setAllowUnsignedExtensions(allow: boolean)

// User Experience
await setShowLoadingProgress(show: boolean)
await setShowActivationNotifications(show: boolean)
await setAutoUpdateExtensions(update: boolean)

// Utility
await resetExtensionConfig() // Reset all to defaults
getExtensionConfig(): ExtensionConfigState // Get current config
isExtensionAllowed(extensionId: string, publisher?: string): boolean
```

### React Hooks

```typescript
// Get entire config (reactive)
const config = useExtensionConfig();

// Get specific value (reactive)
const value = useExtensionConfigValue('startupActivationMode');
```

---

## Migration Guide

### From Old System to New System

**Old approach** (before this update):
- Extensions wouldn't activate on startup
- No configuration options
- Manual toggle required every session

**New approach** (with this update):
1. Configuration is initialized in `App.tsx`
2. Extensions activate automatically if `startupActivationMode === 'auto'`
3. Users can control behavior via Extension Manager or Settings

**No breaking changes**: Existing extensions continue to work. New system is opt-in via configuration.

### For Extension Developers

No changes required. The configuration system is transparent to extensions.

Extensions can query configuration if needed:

```typescript
import { getExtensionConfig } from '@/stores/extensionConfigStore';

const config = getExtensionConfig();
if (config.verboseLogging) {
  console.log('[MyExtension] Detailed log message...');
}
```

---

## Best Practices

### For Users

1. **Use Automatic Mode for Daily Work**
   - Set `startupActivationMode: 'auto'`
   - Extensions work immediately on IDE startup

2. **Use Manual Mode for Security**
   - Set `startupActivationMode: 'manual'`
   - Review and activate extensions each session
   - Good for untrusted environments

3. **Enable Performance Monitoring**
   - Identify slow extensions
   - Optimize your extension setup

4. **Auto-Cleanup Error Extensions**
   - Set `autoCleanupErrorExtensions: true`
   - Keep extension list clean automatically

### For Administrators

1. **Lock Down Security for Teams**
   - Use `securityLevel: 'restricted'`
   - Maintain whitelist of approved extensions
   - Disable third-party extensions

2. **Optimize for Low-Spec Machines**
   - Use `loadingStrategy: 'sequential'` or `'lazy'`
   - Set `maxActiveExtensions` limit
   - Enable auto-disable for slow extensions

3. **Enable Verbose Logging for Troubleshooting**
   - Temporary enable for debugging
   - Disable in production for performance

---

## Troubleshooting

### Extensions Don't Activate on Startup

**Symptoms**: Extensions show as "enabled" but don't work until manually toggled.

**Solution**:
1. Open Extension Manager
2. Click Settings icon
3. Toggle "Startup Activation" to "Automatic"
4. Restart IDE

Or programmatically:
```typescript
await setStartupActivationMode('auto');
```

### Extensions Load Too Slowly

**Solutions**:
1. Reduce number of active extensions
2. Use sequential loading: `await setLoadingStrategy('sequential')`
3. Enable lazy loading: `await setLoadingStrategy('lazy')`
4. Increase activation delay: `await setStartupActivationDelay(500)`

### Extension Keeps Failing

**Solutions**:
1. Enable auto-cleanup: `await setAutoCleanupErrorExtensions(true)`
2. Enable detailed errors: `await setShowDetailedErrors(true)`
3. Check console logs (enable verbose logging)
4. Uninstall and reinstall the extension

### Security Warnings

**Symptom**: Extension blocked by security settings.

**Solutions**:
1. Check security level: `const config = getExtensionConfig()`
2. Add to whitelist: `await addToWhitelist('extension-id')`
3. Lower security level: `await setSecurityLevel('unrestricted')`
4. Enable third-party: `await setDisableThirdParty(false)`

---

## Future Enhancements

Planned improvements:

1. **Extension Profiles** - Save/load configuration presets
2. **Per-Extension Configuration** - Override global settings per extension
3. **Extension Dependency Resolution** - Auto-enable dependent extensions
4. **Extension Update Scheduling** - Control when updates are checked
5. **Extension Sandboxing** - Enhanced security isolation
6. **Extension Performance Dashboard** - Detailed metrics UI
7. **Extension Marketplace Integration** - In-app discovery and installation

---

## Related Documentation

- [Extension System Overview](./EXTENSIONS.md)
- [Extension Development Guide](./extensions/DEVELOPMENT.md)
- [Security Best Practices](./SECURITY.md)
- [Performance Optimization](./PERFORMANCE.md)

---

## Changelog

### Version 1.0.0 (2025-11-14)

**Initial Release**

- ✅ Extension configuration store with 18+ options
- ✅ VS Code-compatible configuration bridge
- ✅ Smart initialization with security filters
- ✅ Quick config in Extension Manager
- ✅ Advanced configuration panel
- ✅ Persistent storage via Tauri
- ✅ React hooks for reactive UI
- ✅ Loading strategies (parallel, sequential, lazy)
- ✅ Security levels (unrestricted, safe, restricted)
- ✅ Performance monitoring and auto-disable
- ✅ Error handling strategies
- ✅ Developer options (verbose logging, hot reload)

**Problem Solved**: Extensions now activate automatically on startup when configured for automatic mode, fixing the original issue where extensions appeared "enabled" but didn't work until manually toggled.

---

**For questions or support, see the main documentation or file an issue on GitHub.**
