# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rainy Aether (branded as "Rainy Code") is a modern desktop code editor built with **Tauri 2.0** (Rust) and **React** (TypeScript). Recently migrated from CodeMirror 6 to **Monaco Editor** for enhanced editing capabilities. This is an AI-first IDE with ambitious plans for multi-agent orchestration, voice mode, and autonomous development workflows.

**Key Technologies:**
- Frontend: React 19 + TypeScript, Tailwind CSS v4, Monaco Editor
- Desktop: Tauri 2.0 with Rust backend
- Terminal: PTY-backed sessions via `portable-pty`
- Git: Native integration via `git2` crate
- State: React stores using `useSyncExternalStore`
- Theme: CSS variables mapped to Tailwind v4 tokens with Day/Night modes

## Development Commands

### Prerequisites
- Node.js v18+ with `pnpm`
- Rust stable toolchain
- Platform-specific Tauri 2.0 dependencies
- On Windows: Visual Studio Build Tools

### Essential Commands

```bash
# Install dependencies
pnpm install

# Frontend dev only (fast iteration, no Tauri APIs)
pnpm dev

# Full Tauri development (with all desktop APIs)
pnpm tauri dev

# Type-check frontend
pnpm tsc --noEmit

# Production build (generates desktop bundles)
pnpm tauri build

# Rust formatting and linting
cd src-tauri && cargo fmt
cd src-tauri && cargo clippy

# Rust tests
cd src-tauri && cargo test
```

**Important:** Use `pnpm tauri dev` for full functionality. Browser-only `pnpm dev` will show warnings for Tauri API calls.

## Architecture Overview

### State Management
- **Stores**: All located in `src/stores/`, using `useSyncExternalStore` pattern
- **Key Stores**:
  - `ideStore.tsx`: Workspace, open files, sidebar state, file operations
  - `editorStore.ts`: Monaco editor instance, navigation actions (Go to Definition, etc.)
  - `terminalStore.ts`: Terminal sessions, PTY management
  - `gitStore.ts`: Git history, status, branches, stashes
  - `themeStore.ts`: Theme application and system sync
  - `settingsStore.ts`: User preferences persistence

### Frontend Structure
```
src/
├── components/
│   ├── ide/              # Core IDE components
│   │   ├── MonacoEditor.tsx       # Monaco editor integration
│   │   ├── IDE.tsx                # Main IDE layout
│   │   ├── ProjectExplorer.tsx    # File tree
│   │   ├── TerminalPanel.tsx      # Terminal UI
│   │   ├── StatusBar.tsx          # Status bar with Git/diagnostics
│   │   ├── Breadcrumbs.tsx        # Navigation breadcrumbs
│   │   ├── ProblemsPanel.tsx      # Diagnostic viewer
│   │   └── MenuBar.tsx            # Application menu
│   └── ui/               # Reusable primitives (shadcn/ui style)
├── stores/               # State management
├── services/             # Business logic
│   ├── diagnosticService.ts       # Unified diagnostic system
│   └── gitService.ts              # Git command wrappers
├── themes/               # Theme definitions and validators
└── utils/                # Utilities
```

### Backend Structure (Rust)
```
src-tauri/src/
├── lib.rs                # Tauri builder, command registration
├── main.rs               # Binary entrypoint
├── project_manager.rs    # File I/O, project tree, watcher
├── terminal_manager.rs   # PTY sessions, shell management
└── git_manager.rs        # Git operations via git2
```

### Key Tauri Commands

**File Operations:**
- `load_project_structure(path)` - Build project tree
- `get_file_content(path)` - Read file
- `save_file_content(path, content)` - Write file
- `watch_project_changes(path)` - Start file watcher (emits `file-change` events)
- `create_file(path)`, `create_folder(path)`, `rename_path(old, new)`, `delete_path(path)`

**Terminal:**
- `terminal_create(shell?, cwd?, cols?, rows?)` - Create PTY session
- `terminal_write(id, data)` - Write to session
- `terminal_resize(id, cols, rows)` - Resize PTY
- `terminal_kill(id)` - End session
- `terminal_change_directory(id, cwd)` - Change working directory

**Git:**
- `git_is_repo(path)` - Check if path is a Git repo
- `git_log(path, max_commits)` - Get commit history
- `git_status(path)` - Get working tree status
- `git_commit(path, message, author_name, author_email)` - Create commit
- `git_branches(path)`, `git_checkout_branch(path, name)`, `git_create_branch(path, name)`
- `git_stage_file(path, file)`, `git_unstage_file(path, file)`, `git_diff_file(path, file)`
- `git_stash_list(path)`, `git_stash_push(path, message)`, `git_stash_pop(path, index)`
- `git_push(path)`, `git_pull(path)`

