# CHANGELOG

All notable changes to Rainy Aether IDE will be documented in this file.

## [v0.1.12] - 2026-01-03

### Added
- **Dynamic Subagent System Infrastructure**: Core infrastructure for user-configurable AI agents with multi-model support
  - `SubagentConfig.ts`: Complete type definitions and Zod validation schemas for subagent configuration
  - `SubagentRegistry.ts`: CRUD operations, multi-source loading (user/project/plugin), and priority resolution
  - `SubagentFactory.ts`: Converts configurations to executable AgentKit agents with multi-model AI support
  - Tool management helpers in `agentkit.ts`: `getAllTools()`, `getToolsByNames()`, `getToolCategories()`, `getToolMetadata()`
- **Multi-Model AI Support**: Subagents can use different AI providers based on task requirements
  - Gemini 3 Flash/Pro for fast and smart tasks
  - Claude 3.5 Sonnet/Haiku for code review and analysis
  - Grok Beta for real-time data tasks
  - GPT-4 for general-purpose tasks
- **Subagent Configuration Schema**: YAML frontmatter + Markdown format for agent definitions
  - Identity: name, ID, description, version
  - Behavior: system prompt, model selection, temperature, max tokens
  - Permissions: tool whitelist or inherit all tools
  - Routing: keywords, regex patterns, priority (0-100)
  - Analytics: usage count, success rate, timestamps
- **Storage System**: Multi-level agent storage with priority resolution
  - Project-level: `.rainy/agents/` (highest priority, team-shared)
  - User-level: `~/.rainy/agents/` (medium priority, personal)
  - Plugin-level: Future plugin-provided agents (lowest priority)
- **Dynamic Routing System**: Intelligent agent selection with custom subagent support
  - Heuristic routing: Pattern matching (keywords + regex) with custom agent priority
  - LLM-based routing: Dynamic prompt generation including all custom agents
  - Hybrid routing: Fast heuristics with LLM fallback for ambiguous cases
  - Custom agent caching: 1-minute TTL for efficient multi-query sessions
- **Network Integration**: Seamless execution of both built-in and custom agents
  - Auto-loading of custom agents into AgentKit network
  - Direct execution via `executeWithAgent()` supporting custom agent IDs
  - Usage tracking and analytics for custom agents
- **Tool Permission System**: Runtime validation and enforcement of tool access
  - `ToolPermissionManager` for permission checking and compatibility validation
  - AI-powered tool suggestions based on agent descriptions
  - Usage tracking with risk profile analysis (safe/moderate/destructive)
  - Violation detection and reporting
  - Recommended tool sets for different task types (read-only, write, execute, full)
- **Backend API Integration**: Complete REST API for subagent management
  - 14 HTTP endpoints for CRUD operations, validation, testing, and analytics
  - `subagent-routes.ts`: Express router with filtering, search, and bulk operations
  - AI-powered tool suggestion endpoint for agent creation assistance
  - Usage statistics and violation tracking per agent
- **Inngest Workflows**: Durable async workflows for lifecycle management
  - 5 workflows: reload, execute, create, update, delete
  - Automatic analytics tracking during execution
  - Success rate calculation and usage counting
  - Tool permission recording during agent runs
- **Frontend Integration**: Complete IDE UI for subagent management
  - `SubagentManager.tsx`: Grid view with search, filters, and CRUD operations
  - `SubagentFormDialog.tsx`: Full-featured create/edit dialog
  - AI-powered tool suggestions based on agent description
  - Real-time stats and analytics display
  - Seamless integration with backend API
  - Responsive design matching IDE aesthetic

### Improved
- **Tool Management**: Added categorization (read/write/execute/git/analysis) and risk level classification (safe/moderate/destructive)
- **Documentation**: Enhanced `MIGRATION_FROM_LEGACY.md` with dynamic subagent system architecture, multi-model support details, and migration timeline

### Technical
- Added `yaml` package dependency for YAML frontmatter parsing in subagent files
- Fixed TypeScript compilation errors in new infrastructure files
- Implemented proper error handling and validation for all subagent operations
- #44 [Improvements] Completely redesigned SubagentManager to match MCPManager professional UI with sidebar navigation and detail view
- #45 [Improvements] Added SubagentManager command to command palette (accessible via Cmd+Shift+P and search "subagent")
- #46 [Improvements] Implemented glassmorphism styling and visual stats display (usage count, success rate) in SubagentManager
- #47 [Improvements] Created comprehensive SUBAGENT_USER_GUIDE.md with examples and best practices
- #40 [Improvements] Implemented dynamic subagent backend API with Hono routes for create, read, update, delete operations

---

## [v0.1.11] - 2026-01-03

### Added
- **Gemini JSON Schema Sanitization**: Added schema sanitization for Gemini compatibility
  - Introduced `sanitizeSchema` method to remove unsupported properties from JSON schemas
  - Unsupported props include 'exclusiveMinimum', '$schema', 'allOf', etc., to align with Gemini's function calling API
  - Applied sanitization in `convertToolsToGemini` to ensure valid tool parameters and prevent API errors

### Improved
- **#1 [Improvements] Agent Settings UI**: Enhanced Agent Settings dialog with premium glassmorphism design matching Extension Manager
  - Applied `backdrop-blur-3xl` and `backdrop-saturate-150` for rich glassmorphism effects (consistent with blur rules)
  - Added `backdrop-blur-sm` to dialog overlay for blurred background effect behind the dialog
  - Server Status card now uses premium glassmorphic card with enhanced borders and hover effects
  - Each API provider has individual glassmorphic card with interactive transitions
  - Added scale animations to all interactive elements (`hover:scale-105`, `active:scale-95`)
  - Enhanced visual hierarchy with improved spacing (`p-5`), rounded corners (`rounded-xl`, `rounded-2xl`), and shadows
  - Improved button hover states with colored backgrounds (red/green for server controls, destructive for Clear buttons)
  - Security info section now uses glassmorphism with enhanced borders
  - Dialog footer buttons have scale animations for better interactivity
