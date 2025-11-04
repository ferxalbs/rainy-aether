# Contributing to Rainy Aether

First off, thank you for considering contributing to Rainy Aether! 🎉

It's people like you that make Rainy Aether such a great tool for developers everywhere. We welcome contributions from everyone, regardless of their experience level.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@enosislabs.com](mailto:conduct@enosislabs.com).

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** v18+ with **pnpm** package manager
- **Rust** stable toolchain (via [rustup](https://rustup.rs/))
- **Git** for version control
- **Platform-specific tools**:
  - Windows: Visual Studio Build Tools 2022
  - macOS: Xcode Command Line Tools
  - Linux: See [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rainy-aether.git
   cd rainy-aether
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/enosislabs/rainy-aether.git
   ```
4. **Install dependencies**:
   ```bash
   pnpm install
   ```
5. **Run the development server**:
   ```bash
   pnpm tauri dev
   ```

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/enosislabs/rainy-aether/issues) to avoid duplicates.

When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots or GIFs** (if applicable)
- **Environment details**:
  - OS and version
  - Rainy Aether version
  - Relevant logs from developer console

**Use our bug report template** when creating issues.

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear, descriptive title**
- **Provide detailed description** of the proposed feature
- **Explain why this enhancement would be useful**
- **Include mockups or examples** (if applicable)
- **Consider implementation details** if you have ideas

### 📝 Improving Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or grammatical errors
- Adding missing information
- Creating tutorials or guides
- Improving code examples
- Translating documentation (future)

### 💻 Contributing Code

We love code contributions! Here are areas where we especially need help:

- **Good First Issues**: [Browse here](https://github.com/enosislabs/rainy-aether/labels/good%20first%20issue)
- **Language Server integrations** (rust-analyzer, Python LSP, Go LSP)
- **Extension development** (themes, linters, formatters)
- **Performance optimizations**
- **Cross-platform testing and bug fixes**
- **Accessibility improvements**

---

## Development Setup

### Project Structure

```
rainy-aether/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ide/           # IDE-specific components
│   │   └── ui/            # Reusable UI primitives
│   ├── stores/            # State management
│   ├── services/          # Business logic
│   ├── themes/            # Theme definitions
│   └── utils/             # Utility functions
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Tauri setup
│   │   ├── main.rs        # Entry point
│   │   ├── project_manager.rs
│   │   ├── terminal_manager.rs
│   │   └── git_manager.rs
│   └── Cargo.toml
├── public/                # Static assets
└── docs/                  # Documentation
```

### Development Commands

```bash
# Frontend development (browser only, no Tauri APIs)
pnpm dev

# Full desktop development (recommended)
pnpm tauri dev

# Type checking
pnpm tsc --noEmit

# Build for production
pnpm tauri build

# Rust commands (from src-tauri/)
cargo test          # Run tests
cargo fmt           # Format code
cargo clippy        # Lint code
cargo check         # Quick compile check
```

### Running Tests

```bash
# Frontend type checking
pnpm tsc --noEmit

# Rust tests
cd src-tauri
cargo test

# Rust linting
cd src-tauri
cargo clippy -- -D warnings
```

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions or fixes
- `chore/` — Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow our [style guidelines](#style-guidelines)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add awesome new feature"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub. See [Pull Request Process](#pull-request-process) below.

---

## Style Guidelines

### TypeScript/JavaScript

- **Use TypeScript** strictly — avoid `any` types
- **Functional components** with hooks (no class components)
- **Use ESLint** — fix all warnings
- **Path aliases**: Use `@/*` for imports (e.g., `@/components/ide/IDE`)
- **Naming**:
  - Components: `PascalCase` (e.g., `MonacoEditor.tsx`)
  - Files: `camelCase` (e.g., `editorStore.ts`)
  - Functions: `camelCase` (e.g., `getFileContent`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)

### React Components

```typescript
// Good
export function MyComponent({ title }: { title: string }) {
  const [state, setState] = useState<string>('');

  return (
    <div className="bg-background text-foreground">
      <h1>{title}</h1>
    </div>
  );
}

// Avoid
export default class MyComponent extends React.Component { ... }
```

### Styling

- **Use Tailwind CSS v4 only** — no inline styles
- **Use theme tokens**: `bg-background`, `text-foreground`, `border`, etc.
- **Never hard-code colors** — use CSS variables
- **Use `cn()` utility** for conditional classes:
  ```typescript
  import { cn } from '@/lib/cn';

  <div className={cn(
    'base-class',
    isActive && 'active-class',
    'another-class'
  )} />
  ```

### Rust

- **Follow standard Rust conventions**
- **Run `cargo fmt`** before committing
- **Fix all `cargo clippy` warnings**
- **Use `Result<T, String>` for Tauri commands**
- **Validate inputs** before file operations
- **Add documentation comments** for public APIs:
  ```rust
  /// Creates a new terminal session.
  ///
  /// # Arguments
  /// * `shell` - Optional shell executable path
  /// * `cwd` - Working directory for the terminal
  ///
  /// # Returns
  /// Terminal session ID on success
  #[tauri::command]
  pub fn terminal_create(shell: Option<String>, cwd: String) -> Result<String, String> {
      // Implementation
  }
  ```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build config)
- **ci**: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(editor): add split view support"

# Bug fix
git commit -m "fix(terminal): resolve PTY resize issue on Windows"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change terminal_create signature

BREAKING CHANGE: terminal_create now requires cols and rows parameters"
```

### Commit Message Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be ≤ 72 characters
- Reference issues and PRs when relevant (`Fixes #123`, `Closes #456`)

---

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   pnpm tsc --noEmit
   cd src-tauri && cargo test && cargo clippy
   ```
2. **Update documentation** if you've changed APIs
3. **Add tests** for new features
4. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Title and Description

- **Use conventional commit format** for PR title
- **Provide clear description** of changes
- **Reference related issues** (`Fixes #123`, `Related to #456`)
- **Include screenshots/GIFs** for UI changes
- **List breaking changes** if any

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **At least one maintainer review** required
3. **Address feedback** promptly and respectfully
4. **Squash commits** if requested
5. **Maintainers will merge** once approved

### After Merge

- **Delete your branch** (optional but recommended)
- **Update your fork**:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, and general discussion
- **Discord**: Real-time chat *(coming soon)*
- **Twitter**: [@EnosisLabs](https://twitter.com/enosislabs) *(coming soon)*

### Getting Help

If you need help:

1. Check the [documentation](./ARCHITECTURE.md)
2. Search [existing issues](https://github.com/enosislabs/rainy-aether/issues)
3. Ask in [GitHub Discussions](https://github.com/enosislabs/rainy-aether/discussions)
4. Reach out on Discord *(coming soon)*

### Recognition

Contributors are recognized in:

- Release notes
- [GitHub contributors page](https://github.com/enosislabs/rainy-aether/graphs/contributors)
- Special acknowledgments for significant contributions

---

## License

By contributing to Rainy Aether, you agree that your contributions will be licensed under the same license as the project (license terms TBD).

---

## Questions?

If you have questions about contributing, feel free to:

- Open a [Discussion](https://github.com/enosislabs/rainy-aether/discussions)
- Contact the maintainers: [contribute@enosislabs.com](mailto:contribute@enosislabs.com)

---

**Thank you for contributing to Rainy Aether!** 🌧️✨

Every contribution, no matter how small, helps make this project better for developers worldwide.

---

**Maintained by [Enosis Labs, Inc.](https://enosislabs.com)**

Last Updated: November 3, 2025
