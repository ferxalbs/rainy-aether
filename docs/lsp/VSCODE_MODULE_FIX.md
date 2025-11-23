# VSCode Module Import Fix

## Problem

When starting the Tauri development server with the new LSP integration, Vite failed with the following error:

```
Failed to resolve import "vscode" from "node_modules/.vite/deps/chunk-Y5SGONDY.js"
Does the file exist?
```

## Root Cause

The `vscode-languageclient` package has optional dependencies on the `vscode` module, which is only available in VS Code's extension host environment. When bundling for the browser (our Tauri WebView environment), this module doesn't exist and causes the build to fail.

Even though we're using `vscode-languageclient/browser.js` (the browser-compatible version), the bundler still processes imports from the vscode module during dependency analysis.

## Solution

We implemented a two-part solution in `vite.config.ts`:

### 1. Module Aliasing

Added an alias to redirect `vscode` imports to a stub module:

```typescript
resolve: {
  alias: {
    // ... other aliases
    "vscode": path.resolve(__dirname, "./src/polyfills/vscode.ts"),
  },
}
```

### 2. VSCode Stub Module

Created `src/polyfills/vscode.ts` with minimal exports:

```typescript
/**
 * VSCode API stub for browser environment
 * vscode-languageclient has optional dependencies on the vscode module
 * which is only available in VS Code extension host environments.
 */

export const workspace = {};
export const window = {};
export const commands = {};
export const languages = {};
export const Uri = class Uri {};
export const Range = class Range {};
export const Position = class Position {};
export const Disposable = class Disposable {};
export const EventEmitter = class EventEmitter {};

export default {};
```

### 3. Optimization Configuration

Updated `optimizeDeps` to include the browser-compatible version:

```typescript
optimizeDeps: {
  include: ['monaco-editor', 'vscode-languageclient/browser'],
  exclude: ['vscode'], // Exclude vscode module (stubbed in polyfills)
}
```

## Why This Works

1. **Browser Compatibility**: `vscode-languageclient/browser.js` doesn't actually use the vscode module at runtime - it's designed for browser environments
2. **Build-Time Resolution**: The imports are only referenced during TypeScript type checking and module resolution
3. **Stub Satisfaction**: Our stub provides just enough exports to satisfy the bundler without implementing any actual VS Code functionality
4. **Tauri IPC Instead**: We use our custom Tauri IPC transport (`TauriTransport.ts`) for all LSP communication, completely bypassing VS Code's extension APIs

## Result

✅ Vite dev server starts successfully
✅ LSP integration loads without errors
✅ Monaco editor can communicate with language servers via Tauri IPC
✅ No dependency on VS Code extension host

## Files Modified

1. `vite.config.ts` - Added vscode alias and optimization config
2. `src/polyfills/vscode.ts` - Created stub module (new file)

## Related Documentation

- [LSP Implementation Guide](./LSP_IMPLEMENTATION.md)
- [Ready to Test Guide](./READY_TO_TEST.md)
- [Integration Complete Summary](../../LSP_INTEGRATION_COMPLETE.md)

---

**Date**: November 23, 2025
**Issue**: Vite bundling error with vscode module
**Status**: ✅ FIXED
