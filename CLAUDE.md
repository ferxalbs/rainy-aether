# CLAUDE.md - AI Assistant Reference Guide

> **Rainy Aether** - Next-Generation AI-Native Code Editor
> A comprehensive guide for AI assistants working on this codebase

**Last Updated:** November 16, 2025
**Version:** 0.1.0
**Maintained by:** Enosis Labs, Inc.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Quick Start for AI Assistants](#quick-start-for-ai-assistants)
- [Development Environment](#development-environment)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Directory Structure](#directory-structure)
- [Key Technologies](#key-technologies)
- [State Management](#state-management)
- [Critical Conventions](#critical-conventions)
- [Common Tasks](#common-tasks)
- [Testing & Validation](#testing--validation)
- [Key Systems Reference](#key-systems-reference)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## 🎯 Project Overview

**Rainy Aether** is an open-source, AI-first desktop code editor built for modern developers. It combines VS Code's Monaco editor with a blazing-fast Rust backend powered by Tauri 2.0.

### Key Characteristics

- **Hybrid Architecture**: React 19 frontend + Rust backend via Tauri 2.0
- **Performance Focused**: <2s startup, ~100MB footprint (vs 500MB+ for Electron)
- **AI-Native**: Dual-agent system (Custom + LangGraph), multi-provider support
- **Cross-Platform**: Windows, macOS, Linux with native performance
- **Security First**: Sandboxed execution, privilege separation, no telemetry by default

### Current Status (v0.1.0)

✅ **Implemented:**
- Monaco Editor with TypeScript/JavaScript support
- Professional terminal with PTY backend
- Native Git integration (git2 crate)
- File explorer and management
- Day/Night themes with full customization
- Diagnostics and Problems panel
- Dual-agent system (Agent 1 + LangGraph Agent 2)
- Icon theme system
- Extension infrastructure
- LSP foundation

🚧 **In Progress:**
- Multi-agent orchestration
- Voice mode
- Advanced AI features

---

## 🚀 Quick Start for AI Assistants

### Essential Commands

```bash
# Install dependencies
pnpm install

# Full Tauri development (RECOMMENDED - all APIs available)
pnpm tauri dev

# Frontend only (fast iteration, limited features)
pnpm dev

# Type-check frontend
pnpm tsc --noEmit

# Production build
pnpm tauri build

# Rust commands (from src-tauri/)
cd src-tauri
cargo fmt           # Format Rust code
cargo clippy        # Lint Rust code
cargo test          # Run tests
cargo build         # Build Rust backend
```

### Critical Rules

1. **ALWAYS use `pnpm tauri dev` for full functionality** - Browser-only mode (`pnpm dev`) lacks Tauri APIs
2. **Use `@/*` path alias** for all src imports (e.g., `import { foo } from '@/stores/ideStore'`)
3. **Never hardcode colors** - Always use Tailwind tokens (`bg-background`, `text-foreground`, etc.)
4. **Validate inputs in Rust** - Never trust frontend data in Tauri commands
5. **Use TypeScript strict mode** - No `any` types unless absolutely necessary
6. **Follow existing patterns** - Check similar implementations before creating new patterns

---

## 💻 Development Environment

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ | Frontend runtime |
| pnpm | Latest | Package manager |
| Rust | Stable | Backend development |
| Platform Tools | See below | OS-specific requirements |

**Platform-Specific:**
- **Windows**: Visual Studio Build Tools 2022
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Environment Check

```bash
# Verify installations
node --version      # Should be v18+
pnpm --version      # Should be installed
rustc --version     # Should be stable
cargo --version     # Should be installed

# First-time setup
pnpm install
pnpm tauri dev      # Should open application window
```

---

## 🏗️ Architecture at a Glance

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (WebView)                 │
│  Monaco Editor │ Terminal │ File Tree │ Git Panel │ Chat   │
└─────────────────────────────────────────────────────────────┘
                              ↕ (Tauri IPC - JSON)
┌─────────────────────────────────────────────────────────────┐
│                    React State Layer                        │
│  ideStore │ editorStore │ terminalStore │ gitStore │ etc.  │
└─────────────────────────────────────────────────────────────┘
                              ↕ (invoke/listen)
┌─────────────────────────────────────────────────────────────┐
│                    Rust Backend (Tauri)                     │
│  Project Mgr │ Terminal Mgr │ Git Mgr │ Agent Mgr │ etc.  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Operating System                         │
│     Filesystem │ PTY │ Git │ Network │ Keychain             │
└─────────────────────────────────────────────────────────────┘
```

### Communication Pattern

**Frontend → Backend (Commands)**
```typescript
import { invoke } from '@tauri-apps/api/core';

const content = await invoke<string>('get_file_content', {
  path: '/path/to/file.ts'
});
```

**Backend → Frontend (Events)**
```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<Payload>('file-change', (event) => {
  console.log('File changed:', event.payload);
});
```

---

## 📁 Directory Structure

### Frontend (`src/`)

```
src/
├── components/
│   ├── ide/                      # Core IDE components
│   │   ├── IDE.tsx              # Main IDE layout
│   │   ├── MonacoEditor.tsx     # Monaco editor wrapper
│   │   ├── ProjectExplorer.tsx  # File tree
│   │   ├── TerminalPanel.tsx    # Terminal UI
│   │   ├── StatusBar.tsx        # Status bar
│   │   ├── Breadcrumbs.tsx      # Navigation breadcrumbs
│   │   ├── ProblemsPanel.tsx    # Diagnostics viewer
│   │   ├── MenuBar.tsx          # Application menu
│   │   └── ...
│   └── ui/                      # Reusable UI components (shadcn/ui)
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── ScrollArea.tsx
│       └── ...
├── stores/                       # State management
│   ├── ideStore.tsx             # Workspace, files, sidebar
│   ├── editorStore.ts           # Monaco instance, actions
│   ├── terminalStore.ts         # Terminal sessions
│   ├── gitStore.ts              # Git status, branches
│   ├── themeStore.ts            # Theme application
│   ├── iconThemeStore.ts        # Icon themes
│   ├── agentStore.ts            # Agent sessions
│   ├── agentConfigStore.ts      # Dual-agent configuration
│   └── settingsStore.ts         # User preferences
├── services/                     # Business logic
│   ├── diagnosticService.ts     # Error/warning management
│   ├── gitService.ts            # Git command wrappers
│   ├── terminalService.ts       # Terminal lifecycle
│   ├── monacoWorkers.ts         # Monaco web workers
│   ├── agent/                   # Agent services
│   │   ├── agentService.ts     # Dual-agent routing
│   │   └── langgraph/          # LangGraph implementation
│   ├── lsp/                     # LSP client infrastructure
│   └── extension/               # Extension system
├── themes/                       # Theme definitions
│   ├── index.ts                 # Theme registry
│   ├── themeValidator.ts        # Accessibility checks
│   └── iconThemes/              # Icon theme definitions
├── utils/                        # Utility functions
│   ├── systemTheme.ts           # OS theme detection
│   └── EventEmitter.ts
├── lib/                          # Library code
│   ├── cn.ts                    # Classname utility
│   └── utils.ts
├── types/                        # TypeScript type definitions
├── polyfills/                    # Browser compatibility
│   └── async_hooks.ts           # LangGraph compatibility
├── App.tsx                       # Root component
└── main.tsx                      # Entry point
```

### Backend (`src-tauri/src/`)

```
src-tauri/src/
├── lib.rs                        # Tauri builder, command registration
├── main.rs                       # Binary entry point
├── project_manager.rs            # File operations, watcher
├── terminal_manager.rs           # PTY sessions, shell management
├── git_manager.rs                # Git operations (git2)
├── git_native.rs                 # Native git implementation
├── git_auth.rs                   # Git authentication
├── git_config.rs                 # Git configuration
├── language_server_manager.rs    # LSP server management
├── update_manager.rs             # Auto-update system
├── extension_manager.rs          # Extension management
├── extension_registry.rs         # Extension registry
├── configuration_manager.rs      # Configuration system
├── credential_manager.rs         # Secure credential storage
├── font_manager.rs               # Font management
├── file_operations.rs            # File I/O utilities
└── agents/                       # Agent system (Rust)
    ├── mod.rs
    ├── core.rs                   # Core agent logic
    ├── commands.rs               # Tauri commands
    ├── executor.rs               # Task execution
    ├── inference.rs              # AI inference
    ├── memory.rs                 # Conversation memory
    ├── metrics.rs                # Performance metrics
    ├── rate_limiter.rs           # Rate limiting
    ├── tools/                    # Agent tools
    │   ├── registry.rs
    │   ├── filesystem.rs
    │   ├── workspace.rs
    │   ├── terminal.rs
    │   └── git.rs
    └── providers/                # AI providers
        ├── base.rs
        ├── groq.rs
        └── google.rs
```

### Documentation (`docs/`)

```
docs/
├── agents/                       # Agent system documentation
│   ├── RAINY_AGENTS_MASTER_PLAN.md
│   ├── USER_GUIDE.md
│   ├── ABBY_MODE_GUIDE.md
│   └── ...
├── configuration/                # Configuration system
├── extensions/                   # Extension development
├── fonts/                        # Font system
└── updates/                      # Update system
```

---

## 🔧 Key Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework with concurrent features |
| TypeScript | 5.9 | Type-safe development |
| Monaco Editor | 0.54 | VS Code's editor component |
| Tailwind CSS | v4 | Utility-first styling |
| Vite | 7.2 | Build tool and dev server |
| xterm.js | 5.5 | Terminal emulator |
| LangChain/LangGraph | 1.0 | Agent orchestration |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| Rust (stable) | Systems programming |
| Tauri 2.0 | Desktop framework |
| tokio | Async runtime |
| portable-pty | Terminal sessions |
| git2 | Native Git operations |
| serde/serde_json | Serialization |
| notify | File watching |

### Why Tauri vs Electron?

- **92% smaller** bundle size (~10MB vs ~120MB)
- **80% less RAM** (~100MB vs ~500MB)
- **2.5x faster** startup (~1.5s vs ~4s)
- **More secure** (Rust + sandboxing vs Node.js exposure)
- **Always up-to-date** (system WebView vs bundled Chromium)

---

## 📊 State Management

### Store Pattern (useSyncExternalStore)

All stores follow this pattern:

```typescript
// Store definition
type MyState = {
  property: string;
  count: number;
};

let state: MyState = { property: '', count: 0 };
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Actions
export const myActions = {
  setProperty(value: string) {
    state = { ...state, property: value };
    notifyListeners();
  },
  increment() {
    state = { ...state, count: state.count + 1 };
    notifyListeners();
  },
};

// React hook
export function useMyState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}
```

### Core Stores

| Store | File | Purpose |
|-------|------|---------|
| IDE Store | `ideStore.tsx` | Workspace path, open files, sidebar visibility |
| Editor Store | `editorStore.ts` | Monaco instance, navigation actions |
| Terminal Store | `terminalStore.ts` | Terminal sessions, configuration |
| Git Store | `gitStore.ts` | Git status, branches, commits |
| Theme Store | `themeStore.ts` | Current theme, mode (day/night/system) |
| Icon Theme Store | `iconThemeStore.ts` | Icon themes, file/folder icons |
| Agent Store | `agentStore.ts` | Agent sessions, messages |
| Agent Config Store | `agentConfigStore.ts` | Dual-agent configuration |
| Settings Store | `settingsStore.ts` | User preferences |

### Persistence

- **Settings**: Tauri store plugin (JSON file)
- **Workspace State**: Restored on app restart
- **Terminal Sessions**: Optionally restored (configurable)
- **Location**: OS-specific app data directory

---

## ⚡ Critical Conventions

### TypeScript Conventions

```typescript
// ✅ GOOD - Use strict types
interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
}

const node: FileNode = { ... };

// ❌ AVOID - No 'any' types
const data: any = { ... };

// ✅ GOOD - Use @/* path alias
import { ideActions } from '@/stores/ideStore';

// ❌ AVOID - Relative paths for cross-directory imports
import { ideActions } from '../../stores/ideStore';

// ✅ GOOD - Functional components with hooks
export function MyComponent({ title }: Props) {
  const [state, setState] = useState('');
  return <div>{title}</div>;
}

// ❌ AVOID - Class components
export default class MyComponent extends React.Component { ... }
```

### Styling Conventions

```tsx
// ✅ GOOD - Tailwind tokens only
<div className="bg-background text-foreground border border-border">
  <h1 className="text-lg font-semibold">Title</h1>
</div>

// ❌ AVOID - Hard-coded colors
<div style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4' }}>
  <h1>Title</h1>
</div>

// ✅ GOOD - Use cn() utility for conditional classes
import { cn } from '@/lib/cn';

<div className={cn(
  "base-class",
  isActive && "active-class",
  hasError && "error-class"
)}>
  Content
</div>
```

### Rust Conventions

```rust
// ✅ GOOD - Return Result types
#[tauri::command]
pub fn my_command(input: String) -> Result<String, String> {
    validate_input(&input)?;
    process_data(input)
}

// ❌ AVOID - No error handling
#[tauri::command]
pub fn my_command(input: String) -> String {
    process_data(input)  // Can panic!
}

// ✅ GOOD - Validate inputs
#[tauri::command]
pub fn get_file_content(path: String) -> Result<String, String> {
    // Prevent directory traversal
    if path.contains("..") {
        return Err("Invalid path".into());
    }

    let canonical = fs::canonicalize(&path)
        .map_err(|e| format!("Failed to resolve: {}", e))?;

    fs::read_to_string(canonical)
        .map_err(|e| format!("Failed to read: {}", e))
}

// ✅ GOOD - Follow cargo fmt
cargo fmt

// ✅ GOOD - Address clippy warnings
cargo clippy
```

### Component Organization

```tsx
// ✅ GOOD - Organized component structure
import { cn } from '@/lib/cn';
import { useIDEState, ideActions } from '@/stores/ideStore';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // 1. State and hooks
  const ideState = useIDEState();
  const [localState, setLocalState] = useState('');

  // 2. Derived state
  const isActive = ideState.workspace !== null;

  // 3. Event handlers
  const handleClick = () => {
    setLocalState('clicked');
    onAction?.();
  };

  // 4. Render
  return (
    <div className={cn("container", isActive && "active")}>
      <h2>{title}</h2>
      <button onClick={handleClick}>Action</button>
    </div>
  );
}
```

---

## 🛠️ Common Tasks

### Adding a Tauri Command

**1. Define command in appropriate module:**

```rust
// src-tauri/src/my_manager.rs
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct MyData {
    pub id: String,
    pub value: i32,
}

#[tauri::command]
pub fn my_command(input: String) -> Result<MyData, String> {
    // Validate
    if input.is_empty() {
        return Err("Input cannot be empty".into());
    }

    // Process
    Ok(MyData {
        id: input,
        value: 42,
    })
}
```

**2. Register in lib.rs:**

```rust
// src-tauri/src/lib.rs
mod my_manager;
use my_manager::my_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            my_command,  // Add here
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**3. Call from frontend:**

```typescript
import { invoke } from '@tauri-apps/api/core';

interface MyData {
  id: string;
  value: number;
}

async function callMyCommand(input: string) {
  try {
    const result = await invoke<MyData>('my_command', { input });
    console.log('Result:', result);
  } catch (error) {
    console.error('Command failed:', error);
  }
}
```

### Adding a Store Property

**1. Update store interface:**

```typescript
// src/stores/myStore.ts
type MyState = {
  existingProp: string;
  newProp: number;  // Add this
};
```

**2. Update initial state:**

```typescript
let state: MyState = {
  existingProp: '',
  newProp: 0,  // Add this
};
```

**3. Create action:**

```typescript
export const myActions = {
  setNewProp(value: number) {
    state = { ...state, newProp: value };
    notifyListeners();
  },
};
```

**4. (Optional) Persist:**

```typescript
import { saveToStore } from '@/utils/storage';

export const myActions = {
  async setNewProp(value: number) {
    state = { ...state, newProp: value };
    notifyListeners();
    await saveToStore('myStore.newProp', value);
  },
};
```

### Adding a UI Component

**1. Create component file:**

```tsx
// src/components/ide/MyComponent.tsx
import { cn } from '@/lib/cn';

interface MyComponentProps {
  title: string;
  className?: string;
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("p-4 bg-background", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
```

**2. Import and use:**

```tsx
// src/components/ide/IDE.tsx
import { MyComponent } from './MyComponent';

export function IDE() {
  return (
    <div>
      <MyComponent title="Hello" />
    </div>
  );
}
```

### Adding a Monaco Editor Feature

**1. Register editor instance (already done in MonacoEditor.tsx):**

```typescript
import { editorActions } from '@/stores/editorStore';

useEffect(() => {
  if (editorRef.current) {
    editorActions.registerView(editorRef.current);
  }
}, []);
```

**2. Add action to editorStore:**

```typescript
// src/stores/editorStore.ts
export const editorActions = {
  myCustomAction() {
    if (!state.currentView) return;

    const editor = state.currentView;
    const model = editor.getModel();
    if (!model) return;

    // Use Monaco API
    const position = editor.getPosition();
    editor.executeEdits('my-source', [{
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      text: 'inserted text',
    }]);
  },
};
```

**3. Call from component:**

```typescript
import { editorActions } from '@/stores/editorStore';

function MyComponent() {
  const handleClick = () => {
    editorActions.myCustomAction();
  };

  return <button onClick={handleClick}>Custom Action</button>;
}
```

### Working with Themes

**1. Define theme:**

```typescript
// src/themes/index.ts
import { hexToHslStr } from './utils';

export const myTheme: Theme = {
  name: 'My Custom Theme',
  colors: {
    background: hexToHslStr('#1e1e1e'),
    foreground: hexToHslStr('#d4d4d4'),
    primary: hexToHslStr('#007acc'),
    'primary-foreground': hexToHslStr('#ffffff'),
    secondary: hexToHslStr('#3e3e3e'),
    'secondary-foreground': hexToHslStr('#d4d4d4'),
    muted: hexToHslStr('#2d2d2d'),
    'muted-foreground': hexToHslStr('#8a8a8a'),
    accent: hexToHslStr('#094771'),
    'accent-foreground': hexToHslStr('#ffffff'),
    destructive: hexToHslStr('#f14c4c'),
    'destructive-foreground': hexToHslStr('#ffffff'),
    border: hexToHslStr('#454545'),
    input: hexToHslStr('#3c3c3c'),
    ring: hexToHslStr('#007acc'),
    'editor-background': hexToHslStr('#1e1e1e'),
    'editor-foreground': hexToHslStr('#d4d4d4'),
    'editor-selection': hexToHslStr('#264f78'),
    'editor-line-number': hexToHslStr('#858585'),
    // ... all required tokens
  },
};
```

**2. Add to themes array:**

```typescript
export const themes: Theme[] = [
  dayTheme,
  nightTheme,
  myTheme,  // Add here
];
```

**3. Apply theme:**

```typescript
import { themeActions } from '@/stores/themeStore';

themeActions.setTheme('My Custom Theme');
```

---

## ✅ Testing & Validation

### Frontend Type Checking

```bash
# Type check all TypeScript files
pnpm tsc --noEmit

# Watch mode (continuous checking)
pnpm tsc --noEmit --watch
```

### Rust Testing

```bash
cd src-tauri

# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture

# Run tests with logging
RUST_LOG=debug cargo test
```

### Rust Linting & Formatting

```bash
cd src-tauri

# Format code (auto-fix)
cargo fmt

# Check formatting (CI)
cargo fmt --check

# Lint code (suggestions)
cargo clippy

# Lint with warnings as errors (CI)
cargo clippy -- -D warnings
```

### Manual Testing Checklist

When implementing a feature:

- [ ] Test on Windows (if possible)
- [ ] Test on macOS (if possible)
- [ ] Test on Linux (if possible)
- [ ] Test with Day theme
- [ ] Test with Night theme
- [ ] Test keyboard shortcuts
- [ ] Test error cases
- [ ] Check console for warnings/errors
- [ ] Verify no memory leaks (DevTools)
- [ ] Test with `pnpm tauri dev`
- [ ] Test production build

---

## 🔍 Key Systems Reference

### Monaco Editor

**Files:**
- `src/components/ide/MonacoEditor.tsx` - Main wrapper
- `src/stores/editorStore.ts` - State and actions
- `src/services/monacoWorkers.ts` - Web worker configuration
- `src/services/monacoConfig.ts` - Editor configuration

**Key Features:**
- Go to Definition (F12)
- Peek Definition (Alt+F12)
- Find References (Shift+F12)
- Rename Symbol (F2)
- Format Document (Shift+Alt+F)
- Breadcrumbs (pattern-based symbol detection)

**Documentation:** See `MONACO_NAVIGATION_FEATURES.md`

### Terminal System

**Files:**
- `src/components/ide/TerminalPanel.tsx` - UI layer
- `src/stores/terminalStore.ts` - State management
- `src/services/terminalService.ts` - Service layer
- `src-tauri/src/terminal_manager.rs` - PTY backend

**Key Features:**
- Multiple terminal tabs
- Shell profile auto-detection
- Full-text search (Ctrl+Shift+F)
- Session persistence
- Split view infrastructure (UI pending)

**Shortcuts:**
- `Ctrl+Shift+T` - New Terminal
- `Ctrl+Shift+W` - Close Active Terminal
- `Ctrl+Shift+F` - Toggle Search
- ``Ctrl+` `` - Toggle Terminal Panel

**Documentation:** See `TERMINAL_SYSTEM.md`

### Git Integration

**Files:**
- `src-tauri/src/git_manager.rs` - Git operations (git2)
- `src-tauri/src/git_native.rs` - Native implementation
- `src-tauri/src/git_auth.rs` - Authentication
- `src/stores/gitStore.ts` - State management
- `src/services/gitService.ts` - Command wrappers

**Key Features:**
- Status tracking
- Commit, push, pull
- Branch management
- Stash operations
- Diff viewer
- History browser

**Commands:**
- `git_is_repo(path)` - Check if Git repo
- `git_status(path)` - Get working tree status
- `git_commit(path, message, author_name, author_email)` - Create commit
- `git_branches(path)` - List branches
- `git_stage_file(path, file)` - Stage file
- `git_diff_file(path, file)` - Get file diff

### Dual-Agent System

**Files:**
- `src/stores/agentConfigStore.ts` - Configuration
- `src/services/agent/agentService.ts` - Routing logic
- `src/services/agent/langgraph/` - LangGraph implementation
  - `graphFactory.ts` - ReAct agent creation
  - `modelFactory.ts` - Multi-provider models
  - `tools.ts` - Tool adapters
  - `runner.ts` - Execution entry point

**Agent Types:**
- **Agent 1 (Custom)**: Fast, AI SDK-based, simple queries
- **Agent 2 (LangGraph)**: Advanced, ReAct pattern, complex tasks

**Usage:**
```typescript
import { agentConfigActions, useSelectedAgent } from '@/stores/agentConfigStore';

// Select agent
agentConfigActions.selectAgent('agent2');

// Get current agent
const selectedAgent = useSelectedAgent();
```

**Documentation:** See `docs/DUAL_AGENT_SYSTEM.md`, `docs/LANGGRAPH_MIGRATION.md`

### Icon Theme System

**Files:**
- `src/stores/iconThemeStore.ts` - State management
- `src/themes/iconThemes/defaultIconTheme.tsx` - Default theme
- `src/services/extension/iconThemeAPI.ts` - Extension API

**Usage:**
```typescript
import { iconThemeActions } from '@/stores/iconThemeStore';

// Get icon for file
const icon = iconThemeActions.getFileIcon('App.tsx');

// Get icon for folder
const folderIcon = iconThemeActions.getFolderIcon('src', true);
```

**Documentation:** See `docs/extensions/ICON_THEME_SYSTEM.md`

### Extension System

**Files:**
- `src-tauri/src/extension_manager.rs` - Backend
- `src-tauri/src/extension_registry.rs` - Registry
- `src/stores/extensionStore.ts` - State management
- `src/services/extension/` - Extension runtime

**Documentation:** See `DEBUG_EXTENSIONS.md`, `docs/EXTENSION_CONFIGURATION.md`

### LSP (Language Server Protocol)

**Files:**
- `src/services/lsp/lspService.ts` - LSP client
- `src/services/lsp/monacoAdapter.ts` - Monaco integration
- `src-tauri/src/language_server_manager.rs` - Server management

**Status:** Infrastructure in place, currently using Monaco's built-in TypeScript support

**Documentation:** See `LSP.md`

### Update System

**Files:**
- `src-tauri/src/update_manager.rs` - Backend
- `src/services/updateService.ts` - Service layer
- `src/stores/updateStore.ts` - State management
- `src/components/ide/UpdateNotification.tsx` - UI

**Features:**
- Automatic checking (24-hour intervals)
- Progress tracking
- Release notes
- Platform-specific installers
- Signature verification

**Documentation:** See `docs/updates/UPDATE_SYSTEM.md`

---

## 🐛 Troubleshooting

### Tauri APIs Not Working

**Problem:** Tauri commands fail or return errors

**Solution:**
1. Ensure running `pnpm tauri dev`, NOT `pnpm dev`
2. Guard Tauri calls:
   ```typescript
   const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
   if (isTauri) {
     // Safe to use Tauri APIs
   }
   ```

### Monaco Editor Not Responding

**Problem:** Editor actions don't work or editor doesn't update

**Solution:**
1. Verify editor registered: `editorActions.registerView(editor)`
2. Trigger layout after resize: `editorActions.layout()`
3. Check Monaco workers are loading (DevTools → Network)

### Terminal Not Working

**Problem:** Terminal fails to create or display

**Solution:**
1. Ensure using `pnpm tauri dev` (terminal requires Tauri)
2. On Windows: Verify Visual Studio Build Tools installed
3. Check PTY permissions
4. Review terminal logs in Rust backend

### Port Conflicts

**Problem:** Vite dev server fails to start

**Solution:**
```bash
# Use different port
pnpm dev --port 1421

# Update tauri.conf.json
{
  "build": {
    "devUrl": "http://localhost:1421"
  }
}
```

### Build Errors

**Frontend:**
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Backend:**
```bash
cd src-tauri

# Update Rust
rustup update stable

# Clean and rebuild
cargo clean
cargo build
```

### Type Errors

**Problem:** TypeScript errors in IDE or build

**Solution:**
1. Run `pnpm tsc --noEmit` to see all errors
2. Check path aliases are configured (`@/*`)
3. Ensure all imports use correct types
4. Restart TypeScript server in IDE

### LangGraph/AsyncLocalStorage Errors

**Problem:** "AsyncLocalStorage is not a constructor"

**Solution:**
1. Polyfill is in `src/polyfills/async_hooks.ts`
2. Alias configured in `vite.config.ts`
3. Restart dev server: `pnpm tauri dev`

---

## 📚 Additional Resources

### Essential Documentation

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture and technical design |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Development setup and workflow |
| **[AGENTS.md](./AGENTS.md)** | Comprehensive agent system guide |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Contribution guidelines |
| **[ROADMAP.md](./ROADMAP.md)** | Feature roadmap and future plans |
| **[SECURITY.md](./SECURITY.md)** | Security policy and reporting |

### Specialized Guides

| Guide | Topic |
|-------|-------|
| `MONACO_NAVIGATION_FEATURES.md` | Monaco editor integration |
| `TERMINAL_SYSTEM.md` | Terminal architecture |
| `LSP.md` | Language Server Protocol |
| `docs/DUAL_AGENT_SYSTEM.md` | Dual-agent architecture |
| `docs/LANGGRAPH_MIGRATION.md` | LangGraph implementation |
| `docs/extensions/ICON_THEME_SYSTEM.md` | Icon themes |
| `docs/updates/UPDATE_SYSTEM.md` | Update system |
| `DEBUG_EXTENSIONS.md` | Extension debugging |
| `TEST_CONFIGURATION.md` | Testing configuration |

### External Resources

- **[Tauri Documentation](https://tauri.app/)** - Official Tauri docs
- **[Monaco Editor API](https://microsoft.github.io/monaco-editor/)** - Editor API reference
- **[React Documentation](https://react.dev/)** - React 19 docs
- **[Rust Book](https://doc.rust-lang.org/book/)** - Learn Rust
- **[LangChain Docs](https://js.langchain.com/docs/)** - LangChain/LangGraph
- **[Tailwind CSS](https://tailwindcss.com/)** - Tailwind v4 docs

---

## 🎯 Quick Reference Card

### Most Common Operations

```bash
# Development
pnpm tauri dev                  # Start dev server
pnpm tsc --noEmit              # Type check

# Building
pnpm tauri build               # Production build

# Rust
cd src-tauri
cargo fmt                      # Format
cargo clippy                   # Lint
cargo test                     # Test
```

### Key Imports

```typescript
// Stores
import { useIDEState, ideActions } from '@/stores/ideStore';
import { useEditorState, editorActions } from '@/stores/editorStore';
import { useTerminalState, terminalActions } from '@/stores/terminalStore';

// Tauri
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Utilities
import { cn } from '@/lib/cn';
```

### Critical Tauri Commands

```typescript
// File operations
await invoke('get_file_content', { path });
await invoke('save_file_content', { path, content });
await invoke('load_project_structure', { path });

// Terminal
await invoke('terminal_create', { shell, cwd, cols, rows });
await invoke('terminal_write', { id, data });

// Git
await invoke('git_status', { path });
await invoke('git_commit', { path, message, authorName, authorEmail });
```

---

## ✨ Best Practices Summary

### DO ✅

- Use `pnpm tauri dev` for full functionality
- Type all variables and functions in TypeScript
- Use `@/*` path alias for imports
- Use Tailwind tokens for all styling
- Validate inputs in Rust commands
- Follow existing store patterns
- Write descriptive commit messages
- Test on multiple platforms if possible
- Run `cargo fmt` and `cargo clippy` before committing
- Check console for errors/warnings

### DON'T ❌

- Use `any` type unless absolutely necessary
- Hard-code colors or use inline styles
- Trust frontend data in Tauri commands
- Mutate state directly (always create new objects)
- Skip error handling in Rust
- Create new patterns when existing ones work
- Commit without type checking
- Ignore TypeScript or Clippy warnings
- Use relative imports for cross-directory files
- Mix different state management approaches

---

## 📝 Notes for AI Assistants

### Context Awareness

When working on this codebase:

1. **Check existing implementations first** - Many patterns are already established
2. **Read relevant documentation** - Specialized guides exist for major systems
3. **Respect the architecture** - Don't introduce new patterns without justification
4. **Maintain consistency** - Follow existing code style and conventions
5. **Test thoroughly** - Verify changes work with `pnpm tauri dev`

### Common Pitfalls

- **Using `pnpm dev` instead of `pnpm tauri dev`** - Missing Tauri APIs
- **Hard-coding colors** - Always use Tailwind tokens
- **Ignoring TypeScript errors** - Fix them, don't suppress
- **Mutating state** - Always create new objects in stores
- **Skipping validation** - Validate all inputs in Rust commands
- **Missing error handling** - Always use `Result` types in Rust

### Helpful Commands

```bash
# Find usages of a function/component
grep -r "functionName" src/

# Find all stores
ls src/stores/

# Find all Tauri commands
grep -r "#\[tauri::command\]" src-tauri/src/

# Check for hardcoded colors (should return minimal results)
grep -r "bg-\[#" src/components/
```

---

**Built with ❤️ by [Enosis Labs, Inc.](https://enosislabs.com)**

For questions or suggestions about this guide, please open an issue on GitHub.

---

*Last Updated: November 16, 2025*
*Version: 0.1.0*
*This document is maintained to help AI assistants effectively contribute to Rainy Aether.*
