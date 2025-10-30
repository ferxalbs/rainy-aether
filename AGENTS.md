# AGENTS.md

Agent-focused guide for Rainy Coder — a modern desktop code editor built with Tauri (Rust) and React. This document follows the AGENTS.md standard to give coding agents a predictable, comprehensive context for working on this project.

## Project Overview

- Frontend: React + TypeScript, Tailwind CSS v4
- Desktop wrapper: Tauri 2 (Rust)
- Editor: CodeMirror 6 (languages: JS/TS, HTML, CSS, Markdown, Rust)
- State: React stores built on `useSyncExternalStore` under `src/stores/`
- Theming: CSS variables mapped to Tailwind v4 tokens; unified Day/Night modes with optional System sync
- Files/FS: Tauri plugins for dialog, fs, store, opener
- NOTE: No LSP proxy is currently implemented. See “Removed Features” for context.
- Git integration: native history, status, and commit workflows via Tauri commands and React store consumers
- Terminal integration: PTY-backed terminal sessions with Windows-specific shell fallbacks and directory sync
- Global shortcuts: desktop-only accelerator mapping for quick open, command palette, saving, navigation, and layout toggles

## Setup Commands

### Prerequisites

- Node.js with `pnpm`
- Rust toolchain (stable)
- Platform-specific dependencies for Tauri 2.0

### Development

```bash
# Install all dependencies
pnpm install

# Frontend-only dev (Vite, fast iteration)
pnpm dev

# Tauri app dev (starts Vite on `http://localhost:1420` and launches desktop shell)
pnpm tauri dev

# Production build (desktop bundles)
pnpm tauri build

# Preview built frontend (after `pnpm build`)
pnpm serve
```

Scripts are defined in `package.json`:

- `dev`: `vite`
- `build`: `vite build`
- `serve`: `vite preview`
- `tauri`: `tauri`

## Quick Start Checklist

#### 1) Prepare your environment

- Install Node.js (v18+) and `pnpm`.
- Install Rust (stable) and Tauri 2 prerequisites for your OS.
- On Windows, ensure Visual Studio Build Tools are installed.

#### 2) Install dependencies

- Run `pnpm install` at the repo root.

#### 3) Choose your dev mode

- UI-only: `pnpm dev` (fast iteration). Note: Tauri APIs are not available; code that calls `invoke` or store plugin will fail in browser-only preview.
- Desktop app: `pnpm tauri dev` (full Tauri APIs, plugins, file system, store, watchers).

#### 4) Start and verify

- Open the preview URL printed by the dev server.
- If port `1420` is busy, start Vite on another port: `pnpm dev -- --port 1421`.
- In UI-only mode, expect warnings where Tauri APIs are referenced; this is normal. Use guards when referencing Tauri:

```ts
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
if (isTauri) {
  // safe to use @tauri-apps/api and store plugin
}
```

#### 5) Explore the code structure

- Frontend lives under `src/` (components, stores, themes, utils).
- Backend (Tauri) lives under `src-tauri/src/` (`lib.rs`, `project_manager.rs`).
- Theme variables and Tailwind token mapping are defined in `src/themes` and applied via `themeStore`.

#### 6) Make a minimal change to confirm setup

- Edit a label in `src/components/ide/TopToolbar.tsx` or `src/App.tsx` and verify the change in the running app.
- Avoid hard-coded colors. Use Tailwind v4 tokens like `bg-background`, `text-foreground`.

#### 7) Work within the theme system

- Update theme values in `src/themes/index.ts` and let `applyTheme` propagate.
- Use `hexToHslStr` when mapping custom colors to CSS variables.
- Run `ThemePreview.tsx` UI to visually verify contrast. Consider `validateThemeAccessibility`.

#### 8) Use Tauri commands for file operations (desktop mode)

- `open_project_dialog` to select a workspace.
- `load_project_structure` to build the project tree.
- `get_file_content` and `save_file_content` for file I/O.
- Listen for `file-change` events to update the UI when the watcher detects changes.

#### 9) Add a new UI component

- Place in `src/components/ui/YourComponent.tsx` (PascalCase).
- Compose styles with Tailwind tokens and `cn()` from `src/libs/cn.ts`.
- Import and render from an appropriate parent (e.g., `IDE.tsx` or a page component).

#### 10) Type-check and lint

- `pnpm tsc --noEmit` to type-check frontend.
- `cd src-tauri && cargo fmt` and `cargo clippy` for Rust formatting and linting.

#### 11) Test and validate

- `cd src-tauri && cargo test` for backend tests.
- Manually verify UI interactions and theme behavior in the running app.

#### 12) Keep changes surgical and documented

- Match existing patterns and naming conventions.
- If you add or modify Tauri commands, update this AGENTS.md section and relevant stores/components.

#### 13) Build for production

- `pnpm tauri build` to produce desktop bundles under `src-tauri/target/release/bundle/`.

#### 14) Troubleshooting

- Port conflicts: run Vite on another port via `--port`.
- Tauri API errors in browser-only dev: guard access (see step 4) or use `pnpm tauri dev`.
- Filesystem permission issues: review `src-tauri/capabilities/default.json` and ensure required scopes are enabled.

## Project Structure

```text
src/
├─ components/
│  ├─ ide/            # Core IDE UI (Explorer, Editor, StatusBar, etc.)
│  └─ ui/             # Reusable UI primitives (button, card, dialog, etc.)
├─ stores/            # React stores (theme, settings, IDE state)
├─ themes/            # Theme definitions and validators
├─ utils/             # Utilities (system theme detection, version)
└─ index.tsx          # App bootstrap

