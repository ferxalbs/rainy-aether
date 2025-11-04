# Development Guide

This guide will help you set up your development environment and understand the development workflow for contributing to Rainy Aether.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Common Development Tasks](#common-development-tasks)
- [Testing](#testing)
- [Debugging](#debugging)
- [Build and Release](#build-and-release)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Prerequisites

### Required Software

#### Node.js and pnpm

```bash
# Install Node.js v18+ from https://nodejs.org/
node --version  # Should be v18.0.0 or higher

# Install pnpm globally
npm install -g pnpm
pnpm --version
```

#### Rust Toolchain

```bash
# Install Rust via rustup: https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version
cargo --version
```

#### Platform-Specific Dependencies

<details>
<summary><strong>Windows</strong></summary>

1. **Visual Studio Build Tools 2022** (required for Rust)
   - Download: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
   - Required workloads: "Desktop development with C++"

2. **WebView2** (usually pre-installed on Windows 10/11)
   - If needed: [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)

3. **Git for Windows** (optional but recommended)
   - Download: [Git for Windows](https://git-scm.com/download/win)

</details>

<details>
<summary><strong>macOS</strong></summary>

1. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

2. **Homebrew** (optional but recommended)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

</details>

<details>
<summary><strong>Linux</strong></summary>

**Debian/Ubuntu:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

**Arch Linux:**
```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg
```

</details>

### Recommended Tools

- **VS Code** or **Cursor** (with Rust and TypeScript extensions)
- **Rust Analyzer** extension for IDE support
- **Tauri CLI** (auto-installed via pnpm)
- **Git** for version control

---

## Getting Started

### 1. Clone the Repository

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rainy-aether.git
cd rainy-aether

# Add upstream remote
git remote add upstream https://github.com/enosislabs/rainy-aether.git

# Verify remotes
git remote -v
```

### 2. Install Dependencies

```bash
# Install JavaScript dependencies
pnpm install

# This also installs Tauri CLI automatically
```

### 3. Run Development Server

```bash
# Option 1: Full desktop development (recommended)
pnpm tauri dev

# Option 2: Frontend only (faster iteration, limited features)
pnpm dev
```

**When to use each:**
- **`pnpm tauri dev`**: Full Tauri environment, all APIs available
- **`pnpm dev`**: Fast frontend iteration, no file system/terminal/Git APIs

### 4. Verify Setup

After running `pnpm tauri dev`, you should see:
- Application window opens
- Monaco editor loads
- Terminal is functional
- File tree is visible
- No console errors

---

## Development Workflow

### Branch Strategy

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature

# Make changes...
git add .
git commit -m "feat: add my feature"

# Push to your fork
git push origin feature/my-feature

# Open PR on GitHub
```

### Daily Workflow

```bash
# Start your day
git checkout main
git pull upstream main
git checkout feature/my-feature
git rebase main  # Keep branch up-to-date

# Run dev server
pnpm tauri dev

# Make changes, test, commit
git add .
git commit -m "fix: resolve issue"

# Push changes
git push origin feature/my-feature
```

---

## Project Structure

```
rainy-aether/
├── src/                        # React frontend
│   ├── components/
│   │   ├── ide/               # IDE components
│   │   └── ui/                # Reusable components
│   ├── stores/                # State management
│   ├── services/              # Business logic
│   ├── themes/                # Theme definitions
│   ├── utils/                 # Utilities
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs             # Tauri setup
│   │   ├── main.rs            # Binary entry
│   │   ├── project_manager.rs # File operations
│   │   ├── terminal_manager.rs# PTY management
│   │   └── git_manager.rs     # Git integration
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri config
│
├── public/                     # Static assets
├── docs/                       # Documentation
├── .github/                    # GitHub workflows
│
├── package.json                # JavaScript deps
├── pnpm-lock.yaml              # Lock file
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
├── tailwind.config.js          # Tailwind config
└── README.md                   # Project readme
```

---

## Common Development Tasks

### Frontend Development

#### Add a New Component

```bash
# Create component file
touch src/components/ide/MyComponent.tsx
```

```tsx
// src/components/ide/MyComponent.tsx
import { cn } from '@/lib/cn';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="bg-background text-foreground p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Action
        </button>
      )}
    </div>
  );
}
```

#### Update a Store

```typescript
// src/stores/myStore.ts
import { useSyncExternalStore } from 'react';

type MyState = {
  count: number;
  message: string;
};

let state: MyState = {
  count: 0,
  message: 'Hello',
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export const myActions = {
  increment() {
    state = { ...state, count: state.count + 1 };
    notifyListeners();
  },
  setMessage(message: string) {
    state = { ...state, message };
    notifyListeners();
  },
};

export function useMyState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}
```

#### Call Tauri Command

```typescript
import { invoke } from '@tauri-apps/api/core';

// Call Rust function
async function loadProject(path: string) {
  try {
    const tree = await invoke<FileNode>('load_project_structure', { path });
    console.log('Project loaded:', tree);
  } catch (error) {
    console.error('Failed to load project:', error);
  }
}
```

### Backend Development

#### Add a Tauri Command

```rust
// src-tauri/src/my_manager.rs
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct MyData {
    pub id: String,
    pub value: i32,
}

#[tauri::command]
pub fn my_command(input: String) -> Result<MyData, String> {
    // Validate input
    if input.is_empty() {
        return Err("Input cannot be empty".into());
    }

    // Process
    let data = MyData {
        id: input,
        value: 42,
    };

    Ok(data)
}
```

```rust
// src-tauri/src/lib.rs
mod my_manager;
use my_manager::my_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            my_command,  // Add your command here
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### Emit Events from Rust

```rust
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn my_command(app: AppHandle) -> Result<(), String> {
    // Do work...

    // Emit event
    app.emit("my-event", Some("payload data"))
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}
```

Listen in frontend:

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<string>('my-event', (event) => {
  console.log('Received:', event.payload);
});

// Clean up
unlisten();
```

### Working with Themes

```typescript
// src/themes/index.ts
import { hexToHslStr } from './utils';

export const myCustomTheme: Theme = {
  name: 'My Theme',
  colors: {
    background: hexToHslStr('#1e1e1e'),
    foreground: hexToHslStr('#d4d4d4'),
    primary: hexToHslStr('#007acc'),
    // ... all required colors
  },
};

// Add to themes array
export const themes: Theme[] = [
  dayTheme,
  nightTheme,
  myCustomTheme,
];
```

---

## Testing

### Type Checking

```bash
# Check TypeScript types
pnpm tsc --noEmit

# Watch mode
pnpm tsc --noEmit --watch
```

### Rust Tests

```bash
# Run all tests
cd src-tauri
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

### Rust Linting

```bash
cd src-tauri

# Check for common mistakes
cargo clippy

# Fail on warnings (CI)
cargo clippy -- -D warnings

# Format code
cargo fmt

# Check formatting (CI)
cargo fmt --check
```

### Manual Testing

**Checklist for new features:**

- [ ] Test on Windows
- [ ] Test on macOS (if possible)
- [ ] Test on Linux (if possible)
- [ ] Test with Day and Night themes
- [ ] Test keyboard shortcuts
- [ ] Test error cases
- [ ] Check console for warnings
- [ ] Verify no memory leaks (DevTools)

---

## Debugging

### Frontend Debugging

#### Open DevTools

- **Windows/Linux**: `Ctrl+Shift+I` or `F12`
- **macOS**: `Cmd+Option+I`

#### Console Logging

```typescript
console.log('Debug info:', data);
console.error('Error occurred:', error);
console.table(arrayOfObjects);  // Nice table view
```

#### React DevTools

Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension (works in Tauri WebView on some platforms).

### Backend Debugging

#### Print Debugging

```rust
println!("Debug: value = {:?}", value);
eprintln!("Error: {}", error);
```

#### Rust Debugger

**VS Code with CodeLLDB extension:**

1. Install "CodeLLDB" extension
2. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Tauri",
      "cargo": {
        "args": [
          "build",
          "--manifest-path=./src-tauri/Cargo.toml"
        ]
      },
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

3. Set breakpoints and press F5

#### Tauri Logs

Check Tauri logs in the console (stdout/stderr from Rust process).

---

## Build and Release

### Development Build

```bash
# Full desktop build (debug mode)
pnpm tauri build --debug
```

### Production Build

```bash
# Optimized production build
pnpm tauri build

# Output locations:
# - Windows: src-tauri/target/release/bundle/nsis/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/deb/ (or appimage/)
```

### Build Optimization

```bash
# Rust release profile (src-tauri/Cargo.toml)
[profile.release]
opt-level = 3          # Maximum optimization
lto = true             # Link-time optimization
codegen-units = 1      # Single codegen unit (slower build, faster runtime)
strip = true           # Strip debug symbols
```

### Bundle Configuration

Edit `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "identifier": "com.enosislabs.rainy-aether",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256"
    },
    "macOS": {
      "minimumSystemVersion": "10.13"
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### "Tauri APIs not working"

**Solution**: Ensure you're running `pnpm tauri dev`, not `pnpm dev`.

#### "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

#### "Cargo build failed"

```bash
# Update Rust toolchain
rustup update stable

# Clean build artifacts
cd src-tauri
cargo clean
cargo build
```

#### Port conflicts (Vite dev server)

```bash
# Use different port
pnpm dev --port 1421

# Update tauri.conf.json
"devUrl": "http://localhost:1421"
```

#### Monaco editor not loading

Check console for errors. Common causes:
- Worker configuration incorrect
- Path aliases not resolving
- Missing Monaco dependencies

#### Terminal not working on Windows

- Ensure Visual Studio Build Tools installed
- Check PTY permissions
- Try running as Administrator (development only)

#### Git operations failing

- Verify repository is valid (`git status` in terminal)
- Check file permissions
- Ensure `git2` crate compiled correctly

### Getting Help

If you're stuck:

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
2. Search [GitHub Issues](https://github.com/enosislabs/rainy-aether/issues)
3. Ask in [GitHub Discussions](https://github.com/enosislabs/rainy-aether/discussions)
4. Review [Tauri Documentation](https://tauri.app/v2/guides/)

---

## Best Practices

### Code Style

#### TypeScript

```typescript
// ✅ Good
export function MyComponent({ title }: Props) {
  const [state, setState] = useState<string>('');
  return <div>{title}</div>;
}

// ❌ Avoid
export default class MyComponent extends React.Component { ... }
```

#### Rust

```rust
// ✅ Good
#[tauri::command]
pub fn my_command(input: String) -> Result<Data, String> {
    validate_input(&input)?;
    process_data(input)
}

// ❌ Avoid
#[tauri::command]
pub fn my_command(input: String) -> Data {
    process_data(input)  // No error handling!
}
```

### Performance

- **Debounce** user input (search, resize)
- **Memoize** expensive computations
- **Lazy load** heavy components
- **Virtual scroll** for long lists
- **Batch** Tauri commands when possible

### Security

- **Validate** all inputs in Rust
- **Sanitize** file paths (check for `..`)
- **Use** Result types for error handling
- **Never** trust data from frontend
- **Encrypt** sensitive data (API keys)

### Git Workflow

```bash
# Commit often with clear messages
git commit -m "feat(editor): add split view support"

# Keep commits atomic (one logical change per commit)
# Rebase before PR to clean up history
git rebase -i HEAD~3

# Write descriptive PR descriptions
# Reference issues: "Fixes #123"
```

---

## Additional Resources

- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Technical architecture
- **[Tauri Documentation](https://tauri.app/)**: Official Tauri docs
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)**: Editor API docs
- **[Rust Book](https://doc.rust-lang.org/book/)**: Learn Rust
- **[React Docs](https://react.dev/)**: React documentation

---

**Happy Coding!** 🌧️✨

If you have questions or suggestions for improving this guide, please open an issue or discussion on GitHub.

---

**Maintained by [Enosis Labs, Inc.](https://enosislabs.com)**

Last Updated: November 3, 2025
