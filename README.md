# Rainy Aether

A modern, lightweight desktop code editor built with Tauri, Rust, and React. Designed for developers who want a fast, extensible, and beautiful coding experience without the bloat of traditional IDEs.

![Rainy Aether](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)

## ✨ Features

- **Modern UI**: Built with React and Tailwind CSS v4 for a sleek, responsive interface
- **Monaco Editor**: Industry-standard VS Code editor with full IntelliSense support
- **LSP Integration**: Language Server Protocol support for advanced code intelligence
- **Multi-language Support**: TypeScript, JavaScript, HTML, CSS, JSON, Rust, Python, and more
- **File Explorer**: Efficient project tree navigation with lazy loading and optimized updates
- **Git Integration**: Native Git history, status tracking, and commit workflows
- **Terminal Integration**: Built-in PTY-backed terminal with Windows shell support
- **Theme System**: Unified day/night themes with system preference sync
- **Extensible**: Plugin architecture ready for extensions
- **Cross-platform**: Runs on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **pnpm** package manager
- **Rust** toolchain (stable)
- Platform-specific dependencies for Tauri 2.0

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/highinfedilety/rainy-aether-2.git
   cd rainy-aether-2
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run in development mode:
   ```bash
   # Frontend-only dev (fast iteration)
   pnpm dev

   # Full desktop app (recommended for complete experience)
   pnpm tauri dev
   ```

4. Build for production:
   ```bash
   pnpm tauri build
   ```

## 📖 Usage

### Development Modes

- **Frontend-only** (`pnpm dev`): Fast iteration on UI components. Note: Tauri APIs are not available.
- **Desktop app** (`pnpm tauri dev`): Full functionality with file system access, terminal, and Git integration.

### Key Shortcuts

- `Ctrl+O`: Quick open files
- `Ctrl+P`: Command palette
- `Ctrl+S`: Save current file
- `Ctrl+Shift+T`: Toggle terminal
- `Ctrl+Shift+E`: Toggle explorer
- `Ctrl+Shift+G`: Toggle Git panel

### Project Structure

```
src/
├── components/
│   ├── ide/          # Core IDE components
│   └── ui/           # Reusable UI primitives
├── stores/           # React state management
├── themes/           # Theme definitions
└── utils/            # Utility functions

src-tauri/
├── src/              # Rust backend code
└── capabilities/     # Tauri permissions
```

## 🛠️ Development

### Scripts

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build frontend for production
- `pnpm serve` - Preview built frontend
- `pnpm tauri dev` - Start Tauri development
- `pnpm tauri build` - Build desktop app bundles

### Code Style

- TypeScript strict mode
- PascalCase for components, camelCase for utilities
- Absolute imports via `@/*` alias
- Tailwind CSS with theme tokens (no hard-coded colors)

### Testing

```bash
# Type checking
pnpm tsc --noEmit

# Rust tests
cd src-tauri && cargo test

# Rust formatting
cd src-tauri && cargo fmt

# Rust linting
cd src-tauri && cargo clippy
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and ensure tests pass
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Use TypeScript strictly (avoid `any`)
- Test your changes thoroughly
- Update documentation for new features
- Ensure cross-platform compatibility

### Areas for Contribution

- External language server integrations (rust-analyzer, Python LSP, etc.)
- New language support for Monaco
- Additional Git workflows
- UI/UX improvements
- Performance optimizations
- Extension/plugin system development

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) for the desktop framework
- [React](https://reactjs.org/) for the UI framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the VS Code-powered editor
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) for language intelligence
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Rust](https://www.rust-lang.org/) for the backend

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/highinfedilety/rainy-aether-2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/highinfedilety/rainy-aether-2/discussions)
- **Documentation**: See [AGENTS.md](AGENTS.md) for detailed development setup

---

**Rainy Aether** - Bringing clarity to your coding experience, one drop at a time. 🌧️✨