**Global Shortcuts** (desktop only):
- Emits `shortcut/*` events on keybindings (e.g., `shortcut/quick-open`, `shortcut/save-file`)
- Handled in `lib.rs` with `tauri_plugin_global_shortcut`

## Monaco Editor Integration

### Recent Migration
Migrated from CodeMirror 6 to Monaco Editor. See `MONACO_NAVIGATION_FEATURES.md` for detailed documentation.

### Key Features
- **Breadcrumbs**: Pattern-based symbol detection (`Breadcrumbs.tsx`)
- **Navigation**: Go to Definition (F12), Peek Definition (Alt+F12), Find References (Shift+F12), etc.
- **Diagnostics**: Unified system via `diagnosticService.ts` feeding `StatusBar.tsx` and `ProblemsPanel.tsx`
- **Editor Actions**: Exposed via `editorStore.ts` (`editorActions`)
- **LSP Integration**: Language Server Protocol support for advanced IntelliSense (see `LSP.md`)

### Web Workers
Monaco uses web workers for language services, configured using Vite's native `?worker` import syntax:
- Workers are bundled using Vite's native worker support (no plugin needed)
- Supports TypeScript, JavaScript, JSON, CSS, HTML
- Runs language processing off the main thread for better performance
- See `src/services/monacoWorkers.ts` for configuration

### Working with Monaco
```typescript
import { editorActions } from '@/stores/editorStore';

// Register Monaco instance (done in MonacoEditor.tsx)
editorActions.registerView(editorInstance);

// Use navigation actions
editorActions.goToDefinition();
editorActions.renameSymbol();
editorActions.formatDocument();

// Trigger layout recalculation (after resize)
editorActions.layout();
```

### Language Server Protocol (LSP)
See `LSP.md` for comprehensive documentation. Key points:
- Infrastructure in place for external language servers
- Currently uses Monaco's built-in TypeScript/JavaScript support
- Ready for rust-analyzer, Python LSP, and other language servers
- Diagnostics integrated with unified diagnostic service

## Theme System

**Location:** `src/themes/index.ts`, applied by `themeStore.ts`

**Key Principles:**
- Define themes as objects with HSL color values
- Use `hexToHslStr` for custom color conversion
- Always use Tailwind v4 tokens: `bg-background`, `text-foreground`, `border`, etc.
- **Never hard-code colors** in components
- Modes: `system`, `day`, `night`
- Persisted via Tauri store plugin

**Adding a Theme:**
1. Add theme object to `src/themes/index.ts`
2. Ensure all required tokens are present (see existing themes)
3. Test with `ThemePreview.tsx` component
4. Validate accessibility with `validateThemeAccessibility` from `themeValidator.ts`

## Terminal System

**Important:** The terminal requires PTY support and only works in `pnpm tauri dev` mode.

**Architecture:**
- Frontend: `TerminalPanel.tsx` with xterm.js (`@xterm/xterm`)
- Store: `terminalStore.ts` manages sessions
- Backend: `terminal_manager.rs` uses `portable-pty`

**Windows-Specific Considerations:**
- Must use `pair.slave.spawn_command(cmd)` to spawn shell
- Writer obtained via `pair.master.take_writer()` and persisted
- Reader cloned via `try_clone_reader()` and consumed on background thread

**Browser Dev Behavior:**
- Shows hint: "Desktop mode required for interactive terminal"
- Mock session created, writes logged to console

## Git Integration

**Architecture:**
- Backend: `git_manager.rs` uses `git2` crate
- Frontend: `gitStore.ts` for state, `gitService.ts` for command wrappers
- UI: `GitHistoryPanel.tsx`, `DiffViewer.tsx`, `BranchManager.tsx`, `StashManager.tsx`

**Key Workflows:**
- Status updates refresh on file changes
- Commit flow uses author info from settings
- Branch switching updates workspace state
- Stash operations integrated with UI

## Code Style & Conventions

### TypeScript
- Strict mode enabled, avoid `any`
- Use `@/*` path alias for imports
- Components: PascalCase (`IDE.tsx`, `MonacoEditor.tsx`)
- Utilities/stores: camelCase (`ideStore.tsx`, `systemTheme.ts`)

### React
- Functional components with hooks
- Use `useSyncExternalStore` for store subscriptions
- Keep state local when possible, lift only when necessary

