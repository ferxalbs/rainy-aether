# Rainy Aether Architecture

This document provides a comprehensive overview of Rainy Aether's technical architecture, design decisions, and system components.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Communication Layer](#communication-layer)
- [State Management](#state-management)
- [Key Systems](#key-systems)
- [Performance Considerations](#performance-considerations)
- [Security Architecture](#security-architecture)
- [Future Architecture](#future-architecture)

---

## Overview

Rainy Aether is built using a **hybrid desktop architecture** combining:

- **Frontend**: Modern React 19 application with TypeScript
- **Backend**: Native Rust application via Tauri 2.0
- **Communication**: JSON-based IPC (Inter-Process Communication) via Tauri
- **Rendering**: System WebView (not bundled Chromium)

### Design Goals

1. **Performance**: Fast startup, low memory usage, responsive UI
2. **Security**: Sandboxed execution, privilege separation, explicit permissions
3. **Maintainability**: Clean architecture, separation of concerns, testability
4. **Extensibility**: Plugin system, LSP integration, customizable
5. **Cross-Platform**: Native Windows, macOS, and Linux support

---

## Technology Stack

### Frontend Layer

```
┌─────────────────────────────────────────────────┐
│              React 19 Application               │
├─────────────────────────────────────────────────┤
│  UI Framework:        React 19 (w/ Concurrent)  │
│  Language:            TypeScript 5.x            │
│  Editor:              Monaco Editor             │
│  Styling:             Tailwind CSS v4           │
│  Build Tool:          Vite 5.x                  │
│  State Management:    useSyncExternalStore      │
│  Terminal UI:         xterm.js                  │
└─────────────────────────────────────────────────┘
```

### Backend Layer

```
┌─────────────────────────────────────────────────┐
│               Rust Application                  │
├─────────────────────────────────────────────────┤
│  Framework:           Tauri 2.0                 │
│  Language:            Rust 1.70+                │
│  Async Runtime:       tokio                     │
│  Terminal:            portable-pty              │
│  Git:                 git2                      │
│  Serialization:       serde, serde_json         │
│  File Watching:       notify                    │
└─────────────────────────────────────────────────┘
```

### Why Tauri vs Electron?

| Aspect | Tauri | Electron | Benefit |
|--------|-------|----------|---------|
| **Bundle Size** | ~10MB | ~120MB | 92% smaller |
| **Memory Usage** | ~100MB | ~500MB | 80% less RAM |
| **Startup Time** | ~1.5s | ~4s | 2.5x faster |
| **Security** | Rust + Sandboxing | Node.js exposure | More secure |
| **Updates** | System WebView | Bundled Chromium | Always up-to-date |

---

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│                      (System WebView)                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Monaco    │  │  Terminal  │  │File Tree   │  │  Panels    │ │
│  │  Editor    │  │  (xterm.js)│  │ Explorer   │  │ (Git, etc) │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       React State Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ IDE Store  │  │ Terminal   │  │ Git Store  │  │ Editor     │ │
│  │            │  │  Store     │  │            │  │  Store     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Tauri IPC Bridge                             │
│                  (JSON-RPC over IPC)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Commands (Frontend → Backend)                           │   │
│  │  Events (Backend → Frontend)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Rust Backend                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Project   │  │  Terminal  │  │    Git     │  │   HTTP     │ │
│  │  Manager   │  │  Manager   │  │  Manager   │  │  Client    │ │
│  │ (File I/O) │  │   (PTY)    │  │  (git2)    │  │ (AI APIs)  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Operating System                             │
│     File System  │  PTY/Shell  │  Git  │  Network  │  Keychain  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   ├── ide/                    # IDE-specific components
│   │   ├── IDE.tsx            # Main IDE layout
│   │   ├── MonacoEditor.tsx   # Monaco editor wrapper
│   │   ├── ProjectExplorer.tsx
│   │   ├── TerminalPanel.tsx
│   │   ├── StatusBar.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── ProblemsPanel.tsx
│   │   ├── MenuBar.tsx
│   │   └── ...
│   └── ui/                     # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── ScrollArea.tsx
│       └── ...
├── stores/                     # State management
│   ├── ideStore.tsx           # Main IDE state
│   ├── editorStore.ts         # Monaco editor state
│   ├── terminalStore.ts       # Terminal sessions
│   ├── gitStore.ts            # Git state
│   ├── themeStore.ts          # Theme management
│   └── settingsStore.ts       # User preferences
├── services/                   # Business logic
│   ├── diagnosticService.ts   # Error/warning management
│   ├── gitService.ts          # Git command wrappers
│   ├── terminalService.ts     # Terminal lifecycle
│   ├── monacoWorkers.ts       # Monaco web workers
│   └── lsp/                   # LSP client (future)
├── themes/                     # Theme definitions
│   ├── index.ts               # Theme registry
│   └── themeValidator.ts      # Accessibility checks
├── utils/                      # Utility functions
│   ├── systemTheme.ts         # OS theme detection
│   └── ...
├── lib/                        # Library code
│   └── cn.ts                  # Classname utility
└── App.tsx                     # Root component
```

### Component Architecture

```
IDE (Main Container)
├── MenuBar
├── Breadcrumbs
├── Sidebar (Resizable)
│   ├── ProjectExplorer
│   ├── GitPanel
│   └── SearchPanel
├── EditorArea (Resizable)
│   ├── TabBar
│   └── MonacoEditor (or EmptyState)
└── BottomPanel (Resizable)
    ├── TerminalPanel
    ├── ProblemsPanel
    └── OutputPanel
```

### Rendering Strategy

- **Functional Components**: All components use React hooks
- **Lazy Loading**: Heavy components loaded on-demand
- **Virtual Scrolling**: For large lists (file tree, problems panel)
- **Memoization**: `useMemo` and `React.memo` for expensive computations
- **Debouncing**: User input debounced to reduce re-renders

---

## Backend Architecture

### Rust Module Structure

```
src-tauri/src/
├── lib.rs                      # Tauri app builder
├── main.rs                     # Binary entry point
├── project_manager.rs          # File operations
│   ├── load_project_structure()
│   ├── get_file_content()
│   ├── save_file_content()
│   ├── create_file()
│   ├── create_folder()
│   ├── rename_path()
│   ├── delete_path()
│   └── watch_project_changes()
├── terminal_manager.rs         # PTY management
│   ├── terminal_create()
│   ├── terminal_write()
│   ├── terminal_resize()
│   ├── terminal_kill()
│   └── terminal_change_directory()
└── git_manager.rs              # Git operations
    ├── git_is_repo()
    ├── git_log()
    ├── git_status()
    ├── git_commit()
    ├── git_branches()
    ├── git_stage_file()
    ├── git_stash_list()
    └── ...
```

### Command Registration

All Tauri commands are registered in `lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // Project commands
            load_project_structure,
            get_file_content,
            save_file_content,
            // Terminal commands
            terminal_create,
            terminal_write,
            terminal_resize,
            // Git commands
            git_log,
            git_status,
            git_commit,
            // ... (40+ commands total)
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Communication Layer

### Tauri IPC

Communication between frontend and backend uses Tauri's IPC layer:

#### Frontend → Backend (Commands)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Call Rust function
const result = await invoke<string>('get_file_content', {
  path: '/path/to/file.ts'
});
```

#### Backend → Frontend (Events)

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for events from Rust
const unlisten = await listen<FileChangePayload>('file-change', (event) => {
  console.log('File changed:', event.payload);
});
```

### Data Serialization

- **Format**: JSON (via `serde_json`)
- **Type Safety**: TypeScript interfaces match Rust structs
- **Validation**: Input validation in Rust before processing

Example:

```rust
#[derive(Serialize, Deserialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_directory: bool,
    children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub fn load_project_structure(path: String) -> Result<FileNode, String> {
    // Implementation
}
```

```typescript
interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
}

const tree = await invoke<FileNode>('load_project_structure', { path });
```

---

## State Management

### Store Pattern

We use **external stores** with React's `useSyncExternalStore`:

```typescript
// Store definition
type IDEState = {
  workspace: string | null;
  openFiles: string[];
  activeFile: string | null;
  sidebarVisible: boolean;
};

let state: IDEState = { /* initial state */ };
const listeners = new Set<() => void>();

// Actions
export const ideActions = {
  setWorkspace(path: string) {
    state = { ...state, workspace: path };
    listeners.forEach(listener => listener());
  },
  // ... more actions
};

// React hook
export function useIDEState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}
```

### Store Hierarchy

```
Application State
├── ideStore (workspace, files, sidebar)
├── editorStore (Monaco instance, actions)
├── terminalStore (sessions, config)
├── gitStore (status, branches, commits)
├── themeStore (current theme, mode)
└── settingsStore (user preferences)
```

### Persistence

- **Settings**: Persisted via Tauri store plugin (JSON)
- **Workspace State**: Restored on app restart
- **Terminal Sessions**: Optionally restored (config-dependent)

---

## Key Systems

### Monaco Editor Integration

#### Worker Configuration

Monaco uses web workers for language processing:

```typescript
// monacoWorkers.ts
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};
```

#### Editor Actions

```typescript
// editorStore.ts
export const editorActions = {
  registerView(editor: monaco.editor.IStandaloneCodeEditor) { /* ... */ },
  goToDefinition() { /* F12 */ },
  goToReferences() { /* Shift+F12 */ },
  renameSymbol() { /* F2 */ },
  formatDocument() { /* Shift+Alt+F */ },
  // ... 20+ actions
};
```

### Terminal System

#### Architecture (4 Layers)

1. **UI Layer**: `TerminalPanel.tsx`, `TerminalInstance.tsx`
2. **State Management**: `terminalStore.ts`
3. **Service Layer**: `terminalService.ts` (lifecycle, events)
4. **Rust Backend**: `terminal_manager.rs` (PTY)

#### Terminal Lifecycle

```
Create → Initialize → Ready → (Write/Resize) → Kill → Cleanup
   │         │          │            │            │       │
   ├─ Rust PTY spawn    │            │            │       └─ Dispose xterm
   └─ xterm.js create   └─ Attach    └─ Data flow└─ Kill PTY
```

#### Performance Optimizations

- **Write Buffering**: Batch writes (60fps, 16ms intervals)
- **Resize Debouncing**: Delay resize events (150ms)
- **Virtual Scrolling**: xterm.js built-in

### Git Integration

#### Native Git (git2)

```rust
// git_manager.rs
use git2::{Repository, StatusOptions, Signature};

#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(path)?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    // Convert to FileStatus structs and return
}
```

#### Advantages Over Shell Git

- ✅ **No Command Injection**: Direct API, no shell commands
- ✅ **Cross-Platform**: Works identically on all OSes
- ✅ **Performance**: Native Rust, no subprocess overhead
- ✅ **Type Safety**: Compile-time guarantees

### Diagnostic System

Unified diagnostic service aggregates errors/warnings from multiple sources:

```typescript
// diagnosticService.ts
export enum DiagnosticSource {
  Monaco = 'monaco',
  TypeScript = 'typescript',
  ESLint = 'eslint',
  Rust = 'rust',
  Custom = 'custom',
}

class DiagnosticService {
  addDiagnostic(diagnostic: Diagnostic) { /* ... */ }
  removeDiagnostic(id: string) { /* ... */ }
  clearDiagnostics(source?: DiagnosticSource) { /* ... */ }
  getDiagnostics(filter?: DiagnosticFilter): Diagnostic[] { /* ... */ }
}
```

---

## Performance Considerations

### Startup Performance

| Phase | Target | Actual | Status |
|-------|--------|--------|--------|
| Rust initialization | < 100ms | ~80ms | ✅ |
| WebView load | < 500ms | ~400ms | ✅ |
| React hydration | < 500ms | ~300ms | ✅ |
| Monaco load | < 500ms | ~600ms | ⚠️ |
| **Total (cold)** | **< 2s** | **~1.5s** | ✅ |
| **Total (warm)** | **< 1s** | **~0.8s** | ✅ |

### Runtime Performance

- **Memory (idle)**: ~250MB (target: < 300MB) ✅
- **Memory (active)**: ~400MB (target: < 500MB) ✅
- **File open latency**: ~50ms (target: < 100ms) ✅
- **Git status**: ~150ms (target: < 200ms) ✅
- **Terminal input lag**: ~10ms (target: < 16ms) ✅

### Optimization Techniques

1. **Code Splitting**: Monaco loaded asynchronously
2. **Lazy Loading**: Features loaded on-demand
3. **Tree Shaking**: Vite removes unused code
4. **Async Commands**: Tauri commands don't block UI
5. **Worker Offloading**: Monaco uses web workers
6. **Virtual Scrolling**: Large lists (file tree, problems)
7. **Debouncing**: User input, resize events

---

## Security Architecture

### Threat Model

**Assets to Protect**:
- User's source code and files
- API keys and secrets
- Git credentials
- Terminal command execution

**Threats**:
- Malicious extensions (future)
- File system access abuse
- Command injection
- Credential theft
- Data exfiltration

### Security Measures

#### 1. Privilege Separation

```
Frontend (Untrusted)          Backend (Trusted)
      │                              │
      │   invoke('read_file')        │
      ├──────────────────────────────>│
      │                              │ Validate path
      │                              │ Check permissions
      │                              │ Read file
      │   <──────────────────────────┤
      │   Return content              │
```

#### 2. Tauri Capabilities

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:path:allow-resolve",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "store:allow-set",
    "store:allow-get"
  ]
}
```

#### 3. Input Validation

```rust
#[tauri::command]
pub fn get_file_content(path: String) -> Result<String, String> {
    // Validate path
    if path.contains("..") {
        return Err("Invalid path: directory traversal detected".into());
    }

    // Canonicalize to prevent symlink attacks
    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Failed to resolve path: {}", e))?;

    // Read file
    fs::read_to_string(canonical)
        .map_err(|e| format!("Failed to read file: {}", e))
}
```

#### 4. Secret Storage

- **API Keys**: Encrypted, stored in OS keychain (Tauri store plugin)
- **Git Credentials**: Managed by Git credential helper
- **No Plaintext**: Never store secrets in plaintext

---

## Future Architecture

### Planned Enhancements

#### Extension System (v0.3.0)

```
Extension Process (Sandboxed)
      │
      ├─ Limited API Surface
      ├─ Explicit Permissions
      ├─ Resource Limits
      └─ IPC to Main Process
```

#### Language Server Protocol (v0.3.0)

```
Frontend                LSP Client              LSP Server
   │                         │                       │
   │  textDocument/didOpen   │                       │
   ├────────────────────────>│  initialize           │
   │                         ├──────────────────────>│
   │                         │  textDocument/didOpen │
   │                         ├──────────────────────>│
   │                         │  publishDiagnostics   │
   │  Display diagnostics    │<──────────────────────┤
   │<────────────────────────┤                       │
```

#### AI Provider Integration (v0.4.0)

```
┌─────────────────────────────────────────┐
│        AI Provider Manager              │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ OpenAI  │  │Anthropic│  │  Groq   │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│        Unified API Interface            │
│    (Context, Streaming, Cancellation)   │
└─────────────────────────────────────────┘
```

---

## Additional Resources

- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Development setup and workflow
- **[TERMINAL_SYSTEM.md](./TERMINAL_SYSTEM.md)**: Terminal architecture deep dive
- **[LSP.md](./LSP.md)**: Language Server Protocol integration
- **[Tauri Documentation](https://tauri.app/)**: Official Tauri docs

---

**Maintained by [Enosis Labs, Inc.](https://enosislabs.com)**

Last Updated: November 3, 2025
