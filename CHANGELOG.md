# CHANGELOG

All notable changes to Rainy Aether IDE will be documented in this file.

## [v0.1.6] - 2026-01-02

### Added
- **Git GUI Enhancement**: VS Code-style Git initialization panel in Source Control sidebar with:
  - **Initialize Repository** button to create a new Git repository in the current workspace
  - **Clone Repository** button to clone from a remote URL
  - **Publish to GitHub** button (opens GitHub docs for repo creation)
  - Documentation link for Git help
- **`git_init` Command**: New native libgit2 Rust command for fast repository initialization
- **`initRepository()` Function**: Frontend service method in gitStore for initializing repos

### Improved
- **Git Sidebar UX**: Source Control panel now shows helpful onboarding when no repository is detected instead of a minimal placeholder

---

## [v0.1.5] - 2026-01-01

### Added
- **Rust State Manager**: New `state_manager` module for centralized session state persistence, replacing fragmented TypeScript persistence.
- **Session State Commands**: `get_session_state`, `save_session_state`, `clear_session_state` Tauri commands for reliable session management.
- **Dynamic Menu Switching**: macOS menu bar now switches between minimal (startup) and full (editor) menus based on current view.
- **Startup Menu**: Minimal startup menu with only essential items (Rainy Aether, File, Window, Help).

### Fixed
- **Project Closure Bug**: Closing a project and restarting the app no longer reopens the closed project. Session state now correctly tracks `is_project_open` flag.
- **Version Display**: Synchronized versions across `package.json`, `tauri.conf.json`, and `Cargo.toml` to 0.1.5.

### Improved
- **Menu Bar on Startup Page**: Menu bar is now minimal on startup page, showing only relevant options.
- **State Persistence**: Consolidated session state in Rust backend, eliminating duplicate frontend persistence.

## [v0.1.4] - 2025-12-31

### Fixed
- **Theme Persistence**: Fixed issue where premium themes (Dracula, One Dark, GitHub) would reset to default on restart by standardizing naming conventions.
- **Theme Persistence (System Mode)**: Fixed issue where saved theme was ignored when user preference was 'system', causing themes to reset to base+systemMode instead of the explicitly selected theme.
- **Brand Themes Visibility**: Fixed missing brand themes (Christmas, New Year, Rainy Aether) in Theme Store modal by standardizing naming to `base-mode` format and adding metadata.
- **Monaco Minimap**: Resolved black minimap background issue with global CSS overrides.
- **Monaco Syntax Highlighting**: Improved syntax highlighting stability for premium themes using explicit Monaco rules.
- **Theme Metadata**: Added missing metadata for premium themes in ThemeStore to ensure correct display and selection.

## [v0.1.3] - 2025-12-31

### Added

- **Update Icons**: Added update icons to the UI for better visual feedback.
- **Update Dependencies**: Updated dependencies to their latest versions.

### Fixed

- **Update Icons**: Fixed update icons not showing up in the UI.

### Improved

- **Update Icons**: Improved update icons to be more visible and easier to understand.
- **Sidebar File Tree**: Modernized file explorer with Radix Accordion for smooth folder animations and tree line indicators for better visual hierarchy.

## [v0.1.2] - 2025-12-31

### Added
- **Network State Layer**: Implemented `NetworkState` type system for cross-agent memory sharing using AgentKit's `network.state.data`.
- **File Caching**: Added 30-second TTL caching for file reads to reduce redundant disk access (target: ~38 reads → ~2-5 reads per edit).
- **Planner Agent**: New agent for task analysis and execution plan generation before handing off to specialized agents.
- **Agent Lifecycle Hooks**: Added `onStart` and `onFinish` hooks to all agents for context preparation and state persistence.
- **State-Based Routing**: Replaced keyword-based routing with intelligent state-based orchestration using execution plans.
- **Batch Tools**: Added `fs_batch_read` (multi-file cached reads), `batch_search` (parallel pattern search), `verify_changes` (TypeScript checking), `get_project_context` (cached project info).
- **Git Caching**: Added `gitDiffTool` and caching for git status/diff operations.
- **State Inspection**: Added `/tasks/:id/state` API endpoint for debugging network state and cache statistics.
- **BrainService Methods**: Added `getTaskState()` for state inspection and `getAgents()` for discovering available agents.

### Improved
- **Agent Coordination**: Agents now share context via network state, enabling better handoffs and reducing redundant operations.
- **Tool Descriptions**: Enhanced file and terminal tool descriptions with caching behavior and usage guidance.
- **SSE Streaming**: Task status updates now include `networkState` snapshot for real-time monitoring.

### Fixed
- **Type Exports**: Fixed type re-exports in `tools/index.ts` using proper `export type` syntax.
- **Unused Imports**: Removed unused imports in base.ts, router.ts, executor.ts, bridge.ts.
- **Type Safety**: Added null checks for function call parameters and step result types in inngest.ts.

---

## [v0.1.1] - 2025-12-30

### Added
- **Native Drag & Drop**: Implemented native Tauri drag-and-drop support for images in Chat.
- **Git Sidebar**: Complete redesign of the Git sidebar for better organization and aesthetics.
- **Browser Status**: Added connection status tracking and visualization for the integrated browser.
- **Git Clone**: Improved git clone functionality with better path handling and authentication.
- **Agent**: Added `task_boundary` and `notify_user` tools support.
- **Project Context**: Added `get_project_context` tool for consolidated project information retrieval.

### Improved
- **UI/UX**: Significant refinements to the Chat UI including glassmorphism effects, better alignment, and model dropdown improvements.
- **Extension Modal**: Refined UI for Extension Marketplace and Manager with glassmorphism and shadcn integration.
- **Autocompletion**: Enhanced accuracy and prompt engineering to reduce garbage output and better respect context.
- **Agent Stability**: Fixed issues with agent system crashes and state updates.
- **Sidebar**: Improved file explorer performance, fixed folder toggling bugs, and removed dead code.
- **Diff View**: Fixed inline diff visualization in Monaco editor and resolved UI freezes during diff application.
- **Tooling**: Enhanced tool schemas and output formatting for better agent interaction.
- **Agent Tools**: Applied Anthropic best practices - prompt-engineered tool descriptions with usage guidance, added `response_format` for token efficiency, improved error messages with recovery hints.
- **Precision Editing**: Added `edit_file_lines` (line-based), `multi_edit` (atomic batch edits), and `analyze_file` (comprehensive file analysis) tools for more accurate agent file modifications.
- **Agent Prompts**: Updated agent system prompts with tool selection guidelines to prefer efficient consolidated tools.

### Fixed
- **Autocompletion**: Fixed connection and credential loading issues.
- **TSConfig**: Fixed parsing error during project initialization.
- **ToolExecutionItem**: Fixed TypeError when handling null tool arguments.
- **Gitignore**: Agent now properly respects `.gitignore` rules during file search and traversal.
- **Subfolders**: Fixed bug where subfolders wouldn't close properly on click.

---

## [v0.1.0] - Initial Release 

### Features
- Tauri 2 desktop application with Rust backend
- Monaco-based code editor with syntax highlighting
- AI-powered agent chat with multi-model support (Gemini, Groq and Cerebras)
- Git integration (history, branches, stash management)
- File explorer with drag-and-drop
- Terminal integration
- Preview browser panel
- Extension system
- Theme support (light/dark modes)
- Cross-platform support (macOS, Linux, Windows)