src-tauri/
├─ src/
│  ├─ main.rs         # Binary entrypoint
│  ├─ lib.rs          # Tauri builder, command registration
│  └─ project_manager.rs  # Project tree, file I/O, watcher
└─ tauri.conf.json    # Tauri configuration
```

## Backend Commands (Tauri)

Registered in `src-tauri/src/lib.rs`:

- `greet(name: &str) -> String`
- `open_project_dialog()`
- `load_project_structure(path: String) -> FileNode`
- `get_file_content(path: String) -> String`
- `save_file_content(path: String, content: String) -> ()`
- `watch_project_changes(window, path, state) -> ()`

File change notifications are emitted on `file-change` events. See `src-tauri/src/project_manager.rs`.

## Terminal System

- Frontend component: `src/components/ide/TerminalPanel.tsx`
- Store: `src/stores/terminalStore.ts`
- Backend: `src-tauri/src/terminal_manager.rs`

### Commands

- `terminal_create(shell?: String, cwd?: String, cols?: u16, rows?: u16) -> String`
  - Opens a `portable-pty` pair and spawns the shell via `pair.slave.spawn_command(cmd)`.
  - Streams output by cloning the master reader and emitting `terminal/data` events.
  - Emits `terminal/exit` on EOF.

- `terminal_write(id: String, data: String) -> ()`
  - Writes to the session’s stored writer from `pair.master.take_writer()`.
  - Uses a `Mutex<Box<dyn Write + Send>>` to serialize writes in Windows environments.

- `terminal_resize(id: String, cols: u16, rows: u16) -> ()`
  - Resizes via `pair.master.resize(PtySize { ... })`.

- `terminal_kill(id: String) -> ()`
  - Drops the session. Child exits when the PTY is closed.

### Events

- `terminal/data`: `{ id: string, data: string }` for streaming PTY output.
- `terminal/exit`: `{ id: string }` when the process ends.

### Frontend Flow

- `TerminalPanel` maintains a `Map` of sessions → `xterm` instances with `FitAddon` and `WebLinksAddon`.
- On mount, it listens for `terminal/data` and `terminal/exit` only when Tauri is available.
- Keyboard input is translated to basic control sequences and routed via `terminalActions.write()`.
- Resize events call `terminalActions.resize()` using current `xterm` cols/rows.
- Tabs let you switch which session is active; `Kill` ends the active session.

### Dev Mode Behavior

- Browser-only dev (`pnpm dev`): No Tauri APIs. `terminalStore` creates a mock session and logs writes/resizes to the console.
- The `TerminalPanel` shows a hint: "Desktop mode required for interactive terminal. Use `pnpm tauri dev`."
- Desktop dev (`pnpm tauri dev`): Full terminal functionality with PTY and Tauri events.

### Windows Notes

- Use `pair.slave.spawn_command(cmd)` to spawn the shell; do not call `spawn_command` on `pair.master`.
- For writing, obtain and persist a writer via `pair.master.take_writer()`; do not write to `pair.master` directly.
- Reader should be cloned via `try_clone_reader()` and consumed on a background thread to avoid blocking.

### UI Hooks

- Toggle via `MenuBar` → View → "Toggle Terminal" wired to `terminalActions.toggle()`.
- The panel is integrated below the editor view in `IDE.tsx` and above `StatusBar`.


## Theme System

- Definitions live in `src/themes/index.ts`; validation utilities in `src/themes/themeValidator.ts`.
- Global application of CSS variables via `src/stores/themeStore.ts` (`applyTheme` sets `document.documentElement` vars).
- Tailwind v4 token mapping is enforced (e.g., `--background`, `--foreground`, `--primary`, `--muted-foreground`).
- Modes: `system`, `day`, `night`. System detection via `src/utils/systemTheme.ts`.
- Persistence via Tauri store plugin.
- Full reference: `THEME_SYSTEM_DOCUMENTATION.md`.

Agent tips for theming:

- Update theme variants through `src/themes/index.ts` and let `applyTheme` propagate.
- Use `hexToHslStr` when mapping custom vars to Tailwind tokens to maintain consistency.
- Validate accessibility with `validateThemeAccessibility` and keep contrast ratios strong, especially for muted/secondary text.

## Editor Integration

- Component: `src/components/ide/CodeMirrorEditor.tsx`
- Language packs: `@codemirror/lang-*` imports; selection controlled via props.
- Styling integrated with the app theme; avoid hard-coded colors in editor extensions.

## Code Style & Conventions

- TypeScript strict mode; avoid `any`.
- Components: PascalCase (`StartupPage.tsx`, `ThemePreview.tsx`).
- Stores/Utilities: camelCase (`ideStore.tsx`, `systemTheme.ts`).
- Use absolute imports via `@/*` alias as configured in `tsconfig.json`.
- Prefer Tailwind classes; use `cn()` from `src/libs/cn.ts` for conditional classes.
- Keep changes small and surgical; match existing patterns.

## Testing & Validation

```bash
# Rust unit tests
cd src-tauri && cargo test

# Rust formatting and linting
cd src-tauri && cargo fmt
cd src-tauri && cargo clippy

# TypeScript type-check
pnpm tsc --noEmit
```

There is no formal frontend test suite yet; prioritize local type checks and manual verification in the dev app.

## Security & Permissions

- Use Tauri capabilities (`src-tauri/capabilities`) to scope filesystem access.
- Validate all file paths and contents in Rust before reading/writing.
- Minimize the surface of exposed commands; keep serialization types explicit (`serde`).
- Avoid adding privileged plugins or commands without explicit direction.

## Agent Workflow

- Start with `pnpm dev` for fast UI iteration or `pnpm tauri dev` to validate desktop behavior.
- For UI changes, always review in the running app and ensure theme tokens are applied (no hard-coded colors).
- When editing multiple files, keep diffs focused; do not refactor unrelated areas.
- If you add a new component, place it under `src/components/ui/` or `src/components/ide/` appropriately.
- For file operations, route through existing Tauri commands; do not bypass them.
- Leverage Git store helpers (`refreshHistory`, `refreshStatus`, `commit`) when extending VCS features and respect unpushed set handling.
- Reuse terminal actions for session lifecycle (`terminal_create`, `terminal_write`, `terminal_change_directory`) and preserve environment-specific behavior.

## Common Tasks

- Add a settings UI item: use primitives in `src/components/ui` and wire to `src/stores/settingsStore.ts`.
- Adjust theme tokens: modify `src/themes/index.ts`, verify via `ThemePreview.tsx`, and ensure contrast.
- Extend editor language support: import from `@codemirror/lang-*` and update `CodeMirrorEditor.tsx` switch.
- Integrate Windows theme sync: use utilities in `src/utils/systemTheme.ts`.

## Removed Features

- LSP proxy and LSIF support were removed (see `CHANGELOG.md`).
- Do not reintroduce LSP-related dependencies or code unless explicitly requested.

## Dependencies & Tools

Frontend:

- `react`, `vite`, `tailwindcss` v4, `class-variance-authority`, `lucide-react`
- `@codemirror/*` language/editor packages
- `@tauri-apps/api` and plugins: dialog, fs, store, opener
- Note: `@anthropic-ai/claude-agent-sdk` is present but not integrated; do not use without direction.

Backend:

- `tauri` 2, `tokio`, `serde`, `notify`, Tauri plugins (fs, store, dialog, opener)

Dev tools:

- `typescript`, `vite`, `pnpm`, `cargo`

## Notes for Agents

- Respect the theme system and Tailwind token mapping; avoid hard-coded styles.
- Keep changes minimal, focused, and consistent with existing code style.
- Prefer extending existing stores/components over ad-hoc state or styles.
- Document any non-obvious logic inline only when necessary.

## References

- AGENTS.md standard: <https://agents.md/>  
- Overview article: <https://dev.to/proflead/what-is-agentsmd-and-why-should-you-care-3bg4>
