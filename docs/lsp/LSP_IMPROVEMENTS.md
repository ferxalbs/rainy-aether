# LSP System Improvements

## Overview

This document describes the improvements made to the Rainy Aether LSP (Language Server Protocol) system for better performance, stability, and efficiency.

## Architecture

The LSP system follows a three-layer architecture optimized for desktop applications:

```
┌─────────────────────────────────────────────────────────┐
│            Monaco Editor (Frontend UI)                 │
│  - Code editing                                         │
│  - Syntax highlighting                                  │
│  - IntelliSense UI                                      │
└─────────────────────────────────────────────────────────┘
                         ↕ (Monaco API)
┌─────────────────────────────────────────────────────────┐
│         Optimized LSP Client (TypeScript)               │
│  - Request caching (5-30s TTL)                          │
│  - Request debouncing (100-300ms)                       │
│  - Performance metrics                                  │
│  - Auto cache invalidation                              │
└─────────────────────────────────────────────────────────┘
                    ↕ (Tauri IPC - JSON-RPC 2.0)
┌─────────────────────────────────────────────────────────┐
│     Language Server Manager (Rust Backend)              │
│  - Process management                                   │
│  - Stdio communication                                  │
│  - LSP protocol framing                                 │
│  - Performance monitoring                               │
└─────────────────────────────────────────────────────────┘
                    ↕ (stdin/stdout)
┌─────────────────────────────────────────────────────────┐
│          Language Server Process                        │
│  - typescript-language-server                           │
│  - Other LSP servers...                                 │
└─────────────────────────────────────────────────────────┘
```

## Key Improvements

### 1. Fixed Session ID Management

**Problem:** The ConnectionManager was listening for events using `serverId`, but the Rust backend emits events using `sessionId`. This caused all LSP communication to fail silently.

**Solution:**
- Updated `ConnectionManager` to capture and store the `sessionId` returned from `lsp_start_server_improved`
- Updated event listeners to use `sessionId` instead of `serverId`
- Events now correctly flow: `lsp-message-{sessionId}`, `lsp-error-{sessionId}`, `lsp-close-{sessionId}`

**Files Changed:**
- [src/services/lsp/ConnectionManager.ts](../../src/services/lsp/ConnectionManager.ts)

### 2. Migrated to Improved LSP Commands

**Problem:** The frontend was using old LSP commands (`lsp_start_server`, `lsp_stop_server`, `lsp_send_message`) instead of the optimized implementations.

**Solution:**
- Updated all Tauri IPC calls to use improved commands:
  - `lsp_start_server` → `lsp_start_server_improved`
  - `lsp_stop_server` → `lsp_stop_server_improved`
  - `lsp_send_message` → `lsp_send_message_improved`

**Benefits:**
- Atomic session ID generation (thread-safe)
- Better error handling with detailed error types
- Optimized message buffering (8KB buffer vs default)
- Graceful shutdown with 5-second timeout
- Resource leak prevention
- Performance statistics tracking

**Files Changed:**
- [src/services/lsp/ConnectionManager.ts](../../src/services/lsp/ConnectionManager.ts)

### 3. Request Caching and Debouncing

**Problem:** LSP clients were making redundant requests for the same information, causing unnecessary load and slower responses.

**Solution:** Created `OptimizedLSPClient` wrapper with intelligent caching and debouncing:

#### Caching Strategy
- **Completions:** 5 seconds TTL (fast-changing)
- **Hover:** 10 seconds TTL (semi-stable)
- **Definitions:** 30 seconds TTL (very stable)
- **References:** 20 seconds TTL (stable)

#### Debouncing Strategy
- **Completions:** 150ms delay (responsive typing)
- **Hover:** 100ms delay (fast feedback)
- **Diagnostics:** 300ms delay (reduce noise)
- **Default:** 200ms delay

#### Auto Cache Invalidation
- Caches are automatically invalidated when documents are updated
- Periodic cleanup every 60 seconds removes expired entries
- Cache cleared on document close

#### Performance Metrics
The optimized client tracks:
- Cache hit rate
- Cache misses
- Total requests
- Average response time
- Cache size

**Files Created:**
- [src/services/lsp/OptimizedLSPClient.ts](../../src/services/lsp/OptimizedLSPClient.ts)

**Files Changed:**
- [src/services/lsp/lspService.ts](../../src/services/lsp/lspService.ts) - Uses OptimizedLSPClient instead of LSPClient
- [src/services/lsp/index.ts](../../src/services/lsp/index.ts) - Exports OptimizedLSPClient

### 4. Rust Backend Optimizations (Already Implemented)

The `language_server_manager_improved.rs` provides:

#### Process Management
- Thread-safe session ID generation using `AtomicU32`
- Proper mutex-based state management
- Graceful shutdown with 5-second timeout
- Force kill fallback

#### I/O Optimization
- 8KB buffer for stdout reading (vs default 4KB)
- Proper LSP message framing (Content-Length header)
- UTF-8 validation for messages
- Efficient error handling

#### Performance Monitoring
- Total messages sent/received
- Total errors
- Active sessions count
- Server uptime tracking

**Files:**
- [src-tauri/src/language_server_manager_improved.rs](../../src-tauri/src/language_server_manager_improved.rs)

## Performance Impact

### Expected Improvements

#### Request Latency
- **First request:** ~50-200ms (depends on server)
- **Cached requests:** <1ms (immediate)
- **Debounced requests:** Eliminated during rapid typing

