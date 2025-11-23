# LSP Implementation Guide

## Modern, Optimized LSP System for Rainy Aether

This document describes the new, modern LSP (Language Server Protocol) implementation using `monaco-languageclient` and Tauri IPC.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Components](#components)
- [Key Improvements](#key-improvements)
- [How to Use](#how-to-use)
- [Integration Guide](#integration-guide)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

The LSP system follows a modern, three-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monaco Editor (Frontend)                  │
│           TypeScript/JavaScript code editing                 │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  Monaco Language Client                      │
│    MonacoLanguageClient (monaco-languageclient)             │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   Tauri Transport Layer                      │
│         TauriMessageReader / TauriMessageWriter             │
│              (Custom IPC-based transport)                    │
└─────────────────────────────────────────────────────────────┘
                              ↕ (Tauri IPC Events)
┌─────────────────────────────────────────────────────────────┐
│              Language Server Manager (Rust)                  │
│          Process lifecycle, stdio communication              │
└─────────────────────────────────────────────────────────────┘
                              ↕ (stdio)
┌─────────────────────────────────────────────────────────────┐
│              typescript-language-server                      │
│          LSP server for TypeScript/JavaScript                │
└─────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **Monaco Editor** → User edits code
2. **MonacoLanguageClient** → Detects changes, requests completions/diagnostics
3. **TauriTransport** → Serializes LSP messages and sends via Tauri IPC
4. **Rust Backend** → Routes messages to/from language server process
5. **typescript-language-server** → Processes requests, sends responses

---

## 🔧 Components

### 1. Tauri Transport Layer (`TauriTransport.ts`)

**Purpose**: Implements the `MessageReader`/`MessageWriter` interface required by `monaco-languageclient`.

**Key Classes**:
- `TauriMessageReader`: Receives LSP messages from server via Tauri IPC events
- `TauriMessageWriter`: Sends LSP messages to server via Tauri IPC commands
- `createTauriMessageConnection()`: Factory function to create transport

**Features**:
- ✅ Implements standard LSP message framing (Content-Length headers)
- ✅ Event-based message delivery (non-blocking)
- ✅ Proper error handling and disposal
- ✅ Uses RAL (Runtime Abstraction Layer) emitters for compatibility

### 2. Monaco Language Client (`monacoLanguageClient.ts`)

**Purpose**: Manages the `MonacoLanguageClient` instance and its lifecycle.

**Key Features**:
- ✅ Singleton manager pattern
- ✅ Automatic workspace detection
- ✅ Comprehensive error handling (with automatic restart)
- ✅ Document synchronization
- ✅ TypeScript preferences (inlay hints, type hints, etc.)

**API**:
```typescript
// Initialize (start the client)
await initializeLanguageClient();

// Stop the client
await shutdownLanguageClient();

// Restart the client
await restartLanguageClient();

// Check if running
const isRunning = isLanguageClientRunning();
```

### 3. LSP Integration Hook (`useLSPIntegration.ts`)

**Purpose**: React hook for easy integration with Monaco Editor components.

**Usage**:
```typescript
function MyEditor() {
  const { isLSPReady, isLSPRunning, restartLSP } = useLSPIntegration({
    enabled: true,
    workspacePath: '/path/to/project',
    onReady: () => console.log('LSP ready!'),
    onError: (err) => console.error('LSP error:', err),
  });

  return <div>LSP Status: {isLSPReady ? 'Ready' : 'Starting...'}</div>;
}
```

### 4. Rust Language Server Manager (`language_server_manager_improved.rs`)

**Purpose**: Manages language server processes in the Rust backend.

**Key Improvements**:
- ✅ Atomic session ID generation (thread-safe)
- ✅ Optimized message buffering (8KB buffer)
- ✅ Proper LSP message framing (Content-Length headers)
- ✅ Graceful shutdown with timeout
- ✅ Statistics tracking (messages sent/received, errors, uptime)
- ✅ Resource leak prevention
- ✅ Detailed error types

**Commands**:
- `lsp_start_server_improved`: Start a language server
- `lsp_stop_server_improved`: Stop a language server
- `lsp_send_message_improved`: Send message to language server
- `lsp_get_stats`: Get server statistics

---

## 🚀 Key Improvements

### Compared to Previous Implementation

| Feature | Old Implementation | New Implementation |
|---------|-------------------|-------------------|
| **Transport** | Custom JSON-RPC over IPC | Standard `monaco-languageclient` interface |
| **Message Framing** | Manual parsing | Proper LSP Content-Length headers |
| **Error Handling** | Basic try-catch | Comprehensive error types + recovery |
| **Performance** | 4KB buffer | 8KB buffer + optimized I/O |
| **Session Management** | Simple counter | Atomic counters + session tracking |
| **Shutdown** | Immediate kill | Graceful shutdown with 5s timeout |
| **Statistics** | None | Full metrics (messages, errors, uptime) |
| **Memory Safety** | Potential leaks | Proper disposal + cleanup |

### Performance Optimizations

1. **Larger Buffers**: 8KB vs 4KB for reduced syscalls
2. **Atomic Operations**: Lock-free session ID generation
3. **Efficient Event Emission**: Batched Tauri events
4. **Lazy Initialization**: Client starts only when needed
5. **Resource Pooling**: Reuses event listeners

---

## 📖 How to Use

### Step 1: Install Dependencies

Dependencies are already in `package.json`:
```json
{
  "dependencies": {
    "monaco-editor": "^0.55.1",
    "monaco-languageclient": "^10.3.0",
    "vscode-ws-jsonrpc": "^3.5.0",
    "vscode-languageserver-protocol": "^3.17.5",
    "vscode-languageserver-types": "^3.17.5"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "typescript-language-server": "^4.3.3"
  }
}
```

Install: `pnpm install`

### Step 2: Configure Monaco Services (Once, Before Editor)

```typescript
import { configureMonacoServices } from '@/services/lsp/useLSPIntegration';

// Call once during app initialization
configureMonacoServices();
```

### Step 3: Use LSP Hook in Editor Component

```typescript
import { useLSPIntegration } from '@/services/lsp/useLSPIntegration';

function MonacoEditor() {
  const { isLSPReady, restartLSP } = useLSPIntegration({
    enabled: true,
    workspacePath: ideState.workspace,
    onReady: () => console.log('LSP ready for coding!'),
    onError: (err) => console.error('LSP error:', err),
  });

  // Monaco editor initialization here...

  return <div>{/* Editor UI */}</div>;
}
```

### Step 4: Register Improved Commands in Rust (Already Done)

In `src-tauri/src/lib.rs`, add:

```rust
mod language_server_manager_improved;

// In run():
.manage(language_server_manager_improved::LanguageServerManagerImproved::new())
.invoke_handler(tauri::generate_handler![
    language_server_manager_improved::lsp_start_server_improved,
    language_server_manager_improved::lsp_stop_server_improved,
    language_server_manager_improved::lsp_send_message_improved,
    language_server_manager_improved::lsp_get_stats,
    // ... other commands
])
```

---

## 🔌 Integration Guide

### Full Integration Example

```typescript
// 1. App.tsx - Configure services once
import { configureMonacoServices } from '@/services/lsp/useLSPIntegration';

function App() {
  useEffect(() => {
    configureMonacoServices();
  }, []);

  return <IDE />;
}

// 2. MonacoEditor.tsx - Use the hook
import { useLSPIntegration } from '@/services/lsp/useLSPIntegration';
import { useIDEState } from '@/stores/ideStore';

function MonacoEditor() {
  const ideState = useIDEState();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Initialize LSP
  const { isLSPReady, restartLSP } = useLSPIntegration({
    enabled: true,
    workspacePath: ideState.workspace,
    onReady: () => {
      console.log('✅ LSP is ready for TypeScript/JavaScript!');
    },
    onError: (error) => {
      console.error('❌ LSP error:', error);
    },
  });

  // Initialize Monaco Editor
  useEffect(() => {
    const container = document.getElementById('monaco-container');
    if (!container) return;

    const editor = monaco.editor.create(container, {
      value: 'console.log("Hello LSP!");',
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      // LSP features will be enabled automatically
    });

    editorRef.current = editor;

    return () => {
      editor.dispose();
    };
  }, []);

  return (
    <div>
      <div>LSP Status: {isLSPReady ? '✅ Ready' : '⏳ Starting...'}</div>
      <div id="monaco-container" style={{ height: '600px' }} />
      <button onClick={restartLSP}>Restart LSP</button>
    </div>
  );
}
```

---

## ⚡ Performance Optimizations

### 1. Message Buffering

**Rust Backend**:
```rust
// Larger buffer for better performance
let mut reader = BufReader::with_capacity(8192, stdout);
```

### 2. Atomic Session IDs

**Rust Backend**:
```rust
static SESSION_COUNTER: AtomicU32 = AtomicU32::new(1);
let session_id = SESSION_COUNTER.fetch_add(1, Ordering::SeqCst);
```

### 3. Efficient Event Listeners

**Frontend**:
```typescript
// Reuse event listeners via dispose pattern
const unlisten = await listen('lsp-message-123', handler);
// ... later
unlisten(); // Clean up
```

### 4. Lazy Initialization

- Language client starts only when editor is ready
- Transport created on-demand
- Resources released immediately on shutdown

### 5. Statistics Monitoring

```typescript
// Get performance stats
const stats = await invoke('lsp_get_stats');
console.log('Messages sent:', stats.total_messages_sent);
console.log('Messages received:', stats.total_messages_received);
console.log('Errors:', stats.total_errors);
console.log('Active sessions:', stats.active_sessions);
```

---

## 🐛 Troubleshooting

### LSP Not Starting

**Problem**: Language client fails to start

**Solutions**:
1. Check if `typescript-language-server` is installed:
   ```bash
   pnpm install
   ```

2. Verify Tauri environment:
   ```typescript
   import { isTauriEnvironment } from '@/services/lsp/TauriTransport';
   console.log('Is Tauri:', isTauriEnvironment());
   ```

3. Check console for errors:
   - Frontend: Browser DevTools Console
   - Backend: Rust stdout/stderr

### No Autocomplete/Diagnostics

**Problem**: LSP started but no IntelliSense

**Solutions**:
1. Ensure workspace path is set correctly:
   ```typescript
   useLSPIntegration({
     workspacePath: '/absolute/path/to/project',
   });
   ```

2. Check if file language is recognized:
   ```typescript
   const model = editor.getModel();
   console.log('Language ID:', model?.getLanguageId());
   ```

3. Verify `tsconfig.json` exists in workspace root

### Performance Issues

**Problem**: Slow autocomplete or high CPU usage

**Solutions**:
1. Check statistics:
   ```typescript
   const stats = await invoke('lsp_get_stats');
   // High error count = investigate errors
   ```

2. Restart LSP:
   ```typescript
   await restartLSP();
   ```

3. Check for memory leaks:
   - Ensure `dispose()` is called on unmount
   - Monitor active sessions count

### Server Crashes

**Problem**: Language server process crashes

**Solutions**:
1. Check stderr output:
   ```
   [LSP stderr] typescript-language-server: <error message>
   ```

2. Verify `node_modules/.bin/typescript-language-server` exists

3. Try manual start to test:
   ```bash
   node_modules/.bin/typescript-language-server --stdio
   ```

---

## 📚 References

- **monaco-languageclient**: https://github.com/TypeFox/monaco-languageclient
- **typescript-language-server**: https://github.com/typescript-language-server/typescript-language-server
- **LSP Specification**: https://microsoft.github.io/language-server-protocol/
- **Tauri IPC**: https://tauri.app/v2/develop/ipc/

---

## ✅ Next Steps

1. **Test Integration**: Follow integration guide above
2. **Monitor Performance**: Use `lsp_get_stats` to track metrics
3. **Add More Languages**: Extend system to support Python, Rust, etc.
4. **Optimize Further**: Profile and identify bottlenecks

---

**Built with ❤️ for Rainy Aether**

*Last Updated: November 23, 2025*