- **Premium Code Block UI**: Redesigned agent chat code blocks with a glassy, high-end aesthetic
  - Implemented glassmorphism using `backdrop-blur-3xl`, `bg-background/10`, and `backdrop-saturate-150`
  - Added macOS-style window control dots (red, yellow, green) for a "windowed" look
  - Integrated `Terminal` and `FileCode` icons to distinguish terminal outputs from source code
  - Optimized SyntaxHighlighter with transparent backgrounds and JetBrains Mono fonts
  - Removed redundant containers in `AgentChatWindow` for a cleaner, floating appearance

---

## [v0.1.10] - 2026-01-03

### Added
- **MCP Auto-Connect**: Enabled servers in `mcp.json` now automatically reconnect when the IDE reopens
  - New `/api/agentkit/mcp/auto-connect` endpoint to trigger reconnection
  - Frontend triggers auto-connect on `AgentService` initialization
- **Dynamic Tool Routing**: MCP tools (prefixed with `server.`) are now forced to execute locally via `ToolRegistry`
  - Fixed "Unknown tool" errors when using MCP tools while Brain sidecar is connected
  - Ensures MCP API call-through functions are used for execution

---

## [v0.1.9] - 2026-01-03

### Added
- **MCP Tool Approval Service**: New security layer for MCP tool calls with per-server permissions
  - `autoApprove` flag on MCP server configs - trusted servers skip user confirmation
  - `trustLevel` classification: `system` (built-in), `trusted`, or `untrusted`
  - Session-level auto-approve overrides via API
- **MCP Approval API Endpoints**:
  - `GET /api/agentkit/mcp/approvals` - Get pending tool call approvals
  - `POST /api/agentkit/mcp/approvals/:id/approve` - Approve a pending request
  - `POST /api/agentkit/mcp/approvals/:id/reject` - Reject a pending request
  - `PATCH /api/agentkit/mcp/servers/:name/auto-approve` - Toggle auto-approve for a server
- **Agent System Prompt Enhancement**: Dynamic MCP tools section injection
  - Connected MCP server tools now appear in agent's system prompt
  - Tools show auto-approve status (✅ or 🔒) for user transparency

### Improved
- **MCP Manager UI**: Added auto-approve toggle per server with system trust badge
- **Config Schema**: Extended `MCPServerConfig` and `MCPServerEntry` with security fields

---

## [v0.1.8] - 2026-01-02

### Fixed
- **MCP Manager Real Connections**: Fixed MCP server connections that were failing with "Check server configuration" error
  - Workspace tools now use `internal` transport type (no subprocess spawn needed)
  - Connect endpoint correctly returns 27 built-in tools from `TOOL_DEFINITIONS`
  - Fixed `mcp-agents.ts` to handle internal transport type properly

### Added
- **MCP Connect/Disconnect API**: New endpoints for real MCP server management:
  - `POST /mcp/servers/:name/connect` - Connect and fetch real tools
  - `GET /mcp/servers/:name/tools` - List tools from connected server
  - `POST /mcp/servers/:name/disconnect` - Disconnect from server
  - `POST /mcp/servers/:name/tools/:tool/call` - Call tool on server
  - `GET /mcp/connected` - Get all connected servers
- **Internal Transport Type**: New transport type for built-in tools that don't need MCP subprocess

### Improved
- **MCPManager.tsx**: Rewrote to connect to real MCP servers via API with Connect button, status indicators, and proper error handling

---

## [v0.1.7] - 2026-01-02

### Added
- **MCP Server Manager**: New UI to manage MCP servers (similar design to Extension Marketplace) with:
  - Server sidebar showing connection status and tool counts
  - Tool list with descriptions and individual enable/disable toggles
  - Server enable/disable switches
  - View raw config and refresh buttons
- **AgentKit Integration**: Complete server-side agent architecture migration:
  - Durable agent execution via Inngest workflows
  - LLM-based hybrid routing (heuristics + AI)
  - Persistent state management for conversations
  - Real-time SSE streaming for agent events
- **MCP Configuration**: Standard MCP config format (`.rainy/mcp.json`) compatible with Claude Desktop/Cursor
- **MCP Resilience Layer**: Production-ready MCP connections with:
  - Circuit breakers for fault tolerance
  - Exponential backoff retry with jitter
  - Rate limiting (token bucket algorithm)
  - Health monitoring and logging
- **AgentKit API**: New REST endpoints at `/api/agentkit/` for:
  - Task execution with network routing
  - SSE streaming for real-time events
  - MCP configuration management
  - Health and circuit breaker status
- **useAgentKit Hook**: React hook for frontend AgentKit integration with task execution and event streaming

### Improved
- **Tool Execution Display**: Added MCP tool icons (Context7, Firebase, Dart) to chat tool call visualization
- **Agent Architecture**: Migrated from ad-hoc agent system to structured AgentKit-based network

---

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

### Fixed
- **Git Commit Staging**: Fixed critical bug where `git_commit` ignored the "Stage all" option, causing commits to be empty when files hadn't been manually staged. Now properly stages all files (including untracked) before committing when enabled.

### Added in Patch
- **Delete Repository**: New option to delete the `.git` folder for resetting local repositories (accessible via "More options" dropdown in Git panel)
- **`git_delete_repo` Command**: Native Rust command to safely delete `.git` folder, with protection for repos that have remotes configured

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