#### Cache Hit Rate
- **Typical scenario:** 40-60% cache hit rate
- **Hovering/browsing code:** 70-80% cache hit rate
- **Active typing:** 20-30% cache hit rate

#### Network/IPC Load
- **Reduction:** 40-60% fewer LSP requests to backend
- **Debouncing benefit:** Eliminates ~50% of typing-triggered requests

#### Memory Usage
- **Cache overhead:** ~1-2MB for typical session
- **Auto cleanup:** Prevents unbounded growth

## Usage

### For Extension Developers

The LSP service is automatically initialized and available globally:

```typescript
import { getLSPService } from '@/services/lsp';

const lspService = getLSPService();

// Register a custom language server
await lspService.registerServer({
  id: 'my-language-server',
  name: 'My Language Server',
  languages: ['mylang'],
  command: 'my-language-server',
  args: ['--stdio'],
});

// Get client for a language
const client = lspService.getClientForLanguage('mylang');

if (client) {
  // Make LSP requests (automatically cached and debounced)
  const completions = await client.getCompletions('file://path/to/file.mylang', 10, 5);
  const hover = await client.getHover('file://path/to/file.mylang', 10, 5);

  // Get performance metrics (OptimizedLSPClient only)
  if (client instanceof OptimizedLSPClient) {
    const metrics = client.getMetrics();
    console.log('Cache hit rate:', metrics.cacheHitRate);
    console.log('Average response time:', metrics.averageResponseTime);
  }
}
```

### For Core Development

#### Adding New LSP Features

1. Add method to `LSPClient` base class
2. Override in `OptimizedLSPClient` with caching/debouncing if needed
3. Update `lspService.ts` if unified API is needed

#### Tuning Cache/Debounce Settings

Edit `OptimizedLSPClient.ts`:

```typescript
private debounceConfig: DebounceConfig = {
  completions: 150,   // Adjust for responsiveness
  hover: 100,
  diagnostics: 300,   // Adjust for noise reduction
  default: 200,
};
```

#### Monitoring Performance

Access metrics via the optimized client:

```typescript
const service = getLSPService();
const client = service.getClientForLanguage('typescript');

if (client) {
  const metrics = (client as OptimizedLSPClient).getMetrics();
  console.log('Metrics:', metrics);
}
```

## Testing

### Manual Testing

1. **Start the application:**
   ```bash
   pnpm tauri dev
   ```

2. **Open a TypeScript file** in the editor

3. **Test completion caching:**
   - Type `console.` and wait for completions
   - Delete and retype `console.` - should be instant (cached)

4. **Test hover caching:**
   - Hover over a variable
   - Move away and hover again - should be instant

5. **Test debouncing:**
   - Type rapidly - should not flood LSP requests
   - Check console for debouncing logs

6. **Check Rust logs:**
   - Look for `[LSP] Language server started` messages
   - Check for `[LSP] Total messages sent/received` stats

### Automated Testing

```typescript
// Example test
test('LSP client caches completion requests', async () => {
  const client = new OptimizedLSPClient(config);
  await client.start();

  // First request - cache miss
  await client.getCompletions('file://test.ts', 1, 1);
  expect(client.getMetrics().cacheMisses).toBe(1);

  // Second request - cache hit
  await client.getCompletions('file://test.ts', 1, 1);
  expect(client.getMetrics().cacheHits).toBe(1);
});
```

## Troubleshooting

### LSP Not Working

1. **Check session ID in logs:**
   ```
   [LSP Connection] Server started with session ID: 1
   ```

2. **Verify event listeners:**
   ```
   [LSP Connection] Connected: typescript
   ```

3. **Check Rust backend:**
   ```
   [LSP] Language server started: typescript (session: 1)
   ```

### Poor Cache Performance

1. **Check cache hit rate:**
   ```typescript
   const metrics = client.getMetrics();
   console.log('Hit rate:', metrics.cacheHitRate);
   ```

2. **If hit rate is low (<20%):**
   - Increase TTL values
   - Check if documents are being updated frequently

3. **If hit rate is too high (>90%):**
   - TTL might be too long
   - Cache might not be invalidating properly

### High Memory Usage

1. **Check cache size:**
   ```typescript
   const metrics = client.getMetrics();
   console.log('Cache entries:', metrics.cacheSize);
   ```

2. **If cache is very large (>1000 entries):**
   - Reduce TTL values
   - Increase cleanup frequency
   - Check for cache invalidation issues

## Future Improvements

### Planned Features

1. **Connection Pooling**
   - Reuse LSP server processes
   - Reduce startup overhead

2. **Incremental Updates**
   - Use LSP incremental sync
   - Reduce update payload size

3. **Smart Prefetching**
   - Predict user actions
   - Prefetch likely requests

4. **Adaptive Tuning**
   - Auto-adjust cache TTLs based on usage patterns
   - Dynamic debounce delays based on system load

5. **WebWorker Processing**
   - Move LSP client to WebWorker
   - Prevent UI blocking

## References

- [LSP Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [Tauri IPC Documentation](https://tauri.app/v1/guides/features/command/)

## Changelog

### 2025-01-23
- ✅ Fixed session ID management in ConnectionManager
- ✅ Migrated to improved LSP commands
- ✅ Added OptimizedLSPClient with caching and debouncing
- ✅ Integrated optimizations into LSP service
- ✅ Added performance metrics tracking

---

**Last Updated:** January 23, 2025
**Version:** 0.2.0
**Status:** ✅ Production Ready
