# 🌧️ Rainy Aether

<div align="center">

![Rainy Aether Banner](https://img.shields.io/badge/Rainy-Aether-5B9BD5?style=for-the-badge&logo=visual-studio-code)

**The Next-Generation AI-Native Code Editor**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/enosislabs/rainy-aether)
[![License](https://img.shields.io/badge/license-TBD-orange.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-Stable-CE422B.svg)](https://www.rust-lang.org/)
[![Monaco](https://img.shields.io/badge/Monaco-Editor-007ACC.svg)](https://microsoft.github.io/monaco-editor/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](./CONTRIBUTING.md) • [Roadmap](./ROADMAP.md)

</div>

---

## 🎯 What is Rainy Aether?

Rainy Aether is an **open-source, AI-first code editor** built from the ground up for the modern developer. Combining the power of VS Code's Monaco editor with a blazing-fast Rust backend powered by Tauri 2.0, it delivers exceptional performance while using a fraction of the resources of traditional IDEs.

**Built by [Enosis Labs, Inc.](https://enosislabs.com)** 🏢

### Why Choose Rainy Aether?

- 🚀 **Lightning Fast** — Rust backend + optimized React, < 2s startup time
- 🪶 **Incredibly Lightweight** — ~100MB footprint vs 500MB+ for Electron IDEs
- 🧠 **AI-Native** — Multi-provider support, bring your own API keys
- 🔒 **Privacy First** — Local-first architecture, no telemetry without consent
- 🎨 **Beautiful** — Modern UI with Day/Night themes and full customization
- 🌐 **Cross-Platform** — Native Windows, macOS, and Linux support
- 🔓 **Open Source** — Transparent, community-driven development

---

## ✨ Features

### 🎨 Modern Editor
- **Monaco Editor** — Full VS Code editing experience with IntelliSense
- **Multi-Language Support** — TypeScript, JavaScript, Python, Rust, Go, and 40+ more
- **Smart Navigation** — Go to Definition (F12), Find References, Peek Definition
- **Breadcrumbs** — Pattern-based symbol detection and navigation
- **Diagnostics** — Unified error/warning system with Problems panel

### 🖥️ Professional Terminal
- **Native PTY Backend** — True terminal experience with proper shell integration
- **Multiple Sessions** — Tab-based management, shell profile detection
- **Full-Text Search** — Find anything in your terminal output (Ctrl+Shift+F)
- **Session Persistence** — Restore terminals on restart
- **Theme Integration** — Matches your editor theme automatically

### 🔄 Git Integration
- **Native Performance** — Built on Rust's `git2` crate
- **Visual Diff Viewer** — Side-by-side comparison with syntax highlighting
- **Branch Management** — Create, switch, and manage branches with ease
- **Commit Workflows** — Stage, unstage, commit, push, pull
- **Stash Support** — Save and restore work-in-progress changes
- **History Browser** — Explore commit history with detailed information

### 🎨 Theming & Customization
- **Day/Night Modes** — Beautiful light and dark themes
- **System Sync** — Automatically follows OS theme preference
- **CSS Variables** — Full theme customization
- **Accessibility** — WCAG-compliant color contrast

### 🤖 AI Features *(Coming Soon)*
- **Multi-Provider Support** — OpenAI, Anthropic, Google, Groq, Cerebras, and more
- **AI Chat** — Context-aware assistance with @-mentions
- **Inline Completions** — Smart code suggestions as you type
- **Agent Mode** — Autonomous development with up to 8 parallel agents
- **Voice Interface** — Natural language programming
- **MCP Support** — Model Context Protocol integration

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **pnpm** (`npm install -g pnpm`)
- **Rust** stable toolchain ([Install](https://rustup.rs/))
- **Platform Dependencies**:
  - Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Clone the repository
git clone https://github.com/enosislabs/rainy-aether.git
cd rainy-aether

# Install dependencies
pnpm install

# Run in development mode (full desktop experience)
pnpm tauri dev
```

### Build for Production

```bash
# Create production build
pnpm tauri build

# Output: src-tauri/target/release/bundle/
```

---

## 📖 Documentation

### Essential Guides

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture and technical design |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Development guide and best practices |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | How to contribute to the project |
| **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** | Community guidelines |
| **[SECURITY.md](./SECURITY.md)** | Security policy and vulnerability reporting |
| **[ROADMAP.md](./ROADMAP.md)** | Feature roadmap and future plans |
| **[CLAUDE.md](./CLAUDE.md)** | AI assistant reference (for Claude Code) |

### Specialized Documentation

- **[TERMINAL_SYSTEM.md](./TERMINAL_SYSTEM.md)** — Comprehensive terminal documentation
- **[LSP.md](./LSP.md)** — Language Server Protocol integration
- **[MONACO_NAVIGATION_FEATURES.md](./MONACO_NAVIGATION_FEATURES.md)** — Monaco editor features
- **[AGENTS.md](./AGENTS.md)** — AI agent setup and configuration

---

## 🛠️ Technology Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend
- **React 19** — Modern UI framework
- **TypeScript** — Type-safe development
- **Monaco Editor** — VS Code's editor
- **Tailwind CSS v4** — Utility-first styling
- **Vite** — Lightning-fast build tool

</td>
<td valign="top" width="50%">

### Backend
- **Rust** — Systems programming
- **Tauri 2.0** — Desktop framework
- **portable-pty** — Terminal sessions
- **git2** — Native Git operations
- **tokio** — Async runtime

</td>
</tr>
</table>

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Whether you're fixing typos, adding features, or improving documentation, your help makes Rainy Aether better for everyone.

### How to Contribute

1. Read our **[Contributing Guide](./CONTRIBUTING.md)**
2. Check out **[Good First Issues](https://github.com/enosislabs/rainy-aether/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**
3. Fork the repository and create a feature branch
4. Make your changes and submit a pull request

### Areas We Need Help

- 🔌 Language Server integrations (rust-analyzer, Python LSP, Go LSP)
- 🌍 Internationalization and localization
- 🎨 Custom themes and icon packs
- 📦 Extension development
- 📝 Documentation and tutorials
- 🐛 Bug reports and testing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed guidelines.

---

## 🗺️ Roadmap

### Current Status (v0.1.0 — November 2025)

- ✅ Monaco Editor with TypeScript/JavaScript support
- ✅ Professional terminal with PTY backend
- ✅ Native Git integration
- ✅ File explorer and management
- ✅ Day/Night themes with full customization
- ✅ Diagnostics and Problems panel

### Next Milestones

| Version | Target | Features |
|---------|--------|----------|
| **v0.2.0** | Q4 2025 | Command palette, split views, workspace search |
| **v0.3.0** | Q4 2025 | Extension system, LSP integration |
| **v0.4.0** | Q4 2025 | AI chat, inline completions, multi-provider support |
| **v1.0.0** | Q2 2026 | Production-ready with full AI features |

See **[ROADMAP.md](./ROADMAP.md)** for the complete feature roadmap.

---

## 📄 License

**License terms are currently being finalized.** This project will **NOT** use MIT or Apache 2.0 licensing. Please check back for updates.

For commercial use or custom licensing inquiries, contact [Enosis Labs, Inc.](mailto:contact@enosislabs.com)

---

## 🙏 Acknowledgments

Rainy Aether is built on incredible open-source projects:

- 🦀 [Tauri](https://tauri.app/) — Desktop framework
- ⚛️ [React](https://reactjs.org/) — UI framework
- 📝 [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Code editor
- 🎨 [Tailwind CSS](https://tailwindcss.com/) — Styling
- 🦀 [Rust](https://www.rust-lang.org/) — Systems language
- 💻 [xterm.js](https://xtermjs.org/) — Terminal emulator

Special thanks to the teams behind VS Code, Cursor, and Windsurf for inspiring modern AI-first development.

---

## 📞 Community & Support

### Get Help

- 🐛 [Report Bugs](https://github.com/enosislabs/rainy-aether/issues)
- 💬 [Discussions](https://github.com/enosislabs/rainy-aether/discussions)
- 📖 [Documentation](./ARCHITECTURE.md)
- 🔐 [Security Issues](./SECURITY.md)

### Stay Connected

- ⭐ Star the repository to show support
- 👀 Watch for updates and releases
- 🐦 Follow [@EnosisLabs](https://twitter.com/enosislabsoff) on X (formerly Twitter)
- 💬 Join our Discord community *(coming soon)*

---

## 🌟 Support the Project

If Rainy Aether helps you code better, consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting** bugs and suggesting features
- 📝 **Contributing** code or documentation
- 📢 **Sharing** with fellow developers
- 💰 **Sponsoring** development *(GitHub Sponsors coming soon)*

---

<div align="center">

**Rainy Aether** — Bringing clarity to your development workflow, one drop at a time. 🌧️✨

**Built with ❤️ by [Enosis Labs, Inc.](https://enosislabs.com)**

[Get Started](#-quick-start) • [Documentation](#-documentation) • [Contribute](./CONTRIBUTING.md) • [Roadmap](./ROADMAP.md)

---

**Copyright © 2025 Enosis Labs, Inc. All rights reserved.**

</div>
