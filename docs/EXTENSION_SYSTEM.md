# Extension System Documentation

## Overview

Rainy Code features a powerful, secure, and production-ready extension system that allows developers to extend the IDE's functionality. This document provides comprehensive information about the extension architecture, API, security model, and development guidelines.

## Table of Contents

- [Architecture](#architecture)
- [Extension API](#extension-api)
- [Security & Permissions](#security--permissions)
- [Extension Development](#extension-development)
- [Publishing Extensions](#publishing-extensions)
- [Extension Server](#extension-server)

---

## Architecture

The extension system consists of four layers:

### 1. **Extension API Layer** (`src/types/extension-api.ts`)

Provides comprehensive TypeScript interfaces for all extension capabilities:

- Workspace API (file operations, text documents)
- Editor API (text editing, decorations, selections)
- Languages API (completions, diagnostics, formatting, etc.)
- UI API (status bar, notifications, webviews, terminals)
- Commands API
- Storage API (global state, workspace state, secrets)

### 2. **Security Layer**

- **Permissions Manager** (`src/services/extension/extensionPermissions.ts`)
  - Validates extension capabilities
  - Enforces file and network access restrictions
  - Provides human-readable permission descriptions

- **Extension Validator** (`src/services/extension/extensionValidator.ts`)
  - Validates manifests and code
  - Detects malicious patterns
  - Scores security risk
  - Verifies signatures (when available)

### 3. **Sandbox Layer** (`src/services/extension/extensionSandbox.ts`)

- Isolates extension execution
- Manages extension lifecycle (activate/deactivate)
- Provides API proxies that enforce permissions
- Supports hot reload

### 4. **IPC Layer** (`src/services/extension/extensionIPC.ts`)

- Secure message passing between extensions and IDE
- Request/response pattern with timeouts
- Event system for extension communication
- Global message bus for broadcasting

### 5. **Backend (Rust)** (`src-tauri/src/`)

- **extension_manager.rs**: File operations for extensions
- **extension_registry.rs**: Extension registry, caching, statistics

---

## Extension API

### Context API

Every extension receives a `ExtensionContext` object on activation:

```typescript
export interface ExtensionContext {
  // Extension info
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly extensionUri: string;
  readonly isActive: boolean;

  // Storage
  readonly globalState: Memento;
  readonly workspaceState: Memento;
  readonly secrets: SecretStorage;

  // Subscriptions for cleanup
  readonly subscriptions: IDisposable[];

  // Utilities
  asAbsolutePath(relativePath: string): string;
}
```

### Activation Function

Extensions export an `activate` function:

```typescript
export async function activate(context: ExtensionContext) {
  // Initialize extension

  // Register commands
  const disposable = rainycode.commands.registerCommand('myExtension.doSomething', () => {
    rainycode.window.showInformationMessage('Hello from extension!');
  });

  context.subscriptions.push(disposable);

  // Return public API (optional)
  return {
    doSomething() {
      // Public API for other extensions
    }
  };
}
```

### Language Features

Extensions can provide language features:

```typescript
// Code completion
rainycode.languages.registerCompletionItemProvider('javascript', {
  async provideCompletionItems(document, position, token, context) {
    return [
      {
        label: 'myFunction',
        kind: CompletionItemKind.Function,
        insertText: 'myFunction()',
        documentation: 'My custom function',
      }
    ];
  }
});

// Diagnostics
const diagnosticCollection = rainycode.languages.createDiagnosticCollection('myExtension');

diagnosticCollection.set(documentUri, [
  {
    range: new Range(0, 0, 0, 10),
    message: 'This is an error',
    severity: DiagnosticSeverity.Error,
    source: 'myExtension',
  }
]);

// Hover provider
rainycode.languages.registerHoverProvider('javascript', {
  async provideHover(document, position, token) {
    return {
      contents: [new MarkdownString('**Documentation**\n\nHover information here.')],
      range: new Range(position.line, 0, position.line, 100),
    };
  }
});
```

### UI Extensions

```typescript
// Status bar item
const statusBarItem = rainycode.window.createStatusBarItem(StatusBarAlignment.Left, 100);
statusBarItem.text = "$(check) Status";
statusBarItem.tooltip = "Status tooltip";
statusBarItem.command = 'myExtension.showStatus';
statusBarItem.show();
context.subscriptions.push(statusBarItem);

// Notifications
rainycode.window.showInformationMessage('Info message');
rainycode.window.showWarningMessage('Warning message');
rainycode.window.showErrorMessage('Error message');

// Quick pick
const result = await rainycode.window.showQuickPick(['Option 1', 'Option 2', 'Option 3'], {
  placeHolder: 'Select an option'
});

// Input box
const input = await rainycode.window.showInputBox({
  prompt: 'Enter a value',
  placeHolder: 'Placeholder text',
  validateInput: (value) => {
    return value.length < 3 ? 'Value must be at least 3 characters' : undefined;
  }
});

// Webview
const panel = rainycode.window.createWebviewPanel(
  'myWebview',
  'My Webview',
  ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [context.extensionUri]
  }
);

panel.webview.html = `
  <!DOCTYPE html>
  <html>
    <body>
      <h1>Webview Content</h1>
      <button onclick="sendMessage()">Click Me</button>
      <script>
        const vscode = acquireVsCodeApi();
        function sendMessage() {
          vscode.postMessage({ command: 'buttonClicked' });
        }
      </script>
    </body>
  </html>
`;

panel.webview.onDidReceiveMessage(message => {
  if (message.command === 'buttonClicked') {
    rainycode.window.showInformationMessage('Button was clicked!');
  }
});
```

---

## Security & Permissions

### Capability System

Extensions must declare capabilities in `package.json`:

```json
{
  "permissions": {
    "capabilities": [
      "fs:read",
      "fs:write",
      "editor:edit",
      "language:completions",
      "ui:notifications",
      "http:request"
    ],
    "fileAccess": {
      "allow": ["**/*.js", "**/*.ts"],
      "deny": ["**/node_modules/**"]
    },
    "networkAccess": {
      "allowedDomains": ["api.example.com", "*.github.com"],
      "deniedDomains": ["malicious.com"]
    }
  }
}
```

### Available Capabilities

#### File System

- `fs:read` - Read files from workspace
- `fs:write` - Create, modify, and delete files
- `fs:watch` - Watch for file changes

#### Editor

- `editor:edit` - Edit text in editor
- `editor:read` - Read text from editor
- `editor:cursor` - Access cursor position
- `editor:decorations` - Add decorations

#### Language Features

- `language:completions` - Provide code completions
- `language:diagnostics` - Show diagnostic messages
- `language:hover` - Provide hover information
- `language:definitions` - Provide definition navigation
- `language:references` - Find code references
- `language:formatting` - Format code
- `language:codeActions` - Provide code actions
- `language:rename` - Rename symbols
- `language:symbols` - Provide symbol information

#### UI

- `ui:statusBar` - Add status bar items
- `ui:notifications` - Show notifications
- `ui:quickPick` - Show quick pick menus
- `ui:inputBox` - Show input boxes
- `ui:panels` - Create custom panels
- `ui:webviews` - Create webview panels

#### Terminal

- `terminal:create` - Create terminal sessions
- `terminal:write` - Write to terminals
- `terminal:read` - Read from terminals

#### Commands

- `commands:register` - Register custom commands
- `commands:execute` - Execute commands

#### Network

- `network:http` - Make HTTP requests
- `network:websocket` - Create WebSocket connections

#### Storage

- `storage:global` - Store global state
- `storage:workspace` - Store workspace state
- `storage:secrets` - Store secrets securely

#### Git

- `git:read` - Read Git repository information
- `git:write` - Modify Git repository

#### Process

- `process:spawn` - Spawn child processes (⚠️ Dangerous)

#### Debug

- `debug:adapter` - Provide debug adapter
- `debug:breakpoints` - Manage breakpoints

### Security Validation

The extension validator checks for:

1. **Malicious Patterns**
   - `eval()` usage
   - Dynamic code execution
   - File system abuse
   - Keylogging attempts
   - Obfuscated code

2. **Suspicious Patterns**
   - Password/token references
   - Credential handling
   - Large files (>1MB)
   - Excessive dependencies (>50)

3. **Manifest Validation**
   - Required fields present
   - Valid semver version
   - Valid package name
   - Compatible engine version

### Trust Levels

Extensions are assigned trust levels:

- **VERIFIED**: Official or verified publisher ✅
- **TRUSTED**: Community trusted, good reputation ✓
- **UNKNOWN**: No reputation data ⚠️
- **SUSPICIOUS**: Suspicious patterns detected ⚠️⚠️
- **MALICIOUS**: Known malicious patterns ❌

---

## Extension Development

### Manifest (package.json)

```json
{
  "name": "my-extension",
  "displayName": "My Awesome Extension",
  "description": "Does awesome things",
  "version": "1.0.0",
  "publisher": "myname",
  "engines": {
    "rainycode": "^0.1.0"
  },
  "categories": [
    "Programming Languages",
    "Linters",
    "Formatters"
  ],
  "keywords": ["javascript", "linting"],
  "activationEvents": [
    "onLanguage:javascript",
    "onCommand:myExtension.doSomething"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExtension.doSomething",
        "title": "Do Something",
        "category": "My Extension"
      }
    ],
    "languages": [
      {
        "id": "mylang",
        "aliases": ["MyLang", "mylang"],
        "extensions": [".ml"],
        "configuration": "./language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "mylang",
        "scopeName": "source.mylang",
        "path": "./syntaxes/mylang.tmLanguage.json"
      }
    ],
    "themes": [
      {
        "label": "My Dark Theme",
        "uiTheme": "vs-dark",
        "path": "./themes/dark.json"
      }
    ],
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myExtension.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable my extension"
        }
      }
    }
  },
  "permissions": {
    "capabilities": [
      "editor:read",
      "editor:edit",
      "language:completions",
      "ui:notifications"
    ]
  },
  "icon": "icon.png",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-extension"
  }
}
```

### TypeScript Setup

```bash
# Initialize project
npm init -y
npm install --save-dev typescript @types/node

# Install Rainy Code extension API types
npm install --save-dev @rainycode/extension-api
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### Extension Entry Point

`src/extension.ts`:

```typescript
import * as rainycode from 'rainycode';

export function activate(context: rainycode.ExtensionContext) {
  console.log('Extension activated!');

  // Register command
  let disposable = rainycode.commands.registerCommand('myExtension.helloWorld', () => {
    rainycode.window.showInformationMessage('Hello World from My Extension!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('Extension deactivated');
}
```

### Testing

```typescript
import * as assert from 'assert';
import * as rainycode from 'rainycode';

suite('Extension Test Suite', () => {
  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
```

### Building

```bash
# Compile TypeScript
npm run compile

# Package extension
rainycode package

# Produces: my-extension-1.0.0.vsix
```

---

## Publishing Extensions

### 1. Create Publisher Account

```bash
rainycode publish --create-publisher myname
```

### 2. Package Extension

```bash
rainycode package
```

This creates a `.vsix` file (which is a ZIP archive).

### 3. Publish to Marketplace

```bash
rainycode publish --pat <personal-access-token>
```

### 4. Update Extension

```bash
# Update version in package.json
npm version patch  # or minor, major

# Publish update
rainycode publish
```

---

## Extension Server

### Architecture

The extension server is a backend API for hosting custom extensions (in addition to Open VSX Registry).

**Endpoints:**

```
GET    /api/extensions              # List all extensions
GET    /api/extensions/:id          # Get extension details
GET    /api/extensions/:id/versions # List versions
GET    /api/extensions/:id/download # Download extension
POST   /api/extensions              # Publish extension (authenticated)
PUT    /api/extensions/:id          # Update extension (authenticated)
DELETE /api/extensions/:id          # Delete extension (authenticated)
GET    /api/search                  # Search extensions
GET    /api/categories              # List categories
GET    /api/publishers/:id          # Get publisher info
```

### Hosting Your Own Server

```bash
# Clone server repository
git clone https://github.com/rainycode/extension-server
cd extension-server

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with database connection, storage, etc.

# Run
npm start

# Server runs on http://localhost:3000
```

### Configure Custom Registry in IDE

Settings → Extensions → Registry:

```json
{
  "extensions.registry": "https://your-server.com/api"
}
```

---

## Best Practices

### 1. **Performance**

- Use activation events to lazy-load
- Avoid blocking the main thread
- Cache expensive computations
- Dispose resources properly

### 2. **Security**

- Minimize requested permissions
- Validate all user inputs
- Never trust external data
- Use secure storage for secrets

### 3. **User Experience**

- Provide clear error messages
- Show progress for long operations
- Use icons consistently
- Follow IDE design guidelines

### 4. **Compatibility**

- Test on multiple platforms
- Handle missing dependencies gracefully
- Support multiple engine versions
- Document requirements clearly

### 5. **Code Quality**

- Use TypeScript for type safety
- Write unit tests
- Follow ESLint rules
- Document public API

---

## Examples

### Example 1: Simple Command Extension

```typescript
import * as rainycode from 'rainycode';

export function activate(context: rainycode.ExtensionContext) {
  const disposable = rainycode.commands.registerCommand('example.uppercase', async () => {
    const editor = rainycode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const text = document.getText(selection);

    await editor.edit(editBuilder => {
      editBuilder.replace(selection, text.toUpperCase());
    });
  });

  context.subscriptions.push(disposable);
}
```

### Example 2: Language Server Extension

```typescript
import * as rainycode from 'rainycode';

export function activate(context: rainycode.ExtensionContext) {
  // Register completion provider
  const completionProvider = rainycode.languages.registerCompletionItemProvider('mylang', {
    async provideCompletionItems(document, position, token, context) {
      const linePrefix = document.lineAt(position).text.substr(0, position.character);
      if (!linePrefix.endsWith('.')) {
        return undefined;
      }

      return [
        new rainycode.CompletionItem('method1', rainycode.CompletionItemKind.Method),
        new rainycode.CompletionItem('method2', rainycode.CompletionItemKind.Method),
        new rainycode.CompletionItem('property1', rainycode.CompletionItemKind.Property),
      ];
    }
  }, '.');

  context.subscriptions.push(completionProvider);
}
```

### Example 3: Webview Extension

```typescript
import * as rainycode from 'rainycode';
import * as path from 'path';

export function activate(context: rainycode.ExtensionContext) {
  const disposable = rainycode.commands.registerCommand('example.openWebview', () => {
    const panel = rainycode.window.createWebviewPanel(
      'exampleWebview',
      'Example Webview',
      rainycode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [rainycode.Uri.file(path.join(context.extensionPath, 'media'))]
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            rainycode.window.showInformationMessage(message.text);
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(webview: rainycode.Webview, extensionUri: rainycode.Uri) {
  const styleUri = webview.asWebviewUri(rainycode.Uri.joinPath(extensionUri, 'media', 'style.css'));
  const scriptUri = webview.asWebviewUri(rainycode.Uri.joinPath(extensionUri, 'media', 'script.js'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Example Webview</title>
</head>
<body>
    <h1>Hello from Webview!</h1>
    <button id="alert-button">Show Alert</button>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}
```

---

## Troubleshooting

### Extension Not Activating

1. Check activation events in `package.json`
2. Verify engine compatibility
3. Check console for errors
4. Ensure all capabilities are declared

### Permission Denied Errors

1. Verify capability is in `permissions.capabilities`
2. Check file/network access patterns
3. Review error message for specific permission needed

### Performance Issues

1. Profile extension with DevTools
2. Check for memory leaks
3. Optimize file operations
4. Use worker threads for heavy computation

---

## Resources

- **API Reference**: <https://docs.rainycode.com/api>
- **Extension Samples**: <https://github.com/rainycode/extension-samples>
- **Extension Generator**: `npm install -g rainycode-extension-generator`
- **Community Forum**: <https://community.rainycode.com>
- **Extension Marketplace**: <https://marketplace.rainycode.com>

---

## License

This documentation is licensed under CC BY 4.0.
