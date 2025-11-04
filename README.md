# 🌧️ Rainy Aether

<div align="center">

![Rainy Aether Banner](https://img.shields.io/badge/Rainy-Aether-5B9BD5?style=for-the-badge&logo=visual-studio-code)

**A Modern AI-First IDE Built for the Future**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/yourusername/rainy-aether)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-Stable-orange.svg)](https://www.rust-lang.org/)
[![Monaco](https://img.shields.io/badge/Monaco-Editor-007ACC.svg)](https://microsoft.github.io/monaco-editor/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing) • [Roadmap](#-roadmap)

</div>

---

## 🎯 What is Rainy Aether?

Rainy Aether (branded as **Rainy Code**) is a next-generation desktop code editor that combines the power of VS Code's Monaco editor with a modern, lightweight Rust backend. Built with **Tauri 2.0**, it delivers native performance with a fraction of the resource footprint of Electron-based IDEs.

### Why Rainy Aether?

- 🚀 **Blazing Fast**: Rust backend + optimized React frontend
- 🎨 **Beautiful**: Modern UI with Day/Night themes and Tailwind CSS v4
- 🧠 **AI-First**: Designed for multi-agent workflows and autonomous development
- 🔧 **Extensible**: Plugin architecture ready for your custom tools
- 💾 **Lightweight**: ~100MB vs 500MB+ for traditional IDEs
- 🌐 **Cross-Platform**: Native Windows, macOS, and Linux support

---

## ✨ Features

### 🎨 **Modern Editor Experience**
- **Monaco Editor**: Full VS Code editing experience with IntelliSense
- **LSP Integration**: Language Server Protocol for advanced code intelligence
- **Multi-Language**: TypeScript, JavaScript, HTML, CSS, JSON, Rust, Python, Go, and more
- **Breadcrumbs**: Smart navigation with pattern-based symbol detection
- **Go to Definition**: F12 navigation, Peek Definition (Alt+F12), Find References
- **Diagnostics**: Unified error/warning system across all languages

### 🖥️ **Professional Terminal**
- **Robust PTY Backend**: Completely rebuilt terminal system with proper lifecycle management
- **Multiple Sessions**: Tab-based terminal management
- **Shell Profiles**: Auto-detection of PowerShell, CMD, Bash, Git Bash, Zsh, Fish
- **Search**: Full-text search with `Ctrl+Shift+F`
- **Performance**: Write buffering (60fps) and resize debouncing (150ms)
- **Persistence**: Restore terminal sessions on app restart
- **Theme Integration**: Automatic adaptation to editor theme

### 📁 **File Management**
- **Project Explorer**: Fast tree navigation with lazy loading
- **File Watchers**: Real-time updates on file system changes
- **Quick Open**: `Ctrl+P` to quickly navigate to any file
- **Recent Projects**: Jump back to your recent workspaces

### 🔄 **Git Integration**
- **Native Git**: Powered by the `git2` Rust crate
- **Commit Workflows**: Stage, unstage, commit, push, pull
- **Branch Management**: Create, switch, and manage branches
- **Diff Viewer**: Visual file comparison with commit diffs
- **Stash Support**: Save and restore work-in-progress changes
- **History**: Browse commit history with detailed information

### 🎨 **Theming**
- **Day/Night Modes**: Beautiful light and dark themes
- **System Sync**: Automatically follows OS theme preference
- **CSS Variables**: Full theme customization via CSS tokens
- **Tailwind v4**: Modern styling with design tokens
- **Accessibility**: WCAG-compliant color contrast

### 🔌 **Extensibility**
- **Extension System**: Install and manage extensions
- **Plugin Architecture**: Ready for custom tools and integrations
- **MCP Ready**: Model Context Protocol integration (planned)

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** package manager (`npm install -g pnpm`)
- **Rust** stable toolchain ([Install](https://rustup.rs/))
- **Platform-specific dependencies**:
  - **Windows**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: See [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rainy-aether.git
cd rainy-aether

# Install dependencies
pnpm install

# Run in development mode (full desktop experience)
pnpm tauri dev

# Or run frontend-only (fast iteration, limited features)
pnpm dev
```

### Building for Production

```bash
# Create production build
pnpm tauri build

# Output will be in src-tauri/target/release/bundle/
```

---

## 📖 Documentation

### Essential Guides

- **[CLAUDE.md](CLAUDE.md)** - Complete developer reference for working with the codebase
- **[TERMINAL_SYSTEM.md](TERMINAL_SYSTEM.md)** - Comprehensive terminal system documentation
- **[LSP.md](LSP.md)** - Language Server Protocol integration guide
- **[MONACO_NAVIGATION_FEATURES.md](MONACO_NAVIGATION_FEATURES.md)** - Monaco editor features
- **[ROADMAP.md](ROADMAP.md)** - Feature roadmap and future plans
- **[AGENTS.md](AGENTS.md)** - AI agent setup and configuration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  React 19 Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Monaco Editor│  │  Terminal    │  │ File Explorer│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                 │                 │          │
│  ┌────────▼─────────────────▼─────────────────▼──────┐  │
│  │         State Management (Stores)                  │  │
│  └────────┬─────────────────┬─────────────────┬──────┘  │
└───────────┼─────────────────┼─────────────────┼─────────┘
            │                 │                 │
┌───────────▼─────────────────▼─────────────────▼─────────┐
│                  Tauri IPC Bridge                        │
└───────────┬─────────────────┬─────────────────┬─────────┘
            │                 │                 │
┌───────────▼─────────────────▼─────────────────▼─────────┐
│                   Rust Backend (Tauri 2.0)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ File Manager │  │ PTY Manager  │  │ Git Manager  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Development Commands

```bash
# Frontend development
pnpm dev                  # Vite dev server (fast iteration)
pnpm build                # Build frontend for production
pnpm tsc --noEmit         # Type check TypeScript

# Desktop development
pnpm tauri dev            # Full desktop app with hot reload
pnpm tauri build          # Production desktop bundles

# Rust development
cd src-tauri
cargo test                # Run Rust tests
cargo fmt                 # Format Rust code
cargo clippy              # Lint Rust code
cargo check               # Fast compile check
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Quick Open (files) |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+O` | Open Project |
| `Ctrl+S` | Save File |
| `Ctrl+W` | Close File |
| `Ctrl+B` | Toggle Sidebar |
| ``Ctrl+` `` | Toggle Terminal |
| `Ctrl+Shift+T` | New Terminal |
| `Ctrl+Shift+F` | Search in Terminal |
| `F12` | Go to Definition |
| `Alt+F12` | Peek Definition |
| `Shift+F12` | Find References |

---

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Monaco Editor** - VS Code's editor component
- **Tailwind CSS v4** - Utility-first CSS framework
- **Vite** - Lightning-fast build tool

### Backend
- **Rust** - Systems programming language
- **Tauri 2.0** - Desktop framework (Electron alternative)
- **portable-pty** - Cross-platform PTY for terminals
- **git2** - Native Git integration
- **tokio** - Async runtime

### Tools & Services
- **Language Server Protocol** - Code intelligence
- **xterm.js** - Terminal emulator
- **notify** - File system watcher

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/enosislabs/rainy-aether.git`
3. **Create a branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes** and commit: `git commit -m 'Add amazing feature'`
5. **Push** to your fork: `git push origin feature/amazing-feature`
6. **Open a Pull Request** with a clear description

### Development Guidelines

- 📝 **Code Style**: Follow existing patterns, use TypeScript strictly
- ✅ **Testing**: Ensure `pnpm tsc --noEmit` and `cargo test` pass
- 📖 **Documentation**: Update docs for new features
- 🌐 **Cross-Platform**: Test on Windows, macOS, and Linux when possible
- 🎨 **UI/UX**: Use Tailwind tokens, no hard-coded colors

### Areas Looking for Contributions

- 🔌 **Language Server Integration**: rust-analyzer, Python LSP, Go LSP
- 🌍 **Internationalization**: Multi-language support
- 🎨 **Themes**: Custom theme packs
- 📦 **Extensions**: Plugin development
- 🐛 **Bug Fixes**: Check [Issues](https://github.com/yourusername/rainy-aether/issues)
- 📝 **Documentation**: Tutorials, guides, examples

---

## 🗺️ Roadmap

### Current Status (v0.1.0)
- ✅ Monaco Editor integration
- ✅ Terminal system with PTY backend
- ✅ Native Git integration
- ✅ File explorer and management
- ✅ Day/Night themes
- ✅ LSP infrastructure

### Coming Soon (v0.2.0)
- 🔄 Multi-agent orchestration
- 🎤 Voice mode integration
- 🌐 Native browser tool with DevTools
- 📦 Extension marketplace
- 🔍 Global search and replace
- 📊 Performance profiling

### Future Vision
- 🤖 **SOLO Mode**: Autonomous development workflows
- 🧠 **AI Pair Programming**: Context-aware code suggestions
- 📱 **Mobile Companion**: Remote development from mobile devices
- 🌍 **Collaborative Editing**: Real-time team collaboration
- 🔐 **Enterprise Features**: SSO, audit logs, compliance

See [ROADMAP.md](ROADMAP.md) for detailed feature plans.

---

## 📄 License

**License is pending definition.** This project is currently under development and the license terms are being determined. It will **NOT** be MIT or Apache 2.0.

Please check back for updates on licensing. For commercial use or custom licensing inquiries, please contact the maintainers.

---

## 🙏 Acknowledgments

Rainy Aether is built on the shoulders of giants:

- 🦀 **[Tauri](https://tauri.app/)** - For creating the best desktop framework
- ⚛️ **[React](https://reactjs.org/)** - For the powerful UI framework
- 📝 **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - For VS Code's editor
- 🌐 **[Language Server Protocol](https://microsoft.github.io/language-server-protocol/)** - For language intelligence
- 🎨 **[Tailwind CSS](https://tailwindcss.com/)** - For beautiful styling
- 🦀 **[Rust](https://www.rust-lang.org/)** - For systems-level performance
- 💻 **[xterm.js](https://xtermjs.org/)** - For terminal emulation

---

## 📞 Support & Community

### Get Help
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/rainy-aether/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/rainy-aether/discussions)
- 📖 **Documentation**: See [CLAUDE.md](CLAUDE.md) and other guides

### Stay Updated
- ⭐ **Star** the repository to show support
- 👀 **Watch** for updates and new releases
- 🔔 **Follow** for announcements

---

## 🌟 Show Your Support

If you find Rainy Aether useful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and suggesting features
- 📝 Contributing code or documentation
- 📢 Sharing with other developers

---

<div align="center">

**Rainy Aether** - Bringing clarity to your coding experience, one drop at a time. 🌧️✨

Built with ❤️ by developers, for developers.

[Get Started](#-quick-start) • [Documentation](#-documentation) • [Contribute](#-contributing)

</div>