### Styling
- Tailwind CSS v4 classes only
- Use `cn()` utility from `src/lib/cn.ts` for conditional classes
- Reference theme tokens, not raw colors

### Rust
- Follow standard Rust conventions (`cargo fmt`, `cargo clippy`)
- Use `serde` for serialization
- Validate inputs in commands before file operations
- Use `Result<T, String>` for Tauri commands

## Common Development Tasks

### Add a Tauri Command
1. Define command in appropriate module (`src-tauri/src/*.rs`)
2. Register in `lib.rs` `invoke_handler![]`
3. Call from frontend via `invoke("command_name", { args })`

### Add a UI Component
1. Create in `src/components/ui/` (primitives) or `src/components/ide/` (IDE-specific)
2. Use Tailwind tokens and `cn()` for styling
3. Import and use in parent component

### Add a Store Property
1. Update interface in store file (e.g., `IDEState` in `ideStore.tsx`)
2. Update initial state
3. Create action to modify property
4. Optionally persist with `saveToStore(key, value)`

### Extend Monaco Features
1. Use Monaco APIs in `MonacoEditor.tsx` or `editorStore.ts`
2. Register editor instance via `editorActions.registerView()`
3. Add action to `editorActions` if needed

### Add Diagnostic Source
```typescript
import { getDiagnosticService, DiagnosticSource, DiagnosticSeverity } from '@/services/diagnosticService';

const service = getDiagnosticService();
service.addDiagnostic({
  id: 'custom-1',
  source: DiagnosticSource.Custom,
  severity: DiagnosticSeverity.Error,
  message: 'Custom error message',
  file: 'file:///path/to/file.ts',
  line: 10,
  column: 5
});
```

## LSP Implementation Status

**LSP infrastructure has been implemented** as of 2025-11-02:
- LSP service layer in `src/services/lsp/`
- Monaco adapter for LSP integration
- Currently using Monaco's built-in TypeScript/JavaScript support
- Ready for external language servers via Tauri backend (future implementation)
- See `LSP.md` for comprehensive documentation

## Testing & Validation

- **Frontend Type Check:** `pnpm tsc --noEmit`
- **Rust Tests:** `cd src-tauri && cargo test`
- **Rust Linting:** `cd src-tauri && cargo clippy`
- **Rust Formatting:** `cd src-tauri && cargo fmt`
- **Manual Testing:** Use `pnpm tauri dev` to verify desktop functionality

No formal frontend test suite exists yet. Prioritize type safety and manual verification.

## Security & Permissions

- Tauri capabilities configured in `src-tauri/capabilities/default.json`
- Validate all file paths and inputs in Rust commands
- Minimize exposed command surface
- Use explicit serde types for serialization
- Avoid privileged operations without explicit user consent

## Troubleshooting

### Tauri APIs not working
- Ensure running `pnpm tauri dev`, not `pnpm dev`
- Guard Tauri calls with environment check:
```typescript
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
if (isTauri) { /* safe to use Tauri APIs */ }
```

### Port conflicts
- Change Vite port: `pnpm dev -- --port 1421`
- Update `tauri.conf.json` `devUrl` to match

### Monaco editor not responding
- Verify editor registered: `editorActions.registerView(editorInstance)`
- Trigger layout after resize: `editorActions.layout()`

### Breadcrumbs not updating
- Check file language is supported (TypeScript, JavaScript, HTML, CSS, Rust)
- Verify cursor position tracking is active

### Diagnostics not showing
- Ensure `getDiagnosticService()` is initialized
- Check Monaco markers are emitted
- Verify components subscribe to service

### Terminal not working
- Terminal requires `pnpm tauri dev` mode
- On Windows, ensure Visual Studio Build Tools installed
- Check PTY permissions and shell availability

## Future Roadmap

See `ROADMAP.md` for comprehensive feature plans, including:
- Multi-agent orchestration (up to 8 parallel agents)
- Voice mode integration
- Native browser tool with DevTools
- SOLO mode (autonomous development)
- Model Context Protocol (MCP) integration
- Advanced context management (200k tokens)
- Team collaboration features

The roadmap targets making Rainy Aether the definitive AI-first IDE, combining innovations from Cursor 2.0, TRAE.AI, and Windsurf.

## Additional Documentation

- **AGENTS.md**: Comprehensive agent-focused guide with detailed setup checklist
- **ROADMAP.md**: Feature roadmap with market analysis and timeline
- **MONACO_NAVIGATION_FEATURES.md**: Detailed Monaco editor integration documentation
- **README.md**: Basic project setup (minimal Tauri template info)
