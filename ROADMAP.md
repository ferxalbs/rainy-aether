# Rainy Aether - Product Roadmap

> **Vision**: Build the world's most powerful AI-native code editor that combines the best of VS Code's extensibility, Cursor's AI integration, and Windsurf's autonomous capabilities—while remaining completely open source.

**Current Version**: 0.1.0 (Early Alpha)
**Target Launch**: Q2 2025
**Last Updated**: November 2025

---

## Table of Contents

- [Project Mission](#project-mission)
- [Competitive Positioning](#competitive-positioning)
- [Development Phases](#development-phases)
  - [Phase 1: Foundation](#phase-1-foundation-q1-2025)
  - [Phase 2: Intelligence](#phase-2-intelligence-q2-2025)
  - [Phase 3: Collaboration](#phase-3-collaboration-q3-2025)
  - [Phase 4: Ecosystem](#phase-4-ecosystem-q4-2025)
- [Feature Comparison Matrix](#feature-comparison-matrix)
- [Technical Architecture](#technical-architecture)
- [Community & Contribution](#community--contribution)

---

## Project Mission

Rainy Aether is an **AI-first code editor** built from the ground up to enable natural, conversational programming with multi-model AI assistance. Unlike VS Code forks, we leverage modern desktop technology (Tauri 2.0) and Monaco Editor to create a lightweight, fast, and privacy-focused development environment.

### Core Principles

1. **Open Source First**: MIT licensed, transparent development, community-driven
2. **Privacy by Default**: Local-first architecture, no telemetry without consent
3. **Multi-Model Support**: Bring your own API keys, support for all major AI providers
4. **Performance Focused**: Fast startup, low memory footprint, responsive UI
5. **Developer Experience**: Keyboard-first, customizable, extensible

---

## Competitive Positioning

### What Makes Rainy Aether Different?

| Dimension | Rainy Aether | VS Code | Cursor | Windsurf |
|-----------|--------------|---------|--------|----------|
| **License** | MIT (Open Source) | MIT (Open Source) | Proprietary | Proprietary |
| **AI Architecture** | Multi-provider, bring your own keys | Extensions only | Proprietary models + API | Proprietary models |
| **Desktop Framework** | Tauri 2.0 (Rust) | Electron | Electron | Electron |
| **Startup Time** | < 2s | 3-5s | 3-5s | 3-5s |
| **Memory Usage** | < 300MB | 500MB+ | 600MB+ | 600MB+ |
| **Built-in Terminal** | Native PTY (Rust) | Node.js PTY | Node.js PTY | Node.js PTY |
| **AI Chat** | ✅ Built-in | ❌ Extensions | ✅ Native | ✅ Native |
| **Inline Edits** | ✅ Planned | ❌ Extensions | ✅ Native | ✅ Native |
| **Autonomous Mode** | ✅ Planned | ❌ No | ✅ Agent Mode | ✅ Flows |
| **Voice Interface** | ✅ Planned | ❌ Extensions | ✅ Native | ❌ No |
| **MCP Support** | ✅ Planned | ❌ No | ❌ Limited | ✅ Native |
| **Parallel Agents** | ✅ Planned (8) | ❌ No | ✅ Yes (8) | ❌ Single |
| **Telemetry** | ❌ Opt-in only | ✅ Opt-out | ✅ Required | ✅ Required |

### Target Users

1. **Solo Developers**: Looking for powerful AI assistance without subscription costs
2. **Privacy-Conscious Teams**: Need local-first AI with BYOK (Bring Your Own Keys)
3. **Open Source Contributors**: Want to extend and customize their IDE
4. **Performance Enthusiasts**: Need lightweight, fast editor on any hardware
5. **Multi-Model Users**: Want flexibility to use multiple AI providers

---

## Development Phases

### Phase 1: Foundation (Q1 2025)

**Goal**: Establish core IDE functionality competitive with VS Code, with basic AI integration.

#### 1.1 Editor Core ✅ **[IN PROGRESS]**

- [x] Monaco Editor integration with full TypeScript/JavaScript support
- [x] Multi-language syntax highlighting (40+ languages)
- [x] File tree explorer with create/rename/delete operations
- [x] Multi-file tabs with unsaved changes indicators
- [x] Go to Definition, Find References, Peek Definition (F12, Shift+F12, Alt+F12)
- [x] Symbol breadcrumbs navigation
- [x] Search and replace (file and workspace-wide)
- [x] Code folding and minimap
- [ ] **Split editor views** (horizontal/vertical)
- [ ] **Command palette** (Ctrl+Shift+P)
- [ ] **Quick file open** (Ctrl+P)
- [ ] **Symbol search** (Ctrl+Shift+O)
- [ ] **Workspace search** (Ctrl+Shift+F) with regex support

#### 1.2 Terminal System ✅ **[COMPLETED]**

- [x] Native PTY-backed terminal using `portable-pty` crate
- [x] Multiple terminal sessions with tab management
- [x] Full-text search in terminal (Ctrl+Shift+F)
- [x] Shell profile detection (PowerShell, CMD, Bash, Zsh)
- [x] Session persistence across restarts
- [x] Copy/paste with keyboard shortcuts
- [x] Theme integration (automatic color sync)
- [ ] **Split terminal views** (side-by-side terminals)
- [ ] **Link detection** (clickable file paths and URLs)
- [ ] **Terminal commands history** (searchable)

#### 1.3 Git Integration ✅ **[COMPLETED]**

- [x] Native Git operations via `git2` Rust crate
- [x] Visual diff viewer with syntax highlighting
- [x] Commit history with graph visualization
- [x] Branch creation, switching, and deletion
- [x] Stash management (push/pop/apply)
- [x] Stage/unstage individual files
- [x] Status bar Git indicators
- [ ] **Inline blame annotations** (show commit info per line)
- [ ] **Merge conflict resolution** UI
- [ ] **Pull request integration** (GitHub, GitLab)
- [ ] **Commit message templates** and AI-generated messages

#### 1.4 Settings & Customization 🔄 **[PARTIAL]**

- [x] Theme system (Day/Night modes with CSS variables)
- [x] Settings persistence via Tauri store
- [x] Basic user preferences (editor, terminal)
- [ ] **Settings UI panel** (searchable, categorized)
- [ ] **Keyboard shortcuts customization**
- [ ] **Editor font and size configuration**
- [ ] **File associations and language mappings**
- [ ] **Workspace-specific settings** (.vscode/settings.json compatibility)

#### 1.5 Extension System 📋 **[NOT STARTED]**

- [ ] **Extension API design** (inspired by VS Code API)
- [ ] **Extension marketplace UI**
- [ ] **Package.json manifest support**
- [ ] **Language server protocol (LSP) integration** for any language
- [ ] **Theme and icon pack extensions**
- [ ] **Command contributions from extensions**
- [ ] **Basic extension examples** (linters, formatters)

**Target Completion**: October 2025

---

### Phase 2: Intelligence (Q2 2025)

**Goal**: Integrate AI capabilities that rival Cursor and Windsurf, with multi-provider support.

#### 2.1 AI Chat Interface 📋 **[NOT STARTED]**

**Inspiration**: Cursor Chat, Windsurf Cascade

- [ ] **Sidebar chat panel** with conversation history
- [ ] **Inline chat** (Ctrl+K) for quick edits
- [ ] **Multi-turn conversations** with full context
- [ ] **@-mentions for context**:
  - `@file` - Include specific files
  - `@folder` - Include entire directories
  - `@code` - Include selected code blocks
  - `@git` - Include Git history/diffs
  - `@docs` - Include documentation
  - `@web` - Include web search results
- [ ] **Conversation branching** (try different approaches)
- [ ] **Export conversations** (markdown, JSON)
- [ ] **Conversation templates** (reusable prompts)

#### 2.2 AI Code Editing 📋 **[NOT STARTED]**

**Inspiration**: Cursor Composer, GitHub Copilot

- [ ] **Inline completions** (tab to accept)
  - Multi-line suggestions
  - Context-aware (imports, surrounding code)
  - Debounced requests (avoid API spam)
- [ ] **AI-powered refactoring**:
  - Extract function/variable
  - Rename with AI understanding
  - Convert code style (e.g., class → hooks)
- [ ] **Smart paste** (auto-format, auto-import)
- [ ] **Code explanation** (hover or command)
- [ ] **Generate tests** for selected functions
- [ ] **Generate documentation** (JSDoc, docstrings)

#### 2.3 Multi-Provider Support 📋 **[NOT STARTED]**

**Unique Differentiator**: Bring your own API keys, no lock-in

- [ ] **Supported providers**:
  - OpenAI (GPT-4, GPT-3.5, o1)
  - Anthropic (Claude 3.5 Sonnet, Opus, Haiku)
  - Google (Gemini Pro, Flash)
  - Cerebras (Llama 3.1, 70B/8B)
  - Groq (ultra-fast inference)
  - DeepSeek Coder
  - Local models via Ollama
  - Azure OpenAI
- [ ] **Provider configuration UI**:
  - API key management (encrypted storage)
  - Model selection per provider
  - Cost tracking dashboard
  - Rate limit monitoring
- [ ] **Model routing** (auto-select based on task):
  - Fast models for completions (Groq, Cerebras)
  - Smart models for complex tasks (GPT-4, Claude)
  - Cost-optimized routing
- [ ] **Fallback chain** (retry with different provider on failure)

#### 2.4 Codebase Understanding 📋 **[NOT STARTED]**

**Inspiration**: Cursor's codebase indexing, Windsurf's Cascade

- [ ] **Semantic code search**:
  - Vector embeddings for code blocks
  - Natural language queries ("find authentication logic")
  - Symbol-aware search
- [ ] **Dependency graph**:
  - Visualize imports/exports
  - Find unused code
  - Impact analysis for changes
- [ ] **Auto-context gathering**:
  - Detect relevant files automatically
  - Include imports and dependencies
  - Trim irrelevant context (optimize tokens)
- [ ] **Project memory**:
  - Remember user preferences per project
  - Learn from accepted/rejected suggestions
  - Persistent context across sessions

#### 2.5 Diagnostics & Problems 🔄 **[PARTIAL]**

- [x] Unified diagnostic service (TypeScript, Monaco markers)
- [x] Problems panel with filtering
- [x] Status bar error/warning counts
- [ ] **AI-powered quick fixes**
- [ ] **Automatic error explanations** (hover)
- [ ] **Fix all occurrences** (batch fixes)
- [ ] **Lint and format on save** (configurable)

**Target Completion**: November 2025

---

### Phase 3: Collaboration (Q3 2025)

**Goal**: Enable autonomous development and team workflows.

#### 3.1 Agent Mode (Autonomous Development) 📋 **[NOT STARTED]**

**Inspiration**: Cursor Agent Mode, Windsurf Flows, Trae AI SOLO

- [ ] **Agent orchestration system**:
  - Natural language task descriptions
  - Multi-step planning with user approval
  - Git worktree isolation (parallel agents)
  - Progress tracking with task breakdown
- [ ] **Tool calling**:
  - File operations (read, write, delete)
  - Terminal command execution (sandboxed)
  - Web search and documentation lookup
  - Git operations (commit, branch, push)
  - Package manager operations (npm, cargo, etc.)
- [ ] **Parallel agent execution**:
  - Run up to 8 agents simultaneously
  - Isolated environments (no conflicts)
  - Merge strategies (cherry-pick, squash)
  - Agent communication protocol
- [ ] **Safety mechanisms**:
  - User approval for destructive operations
  - Automatic rollback on failures
  - Dry-run mode (preview changes)
  - Rate limiting and cost controls
- [ ] **Agent specialization**:
  - Planning agents (architecture, task breakdown)
  - Implementation agents (code writing)
  - Testing agents (test generation, execution)
  - Review agents (code review, suggestions)

#### 3.2 Voice Interface 📋 **[NOT STARTED]**

**Inspiration**: Cursor Voice Mode

- [ ] **Speech-to-text integration**:
  - OpenAI Whisper API
  - Local speech recognition (privacy mode)
  - Custom wake words/trigger phrases
- [ ] **Voice commands**:
  - "Open file X"
  - "Navigate to function Y"
  - "Explain this code"
  - "Refactor this function to use async/await"
- [ ] **Text-to-speech responses** (optional):
  - Read AI responses aloud
  - Code narration for accessibility
- [ ] **Noise cancellation** and background noise handling

#### 3.3 Browser Tool & Live Preview 📋 **[NOT STARTED]**

**Inspiration**: Cursor Browser Tool, Trae AI Preview

- [ ] **Embedded browser**:
  - Chromium-based WebView (Tauri native)
  - Full DevTools integration
  - Network inspector (requests, responses)
  - Console log integration (pipe to IDE)
- [ ] **Live preview**:
  - Hot reload on file changes
  - React/Vue component hot module replacement
  - Multi-device preview (responsive testing)
- [ ] **AI-browser interaction**:
  - "Click the login button"
  - "Fill in the form with test data"
  - "Take a screenshot of the hero section"
  - Element selection and inspection
  - Automatic UI testing

#### 3.4 Team Collaboration Features 📋 **[NOT STARTED]**

**Inspiration**: Cursor Teams, Windsurf Composer

- [ ] **Shared workspaces**:
  - Real-time co-editing (CRDT-based)
  - Cursor presence indicators
  - File locking (optional)
- [ ] **Team commands and rules**:
  - Centralized prompt library
  - Shared .cursorrules / .windsurfrules compatibility
  - Team-specific slash commands
  - Code style enforcement
- [ ] **Conversation sharing**:
  - Export/import chat history
  - Team-wide chat templates
  - AI response voting (upvote/downvote)
- [ ] **Code review integration**:
  - In-editor PR reviews
  - AI-assisted review comments
  - Suggested reviewers (based on history)

#### 3.5 Deployment & DevOps 📋 **[NOT STARTED]**

**Inspiration**: Trae AI one-click deployment

- [ ] **One-click deployment**:
  - Vercel, Netlify, Railway integration
  - Docker containerization
  - Custom deployment scripts
- [ ] **CI/CD pipeline templates**:
  - GitHub Actions
  - GitLab CI
  - Jenkins integration
- [ ] **Environment management**:
  - .env file editing with suggestions
  - Secret detection and warnings
  - Multi-environment support (dev, staging, prod)

**Target Completion**: Q4 2025

---

### Phase 4: Ecosystem (Q4 2025)

**Goal**: Build a thriving open-source ecosystem and prepare for v1.0.

#### 4.1 MCP (Model Context Protocol) Support 📋 **[NOT STARTED]**

**Inspiration**: Windsurf Wave 3, Anthropic MCP

- [ ] **Native MCP client**:
  - JSON configuration in settings
  - Streamable HTTP transport
  - WebSocket support for real-time tools
- [ ] **MCP server marketplace**:
  - Curated list of community servers
  - One-click installation
  - Star/review system
- [ ] **Built-in MCP servers**:
  - Filesystem (file operations)
  - Git (version control)
  - PostgreSQL (database queries)
  - Web search (Brave, Google)
  - GitHub (issues, PRs, actions)
- [ ] **Custom MCP server development**:
  - SDK and documentation
  - Debugging tools (inspect requests/responses)
  - Performance profiling

#### 4.2 Extension Marketplace 📋 **[NOT STARTED]**

- [ ] **Public extension registry**:
  - Searchable, categorized
  - Ratings and reviews
  - Download statistics
- [ ] **Extension development kit**:
  - TypeScript/Rust APIs
  - Hot reload during development
  - Testing framework
  - Publishing tools
- [ ] **Featured extensions**:
  - Language packs (Python, Go, Rust, etc.)
  - Themes and icon packs
  - Productivity tools (Pomodoro, time tracking)
  - AI-powered linters and formatters

#### 4.3 Performance & Optimization 🔄 **[ONGOING]**

- [ ] **Startup optimization**:
  - Lazy loading (defer non-critical features)
  - Faster Monaco initialization
  - Cached file tree (avoid re-scanning)
- [ ] **Memory management**:
  - Virtual scrolling for large files
  - Dispose unused Monaco models
  - Efficient diff computation
- [ ] **AI response optimization**:
  - Streaming responses (token-by-token)
  - Request batching (reduce API calls)
  - Local caching (common queries)
  - Background pre-fetching (predict user intent)
- [ ] **Performance monitoring**:
  - Built-in profiler (CPU, memory, network)
  - Telemetry dashboard (opt-in)
  - Performance regression tests

#### 4.4 Advanced AI Features 📋 **[NOT STARTED]**

- [ ] **Multi-file editing**:
  - Apply changes across multiple files atomically
  - Preview all changes before accepting
  - Conflict detection and resolution
- [ ] **Code generation from designs**:
  - Drag & drop Figma/Sketch files
  - Generate React/Vue components
  - Match design tokens automatically
- [ ] **Context modes**:
  - **Normal mode** (standard context window)
  - **Max mode** (up to 200k tokens, like Trae AI)
  - **Fast mode** (minimal context, faster responses)
- [ ] **Memory system**:
  - Automatic conversation summarization
  - Long-term memory (facts, user preferences)
  - Searchable knowledge base
  - User-editable memory entries

#### 4.5 Enterprise Features 📋 **[NOT STARTED]**

- [ ] **Self-hosted licensing** (keep it open source):
  - Optional team license management
  - Usage tracking (for billing purposes)
  - Centralized key management
- [ ] **Security features**:
  - Sandboxed code execution
  - Secret scanning (detect API keys, passwords)
  - SOC 2 compliance documentation
  - Audit logs (for enterprise users)
- [ ] **SSO integration**:
  - OAuth 2.0 (GitHub, Google, Microsoft)
  - SAML 2.0 (enterprise identity providers)
  - Custom authentication backends

**Target Completion**: Q4 2025 / Q1 2026

---

## Feature Comparison Matrix

### vs VS Code

| Feature | Rainy Aether | VS Code |
|---------|--------------|---------|
| Open source | ✅ MIT | ✅ MIT |
| AI built-in | ✅ Native | ❌ Extensions only |
| Startup time | < 2s | 3-5s |
| Memory usage | < 300MB | 500MB+ |
| Desktop framework | Tauri 2.0 (Rust) | Electron |
| Extension API | ✅ Similar API | ✅ Mature |
| Remote development | ⏳ Planned | ✅ Yes |
| Jupyter notebooks | ⏳ Planned | ✅ Yes |

**Summary**: Rainy Aether is lighter and faster with native AI, but VS Code has a more mature extension ecosystem. We aim for compatibility with VS Code extensions where possible.

---

### vs Cursor

| Feature | Rainy Aether | Cursor |
|---------|--------------|--------|
| Open source | ✅ MIT | ❌ Proprietary |
| AI providers | ✅ Multi-provider (BYOK) | ⚠️ Proprietary + API |
| AI chat | ✅ Planned | ✅ Yes |
| Inline edits | ✅ Planned | ✅ Yes |
| Agent mode | ✅ Planned (8 parallel) | ✅ Yes (8 parallel) |
| Voice interface | ✅ Planned | ✅ Yes |
| Browser tool | ✅ Planned | ✅ Yes |
| Team features | ✅ Planned | ✅ Yes |
| Privacy | ✅ Local-first, no telemetry | ⚠️ Telemetry required |
| Pricing | ✅ Free (BYOK) | 💰 $20-40/month |

**Summary**: Cursor has a head start on AI features, but Rainy Aether offers complete transparency, multi-provider support, and zero vendor lock-in. Our roadmap aims for feature parity by Q1 2026.

---

### vs Windsurf

| Feature | Rainy Aether | Windsurf |
|---------|--------------|----------|
| Open source | ✅ MIT | ❌ Proprietary |
| AI providers | ✅ Multi-provider (BYOK) | ⚠️ Proprietary + API |
| MCP support | ✅ Planned | ✅ Yes |
| Agent mode | ✅ Planned | ✅ Flows |
| Parallel agents | ✅ Planned (8) | ❌ Single agent |
| Memory system | ✅ Planned | ✅ Yes |
| Fast context | ✅ Planned | ✅ SWE-grep |
| Voice interface | ✅ Planned | ❌ No |
| Privacy | ✅ Local-first | ⚠️ Telemetry required |
| Pricing | ✅ Free (BYOK) | 💰 $10-15/month |

**Summary**: Windsurf excels at MCP integration and autonomous flows. Rainy Aether will match these features while adding parallel agents and voice control, all without subscription fees.

---

## Technical Architecture

### Tech Stack

```
Frontend:
  ├─ React 19 (UI framework)
  ├─ TypeScript (type safety)
  ├─ Tailwind CSS v4 (styling)
  ├─ Monaco Editor (code editing)
  └─ Zustand / useSyncExternalStore (state management)

Desktop:
  ├─ Tauri 2.0 (app framework)
  ├─ Rust (backend logic)
  ├─ portable-pty (terminal sessions)
  ├─ git2 (native Git operations)
  └─ tokio (async runtime)

AI Integration:
  ├─ OpenAI SDK (GPT models)
  ├─ Anthropic SDK (Claude models)
  ├─ Google AI SDK (Gemini models)
  ├─ Ollama integration (local models)
  └─ Custom unified API layer

Build & Dev:
  ├─ Vite (bundler)
  ├─ pnpm (package manager)
  ├─ Cargo (Rust build tool)
  └─ GitHub Actions (CI/CD)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer (React)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Monaco  │  │ File Tree│  │ Terminal │  │AI Chat  │ │
│  │  Editor  │  │ Explorer │  │  Panel   │  │ Panel   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               State Management (Stores)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │IDE Store│  │Git Store │  │Term Store│  │AI Store │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Tauri IPC (Commands/Events)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Rust Backend (Tauri)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Project  │  │   Git    │  │ Terminal │  │  HTTP   │ │
│  │ Manager  │  │ Manager  │  │ Manager  │  │ Client  │ │
│  │(File I/O)│  │ (git2)   │  │  (PTY)   │  │(AI APIs)│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Startup time (cold) | < 2s | ~1.5s | ✅ |
| Startup time (warm) | < 1s | ~0.8s | ✅ |
| Memory (idle) | < 300MB | ~250MB | ✅ |
| Memory (active) | < 500MB | ~400MB | ✅ |
| File open latency | < 100ms | ~50ms | ✅ |
| Git status latency | < 200ms | ~150ms | ✅ |
| AI response time (streaming) | First token < 1s | TBD | ⏳ |
| Terminal input lag | < 16ms | ~10ms | ✅ |

### Security & Privacy

- **No telemetry by default**: All analytics opt-in only
- **Local-first**: No cloud services required
- **Encrypted secrets**: API keys stored in OS keychain
- **Sandboxed execution**: Agent commands run in isolated environments
- **Open source**: Fully auditable codebase
- **Supply chain security**: Signed releases, dependency scanning

---

## Community & Contribution

### How to Contribute

1. **Report bugs**: Open issues on GitHub with detailed reproduction steps
2. **Request features**: Use discussions to propose new ideas
3. **Submit PRs**: Follow our contribution guidelines (CONTRIBUTING.md)
4. **Write documentation**: Help improve guides and tutorials
5. **Build extensions**: Create themes, language packs, tools
6. **Spread the word**: Star the repo, share on social media

### Development Setup

```bash
# Clone the repository
git clone https://github.com/rainy-ai/rainy-aether.git
cd rainy-aether

# Install dependencies
pnpm install

# Run in development mode (full Tauri)
pnpm tauri dev

# Run frontend only (fast iteration)
pnpm dev

# Run tests
pnpm test
cd src-tauri && cargo test

# Build for production
pnpm tauri build
```

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord** *(coming soon)*: Real-time chat with the community
- **Twitter/X** *(coming soon)*: Updates and announcements

### Governance

- **Open decision-making**: Major decisions discussed publicly
- **Community input**: RFCs for significant changes
- **Transparent roadmap**: This document is always up-to-date
- **No corporate control**: Community-first, forever

---

## Release Schedule

### Alpha Releases (Current)

- **v0.1.0** (November 2025): Initial public alpha
- **v0.2.0** (December 2025): Command palette, split views
- **v0.3.0** (Q4 2025): Extension system, LSP integration

### Beta Releases

- **v0.4.0** (Q4 2025): AI chat interface, inline completions
- **v0.5.0** (Q4 2025): Multi-provider support, codebase indexing
- **v0.6.0** (Q4 2025): Agent mode (basic), voice interface

### v1.0 Release Candidate

- **v0.7.0** (Q2 2026): Browser tool, live preview
- **v0.8.0** (Q2 2026): Team collaboration, conversation sharing
- **v0.9.0** (Q3 2026): Parallel agents, MCP support

### v1.0 Stable

- **v1.0.0** (Q4 2026): Production-ready, full feature set
- **v1.1.0** (Q4 2026): Extension marketplace v2, performance polish
- **v1.2.0** (Q4 2026): Enterprise features, advanced AI-based owner models delivered through Rainy API from Enosis Labs, Inc.

---

## FAQ

### When will feature X be available?

Check the roadmap phases above. We update this document monthly with progress.

### Will Rainy Aether always be free?

Yes, the core editor is MIT licensed and free forever. We may offer optional paid services (e.g., hosted MCP servers, team sync) in the future, but the editor itself will remain open source.

### Can I use my own API keys?

Absolutely! Rainy Aether is designed for "bring your own key" (BYOK). You control your AI provider and costs.

### How is this different from VS Code with AI extensions?

Rainy Aether is built from the ground up for AI collaboration. The editor, AI, and terminal are deeply integrated, not bolted on. Plus, we're faster and lighter thanks to Tauri.

### Will you support VS Code extensions?

We're exploring compatibility with VS Code's extension API. Some extensions may work as-is, others may need minor changes. This is a long-term goal (Phase 4+).

### How can I support the project?

- ⭐ Star the GitHub repo
- 🐛 Report bugs and test features
- 📝 Contribute code or documentation
- 💬 Spread the word in your community
- 💰 Sponsor development *(coming soon: GitHub Sponsors, Open Collective)*

---

## Acknowledgments

Rainy Aether is inspired by the amazing work of:

- **VS Code**: For setting the standard in modern code editors
- **Cursor**: For pioneering AI-first development workflows
- **Windsurf**: For advancing autonomous agent capabilities
- **Zed**: For proving native performance is possible
- **Tauri**: For enabling lightweight desktop apps
- **Monaco Editor**: For powering the editing experience
- **Anthropic**: For Claude and the Model Context Protocol

This project stands on the shoulders of giants. Thank you to all open-source contributors who make this possible.

---

**Last Updated**: November 2025
**Next Update**: December 2025
**Maintained by**: Rainy Aether Core Team & Community

*This roadmap is a living document. Features, timelines, and priorities may change based on community feedback and technical constraints.*
