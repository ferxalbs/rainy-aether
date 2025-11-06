# Extension System Implementation Plan

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Extension Compatibility Matrix](#extension-compatibility-matrix)
6. [Technical Challenges](#technical-challenges)
7. [Recommended Approach](#recommended-approach)
8. [Resource Requirements](#resource-requirements)
9. [Success Metrics](#success-metrics)
10. [References](#references)

---

## Executive Summary

The Rainy Aether extension system is currently **partially functional**. Users can browse, download, and install extensions from Open VSX, but **extensions do not actually execute or provide functionality** in the editor. This document outlines the path to full VS Code extension compatibility.

### Current Capabilities
- ✅ Extension marketplace browsing and search
- ✅ Extension download and installation
- ✅ Extension lifecycle management (install/uninstall/enable/disable)
- ✅ Static extension contributions (themes, snippets)
- ✅ Robust error handling and state recovery

### Missing Capabilities
- ❌ Extension code execution
- ❌ Language Server Protocol (LSP) integration
- ❌ TextMate grammar syntax highlighting
- ❌ VS Code Extension API compatibility
- ❌ Command system and keybindings
- ❌ Debug Adapter Protocol (DAP)

---

## Current State Analysis

### What's Working

#### 1. Extension Infrastructure (100%)
**Location:** `src/services/extensionManager.ts`, `src-tauri/src/extension_manager.rs`

**Capabilities:**
- Full extension lifecycle management
- Installation timeout protection (5 minutes)
- Auto-recovery from stuck states on restart
- Force deletion for problematic extensions
- Health monitoring and metrics
- Extension dependency resolution
- Persistent storage with JSON serialization

**Security:**
- All file operations restricted to `extensions/` folder
- Path validation and sanitization
- Safe VSIX extraction with error handling

#### 2. Open VSX Integration (100%)
**Location:** `src/services/openVSXRegistry.ts`

**Capabilities:**
- Native Open VSX API integration
- Extension search with filtering and pagination
- Complete extension metadata retrieval
- Download count and rating display
- Compatibility validation
- Caching with 5-minute expiry
- Retry logic with exponential backoff

**API Endpoints:**
- Search: `https://open-vsx.org/api/-/search`
- Download: `https://open-vsx.org/vscode/asset/{publisher}/{name}/{version}`
- Manifest: `https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}`

#### 3. UI/UX (100%)
**Location:** `src/components/ide/ExtensionMarketplace.tsx`, `src/components/ide/ExtensionManager.tsx`

**Features:**
- Extension marketplace with grid layout
- Real-time search with 300ms debounce
- Category filtering
- Installation state indicators
- Compatibility warnings and scores
- "Clean Up All" batch operations
- Health score visualization
- Visual indicators for stuck/error states

#### 4. Monaco Extension Host (30%)
**Location:** `src/services/monacoExtensionHost.ts`

**Implemented:**
- Extension loading infrastructure
- Language registration (file extensions, MIME types)
- Language configuration (brackets, comments, indentation)
- Theme registration and application
- Snippet completion providers
- Disposable resource management

**Not Implemented:**
- TextMate grammar loading
- Extension code execution
- VS Code API shims
- Command registration
- Language Server Protocol client
- Debug Adapter Protocol client

### What's NOT Working

#### 1. Language Intelligence (0%)
**Impact:** HIGH - This is the core value proposition of extensions

**Missing Components:**

**a) Language Server Protocol (LSP) Client**
- No LSP client implementation
- No WebSocket or Worker-based communication
- No message routing (request/response/notification)
- No workspace file system abstraction
- No LSP feature providers for Monaco

**Required for:**
- IntelliSense / Auto-completion
- Go to Definition / Peek Definition
- Find All References / Find Implementations
- Hover documentation
- Code formatting
- Rename symbol
- Code actions (quick fixes)
- Diagnostics (errors, warnings)

**Popular Extensions That Won't Work:**
- `ms-python.python` (Python IntelliSense)
- `rust-lang.rust-analyzer` (Rust IntelliSense)
- `golang.go` (Go IntelliSense)
- `redhat.java` (Java IntelliSense)
- `ms-vscode.cpptools` (C++ IntelliSense)

#### 2. Syntax Highlighting (0%)
**Impact:** HIGH - Makes code unreadable without colors

**Problem:** Monaco doesn't support TextMate grammars natively.

**Technical Details:**
- VS Code extensions use TextMate grammars (`.tmLanguage.json`)
- TextMate uses Oniguruma regular expressions (WASM required)
- Monaco uses Monarch tokenizers (different format)
- No automatic conversion exists

**Required Libraries:**
- `vscode-textmate` - TextMate grammar parser
- `vscode-oniguruma` - WASM Oniguruma regex engine
- Integration with Monaco's tokenization system

**Example Extensions:**
- Any language extension provides TextMate grammars
- `zhuangtongfa.material-theme` (depends on grammar tokens)

#### 3. Extension Code Execution (0%)
**Impact:** HIGH - Prevents any dynamic functionality

**Problem:** Extensions have a `main` entry point (JavaScript/TypeScript) that needs to run.

**Technical Challenges:**

**a) Security Sandbox**
- Extensions are untrusted code
- Need Web Worker isolation
- File system access must be controlled
- Network access must be limited

**b) VS Code API Compatibility**
- Extensions expect `vscode` module to exist
- Need to implement ~200 API endpoints
- API surface is massive and complex

**c) Module System**
- Extensions use CommonJS (`require()`)
- Need module loader (like SystemJS)
- Need to resolve dependencies
- Handle circular dependencies

**d) Activation Events**
- Extensions activate on specific triggers
- Need to parse `activationEvents` from manifest
- Implement event system to trigger activation

#### 4. Command System (0%)
**Impact:** MEDIUM - Prevents user interaction with extensions

**Missing:**
- Command registry (keybinding -> function)
- Command palette integration
- Context menu integration
- Keyboard shortcut system
- When-clause evaluation (command enablement)

**Example:**
```typescript
vscode.commands.registerCommand('extension.helloWorld', () => {
  vscode.window.showInformationMessage('Hello World!');
});
```

#### 5. Debug Adapter Protocol (0%)
**Impact:** MEDIUM - No debugging support

**Missing:**
- DAP client implementation
- Debug session management
- Breakpoint synchronization
- Debug console integration
- Variable inspection UI

---

## Technical Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌─────────────────────┐  ┌──────────────────────────┐     │
│  │ ExtensionMarketplace│  │   ExtensionManager      │     │
│  └─────────────────────┘  └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐ │
│  │ openVSXRegistry  │  │ extensionManager │  │  Monaco  │ │
│  │                  │  │                  │  │Extension │ │
│  │  - Search API    │  │  - Lifecycle     │  │   Host   │ │
│  │  - Download      │  │  - State mgmt    │  │          │ │
│  │  - Caching       │  │  - Health        │  │ (Partial)│ │
│  └──────────────────┘  └──────────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            extension_manager.rs                        │ │
│  │  - extract_extension()    - read_extension_file()     │ │
│  │  - remove_directory()     - list_extension_files()    │ │
│  │  - save/load extensions                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    File System                               │
│  {app_data}/extensions/{publisher}/{name}/{version}/        │
│    ├── extension/                                           │
│    │   ├── package.json    (manifest)                      │
│    │   ├── extension.js    (main code - NOT EXECUTED)     │
│    │   └── ...                                              │
│    └── ...                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Full Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │Marketplace│  │ Manager  │  │ Command  │  │  Debug    │ │
│  │           │  │          │  │ Palette  │  │   UI      │ │
│  └───────────┘  └──────────┘  └──────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐ │
│  │  VSX     │  │ Extension │  │  Monaco  │  │  Command  │ │
│  │ Registry │  │  Manager  │  │Extension │  │  System   │ │
│  │          │  │           │  │   Host   │  │           │ │
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│              Extension Runtime (NEW)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Extension Sandbox (Web Worker)                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ VS Code API  │  │   Module     │  │   TextMate   │ │ │
│  │  │    Shims     │  │   Loader     │  │   Grammar    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│          Language Server Protocol (NEW)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              LSP Client (TypeScript)                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  JSON-RPC    │  │  WebSocket   │  │    Monaco    │ │ │
│  │  │   Router     │  │   Client     │  │  Integration │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│         Language Server Manager (Tauri/Rust) (NEW)          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Download & install language servers                │ │
│  │  - Start/stop processes                               │ │
│  │  - stdio/WebSocket bridges                            │ │
│  │  - Health monitoring                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation - TextMate Grammars (1-2 weeks)

**Goal:** Enable syntax highlighting for extension-provided languages

**Priority:** HIGH
**Effort:** MEDIUM
**Value:** HIGH

#### Tasks

1. **Add TextMate Dependencies** (1 day)
   ```bash
   pnpm add vscode-textmate vscode-oniguruma
   ```

2. **Create TextMate Service** (2 days)
   - File: `src/services/textmate/TextMateService.ts`
   - Load WASM Oniguruma
   - Parse TextMate grammars
   - Create grammar registry

3. **Integrate with Monaco** (2 days)
   - File: `src/services/textmate/MonacoTextMateTokenizer.ts`
   - Create Monaco token provider from TextMate
   - Register tokenizer with Monaco languages
   - Map TextMate scopes to Monaco tokens

4. **Update Extension Host** (1 day)
   - File: `src/services/monacoExtensionHost.ts`
   - Implement `loadGrammars()` method
   - Load grammar files from extension directory
   - Register with TextMate service

5. **Theme Integration** (2 days)
   - Parse VS Code theme files
   - Map TextMate scopes to colors
   - Update Monaco theme definitions

6. **Testing** (1 day)
   - Test with popular languages (Python, Rust, Go)
   - Verify syntax highlighting accuracy
   - Test theme compatibility

#### Success Criteria
- ✅ 50+ languages have syntax highlighting
- ✅ Themes display colors correctly
- ✅ Performance: <100ms grammar load time
- ✅ No console errors during tokenization

#### Files to Create
```
src/services/textmate/
├── TextMateService.ts
├── MonacoTextMateTokenizer.ts
├── grammarRegistry.ts
└── types.ts
```

#### Code Example
```typescript
// TextMateService.ts
import { Registry, IGrammar } from 'vscode-textmate';
import { loadWASM } from 'vscode-oniguruma';

export class TextMateService {
  private registry: Registry;
  private grammars: Map<string, IGrammar> = new Map();

  async initialize() {
    // Load Oniguruma WASM
    await loadWASM(/* ... */);

    this.registry = new Registry({
      onigLib: Promise.resolve({
        createOnigScanner: (sources) => /* ... */,
        createOnigString: (str) => /* ... */
      }),
      loadGrammar: async (scopeName) => {
        // Load from extension
        const grammarPath = this.resolveGrammarPath(scopeName);
        const grammarJson = await invoke('read_extension_file', { path: grammarPath });
        return JSON.parse(grammarJson);
      }
    });
  }
}
```

---

### Phase 2: Extension Code Execution (2-3 weeks)

**Goal:** Enable extensions to run JavaScript code in a sandbox

**Priority:** HIGH
**Effort:** HIGH
**Value:** MEDIUM (foundation for Phase 3)

#### Tasks

1. **Extension Sandbox Infrastructure** (3 days)
   - Create Web Worker-based sandbox
   - Implement message passing protocol
   - Add error handling and isolation

2. **Module Loader** (3 days)
   - Implement CommonJS require()
   - Handle module resolution
   - Support circular dependencies
   - Cache loaded modules

3. **VS Code API Shims (Basic)** (4 days)
   - `vscode.window.showInformationMessage()`
   - `vscode.window.showErrorMessage()`
   - `vscode.workspace.fs` (basic file operations)
   - `vscode.Uri`
   - `vscode.Disposable`

4. **Activation System** (2 days)
   - Parse `activationEvents` from manifest
   - Implement activation triggers
   - Handle async activation
   - Deactivation on disable/uninstall

5. **Extension Context** (2 days)
   - Create extension context object
   - Manage subscriptions
   - Global and workspace state
   - Extension storage path

6. **Testing & Debugging** (2 days)
   - Test with simple extensions
   - Add comprehensive logging
   - Error boundary implementation

#### Success Criteria
- ✅ Extensions can execute main entry point
- ✅ Basic VS Code API calls work
- ✅ Extensions can be activated/deactivated
- ✅ Errors are caught and reported
- ✅ Memory leaks are prevented

#### Files to Create
```
src/services/extension/
├── ExtensionSandbox.ts
├── ModuleLoader.ts
├── VSCodeAPIShim.ts
├── ActivationManager.ts
└── ExtensionContext.ts
```

---

### Phase 3: Language Server Protocol (4-6 weeks)

**Goal:** Enable IntelliSense, diagnostics, and code navigation

**Priority:** CRITICAL
**Effort:** VERY HIGH
**Value:** VERY HIGH

#### Sub-Phase 3.1: LSP Client (2 weeks)

1. **JSON-RPC Infrastructure** (3 days)
   - Implement JSON-RPC 2.0 protocol
   - Message routing (request/response/notification)
   - Request cancellation support
   - Error handling

2. **LSP Client Core** (4 days)
   - Connection management (WebSocket/Worker)
   - Capability negotiation
   - Initialize/shutdown protocol
   - Document synchronization

3. **Monaco Integration** (4 days)
   - Completion provider
   - Hover provider
   - Definition provider
   - Reference provider
   - Diagnostic display
   - Code action provider
   - Rename provider
   - Formatting provider

4. **Workspace Abstraction** (3 days)
   - File system interface
   - Document change tracking
   - Configuration management

#### Sub-Phase 3.2: Language Server Manager (2 weeks)

1. **Rust Backend (Tauri)** (5 days)
   - Language server download/install
   - Process management (start/stop)
   - stdio <-> WebSocket bridge
   - Health monitoring
   - Auto-restart on crash

2. **Language Server Registry** (3 days)
   - Catalog of available servers
   - Installation scripts
   - Version management
   - Platform-specific binaries

3. **Configuration UI** (2 days)
   - Server installation status
   - Manual start/stop controls
   - Log viewer
   - Settings integration

#### Sub-Phase 3.3: Language Servers (2 weeks)

**Priority Languages:**

1. **TypeScript/JavaScript** (Already built-in to Monaco)
   - No additional work needed

2. **Python** (2 days)
   - Server: `pylsp` or `pyright`
   - Download: npm package or pip
   - Configuration: Python path, venv support

3. **Rust** (2 days)
   - Server: `rust-analyzer`
   - Download: GitHub releases
   - Configuration: cargo path, project discovery

4. **Go** (2 days)
   - Server: `gopls`
   - Download: Go install
   - Configuration: GOPATH, modules

5. **Java** (3 days - more complex)
   - Server: `jdtls`
   - Download: Eclipse project
   - Configuration: JDK path, Maven/Gradle

#### Success Criteria
- ✅ LSP protocol fully implemented
- ✅ 3-5 language servers working
- ✅ IntelliSense appears within 500ms
- ✅ Diagnostics update in real-time
- ✅ All Monaco providers connected
- ✅ Server crashes handled gracefully

#### Files to Create
```
src/services/lsp/
├── LSPClient.ts
├── JSONRPCProtocol.ts
├── MonacoProviders.ts
├── WorkspaceFS.ts
└── types.ts

src-tauri/src/
├── language_server_manager.rs
├── process_manager.rs
└── stdio_bridge.rs

src/config/
└── language-servers.json
```

#### Code Example
```typescript
// LSPClient.ts
export class LSPClient {
  async initialize(options: InitializeParams) {
    const response = await this.sendRequest('initialize', options);
    // Negotiate capabilities
    this.capabilities = response.capabilities;

    // Notify server initialization complete
    await this.sendNotification('initialized', {});
  }

  async completion(uri: string, position: Position): Promise<CompletionItem[]> {
    const response = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position
    });
    return response.items || [];
  }
}
```

---

### Phase 4: Command System (1-2 weeks)

**Goal:** Enable extensions to register commands and shortcuts

**Priority:** MEDIUM
**Effort:** MEDIUM
**Value:** MEDIUM

#### Tasks

1. **Command Registry** (2 days)
   - Command registration API
   - Command execution
   - Command arguments
   - Undo/redo support

2. **Keyboard Shortcuts** (2 days)
   - Keybinding parser
   - Keyboard event handling
   - Conflict resolution
   - Platform-specific mappings

3. **Command Palette** (3 days)
   - UI component
   - Fuzzy search
   - Recent commands
   - Category grouping

4. **Context Menus** (2 days)
   - Editor context menu
   - Explorer context menu
   - Dynamic menu items
   - Separator support

5. **When Clauses** (2 days)
   - Context evaluation
   - Built-in contexts (language, resource, view)
   - Extension-defined contexts

#### Success Criteria
- ✅ Extensions can register commands
- ✅ Command palette shows all commands
- ✅ Keyboard shortcuts work
- ✅ Context menus display dynamically
- ✅ When clauses evaluated correctly

---

### Phase 5: Advanced Features (4-6 weeks)

**Goal:** Full VS Code compatibility

**Priority:** LOW
**Effort:** VERY HIGH
**Value:** MEDIUM

#### Features

1. **Debug Adapter Protocol (DAP)** (2 weeks)
   - DAP client implementation
   - Debug session UI
   - Breakpoint management
   - Variable inspection
   - Debug console

2. **Task System** (1 week)
   - Task definition
   - Task execution
   - Problem matchers
   - Output panel integration

3. **TreeView API** (1 week)
   - Custom sidebar panels
   - Tree data provider
   - Item rendering
   - Context menus

4. **Webview API** (2 weeks)
   - Iframe-based webviews
   - Message passing
   - State persistence
   - Security sandbox

5. **SCM API** (1 week)
   - Source control providers
   - Change tracking
   - Commit UI
   - Diff viewer

---

## Extension Compatibility Matrix

| Extension Type | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|----------------|---------|---------|---------|---------|---------|
| **Themes** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Snippets** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Language (static)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Language (LSP)** | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| **Formatters** | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| **Linters** | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| **Commands** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Debuggers** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **SCM Providers** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **TreeViews** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Webviews** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ Fully working
- ⚠️ Partially working
- ❌ Not working

---

## Technical Challenges

### Challenge 1: VS Code API Surface Area

**Problem:** VS Code has ~200 API endpoints across 20+ namespaces.

**Examples:**
- `vscode.window` (27 methods)
- `vscode.workspace` (35 methods)
- `vscode.languages` (22 methods)
- `vscode.commands` (8 methods)
- `vscode.debug` (15 methods)
- `vscode.scm` (10 methods)

**Solution:**
- Implement incrementally, starting with most-used APIs
- Create API compatibility matrix
- Version API by extension requirements
- Use Proxy objects for unimplemented methods (log warnings)

### Challenge 2: Browser Limitations

**Problem:** VS Code extensions expect Node.js APIs.

**Missing APIs:**
- `fs` (file system)
- `path` (path manipulation)
- `child_process` (spawn processes)
- `crypto` (cryptography)
- `os` (operating system info)

**Solution:**
- Polyfill common APIs (`path`, basic `fs`)
- Proxy file operations through Tauri
- Block dangerous operations (`child_process`)
- Document limitations clearly

### Challenge 3: WebAssembly Performance

**Problem:** TextMate grammars use Oniguruma (WASM), which has overhead.

**Impact:**
- Initial load: 50-100ms
- Per-line tokenization: 1-5ms
- Large files (>1000 lines): noticeable lag

**Solution:**
- Lazy load grammars (only when needed)
- Cache tokenization results
- Use Web Workers for tokenization
- Implement incremental tokenization
- Consider streaming tokenization for large files

### Challenge 4: Language Server Binary Distribution

**Problem:** Need to download and manage language server binaries.

**Challenges:**
- Platform-specific binaries (Windows, macOS, Linux)
- Architecture variants (x64, ARM)
- Version management
- Dependency resolution (Python, Node.js, JVM)
- Security (verify signatures)

**Solution:**
- Use Open VSX's language server registry
- Download on-demand (lazy installation)
- Store in `{app_data}/language-servers/`
- Version locking with semver
- Digital signature verification
- Fallback to system-installed servers

### Challenge 5: Memory Management

**Problem:** Extensions can leak memory, especially with large workspaces.

**Risks:**
- Monaco models accumulating
- LSP clients not closing
- Event listeners not disposed
- TextMate grammar cache growing unbounded

**Solution:**
- Strict disposable pattern enforcement
- Resource tracking per extension
- Memory limits per extension
- Automatic cleanup on disable/uninstall
- Periodic garbage collection hints

---

## Recommended Approach

### Short-Term (Next 2 weeks)

**Goal:** Make installed extensions immediately useful

**Priority 1: TextMate Grammars (Phase 1)**
- **Effort:** 1-2 weeks
- **Value:** HIGH
- **Risk:** LOW

**Benefits:**
- Syntax highlighting for 50+ languages
- Better theme compatibility
- Immediate visual improvement
- Low implementation risk

**Deliverables:**
- Working syntax highlighting
- Theme integration
- Documentation

### Medium-Term (Next 2 months)

**Goal:** Enable language intelligence

**Priority 2: LSP Infrastructure (Phase 3)**
- **Effort:** 4-6 weeks
- **Value:** VERY HIGH
- **Risk:** MEDIUM

**Focus Languages:**
1. Python (most popular)
2. Rust (strategic importance)
3. Go (developer productivity)

**Benefits:**
- Real IntelliSense
- Error diagnostics
- Code navigation
- Competitive with VS Code for core languages

**Deliverables:**
- Working LSP client
- 3 language servers integrated
- Documentation and troubleshooting guide

### Long-Term (Next 6 months)

**Goal:** Full VS Code extension compatibility

**Priority 3: Extension Code Execution (Phase 2)**
- **Effort:** 2-3 weeks
- **Value:** MEDIUM
- **Risk:** MEDIUM

**Priority 4: Command System (Phase 4)**
- **Effort:** 1-2 weeks
- **Value:** MEDIUM
- **Risk:** LOW

**Priority 5: Advanced Features (Phase 5)**
- **Effort:** 4-6 weeks
- **Value:** MEDIUM
- **Risk:** HIGH

### Alternative: Incremental Approach

**Month 1-2:** TextMate + Basic Extension Execution
- Syntax highlighting working
- Simple extensions can execute
- Minimal VS Code API shims

**Month 3-4:** LSP for Python + TypeScript
- Focus on 2 languages deeply
- Production-quality implementation
- Great user experience

**Month 5-6:** Expand Language Support
- Add Rust, Go, Java
- Improve LSP stability
- Add LSP features (formatting, refactoring)

**Month 7-12:** Advanced Features
- Commands and keybindings
- Debug adapter protocol
- Task system
- Full VS Code API coverage

---

## Resource Requirements

### Development Team

**Core Team (Required):**
- 1 Senior Frontend Engineer (TypeScript, React, Monaco)
- 1 Senior Backend Engineer (Rust, Tauri, LSP)
- 1 DevOps/Release Engineer (CI/CD, packaging)

**Extended Team (Recommended):**
- 1 UI/UX Designer (extension UX, command palette)
- 1 QA Engineer (testing, automation)
- 1 Technical Writer (documentation)

### Time Estimates

| Phase | Effort | Calendar Time (1 dev) | Calendar Time (2 devs) |
|-------|--------|----------------------|------------------------|
| Phase 1: TextMate | 1-2 weeks | 2 weeks | 1 week |
| Phase 2: Extension Execution | 2-3 weeks | 3 weeks | 2 weeks |
| Phase 3: LSP | 4-6 weeks | 6 weeks | 3 weeks |
| Phase 4: Commands | 1-2 weeks | 2 weeks | 1 week |
| Phase 5: Advanced | 4-6 weeks | 6 weeks | 4 weeks |
| **Total** | **12-19 weeks** | **19 weeks** | **11 weeks** |

### Infrastructure

**Required:**
- CI/CD pipeline for testing across platforms
- Automated extension testing framework
- Language server binary distribution (CDN or GitHub Releases)
- Monitoring and error tracking (Sentry, LogRocket)

**Optional:**
- Extension marketplace analytics
- Telemetry for feature usage
- A/B testing infrastructure

---

## Success Metrics

### Phase 1 Success (TextMate)
- ✅ 50+ languages have syntax highlighting
- ✅ <100ms grammar load time
- ✅ Zero tokenization errors in console
- ✅ Theme colors match VS Code

### Phase 3 Success (LSP)
- ✅ 3+ language servers working
- ✅ IntelliSense appears within 500ms
- ✅ 95%+ uptime for language servers
- ✅ <5% CPU usage when idle
- ✅ Diagnostics update within 1 second

### Overall Success
- ✅ 80% of top 100 extensions compatible
- ✅ 90% user satisfaction rating
- ✅ <1% crash rate
- ✅ Feature parity with VS Code for top 5 languages

### User Feedback Metrics
- Extension installation rate
- Extension enable/disable rate
- Time to first IntelliSense result
- Diagnostic accuracy (false positive rate)
- User-reported bugs per phase

---

## References

### Official Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [Open VSX Registry API](https://github.com/eclipse/openvsx/wiki/Registry-API)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)

### Key Libraries
- [vscode-textmate](https://github.com/microsoft/vscode-textmate) - TextMate grammar support
- [vscode-oniguruma](https://github.com/microsoft/vscode-oniguruma) - Oniguruma WASM
- [vscode-languageserver-protocol](https://github.com/microsoft/vscode-languageserver-node) - LSP types
- [monaco-languageclient](https://github.com/TypeFox/monaco-languageclient) - LSP client for Monaco
- [vscode-jsonrpc](https://github.com/microsoft/vscode-languageserver-node) - JSON-RPC implementation

### Example Implementations
- [Theia IDE](https://github.com/eclipse-theia/theia) - Monaco + LSP + Extensions
- [CodeSandbox](https://github.com/codesandbox/codesandbox-client) - Monaco + LSP
- [GitPod](https://github.com/gitpod-io/gitpod) - VS Code in browser
- [StackBlitz](https://github.com/stackblitz/webcontainer-core) - Node.js in browser

### Language Servers
- [Python: pylsp](https://github.com/python-lsp/python-lsp-server)
- [Python: Pyright](https://github.com/microsoft/pyright)
- [Rust: rust-analyzer](https://github.com/rust-lang/rust-analyzer)
- [Go: gopls](https://github.com/golang/tools/tree/master/gopls)
- [Java: Eclipse JDT.LS](https://github.com/eclipse/eclipse.jdt.ls)
- [TypeScript: typescript-language-server](https://github.com/typescript-language-server/typescript-language-server)

---

## Appendix A: Extension Manifest Example

```json
{
  "name": "python",
  "displayName": "Python",
  "version": "2023.20.0",
  "publisher": "ms-python",
  "engines": {
    "vscode": "^1.75.0"
  },
  "activationEvents": [
    "onLanguage:python",
    "workspaceContains:**/*.py"
  ],
  "main": "./extension.js",
  "contributes": {
    "languages": [
      {
        "id": "python",
        "extensions": [".py", ".pyw"],
        "aliases": ["Python"],
        "configuration": "./language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "python",
        "scopeName": "source.python",
        "path": "./syntaxes/python.tmLanguage.json"
      }
    ],
    "commands": [
      {
        "command": "python.runFile",
        "title": "Python: Run File"
      }
    ],
    "configuration": {
      "title": "Python",
      "properties": {
        "python.pythonPath": {
          "type": "string",
          "default": "python",
          "description": "Path to Python interpreter"
        }
      }
    }
  }
}
```

---

## Appendix B: LSP Request Example

```typescript
// Client -> Server: textDocument/completion
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/completion",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.py"
    },
    "position": {
      "line": 10,
      "character": 5
    }
  }
}

// Server -> Client: Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "isIncomplete": false,
    "items": [
      {
        "label": "print",
        "kind": 3,  // Function
        "detail": "print(*args, sep=' ', end='\\n')",
        "documentation": "Prints to stdout",
        "insertText": "print($1)"
      }
    ]
  }
}
```

---

## Appendix C: Implementation Checklist

### Phase 1: TextMate Grammars
- [ ] Install dependencies (`vscode-textmate`, `vscode-oniguruma`)
- [ ] Create TextMate service infrastructure
- [ ] Load Oniguruma WASM binary
- [ ] Implement grammar registry
- [ ] Create Monaco tokenizer adapter
- [ ] Update extension host to load grammars
- [ ] Map TextMate scopes to Monaco tokens
- [ ] Integrate with theme system
- [ ] Test with 10+ languages
- [ ] Performance optimization
- [ ] Documentation

### Phase 2: Extension Execution
- [ ] Create Web Worker sandbox
- [ ] Implement message passing protocol
- [ ] Build CommonJS module loader
- [ ] Create VS Code API shim structure
- [ ] Implement basic `vscode.window` APIs
- [ ] Implement basic `vscode.workspace` APIs
- [ ] Create activation event system
- [ ] Build extension context
- [ ] Add error handling and logging
- [ ] Security review
- [ ] Test with simple extensions
- [ ] Documentation

### Phase 3: Language Server Protocol
- [ ] Implement JSON-RPC 2.0 protocol
- [ ] Create LSP client core
- [ ] Build connection management
- [ ] Implement capability negotiation
- [ ] Create Monaco provider adapters
- [ ] Build workspace file system abstraction
- [ ] Create Rust language server manager
- [ ] Implement process management
- [ ] Build stdio <-> WebSocket bridge
- [ ] Download and configure Python LSP
- [ ] Download and configure Rust Analyzer
- [ ] Download and configure gopls
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Documentation and troubleshooting guide

---

**End of Document**
