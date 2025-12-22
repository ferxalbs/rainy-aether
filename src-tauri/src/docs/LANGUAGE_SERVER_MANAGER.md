# Language Server Manager

## Purpose

This module (`language_server_manager.rs`) provides the Rust backend for managing external **Language Server Protocol (LSP)** servers. While Monaco Editor handles TypeScript/JavaScript natively with its excellent built-in language service, this infrastructure enables support for **additional programming languages**.

## When to Use This

Use this LSP manager for languages **not supported by Monaco's built-in services**:

| Language | LSP Server | Status |
|----------|------------|--------|
| Rust | `rust-analyzer` | Ready to integrate |
| Python | `pylsp` / `pyright` | Ready to integrate |
| Go | `gopls` | Ready to integrate |
| C/C++ | `clangd` | Ready to integrate |
| Java | `jdtls` | Ready to integrate |

## Why Monaco for TypeScript/JavaScript?

Monaco Editor includes the **same TypeScript language service used in VS Code**. It provides:
- Full semantic analysis
- IntelliSense/autocomplete  
- Error detection
- Go to definition
- (All without spawning external processes)

This is why we don't spawn `typescript-language-server` externally.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Monaco Editor        │  ConnectionManager.ts               │
│  ┌─────────────────┐  │  ┌─────────────────────────────┐    │
│  │ Built-in TS/JS  │  │  │ LSP Client for other langs  │    │
│  │ Language Service│  │  │ (calls Tauri invoke)        │    │
│  └─────────────────┘  │  └─────────────────────────────┘    │
└───────────────────────┼─────────────────────────────────────┘
                        │ Tauri IPC
┌───────────────────────┼─────────────────────────────────────┐
│                       ▼                                      │
│            language_server_manager.rs                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Spawns external LSP processes                        │ │
│  │ • Handles stdin/stdout communication                   │ │
│  │ • Cross-platform command resolution (Windows .cmd)     │ │
│  │ • Error recovery and statistics                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────────────┐ │
│    │  rust-analyzer  │  pylsp  │  gopls  │  clangd  │ ... │ │
│    └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                     Rust Backend (Tauri)
```

## Key Features

- **Atomic session ID generation** - Thread-safe unique identifiers
- **Cross-platform support** - Windows `.cmd` extension handling
- **Graceful shutdown** - 5-second timeout before force kill
- **Statistics tracking** - Messages sent/received, error counts
- **Error recovery** - Mutex poisoning recovery, detailed error types

## Future Integration

To add a new language server:

```rust
// In frontend (lspService.ts):
await service.registerServer({
  id: 'rust',
  name: 'Rust Analyzer',
  languages: ['rs'],
  command: 'rust-analyzer',
  args: [],
});
```

The backend will handle spawning, communication, and lifecycle.
