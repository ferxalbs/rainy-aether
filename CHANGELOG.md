# CHANGELOG

All notable changes to Rainy Aether IDE will be documented in this file.

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
